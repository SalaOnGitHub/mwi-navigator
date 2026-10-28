# MWI Navigator

Bilingual (German/English) specialization navigator for the MWI semester-two courses in the SS2027 guide. It compares five specializations using interests, preferred work, career goals, and published career evidence.

## Website

GitHub Pages: https://SalaOnGitHub.github.io/mwi-navigator/

This repository contains the complete static website at its root. No build step, backend, API key, or package installation is required. In GitHub Pages settings, publish the `main` branch from `/ (root)`. The `.nojekyll` file keeps deployment as a plain static site.

All local resources use relative paths, so the app works under `/mwi-navigator/` as well as at a domain root.

## Run locally

Start a static HTTP server from this directory, for example `python -m http.server 4173`, then open http://localhost:4173/. JavaScript modules must be served over HTTP rather than opened directly as local files.

## Files

- `index.html`: app entry point.
- `app.mjs`: bilingual interface, assessment, comparisons, results, sources, and browser persistence.
- `data.mjs`: course content, 20 questions, editorial ratings, and evidence references.
- `engine.mjs`: scoring, eligibility, course pairs, coverage, and stored-state validation.
- `styles.css`: responsive layouts and printable results.
- `fonts/`: local DM Sans and Manrope font files with their SIL Open Font Licenses.

## Privacy and scope

Assessment answers remain in the visitor's browser under `mwi-navigator-v1` in localStorage. The app uses no analytics, runtime API, account system, or third-party scripts. External sources are opened only when visitors follow their links.

This is independent guidance, not an official university service. Course information is paraphrased with page references; the supplied source PDF is not included. Career ratings are editorial judgments about related occupations, not measured course outcomes or employment probabilities. The evidence snapshot was reviewed on 2026-10-22.

Browser data from another host does not transfer automatically to this address.

## Recommendation rules

Default weights are interest 40%, preferred work 20%, career goals 15%, and career outlook 25%; visitors can adjust them. Missing personal answers are omitted, with response coverage and tentative results shown. Each block ranks independently, and suggested pairs contain one eligible course from each block.

Previously completed courses are excluded. The ITBA path requires Mobile Business and Visual Analytics; previous completion of either requires programme clarification. When the target career window extends beyond 2035, market ratings are omitted from scoring.

To maintain the tool, verify the original evidence sources before updating dates, assumptions, and ratings in `data.mjs`.