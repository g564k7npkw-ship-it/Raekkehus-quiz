"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import RaceTrack from "@/components/RaceTrack";
import WeeklySummary from "@/components/WeeklySummary";
import { CATEGORIES, PLAYER_COLORS, type Player } from "@/lib/types";
import {
  emptyScores,
  encodeShare,
  importShared,
  loadAllScores,
  loadPlayer,
  ranking,
  resetAllScores,
  resetSharedScores,
  syncScores,
  totalAnswered,
  trailers,
  type AllScores,
} from "@/lib/storage";
import { joinNames } from "@/lib/utils";

function Leaderboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const importCode = searchParams.get("import");

  const [scores, setScores] = useState<AllScores>(emptyScores);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Øges når localStorage er ændret, så WeeklySummary læser igen.
  const [version, setVersion] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  // true = stillingen deles automatisk via databasen (på Vercel).
  const [shared, setShared] = useState(false);
  const handledCode = useRef<string | null>(null);

  // Læs alle fire spilleres scores fra localStorage, og hent de andres
  // fra den fælles stilling – med det samme og derefter hvert 20. sekund.
  useEffect(() => {
    setPlayer(loadPlayer());
    setScores(loadAllScores());
    setLoaded(true);

    let cancelled = false;
    async function refresh() {
      const ok = await syncScores();
      if (cancelled) return;
      setShared(ok);
      if (ok) {
        setScores(loadAllScores());
        setVersion((value) => value + 1);
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  // Åbnet via et "Del min score"-link? Så importeres den delte score.
  useEffect(() => {
    // Samme kode behandles kun én gang (React kører effekter to gange i udviklingstilstand).
    if (!importCode || handledCode.current === importCode) return;
    handledCode.current = importCode;
    const result = importShared(importCode);
    if (result.status === "imported") {
      setNotice(
        `Scoren for ${result.player} er hentet (${result.totalScore} point).`
      );
    } else if (result.status === "older") {
      setNotice(
        `Linket for ${result.player} er ikke nyere end den score, der allerede ligger her.`
      );
    } else if (result.status === "own") {
      setNotice(
        `Linket gælder ${result.player}, som er din egen spiller på denne enhed – din score her er uændret.`
      );
    } else {
      setNotice("Linket kunne ikke læses. Bed om et nyt.");
    }
    setScores(loadAllScores());
    setVersion((value) => value + 1);
    // Fjern koden fra adressen, så den ikke importeres igen ved genindlæsning.
    router.replace("/leaderboard");
  }, [importCode, router]);

  async function handleReset() {
    if (shared && !(await resetSharedScores())) {
      setConfirmReset(false);
      setNotice("Kunne ikke nulstille for gruppen. Tjek nettet, og prøv igen.");
      return;
    }
    resetAllScores();
    setScores(loadAllScores());
    setVersion((value) => value + 1);
    setConfirmReset(false);
    setShareLink(null);
    setNotice(
      shared
        ? "Scores er nulstillet for hele gruppen. God ny uge!"
        : "Scores er nulstillet. God ny uge!"
    );
  }

  async function handleShare() {
    if (!player) return;
    // Linket bygges ud fra den adresse, siden har lige nu – så passer det både
    // på Vercel, lokalt og under /<repo-navn>/ på GitHub Pages.
    const link = `${window.location.origin}${window.location.pathname}?import=${encodeShare(
      player,
      scores[player]
    )}`;
    setShareLink(link);
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Linket er kopieret. Send det til de andre i gruppen.");
    } catch {
      // Udklipsholderen kan være blokeret – linket vises i feltet, så det kan kopieres i hånden.
      setNotice("Kopiér linket herunder, og send det til de andre i gruppen.");
    }
  }

  const order = ranking(scores);
  const anyAnswers = totalAnswered(scores) > 0;
  const last = trailers(scores);
  const everyoneTied = last.length === order.length;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ugens stilling</h1>
        <p className="mt-1 text-sm text-slate-300">
          Ugen går fra mandag til søndag. Færrest point søndag aften giver noget
          mandag.
        </p>
      </div>

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm"
        >
          {notice}
        </p>
      )}

      {/* Ugens taber */}
      <section className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-300">
          Ugens taber
        </h2>
        {!loaded ? (
          <p className="mt-1 text-slate-300">Henter …</p>
        ) : !anyAnswers ? (
          <p className="mt-1 text-slate-200">
            Ingen har svaret på noget endnu – alle står lige.
          </p>
        ) : everyoneTied ? (
          <p className="mt-1 text-slate-200">Alle står lige lige nu.</p>
        ) : (
          <p className="mt-1 text-xl font-bold text-rose-200">
            {joinNames(last)}
            <span className="mt-1 block text-sm font-normal text-rose-200/80">
              {scores[last[0]].totalScore} point
              {last.length > 1 ? " (delt sidsteplads)" : ""}
            </span>
          </p>
        )}
      </section>

      {/* Tabel: spiller, total og point pr. kategori.
          Spillerne står som kolonner (sorteret efter point) og kategorierne som
          rækker, så hele tabellen kan være på en telefonskærm uden at scrolle. */}
      <section className="rounded-xl bg-slate-800 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Point pr. kategori
        </h2>
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[36%] sm:w-[40%]" />
            {order.map((name) => (
              <col key={name} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-slate-700 text-xs text-slate-300">
              <th scope="col" className="py-2 pr-2 text-left font-medium text-slate-400">
                Kategori
              </th>
              {order.map((name) => (
                <th
                  key={name}
                  scope="col"
                  className={`px-1 py-2 text-right align-bottom font-medium ${
                    name === player ? "bg-slate-700/50 text-white" : ""
                  }`}
                >
                  <span
                    className={`mb-1 ml-auto block h-2.5 w-2.5 rounded-full ${PLAYER_COLORS[name].bg}`}
                    aria-hidden="true"
                  />
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-600">
              <th scope="row" className="py-2 pr-2 text-left font-bold">
                Total
              </th>
              {order.map((name) => (
                <td
                  key={name}
                  className={`px-1 py-2 text-right text-base font-bold tabular-nums ${
                    name === player ? "bg-slate-700/50" : ""
                  }`}
                >
                  {scores[name].totalScore}
                </td>
              ))}
            </tr>
            {CATEGORIES.map((category) => (
              <tr
                key={category}
                className="border-b border-slate-700/60 last:border-b-0"
              >
                <th
                  scope="row"
                  className="py-2 pr-2 text-left font-normal text-slate-300"
                >
                  {category}
                </th>
                {order.map((name) => (
                  <td
                    key={name}
                    className={`px-1 py-2 text-right tabular-nums text-slate-300 ${
                      name === player ? "bg-slate-700/50" : ""
                    }`}
                  >
                    {scores[name].perCategoryScores[category] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <RaceTrack scores={scores} currentPlayer={player} />
      <WeeklySummary scores={scores} version={version} />

      {/* Deling mellem enheder */}
      {shared ? (
        <p className="rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
          Stillingen deles automatisk med de andre i gruppen og opdateres af
          sig selv.
        </p>
      ) : (
        <section className="space-y-3 rounded-xl bg-slate-800 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Del din score
          </h2>
          <p className="text-sm text-slate-300">
            Scores gemmes i browseren på den enhed, du spiller på. Spiller I på
            hver jeres telefon, så send dit link i gruppechatten – når de andre
            åbner det, kommer din score ind i deres stilling.
          </p>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={!player}
            className="rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {player ? `Kopiér link med ${player}s score` : "Vælg en spiller på forsiden først"}
          </button>
          {shareLink && (
            <input
              readOnly
              value={shareLink}
              aria-label="Link med din score"
              onFocus={(event) => event.currentTarget.select()}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-300"
            />
          )}
        </section>
      )}

      {/* Manuel nulstilling ved ugens start */}
      <section className="space-y-3 rounded-xl bg-slate-800 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Ny uge
        </h2>
        <p className="text-sm text-slate-300">
          Nulstil mandag, når ugens taber er kåret. Stillingen gemmes som
          &quot;sidste uge&quot; i ugeoversigten, og alle fire spillere starter
          på 0 {shared ? "hos hele gruppen" : "på denne enhed"}.
        </p>
        {confirmReset ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm text-slate-200">
              {shared
                ? "Nulstil alle scores for hele gruppen?"
                : "Nulstil alle scores på denne enhed?"}
            </span>
            <button
              type="button"
              onClick={() => void handleReset()}
              className="rounded-lg bg-rose-500 px-4 py-3 font-semibold text-white hover:bg-rose-400"
            >
              Ja, nulstil
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-lg bg-slate-600 px-4 py-3 hover:bg-slate-500"
            >
              Fortryd
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="rounded-lg bg-slate-600 px-4 py-3 hover:bg-slate-500"
          >
            Nulstil scores
          </button>
        )}
      </section>
    </>
  );
}

export default function LeaderboardPage() {
  // useSearchParams kræver en Suspense-grænse, når siden bygges med `next build`.
  return (
    <Suspense fallback={<p className="text-slate-300">Henter stilling …</p>}>
      <Leaderboard />
    </Suspense>
  );
}
