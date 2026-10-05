// ---------------------------------------------------------------------------
// Fælles typer og konstanter for hele appen.
// Vil du ændre spillere, kategorier eller racetrack-regler, er det HER.
// ---------------------------------------------------------------------------

/**
 * Kategorier. Navnet skal stå PRÆCIS sådan i "category"-feltet i
 * data/questions.json. Tilføj en ny kategori ved at tilføje en linje her –
 * forsiden, leaderboardet og API'et opdager den automatisk.
 */
export const CATEGORIES = [
  "Myndighedsfasen",
  "Projekteringsfasen",
  "Udbudsfasen",
  "Brand",
  "Statik",
  "Energiramme",
  "Indeklima",
  "Materialevalg",
  "Detaljer",
  "Tidsplan og proces",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Særligt valg på forsiden: bland spørgsmål fra alle kategorier. */
export const ALL_CATEGORIES = "Alle" as const;
export type CategoryChoice = Category | typeof ALL_CATEGORIES;

/** De fire faste spillere. Ret navnene her, hvis I vil bruge jeres egne. */
export const PLAYERS = ["Adam", "Spiller 2", "Spiller 3", "Spiller 4"] as const;

export type Player = (typeof PLAYERS)[number];

/** Farver til spillernes brikker (hele klassenavne, så Tailwind kan finde dem). */
export const PLAYER_COLORS: Record<Player, { bg: string; text: string }> = {
  Adam: { bg: "bg-emerald-400", text: "text-emerald-400" },
  "Spiller 2": { bg: "bg-sky-400", text: "text-sky-400" },
  "Spiller 3": { bg: "bg-amber-400", text: "text-amber-400" },
  "Spiller 4": { bg: "bg-rose-400", text: "text-rose-400" },
};

/**
 * Spørgsmålstyper:
 *  - "mcq"        multiple choice med 4 svarmuligheder
 *  - "true_false" sandt/falsk (ingen "options" – correctAnswer er "Sandt" eller "Falsk")
 *  - "paragraph"  "vælg korrekt paragraf" (4 svarmuligheder med paragraffer/standarder)
 */
export type QuestionType = "mcq" | "true_false" | "paragraph";

export interface Question {
  id: string;
  category: Category;
  type: QuestionType;
  questionText: string;
  /** Svarmuligheder. Kræves for "mcq" og "paragraph", udelades for "true_false". */
  options?: string[];
  /** Skal være præcis samme tekst som én af svarmulighederne. */
  correctAnswer: string;
  /** Kort forklaring, der vises efter svaret. */
  explanation: string;
  /** Kilde, fx "BR18 § 259", "SBi-anvisning 224" eller "Projekt: Kravliste ED1". */
  reference: string;
  /** Valgfrit hint. Koster 1 point at se. Uden hint vises hint-knappen ikke. */
  hint?: string;
}

/** Én linje i en spillers historik: enten et svar eller et brugt hint. */
export interface HistoryEntry {
  kind: "answer" | "hint";
  questionId: string;
  category: Category;
  /** Kun for svar: var det rigtigt? */
  correct?: boolean;
  /** Point for denne hændelse: +1 (rigtigt), 0 (forkert) eller -1 (hint). */
  points: number;
  timestamp: number;
}

/**
 * En spillers score. Gemmes i localStorage under nøglen
 * `quiz_scores_{playerName}`.
 */
export interface Score {
  totalScore: number;
  perCategoryScores: Partial<Record<Category, number>>;
  history: HistoryEntry[];
  /** Antal rigtige svar – det er dette tal, racetracket regner med. */
  correctCount: number;
  /** Antal besvarede spørgsmål, der har talt med i konkurrencen. */
  answeredCount: number;
  /** Ugen scoren hører til, fx "2026-W40". */
  weekKey: string;
  /** Sidst ændret (ms siden 1970). Bruges når scores deles mellem enheder. */
  updatedAt: number;
}

/** Øjebliksbillede af en afsluttet uge. Gemmes når scores nulstilles. */
export interface WeekSummary {
  weekKey: string;
  winners: Player[];
  losers: Player[];
  totalAnswered: number;
  standings: { player: Player; totalScore: number }[];
}

// ---------------------------------------------------------------------------
// Spilleregler – ret tallene her.
// ---------------------------------------------------------------------------

/** Antal felter på racetracket. */
export const TRACK_FIELDS = 10;
/** Antal rigtige svar, der flytter brikken ét felt frem. */
export const CORRECT_PER_FIELD = 5;
/** Maks. antal spørgsmål i én quizrunde. */
export const ROUND_SIZE = 10;
/** Point der trækkes, når man bruger et hint. */
export const HINT_PENALTY = 1;
/**
 * true  = hvert spørgsmål giver kun point første gang pr. uge (resten er øvelse).
 * false = man får point hver gang, også for spørgsmål man har set før.
 * Slået til som standard, så ingen kan vinde ved at tage de samme spørgsmål igen og igen.
 */
export const COUNT_ONLY_FIRST_ATTEMPT = true;
