// ---------------------------------------------------------------------------
// Al læsning og skrivning til localStorage samles her.
//
// SÅDAN GEMMES SCORING:
//  - Hver spiller har sin egen nøgle: `quiz_scores_{spillernavn}`.
//  - Værdien er et Score-objekt (se lib/types.ts) gemt som JSON.
//  - Et rigtigt svar giver +1, et forkert 0, og et hint trækker 1 point.
//  - localStorage bor i den enkelte browser. Spiller I på hver jeres telefon,
//    deles stillingen med "Del min score"-linket på leaderboardet
//    (se encodeShare / importShared nederst i filen).
//
// Alle funktioner tjekker `typeof window`, så de er ufarlige at importere
// i komponenter, som Next.js også kører på serveren.
// ---------------------------------------------------------------------------

import {
  CATEGORIES,
  CORRECT_PER_FIELD,
  COUNT_ONLY_FIRST_ATTEMPT,
  HINT_PENALTY,
  PLAYERS,
  TRACK_FIELDS,
  type Category,
  type HistoryEntry,
  type Player,
  type Question,
  type Score,
  type WeekSummary,
} from "./types";

const PLAYER_KEY = "quiz_player";
const LAST_VISIT_WEEK_KEY = "quiz_last_visit_week";
const LAST_WEEK_SUMMARY_KEY = "quiz_last_week_summary";

export const scoreKey = (player: Player) => `quiz_scores_${player}`;

const hasStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

/** Læs en værdi uden at vælte appen, hvis localStorage er blokeret. */
function read(key: string): string | null {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Fuldt eller blokeret lager: appen virker stadig, men scoren gemmes ikke.
  }
}

function remove(key: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignoreres
  }
}

// ---------------------------------------------------------------------------
// Uge-logik (mandag–søndag)
// ---------------------------------------------------------------------------

/**
 * Returnerer ISO-ugen som tekst, fx "2026-W40". ISO-uger går fra mandag til
 * søndag, så en ny uge begynder automatisk efter søndag kl. 23:59.
 */
