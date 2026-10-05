"use client";

import { PLAYERS, PLAYER_COLORS, type Player } from "@/lib/types";

interface Props {
  selected: Player | null;
  onSelect: (player: Player) => void;
}

/** Fire knapper – én pr. spiller. Valget gemmes i localStorage af forsiden. */
export default function PlayerSelector({ selected, onSelect }: Props) {
  return (
    <section className="rounded-xl bg-slate-800 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        1. Hvem spiller?
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PLAYERS.map((player) => {
          const isSelected = player === selected;
          return (
            <button
              key={player}
              type="button"
              onClick={() => onSelect(player)}
              aria-pressed={isSelected}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-emerald-500 text-slate-900"
                  : "bg-slate-600 text-slate-100 hover:bg-slate-500"
              }`}
            >
              <span
                className={`h-3 w-3 shrink-0 rounded-full ring-2 ring-slate-900/40 ${PLAYER_COLORS[player].bg}`}
                aria-hidden="true"
              />
              {player}
            </button>
          );
        })}
      </div>
    </section>
  );
}
