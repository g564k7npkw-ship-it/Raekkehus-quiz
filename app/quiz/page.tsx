"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import RaceTrack from "@/components/RaceTrack";
import ScoreBoard from "@/components/ScoreBoard";
import {
  ALL_CATEGORIES,
  CATEGORIES,
  ROUND_SIZE,
  type CategoryChoice,
  type Player,
  type Question,
} from "@/lib/types";
import {
  countsForScore,
  emptyScores,
  loadAllScores,
  loadPlayer,
  loadScore,
  syncScores,
  recordAnswer,
  recordHint,
  type AllScores,
} from "@/lib/storage";
import { BASE_PATH, formatPoints, shuffle } from "@/lib/utils";

/** Ét spørgsmål i runden, og om det tæller med i konkurrencen. */
interface RoundItem {
  question: Question;
  counts: boolean;
}

type Phase = "loading" | "no-player" | "error" | "empty" | "playing" | "done";

function QuizFlow() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("category");
  // Ukendt eller manglende kategori i adressen behandles som "Alle".
  const category: CategoryChoice = (CATEGORIES as readonly string[]).includes(
    requested ?? ""
  )
    ? (requested as CategoryChoice)
    : ALL_CATEGORIES;

  const [phase, setPhase] = useState<Phase>("loading");
  const [player, setPlayer] = useState<Player | null>(null);
  const [round, setRound] = useState<RoundItem[]>([]);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<AllScores>(emptyScores);
  // Resultat for denne runde (kun til visning – den rigtige score ligger i localStorage).
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [roundPoints, setRoundPoints] = useState(0);

  /**
   * SÅDAN HENTES SPØRGSMÅL:
   * 1. Alle spørgsmål hentes fra /api/questions (som læser data/questions.json)
   *    og filtreres på den valgte kategori her i browseren.
   * 2. Spørgsmål, spilleren ikke har svaret på i denne uge, lægges forrest,
   *    så nye spørgsmål kommer før gentagelser. Begge grupper blandes.
   * 3. Runden består af de første ROUND_SIZE spørgsmål.
   */
  const startRound = useCallback(async () => {
    const currentPlayer = loadPlayer();
    setPlayer(currentPlayer);
    setScores(loadAllScores());
    if (!currentPlayer) {
      setPhase("no-player");
      return;
    }

    setPhase("loading");
    setIndex(0);
    setRoundCorrect(0);
    setRoundPoints(0);

    try {
      // Hent også den fælles stilling, så en nulstilling i gruppen er med.
      const [response] = await Promise.all([
        fetch(`${BASE_PATH}/api/questions`),
        syncScores(),
      ]);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setScores(loadAllScores());
      const data = (await response.json()) as { questions: Question[] };
      const inCategory =
        category === ALL_CATEGORIES
          ? data.questions
          : data.questions.filter((q) => q.category === category);

      const score = loadScore(currentPlayer);
      const fresh = inCategory.filter((q) => countsForScore(score, q.id));
      const seen = inCategory.filter((q) => !countsForScore(score, q.id));
      const items: RoundItem[] = [
        ...shuffle(fresh).map((question) => ({ question, counts: true })),
        ...shuffle(seen).map((question) => ({ question, counts: false })),
      ].slice(0, ROUND_SIZE);

      setRound(items);
      setPhase(items.length === 0 ? "empty" : "playing");
    } catch {
      setPhase("error");
    }
  }, [category]);

  useEffect(() => {
    void startRound();
  }, [startRound]);

  const current = round[index];

  /**
   * SÅDAN GEMMES SCORING:
   * Svaret gemmes med det samme i localStorage via recordAnswer() –
   * +1 for rigtigt, 0 for forkert. Øvelsesspørgsmål (allerede besvaret i
   * denne uge) gemmes ikke og giver ingen point.
   */
  function handleAnswer(correct: boolean) {
    if (!player || !current) return;
    if (correct) setRoundCorrect((value) => value + 1);
    if (!current.counts) return;

    recordAnswer(player, current.question, correct);
    if (correct) setRoundPoints((value) => value + 1);
    setScores(loadAllScores());
  }

  /** Hint koster 1 point og trækkes straks – men ikke på øvelsesspørgsmål. */
  function handleHint() {
    if (!player || !current || !current.counts) return;
    recordHint(player, current.question);
    setRoundPoints((value) => value - 1);
    setScores(loadAllScores());
  }

  function handleNext() {
    if (index + 1 >= round.length) {
      setPhase("done");
    } else {
      setIndex(index + 1);
    }
  }

  const categoryTitle =
    category === ALL_CATEGORIES ? "Alle kategorier" : category;

  if (phase === "loading") {
    return <p className="text-slate-300">Henter spørgsmål …</p>;
  }

  if (phase === "no-player") {
    return (
      <Message title="Vælg en spiller først">
        <p>Du skal vælge, hvem du er, før point kan gemmes.</p>
        <PrimaryLink href="/">Til forsiden</PrimaryLink>
      </Message>
    );
  }

  if (phase === "error") {
    return (
      <Message title="Spørgsmålene kunne ikke hentes">
        <p>Tjek din forbindelse, og prøv igen.</p>
        <button
          type="button"
          onClick={() => void startRound()}
          className="rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-900 hover:bg-emerald-400"
        >
          Prøv igen
        </button>
      </Message>
    );
  }

  if (phase === "empty") {
    return (
      <Message title={`Ingen spørgsmål i ${categoryTitle}`}>
        <p>
          Tilføj spørgsmål til kategorien i data/questions.json, eller vælg en
          anden kategori.
        </p>
        <PrimaryLink href="/">Til forsiden</PrimaryLink>
      </Message>
    );
  }

  if (phase === "done") {
    const practiceOnly = round.every((item) => !item.counts);
    return (
      <>
        <Message title="Runden er slut">
          <p>
            {roundCorrect} rigtige af {round.length} i {categoryTitle}.{" "}
            {practiceOnly ? (
              <>
                Du har allerede haft alle spørgsmålene i denne uge, så runden
                var kun øvelse.
              </>
            ) : (
              <>
                Det gav{" "}
                <span className="font-semibold text-emerald-400">
                  {formatPoints(roundPoints)}
                </span>{" "}
                til {player}.
              </>
            )}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void startRound()}
              className="rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-900 hover:bg-emerald-400"
            >
              Ny runde
            </button>
            <Link
              href="/"
              className="rounded-lg bg-slate-600 px-4 py-3 text-center hover:bg-slate-500"
            >
              Vælg anden kategori
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-lg bg-slate-600 px-4 py-3 text-center hover:bg-slate-500"
            >
              Se stillingen
            </Link>
          </div>
        </Message>
        <RaceTrack scores={scores} currentPlayer={player} />
        <ScoreBoard scores={scores} currentPlayer={player} />
      </>
    );
  }

  // phase === "playing"
  return (
    <>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-slate-300">
          <span className="font-semibold text-white">{player}</span> ·{" "}
          {categoryTitle}
        </p>
        <p className="tabular-nums text-slate-300">
          Runde:{" "}
          <span className="font-semibold text-white">
            {formatPoints(roundPoints)}
          </span>
        </p>
      </div>

      {/* Fremdrift i runden */}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={round.length}
        aria-valuenow={index}
        aria-label="Fremdrift i runden"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${(index / round.length) * 100}%` }}
        />
      </div>

      {current && (
        <QuestionCard
          key={current.question.id}
          question={current.question}
          number={index + 1}
          total={round.length}
          counts={current.counts}
          isLast={index + 1 >= round.length}
          onAnswer={handleAnswer}
          onHint={handleHint}
          onNext={handleNext}
        />
      )}

      <RaceTrack scores={scores} currentPlayer={player} />
    </>
  );
}

function Message({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl bg-slate-800 p-4 sm:p-6">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="space-y-4 text-sm text-slate-200">{children}</div>
    </section>
  );
}

function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-block rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-900 hover:bg-emerald-400"
    >
      {children}
    </Link>
  );
}

export default function QuizPage() {
  // useSearchParams kræver en Suspense-grænse, når siden bygges med `next build`.
  return (
    <Suspense fallback={<p className="text-slate-300">Henter spørgsmål …</p>}>
      <QuizFlow />
    </Suspense>
  );
}
