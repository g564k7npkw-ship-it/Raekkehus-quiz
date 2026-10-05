// ---------------------------------------------------------------------------
// GET /api/questions -> alle spørgsmål
//
// SÅDAN HENTES SPØRGSMÅL:
// Spørgsmålene ligger i data/questions.json i repoet. Filen importeres her og
// bygges med ind i appen (ingen database). Ruten er statisk: svaret laves én
// gang, når appen bygges. Derfor virker den både på Vercel og på GitHub Pages,
// hvor der slet ikke kører en server. Filtrering på kategori sker i browseren
// (se app/quiz/page.tsx).
// Når du retter i JSON-filen, skal appen bygges igen, før ændringen kan ses.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import questionsData from "@/data/questions.json";
import { CATEGORIES, type Question } from "@/lib/types";

// Statisk rute: kræves for at appen kan eksporteres til GitHub Pages.
export const dynamic = "force-static";

const VALID_TYPES = ["mcq", "true_false", "paragraph"];

/**
 * Sorterer spørgsmål fra, der er skrevet forkert i JSON-filen (fx en ukendt
 * kategori, eller et correctAnswer der ikke findes blandt svarmulighederne),
 * så én tastefejl ikke giver et spørgsmål, der er umuligt at svare rigtigt på.
 */
function isValidQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const q = value as Record<string, unknown>;

  const hasText = (key: string) =>
    typeof q[key] === "string" && (q[key] as string).trim().length > 0;
  if (!["id", "questionText", "correctAnswer", "explanation", "reference"].every(hasText)) {
    return false;
  }
  if (!(CATEGORIES as readonly string[]).includes(q.category as string)) return false;
  if (!VALID_TYPES.includes(q.type as string)) return false;

  if (q.type === "true_false") {
    return q.correctAnswer === "Sandt" || q.correctAnswer === "Falsk";
  }
  const options: unknown[] = Array.isArray(q.options) ? q.options : [];
  return (
    options.length >= 2 &&
    options.every((option) => typeof option === "string") &&
    options.some((option) => option === q.correctAnswer)
  );
}

export async function GET() {
  const questions = (questionsData as unknown[]).filter(isValidQuestion);
  return NextResponse.json({ questions, total: questions.length });
}
