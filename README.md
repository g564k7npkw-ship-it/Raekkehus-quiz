# Rækkehus-quiz

Quiz-app til eksamensforberedelse på bygningskonstruktør-semesterprojektet (rækkehuse, Generationernes Kvarter). 80 spørgsmål om myndighed, projektering, udbud, brand, statik, energi, indeklima, materialer, detaljer og tidsplan – med referencer til BR18, AB 18, YBL 2018, SBi-anvisninger og vores egne projektdokumenter.

Bygget med Next.js 14 (App Router), React, TypeScript og Tailwind CSS. Ingen database: spørgsmål ligger i `data/questions.json`, og scores gemmes i browserens localStorage.

## Kør lokalt

Kræver Node.js 18.17 eller nyere.

```bash
npm install
npm run dev
```

Åbn http://localhost:3000. Test en produktionsbygning med `npm run build` og `npm run start`.

## Åbn appen på telefonen (GitHub Pages)

Mappen `docs/` indeholder en færdigbygget udgave af appen. GitHub kan vise den som en hjemmeside direkte fra repoet, uden server og uden Vercel:

1. Læg projektet i et **offentligt** GitHub-repo (gratis GitHub Pages kræver et offentligt repo). `docs/` skal ligge i roden af repoet.
2. Gå til repoet på GitHub: **Settings → Pages**. Vælg **Deploy from a branch**, branch **main** og mappe **/docs**, og tryk **Save**.
3. Efter et par minutter ligger appen på `https://<brugernavn>.github.io/<repo-navn>/`. Det link virker på telefonen og kan deles med gruppen.

`docs/` er bygget til et repo, der hedder `raekkehus-quiz`. Hedder repoet noget andet, eller har du ændret kode eller spørgsmål, skal mappen bygges igen:

```bash
npm install
npm run build:pages -- Raekkehus-quiz
```

Commit derefter `docs/` og push til `main`. Scriptet finder selv repo-navnet fra git.

## Deploy til Vercel (alternativ)

Vercel virker også med private repoer og bygger selv appen ved hvert push, så `docs/` ikke skal bygges i hånden.

1. Gå til https://vercel.com/new, log ind med GitHub, og vælg repoet.
2. Vercel genkender selv Next.js. Lad indstillingerne stå, og tryk **Deploy**.
3. Hvert push til `main` giver herefter automatisk en ny version.

## Spilleregler

- Rigtigt svar: +1 point. Forkert svar: 0 point. Hint: −1 point (trækkes, når hintet vises).
- Hvert spørgsmål giver kun point første gang pr. uge. Derefter er det øvelse. Kan slås fra med `COUNT_ONLY_FIRST_ATTEMPT` i `lib/types.ts`.
- Racetrack: 5 rigtige svar flytter brikken ét felt. 10 felter, så man er i mål ved 45 rigtige.
- Ugen går fra mandag til søndag. Når appen åbnes i en ny uge, vises "Ny uge – scores kan nulstilles". Nulstilling sker manuelt på siden **Stilling** og gemmer ugens vinder og sidsteplads i ugeoversigten.

### Flere telefoner

**På Vercel med database:** stillingen deles automatisk. Ens egen score sendes efter hvert svar, og de andres hentes, når forsiden, quizzen eller Stilling åbnes (Stilling opdaterer hvert 20. sekund). Nulstilling på Stilling gælder hele gruppen.

Opsætning: åbn projektet på vercel.com → **Storage** → **Create Database** → **Upstash for Redis** (gratis) → forbind den til projektet → **Deployments** → **Redeploy**.

**Uden database (fx GitHub Pages):** localStorage findes kun i den browser, man spiller i. Spiller I på hver jeres telefon, så tryk **Kopiér link med … score** på siden Stilling, og send linket i gruppechatten. Når de andre åbner linket, kommer din score ind i deres stilling. Send et nyt link, når du har spillet igen. Nulstilling skal gøres på hver enhed.

