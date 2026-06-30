/* ============================================================
   5×5 Tracker — vanilla SPA
   Storage is wrapped in `Store` so it can later be swapped from
   localStorage to a GitHub-backed CSV without touching the UI.
   ============================================================ */

/* ---------- Exercise / workout definitions ---------- */
const EXERCISES = {
  squat:    { name: "Squat",          sets: 5, reps: 5, inc: 5 },
  bench:    { name: "Bench Press",    sets: 5, reps: 5, inc: 5 },
  row:      { name: "Barbell Row",    sets: 5, reps: 5, inc: 5 },
  ohp:      { name: "Overhead Press", sets: 5, reps: 5, inc: 5 },
  deadlift: { name: "Deadlift",       sets: 1, reps: 5, inc: 5 },
};

const WEIGHT_STEP = 5; // lb per stepper tap / progression increment

const WORKOUTS = {
  A: { name: "Workout A", exercises: ["squat", "bench", "row"] },
  B: { name: "Workout B", exercises: ["squat", "ohp", "deadlift"] },
};

const DEFAULT_WEIGHTS = { squat: 220, bench: 140, row: 130, ohp: 95, deadlift: 185 };

/* ============================================================
   Store — single source of truth, persisted to localStorage.
   TODO (later): replace load()/save() internals with GitHub
   Contents API reads/writes against a private workouts.csv.
   ============================================================ */
const Store = {
  KEY: "5x5-tracker",
  ACTIVE_KEY: "5x5-active",

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to defaults */ }
    return { weights: { ...DEFAULT_WEIGHTS }, lastWorkout: null, history: [] };
  },

  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  loadActive() {
    try {
      const raw = localStorage.getItem(this.ACTIVE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  },

  saveActive(session) {
    if (session) localStorage.setItem(this.ACTIVE_KEY, JSON.stringify(session));
    else localStorage.removeItem(this.ACTIVE_KEY);
  },
};

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
};

function nextWorkoutType(data) {
  return data.lastWorkout === "A" ? "B" : "A";
}

