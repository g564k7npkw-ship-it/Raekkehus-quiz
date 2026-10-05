# Rækkehus-quiz – noter til Claude Code

Quiz-app til eksamensforberedelse for en gruppe bygningskonstruktør-studerende. Next.js 14 (App Router), TypeScript, Tailwind. Ingen database: spørgsmål i `data/questions.json`, scores i browserens localStorage.

Ejeren arbejder mest fra telefonen og er ikke udvikler. Svar på dansk, kort og uden fagsprog, og giv konkrete trin, når han selv skal gøre noget på GitHub.

## Vigtigt: appen vises fra `docs/`

Appen ligger på GitHub Pages, som viser mappen `docs/` på `main`. `docs/` er en færdigbygget statisk udgave og opdateres IKKE af sig selv.

Efter ENHVER ændring i kode eller i `data/questions.json`:

```bash
npm install          # kun første gang i en ny session
npm run build:pages -- Raekkehus-quiz  # bygger docs/ (repoet hedder Raekkehus-quiz med STORT R)
```

Commit `docs/` sammen med ændringen. Ret aldrig i `docs/` i hånden.

Giv altid navnet med som ovenfor. Uden navn læses det fra `git remote`, som i Claude Code-sessioner kan stå med lille r – så virker GitHub Pages ikke (404 på filerne).

## Fælles stilling (Vercel + database)

På Vercel deles scores automatisk via `app/api/scores/route.ts` og en Upstash Redis-database (oprettet i Vercel under Storage, miljøvariablerne `KV_REST_API_URL`/`KV_REST_API_TOKEN` eller `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`). Klienten kalder `syncScores()` i `lib/storage.ts`. Uden database, og på GitHub Pages, falder appen tilbage til score-links. `scripts/build-pages.js` lægger `app/api/scores` til side under eksporten.

## Tjek før commit

```bash
npx tsc --noEmit
npm run build        # almindelig build (Vercel / lokal)
npm run build:pages  # statisk build til docs/
```

## Regler i koden

- `app/api/questions/route.ts` skal forblive `force-static`, ellers kan appen ikke eksporteres til GitHub Pages. Den eneste server-rute er `app/api/scores` (se ovenfor).
- Egne `fetch()`-kald og hjemmelavede adresser skal bruge `BASE_PATH` fra `lib/utils.ts`. `next/link` og `router.push` sætter selv basePath på.
- localStorage læses kun i `useEffect` (se `lib/storage.ts`), aldrig under rendering.
- Spillere, kategorier og spilleregler står i `lib/types.ts`.

## Spørgsmål (`data/questions.json`)

- `id` unikt, `category` præcis som i `CATEGORIES` i `lib/types.ts`.
- `type`: `mcq`, `paragraph` eller `true_false`.
- `true_false`: ingen `options`, `correctAnswer` er `"Sandt"` eller `"Falsk"`.
- Ellers 4 `options`, og `correctAnswer` skal være identisk med én af dem.
- Hold svarmulighederne nogenlunde lige lange, så det rigtige svar ikke kan gættes på længden.
- Paragrafhenvisninger (BR18, AB 18, YBL 2018, SBi) skal slås op, ikke gættes.
