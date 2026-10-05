"use client";

import { useMemo, useState } from "react";
import { HINT_PENALTY, type Question } from "@/lib/types";
import { shuffle } from "@/lib/utils";

interface Props {
  question: Question;
  /** Spørgsmålets nummer i runden (1, 2, 3 ...). */
  number: number;
  total: number;
  /** false = spørgsmålet er allerede besvaret i denne uge og er kun øvelse. */
  counts: boolean;
  isLast: boolean;
  onAnswer: (correct: boolean) => void;
  onHint: () => void;
  onNext: () => void;
}

const TRUE_FALSE_OPTIONS = ["Sandt", "Falsk"];

/**
 * Viser ét spørgsmål ad gangen. Forsiden af kortet er svarknapperne;
 * når der er svaret, vises rigtigt/forkert, forklaring og reference.
 *
 * Komponenten nulstilles mellem spørgsmål ved at quiz-siden giver den
 * `key={question.id}`.
 */
export default function QuestionCard({
  question,
  number,
  total,
  counts,
  isLast,
  onAnswer,
  onHint,
  onNext,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hintShown, setHintShown] = useState(false);

  // Svarmulighederne blandes én gang pr. spørgsmål, så det rigtige svar ikke
  // altid står samme sted. Sandt/falsk beholder sin faste rækkefølge.
  const options = useMemo(
    () =>
      question.type === "true_false"
        ? TRUE_FALSE_OPTIONS
        : shuffle(question.options ?? []),
    [question]
  );

  const answered = selected !== null;
  const isCorrect = selected === question.correctAnswer;

  function handleSelect(option: string) {
    if (answered) return; // kun ét svar pr. spørgsmål
    setSelected(option);
    onAnswer(option === question.correctAnswer);
  }

  function handleHint() {
    if (hintShown || answered) return;
    setHintShown(true);
    onHint();
  }

  const typeLabel =
    question.type === "true_false"
      ? "Sandt eller falsk"
      : question.type === "paragraph"
        ? "Vælg korrekt paragraf"
        : "Multiple choice";

  return (
    <article className="rounded-xl bg-slate-800 p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          Spørgsmål {number} af {total} · {question.category}
        </span>
        <span className="rounded-full bg-slate-700 px-2 py-1">{typeLabel}</span>
      </div>

      <h2 className="text-lg font-semibold leading-snug sm:text-xl">
        {question.questionText}
      </h2>

      {!counts && (
        <p className="mt-2 text-xs text-slate-400">
          Øvelse: du har allerede svaret på dette spørgsmål i denne uge, så det
          giver ikke point.
        </p>
      )}

      <div className="mt-4 grid gap-2">
        {options.map((option) => {
          const isThisCorrect = option === question.correctAnswer;
          const isThisSelected = option === selected;

          let style = "bg-slate-600 hover:bg-slate-500 border-transparent";
          if (answered) {
            if (isThisCorrect) {
              style = "bg-emerald-500/20 border-emerald-400 text-emerald-100";
            } else if (isThisSelected) {
              style = "bg-rose-500/20 border-rose-400 text-rose-100";
            } else {
              style = "bg-slate-700/60 border-transparent text-slate-400";
            }
          }

          return (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              disabled={answered}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors sm:text-base ${style} ${
                answered ? "cursor-default" : ""
              }`}
            >
              {option}
              {answered && isThisCorrect && (
                <span className="ml-2 text-xs font-semibold uppercase tracking-wide">
                  · rigtigt svar
                </span>
              )}
              {answered && isThisSelected && !isThisCorrect && (
                <span className="ml-2 text-xs font-semibold uppercase tracking-wide">
                  · dit svar
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Hint: vises kun, hvis spørgsmålet har et hint, og kun før der er svaret. */}
      {question.hint && !answered && !hintShown && (
        <button
          type="button"
          onClick={handleHint}
          className="mt-4 rounded-lg bg-slate-600 px-4 py-2 text-sm hover:bg-slate-500"
        >
          {counts ? `Vis hint (−${HINT_PENALTY} point)` : "Vis hint"}
        </button>
      )}
      {question.hint && hintShown && (
        <p className="mt-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <span className="font-semibold">Hint: </span>
          {question.hint}
          {counts && (
            <span className="text-amber-200/70"> (−{HINT_PENALTY} point)</span>
          )}
        </p>
      )}

      {answered && (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p
            className={`text-base font-semibold ${
              isCorrect ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isCorrect ? "Rigtigt!" : "Forkert."}
            {counts && (
              <span className="ml-2 text-sm font-normal text-slate-300">
                {isCorrect ? "+1 point" : "0 point"}
              </span>
            )}
          </p>
          <p className="text-sm leading-relaxed text-slate-200">
            {question.explanation}
          </p>
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Reference: </span>
            {question.reference}
          </p>
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-900 hover:bg-emerald-400 sm:w-auto"
          >
            {isLast ? "Se resultat" : "Næste spørgsmål"}
          </button>
        </div>
      )}
    </article>
  );
}
