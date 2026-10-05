// ---------------------------------------------------------------------------
// To måder at bygge appen på:
//
//  1. Almindelig (npm run dev / npm run build): til lokal kørsel og Vercel.
//  2. GitHub Pages (npm run build:pages): appen eksporteres som rene statiske
//     filer til mappen docs/, som GitHub Pages viser direkte fra repoet.
//
// GitHub Pages viser siden under https://<bruger>.github.io/<repo-navn>/,
// så dér skal alle adresser have "/<repo-navn>" foran. Det er basePath.
// scripts/build-pages.js finder selv repo-navnet og sætter PAGES_BASE_PATH.
// ---------------------------------------------------------------------------

const isPages = process.env.GITHUB_PAGES === "true";
const basePath = isPages ? process.env.PAGES_BASE_PATH ?? "/Raekkehus-quiz" : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gør stien tilgængelig i browser-koden (se BASE_PATH i lib/utils.ts).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // trailingSlash giver mapper med index.html (quiz/index.html), som GitHub Pages
  // viser uden omveje, og gør at forsiden kan forhåndsindlæses under basePath.
  ...(isPages ? { output: "export", basePath, trailingSlash: true } : {}),
};

module.exports = nextConfig;
