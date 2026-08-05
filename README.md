# 5×5 Tracker

A StrongLifts-style 5×5 workout tracker. Track your lifts, log notes, and watch your progress over time.

**[→ Launch App](https://aprumm01.github.io/5x5-tracker/)**

![5x5 Tracker Screenshot](https://img.shields.io/badge/status-live-brightgreen)

## Features

- **Workout A/B rotation** — Squat/Bench/Row and Squat/OHP/Deadlift (all 5×5)
- **Automatic progression** — +5lb after successful sets; deload after 3 consecutive fails
- **Edit past workouts** — Change dates, weights, sets, and add/remove reps from history
- **Rest timer** — Configurable rest periods between sets
- **Workout notes** — Add timestamped notes during or after workouts
- **History & graphs** — View past sessions and track weight progression over time
- **Dark mode** — True black theme for OLED screens
- **Mobile-first** — Designed for the gym, thumb-friendly controls

## Demo Mode

Try without signing in: [**Launch Demo**](https://aprumm01.github.io/5x5-tracker/?demo)

Demo mode runs entirely in-memory with sample data. Tap the amber badge to exit.

## Tech Stack

- Vanilla HTML/CSS/JS (no build step)
- [Supabase](https://supabase.com) for auth (Google OAuth) and data storage
- GitHub Pages for hosting

## Run Locally

```bash
git clone https://github.com/aprumm01/5x5-tracker.git
cd 5x5-tracker
python -m http.server 8077 --bind 127.0.0.1
```

Open http://127.0.0.1:8077 (or append `?demo` for demo mode).

## Data Storage

All workout data is stored in Supabase with row-level security — each user can only access their own data. The app requires Google sign-in for the live version.

## License

MIT
