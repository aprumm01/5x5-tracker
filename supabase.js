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

const Backend = {
  ready: false,

  init() {
    if (this.ready) return true;
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

  async signOut() { if (sb) await sb.auth.signOut(); },

  // getSession() awaits client init (incl. URL parsing after OAuth redirect),
  // so this is reliable right after returning from Google.
  async currentUser() {
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
    const { data, error } = await sb.from("workouts").select("*").order("date", { ascending: true });
    if (error) throw new Error(this.friendly(error));
    return data || [];
  },

  async insertSession(session) {
    const date = new Date().toISOString();
    const rows = session.exercises.map((e) => ({
      date,
      workout: session.workout,
      exercise: e.key,
      weight: e.weight,
      sets: e.sets, // jsonb array of "pass" | "fail" | null
      result: e.sets.slice(0, e.targetSets).every((v) => v === "pass") ? "pass" : "fail",
    }));
    const { error } = await sb.from("workouts").insert(rows);
    if (error) throw new Error(this.friendly(error));
  },
};