function fmtWeight(w) { return `${w}lb`; }

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}
function monthKey(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

let toastTimer;
function toast(msg) {
  let t = $(".toast");
  if (!t) { t = el(`<div class="toast"></div>`); document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ============================================================
   Bottom sheet (reusable). Returns a close() fn.
   ============================================================ */
const Sheet = {
  open(buildContent) {
    this.close(); // only one at a time
    const backdrop = el(`<div class="sheet-backdrop"></div>`);
    const sheet = el(`<div class="sheet"><div class="sheet-handle"></div></div>`);
    buildContent(sheet, () => this.close());
    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
    requestAnimationFrame(() => { backdrop.classList.add("show"); sheet.classList.add("show"); });
    backdrop.onclick = () => this.close();
    this._backdrop = backdrop;
    this._sheet = sheet;
  },
  close() {
    const b = this._backdrop, s = this._sheet;
    if (!s) return;
    this._backdrop = this._sheet = null;
    b.classList.remove("show");
    s.classList.remove("show");
    setTimeout(() => { b.remove(); s.remove(); }, 300);
  },
};

/* Opens the weight editor for one exercise; calls onSave(newWeight). */
function openWeightSheet(exr, onSave) {
  Sheet.open((sheet, close) => {
    let val = exr.weight;
    sheet.appendChild(el(`<div class="sheet-title">${exr.name} weight</div>`));

    const stepper = el(`
      <div class="stepper">
        <button class="minus" aria-label="decrease">−</button>
        <div class="value"><span class="num">${val}</span><span class="unit">lb</span></div>
        <button class="plus" aria-label="increase">+</button>
      </div>`);
    const numEl = $(".num", stepper);
    const set = (v) => { val = Math.max(0, v); numEl.textContent = val; };
    $(".minus", stepper).onclick = () => set(val - WEIGHT_STEP);
    $(".plus", stepper).onclick = () => set(val + WEIGHT_STEP);
    sheet.appendChild(stepper);

    const quick = el(`
      <div class="sheet-quick">
        <button data-d="-25">−25</button>
        <button data-d="-5">−5</button>
        <button data-d="5">+5</button>
        <button data-d="25">+25</button>
      </div>`);
    quick.querySelectorAll("button").forEach((b) => {
      b.onclick = () => set(val + parseInt(b.dataset.d, 10));
    });
    sheet.appendChild(quick);

    const done = el(`<button class="sheet-done">Done</button>`);
    done.onclick = () => { onSave(val); close(); };
    sheet.appendChild(done);
  });
}

/* ============================================================
   Rest timer
   ============================================================ */
const Timer = {
  total: 90,
  remaining: 0,
  handle: null,
  onTick: null,

  start(seconds) {
    this.total = seconds;
    this.remaining = seconds;
    this.stop(true);
    this.handle = setInterval(() => {
      this.remaining--;
      if (this.remaining <= 0) { this.remaining = 0; this.stop(); }
      if (this.onTick) this.onTick();
    }, 1000);
    if (this.onTick) this.onTick();
  },

  stop(keepValue) {
    if (this.handle) { clearInterval(this.handle); this.handle = null; }
    if (!keepValue) { /* timer reached 0 or dismissed */ }
    if (this.onTick) this.onTick();
  },

  dismiss() { this.stop(); this.remaining = 0; this.total = 90; if (this.onTick) this.onTick(); },

  get active() { return this.handle !== null; },

  fmt() {
    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    return m > 0 ? `${m}m${String(s).padStart(2, "0")}s` : `${s}s`;
  },
};

/* ============================================================
   Router
   ============================================================ */
function router() {
  const hash = location.hash || "#/home";
  const [, route, param] = hash.split("/");
  const app = $("#app");
  app.innerHTML = "";

  if (route === "workout") renderWorkout(app, param);
  else if (route === "history") renderHistory(app);
  else renderHome(app);

  window.scrollTo(0, 0);
}

function go(hash) { location.hash = hash; }

/* ============================================================
   Home screen
   ============================================================ */
function renderHome(app) {
  const data = Store.load();
  const active = Store.loadActive();
  const next = nextWorkoutType(data);

  app.appendChild(el(`
    <div class="topbar">
      <span class="left"></span>
      <span class="topbar-title">5×5 Tracker</span>
      <span class="right"></span>
    </div>
  `));

  const content = el(`<div class="content"></div>`);

  content.appendChild(el(`<div class="screen-title">Workouts</div>`));
  content.appendChild(el(`<div class="screen-sub">Pick today's session to begin.</div>`));

  if (active) {
    const card = el(`
      <button class="link-btn" style="border-color:var(--red);color:var(--red);">
        <span>Resume ${WORKOUTS[active.workout].name} (in progress)</span>
        <span class="chev">›</span>
      </button>`);
    card.onclick = () => go(`#/workout/${active.workout}`);
    content.appendChild(card);
  }

  content.appendChild(el(`<div class="next-banner">Up next · Workout ${next}</div>`));

  ["A", "B"].forEach((type) => {
    const w = WORKOUTS[type];
    const featured = type === next && !active;
    const card = el(`
      <button class="workout-card ${featured ? "featured" : ""}">
        <span class="tag">${type === next ? "RECOMMENDED" : "WORKOUT " + type}</span>
        <h3>${w.name}</h3>
      </button>`);
    w.exercises.forEach((key) => {
      const ex = EXERCISES[key];
      card.appendChild(el(`
        <div class="ex-line">
          <span>${ex.name}</span>
          <span class="w">${ex.sets}×${ex.reps} · ${fmtWeight(data.weights[key])}</span>
        </div>`));
    });
    card.onclick = () => startWorkout(type);
    content.appendChild(card);
  });

  const hist = el(`
    <button class="link-btn">
      <span>History${data.history.length ? ` · ${data.history.length}` : ""}</span>
      <span class="chev">›</span>
    </button>`);
  hist.onclick = () => go("#/history");
  content.appendChild(hist);

  app.appendChild(content);
}

function startWorkout(type) {
  let active = Store.loadActive();
  // Resume if same workout already in progress, else start fresh.
  if (!active || active.workout !== type) {
    const data = Store.load();
    active = {
      workout: type,
      startedAt: new Date().toISOString(),
      exercises: WORKOUTS[type].exercises.map((key) => {
        const ex = EXERCISES[key];
        return {
          key,
          name: ex.name,
          weight: data.weights[key],
          targetSets: ex.sets,
          targetReps: ex.reps,
          sets: Array(ex.sets).fill(null), // null = not done, 0..reps = reps achieved
        };
      }),
    };
    Store.saveActive(active);
  }
  go(`#/workout/${type}`);
}

/* ============================================================
   Workout screen
   ============================================================ */
function renderWorkout(app, type) {
  let session = Store.loadActive();
  if (!session || session.workout !== type) { startWorkout(type); session = Store.loadActive(); }

  app.appendChild(el(`
    <div class="topbar">
      <button class="topbar-btn left" id="backBtn">‹ Back</button>
      <span class="pill">${WORKOUTS[type].name} <span class="chev">▼</span></span>
      <button class="topbar-btn strong right" id="finishBtn">Finish</button>
    </div>
  `));

  const content = el(`<div class="content with-dock"></div>`);

  session.exercises.forEach((exr, exIdx) => {
    const block = el(`<div class="exercise"></div>`);
    block.appendChild(el(`
      <div class="exercise-head">
        <span class="name">${exr.name}</span>
        <button class="weight-btn">${exr.targetSets}×${exr.targetReps} · <b>${exr.weight}lb</b> <span class="chev">›</span></button>
      </div>`));

    const circles = el(`<div class="circles"></div>`);
    exr.sets.forEach((val, setIdx) => {
      circles.appendChild(makeCircle(exr, setIdx));
    });
    const add = el(`<button class="set-circle add" aria-label="add set">+</button>`);
    add.onclick = () => {
      exr.sets.push(null);
      Store.saveActive(session);
      router();
    };
    circles.appendChild(add);
    block.appendChild(circles);

    // weight editing via bottom sheet
    $(".weight-btn", block).onclick = () => openWeightSheet(exr, (w) => {
      exr.weight = w;
      Store.saveActive(session);
      $(".weight-btn b", block).textContent = `${w}lb`;
    });

    content.appendChild(block);

    function makeCircle(exr, setIdx) {
      const val = exr.sets[setIdx]; // null | "pass" | "fail"
      let cls = "set-circle";
      let label = exr.targetReps;
      if (val === "pass") { cls += " done"; label = "✓"; }
      else if (val === "fail") { cls += " fail"; label = "✕"; }
      const c = el(`<button class="${cls}">${label}</button>`);
      c.onclick = () => {
        const cur = exr.sets[setIdx];
        if (cur === null) {
          exr.sets[setIdx] = "pass";                // completed all reps
          Timer.start(90);                          // auto-start rest
        } else if (cur === "pass") {
          exr.sets[setIdx] = "fail";                // missed the lift
        } else {
          exr.sets[setIdx] = null;                  // reset
        }
        Store.saveActive(session);
        const fresh = makeCircle(exr, setIdx);
        c.replaceWith(fresh);
        renderDock();
      };
      return c;
    }
  });

  app.appendChild(content);

  // Dock (rest timer + footer)
  const dock = el(`<div class="dock" id="dock"></div>`);
  app.appendChild(dock);
  Timer.onTick = renderDock;
  renderDock();

  $("#backBtn").onclick = () => { Timer.onTick = null; go("#/home"); };
  $("#finishBtn").onclick = () => finishWorkout(session);

  function renderDock() {
    const d = $("#dock");
    if (!d) return;
    const pct = Timer.total ? ((Timer.total - Timer.remaining) / Timer.total) * 100 : 0;
    d.innerHTML = "";

    if (Timer.remaining > 0 || Timer.active) {
      const card = el(`
        <div class="timer-card">
          <div class="timer-row">
            <span class="timer-time">${Timer.fmt()}</span>
            <span class="timer-label">Rest between sets</span>
            <button class="timer-close" aria-label="dismiss">✕</button>
          </div>
          <div class="timer-bar"><span style="width:${pct}%"></span></div>
          <div class="timer-presets">
            <button data-s="60">1:00</button>
            <button data-s="90">1:30</button>
            <button data-s="180">3:00</button>
          </div>
        </div>`);
      $(".timer-close", card).onclick = () => Timer.dismiss();
      card.querySelectorAll(".timer-presets button").forEach((b) => {
        b.onclick = () => Timer.start(parseInt(b.dataset.s, 10));
      });
      d.appendChild(card);
    }

    const footer = el(`
      <div class="dock-footer">
        <button id="noteBtn">Note</button>
        <button id="editBtn">Edit</button>
      </div>`);
    $("#noteBtn", footer).onclick = () => toast("Notes coming soon");
    $("#editBtn", footer).onclick = () => toast("Tap a weight to edit it");
    d.appendChild(footer);
  }
}

function finishWorkout(session) {
  const data = Store.load();
  const anyLogged = session.exercises.some((e) => e.sets.some((v) => v !== null));
  if (!anyLogged) {
    if (!confirm("No sets logged. Discard this workout?")) return;
    Timer.dismiss(); Store.saveActive(null); go("#/home"); return;
  }

  // Progression: every target set passed -> +5lb next time; any miss -> hold.
  session.exercises.forEach((exr) => {
    const allPassed = exr.sets.slice(0, exr.targetSets).every((v) => v === "pass");
    data.weights[exr.key] = allPassed ? exr.weight + WEIGHT_STEP : exr.weight;
  });

  data.history.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    workout: session.workout,
    exercises: session.exercises.map((e) => ({
      key: e.key, name: e.name, weight: e.weight,
      targetSets: e.targetSets, targetReps: e.targetReps,
      sets: e.sets,
    })),
  });
  data.lastWorkout = session.workout;

  Store.save(data);
  Store.saveActive(null);
  Timer.dismiss();
  toast("Workout saved ✓");
  go("#/home");
}

/* ============================================================
   History screen
   ============================================================ */
function renderHistory(app) {
  const data = Store.load();

  app.appendChild(el(`
    <div class="topbar">
      <button class="topbar-btn left" id="backBtn">‹ Back</button>
      <span class="topbar-title">History</span>
      <span class="right"></span>
    </div>
  `));

  const content = el(`<div class="content"></div>`);

  if (!data.history.length) {
    content.appendChild(el(`<div class="empty">No workouts logged yet.<br/>Finish a session and it'll show up here.</div>`));
  } else {
    let lastMonth = null;
    data.history.forEach((h) => {
      const mk = monthKey(h.date);
      if (mk !== lastMonth) {
        content.appendChild(el(`<div class="history-group-title">${mk}</div>`));
        lastMonth = mk;
      }
      const summary = h.exercises.map((e) => {
        const done = e.sets.filter((v) => v === "pass").length;
        return `${e.name} <span class="done-dot">${done}/${e.targetSets}</span> · ${e.weight}lb`;
      }).join("<br/>");
      content.appendChild(el(`
        <div class="history-card">
          <div class="top">
            <div>
              <div class="wname">${WORKOUTS[h.workout].name}</div>
              <div class="wdate">${fmtDate(h.date)}</div>
            </div>
            <span class="badge">${h.workout}</span>
          </div>
          <div class="summary">${summary}</div>
        </div>`));
    });
  }

  app.appendChild(content);
  $("#backBtn").onclick = () => go("#/home");
}

/* ---------- Boot ---------- */
window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);
if (document.readyState !== "loading") router();
