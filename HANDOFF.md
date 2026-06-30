# Session Handoff — 2026-06-30

## Project: 5×5 Tracker
StrongLifts-style 5×5 workout tracker. Vanilla HTML/CSS/JS (no build step), dark mode.
Multi-user: **Sign in with Google** → per-user data in **Supabase**.

- **Live app:** https://aprumm01.github.io/5x5-tracker/
- **App repo (public):** https://github.com/aprumm01/5x5-tracker (served by GitHub Pages)
- **Local dir:** `C:\Users\adamp\5x5-tracker\`
- **Local preview:** `python -m http.server 8077 --bind 127.0.0.1` → http://127.0.0.1:8077

## Files
- `index.html` — loads supabase-js (CDN), then `config.js`, `supabase.js`, `app.js`
- `config.js` — public Supabase URL + anon key (safe to commit; RLS protects data)
- `supabase.js` — `Backend` object: OAuth sign-in + per-user CRUD. `OAUTH_PROVIDER = "google"` (one-word switch to "github")
- `app.js` — UI/router/state. `STATE.data` built from Supabase rows via `buildState()`
- `styles.css` — dark theme (true black for OLED)
- (removed `github.js` — the old token/PIN module)

## Auth (Google OAuth via Supabase)
- Google Cloud project **"5x5 Tracker"**; OAuth client type **Web application**
- Authorized redirect URI = Supabase callback: `https://rjlktxpdqvibialkgfhu.supabase.co/auth/v1/callback`
- Consent screen is in **Testing** → only added **test users** can sign in (they see a bypassable "unverified app" screen). **To open to anyone: Google Auth Platform → Audience → Publish app** (basic email/profile scopes need no Google review).

## Supabase
- Project ref: `rjlktxpdqvibialkgfhu`
- Auth config (set via Management API): Google enabled, GitHub disabled, `site_url` = live URL, `uri_allow_list` includes localhost:8077 + live URL
- **Table `public.workouts`** with RLS (each user sees only `user_id = auth.uid()`):
  `id, user_id (default auth.uid()), date, workout (A/B), exercise, weight, sets jsonb, result, created_at`
- Data model: **one row per exercise per session**. `buildState()` groups rows into sessions (history, newest-first) and derives each lift's **next weight** = most recent logged weight + 5 if that session passed, else hold.

## How data flows now
- Sign in → `loadData()` → `Backend.fetchRows()` (RLS-scoped) → `buildState()` → `STATE.data`
- Finish workout → `Backend.insertSession()` inserts the session's rows → `loadData()` re-derives state
- In-progress session is kept in `localStorage` (transient) until Finish

## SECURITY TODO
- The **Supabase personal access token** (`sbp_…`) the user shared to let me configure auth was used in this session and is still active — **revoke it** at Supabase → Account → Access Tokens now that setup is done.
- The Google **client secret** lives only in Supabase (correct); it was pasted in chat — rotate from the Google client page if desired (low urgency).

## Open follow-ups
- **Publish** the Google consent screen when ready to let non-test users sign in.
- Delete the now-unused private repo **`5x5-tracker-data`** (vestige of the old GitHub-CSV approach).
- **NEXT TOPIC (in progress):** data model for viewing history + updating progress over time — editing past entries, progress views/PRs, deload logic, in-progress autosave. Currently history + next-weight are derived from the `workouts` rows; discussion was just starting.

## Notes
- Design references from Mobbin: Hevy (logging), The Outsiders (history), Discord/Cosmos (auth).
- Handoff normally goes to Notion Claude Hub → Handoff page, but Notion wasn't connected this session, so it's here in the repo.