export function getWeekKey(date: Date = new Date()): string {
  // Regn på datoen i lokal tid, men i UTC-felter, så sommertid ikke driller.
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const weekday = d.getUTCDay() || 7; // mandag = 1 ... søndag = 7
  d.setUTCDate(d.getUTCDate() + 4 - weekday); // torsdag i samme uge bestemmer året
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** "2026-W40" -> "uge 40" */
export function weekLabel(weekKey: string): string {
  const week = Number(weekKey.split("-W")[1]);
  return Number.isFinite(week) ? `uge ${week}` : weekKey;
}

/**
 * Tjekker om ugenummeret er skiftet siden sidste besøg. Første gang appen
 * åbnes, gemmes ugen bare – så er der ikke noget at sammenligne med.
 */
export function isNewWeekSinceLastVisit(): boolean {
  const current = getWeekKey();
  const last = read(LAST_VISIT_WEEK_KEY);
  if (!last) {
    write(LAST_VISIT_WEEK_KEY, current);
    return false;
  }
  return last !== current;
}

/** Kaldes når brugeren har set "Ny uge"-beskeden (eller har nulstillet). */
export function acknowledgeWeek(): void {
  write(LAST_VISIT_WEEK_KEY, getWeekKey());
}

// ---------------------------------------------------------------------------
// Valgt spiller
// ---------------------------------------------------------------------------

export function isPlayer(value: unknown): value is Player {
  return typeof value === "string" && (PLAYERS as readonly string[]).includes(value);
}

export function loadPlayer(): Player | null {
  const value = read(PLAYER_KEY);
  return isPlayer(value) ? value : null;
}

export function savePlayer(player: Player): void {
  write(PLAYER_KEY, player);
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

export function emptyScore(): Score {
  return {
    totalScore: 0,
    perCategoryScores: {},
    history: [],
    correctCount: 0,
    answeredCount: 0,
    weekKey: getWeekKey(),
    updatedAt: 0,
  };
}

const num = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * Læser en spillers score. Er der intet gemt – eller er indholdet ødelagt –
 * returneres en tom score i stedet for at smide en fejl.
 */
export function loadScore(player: Player): Score {
  const raw = read(scoreKey(player));
  if (!raw) return emptyScore();
  try {
    const data = JSON.parse(raw) as Partial<Score> | null;
    if (!data || typeof data !== "object") return emptyScore();

    const perCategoryScores: Partial<Record<Category, number>> = {};
    for (const category of CATEGORIES) {
      const value = data.perCategoryScores?.[category];
      if (typeof value === "number" && Number.isFinite(value)) {
        perCategoryScores[category] = value;
      }
    }
    const history = Array.isArray(data.history) ? data.history : [];
    const answers = history.filter((entry) => entry?.kind === "answer");

    return {
      totalScore: num(data.totalScore),
      perCategoryScores,
      history,
      // Ældre/importerede data kan mangle tællerne – så udledes de af historikken.
      correctCount: num(
        data.correctCount,
        answers.filter((entry) => entry.correct).length
      ),
      answeredCount: num(data.answeredCount, answers.length),
      weekKey: typeof data.weekKey === "string" ? data.weekKey : getWeekKey(),
      updatedAt: num(data.updatedAt),
    };
  } catch {
    return emptyScore();
  }
}

export function saveScore(player: Player, score: Score): void {
  write(scoreKey(player), JSON.stringify(score));
}

export type AllScores = Record<Player, Score>;

export function loadAllScores(): AllScores {
  const all = {} as AllScores;
  for (const player of PLAYERS) all[player] = loadScore(player);
  return all;
}

/** Tomme scores til første rendering (før localStorage er læst i browseren). */
export function emptyScores(): AllScores {
  const all = {} as AllScores;
  for (const player of PLAYERS) all[player] = emptyScore();
  return all;
}

/** Har spilleren allerede svaret på spørgsmålet siden sidste nulstilling? */
export function hasAnswered(score: Score, questionId: string): boolean {
  return score.history.some(
    (entry) => entry.kind === "answer" && entry.questionId === questionId
  );
}

/** Tæller spørgsmålet med i konkurrencen for denne spiller lige nu? */
export function countsForScore(score: Score, questionId: string): boolean {
  return !COUNT_ONLY_FIRST_ATTEMPT || !hasAnswered(score, questionId);
}

function applyEntry(score: Score, entry: HistoryEntry): Score {
  const perCategoryScores = { ...score.perCategoryScores };
  perCategoryScores[entry.category] =
    (perCategoryScores[entry.category] ?? 0) + entry.points;
  const isAnswer = entry.kind === "answer";
  return {
    ...score,
    totalScore: score.totalScore + entry.points,
    perCategoryScores,
    history: [...score.history, entry],
    correctCount: score.correctCount + (isAnswer && entry.correct ? 1 : 0),
    answeredCount: score.answeredCount + (isAnswer ? 1 : 0),
    // Første hændelse efter en nulstilling bestemmer, hvilken uge scoren hører til.
    weekKey: score.history.length === 0 ? getWeekKey() : score.weekKey,
    updatedAt: Date.now(),
  };
}

/**
 * Gemmer et svar: +1 point for rigtigt, 0 for forkert.
 * Returnerer den opdaterede score.
 */
export function recordAnswer(
  player: Player,
  question: Question,
  correct: boolean
): Score {
  const updated = applyEntry(loadScore(player), {
    kind: "answer",
    questionId: question.id,
    category: question.category,
    correct,
    points: correct ? 1 : 0,
    timestamp: Date.now(),
  });
  saveScore(player, updated);
  return updated;
}

/**
 * Gemmer et brugt hint: -1 point. Trækkes med det samme, når hintet vises,
 * så man ikke kan kigge på hintet og derefter forlade spørgsmålet gratis.
 */
export function recordHint(player: Player, question: Question): Score {
  const updated = applyEntry(loadScore(player), {
    kind: "hint",
    questionId: question.id,
    category: question.category,
    points: -HINT_PENALTY,
    timestamp: Date.now(),
  });
  saveScore(player, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Racetrack
// ---------------------------------------------------------------------------

/**
 * SÅDAN BEREGNES RACETRACKET:
 * Brikken starter på felt 1 (index 0) og rykker ét felt frem for hver
 * CORRECT_PER_FIELD rigtige svar. Den kan ikke komme længere end sidste felt.
 * Med standardreglerne (10 felter, 5 rigtige pr. felt) er man i mål ved
 * 45 rigtige svar. Hints og forkerte svar flytter ikke brikken tilbage –
 * det er kun antal rigtige svar, der tæller her.
 */
export function trackPosition(score: Score): number {
  const steps = Math.floor(score.correctCount / CORRECT_PER_FIELD);
  return Math.max(0, Math.min(TRACK_FIELDS - 1, steps));
}

/** Hvor mange rigtige svar mangler, før brikken rykker næste gang? (0 = i mål) */
export function correctUntilNextField(score: Score): number {
  if (trackPosition(score) >= TRACK_FIELDS - 1) return 0;
  return CORRECT_PER_FIELD - (score.correctCount % CORRECT_PER_FIELD);
}

// ---------------------------------------------------------------------------
// Stilling, ugens taber og nulstilling
// ---------------------------------------------------------------------------

export function totalAnswered(scores: AllScores): number {
  return PLAYERS.reduce((sum, player) => sum + scores[player].answeredCount, 0);
}

/** Spillerne sorteret efter point (flest først). Ved pointlighed: flest rigtige. */
export function ranking(scores: AllScores): Player[] {
  return [...PLAYERS].sort(
    (a, b) =>
      scores[b].totalScore - scores[a].totalScore ||
      scores[b].correctCount - scores[a].correctCount
  );
}

/** Alle spillere med den højeste score (flere ved pointlighed). */
export function leaders(scores: AllScores): Player[] {
  const max = Math.max(...PLAYERS.map((player) => scores[player].totalScore));
  return PLAYERS.filter((player) => scores[player].totalScore === max);
}

/** Alle spillere med den laveste score (flere ved pointlighed). */
export function trailers(scores: AllScores): Player[] {
  const min = Math.min(...PLAYERS.map((player) => scores[player].totalScore));
  return PLAYERS.filter((player) => scores[player].totalScore === min);
}

export function loadLastWeekSummary(): WeekSummary | null {
  const raw = read(LAST_WEEK_SUMMARY_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as WeekSummary;
    if (!data || !Array.isArray(data.winners) || !Array.isArray(data.losers)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Nulstiller alle spilleres scores. Inden da gemmes et øjebliksbillede af
 * ugen (vinder, sidsteplads, antal besvarede), som WeeklySummary viser som
 * "sidste uge". Har ingen svaret på noget, beholdes det gamle øjebliksbillede.
 */
export function resetAllScores(): void {
  const scores = loadAllScores();
  const answered = totalAnswered(scores);

  if (answered > 0) {
    // Ugen, scoren hører til, tages fra den spiller, der sidst var aktiv.
    const mostRecent = [...PLAYERS].sort(
      (a, b) => scores[b].updatedAt - scores[a].updatedAt
    )[0];
    const summary: WeekSummary = {
      weekKey: scores[mostRecent].weekKey,
      winners: leaders(scores),
      losers: trailers(scores),
      totalAnswered: answered,
      standings: ranking(scores).map((player) => ({
        player,
        totalScore: scores[player].totalScore,
      })),
    };
    write(LAST_WEEK_SUMMARY_KEY, JSON.stringify(summary));
  }

  for (const player of PLAYERS) remove(scoreKey(player));
  acknowledgeWeek();
}

// ---------------------------------------------------------------------------
// Deling af score mellem enheder (uden server)
// ---------------------------------------------------------------------------
// localStorage kan ikke ses fra andre telefoner. I stedet pakkes en spillers
// score ned i et link. Når en anden åbner linket, lægges scoren ind i
// DERES localStorage, så leaderboardet viser alle fire.

interface SharePayload {
  p: string; // spiller
  s: number; // total
  c: number[]; // point pr. kategori, i samme rækkefølge som CATEGORIES
  r: number; // antal rigtige
  a: number; // antal besvarede
  w: string; // uge
  u: number; // sidst opdateret
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const base64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Pakker en spillers score til en kort kode, der kan sættes på et link. */
export function encodeShare(player: Player, score: Score): string {
  const payload: SharePayload = {
    p: player,
    s: score.totalScore,
    c: CATEGORIES.map((category) => score.perCategoryScores[category] ?? 0),
    r: score.correctCount,
    a: score.answeredCount,
    w: score.weekKey,
    u: score.updatedAt,
  };
  return toBase64Url(JSON.stringify(payload));
}

export type ImportResult =
  | { status: "imported"; player: Player; totalScore: number }
  | { status: "older"; player: Player }
  | { status: "own"; player: Player }
  | { status: "invalid" };

/**
 * Læser en delt kode og gemmer scoren lokalt – men kun hvis den er nyere end
 * den, der allerede ligger på enheden, så et gammelt link ikke overskriver
 * en nyere score.
 */
export function importShared(code: string): ImportResult {
  try {
    const data = JSON.parse(fromBase64Url(code)) as Partial<SharePayload>;
    if (!isPlayer(data.p) || !Array.isArray(data.c)) {
      return { status: "invalid" };
    }
    const player = data.p;
    const updatedAt = num(data.u);
    const local = loadScore(player);
    // Din egen spiller på denne enhed har den fulde historik (bruges til at
    // huske, hvilke spørgsmål der allerede har givet point) – den overskrives ikke.
    if (player === loadPlayer() && local.history.length > 0) {
      return { status: "own", player };
    }
    if (updatedAt <= local.updatedAt) {
      return { status: "older", player };
    }

    const perCategoryScores: Partial<Record<Category, number>> = {};
    CATEGORIES.forEach((category, index) => {
      const value = num(data.c?.[index]);
      if (value !== 0) perCategoryScores[category] = value;
    });

    const imported: Score = {
      totalScore: num(data.s),
      perCategoryScores,
      history: [], // historikken er for lang til et link – tællerne er nok til stillingen
      correctCount: Math.max(0, num(data.r)),
      answeredCount: Math.max(0, num(data.a)),
      weekKey: typeof data.w === "string" ? data.w : getWeekKey(),
      updatedAt,
    };
    saveScore(player, imported);
    return { status: "imported", player, totalScore: imported.totalScore };
  } catch {
    return { status: "invalid" };
  }
}
