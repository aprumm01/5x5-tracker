# Session Handoff — 2026-07-01

## Project: 5×5 Tracker
StrongLifts-style 5×5 workout tracker. Vanilla HTML/CSS/JS (no build step), dark mode
(true black for OLED). Multi-user: **Sign in with Google** → per-user data in **Supabase**.

- **Lives at:** `C:\Users\adamp\5x5-tracker\`
- **Live app:** https://aprumm01.github.io/5x5-tracker/
- **App repo (public):** https://github.com/aprumm01/5x5-tracker (served by GitHub Pages, branch `main`, root)
- **Local preview:** `python -m http.server 8077 --bind 127.0.0.1` → http://127.0.0.1:8077
  - Append `?demo` for demo mode (see below) — great for visual/flow work without signing in.

## Files
- `index.html` — loads supabase-js (CDN) → `config.js` → `supabase.js` → `app.js`
- `config.js` — public Supabase URL + anon key (safe to commit; RLS protects data)
- `supabase.js` — `Backend` (OAuth + per-user CRUD) and `DEMO` (in-memory demo mode)
- `app.js` — UI/router/state; `STATE.data` built from Supabase rows via `buildState()`
- `styles.css` — dark theme

## Screens / features
- **Home** — pick Workout A (Squat/Bench/Row) or B (Squat/OHP/Deadlift); shows next weights; History link; Resume banner for an in-progress session.
- **Workout** — top bar shows only the `Workout A ▼` pill. Primary actions are in the **bottom dock (thumb zone)**: **Cancel** (left, discards with a confirm) and **Finish workout** (right, red). Rest timer + Note/Edit stubs sit above. Rep circles cycle empty→pass(✓)→fail(✕)→empty; tapping a weight opens a bottom-sheet stepper.
- **History** — segmented **Log | Graph** tabs (state in module vars `historyTab`, `graphHidden`):
  - **Log** — sessions grouped by month; tap a card → Session detail.
  - **Graph** — one multi-line chart (`multiChartSVG`) of weight-over-time, **weight on y-axis (gridlines + lb labels), dates on x-axis**. Colored **pills** toggle each lift on/off. Colors in `LIFT_COLORS` (squat red, bench blue, row green, ohp orange, deadlift purple). SVG scales uniformly (viewBox + width:100%/height:auto) so labels stay crisp.
- **Session detail** (`#/session/<id>`) — view/edit a past session (toggle sets, change weights), **Save** (topbar) or **Delete workout** (bottom). Writes via `Backend.saveSession` / `deleteSession`.
- **Progression / deload** — `deriveWeight()` (used by `buildState`): pass = +5 & reset streak; fail = hold & streak++; **3 consecutive fails = deload to 90% rounded to nearest 5**, reset streak.

## Demo mode (no sign-in)
In `supabase.js` (`DEMO` object). Turn **ON** with `?demo` in the URL (persists via `localStorage` key `5x5-demo`); turn **OFF** with `?demo=off` or tap the amber "DEMO — tap to exit" badge. Seeds ~12 in-memory sample sessions (bench stalls near the end to show fails/deload). All CRUD works in-memory; nothing hits Supabase; resets on reload. `Backend` methods branch on `this.demo`.

## Backend / Supabase
- Auth: Google OAuth via Supabase. `OAUTH_PROVIDER = "google"` in `supabase.js` (one-word switch to `"github"`; provider-agnostic `signIn()`/`providerLabel()`).
- Supabase project ref: `rjlktxpdqvibialkgfhu`. Google provider enabled, GitHub disabled; `site_url` + `uri_allow_list` include localhost:8077 and the live URL (set via Management API).
- **Table `public.workouts`** with RLS (`user_id = auth.uid()`): `id, user_id, date, workout, exercise, weight, sets (jsonb), result, created_at`. One row per exercise per session. `buildState()` groups rows into sessions (newest-first) and derives next weights.
- Google Cloud project **"5x5 Tracker"**, OAuth client type **Web**, redirect URI = `https://rjlktxpdqvibialkgfhu.supabase.co/auth/v1/callback`. Consent screen is in **Testing** (only added test users can sign in) — **Publish app** (Google Auth Platform → Audience) to open to anyone.

## SECURITY TODO (do soon)
- **Revoke the Supabase personal access token** (`sbp_…`) shared earlier to configure auth — it's still active with full account access and is no longer needed (Supabase → Account → Access Tokens).
- Google client secret lives only in Supabase (correct); it was pasted in chat — rotate from the Google client page if desired (low urgency).

## Open follow-ups
- Publish the Google consent screen to allow non-test users.
- Delete the now-unused private repo **`5x5-tracker-data`** (old GitHub-CSV approach).
- `Note` / `Edit` dock buttons are stubs (toast only).
- Consider "leave & resume" vs the current Cancel=discard behavior on the workout screen.

## Notes
- Design references (Mobbin): Hevy, The Outsiders, Discord/Cosmos.
- Handoff normally goes to Notion Claude Hub → Handoff page, but Notion wasn't connected this session, so it lives here in the repo.