## Tilføj spørgsmål

Ret i `data/questions.json`. Hvert spørgsmål ser sådan ud:

```json
{
  "id": "bra-09",
  "category": "Brand",
  "type": "mcq",
  "questionText": "Spørgsmålet?",
  "options": ["Svar A", "Svar B", "Svar C", "Svar D"],
  "correctAnswer": "Svar B",
  "explanation": "Kort forklaring, der vises efter svaret.",
  "reference": "BR18 § 93",
  "hint": "Valgfrit hint. Koster 1 point."
}
```

- `id` skal være unikt.
- `category` skal stå præcis som i `CATEGORIES` i `lib/types.ts`.
- `type` er `mcq`, `paragraph` (vælg korrekt paragraf) eller `true_false`.
- Ved `true_false` udelades `options`, og `correctAnswer` er `"Sandt"` eller `"Falsk"`.
- `correctAnswer` skal være præcis samme tekst som én af svarmulighederne.
- Svarmulighederne blandes automatisk, når spørgsmålet vises.

Spørgsmål med fejl (ukendt kategori, eller `correctAnswer` som ikke findes blandt svarene) sorteres fra af API'et, så de ikke dukker op i quizzen. Mangler et nyt spørgsmål, så tjek de to ting først.

Bruger I GitHub Pages, så husk `npm run build:pages` bagefter. Ellers viser siden stadig de gamle spørgsmål.

## Tilpasning

| Hvad | Hvor |
| --- | --- |
| Spillernavne og farver | `PLAYERS` og `PLAYER_COLORS` i `lib/types.ts` |
| Ny kategori | Tilføj navnet til `CATEGORIES` i `lib/types.ts`, og brug det i `questions.json` |
| Racetrack-regler | `TRACK_FIELDS` og `CORRECT_PER_FIELD` i `lib/types.ts`; beregningen er `trackPosition()` i `lib/storage.ts` |
| Spørgsmål pr. runde | `ROUND_SIZE` i `lib/types.ts` |
| Pointtræk for hint | `HINT_PENALTY` i `lib/types.ts` |

Ændres spillernavne, mens der ligger scores, starter de nye navne på 0.

## Struktur

```
app/layout.tsx              fælles layout og navigation
app/page.tsx                forside: vælg spiller og kategori
app/quiz/page.tsx           quiz-flowet
app/leaderboard/page.tsx    ugens stilling, deling og nulstilling
app/api/questions/route.ts  API der leverer spørgsmål fra JSON-filen
components/                 PlayerSelector, CategorySelector, QuestionCard,
                            ScoreBoard, RaceTrack, WeeklySummary
data/questions.json         spørgsmålene
lib/types.ts                typer, spillere, kategorier og spilleregler
lib/storage.ts              localStorage: scores, uge-logik, racetrack, deling
lib/utils.ts                små hjælpefunktioner
scripts/build-pages.js      bygger docs/ til GitHub Pages
docs/                       færdigbygget udgave, som GitHub Pages viser
CLAUDE.md                   arbejdsnoter til Claude Code
```

## Next.js-version

Projektet bruger Next.js 14.2.35, som er den sidste udgave af version 14. `npm audit` melder kendte sårbarheder i hele 14-serien, og de bliver ikke rettet der. De ligger i Next.js' server. På GitHub Pages kører der ingen server, kun statiske filer, så dér er de uden betydning. Bruger du Vercel eller `npm run start`, kan du opgradere med:

```bash
npm install next@latest react@latest react-dom@latest
npm install -D @types/react@latest @types/react-dom@latest
npm run build
```

Første build på den nye version retter selv et par linjer i `tsconfig.json`.

## Om spørgsmålene

Paragrafhenvisningerne er slået op i BR18, AB 18 og YBL 2018 i oktober 2026. Reglerne ændres løbende, så tjek mod bygningsreglementet.dk, før I bruger en henvisning til eksamen.
