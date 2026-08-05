/* ============================================================
   supabase.js — multi-user auth + per-user workout data.

   • Auth: OAuth via a provider (GitHub by default). Passwords are handled
     entirely by the provider; this app never sees them. Supabase issues
     its own session after the provider verifies the user. Switch providers
     by changing OAUTH_PROVIDER below.
   • Data: a `workouts` table with Row-Level Security so each user can
     only read/write their own rows. The anon key in config.js is PUBLIC
     by design — RLS is what protects the data, not secrecy of the key.
   ============================================================ */

const OAUTH_PROVIDER = "google"; // "github" | "google" — switching is a one-word change
const PROVIDER_LABEL = { github: "GitHub", google: "Google" };
let sb = null;

/* ============================================================
   Demo mode — browse/edit sample data with NO sign-in.
   Turn ON:  add ?demo to the URL.   Turn OFF: ?demo=off (or tap the badge).
   Everything is in-memory: nothing is saved, and it resets on reload.
   ============================================================ */
const DEMO = {
  KEY: "5x5-demo",
  user: { id: "demo-user", user_metadata: { full_name: "Demo Lifter" }, email: "demo@local" },
  isOn() {
    const p = new URLSearchParams(location.search);
    if (p.has("demo")) {
      const v = (p.get("demo") || "").toLowerCase();
      if (v === "off" || v === "0" || v === "false") localStorage.removeItem(this.KEY);
      else localStorage.setItem(this.KEY, "1");
      history.replaceState(null, "", location.pathname + location.hash); // strip ?demo from the URL
    }
    return localStorage.getItem(this.KEY) === "1";
  },
  exit() { localStorage.removeItem(this.KEY); location.href = location.pathname; },
  // ~12 alternating A/B sessions, oldest -> newest, with a bench stall near the end.
  rows() {
    const rows = [];
    const plan = ["A", "B", "A", "B", "A", "B", "A", "B", "A", "B", "A", "B"];
    const w = { squat: 95, bench: 75, row: 70, ohp: 55, deadlift: 115 };
    const today = Date.now();
    plan.forEach((type, s) => {
      const date = new Date(today - (plan.length - s) * 2 * 86400000).toISOString();
      WORKOUTS[type].exercises.forEach((key) => {
        const n = EXERCISES[key].sets;
        const stall = key === "bench" && s >= plan.length - 3; // last 3 bench sessions miss a rep
        const sets = Array.from({ length: n }, (_, i) => (stall && i === n - 1 ? "fail" : "pass"));
        const passed = sets.every((v) => v === "pass");
        rows.push({ date, workout: type, exercise: key, weight: w[key], sets, result: passed ? "pass" : "fail" });
        if (passed) w[key] += 5;
      });
    });
    return rows;
  },
  showBadge() {
    if (document.querySelector(".demo-badge")) return;
    const b = document.createElement("button");
    b.className = "demo-badge";
    b.textContent = "DEMO — tap to exit";
    b.onclick = () => this.exit();
    document.body.appendChild(b);
  },
  // A couple of sample notes so the Notes screen isn't empty in demo mode.
  notesRows() {
    const today = Date.now();
    const iso = (daysAgo) => new Date(today - daysAgo * 86400000).toISOString();
    const todayStr = iso(0).slice(0, 10);
    return [
      { id: "demo-note-0", date: todayStr, tags: ["A", "squat"], text: "Testing notes on workout screen — this should appear during Workout A.", created_at: iso(0) },
      { id: "demo-note-1", date: iso(1).slice(0, 10), tags: ["A"], text: "Good session, squat depth felt solid.", created_at: iso(1) },
      { id: "demo-note-2", date: iso(5).slice(0, 10), tags: ["B", "bench"], text: "Missed the last rep on bench for the third session in a row — might deload soon.", created_at: iso(5) },
    ];
  },
};

