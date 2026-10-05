"use client";

import {
  ALL_CATEGORIES,
  CATEGORIES,
  type CategoryChoice,
} from "@/lib/types";

interface Props {
  selected: CategoryChoice;
  onSelect: (category: CategoryChoice) => void;
  /** Antal spørgsmål pr. kategori (hentet fra API'et). Tom indtil den er hentet. */
  counts: Partial<Record<CategoryChoice, number>>;
}

/** Knapper til valg af kategori, plus "Alle" som blander alle kategorier. */
export default function CategorySelector({ selected, onSelect, counts }: Props) {
  const choices: CategoryChoice[] = [ALL_CATEGORIES, ...CATEGORIES];

  return (
    <section className="rounded-xl bg-slate-800 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        2. Vælg kategori
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {choices.map((category) => {
          const isSelected = category === selected;
          const count = counts[category];
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelect(category)}
              aria-pressed={isSelected}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-emerald-500 text-slate-900"
                  : "bg-slate-600 text-slate-100 hover:bg-slate-500"
              }`}
            >
              <span>
                {category === ALL_CATEGORIES ? "Alle kategorier" : category}
              </span>
              {count !== undefined && (
                <span
                  className={`shrink-0 text-xs tabular-nums ${
                    isSelected ? "text-slate-800" : "text-slate-300"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
