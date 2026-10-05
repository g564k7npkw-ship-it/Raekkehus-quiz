// ---------------------------------------------------------------------------
// Bygger appen til GitHub Pages:  npm run build:pages
//
//  1. Finder repo-navnet (fra git, eller som argument:
//     npm run build:pages -- mit-repo-navn).
//  2. Bygger appen som statiske filer med "/<repo-navn>" som basePath.
//  3. Lægger resultatet i docs/, som GitHub Pages viser
//     (Settings -> Pages -> Deploy from a branch -> main, /docs).
//
// Kør scriptet og commit docs/ hver gang kode eller spørgsmål er ændret –
// ellers viser GitHub Pages stadig den gamle udgave.
// ---------------------------------------------------------------------------

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function repoName() {
  const fromArg = process.argv[2];
  if (fromArg) return fromArg;
  try {
    const url = execSync("git remote get-url origin", {
      cwd: root,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const name = url.replace(/\.git$/, "").split(/[/:]/).pop();
    if (name) return name;
  } catch {
    // Intet git-repo eller ingen "origin": brug standardnavnet.
  }
  return "raekkehus-quiz";
}

const name = repoName();
// Et repo med navnet <bruger>.github.io vises i roden af domænet (ingen basePath).
const basePath = /\.github\.io$/i.test(name) ? "" : `/${name}`;

console.log(`Bygger til GitHub Pages med basePath "${basePath || "/"}" ...`);
execSync("npx next build", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, GITHUB_PAGES: "true", PAGES_BASE_PATH: basePath },
});

const out = path.join(root, "out");
const docs = path.join(root, "docs");
fs.rmSync(docs, { recursive: true, force: true });
fs.cpSync(out, docs, { recursive: true });
fs.rmSync(out, { recursive: true, force: true });
// Uden .nojekyll springer GitHub Pages mapper over, der starter med "_" (fx _next).
fs.writeFileSync(path.join(docs, ".nojekyll"), "");

console.log(`Færdig: docs/ er klar. Commit mappen og push til main.`);