const Backend = {
  ready: false,
  demo: false,
  _rows: [],
  _notes: [],

  init() {
    if (this.ready) return true;
    if (DEMO.isOn()) {
      this.demo = true;
      if (!this._rows.length) this._rows = DEMO.rows();
      if (!this._notes.length) this._notes = DEMO.notesRows();
      DEMO.showBadge();
      this.ready = true;
      return true;
    }
    if (!window.SUPABASE_CONFIG || !window.supabase) return false;
    if (String(SUPABASE_CONFIG.url).includes("REPLACE")) return false;
    sb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    this.ready = true;
    return true;
  },

  /* ---------- auth (OAuth) ---------- */
  providerLabel() { return PROVIDER_LABEL[OAUTH_PROVIDER] || "your account"; },

  async signIn() {
    // Full-page redirect to the provider; on return, supabase-js parses the
    // session from the URL (detectSessionInUrl is on by default).
    const { error } = await sb.auth.signInWithOAuth({
      provider: OAUTH_PROVIDER,
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw new Error(this.friendly(error));
  },

  async signOut() {
    if (this.demo) { DEMO.exit(); return; }
    if (sb) await sb.auth.signOut();
  },

  // getSession() awaits client init (incl. URL parsing after OAuth redirect),
  // so this is reliable right after returning from Google.
  async currentUser() {
    if (this.demo) return DEMO.user;
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data && data.session ? data.session.user : null;
  },

  usernameOf(user) {
    const m = (user && user.user_metadata) || {};
    return m.full_name || m.name || (m.email ? m.email.split("@")[0] : "") || "";
  },

  friendly(error) {
    return (error && error.message) || "Something went wrong";
  },

  /* ---------- data ---------- */
  // Rows shaped to match buildState(): {date, workout, exercise, weight, sets[]}
  async fetchRows() {
    if (this.demo) return this._rows.map((r) => ({ ...r, sets: [...r.sets] }));
    const { data, error } = await sb.from("workouts").select("*").order("date", { ascending: true });
    if (error) throw new Error(this.friendly(error));
    return data || [];
  },

  // Shared row-builder: turns one session into `workouts` table rows for `date`.
  buildRows(date, session) {
    return session.exercises.map((e) => ({
      date,
      workout: session.workout,
      exercise: e.key,
      weight: e.weight,
      sets: e.sets, // jsonb array of "pass" | "fail" | null
      result: e.sets.every((v) => v === "pass") ? "pass" : "fail",
    }));
  },

  async insertSession(session) {
    const date = new Date().toISOString();
    const rows = this.buildRows(date, session);
    if (this.demo) { this._rows.push(...rows); return; }
    const { error } = await sb.from("workouts").insert(rows);
    if (error) throw new Error(this.friendly(error));
  },

  // Removes every row for the given session date.
  async deleteSession(date) {
    if (this.demo) { this._rows = this._rows.filter((r) => r.date !== date); return; }
    const { error } = await sb.from("workouts").delete().eq("date", date);
    if (error) throw new Error(this.friendly(error));
  },

  // Deletes rows for `oldDate` and inserts fresh rows for `newDate` (the
  // session's date may have been edited; pass the same value for both if not).
  async saveSession(oldDate, newDate, session) {
    await this.deleteSession(oldDate);
    const rows = this.buildRows(newDate, session);
    if (this.demo) { this._rows.push(...rows); return; }
    const { error } = await sb.from("workouts").insert(rows);
    if (error) throw new Error(this.friendly(error));
  },

  /* ---------- notes ---------- */
  // Rows shaped: {date, tags:[...], text}. `tags` mixes workout letters
  // ("A"/"B") with exercise keys (see NOTE_WORKOUT_TAGS / EXERCISES).
  async fetchNotes() {
    if (this.demo) {
      // Mirror the live query's ordering: date desc, then created_at desc.
      return this._notes
        .map((n) => ({ ...n, tags: [...(n.tags || [])] }))
        .sort((a, b) => (a.date === b.date ? new Date(b.created_at) - new Date(a.created_at) : (a.date < b.date ? 1 : -1)));
    }
    const { data, error } = await sb
      .from("notes")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    // Graceful degradation: if notes table doesn't exist yet, return empty array
    if (error) {
      console.warn("Notes fetch failed (table may not exist):", error.message);
      return [];
    }
    return data || [];
  },

  async addNote(note) {
    if (this.demo) {
      this._notes.unshift({ id: "demo-note-" + (this._notes.length + 1), created_at: new Date().toISOString(), ...note });
      return;
    }
    const { error } = await sb.from("notes").insert([note]);
    if (error) {
      console.warn("Note save failed (table may not exist):", error.message);
      throw new Error("Notes feature unavailable — table not set up in Supabase");
    }
  },
};
