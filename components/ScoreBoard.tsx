"use client";

import { PLAYER_COLORS, type Player } from "@/lib/types";
import { ranking, type AllScores } from "@/lib/storage";
import { formatPoints } from "@/lib/utils";

interface Props {
  scores: AllScores;
  /** Den spiller, der spiller på denne enhed – fremhæves i listen. */
  currentPlayer?: Player | null;
  title?: string;
}

/** Kompakt stilling: alle fire spillere sorteret efter point. */
export default function ScoreBoard({
  scores,
  currentPlayer,
  title = "Stilling denne uge",
}: Props) {
  const order = ranking(scores);

  return (
    <section className="rounded-xl bg-slate-800 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      <ol className="space-y-1">
        {order.map((player, index) => {
          const score = scores[player];
          const isCurrent = player === currentPlayer;
          return (
            <li
              key={player}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                isCurrent ? "bg-slate-700" : ""
              }`}
            >
              <span className="w-4 text-right tabular-nums text-slate-400">
                {index + 1}
              </span>
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${PLAYER_COLORS[player].bg}`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {player}
                {isCurrent && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    (dig)
                  </span>
                )}
              </span>
              <span className="hidden text-xs tabular-nums text-slate-400 sm:inline">
                {score.correctCount} rigtige af {score.answeredCount}
              </span>
              <span className="w-16 text-right font-semibold tabular-nums">
                {formatPoints(score.totalScore)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
