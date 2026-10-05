"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WeekSummary } from "@/lib/types";
import { joinNames } from "@/lib/utils";
import {
  acknowledgeWeek,
  getWeekKey,
  isNewWeekSinceLastVisit,
  loadLastWeekSummary,
  totalAnswered,
  weekLabel,
  type AllScores,
} from "@/lib/storage";

interface Props {
  scores: AllScores;
  /**
   * Tæller som siden øger, når den har ændret noget i localStorage
   * (fx nulstillet scores), så oversigten læses igen.
   */
  version?: number;
  /** Vis genvej til nulstilling på leaderboardet (bruges på forsiden). */
  showResetLink?: boolean;
}

/**
 * UGENTLIG LOGIK:
 * Der kører ingen cron søndag kl. 23:59. I stedet tjekker komponenten, når
 * appen åbnes, om ugenummeret er skiftet siden sidste besøg. Er det det, vises
 * beskeden "Ny uge – scores kan nulstilles". Selve nulstillingen er manuel og
 * sker på leaderboardet, hvor resultatet af ugen samtidig gemmes, så det kan
 * vises her som "sidste uge".
 */
export default function WeeklySummary({
  scores,
  version = 0,
  showResetLink = false,
}: Props) {
  const [newWeek, setNewWeek] = useState(false);
  const [lastWeek, setLastWeek] = useState<WeekSummary | null>(null);
  const [currentWeek, setCurrentWeek] = useState("");

  // localStorage findes kun i browseren, så det læses først efter mount.
  useEffect(() => {
    setNewWeek(isNewWeekSinceLastVisit());
    setLastWeek(loadLastWeekSummary());
    setCurrentWeek(getWeekKey());
  }, [version]);

  function dismiss() {
    acknowledgeWeek();
    setNewWeek(false);
  }

  const answeredThisWeek = totalAnswered(scores);

  return (
    <section className="space-y-3">
      {newWeek && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/50 bg-emerald-500/10 p-4"
        >
          <p className="font-semibold text-emerald-300">
            Ny uge – scores kan nulstilles
          </p>
          <div className="flex gap-2">
            {showResetLink && (
              <Link
                href="/leaderboard"
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
              >
                Gå til nulstilling
              </Link>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg bg-slate-600 px-3 py-2 text-sm hover:bg-slate-500"
            >
              Skjul
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-slate-800 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Ugeoversigt
        </h2>

        {lastWeek ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-400">
                Vinder, {weekLabel(lastWeek.weekKey)}
              </dt>
              <dd className="font-semibold text-emerald-400">
                {joinNames(lastWeek.winners)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">
                Sidst, {weekLabel(lastWeek.weekKey)}
              </dt>
              <dd className="font-semibold text-rose-400">
                {joinNames(lastWeek.losers)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Besvarede spørgsmål</dt>
              <dd className="font-semibold tabular-nums">
                {lastWeek.totalAnswered}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-300">
            Ingen afsluttet uge endnu. Vinder og sidsteplads vises her, første
            gang scores nulstilles.
          </p>
        )}

        <p className="mt-3 border-t border-slate-700 pt-3 text-xs text-slate-400">
          {currentWeek ? `Nu: ${weekLabel(currentWeek)}` : "Nu"} ·{" "}
          {answeredThisWeek} besvarede spørgsmål indtil videre · ugen slutter
          søndag kl. 23:59
        </p>
      </div>
    </section>
  );
}
