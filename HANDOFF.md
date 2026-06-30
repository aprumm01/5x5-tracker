# Session Handoff — 2026-06-29

## Project: 5×5 Tracker
A StrongLifts-style 5×5 workout tracker web app. Vanilla HTML/CSS/JS (no build step) so it can drop straight onto GitHub Pages. Lives at `C:\Users\adamp\5x5-tracker\`.

Files: `index.html`, `styles.css`, `app.js` (+ this `HANDOFF.md`).

## How to preview
From the project dir:
```
python -m http.server 8077 --bind 127.0.0.1
```
Then open http://127.0.0.1:8077 (hard-refresh with Ctrl+Shift+R after edits).

## What's built so far
- **Dark mode**, true black (`#000`) backgrounds for OLED battery savings; red accent `#ff453a`. Elevated card surfaces at `#1c1c1e`.
- **Home screen** — title, "Up next" recommendation that alternates A↔B, two workout cards, History button, and a "Resume" banner for an in-progress session.
- **Workout A / B** (StrongLifts split):
  - A = Squat / Bench Press / Barbell Row
  - B = Squat / Overhead Press / Deadlift
- **Workout screen** matches the reference screenshot: `‹ Back`, `Workout A ▼` pill, red `Finish`, exercise rows, rep circles, rest-timer dock (1:00 / 1:30 / 3:00 presets, progress bar), `Note`/`Edit` footer stubs.
- **Pass/fail sets** — tap a circle cycles: empty → **pass** (red ✓, auto-starts rest timer) → **fail** (✕, red outline) → empty. No rep counting.
- **Weight input via bottom sheet** — tap the weight (`5×5 · 220lb ›`) to open a sheet with −/+ steppers (±5), quick chips (−25/−5/+5/+25), and Done.
- **Progression** — on Finish: every target set passed → that lift is **+5 lb** next time; any fail/incomplete → weight **holds**. (Changed from earlier +10 squat/deadlift to +5 across the board per Adam's instruction.)
- **History screen** — sessions grouped by month, each card shows workout, date, A/B badge, per-exercise `passes/target · weight`.
- **Storage** — `localStorage`, wrapped behind a `Store` object so it can be swapped for GitHub CSV later without touching the UI. Active session persists under key `5x5-active`; saved data under `5x5-tracker`.

## Seeded defaults (placeholders, editable in-app)
Squat 220 / Bench 140 / Row 130 / OHP 95 / Deadlift 185 lb.

## OPEN QUESTIONS — start here next time
1. **Set toggle model**: keep 3-state (empty → pass → fail → empty), OR switch to 2-state where every set defaults to **pass** and one tap flips to **fail** (faster "assume I hit it" logging)? Adam was asked, not yet answered.
2. **Warmup tab** — screenshot has a Workout/Warmup segmented control. Build warmup sets, or drop the tab?
3. **`Workout A ▼` pill** — should it switch A/B mid-session, or just label the screen?

## BIGGER TODOs (deferred earlier)
- **Deploy to GitHub Pages.** Create repo named **"5x5 Tracker"** under `aprumm01`, enable Pages, get a phone URL. (`gh` CLI is installed v2.93.0 but NOT logged in — Adam needs to run `gh auth login` first.)
- **Private data storage decision.** Free GitHub Pages URLs are always public, so a login built from usernames in a spreadsheet is NOT real security. Agreed honest design:
  - Repo A (public): app code → served by Pages.
  - Repo B (private): `workouts.csv` data.
  - A fine-grained Personal Access Token (scoped to the data repo) stored in the phone's browser acts as the "login"; no token = app shows nothing.
  - Multi-user / real password accounts would need a small backend (e.g. Vercel) instead of pure GitHub — laid out but not chosen.
- Replace `Store.load/save` internals with GitHub Contents API reads/writes against the private CSV (see TODO comment in `app.js`).
- `Note` and `Edit` footer buttons are stubs (toast hints only).

## Notes
- Reference design pulled from Mobbin: Hevy (logging) and The Outsiders (date-grouped history).
- Handoff normally goes to Notion Claude Hub → Handoff page, but the Notion tool was not connected this session, so this lives in the repo. Copy into Notion when convenient.
