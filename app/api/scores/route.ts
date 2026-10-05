// ---------------------------------------------------------------------------
// GET  /api/scores -> alle spilleres seneste score + tidspunkt for sidste nulstilling
// POST /api/scores -> gem én spillers score   (body: SharePayload, se lib/storage.ts)
// DELETE /api/scores -> nulstil for hele gruppen (gemmer tidspunktet)
//
// SÅDAN DELES STILLINGEN:
// Scores ligger i en lille Redis-database (Upstash), som oprettes i Vercel under
// Storage. Vercel sætter selv adresse og nøgle som miljøvariabler. Uden dem
// svarer ruten 503, og appen kører videre med scores kun på telefonen.
//
// Ruten kræver en kørende server, så den virker på Vercel, men ikke på
// GitHub Pages (scripts/build-pages.js lægger den til side under eksporten).
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { PLAYERS } from "@/lib/types";

export const dynamic = "force-dynamic";

const SCORES_KEY = "quiz:scores";
const RESET_KEY = "quiz:resetAt";

function redisConfig() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/** Kører en række Redis-kommandoer i ét kald (Upstash REST "pipeline"). */
async function redis(commands: (string | number)[][]): Promise<unknown[]> {
  const config = redisConfig();
  if (!config) throw new Error("Ingen database");
  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}` },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Redis svarede ${response.status}`);
  const results = (await response.json()) as { result?: unknown; error?: string }[];
  return results.map((item) => {
    if (item.error) throw new Error(item.error);
    return item.result;
  });
}

const notConfigured = () =>
  NextResponse.json({ enabled: false }, { status: 503 });

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Lader kun en score igennem, der ligner det, appen selv sender. */
function parsePayload(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (!(PLAYERS as readonly string[]).includes(data.p as string)) return null;
  if (![data.s, data.r, data.a, data.u].every(isNumber)) return null;
  if (!Array.isArray(data.c) || data.c.length > 50 || !data.c.every(isNumber)) return null;
  if (typeof data.w !== "string" || data.w.length > 20) return null;
  return { p: data.p as string, s: data.s, c: data.c, r: data.r, a: data.a, w: data.w, u: data.u as number };
}

async function readAll() {
  const [hash, resetAt] = await redis([
    ["HGETALL", SCORES_KEY],
    ["GET", RESET_KEY],
  ]);
  // HGETALL svarer med en flad liste: [felt, værdi, felt, værdi, ...]
  const flat = Array.isArray(hash) ? (hash as string[]) : [];
  const scores: Record<string, unknown> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) {
    try {
      scores[flat[i]] = JSON.parse(flat[i + 1]);
    } catch {
      // ødelagt værdi springes over
    }
  }
  return { scores, resetAt: Number(resetAt) || 0 };
}

export async function GET() {
  if (!redisConfig()) return notConfigured();
  try {
    return NextResponse.json({ enabled: true, ...(await readAll()) });
  } catch {
    return NextResponse.json({ enabled: true, error: true }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!redisConfig()) return notConfigured();
  const payload = parsePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Ugyldig score" }, { status: 400 });
  try {
    const { scores, resetAt } = await readAll();
    const existing = scores[payload.p] as { u?: number } | undefined;
    // En score fra før sidste nulstilling, eller en ældre end den gemte, ignoreres.
    const stale = payload.u <= resetAt || (existing?.u ?? 0) >= payload.u;
    if (!stale) await redis([["HSET", SCORES_KEY, payload.p, JSON.stringify(payload)]]);
    return NextResponse.json({ ok: true, saved: !stale });
  } catch {
    return NextResponse.json({ error: true }, { status: 502 });
  }
}

export async function DELETE() {
  if (!redisConfig()) return notConfigured();
  try {
    const resetAt = Date.now();
    await redis([
      ["DEL", SCORES_KEY],
      ["SET", RESET_KEY, resetAt],
    ]);
    return NextResponse.json({ ok: true, resetAt });
  } catch {
    return NextResponse.json({ error: true }, { status: 502 });
  }
}
