"use client";

import {
  CORRECT_PER_FIELD,
  PLAYERS,
  PLAYER_COLORS,
  TRACK_FIELDS,
  type Player,
} from "@/lib/types";
import {
  correctUntilNextField,
  trackPosition,
  type AllScores,
} from "@/lib/storage";

interface Props {
  scores: AllScores;
  currentPlayer?: Player | null;
}

/**
 * Vandret konkurrencebane med TRACK_FIELDS felter og én bane pr. spiller.
 *
 * SÅDAN BEREGNES RACETRACKET:
 *  - Feltet findes med trackPosition() i lib/storage.ts:
 *    felt = antal rigtige svar / CORRECT_PER_FIELD (rundet ned), maks. sidste felt.
 *  - Brikken placeres med `left` i procent midt i sit felt. Fordi `left` har en
 *    CSS-transition, glider brikken hen til det nye felt, når scoren ændrer sig.
 *  - Vil du ændre reglerne, så ret TRACK_FIELDS og CORRECT_PER_FIELD i lib/types.ts.
 */
export default function RaceTrack({ scores, currentPlayer }: Props) {
  const fields = Array.from({ length: TRACK_FIELDS }, (_, index) => index);
  const positions = PLAYERS.map((player) => trackPosition(scores[player]));
  const front = Math.max(...positions);
  // Der er kun en "fører", når mindst én er rykket væk fra startfeltet.
  const hasLeader = front > 0;

  return (
    <section className="rounded-xl bg-slate-800 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Racetrack
        </h2>
        <p className="text-xs text-slate-400">
          {CORRECT_PER_FIELD} rigtige svar = 1 felt frem
        </p>
      </div>

      {/* Feltnumre over banerne */}
      <div
        className="mb-1 grid text-center text-[10px] text-slate-500"
        style={{ gridTemplateColumns: `repeat(${TRACK_FIELDS}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {fields.map((field) => (
          <span key={field}>
            {field === 0 ? "Start" : field === TRACK_FIELDS - 1 ? "Mål" : field + 1}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {PLAYERS.map((player, index) => {
          const position = positions[index];
          const isFront = hasLeader && position === front;
          const remaining = correctUntilNextField(scores[player]);
          // Midten af feltet i procent af banens bredde.
          const left = ((position + 0.5) / TRACK_FIELDS) * 100;

          return (
            <div key={player}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span
                  className={`font-medium ${
                    player === currentPlayer ? "text-white" : "text-slate-300"
                  }`}
                >
                  {player}
                  {isFront && (
                    <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-900">
                      Foran
                    </span>
                  )}
                </span>
                <span className="tabular-nums text-slate-400">
                  {remaining === 0
                    ? "I mål"
                    : `felt ${position + 1} · ${remaining} til næste`}
                </span>
              </div>

              <div
                className="relative h-9"
                role="img"
                aria-label={`${player} står på felt ${position + 1} af ${TRACK_FIELDS}`}
              >
                {/* Selve banen: felter adskilt af tynde streger */}
                <div
                  className="grid h-full overflow-hidden rounded-lg bg-slate-700"
                  style={{
                    gridTemplateColumns: `repeat(${TRACK_FIELDS}, minmax(0, 1fr))`,
                  }}
                >
                  {fields.map((field) => (
                    <div
                      key={field}
                      className={`border-r border-slate-900/60 last:border-r-0 ${
                        field === TRACK_FIELDS - 1
                          ? "bg-emerald-500/20" // målfeltet
                          : field <= position
                            ? "bg-slate-600" // felter spilleren har passeret
                            : ""
                      }`}
                    />
                  ))}
                </div>

                {/* Brikken – transition på `left` giver den lille bevægelse */}
                <div
                  className={`absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-slate-900 shadow transition-[left] duration-700 ease-out ${
                    PLAYER_COLORS[player].bg
                  } ${isFront ? "ring-2 ring-white" : "ring-2 ring-slate-900/50"}`}
                  style={{ left: `${left}%` }}
                >
                  {/* "Spiller 2" -> "2", "Adam" -> "A" */}
                  {player.match(/\d+$/)?.[0] ?? player.charAt(0)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
