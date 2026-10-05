"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CategorySelector from "@/components/CategorySelector";
import PlayerSelector from "@/components/PlayerSelector";
import RaceTrack from "@/components/RaceTrack";
import ScoreBoard from "@/components/ScoreBoard";
import WeeklySummary from "@/components/WeeklySummary";
import {
  ALL_CATEGORIES,
  type CategoryChoice,
  type Player,
  type Question,
} from "@/lib/types";
import {
  emptyScores,
  loadAllScores,
  loadPlayer,
  savePlayer,
  type AllScores,
} from "@/lib/storage";
import { BASE_PATH } from "@/lib/utils";

/** Forside: vælg spiller og kategori, og start quizzen. */
export default function HomePage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [category, setCategory] = useState<CategoryChoice>(ALL_CATEGORIES);
  const [scores, setScores] = useState<AllScores>(emptyScores);
  const [counts, setCounts] = useState<Partial<Record<CategoryChoice, number>>>({});

  // Valgt spiller og scores ligger i localStorage og læses efter mount.
  useEffect(() => {
    setPlayer(loadPlayer());
    setScores(loadAllScores());
  }, []);

  // Antal spørgsmål pr. kategori, så man kan se det på knapperne.
  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE_PATH}/api/questions`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { questions: Question[] }) => {
        if (cancelled) return;
        const next: Partial<Record<CategoryChoice, number>> = {
          [ALL_CATEGORIES]: data.questions.length,
        };
        for (const question of data.questions) {
          next[question.category] = (next[question.category] ?? 0) + 1;
        }
        setCounts(next);
      })
      .catch(() => {
        // Tallene er kun pynt – forsiden virker fint uden dem.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectPlayer(next: Player) {
    setPlayer(next);
    savePlayer(next); // spillernavnet gemmes i localStorage
  }

  function startQuiz() {
    if (!player) return;
    router.push(`/quiz?category=${encodeURIComponent(category)}`);
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Klar til eksamen?</h1>
        <p className="mt-1 text-sm text-slate-300">
          Spørgsmål om BR18, myndighed, projektering og udbud – med udgangspunkt
          i vores rækkehusprojekt. Færrest point søndag aften giver noget mandag.
        </p>
      </div>

      <WeeklySummary scores={scores} showResetLink />

      <PlayerSelector selected={player} onSelect={handleSelectPlayer} />
      <CategorySelector
        selected={category}
        onSelect={setCategory}
        counts={counts}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={startQuiz}
          disabled={!player}
          className="rounded-lg bg-emerald-500 px-6 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Start quiz
        </button>
        <Link
          href="/leaderboard"
          className="rounded-lg bg-slate-600 px-6 py-3 text-center text-base font-medium hover:bg-slate-500"
        >
          Se ugens stilling
        </Link>
        {!player && (
          <p className="text-sm text-slate-400">Vælg en spiller for at starte.</p>
        )}
      </div>

      <RaceTrack scores={scores} currentPlayer={player} />
      <ScoreBoard scores={scores} currentPlayer={player} />
    </>
  );
}
