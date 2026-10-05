/** Returnerer en blandet kopi af listen (Fisher–Yates). Originalen ændres ikke. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** "1 point", "2 point", "-1 point" – point bøjes ens i ental og flertal. */
export function formatPoints(points: number): string {
  return `${points} point`;
}

/** ["A", "B", "C"] -> "A, B og C" */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} og ${names[names.length - 1]}`;
}

/**
 * Stien appen ligger under. Tom på Vercel og lokalt, men "/<repo-navn>" på
 * GitHub Pages (sættes i next.config.js). Next.js sætter selv stien foran
 * links og sider, men IKKE foran fetch() og adresser, vi selv bygger –
 * derfor bruges BASE_PATH de steder.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
