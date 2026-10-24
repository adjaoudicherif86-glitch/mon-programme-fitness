/* Mon Programme Fitness — V6
   Stockage : localStorage de ce navigateur (toujours en premier, marche sans réseau)
   + synchronisation Supabase optionnelle (compte personnel) + export/import JSON. */
(() => {
"use strict";

const APP_VERSION = "6.2.0";
const KEY = "mpf.v5"; // ne jamais changer : c'est là que sont tes séances sur chaque appareil
const EX = window.EXERCISES, SES = window.SESSIONS, MUS = window.MUSCLES, CARDIO = window.CARDIO, ANA = window.ANATOMY;
const EXI = Object.fromEntries(EX.map(e => [e.id, e]));
/* Exercices ajoutés (bibliothèque ou créés par toi) : leur fiche voyage avec la séance (w.defs). */
const DEFS = {};
function exOf(id) {
  if (EXI[id]) return EXI[id];
  if (DEFS[id]) return DEFS[id];
  const scan = d => { if (d) for (const k in d) DEFS[k] = d[k]; };
  try { for (const w of DB.workouts) scan(w.defs); scan(DB.draft && DB.draft.defs); scan(DB.editBuf && DB.editBuf.defs); for (const k in (DB.settings.extras || {})) for (const d of DB.settings.extras[k]) DEFS[d.id] = d; } catch (e) {}
  return DEFS[id] || null;
}
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = $("#view");

/* ───────────── Utilitaires ───────────── */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const pad2 = n => String(n).padStart(2, "0");
const isoDay = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDay = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtDay = (s, o = { weekday: "long", day: "numeric", month: "long" }) => parseDay(s).toLocaleDateString("fr-FR", o);
const fmtShort = s => parseDay(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const num = v => { if (v === "" || v == null) return null; const n = Number(String(v).replace(",", ".").trim()); return Number.isFinite(n) ? n : NaN; };
const fmtKg = n => (n == null ? "–" : (Math.round(n * 100) / 100).toLocaleString("fr-FR"));
const fmtVol = v => v >= 1000 ? (v / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " t" : Math.round(v).toLocaleString("fr-FR") + " kg";
const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return x; };
const repTxt = e => `${e.reps[0]}–${e.reps[1]}${e.type === "time" ? " s" : ""}${e.parBras ? " /bras" : ""}`;
const restTxt = s => s >= 60 ? `${Math.floor(s / 60)}:${pad2(s % 60)}` : `${s} s`;
const img = (id, i = 0) => { const e = exOf(id); if (e && e.lib) return i === 0 ? e.img0 : (e.img1 || e.img0); return `img/ex/${id}-${i}.jpg`; };
const thumb = id => { const e = exOf(id); if (e && e.lib) return e.thumb; if (e && e.custom) return null; return `img/ex/${id}-0.jpg`; };
const thumbHTML = (id, cls = "thumb") => { const t = thumb(id); if (t) return `<img class="${cls}" src="${t}" alt="" loading="lazy">`; const e = exOf(id); return `<span class="${cls} ph-body">${e ? bodySVG("front", partState(e.P, e.S)) : ""}</span>`; };

/* ───────────── Stockage ───────────── */
let storageOK = true;
function blankDB() {
  return { app: "mon-programme-fitness", version: 6, workouts: [], weights: [], draft: null, editBuf: null,
    settings: { autoRest: true, goalKg: 77, startKg: null, profileUpdatedAt: null, profileDirty: false },
    sync: { url: "", key: "", userId: null, email: null, cursor: {}, lastAt: null, lastError: null } };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankDB();
    const d = JSON.parse(raw);
    const b = blankDB();
    if (!d.version || d.version < 6) {
      // Avant toute migration, on garde une copie intacte des données de l'ancienne version.
      try { if (!localStorage.getItem("mpf.backup.v5")) localStorage.setItem("mpf.backup.v5", raw); } catch (e) {}
    }
    const out = { ...b, ...d, version: 6,
      settings: { ...b.settings, ...(d.settings || {}) },
      sync: { ...b.sync, ...(d.sync || {}), cursor: { ...((d.sync || {}).cursor || {}) } },
      workouts: Array.isArray(d.workouts) ? d.workouts : [],
      weights: Array.isArray(d.weights) ? d.weights : [] };
    // tout ce qui n'a jamais été envoyé au cloud est marqué « à envoyer »
    for (const w of out.workouts) if (!w.syncedAt && w.dirty === undefined) w.dirty = true;
    return out;
  } catch (e) { storageOK = false; return blankDB(); }
}
let DB = load();
let saveT = null;
function saveNow() {
  clearTimeout(saveT); saveT = null;
  try { localStorage.setItem(KEY, JSON.stringify(DB)); storageOK = true; }
  catch (e) { storageOK = false; toast("Impossible d'enregistrer dans ce navigateur. Exporte une sauvegarde (Réglages)."); }
}
const save = () => { clearTimeout(saveT); saveT = setTimeout(saveNow, 250); };
addEventListener("pagehide", () => saveT && saveNow());
document.addEventListener("visibilitychange", () => { if (document.hidden && saveT) saveNow(); });
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
saveNow();

/* Toute modification d'une séance terminée, d'une pesée ou de l'objectif passe par ici :
   la donnée est datée et marquée « à synchroniser ». */
function markDirty(rec) { rec.updatedAt = new Date().toISOString(); rec.dirty = true; rec._v = (rec._v || 0) + 1; scheduleSync(); }

const live = () => DB.workouts.filter(w => !w.deleted && w.status === "done");
const sorted = () => live().sort((a, b) => (b.date + (b.finishedAt || "")).localeCompare(a.date + (a.finishedAt || "")));

/* ───────────── Calculs ───────────── */
const doneSets = (w, exId) => ((w.entries[exId] || {}).sets || []).filter(s => s.done && num(s.reps) > 0);
function setVol(e, s) { if (e.type === "time" || e.assist) return 0; const k = num(s.kg), r = num(s.reps); return k > 0 && r > 0 ? k * r : 0; }
function wVol(w) { let v = 0; for (const id in w.entries) { const e = exOf(id); if (!e) continue; for (const s of doneSets(w, id)) v += setVol(e, s); } return v; }
function wSets(w) { let n = 0; for (const id in w.entries) n += doneSets(w, id).length; return n; }
function wTotalSets(w) { let n = 0; for (const id in w.entries) n += (w.entries[id].sets || []).length; return n; }
function prevFor(exId, excludeId, maxDate) {
  for (const w of sorted()) { if (w.id === excludeId || (maxDate && w.date > maxDate)) continue; const ds = (w.entries[exId] || {}).sets || []; if (ds.some(s => s.done && num(s.reps) > 0)) return { w, sets: ds }; }
  return null;
}
const e1rm = (k, r) => k * (1 + r / 30);
function bestOf(exId, w) {
  const e = exOf(exId); let best = null;
  for (const s of doneSets(w, exId)) {
    const k = num(s.kg) || 0, r = num(s.reps);
    let score;
    if (e.type === "time") score = r;
    else if (e.assist) score = -k * 1000 + r; // moins d'assistance = mieux
    else score = e1rm(k, r);
    if (!best || score > best.score) best = { k, r, score };
  }
  return best;
}
function prFor(exId) {
  let pr = null;
  for (const w of live()) { const b = bestOf(exId, w); if (b && (!pr || b.score > pr.score)) pr = { ...b, date: w.date }; }
  return pr;
}
/* ───────────── Coach de progression (double progression) ───────────── */
const INC = { presse: 5, "dc-halteres": 2, "curl-halteres": 2, "curl-marteau": 2, "elevations-laterales": 1, planche: 5 };
const incOf = e => INC[e.id] || 2.5;
function coach(exId, beforeDate, excludeId) {
  const e = exOf(exId); const last = prevFor(exId, excludeId, beforeDate); if (!last) return null;
  const done = last.sets.filter(s => s.done && num(s.reps) > 0); if (!done.length) return null;
  const top = e.reps[1], reps = done.map(s => num(s.reps));
  const allTop = done.length >= e.series && reps.every(r => r >= top);
  // stagnation : 3 dernières séances sans amélioration du meilleur score
  const hist = sorted().filter(w => (!beforeDate || w.date <= beforeDate) && w.id !== excludeId && doneSets(w, exId).length).slice(0, 4).map(w => bestOf(exId, w).score);
  const stall = hist.length >= 4 && Math.max(hist[0], hist[1], hist[2]) <= hist[3];
  if (e.type === "time") {
    const best = Math.max(...reps);
    return allTop ? { up: true, txt: `Objectif : ${best + incOf(e)} s par série`, stall } : { up: false, txt: `Objectif : tenir ${Math.min(top, best + 5)} s sur chaque série`, stall };
  }
  const kgs = done.map(s => num(s.kg) || 0); const work = e.assist ? Math.min(...kgs) : Math.max(...kgs);
  if (allTop) {
    const nk = e.assist ? Math.max(0, work - incOf(e)) : work + incOf(e);
    return { up: true, kg: nk, txt: e.assist ? `Réduis l'aide à ${fmtKg(nk)} kg (≈ un cran) et vise ${e.reps[0]} reps` : `Monte à ${fmtKg(nk)} kg (≈ un cran) et vise ${e.reps[0]} reps`, stall };
  }
  const tgt = reps.map(r => Math.min(top, r + 1));
  const same = kgs.every(k => k === kgs[0]);
  return { up: false, kg: work, txt: same ? `Garde ${fmtKg(work)} kg et vise ${tgt.join(" · ")} reps` : `Mêmes charges (${kgs.map(fmtKg).join(" · ")} kg), vise ${tgt.join(" · ")} reps`, stall };
}

/* ───────────── Poids ───────────── */
const wgLive = () => DB.weights.filter(x => !x.deleted && num(x.kg) > 0).sort((a, b) => a.date.localeCompare(b.date) || (a.updatedAt || "").localeCompare(b.updatedAt || ""));
function wgDaily() { const m = new Map(); for (const x of wgLive()) m.set(x.date, x); return [...m.values()]; }
const dayNum = s => Math.round(parseDay(s).getTime() / 864e5);
function wgAvg(daily, i) { const d0 = dayNum(daily[i].date); const pts = daily.filter((x, k) => k <= i && dayNum(x.date) > d0 - 7); return pts.reduce((a, x) => a + num(x.kg), 0) / pts.length; }
function wgStats() {
  const daily = wgDaily(); if (!daily.length) return null;
  const goal = num(DB.settings.goalKg) || 77;
  const start = num(DB.settings.startKg) || num(daily[0].kg);
  const cur = wgAvg(daily, daily.length - 1), last = num(daily[daily.length - 1].kg);
  const lastDay = dayNum(daily[daily.length - 1].date);
  const win = daily.filter(x => dayNum(x.date) > lastDay - 28);
  let slope = null;
  if (win.length >= 3 && dayNum(win[win.length - 1].date) - dayNum(win[0].date) >= 6) {
    const xs = win.map(x => dayNum(x.date)), ys = win.map(x => num(x.kg));
    const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
    let n = 0, d = 0; xs.forEach((x, i) => { n += (x - mx) * (ys[i] - my); d += (x - mx) ** 2; });
    slope = d ? n / d * 7 : null; // kg par semaine
  }
  let eta = null;
  if (slope != null && slope < -0.05 && cur > goal) { const days = (cur - goal) / (-slope / 7); if (days < 3 * 365) { const t = new Date(); t.setDate(t.getDate() + Math.round(days)); eta = t; } }
  const low = Math.min(...daily.map(x => num(x.kg)));
  const pct = start > goal ? Math.max(0, Math.min(100, (start - cur) / (start - goal) * 100)) : (cur <= goal ? 100 : 0);
  // variation sur 7 jours de la moyenne
  let wk = null; { const i7 = [...daily.keys()].filter(i => dayNum(daily[i].date) <= lastDay - 7).pop(); if (i7 != null) wk = cur - wgAvg(daily, i7); }
  return { daily, goal, start, cur, last, slope, eta, low, pct, wk, left: Math.max(0, cur - goal), lost: start - cur };
}

const setTxt = (e, s) => e.type === "time" ? `${num(s.reps)} s${num(s.kg) ? " +" + fmtKg(num(s.kg)) + " kg" : ""}` : `${fmtKg(num(s.kg) || 0)} kg × ${num(s.reps)}`;

/* ───────────── Icônes ───────────── */
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12h2M20 12h2M6 7v10M18 7v10M4 9v6M20 9v6M6 12h12"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>',
  hist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M5 16l4-5 4 3 6-8"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
  ul: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5M4 21h16"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8.5 9.5a5 5 0 0 1 7 0L13 12"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/></svg>'
};

/* ───────────── Anatomie (SVG) ───────────── */
(function buildSprite() {
  let s = '<svg width="0" height="0" style="position:absolute"><defs>' +
    '<pattern id="hatch" patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(45)"><rect width="9" height="9" fill="#3a3a3a"/><rect width="3.4" height="9" fill="#d0d0d0"/></pattern>' +
    '<clipPath id="clipUpperChest"><rect x="0" y="0" width="1448" height="372"/></clipPath>';
  for (const side of ["front", "back"]) {
    s += `<path id="an-${side}-outline" d="${ANA[side].outline}"/>`;
    for (const [k, d] of Object.entries(ANA[side].parts)) s += `<path id="an-${side}-${k}" d="${d}"/>`;
  }
  $("#sprite").innerHTML = s + "</defs></svg>";
})();
function partState(P, S) {
  const st = { front: {}, back: {} };
  for (const m of S) for (const [side, p] of (MUS[m]?.parts || [])) st[side][p] = "s";
  for (const m of P) for (const [side, p] of (MUS[m]?.parts || [])) st[side][p] = "p";
  return st;
}
function bodySVG(side, st, cls = "") {
  const A = ANA[side];
  let s = `<svg class="${cls}" viewBox="${A.vb}" role="img" aria-label="Vue ${side === "front" ? "de face" : "de dos"}">`;
  s += `<use href="#an-${side}-outline" fill="#161616" stroke="#4a4a4a" stroke-width="3"/>`;
  const upper = st[side]["chest-upper"];
  for (const k of Object.keys(A.parts)) {
    let state = st[side][k];
    if (k === "chest" && upper && !state) state = "s";
    const fill = k === "head" || k === "base" || k === "neck" ? "#262626" : state === "p" ? "#ffffff" : state === "s" ? "url(#hatch)" : "#333333";
    s += `<use href="#an-${side}-${k}" fill="${fill}"/>`;
    if (k === "chest" && upper) s += `<use href="#an-${side}-chest" fill="#ffffff" clip-path="url(#clipUpperChest)"/>`;
  }
  return s + "</svg>";
}
function anatomyBlock(P, S) {
  const st = partState(P, S);
  const li = (arr, c) => arr.map(m => `<li><i class="sw ${c}"></i>${esc(MUS[m].nom)}</li>`).join("");
  return `<div class="card">
    <div class="ana"><figure>${bodySVG("front", st)}<figcaption>FACE</figcaption></figure><figure>${bodySVG("back", st)}<figcaption>DOS</figcaption></figure></div>
    <div class="legend">
      <h4>Muscles principaux</h4><ul>${li(P, "p")}</ul>
      ${S.length ? `<h4>Muscles secondaires</h4><ul>${li(S, "s")}</ul>` : ""}
    </div></div>`;
}
const miniBody = e => { const st = partState(e.P, e.S); return `<div class="mini" aria-hidden="true">${bodySVG("front", st)}${bodySVG("back", st)}</div>`; };

/* ───────────── Navigation ───────────── */
function navHTML(cur) {
  const has = !!DB.draft;
  const a = (h, k, ic, lb, extra = "") => `<a href="${h}" class="${cur === k ? "on" : ""} ${extra}" ${cur === k ? 'aria-current="page"' : ""}>${ic}<span>${lb}</span></a>`;
  return a("#/", "home", I.home, "Accueil") + a("#/programme/" + todaySession(), "prog", I.list, "Programme") +
    `<a href="#/seance" class="go ${cur === "wk" ? "on" : ""}" aria-label="${has ? "Reprendre la séance en cours" : "Démarrer une séance"}"><span class="pill">${I.play}</span>${has ? '<i class="dot"></i>' : ""}<span>Séance</span></a>` +
    a("#/progres", "prog2", I.chart, "Progrès") + a("#/poids", "poids", I.scale, "Poids");
}
function todaySession() { const d = new Date().getDay(); return d === 1 ? "A" : d === 3 ? "B" : d === 5 ? "C" : nextSession(); }
function nextSession() {
  const d = new Date().getDay(); const order = [["A", 1], ["B", 3], ["C", 5]];
  for (const [k, dw] of order) if (dw > d) return k; return "A";
}
function isTrainingDay() { return [1, 3, 5].includes(new Date().getDay()); }

/* ───────────── Écrans ───────────── */
function vHome() {
  const s = todaySession(), S = SES[s], exs = EX.filter(e => e.s === s);
  const ws = sorted(); const last = ws[0];
  const mon = mondayOf(new Date()); const thisWeek = ws.filter(w => parseDay(w.date) >= mon);
  const weekVol = thisWeek.reduce((a, w) => a + wVol(w), 0);
  let draft = "";
  if (DB.draft) {
    const d = DB.draft;
    draft = `<a class="card pad" href="#/seance" style="display:flex;align-items:center;gap:14px;text-decoration:none;margin-bottom:14px;border-color:#fff">
      <div style="flex:1"><div class="eyebrow">En cours</div><div class="disp" style="font-size:26px;margin-top:4px">${esc(SES[d.session].nom)}</div>
      <small class="mut">${wSets(d)} / ${wTotalSets(d)} séries validées</small></div><span class="btn pri sm">Reprendre</span></a>`;
  }
  let lastHTML = `<div class="card empty"><div class="disp">Aucune séance</div>Termine ta première séance : tes charges apparaîtront ici et seront proposées la fois suivante.</div>`;
  if (last) {
    const rows = Object.keys(last.entries).filter(id => exOf(id) && doneSets(last, id).length).map(id => {
      const e = exOf(id), b = bestOf(id, last);
      return `<a class="li" href="#/exercice/${id}">${thumbHTML(id)}<div class="t"><b>${esc(e.nom)}</b><small>${doneSets(last, id).length} séries</small></div>
        <div class="v">${e.type === "time" ? b.r + " s" : fmtKg(b.k) + " kg"}<small>${e.type === "time" ? "meilleur temps" : "× " + b.r + (e.assist ? " (assist.)" : "")}</small></div></a>`;
    }).join("");
    lastHTML = `<div class="card" style="padding:4px 16px">${rows}</div>
      <a class="btn ghost sm block" style="margin-top:10px" href="#/historique/${last.id}">Voir la séance du ${esc(fmtShort(last.date))}</a>`;
  }
  return `
  <header class="top"><div><div class="eyebrow">${esc(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}</div>
    <h1 class="disp" style="margin-top:6px">Mon Programme</h1></div>
    <a class="iconbtn" href="#/reglages" aria-label="Réglages et sauvegardes">${I.gear}</a></header>
  ${draft}
  <section class="hero">
    <div class="big disp" aria-hidden="true">${s}</div>
    <div class="eyebrow">${isTrainingDay() ? "Séance du jour" : "Prochaine séance · " + S.jour}</div>
    <h2 class="disp">${esc(S.nom)}</h2>
    <div class="focus">${esc(S.focus)} · ~55 min + cardio</div>
    <ol>${exs.map(e => `<li>${esc(e.nom)}<span>${e.series} × ${repTxt(e)}</span></li>`).join("")}</ol>
    <div class="row2"><a class="btn sec" href="#/programme/${s}">Voir</a>
      <button class="btn pri" data-act="start" data-s="${s}">${I.play}Commencer</button></div>
  </section>
  ${weightCardHome()}
  <div class="sec-title"><h2 class="disp">Cette semaine</h2>${syncBadge()}</div>
  <div class="tiles">
    <div class="tile"><b>${thisWeek.length}<span class="dim">/3</span></b><small>séances cette semaine</small></div>
    <div class="tile"><b>${ws.length}</b><small>séances terminées au total</small></div>
    <div class="tile"><b>${weekVol ? fmtVol(weekVol).replace(" ", "<small style='display:inline;font-size:14px'> ") + "</small>" : "0"}</b><small>volume soulevé</small></div>
  </div>
  <div class="sec-title"><h2 class="disp">Dernières perfs</h2>${last ? `<span class="mut" style="font-size:13px">${esc(fmtDay(last.date))}</span>` : ""}</div>
  ${lastHTML}`;
}

function weightCardHome() {
  const st = wgStats();
  if (!st) return `<a class="card pad wcard" href="#/poids" style="margin-top:14px"><div><div class="eyebrow">Poids · objectif ${fmtKg(num(DB.settings.goalKg) || 77)} kg</div>
    <div class="disp" style="font-size:24px;margin-top:6px">Ajoute ta première pesée</div></div><span class="btn pri sm">Peser</span></a>`;
  return `<a class="card pad wcard" href="#/poids" style="margin-top:14px">
    <div style="flex:1;min-width:0"><div class="eyebrow">Poids · objectif ${fmtKg(st.goal)} kg</div>
      <div class="wrow"><b class="disp">${fmtKg(Math.round(st.cur * 10) / 10)}<small> kg</small></b>
      <span class="mut">${st.left > 0.05 ? "encore " + fmtKg(Math.round(st.left * 10) / 10) + " kg" : "objectif atteint ✓"}</span></div>
      <div class="pbar"><i style="width:${st.pct.toFixed(1)}%"></i></div></div></a>`;
}

function vProgramme(s) {
  if (!SES[s]) s = "A";
  const exs = EX.filter(e => e.s === s);
  return `
  <header class="top"><div><div class="eyebrow">Programme full body · 3 × / semaine</div><h1 class="disp" style="margin-top:6px">Programme</h1></div></header>
  <div class="seg" role="tablist">${Object.entries(SES).map(([k, v]) => `<button role="tab" aria-selected="${k === s}" class="${k === s ? "on" : ""}" data-go="#/programme/${k}">Séance ${k}<small>${v.jour}</small></button>`).join("")}</div>
  <p class="mut" style="margin:16px 2px 4px;font-size:14px">${esc(SES[s].focus)}</p>
  ${exs.map((e, i) => {
    const pv = prevFor(e.id);
    const b = pv ? bestOf(e.id, pv.w) : null;
    return `<a class="card excard" href="#/exercice/${e.id}">
      <div class="ph"><img src="${img(e.id)}" alt="${esc(e.nom)} — position de départ" loading="${i < 2 ? "eager" : "lazy"}"><span class="num">${pad2(i + 1)}</span>
        <div class="ttl"><h3 class="disp">${esc(e.nom)}</h3><p>${esc(e.machine)}</p></div></div>
      <div class="meta"><div><div class="stat"><div><b>${e.series}</b><small>séries</small></div><div><b>${repTxt(e)}</b><small>${e.type === "time" ? "durée" : "reps"}</small></div><div><b>${restTxt(e.repos)}</b><small>repos</small></div></div>
        <div class="chips" style="margin-top:12px">${e.P.map(m => `<span class="chip p">${esc(MUS[m].nom.split(" (")[0])}</span>`).join("")}</div></div>
        ${miniBody(e)}
        ${b ? `<div class="prev"><span>Dernière fois · ${esc(fmtShort(pv.w.date))}</span><b>${e.type === "time" ? b.r + " s" : fmtKg(b.k) + " kg × " + b.r}</b></div>` : ""}
      </div></a>`;
  }).join("")}
  <div class="card excard" style="cursor:default">
    <div class="meta" style="grid-template-columns:1fr auto"><div><div class="eyebrow">Après la musculation</div><h3 class="disp" style="font-size:28px;margin-top:6px">${esc(CARDIO.nom)}</h3>
      <p class="mut" style="font-size:13px;margin:6px 0 0">${CARDIO.duree[0]}–${CARDIO.duree[1]} min · ${esc(CARDIO.conseil)}</p></div>${miniBody(CARDIO)}</div>
    <div class="lvl">${CARDIO.niveaux.map(n => `<div><b>${n.nom}</b><span>${n.incl}</span><span>${n.vit}</span></div>`).join("")}</div>
  </div>
  ${((DB.settings.extras || {})[s] || []).length ? `<div class="sec-title"><h2 class="disp">Ajoutés par toi</h2></div><div class="card" style="padding:4px 16px">${DB.settings.extras[s].map(d => `<div class="pr pr3"><a href="#/exercice/${d.id}" style="text-decoration:none">${esc(d.nom)}</a><span class="mut" style="font-size:12px">${d.series || 3} séries</span><button class="chip" data-act="rm-keep" data-s="${s}" data-id="${d.id}" aria-label="Retirer de la séance ${s}">✕</button></div>`).join("")}</div>` : ""}
  <button class="btn pri block" style="margin-top:18px" data-act="start" data-s="${s}">${I.play}Commencer la séance ${s}</button>`;
}

function vExercise(id) {
  const e = exOf(id) || (LIB && LIB.byId[id] ? libDef(LIB.byId[id]) : null);
  if (!e) { if (!LIB && /^lib-/.test(id)) { loadLib().then(() => render(true)).catch(() => {}); return `<div class="empty"><div class="disp">Chargement…</div></div>`; } return vNotFound(); }
  if (!EXI[id]) return vExtraExercise(id, e);
  const pv = prevFor(id), pr = prFor(id);
  const hist = sorted().filter(w => doneSets(w, id).length).slice(0, 12).reverse();
  return `
  <header class="top"><button class="back" data-act="back">${I.back}Retour</button><span class="chip">Séance ${e.s}</span></header>
  <div class="gal" id="gal">
    <figure><img src="${img(id, 0)}" alt="${esc(e.nom)} : position de départ"><figcaption>1 · DÉPART</figcaption></figure>
    <figure><img src="${img(id, 1)}" alt="${esc(e.nom)} : position d'arrivée"><figcaption>2 · ARRIVÉE</figcaption></figure>
  </div>
  <div class="dots" id="dots"><i class="on"></i><i></i></div>
  <div class="dh"><h1 class="disp">${esc(e.nom)}</h1><p>${esc(e.machine)}</p></div>
  <div class="kv"><div><b>${e.series}</b><small>séries</small></div><div><b>${repTxt(e)}</b><small>${e.type === "time" ? "secondes" : "répétitions"}</small></div><div><b>${restTxt(e.repos)}</b><small>repos</small></div></div>
  <div class="sec-title" style="margin-top:6px"><h2 class="disp">Muscles ciblés</h2></div>
  ${anatomyBlock(e.P, e.S)}
  <div class="sec-title"><h2 class="disp">Réglage</h2></div>
  <div class="note-box">${esc(e.reglage)}</div>
  <div class="sec-title"><h2 class="disp">Exécution</h2></div>
  <ol class="steps">${e.etapes.map(t => `<li><span>${esc(t)}</span></li>`).join("")}</ol>
  <div class="sec-title"><h2 class="disp">À éviter</h2></div>
  <ul class="errs">${e.erreurs.map(t => `<li><span>${esc(t)}</span></li>`).join("")}</ul>
  <a class="btn sec block" style="margin-top:20px" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.video)}">${I.video}Vidéos de démonstration</a>
  <div class="sec-title"><h2 class="disp">Mes performances</h2></div>
  ${pv ? `<div class="tiles" style="grid-template-columns:1fr 1fr">
      <div class="tile"><b>${pr ? (e.type === "time" ? pr.r + " s" : fmtKg(pr.k) + " kg") : "–"}</b><small>record${e.type === "time" ? "" : " · " + (pr ? pr.r + " reps" : "")}${e.assist ? " (moins = mieux)" : ""} · ${pr ? esc(fmtShort(pr.date)) : ""}</small></div>
      <div class="tile"><b>${hist.length}</b><small>séances avec cet exercice</small></div></div>
    ${(() => { const ch = coach(id); return ch ? `<div style="margin-top:10px">${coachHTML(ch)}</div>` : ""; })()}
    <div class="card pad" style="margin-top:10px"><div class="eyebrow" style="margin-bottom:10px">Dernière fois · ${esc(fmtDay(pv.w.date))}</div>
      ${pv.sets.filter(x => x.done).map((x, i) => `<div class="pr"><span>Série ${i + 1}</span><b>${setTxt(e, x)}</b></div>`).join("")}</div>
    ${hist.length > 1 ? `<div class="card pad" style="margin-top:10px">${lineChart(hist.map(w => ({ x: w.date, y: e.type === "time" ? bestOf(id, w).r : bestOf(id, w).k })), e.type === "time" ? "s" : "kg")}</div>` : ""}`
    : `<div class="card empty" style="padding:26px">Pas encore de données. Elles apparaîtront ici après ta première séance.</div>`}`;
}

function perfBlock(id, e) {
  const pv = prevFor(id), pr = prFor(id);
  const hist = sorted().filter(w => doneSets(w, id).length).slice(0, 12).reverse();
  if (!pv) return `<div class="card empty" style="padding:26px">Pas encore de données. Elles apparaîtront ici après ta première séance avec cet exercice.</div>`;
  const ch = coach(id);
  return `<div class="tiles" style="grid-template-columns:1fr 1fr">
      <div class="tile"><b>${pr ? (e.type === "time" ? pr.r + " s" : fmtKg(pr.k) + " kg") : "–"}</b><small>record${e.type === "time" ? "" : " · " + (pr ? pr.r + " reps" : "")} · ${pr ? esc(fmtShort(pr.date)) : ""}</small></div>
      <div class="tile"><b>${hist.length}</b><small>séances avec cet exercice</small></div></div>
    ${ch ? `<div style="margin-top:10px">${coachHTML(ch)}</div>` : ""}
    <div class="card pad" style="margin-top:10px"><div class="eyebrow" style="margin-bottom:10px">Dernière fois · ${esc(fmtDay(pv.w.date))}</div>
      ${pv.sets.filter(x => x.done).map((x, i) => `<div class="pr"><span>Série ${i + 1}</span><b>${setTxt(e, x)}</b></div>`).join("")}</div>
    ${hist.length > 1 ? `<div class="card pad" style="margin-top:10px">${lineChart(hist.map(w => ({ x: w.date, y: e.type === "time" ? bestOf(id, w).r : bestOf(id, w).k })), e.type === "time" ? "s" : "kg")}</div>` : ""}`;
}
function vExtraExercise(id, e) {
  const L = LIB && LIB.byId[id];
  if (e.lib && !LIB) loadLib().then(() => { if (route().name === "ex") render(true); }).catch(() => {});
  const ins = L ? L.ins : [];
  return `
  <header class="top"><button class="back" data-act="back">${I.back}Retour</button><span class="chip">${e.lib ? "Bibliothèque" : "Mon exercice"}</span></header>
  ${e.lib ? `<div class="gal" id="gal">
    <figure><img src="${e.img0}" alt="${esc(e.nom)} : position de départ" class="bw"><figcaption>1 · DÉPART</figcaption></figure>
    ${e.img1 ? `<figure><img src="${e.img1}" alt="${esc(e.nom)} : position d'arrivée" class="bw"><figcaption>2 · ARRIVÉE</figcaption></figure>` : ""}
  </div>${e.img1 ? `<div class="dots" id="dots"><i class="on"></i><i></i></div>` : ""}` : ""}
  <div class="dh"><h1 class="disp">${esc(e.nom)}</h1><p>${esc([e.machine, e.en].filter(Boolean).join(" · "))}</p></div>
  <div class="sec-title" style="margin-top:6px"><h2 class="disp">Muscles ciblés</h2></div>
  ${e.P.length ? anatomyBlock(e.P, e.S || []) : `<div class="card empty" style="padding:20px">Muscles non renseignés.</div>`}
  ${ins.length ? `<div class="sec-title"><h2 class="disp">Exécution</h2><span class="mut" style="font-size:12px">texte d'origine en anglais</span></div>
  <ol class="steps">${ins.map(t => `<li><span lang="en">${esc(t)}</span></li>`).join("")}</ol>` : ""}
  <a class="btn sec block" style="margin-top:20px" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent((e.en || e.nom) + " exercise form")}">${I.video}Vidéos de démonstration</a>
  <div class="sec-title"><h2 class="disp">Mes performances</h2></div>
  ${perfBlock(id, e)}`;
}

/* ───────────── Bibliothèque d'exercices ───────────── */
let LIB = null, libP = null;
function loadLib() {
  if (LIB) return Promise.resolve(LIB);
  if (!libP) libP = fetch("library.json?v=" + APP_VERSION).then(r => { if (!r.ok) throw new Error("lib"); return r.json(); }).then(d => { d.byId = Object.fromEntries(d.exercises.map(e => [e.id, e])); LIB = d; return d; }).catch(e => { libP = null; throw e; });
  return libP;
}
function libDef(e) {
  const d = { id: e.id, nom: e.fr, en: e.en, machine: e.eq, series: 3, reps: e.t === "time" ? [20, 45] : [8, 12], repos: 90, P: e.P, S: e.S,
    img0: LIB.imgBase + e.f + "/0.jpg", img1: e.n > 1 ? LIB.imgBase + e.f + "/1.jpg" : null, thumb: "img/lib/" + e.id + ".jpg", lib: true };
  if (e.t === "time") d.type = "time";
  return d;
}
const normQ = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const PICK_MUSC = [["", "Tous"], ["pec", "Pectoraux"], ["dos", "Dos"], ["epa", "Épaules"], ["bic", "Biceps"], ["tri", "Triceps"], ["jam", "Jambes"], ["mol", "Mollets"], ["abs", "Abdos"], ["card", "Cardio"]];
const PICK_KEYS = { pec: ["pecs", "pecs-haut"], dos: ["dorsaux", "grand-rond", "trapezes", "lombaires"], epa: ["epaules", "delt-ant", "delt-lat", "delt-post"], bic: ["biceps", "avant-bras"], tri: ["triceps"], jam: ["quadriceps", "ischios", "fessiers", "adducteurs", "abducteurs"], mol: ["mollets"], abs: ["abdos", "obliques"] };
const PICK_EQ = [["", "Tout matériel"], ["barre", "Barre"], ["haltères", "Haltères"], ["machine", "Machine"], ["poulie", "Poulie"], ["poids du corps", "Poids du corps"], ["kettlebell", "Kettlebell"], ["barre EZ", "Barre EZ"], ["élastique", "Élastique"]];
const pick = { q: "", m: "", eq: "" };
function pickerList() {
  const w = editorTarget(); if (!w || !LIB) return `<p class="mut">Chargement de la bibliothèque…</p>`;
  const words = normQ(pick.q).split(/\s+/).filter(Boolean);
  const inW = id => !!w.entries[id];
  const prog = EX.filter(e => e.s !== w.session).map(e => ({ id: e.id, fr: e.nom, en: "Mon programme · séance " + e.s, eq: e.machine, P: e.P, q: normQ(e.nom + " " + e.machine), prog: true, cat: "Musculation" }));
  let list = prog.concat(LIB.exercises);
  if (pick.m === "card") list = list.filter(e => e.cat === "Cardio");
  else if (pick.m) list = list.filter(e => e.P.some(k => PICK_KEYS[pick.m].includes(k)));
  if (pick.eq) list = list.filter(e => e.prog ? normQ(e.eq).includes(normQ(pick.eq)) : e.eq === pick.eq);
  if (words.length) list = list.filter(e => words.every(t => e.q.includes(t)));
  const full = normQ(pick.q).trim();
  const score = e => { const f = normQ(e.fr); return (e.prog ? -3 : 0) + (e.m ? -2 : 0) + (full && f.startsWith(full) ? -4 : full && f.includes(full) ? -2 : 0) + (words.length && f.startsWith(words[0]) ? -1 : 0); };
  list = list.slice().sort((a, b) => score(a) - score(b));
  const total = list.length; list = list.slice(0, 80);
  if (!total) return `<div class="empty" style="padding:24px">Aucun exercice trouvé.<br>Essaie un autre mot (en français ou en anglais), ou crée le tien ci-dessous.</div>`;
  return list.map(e => `<button type="button" class="li pk" data-act="pick-ex" data-id="${e.id}" ${inW(e.id) ? "disabled" : ""}>
      ${e.prog ? `<img class="thumb" src="img/ex/${e.id}-0.jpg" alt="" loading="lazy">` : `<img class="thumb" src="img/lib/${e.id}.jpg" alt="" loading="lazy">`}
      <span class="t"><b>${esc(e.fr)}</b><small>${esc(e.prog ? e.en : e.en + " · " + e.eq)}</small></span>${inW(e.id) ? '<span class="badge">ajouté</span>' : ""}</button>`).join("")
    + (total > 80 ? `<p class="mut" style="font-size:13px;text-align:center;margin:12px 0">${total - 80} autres résultats : précise ta recherche.</p>` : "");
}
function openPicker() {
  sheet(`<div class="picker">
    <div class="pk-head"><h2 class="disp">Ajouter un exercice</h2>
      <input id="pk-q" type="search" placeholder="Rechercher : curl barre, squat, rowing…" autocomplete="off" value="${esc(pick.q)}" aria-label="Rechercher un exercice">
      <div class="chips pk-chips" data-pk="m">${PICK_MUSC.map(([k, l]) => `<button type="button" class="chip ${pick.m === k ? "on" : ""}" data-pkm="${k}">${l}</button>`).join("")}</div>
      <div class="chips pk-chips" data-pk="eq">${PICK_EQ.map(([k, l]) => `<button type="button" class="chip ${pick.eq === k ? "on" : ""}" data-pkeq="${esc(k)}">${l}</button>`).join("")}</div>
    </div>
    <div id="pk-list" class="pk-list">${pickerList()}</div>
    <div class="pk-foot"><button type="button" class="btn sec block" data-act="custom-ex">+ Créer mon propre exercice</button>
      <p class="dim" style="font-size:11px;margin:8px 0 0;text-align:center">${LIB ? LIB.exercises.length + " exercices · photos free-exercise-db (domaine public)" : ""}</p></div></div>`);
  const q = $("#pk-q"); let t;
  q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { pick.q = q.value; $("#pk-list").innerHTML = pickerList(); $("#pk-list").scrollTop = 0; }, 120); });
  $(".picker").addEventListener("click", ev => {
    const m = ev.target.closest("[data-pkm]"), eq = ev.target.closest("[data-pkeq]");
    if (m) { pick.m = m.dataset.pkm; $$("[data-pkm]").forEach(b => b.classList.toggle("on", b === m)); }
    else if (eq) { pick.eq = eq.dataset.pkeq; $$("[data-pkeq]").forEach(b => b.classList.toggle("on", b === eq)); }
    else return;
    $("#pk-list").innerHTML = pickerList();
  });
  if (!LIB) loadLib().then(() => { const l = $("#pk-list"); if (l) l.innerHTML = pickerList(); }).catch(() => { const l = $("#pk-list"); if (l) l.innerHTML = `<p class="mut">Bibliothèque indisponible hors connexion (ouvre-la une fois avec du réseau). Tu peux créer ton propre exercice.</p>`; });
}
function confirmPick(def) {
  const w = editorTarget(); if (!w) return;
  sheet(`<h2 class="disp">${esc(def.nom)}</h2><p>${esc([def.machine, def.en].filter(Boolean).join(" · "))}</p>
    ${def.lib ? `<img src="${def.thumb}" alt="" style="width:100%;border-radius:14px;margin-bottom:12px">` : ""}
    <div class="row2"><div class="field"><label for="pk-n">Séries</label><input id="pk-n" inputmode="numeric" value="3"></div>
      <div class="field"><label>Type</label><input value="${def.type === "time" ? "Durée (secondes)" : "Répétitions"}" disabled></div></div>
    ${route().name === "wk" ? `<label class="set-item" style="padding:12px 0;border:0;cursor:pointer"><input type="checkbox" id="pk-keep" style="width:22px;height:22px;accent-color:#fff"><div><b>L'ajouter aussi aux prochaines séances ${w.session}</b><small>Il sera proposé automatiquement. Tu peux le retirer depuis l'onglet Programme.</small></div></label>` : ""}
    <div class="btns"><button class="btn pri" data-act="pick-ok">Ajouter à la séance</button><button class="btn ghost" data-act="pick-back">Retour à la liste</button></div>`);
  pick.def = def;
}
function addExtra(def, n, keep) {
  const w = editorTarget(); if (!w) return;
  const slim = { ...def }; delete slim.ins;
  w.defs = w.defs || {}; w.defs[def.id] = slim; DEFS[def.id] = slim;
  if (!w.entries[def.id]) w.entries[def.id] = { sets: Array.from({ length: Math.max(1, Math.min(10, n || 3)) }, () => ({ kg: "", reps: "", done: false })), note: "", extra: true };
  if (keep) { DB.settings.extras = DB.settings.extras || {}; const L = DB.settings.extras[w.session] = DB.settings.extras[w.session] || []; if (!L.some(x => x.id === def.id)) L.push(slim); DB.settings.profileUpdatedAt = new Date().toISOString(); DB.settings.profileDirty = true; }
  touch(w); saveNow(); closeSheet(); render(true);
  setTimeout(() => { const el = $("#wx-" + def.id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  toast("Exercice ajouté ✓");
}
function customForm() {
  const groups = [["pecs", "Pectoraux"], ["dorsaux", "Dos (grand dorsal)"], ["trapezes", "Trapèzes"], ["epaules", "Épaules"], ["biceps", "Biceps"], ["triceps", "Triceps"], ["avant-bras", "Avant-bras"], ["abdos", "Abdos"], ["quadriceps", "Quadriceps"], ["ischios", "Ischio-jambiers"], ["fessiers", "Fessiers"], ["adducteurs", "Adducteurs"], ["mollets", "Mollets"], ["lombaires", "Lombaires"]];
  sheet(`<h2 class="disp">Mon exercice</h2><p>Pour un mouvement introuvable dans la bibliothèque.</p>
    <div class="field"><label for="cx-name">Nom</label><input id="cx-name" placeholder="Ex. : Curl barre debout (barre 20 kg)" autocomplete="off"></div>
    <div class="row2"><div class="field"><label for="cx-m">Muscle principal</label><select id="cx-m">${groups.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div>
      <div class="field"><label for="cx-eq">Matériel</label><select id="cx-eq">${PICK_EQ.slice(1).map(([k, l]) => `<option value="${esc(k)}">${l}</option>`).join("")}<option value="autre">Autre</option></select></div></div>
    <div class="row2"><div class="field"><label for="cx-t">Mesure</label><select id="cx-t"><option value="reps">Charge + répétitions</option><option value="time">Durée (secondes)</option></select></div>
      <div class="field"><label for="cx-n">Séries</label><input id="cx-n" inputmode="numeric" value="3"></div></div>
    <div class="btns"><button class="btn pri" data-act="custom-ok">Créer et ajouter</button><button class="btn ghost" data-act="pick-back">Retour à la liste</button></div>`);
}

/* ───────────── Séance (saisie) ───────────── */
function newWorkout(s) {
  const entries = {};
  for (const e of EX.filter(x => x.s === s)) {
    const pv = prevFor(e.id);
    const n = Math.max(e.series, pv ? pv.sets.filter(x => x.done).length : 0);
    entries[e.id] = { sets: Array.from({ length: n }, () => ({ kg: "", reps: "", done: false })), note: "" };
  }
  const defs = {};
  for (const d of ((DB.settings.extras || {})[s] || [])) { const pv = prevFor(d.id); const n = Math.max(d.series || 3, pv ? pv.sets.filter(x => x.done).length : 0);
    entries[d.id] = { sets: Array.from({ length: n }, () => ({ kg: "", reps: "", done: false })), note: "", extra: true }; defs[d.id] = d; }
  const now = new Date().toISOString();
  return { id: uid(), session: s, date: isoDay(), startedAt: now, updatedAt: now, status: "draft", rev: 0, entries, defs, cardio: { min: "", incl: "", vit: "", done: false }, note: "" };
}
function startSession(s) {
  if (DB.draft && DB.draft.session !== s) {
    return sheet(`<h2 class="disp">Séance en cours</h2><p>Une ${esc(SES[DB.draft.session].nom)} est déjà commencée (${wSets(DB.draft)} séries validées). Que veux-tu faire ?</p>
      <div class="btns"><a class="btn pri" href="#/seance" data-close>Reprendre la ${esc(SES[DB.draft.session].nom)}</a>
      <button class="btn ghost" data-act="discard-start" data-s="${s}">Abandonner et démarrer la séance ${s}</button>
      <button class="btn ghost" data-close>Annuler</button></div>`);
  }
  if (!DB.draft) { DB.draft = newWorkout(s); saveNow(); }
  location.hash = "#/seance";
}

function setRowHTML(e, w, i, prev) {
  const s = w.entries[e.id].sets[i];
  const p = prev && prev.sets.filter(x => x.done)[i];
  const pvTxt = p ? (e.type === "time" ? `${num(p.reps)} s` : `${fmtKg(num(p.kg) || 0)}×${num(p.reps)}`) : "–";
  const phK = p ? fmtKg(num(p.kg) || 0) : (e.type === "time" ? "0" : "kg");
  const phR = p ? String(num(p.reps)) : String(e.reps[0]);
  return `<div class="srow ${s.done ? "done" : ""}" data-ex="${e.id}" data-i="${i}">
    <span class="n">${i + 1}</span>
    <button type="button" class="pv" data-act="copyprev" ${p ? "" : "disabled"} aria-label="Reprendre la valeur précédente">${pvTxt}</button>
    <input inputmode="decimal" enterkeyhint="next" autocomplete="off" data-f="kg" value="${esc(s.kg)}" placeholder="${esc(phK)}" aria-label="Série ${i + 1} : charge en kg">
    <input inputmode="numeric" enterkeyhint="done" autocomplete="off" data-f="reps" value="${esc(s.reps)}" placeholder="${esc(phR)}" aria-label="Série ${i + 1} : ${e.type === "time" ? "secondes" : "répétitions"}">
    <button type="button" class="ck" data-act="ck" aria-pressed="${s.done}" aria-label="Valider la série ${i + 1}">${I.check}</button></div>`;
}
const coachHTML = ch => `<div class="coach ${ch.up ? "up" : ""}"><span class="ci">${ch.up ? "↑" : "→"}</span><span>${esc(ch.txt)}${ch.stall ? `<small>3 séances sans progrès : garde la charge, soigne la technique, le sommeil et les protéines.</small>` : ""}</span></div>`;
function exBlockHTML(e, w, mode) {
  const ent = w.entries[e.id]; const prev = prevFor(e.id, w.id, w.date);
  const pb = prev ? prev.sets.filter(x => x.done) : [];
  const ch = mode === "edit" ? null : coach(e.id, w.date, w.id);
  return `<section class="card wex" id="wx-${e.id}">
    <div class="hd">${thumbHTML(e.id, "hdimg")}<div class="t"><h3 class="disp">${esc(e.nom)}</h3><small>Objectif ${e.series} × ${repTxt(e)} · repos ${restTxt(e.repos)}</small></div>
      <a class="iconbtn" href="#/exercice/${e.id}" aria-label="Fiche de l'exercice">${I.info}</a></div>
    ${!EXI[e.id] || e.s !== w.session ? `<div class="last"><span class="badge" style="margin:0 6px 0 0">ajouté</span>${esc(e.machine || "")}${e.en ? " · " + esc(e.en) : ""}</div>` : ""}
    ${prev ? `<div class="last">Dernière fois (${esc(fmtShort(prev.w.date))}) : <b>${pb.map(x => e.type === "time" ? num(x.reps) + " s" : fmtKg(num(x.kg) || 0) + "×" + num(x.reps)).join(" · ")}</b></div>` : `<div class="last">Première fois : ${e.type === "time" ? `vise ${e.reps[0]} secondes en gardant le corps bien aligné.` : e.assist ? "commence avec beaucoup d'aide, puis réduis-la au fil des semaines." : `choisis une charge qui te permet de faire ${e.reps[0]} reps proprement.`}</div>`}
    ${ch ? coachHTML(ch) : ""}
    ${e.assist ? `<div class="last">Ici le poids est une <b>aide</b> : moins de kg = plus difficile.</div>` : ""}
    <div class="sets">
      <div class="sr-h"><span>#</span><span>Précédent</span><span>${e.assist ? "Aide kg" : e.type === "time" ? "Lest kg" : "kg"}</span><span>${e.type === "time" ? "sec" : "reps"}</span><span></span></div>
      ${ent.sets.map((_, i) => setRowHTML(e, w, i, prev)).join("")}
    </div>
    <div class="errmsg" data-err="${e.id}" hidden></div>
    <div class="tools"><button type="button" data-act="addset">+ Série</button>${ent.sets.length > 1 ? `<button type="button" data-act="rmset">− Retirer la dernière</button>` : ""}
      <button type="button" data-act="note">${ent.note ? "Modifier la note" : "Ajouter une note"}</button>
      ${!EXI[e.id] || e.s !== w.session ? `<button type="button" data-act="rm-ex">Retirer l'exercice</button>` : ""}</div>
    <div class="nt" ${ent.note ? "" : "hidden"}><textarea data-f="note" placeholder="Ex. : siège cran 4, douleur épaule gauche…" aria-label="Note personnelle">${esc(ent.note)}</textarea></div>
  </section>`;
}
function cardioHTML(w) {
  const c = w.cardio || {};
  return `<section class="card wex" id="wx-cardio">
    <div class="hd"><div class="t"><div class="eyebrow">Cardio · ${CARDIO.duree[0]}–${CARDIO.duree[1]} min</div><h3 class="disp">${esc(CARDIO.nom)}</h3></div>
      <button type="button" class="iconbtn" data-act="cardiock" aria-pressed="${!!c.done}" aria-label="Valider le cardio" style="${c.done ? "background:#fff;color:#000;border-color:#fff" : ""}">${I.check}</button></div>
    <div class="lvl">${CARDIO.niveaux.map(n => `<div><b>${n.nom}</b><span>${n.incl}</span><span>${n.vit}</span></div>`).join("")}</div>
    <div class="cardio-g">
      <div class="field"><label for="c-min">Minutes</label><input id="c-min" inputmode="numeric" data-c="min" value="${esc(c.min)}" placeholder="20"></div>
      <div class="field"><label for="c-incl">Pente %</label><input id="c-incl" inputmode="decimal" data-c="incl" value="${esc(c.incl)}" placeholder="8"></div>
      <div class="field"><label for="c-vit">km/h</label><input id="c-vit" inputmode="decimal" data-c="vit" value="${esc(c.vit)}" placeholder="5"></div>
    </div></section>`;
}
function editorTarget() { return route().name === "edit" ? DB.editBuf : DB.draft; }

function vWorkout() {
  const w = DB.draft;
  if (!w) {
    const t = todaySession();
    return `<header class="top"><div><div class="eyebrow">Démarrer</div><h1 class="disp" style="margin-top:6px">Quelle séance ?</h1></div></header>
      ${Object.entries(SES).map(([k, v]) => `<button class="card hcard" style="width:100%;text-align:left;${k === t ? "border-color:#fff" : ""}" data-act="start" data-s="${k}">
        <span class="L disp">${k}</span><span><b>${esc(v.nom)} · ${v.jour}</b><small>${esc(v.focus)}</small></span><span class="v">${k === t ? '<span class="badge" style="color:#fff;border-color:#fff">Aujourd’hui</span>' : ""}</span></button>`).join("")}
      <p class="mut" style="font-size:13px;margin-top:16px">Tes séries sont enregistrées automatiquement à chaque saisie. Tu peux fermer l'application et reprendre plus tard.</p>`;
  }
  return editorHTML(w, "draft");
}
function editorHTML(w, mode) {
  const exs = EX.filter(e => e.s === w.session);
  for (const e of exs) if (!w.entries[e.id]) w.entries[e.id] = { sets: Array.from({ length: e.series }, () => ({ kg: "", reps: "", done: false })), note: "" };
  const done = wSets(w), tot = wTotalSets(w);
  const isEdit = mode === "edit";
  return `<div class="wk-head"><div class="r">
      ${isEdit ? `<button class="back" data-act="edit-cancel">${I.back}Annuler</button>` : `<div><div class="eyebrow">${esc(fmtDay(w.date, { weekday: "long" }))} · ${esc(fmtShort(w.date))}</div><h1 class="disp">${esc(SES[w.session].nom)}</h1></div>`}
      ${isEdit ? `<div class="disp" style="font-size:22px">Modifier</div>` : `<div class="clock" id="clock"></div>`}
    </div><div class="prog"><i id="progbar" style="width:${tot ? (done / tot) * 100 : 0}%"></i></div></div>
    ${isEdit ? `<div class="field" style="margin-top:16px"><label for="w-date">Date de la séance</label><input type="date" id="w-date" data-w="date" value="${esc(w.date)}" max="${isoDay()}"></div>` : ""}
    ${exs.map(e => exBlockHTML(e, w, mode)).join("")}
    ${Object.keys(w.entries).filter(id => !exs.some(e => e.id === id) && exOf(id)).map(id => exBlockHTML(exOf(id), w, mode)).join("")}
    <button type="button" class="btn sec block addex" data-act="add-ex">+ Ajouter un exercice</button>
    ${cardioHTML(w)}
    <div class="field" style="margin-top:16px"><label for="w-note">Note de séance</label><textarea id="w-note" data-w="note" placeholder="Forme du jour, sommeil, sensations…">${esc(w.note || "")}</textarea></div>
    ${isEdit
      ? `<button class="btn pri block" data-act="edit-save" style="margin-top:10px">Enregistrer les modifications</button>`
      : `<button class="btn pri block" data-act="finish" style="margin-top:10px">${I.check}Terminer la séance</button>
         <button class="btn ghost block" data-act="discard" style="margin-top:10px">Abandonner la séance</button>`}`;
}

/* validation */
function validSet(e, s) {
  const k = num(s.kg), r = num(s.reps);
  if (s.kg !== "" && (Number.isNaN(k) || k < 0 || k > 500)) return "Charge invalide (0 à 500 kg).";
  if (s.reps === "" || r == null) return e.type === "time" ? "Indique la durée en secondes." : "Indique le nombre de répétitions.";
  if (Number.isNaN(r) || !Number.isInteger(r) || r < 1 || r > (e.type === "time" ? 900 : 200)) return e.type === "time" ? "Durée invalide (1 à 900 s)." : "Répétitions invalides (nombre entier de 1 à 200).";
  return null;
}
function rowRefresh(row, e, s) {
  row.classList.toggle("done", !!s.done);
  $(".ck", row).setAttribute("aria-pressed", !!s.done);
  $('[data-f="kg"]', row).value = s.kg; $('[data-f="reps"]', row).value = s.reps;
}
function progRefresh(w) { const b = $("#progbar"); if (b) { const t = wTotalSets(w); b.style.width = (t ? wSets(w) / t * 100 : 0) + "%"; } }
function showErr(exId, msg) { const el = $(`[data-err="${exId}"]`); if (!el) return; el.hidden = !msg; el.textContent = msg ? "⚠ " + msg : ""; }
function touch(w) { w.updatedAt = new Date().toISOString(); save(); }

function toggleSet(row) {
  const w = editorTarget(); if (!w) return;
  const e = exOf(row.dataset.ex), i = +row.dataset.i, s = w.entries[e.id].sets[i];
  if (s.done) { s.done = false; rowRefresh(row, e, s); showErr(e.id, ""); touch(w); progRefresh(w); return; }
  const kIn = $('[data-f="kg"]', row), rIn = $('[data-f="reps"]', row);
  // valeurs vides → on reprend les valeurs proposées (placeholder) si elles viennent de la séance précédente
  const prev = prevFor(e.id, w.id, w.date); const p = prev && prev.sets.filter(x => x.done)[i];
  if (s.kg === "" && p) s.kg = String(num(p.kg) || 0);
  if (s.reps === "" && p) s.reps = String(num(p.reps));
  if (s.kg === "" && e.type !== "time" && !e.assist && !p) { kIn.classList.add("bad"); kIn.focus(); showErr(e.id, "Indique la charge utilisée (0 si poids du corps)."); return; }
  s.kg = String(s.kg).replace(",", ".");
  const err = validSet(e, s);
  if (err) { (s.reps === "" || Number.isNaN(num(s.reps)) ? rIn : kIn).classList.add("bad"); showErr(e.id, err); rowRefresh(row, e, { ...s, done: false }); return; }
  kIn.classList.remove("bad"); rIn.classList.remove("bad"); showErr(e.id, "");
  s.done = true; rowRefresh(row, e, s); touch(w); progRefresh(w);
  if (navigator.vibrate) navigator.vibrate(15);
  if (route().name === "wk" && DB.settings.autoRest) startRest(e.repos, e.nom);
}

function finishSheet() {
  const w = DB.draft; if (!w) return;
  let filledNotDone = 0, done = wSets(w);
  for (const id in w.entries) for (const s of w.entries[id].sets) if (!s.done && (s.kg !== "" || s.reps !== "")) filledNotDone++;
  const mins = Math.max(1, Math.round((Date.now() - new Date(w.startedAt)) / 60000));
  sheet(`<h2 class="disp">Terminer la séance</h2>
    <p>${done} série${done > 1 ? "s" : ""} validée${done > 1 ? "s" : ""} · ${fmtVol(wVol(w))} soulevés · ${mins} min</p>
    ${done === 0 ? `<div class="note-box">Aucune série validée. Appuie sur ✓ à droite de chaque série réalisée, sinon la séance sera vide.</div>` : ""}
    ${filledNotDone ? `<div class="note-box" style="margin-top:10px">${filledNotDone} série(s) remplie(s) mais non cochée(s). Elles seront gardées comme « non terminées ».</div>
      <button class="btn sec block" style="margin-top:10px" data-act="checkall">Les valider toutes</button>` : ""}
    <div class="field" style="margin-top:14px"><label for="f-date">Date</label><input type="date" id="f-date" value="${esc(w.date)}" max="${isoDay()}"></div>
    <div class="btns"><button class="btn pri" data-act="finish-ok" ${done === 0 ? "disabled style='opacity:.4'" : ""}>Enregistrer dans l'historique</button><button class="btn ghost" data-close>Continuer la séance</button></div>`);
}
function finishOK() {
  const w = DB.draft; if (!w) return;
  const d = $("#f-date"); if (d && /^\d{4}-\d{2}-\d{2}$/.test(d.value)) w.date = d.value;
  w.status = "done"; w.finishedAt = new Date().toISOString(); w.rev = (w.rev || 0) + 1; markDirty(w);
  w.durationMin = Math.max(1, Math.round((Date.now() - new Date(w.startedAt)) / 60000));
  if (!DB.workouts.some(x => x.id === w.id)) DB.workouts.push(w);
  DB.draft = null; saveNow(); closeSheet(); stopRest();
  location.hash = "#/historique/" + w.id;
  setTimeout(() => toast("Séance enregistrée ✓"), 50);
}

/* ───────────── Historique ───────────── */
function vHistory() {
  const ws = sorted();
  const head = `<header class="top"><div><div class="eyebrow">${ws.length} séance${ws.length > 1 ? "s" : ""}</div><h1 class="disp" style="margin-top:6px">Progrès</h1></div>${syncBadge(true)}</header>${progSeg("hist")}`;
  if (!ws.length) return head + `<div class="card empty" style="margin-top:14px"><div class="disp">Vide pour l'instant</div>Chaque séance terminée apparaîtra ici, datée, avec toutes tes séries.</div>`;
  let html = head;
  let cur = "";
  for (const w of ws) {
    const m = parseDay(w.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (m !== cur) { cur = m; html += `<div class="hgrp eyebrow">${esc(m)}</div>`; }
    html += `<a class="card hcard" href="#/historique/${w.id}"><span class="L disp">${w.session}</span>
      <span><b>${esc(fmtDay(w.date))}${w.importedFrom ? '<span class="badge">import</span>' : ""}${w.conflict ? '<span class="badge">conflit</span>' : ""}</b><small>${wSets(w)} séries${w.durationMin ? " · " + w.durationMin + " min" : ""}${w.cardio && w.cardio.done ? " · cardio ✓" : ""}</small></span>
      <span class="v">${fmtVol(wVol(w))}<small class="mut">volume</small></span></a>`;
  }
  return html;
}
function vHistDetail(id) {
  const w = DB.workouts.find(x => x.id === id && !x.deleted); if (!w) return vNotFound();
  const exs = Object.keys(w.entries).filter(k => exOf(k));
  const c = w.cardio || {};
  return `<header class="top"><button class="back" data-go="#/historique">${I.back}Historique</button><span class="chip">${esc(SES[w.session].nom)}</span></header>
    <div class="eyebrow">${esc(fmtDay(w.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</div>
    <h1 class="disp" style="font-size:40px;margin:6px 0 16px">${esc(SES[w.session].nom)}</h1>
    <div class="kv"><div><b>${wSets(w)}</b><small>séries</small></div><div><b>${fmtVol(wVol(w))}</b><small>volume</small></div><div><b>${w.durationMin || "–"}</b><small>minutes</small></div></div>
    <div class="card">${exs.map(k => {
      const e = exOf(k), sets = w.entries[k].sets || [];
      return `<div class="hx"><h4><a href="#/exercice/${k}" style="text-decoration:none">${esc(e.nom)}</a><span class="mut" style="font-weight:500;font-size:13px">${sets.filter(s => s.done).length}/${sets.length}</span></h4>
        <table><thead><tr><th>Série</th><th>${e.assist ? "Aide" : "Charge"}</th><th>${e.type === "time" ? "Durée" : "Reps"}</th><th>Statut</th></tr></thead><tbody>
        ${sets.map((s, i) => `<tr><td>${i + 1}</td><td class="${s.done ? "" : "x"}">${s.kg !== "" ? fmtKg(num(s.kg)) + " kg" : "–"}</td><td class="${s.done ? "" : "x"}">${s.reps !== "" ? esc(s.reps) + (e.type === "time" ? " s" : "") : "–"}</td><td class="${s.done ? "" : "x"}">${s.done ? "✓ fait" : "non fait"}</td></tr>`).join("")}
        </tbody></table>${w.entries[k].note ? `<div class="note-box" style="margin-top:8px">${esc(w.entries[k].note)}</div>` : ""}</div>`;
    }).join("")}
    ${c.min || c.done ? `<div class="hx"><h4>${esc(CARDIO.nom)}<span class="mut" style="font-weight:500;font-size:13px">${c.done ? "✓ fait" : "non fait"}</span></h4><span class="mut">${esc(c.min || "?")} min · pente ${esc(c.incl || "?")} % · ${esc(c.vit || "?")} km/h</span></div>` : ""}
    </div>
    ${w.note ? `<div class="note-box" style="margin-top:14px">${esc(w.note)}</div>` : ""}
    <p class="dim" style="font-size:12px;margin-top:14px">Enregistrée le ${new Date(w.finishedAt || w.updatedAt).toLocaleString("fr-FR")}${w.editedAt ? " · modifiée le " + new Date(w.editedAt).toLocaleString("fr-FR") : ""}</p>
    <div class="row2" style="margin-top:14px"><button class="btn sec" data-act="edit" data-id="${w.id}">Modifier</button><button class="btn ghost" data-act="del" data-id="${w.id}">${I.trash}Supprimer</button></div>`;
}
function vEdit(id) {
  if (!DB.editBuf || DB.editBuf.id !== id) {
    const w = DB.workouts.find(x => x.id === id && !x.deleted); if (!w) return vNotFound();
    DB.editBuf = JSON.parse(JSON.stringify(w)); saveNow();
  }
  return editorHTML(DB.editBuf, "edit");
}
function editSave() {
  const b = DB.editBuf; if (!b) return;
  for (const id in b.entries) { const e = exOf(id); if (!e) continue; for (const s of b.entries[id].sets) if (s.done) { const err = validSet(e, s); if (err) { toast(e.nom + " : " + err); return; } } }
  const i = DB.workouts.findIndex(x => x.id === b.id); if (i < 0) return;
  b.editedAt = new Date().toISOString(); b.rev = (b.rev || 0) + 1; markDirty(b);
  DB.workouts[i] = b; DB.editBuf = null; saveNow();
  location.hash = "#/historique/" + b.id; setTimeout(() => toast("Modifications enregistrées ✓"), 50);
}

/* ───────────── Progrès ───────────── */
const startDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
function weeklyData(n = 12) {
  const m0 = mondayOf(new Date()); const out = [];
  for (let k = n - 1; k >= 0; k--) {
    const a = new Date(m0); a.setDate(a.getDate() - 7 * k); const b = new Date(a); b.setDate(b.getDate() + 7);
    const ws = live().filter(w => { const d = parseDay(w.date); return d >= a && d < b; });
    out.push({ start: a, label: a.toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" }), vol: ws.reduce((x, w) => x + wVol(w), 0), n: ws.length, sets: ws.reduce((x, w) => x + wSets(w), 0), ws });
  }
  return out;
}
function streakWeeks() {
  const wk = weeklyData(52); let s = 0; let i = wk.length - 1;
  if (wk[i].n >= 3) s++; i--; // semaine en cours : comptée seulement si déjà complète
  for (; i >= 0; i--) { if (wk[i].n >= 3) s++; else break; }
  return s;
}
function usedExercises() {
  const ids = new Set(); for (const w of live()) for (const id in w.entries) if (doneSets(w, id).length) ids.add(id);
  const prog = EX.filter(e => ids.has(e.id));
  const extra = [...ids].filter(id => !EXI[id]).map(exOf).filter(Boolean).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return prog.concat(extra);
}
function prEvents() {
  const ev = []; const chrono = sorted().slice().reverse();
  for (const e of usedExercises()) {
    let best = null;
    for (const w of chrono) { const b = bestOf(e.id, w); if (!b) continue; if (best != null && b.score > best + 1e-9) ev.push({ ex: e, date: w.date, b }); if (best == null || b.score > best) best = b.score; }
  }
  return ev;
}
const GROUPS = [
  { nom: "Pectoraux", keys: ["pecs", "pecs-haut"] }, { nom: "Dos", keys: ["dorsaux", "grand-rond", "trapezes", "lombaires"] },
  { nom: "Épaules", keys: ["epaules", "delt-ant", "delt-lat", "delt-post"] }, { nom: "Biceps", keys: ["biceps", "avant-bras"] },
  { nom: "Triceps", keys: ["triceps"] }, { nom: "Abdos", keys: ["abdos", "obliques"] },
  { nom: "Quadriceps", keys: ["quadriceps"] }, { nom: "Ischios", keys: ["ischios"] },
  { nom: "Fessiers", keys: ["fessiers", "abducteurs"] }, { nom: "Mollets", keys: ["mollets"] }];
function muscleWeek(ws) {
  const g = GROUPS.map(x => ({ ...x, n: 0 }));
  for (const w of ws) for (const id in w.entries) {
    const e = exOf(id); if (!e) continue; const n = doneSets(w, id).length; if (!n) continue;
    for (const gr of g) { if (e.P.some(m => gr.keys.includes(m))) gr.n += n; else if (e.S.some(m => gr.keys.includes(m))) gr.n += n * 0.5; }
  }
  return g;
}
function calHeat() {
  const wk = weeklyData(12); const cs = 20, gap = 4, left = 22, top = 4;
  const W = left + wk.length * (cs + gap), H = top + 7 * (cs + gap) + 16; const today = isoDay();
  let s = `<svg class="chart cal" viewBox="0 0 ${W} ${H}" role="img" aria-label="Séances des 12 dernières semaines">`;
  ["L", "M", "M", "J", "V", "S", "D"].forEach((d, i) => { s += `<text x="0" y="${top + i * (cs + gap) + 14}">${d}</text>`; });
  wk.forEach((w, k) => {
    for (let i = 0; i < 7; i++) {
      const day = new Date(w.start); day.setDate(day.getDate() + i); const ds = isoDay(day);
      const x = left + k * (cs + gap), y = top + i * (cs + gap);
      const sess = w.ws.find(z => z.date === ds);
      if (ds > today) { s += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" rx="5" fill="none" stroke="#1a1a1a"/>`; continue; }
      s += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" rx="5" fill="${sess ? "#fff" : "#1c1c1c"}" ${ds === today ? 'stroke="#fff" stroke-width="1.5"' : ""}/>`;
      if (sess) s += `<text x="${x + cs / 2}" y="${y + 14}" text-anchor="middle" style="fill:#000;font-weight:800;font-size:11px">${sess.session}</text>`;
    }
    if (k % 3 === 0) s += `<text x="${left + k * (cs + gap)}" y="${H - 2}">${w.label}</text>`;
  });
  return s + "</svg>";
}
function barChart(data) {
  const W = 340, H = 180, pl = 8, pb = 26, pt = 22; const max = Math.max(1, ...data.map(d => d.vol));
  const bw = (W - pl * 2) / data.length;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Volume par semaine">`;
  data.forEach((d, i) => {
    const h = d.vol ? Math.max(3, (H - pb - pt) * d.vol / max) : 3, x = pl + i * bw + 3, y = H - pb - h, last = i === data.length - 1;
    s += `<rect class="${d.vol ? "bar" : "bar0"}" x="${x}" y="${y}" width="${bw - 6}" height="${h}" rx="4" ${last && d.vol ? 'style="fill:url(#hatch)"' : ""}/>`;
    if (d.vol && (i % 2 === 1 || last)) s += `<text class="lbl" x="${x + (bw - 6) / 2}" y="${y - 6}" text-anchor="middle">${d.vol >= 1000 ? (d.vol / 1000).toFixed(1).replace(".", ",") : Math.round(d.vol)}</text>`;
    if (i % 2 === 1 || last) s += `<text x="${x + (bw - 6) / 2}" y="${H - 8}" text-anchor="middle">${d.label}</text>`;
  });
  return s + "</svg>";
}
function lineChart(pts, unit, opt = {}) {
  const W = 340, H = 190, pl = 36, pr = 14, pt = 18, pb = 28;
  const ys = pts.map(p => p.y).concat(opt.goal != null ? [opt.goal] : []).concat(opt.avg ? opt.avg.map(p => p.y) : []);
  let lo = Math.min(...ys), hi = Math.max(...ys); if (hi - lo < 1) { lo -= 1; hi += 1; }
  const span = hi - lo; lo = Math.max(0, lo - span * .12); hi = hi + span * .12;
  const timeX = !!opt.time; const t0 = timeX ? dayNum(pts[0].x) : 0, t1 = timeX ? Math.max(t0 + 1, dayNum(pts[pts.length - 1].x)) : 0;
  const X = (p, i) => timeX ? pl + (dayNum(p.x) - t0) / (t1 - t0) * (W - pl - pr) : pl + (pts.length === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (pts.length - 1));
  const Y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
  const dec = hi - lo < 6 ? 1 : 0;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution">`;
  for (let g = 0; g <= 3; g++) { const v = lo + (hi - lo) * g / 3; s += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end">${v.toFixed(dec).replace(".", ",")}</text>`; }
  if (opt.goal != null) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(opt.goal)}" y2="${Y(opt.goal)}" stroke="#fff" stroke-dasharray="5 5" stroke-width="1.5"/><text x="${W - pr}" y="${Y(opt.goal) - 6}" text-anchor="end" class="lbl">objectif ${fmtKg(opt.goal)}</text>`;
  if (opt.avg) {
    s += pts.map((p, i) => `<circle cx="${X(p, i)}" cy="${Y(p.y)}" r="2.6" fill="#777"/>`).join("");
    s += `<path class="ln" d="${opt.avg.map((p, i) => (i ? "L" : "M") + X(p, i).toFixed(1) + " " + Y(p.y).toFixed(1)).join("")}"/>`;
  } else {
    s += `<path class="ln" d="${pts.map((p, i) => (i ? "L" : "M") + X(p, i).toFixed(1) + " " + Y(p.y).toFixed(1)).join("")}"/>`;
    pts.forEach((p, i) => { s += `<circle class="pt" cx="${X(p, i)}" cy="${Y(p.y)}" r="4"/>`; });
  }
  const step = Math.ceil(pts.length / 5);
  pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) s += `<text x="${Math.min(W - pr - 14, Math.max(pl + 14, X(p, i)))}" y="${H - 8}" text-anchor="middle">${fmtShort(p.x).replace(".", "")}</text>`; });
  s += `<text x="${pl}" y="11" class="lbl">${unit}</text>`;
  return s + "</svg>";
}
const pctTxt = v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v)) + " %";
const delta = (a, b) => b ? (a - b) / b * 100 : null;
function progSeg(cur) { return `<div class="seg seg2" role="tablist"><button role="tab" aria-selected="${cur === "stats"}" class="${cur === "stats" ? "on" : ""}" data-go="#/progres">Statistiques</button><button role="tab" aria-selected="${cur === "hist"}" class="${cur === "hist" ? "on" : ""}" data-go="#/historique">Historique</button></div>`; }
function metricPts(e, metric) {
  return sorted().filter(w => doneSets(w, e.id).length).reverse().map(w => {
    const b = bestOf(e.id, w);
    const y = e.type === "time" ? b.r : metric === "1rm" && !e.assist ? Math.round(e1rm(b.k, b.r) * 10) / 10 : metric === "vol" ? doneSets(w, e.id).reduce((a, s) => a + setVol(e, s), 0) : b.k;
    return { x: w.date, y, w };
  });
}
function vProgress(q, metric) {
  const ws = live();
  const head = `<header class="top"><div><div class="eyebrow">${ws.length ? "Depuis le " + esc(fmtShort(sorted().slice(-1)[0].date)) : "Tes statistiques"}</div><h1 class="disp" style="margin-top:6px">Progrès</h1></div>${syncBadge(true)}</header>${progSeg("stats")}`;
  if (!ws.length) return head + `<div class="card empty" style="margin-top:14px"><div class="disp">Pas encore de courbe</div>Termine ta première séance : tes indicateurs apparaîtront ici.</div>`;
  const wk = weeklyData(12), cur = wk[11], prev = wk[10];
  const d28 = startDay(new Date()); d28.setDate(d28.getDate() - 27);
  const n28 = ws.filter(w => parseDay(w.date) >= d28).length;
  const prs = prEvents(); const d30 = startDay(new Date()); d30.setDate(d30.getDate() - 29);
  const prs30 = prs.filter(p => parseDay(p.date) >= d30);
  const streak = streakWeeks();
  const vd = delta(cur.vol, prev.vol);
  const mw = muscleWeek(cur.ws.length ? cur.ws : prev.ws); const mwLabel = cur.ws.length ? "cette semaine" : "la semaine dernière";
  const mwMax = Math.max(10, ...mw.map(g => g.n));
  const strong = mw.filter(g => g.n >= 4).flatMap(g => g.keys), weak = mw.filter(g => g.n > 0 && g.n < 4).flatMap(g => g.keys);
  const st = partState(strong, weak);
  const used = usedExercises();
  const sel = exOf(q) && used.includes(exOf(q)) ? q : used[0].id; const e = exOf(sel);
  const mets = e.type === "time" ? [["max", "Durée"]] : e.assist ? [["max", "Aide"]] : [["max", "Charge max"], ["1rm", "1RM estimé"], ["vol", "Volume"]];
  const m = mets.some(x => x[0] === metric) ? metric : mets[0][0];
  const pts = metricPts(e, m);
  const first = pts[0], last = pts[pts.length - 1];
  const gain = pts.length > 1 ? (e.assist ? -delta(last.y, first.y) : delta(last.y, first.y)) : null;
  const pr = prFor(sel); const ch = coach(sel);
  const unit = e.type === "time" ? "s" : m === "vol" ? "kg" : "kg";
  return head + `
  <div class="sec-title"><h2 class="disp">Vue d'ensemble</h2></div>
  <div class="kgrid">
    <div class="tile"><b>${cur.n}<span class="dim">/3</span></b><small>séances cette semaine</small></div>
    <div class="tile"><b>${Math.min(100, Math.round(n28 / 12 * 100))}<span class="dim"> %</span></b><small>assiduité sur 4 semaines (${n28}/12)</small></div>
    <div class="tile"><b>${streak}</b><small>semaine${streak > 1 ? "s" : ""} complète${streak > 1 ? "s" : ""} d'affilée (3 séances)</small></div>
    <div class="tile"><b>${prs30.length}</b><small>record${prs30.length > 1 ? "s" : ""} battu${prs30.length > 1 ? "s" : ""} en 30 jours</small></div>
    <div class="tile"><b>${fmtVol(cur.vol).replace(/ (t|kg)$/, "<span class='dim' style='font-size:15px'> $1</span>")}</b><small>volume cette semaine${vd != null && prev.vol ? ` · <span class="tag">${pctTxt(vd)}</span> vs sem. dernière` : ""}</small></div>
    <div class="tile"><b>${ws.length}</b><small>séances au total · ${ws.reduce((a, w) => a + wSets(w), 0)} séries</small></div>
  </div>
  <div class="sec-title"><h2 class="disp">Régularité</h2><span class="mut" style="font-size:13px">12 semaines</span></div>
  <div class="card pad">${calHeat()}</div>
  <div class="sec-title"><h2 class="disp">Muscles travaillés</h2><span class="mut" style="font-size:13px">${mwLabel}</span></div>
  <div class="card">
    <div class="ana" style="padding-bottom:10px"><figure>${bodySVG("front", st)}<figcaption>FACE</figcaption></figure><figure>${bodySVG("back", st)}<figcaption>DOS</figcaption></figure></div>
    <div class="legend">
      <ul class="mbars">${mw.slice().sort((a, b) => b.n - a.n).map(g => `<li><span>${g.nom}</span><i><b style="width:${(g.n / mwMax * 100).toFixed(0)}%"></b></i><em>${fmtKg(g.n)}</em></li>`).join("")}</ul>
      <p class="mut" style="font-size:12px;margin:10px 0 0">Séries par muscle (une série secondaire compte pour ½). En blanc : 4 séries ou plus · hachuré : moins de 4. Repère courant : autour de 10 séries par muscle et par semaine.</p>
    </div></div>
  <div class="sec-title"><h2 class="disp">Volume / semaine</h2><span class="mut" style="font-size:13px">tonnes · hachuré = en cours</span></div>
  <div class="card pad">${barChart(wk)}</div>
  <div class="sec-title"><h2 class="disp">Par exercice</h2></div>
  <select class="sel" id="exsel" aria-label="Choisir un exercice">${used.map(x => `<option value="${x.id}" ${x.id === sel ? "selected" : ""}>${x.s ? x.s : "+"} · ${esc(x.nom)}</option>`).join("")}</select>
  <div class="kgrid" style="margin-top:10px">
    <div class="tile"><b>${e.type === "time" ? pr.r + "<span class='dim' style='font-size:15px'> s</span>" : fmtKg(pr.k) + "<span class='dim' style='font-size:15px'> kg</span>"}</b><small>record${e.type === "time" ? "" : " · × " + pr.r}${e.assist ? " (aide, moins = mieux)" : ""} · ${esc(fmtShort(pr.date))}</small></div>
    <div class="tile"><b>${e.type === "time" || e.assist ? pts.length : fmtKg(Math.round(e1rm(bestOf(sel, last.w).k, bestOf(sel, last.w).r)))}${e.type === "time" || e.assist ? "" : "<span class='dim' style='font-size:15px'> kg</span>"}</b><small>${e.type === "time" || e.assist ? "séances" : "1RM estimé actuel"}</small></div>
    <div class="tile"><b>${gain == null ? "–" : pctTxt(gain)}</b><small>progression depuis le ${esc(fmtShort(first.x))}</small></div>
  </div>
  ${ch ? `<div style="margin-top:10px">${coachHTML(ch)}</div>` : ""}
  <div class="card pad" style="margin-top:10px">
    ${mets.length > 1 ? `<div class="chips" style="margin-bottom:12px">${mets.map(([k, l]) => `<button class="chip ${k === m ? "on" : ""}" data-go="#/progres/${sel}/${k}">${l}</button>`).join("")}</div>` : `<div class="eyebrow" style="margin-bottom:8px">${mets[0][1]}${e.assist ? " — plus bas = plus fort" : ""}</div>`}
    ${pts.length > 1 ? lineChart(pts, unit) : `<p class="mut" style="margin:0">Une seule séance pour l'instant. La courbe apparaîtra à la prochaine.</p>`}
    <table class="mini-t">${pts.slice(-5).reverse().map(p => { const b = bestOf(sel, p.w); return `<tr><td>${esc(fmtShort(p.x))}</td><td>${setTxt(e, { kg: b.k, reps: b.r })}</td><td class="mut">${doneSets(p.w, sel).length} séries</td></tr>`; }).join("")}</table>
  </div>
  <div class="sec-title"><h2 class="disp">Records</h2><span class="mut" style="font-size:13px">gain depuis la 1re séance</span></div>
  <div class="card" style="padding:4px 16px">${used.map(x => { const p = prFor(x.id); const mp = metricPts(x, "max"); const g = mp.length > 1 ? (x.assist ? -delta(mp[mp.length - 1].y, mp[0].y) : delta(mp[mp.length - 1].y, mp[0].y)) : null;
    return `<a class="pr pr3" href="#/progres/${x.id}" style="text-decoration:none"><span>${esc(x.nom)}</span><b>${x.type === "time" ? p.r + " s" : fmtKg(p.k) + " kg × " + p.r}</b><em>${g == null ? "–" : pctTxt(g)}</em></a>`; }).join("")}</div>`;
}

/* ───────────── Poids ───────────── */
function vWeight(range) {
  const st = wgStats(); const goal = num(DB.settings.goalKg) || 77;
  const lastE = wgLive().slice(-1)[0];
  const today = DB.weights.find(x => !x.deleted && x.date === isoDay());
  let html = `<header class="top"><div><div class="eyebrow">Objectif ${fmtKg(goal)} kg</div><h1 class="disp" style="margin-top:6px">Poids</h1></div>${syncBadge(true)}</header>
  <div class="card pad">
    <div class="eyebrow" style="margin-bottom:10px">${today ? "Pesée du jour (modifier)" : "Nouvelle pesée"}</div>
    <div class="wform">
      <div class="field"><label for="wg-kg">Poids kg</label><input id="wg-kg" inputmode="decimal" autocomplete="off" value="${today ? esc(String(today.kg).replace(".", ",")) : ""}" placeholder="${lastE ? esc(String(lastE.kg).replace(".", ",")) : "85,0"}"></div>
      <div class="field"><label for="wg-date">Date</label><input id="wg-date" type="date" value="${isoDay()}" max="${isoDay()}"></div>
      <div class="field"><label for="wg-waist">Taille cm</label><input id="wg-waist" inputmode="decimal" autocomplete="off" value="${today && today.waist ? esc(String(today.waist).replace(".", ",")) : ""}" placeholder="option."></div>
    </div>
    <div class="errmsg" id="wg-err" style="margin:0 0 10px" hidden></div>
    <button class="btn pri block" data-act="wsave">Enregistrer la pesée</button>
  </div>`;
  if (!st) return html + `<div class="card empty" style="margin-top:14px"><div class="disp">Point de départ</div>Note ton poids aujourd'hui : l'appli calculera ta tendance, le reste à perdre jusqu'à ${fmtKg(goal)} kg et une date d'arrivée estimée.</div>` + weightTips() + weightSettings();
  const r = range === "30" ? 30 : range === "tout" ? 99999 : 90;
  const lastDay = dayNum(st.daily[st.daily.length - 1].date);
  const idx = [...st.daily.keys()].filter(i => dayNum(st.daily[i].date) > lastDay - r);
  const pts = idx.map(i => ({ x: st.daily[i].date, y: num(st.daily[i].kg) }));
  const avg = idx.map(i => ({ x: st.daily[i].date, y: Math.round(wgAvg(st.daily, i) * 100) / 100 }));
  const fast = st.slope != null && st.slope < -1;
  html += `
  <section class="hero" style="margin-top:14px">
    <div class="eyebrow">Moyenne 7 jours</div>
    <div class="wbig disp">${fmtKg(Math.round(st.cur * 10) / 10)}<small> kg</small></div>
    <div class="focus" style="margin:4px 0 14px">${st.wk != null ? `<span class="tag">${st.wk <= 0 ? "−" : "+"}${fmtKg(Math.abs(Math.round(st.wk * 10) / 10))} kg</span> en 7 jours · ` : ""}dernière pesée ${fmtKg(st.last)} kg le ${esc(fmtShort(st.daily[st.daily.length - 1].date))}</div>
    <div class="pbar pbar-lg"><i style="width:${st.pct.toFixed(1)}%"></i></div>
    <div class="pscale"><span>${fmtKg(st.start)} kg<small>départ</small></span><b>${Math.round(st.pct)} %</b><span style="text-align:right">${fmtKg(goal)} kg<small>objectif</small></span></div>
  </section>
  <div class="kgrid" style="margin-top:12px">
    <div class="tile"><b>${st.left > 0.05 ? fmtKg(Math.round(st.left * 10) / 10) : "0"}<span class="dim" style="font-size:15px"> kg</span></b><small>${st.left > 0.05 ? "restants jusqu'à " + fmtKg(goal) + " kg" : "objectif atteint ✓"}</small></div>
    <div class="tile"><b>${st.slope == null ? "–" : (st.slope <= 0 ? "−" : "+") + fmtKg(Math.abs(Math.round(st.slope * 10) / 10))}<span class="dim" style="font-size:15px">${st.slope == null ? "" : " kg"}</span></b><small>${st.slope == null ? "tendance : 7 jours de pesées nécessaires" : "par semaine (tendance 4 sem.)"}</small></div>
    <div class="tile"><b style="font-size:24px">${st.eta ? esc(st.eta.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })) : "–"}</b><small>${st.eta ? "arrivée estimée à ce rythme" : st.left <= 0.05 ? "objectif atteint" : "date estimée : tendance à la baisse nécessaire"}</small></div>
    <div class="tile"><b>${st.lost >= 0 ? "−" : "+"}${fmtKg(Math.abs(Math.round(st.lost * 10) / 10))}<span class="dim" style="font-size:15px"> kg</span></b><small>depuis le départ</small></div>
    <div class="tile"><b>${fmtKg(st.low)}<span class="dim" style="font-size:15px"> kg</span></b><small>pesée la plus basse</small></div>
    <div class="tile"><b>${st.daily.length}</b><small>pesées</small></div>
  </div>
  ${fast ? `<div class="note-box" style="margin-top:12px">Tu perds plus de 1 kg par semaine. Un rythme de 0,4 à 0,8 kg par semaine aide à garder ton muscle et ta force : n'hésite pas à manger un peu plus, surtout des protéines.</div>` : ""}
  <div class="sec-title"><h2 class="disp">Courbe</h2></div>
  <div class="card pad">
    <div class="chips" style="margin-bottom:12px">${[["30", "30 j"], ["90", "90 j"], ["tout", "Tout"]].map(([k, l]) => `<button class="chip ${(range || "90") === k ? "on" : ""}" data-go="#/poids/${k}">${l}</button>`).join("")}</div>
    ${pts.length > 1 ? lineChart(pts, "kg", { goal, avg, time: true }) : `<p class="mut" style="margin:0">La courbe apparaît dès la 2e pesée.</p>`}
    <p class="mut" style="font-size:12px;margin:10px 0 0">Points gris : pesées · trait blanc : moyenne sur 7 jours · pointillés : objectif.</p>
  </div>
  <div class="sec-title"><h2 class="disp">Pesées</h2></div>
  <div class="card" style="padding:4px 16px">${wgLive().slice(-12).reverse().map(x => `<div class="pr pr3"><span>${esc(fmtDay(x.date, { weekday: "short", day: "numeric", month: "short" }))}${x.conflict ? '<span class="badge">conflit</span>' : ""}</span><b>${fmtKg(num(x.kg))} kg${x.waist ? `<small class="mut" style="font-weight:500"> · ${fmtKg(num(x.waist))} cm</small>` : ""}</b><button class="chip" data-act="wdel" data-id="${x.id}" aria-label="Supprimer cette pesée">✕</button></div>`).join("")}</div>`;
  return html + weightTips() + weightSettings();
}
const weightTips = () => `<div class="note-box" style="margin-top:14px">Pèse-toi le matin, à jeun, après être passé aux toilettes. Le poids du jour varie de ±1 kg (eau, sel, glucides) : regarde la moyenne sur 7 jours, pas le chiffre du jour.</div>`;
const weightSettings = () => `<div class="sec-title"><h2 class="disp">Réglages</h2></div>
  <div class="card pad"><div class="wform" style="grid-template-columns:1fr 1fr">
    <div class="field"><label for="wg-goal">Objectif (kg)</label><input id="wg-goal" inputmode="decimal" value="${esc(String(DB.settings.goalKg ?? 77).replace(".", ","))}"></div>
    <div class="field"><label for="wg-start">Départ (kg)</label><input id="wg-start" inputmode="decimal" value="${DB.settings.startKg ? esc(String(DB.settings.startKg).replace(".", ",")) : ""}" placeholder="1re pesée"></div>
  </div><button class="btn sec block" data-act="wgoal">Enregistrer</button></div>`;
function saveWeight() {
  const kg = num($("#wg-kg").value || ""), date = $("#wg-date").value, waist = num($("#wg-waist").value || "");
  const err = $("#wg-err"); const fail = m => { err.hidden = false; err.textContent = "⚠ " + m; };
  if (kg == null || Number.isNaN(kg) || kg < 30 || kg > 250) return fail("Indique ton poids en kg (ex. 84,6).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > isoDay()) return fail("Date invalide.");
  if (waist != null && (Number.isNaN(waist) || waist < 40 || waist > 200)) return fail("Tour de taille invalide (en cm).");
  const ex = DB.weights.find(x => !x.deleted && x.date === date);
  if (ex) { const old = { kg: ex.kg, waist: ex.waist }; ex.kg = Math.round(kg * 100) / 100; ex.waist = waist; markDirty(ex); saveNow(); render();
    toast("Pesée du " + fmtShort(date) + " mise à jour", () => { ex.kg = old.kg; ex.waist = old.waist; markDirty(ex); saveNow(); render(); }); return; }
  const rec = { id: uid(), date, kg: Math.round(kg * 100) / 100, waist };
  markDirty(rec); DB.weights.push(rec);
  if (!DB.settings.startKg && wgLive().length === 1) { DB.settings.startKg = rec.kg; DB.settings.profileUpdatedAt = new Date().toISOString(); DB.settings.profileDirty = true; }
  saveNow(); render(); toast("Pesée enregistrée ✓");
}
/* ───────────── Réglages & sauvegardes ───────────── */
function vSettings() {
  const del = DB.workouts.filter(w => w.deleted);
  return `<header class="top"><button class="back" data-go="#/">${I.back}Accueil</button></header>
    <h1 class="disp" style="font-size:40px;margin-bottom:6px">Réglages</h1>
    <p class="mut" style="font-size:14px;margin:0 0 18px">${live().length} séance(s) et ${wgLive().length} pesée(s) dans <b>ce navigateur</b> (${esc(location.host || "fichier local")})${storageOK ? "" : " — ⚠ stockage indisponible"}.</p>
    <div class="card">
      <button class="set-item" data-act="export">${I.dl}<div><b>Exporter une sauvegarde</b><small>Fichier .json avec tout ton historique. À faire régulièrement.</small></div></button>
      <label class="set-item" style="cursor:pointer">${I.ul}<div><b>Importer une sauvegarde</b><small>Fusionne sans doublon (V5 ou ancien fichier V4).</small></div><input type="file" accept="application/json,.json" id="imp" class="sr"></label>
      <label class="set-item" style="cursor:pointer"><span style="width:22px"></span><div><b>Minuteur de repos automatique</b><small>Se lance quand tu valides une série.</small></div>
        <input type="checkbox" id="autorest" ${DB.settings.autoRest ? "checked" : ""} style="width:24px;height:24px;accent-color:#fff"></label>
    </div>
    <div class="sec-title"><h2 class="disp">Synchronisation</h2>${syncBadge(true)}</div>
    ${syncPanel()}
    ${del.length ? `<div class="sec-title"><h2 class="disp">Corbeille</h2></div><div class="card" style="padding:4px 16px">${del.map(w => `<div class="pr"><span>${esc(SES[w.session].nom)} · ${esc(fmtShort(w.date))}</span><button class="chip" data-act="restore" data-id="${w.id}">Restaurer</button></div>`).join("")}</div>` : ""}
    <div class="sec-title"><h2 class="disp">Zone sensible</h2></div>
    <button class="btn ghost block" data-act="wipe">${I.trash}Tout effacer de ce navigateur</button>
    <div class="credits">
      Version ${APP_VERSION}.${localStorage.getItem("mpf.backup.v5") ? ` <button class="chip" data-act="dl-backup" style="height:24px">Copie de sécurité V5</button>` : ""}<br>
      Photos : <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a> (dédiées au domaine public, licence Unlicense), converties en noir et blanc.<br>
      Synchronisation : <a href="https://github.com/supabase/supabase-js" target="_blank" rel="noopener">supabase-js</a> (licence MIT).<br>
      Planches anatomiques : tracés de <a href="https://github.com/HichamELBSI/react-native-body-highlighter" target="_blank" rel="noopener">react-native-body-highlighter</a> (licence MIT, © 2022 ELABBASSI Hicham), recolorés.<br>
      Les conseils ne remplacent pas l'avis d'un coach ou d'un professionnel de santé.
    </div>`;
}
function doExport() {
  const data = { app: "mon-programme-fitness", version: 6, exportedAt: new Date().toISOString(), workouts: DB.workouts, weights: DB.weights, settings: DB.settings, draft: DB.draft };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `programme-fitness-${isoDay()}.json`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("Sauvegarde exportée ✓");
}
function fingerprint(w) { return [w.session, w.date, JSON.stringify(w.entries)].join("|"); }
function mergeWorkouts(list) {
  let added = 0, updated = 0, skipped = 0;
  const fps = new Set(DB.workouts.map(fingerprint));
  for (const w0 of list) {
    if (!w0 || !w0.id || !w0.entries || !SES[w0.session]) { skipped++; continue; }
    const w = { ...w0 }; delete w.syncedAt; delete w._v;
    const i = DB.workouts.findIndex(x => x.id === w.id);
    if (i >= 0) { if ((w.updatedAt || "") > (DB.workouts[i].updatedAt || "")) { const keep = DB.workouts[i].syncedAt; DB.workouts[i] = w; w.syncedAt = keep; w.dirty = true; w._v = 1; updated++; } else skipped++; }
    else if (fps.has(fingerprint(w))) skipped++;
    else { w.dirty = true; w._v = 1; DB.workouts.push(w); fps.add(fingerprint(w)); added++; }
  }
  return { added, updated, skipped };
}
function mergeWeights(list) {
  let added = 0, updated = 0, skipped = 0;
  for (const x0 of list || []) {
    if (!x0 || !x0.id || !x0.date || !(num(x0.kg) > 0)) { skipped++; continue; }
    const x = { ...x0 }; delete x.syncedAt; delete x._v;
    const i = DB.weights.findIndex(y => y.id === x.id);
    if (i >= 0) { if ((x.updatedAt || "") > (DB.weights[i].updatedAt || "")) { const keep = DB.weights[i].syncedAt; DB.weights[i] = x; x.syncedAt = keep; x.dirty = true; x._v = 1; updated++; } else skipped++; }
    else if (DB.weights.some(y => !y.deleted && y.date === x.date && num(y.kg) === num(x.kg))) skipped++;
    else { x.dirty = true; x._v = 1; DB.weights.push(x); added++; }
  }
  return { added, updated, skipped };
}
function fromV4(d) {
  // V4 : 18 exercices × 3 séries × [kg, reps], dans l'ordre d'affichage.
  const out = [], now = new Date().toISOString();
  for (const s of ["A", "B", "C"]) {
    const entries = {}; let any = false;
    EX.forEach((e, ei) => {
      if (e.s !== s) return;
      const sets = [0, 1, 2].map(k => {
        const kg = String(d.entries[ei * 6 + k * 2] || "").replace(",", ".").trim(), reps = String(d.entries[ei * 6 + k * 2 + 1] || "").trim();
        if (kg || reps) any = true;
        return { kg, reps, done: !!reps && !Number.isNaN(num(reps)) };
      });
      entries[e.id] = { sets, note: "" };
    });
    if (any) out.push({ id: uid(), session: s, date: (d.date || now).slice(0, 10), startedAt: now, finishedAt: now, updatedAt: now, status: "done", rev: 1, entries, cardio: {}, note: "Importé depuis l'ancienne version (V4).", importedFrom: "v4" });
  }
  return out;
}
function doImport(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      let res;
      if (Array.isArray(d.workouts)) { res = mergeWorkouts(d.workouts); const r2 = mergeWeights(d.weights); res.added += r2.added; res.updated += r2.updated; res.skipped += r2.skipped;
        if (d.settings && d.settings.goalKg && (!DB.settings.profileUpdatedAt || (d.settings.profileUpdatedAt || "") > DB.settings.profileUpdatedAt)) { DB.settings.goalKg = d.settings.goalKg; DB.settings.startKg = d.settings.startKg ?? DB.settings.startKg; DB.settings.profileUpdatedAt = d.settings.profileUpdatedAt || new Date().toISOString(); DB.settings.profileDirty = true; } }
      else if (Array.isArray(d.entries)) res = mergeWorkouts(fromV4(d));
      else throw new Error("format");
      saveNow(); render(); scheduleSync();
      toast(`Import : ${res.added} ajoutée(s), ${res.updated} mise(s) à jour, ${res.skipped} ignorée(s)`);
    } catch (e) { toast("Fichier non reconnu : choisis un export .json de l'application."); }
  };
  r.readAsText(file);
}

/* ───────────── Synchronisation (Supabase) ─────────────
   Principe : chaque appareil garde tout en local. Quand tu es connecté :
   1) on récupère ce qui a changé dans ton compte depuis la dernière fois ;
   2) on envoie ce qui a changé ici.
   Si la même séance a été modifiée des deux côtés, on garde les DEUX versions
   (la tienne est marquée « conflit ») : rien n'est écrasé en silence. */
const CFG = window.MPF_CONFIG || {};
const syncCfg = () => { const u = (CFG.supabaseUrl || DB.sync.url || "").trim(), k = (CFG.supabaseKey || DB.sync.key || "").trim(); return u && k ? { u, k } : null; };
let SB = null, syncing = false, syncT = null, lastVisSync = 0;
const loadScript = src => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(new Error("script")); document.head.appendChild(s); });
/* --- Variante GitHub : un fichier JSON dans un dépôt PRIVÉ, écrit avec un jeton limité à ce dépôt.
   Le jeton reste sur l'appareil (jamais dans le code, jamais dans les exports). --- */
const GH_DEFAULT_REPO = "adjaoudicherif86-glitch/mon-programme-fitness-data";
const ghToken = () => { try { return localStorage.getItem("mpf.ghtoken") || ""; } catch (e) { return ""; } };
const ghCfg = () => { const t = ghToken().trim(); return t ? { token: t, repo: (DB.sync.ghRepo || GH_DEFAULT_REPO).trim(), path: "carnet.json" } : null; };
const syncOn = () => !!(window.__mpfFakeRemote || ghCfg() || syncCfg());
function ghRemote(c) {
  const API = window.__mpfGhApi || "https://api.github.com";
  const H = { Authorization: "Bearer " + c.token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const url = `${API}/repos/${c.repo}/contents/${c.path}`;
  let doc = null, sha = null, changed = false;
  const fail = async r => { const e = new Error("GH " + r.status + " " + (await r.text().catch(() => "")).slice(0, 140)); e.status = r.status; return e; };
  const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, "")), ch => ch.charCodeAt(0)));
  const b64e = s => { const by = new TextEncoder().encode(s); let bin = ""; for (let i = 0; i < by.length; i += 0x8000) bin += String.fromCharCode(...by.subarray(i, i + 0x8000)); return btoa(bin); };
  return {
    kind: "github",
    async user() { return { id: "gh:" + c.repo.toLowerCase(), email: c.repo }; },
    async check() {
      const r = await fetch(`${API}/repos/${c.repo}`, { headers: H, cache: "no-store" });
      if (!r.ok) throw await fail(r);
      const j = await r.json();
      if (!j.private) { const e = new Error("PUBLIC_REPO"); throw e; }
      if (j.permissions && j.permissions.push === false) { const e = new Error("NO_WRITE"); throw e; }
      return j;
    },
    async begin() {
      changed = false;
      const r = await fetch(url, { headers: H, cache: "no-store" });
      if (r.status === 404) { doc = { app: "mon-programme-fitness", format: 1, workouts: [], weights: [], profil: null }; sha = null; return; }
      if (!r.ok) throw await fail(r);
      const j = await r.json(); sha = j.sha;
      let txt;
      if (j.content && j.encoding === "base64") txt = b64d(j.content);
      else { const r2 = await fetch(url, { headers: { ...H, Accept: "application/vnd.github.raw+json" }, cache: "no-store" }); if (!r2.ok) throw await fail(r2); txt = await r2.text(); }
      doc = JSON.parse(txt || "{}"); doc.workouts = doc.workouts || []; doc.weights = doc.weights || []; doc.profil = doc.profil || null;
    },
    async select(t) { if (t === "profil") return doc.profil ? [doc.profil] : []; return (doc[t] || []).slice(); },
    async upsert(t, rows) {
      const out = [];
      for (const r of rows) {
        const st = new Date().toISOString() + "~" + Math.random().toString(36).slice(2, 8);
        const row = { ...r, updated_at: st };
        if (t === "profil") { doc.profil = row; out.push({ user_id: r.user_id, updated_at: st }); continue; }
        const i = doc[t].findIndex(x => x.id === r.id); if (i >= 0) doc[t][i] = row; else doc[t].push(row);
        out.push({ id: r.id, updated_at: st });
      }
      changed = true; return out;
    },
    async commit() {
      if (!changed) return; changed = false;
      doc.updatedAt = new Date().toISOString();
      const body = { message: "Synchro carnet " + new Date().toLocaleString("fr-FR"), content: b64e(JSON.stringify(doc)) };
      if (sha) body.sha = sha;
      const r = await fetch(url, { method: "PUT", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.status === 409 || r.status === 422) { const e = new Error("SHA_CONFLICT"); e.retry = true; throw e; }
      if (!r.ok) throw await fail(r);
      const j = await r.json(); sha = j.content && j.content.sha;
    },
    async signOut() { try { localStorage.removeItem("mpf.ghtoken"); } catch (e) {} }
  };
}
async function remote() {
  if (window.__mpfFakeRemote) return window.__mpfFakeRemote;
  const g = ghCfg(); if (g) return ghRemote(g);
  const c = syncCfg(); if (!c) return null;
  if (!SB) {
    if (!window.supabase) await loadScript("vendor/supabase-2.117.2.js");
    SB = window.supabase.createClient(c.u, c.k, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "mpf.auth" } });
  }
  const C = SB;
  const all = async (t, since) => {
    let out = [], from = 0;
    for (;;) {
      let q = C.from(t).select("*").order("updated_at", { ascending: true }).range(from, from + 999);
      if (since) q = q.gt("updated_at", since);
      const { data, error } = await q; if (error) throw error;
      out = out.concat(data); if (data.length < 1000) return out; from += 1000;
    }
  };
  return {
    async user() { const { data } = await C.auth.getSession(); return data.session ? data.session.user : null; },
    async signIn(email, password) { const { data, error } = await C.auth.signInWithPassword({ email, password }); if (error) throw error; return data.user; },
    async signUp(email, password) { const { data, error } = await C.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw error; return data; },
    async signOut() { await C.auth.signOut(); },
    select: all,
    async upsert(t, rows, onConflict = "id") { const { data, error } = await C.from(t).upsert(rows, { onConflict }).select(onConflict + ",updated_at"); if (error) throw error; return data; }
  };
}
const stripSync = o => { const x = { ...o }; delete x.dirty; delete x._v; delete x.syncedAt; return x; };
const sameW = (a, b) => JSON.stringify([a.session, a.date, !!a.deleted, a.entries, a.cardio || {}, a.note || "", a.defs || {}]) === JSON.stringify([b.session, b.date, !!b.deleted, b.entries, b.cardio || {}, b.note || "", b.defs || {}]);
const sameG = (a, b) => a.date === b.date && num(a.kg) === num(b.kg) && (num(a.waist) || null) === (num(b.waist) || null) && !!a.deleted === !!b.deleted;
const TABLES = {
  workouts: { list: () => DB.workouts, toR: w => ({ id: w.id, session: w.session, date: w.date, deleted: !!w.deleted, data: stripSync(w) }),
    fromR: r => ({ ...r.data, id: r.id, session: r.session, date: r.date, deleted: !!r.deleted, status: "done", syncedAt: r.updated_at, dirty: false }), same: sameW,
    pending: () => DB.workouts.filter(w => w.dirty && w.status === "done") },
  weights: { list: () => DB.weights, toR: x => ({ id: x.id, date: x.date, kg: num(x.kg), waist: num(x.waist) || null, deleted: !!x.deleted, client_updated_at: x.updatedAt || new Date().toISOString() }),
    fromR: r => ({ id: r.id, date: r.date, kg: Number(r.kg), waist: r.waist == null ? null : Number(r.waist), deleted: !!r.deleted, updatedAt: r.client_updated_at || r.updated_at, syncedAt: r.updated_at, dirty: false }), same: sameG,
    pending: () => DB.weights.filter(x => x.dirty) }
};
function applyRemote(T, r, stats) {
  const list = T.list(); const inc = T.fromR(r); const i = list.findIndex(x => x.id === r.id);
  if (i < 0) { list.push(inc); stats.down++; return; }
  const l = list[i];
  if (!l.dirty) { if (l.syncedAt === r.updated_at) return; list[i] = inc; stats.down++; return; }
  if (l.syncedAt === r.updated_at) return; // c'est notre propre envoi
  if (T.same(l, inc)) { l.syncedAt = r.updated_at; l.dirty = false; return; }
  // conflit : modifié ici ET ailleurs → on garde les deux
  const copy = { ...JSON.parse(JSON.stringify(l)), id: uid(), syncedAt: null, conflict: true, dirty: true, _v: 1 };
  if (copy.entries) copy.note = "⚠ Copie en conflit (modifiée sur deux appareils). " + (copy.note || "");
  list[i] = inc; list.push(copy); stats.conflicts++;
}
async function syncOnce(R, stats) {
    const user = await R.user();
    if (!user) { DB.sync.userId = null; return false; }
    if (DB.sync.userId && DB.sync.userId !== user.id) { DB.sync.cursor = {}; for (const w of DB.workouts) w.dirty = true; for (const x of DB.weights) x.dirty = true; DB.settings.profileDirty = true; }
    DB.sync.userId = user.id; DB.sync.email = user.email;
    if (R.begin) await R.begin();
    // 1) réception
    for (const t of Object.keys(TABLES)) {
      const rows = await R.select(t, R.kind === "github" ? null : DB.sync.cursor[t]);
      for (const r of rows) { applyRemote(TABLES[t], r, stats); if (R.kind !== "github" && (!DB.sync.cursor[t] || r.updated_at > DB.sync.cursor[t])) DB.sync.cursor[t] = r.updated_at; }
    }
    const prof = (await R.select("profil")).find(p => p.user_id === user.id);
    if (prof && !DB.settings.profileDirty && prof.updated_at !== DB.settings.profileSyncedAt) {
      if (prof.goal_kg != null) DB.settings.goalKg = Number(prof.goal_kg);
      if (prof.start_kg != null) DB.settings.startKg = Number(prof.start_kg);
      if (prof.extras && typeof prof.extras === "object") DB.settings.extras = prof.extras;
      DB.settings.profileSyncedAt = prof.updated_at;
    }
    // 2) envoi (les résultats ne sont appliqués qu'une fois l'écriture confirmée)
    const done = [];
    for (const t of Object.keys(TABLES)) {
      const T = TABLES[t]; const pend = T.pending(); if (!pend.length) continue;
      for (let k = 0; k < pend.length; k += 200) {
        const chunk = pend.slice(k, k + 200); const vers = new Map(chunk.map(x => [x.id, x._v]));
        done.push([T, await R.upsert(t, chunk.map(T.toR)), vers]);
      }
    }
    let profRes = null;
    if (DB.settings.profileDirty) profRes = await R.upsert("profil", [{ user_id: user.id, goal_kg: num(DB.settings.goalKg), start_kg: num(DB.settings.startKg) || null, extras: DB.settings.extras || {} }], "user_id");
    if (R.commit) await R.commit();
    for (const [T, res, vers] of done) for (const r of res) { const rec = T.list().find(x => x.id === r.id); if (!rec) continue; rec.syncedAt = r.updated_at; if (rec._v === vers.get(r.id)) rec.dirty = false; stats.up++; }
    if (profRes) { DB.settings.profileDirty = false; if (profRes[0]) DB.settings.profileSyncedAt = profRes[0].updated_at; }
    return true;
}
async function syncNow(manual) {
  if (syncing) return;
  let R; try { R = await remote(); } catch (e) { DB.sync.lastError = "Module de synchronisation indisponible (hors ligne ?)"; return; }
  if (!R) return;
  if (!navigator.onLine) { DB.sync.lastError = null; DB.sync.offline = true; refreshSyncUI(); return; }
  DB.sync.offline = false;
  syncing = true; refreshSyncUI();
  const stats = { up: 0, down: 0, conflicts: 0 };
  try {
    for (let attempt = 0; ; attempt++) {
      try { if (!(await syncOnce(R, stats))) return; break; }
      catch (e) { if (e.retry && attempt < 3) { await new Promise(ok => setTimeout(ok, 400 * (attempt + 1))); continue; } throw e; }
    }
    DB.sync.lastAt = new Date().toISOString(); DB.sync.lastError = null;
    if (stats.conflicts) setTimeout(() => toast(`${stats.conflicts} conflit(s) : les deux versions sont gardées (badge « conflit »).`), 50);
    else if (manual) setTimeout(() => toast(`Synchronisé ✓ (${stats.up} envoyé(s), ${stats.down} reçu(s))`), 50);
  } catch (e) {
    DB.sync.lastError = frErr(e);
  } finally {
    syncing = false; saveNow();
    const r = route().name; const busy = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (!busy && ["home", "hist", "prog2", "poids", "set", "hd"].includes(r) && !$(".sheet-bg")) render(true); else refreshSyncUI();
  }
}
function frErr(e) {
  const m = String((e && (e.message || e.error_description || e.msg)) || e);
  if (/PUBLIC_REPO/.test(m)) return "Ce dépôt est PUBLIC : tes données seraient visibles par tous. Crée un dépôt privé.";
  if (/NO_WRITE/.test(m)) return "Le jeton ne peut pas écrire : donne-lui « Contents : Read and write ».";
  if (/^GH 401/.test(m)) return "Jeton GitHub invalide ou expiré : crée un nouveau jeton.";
  if (/^GH 403/.test(m)) return "Le jeton n'a pas accès à ce dépôt (vérifie « Repository access » et « Contents : Read and write »).";
  if (/^GH 404/.test(m)) return "Dépôt introuvable : vérifie son nom et que le jeton y a accès.";
  if (/Invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/Email not confirmed/i.test(m)) return "Confirme d'abord ton adresse : clique sur le lien reçu par e-mail.";
  if (/already registered|already exists/i.test(m)) return "Ce compte existe déjà : utilise « Se connecter ».";
  if (/Password should be/i.test(m)) return "Mot de passe trop court (8 caractères minimum conseillés).";
  if (/Signups not allowed/i.test(m)) return "Les nouvelles inscriptions sont désactivées pour ce projet.";
  if (/relation .* does not exist|Could not find the table/i.test(m)) return "Les tables n'existent pas encore : exécute le fichier supabase/schema.sql.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Pas de connexion au serveur. Réessaie avec du réseau.";
  if (/Invalid API key|No API key/i.test(m)) return "Clé du projet invalide : vérifie l'URL et la clé publique.";
  return m.slice(0, 160);
}
function scheduleSync(ms = 1500) { if (!syncOn()) return; clearTimeout(syncT); syncT = setTimeout(() => syncNow(false), ms); }
function pendingCount() { return DB.workouts.filter(w => w.dirty && w.status === "done").length + DB.weights.filter(x => x.dirty).length + (DB.settings.profileDirty ? 1 : 0); }
function ago(iso) { const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return "à l'instant"; if (s < 3600) return `il y a ${Math.round(s / 60)} min`; if (s < 86400) return `il y a ${Math.round(s / 3600)} h`; return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); }
function syncBadge(small) {
  const on = syncOn() && DB.sync.userId; const p = pendingCount();
  let t, cls = "";
  if (!on) { if (small !== true) return ""; t = "Local"; cls = "off"; }
  else if (syncing) t = "Synchro…";
  else if (DB.sync.lastError) { t = "Erreur synchro"; cls = "err"; }
  else if (DB.sync.offline || !navigator.onLine) { t = p ? `Hors ligne · ${p} en attente` : "Hors ligne"; cls = "off"; }
  else if (p) t = `${p} en attente`;
  else t = DB.sync.lastAt ? "Synchronisé" : "Connecté";
  return `<a class="sbadge ${cls}" href="#/reglages" data-sync-badge>${I.cloud}<span>${t}</span></a>`;
}
function refreshSyncUI() { $$("[data-sync-badge]").forEach(b => { const t = document.createElement("div"); t.innerHTML = syncBadge(true); if (t.firstElementChild) b.replaceWith(t.firstElementChild); }); const sp = $("#syncpanel"); if (sp) sp.outerHTML = syncPanel(); }
function syncPanel() {
  const c = syncCfg();
  const g = ghCfg();
  if (g || (!c && !window.__mpfFakeRemote && DB.sync.mode !== "supabase")) {
    const err = DB.sync.lastError ? `<div class="note-box" style="margin-bottom:12px">⚠ ${esc(DB.sync.lastError)}</div>` : "";
    if (g && DB.sync.userId) { const p = pendingCount(); return `<div class="card pad" id="syncpanel">${err}
      <div class="pr" style="border:0;padding-top:0"><span>Stockage</span><b>GitHub · dépôt privé</b></div>
      <div class="pr"><span>Dépôt</span><b style="font-size:12px;word-break:break-all;text-align:right">${esc(g.repo)}</b></div>
      <div class="pr"><span>Dernière synchro</span><b>${DB.sync.lastAt ? ago(DB.sync.lastAt) : "jamais"}</b></div>
      <div class="pr"><span>En attente d'envoi</span><b>${p}</b></div>
      <div class="row2" style="margin-top:12px"><button class="btn pri" data-act="sb-sync" ${syncing ? "disabled" : ""}>${syncing ? "Synchro…" : "Synchroniser"}</button><button class="btn ghost" data-act="gh-out">Déconnecter</button></div>
      <p class="dim" style="font-size:12px;margin:10px 0 0">Automatique : à l'ouverture, après chaque séance ou pesée, au retour du réseau. Déconnecter retire le jeton de cet appareil sans rien effacer.</p></div>`; }
    return `<div class="card pad" id="syncpanel">${err}
      <p class="mut" style="font-size:14px;margin:0 0 12px">Tes séances et pesées sont enregistrées dans un fichier de ton <b>dépôt GitHub privé</b>, et chaque appareil connecté le lit et le met à jour.</p>
      <div class="field"><label for="gh-repo">Dépôt privé (propriétaire/nom)</label><input id="gh-repo" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(DB.sync.ghRepo || GH_DEFAULT_REPO)}"></div>
      <div class="field"><label for="gh-token">Jeton GitHub (fine-grained)</label><input id="gh-token" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_…"></div>
      <p class="dim" style="font-size:12px;margin:0 0 12px">Le jeton reste uniquement sur cet appareil. Il n'est jamais mis dans le code ni dans les sauvegardes exportées.</p>
      <button class="btn pri block" data-act="gh-in">Connecter et synchroniser</button>
      ${!g ? `<button class="btn ghost sm block" style="margin-top:10px" data-act="sb-mode">Utiliser Supabase à la place</button>` : ""}</div>`;
  }
  if (!c && !window.__mpfFakeRemote) return `<div class="card pad" id="syncpanel">
    <p class="mut" style="font-size:14px;margin:0 0 12px">Relie l'appli à ton compte <b>Supabase</b> (gratuit) pour retrouver les mêmes séances et pesées sur ton iPhone et ton ordinateur. Les étapes sont dans le README du projet.</p>
    <div class="field"><label for="sb-url">URL du projet</label><input id="sb-url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://xxxx.supabase.co" value="${esc(DB.sync.url)}"></div>
    <div class="field"><label for="sb-key">Clé publique (publishable / anon)</label><input id="sb-key" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="sb_publishable_…" value="${esc(DB.sync.key)}"></div>
    <p class="dim" style="font-size:12px;margin:0 0 12px">Ne colle jamais la clé « secret » ou « service_role » ici.</p>
    <button class="btn sec block" data-act="sb-save">Enregistrer</button>
    <button class="btn ghost sm block" style="margin-top:10px" data-act="gh-mode">Utiliser GitHub à la place</button></div>`;
  const err = DB.sync.lastError ? `<div class="note-box" style="margin-bottom:12px">⚠ ${esc(DB.sync.lastError)}</div>` : "";
  if (!DB.sync.userId) return `<div class="card pad" id="syncpanel">${err}
    <p class="mut" style="font-size:14px;margin:0 0 12px">Connecte-toi avec le même compte sur chaque appareil. Tes données locales seront envoyées dans ton compte, sans rien effacer.</p>
    <div class="field"><label for="sb-email">E-mail</label><input id="sb-email" type="email" autocomplete="username" autocapitalize="off" value="${esc(DB.sync.email || "")}"></div>
    <div class="field"><label for="sb-pw">Mot de passe</label><input id="sb-pw" type="password" autocomplete="current-password"></div>
    <div class="row2"><button class="btn pri" data-act="sb-in">Se connecter</button><button class="btn sec" data-act="sb-up">Créer mon compte</button></div>
    ${CFG.supabaseUrl ? "" : `<button class="btn ghost sm block" style="margin-top:10px" data-act="sb-reset">Changer de projet Supabase</button>`}</div>`;
  const p = pendingCount();
  return `<div class="card pad" id="syncpanel">${err}
    <div class="pr" style="border:0;padding-top:0"><span>Compte</span><b>${esc(DB.sync.email || "")}</b></div>
    <div class="pr"><span>Dernière synchro</span><b>${DB.sync.lastAt ? ago(DB.sync.lastAt) : "jamais"}</b></div>
    <div class="pr"><span>En attente d'envoi</span><b>${p}</b></div>
    <div class="row2" style="margin-top:12px"><button class="btn pri" data-act="sb-sync" ${syncing ? "disabled" : ""}>${syncing ? "Synchro…" : "Synchroniser"}</button><button class="btn ghost" data-act="sb-out">Se déconnecter</button></div>
    <p class="dim" style="font-size:12px;margin:10px 0 0">La synchro se fait toute seule : à l'ouverture, après chaque séance ou pesée, et au retour du réseau. Se déconnecter n'efface rien sur cet appareil.</p></div>`;
}
addEventListener("online", () => scheduleSync(300));
document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - lastVisSync > 60000) { lastVisSync = Date.now(); scheduleSync(500); } });

/* ───────────── Minuteur de repos ───────────── */
const rest = { end: 0, total: 0, t: null };
function startRest(sec, label) {
  rest.total = sec; rest.end = Date.now() + sec * 1000; $("#restLb").textContent = label || "";
  $("#rest").classList.add("on"); clearInterval(rest.t); rest.t = setInterval(tickRest, 250); tickRest();
}
function tickRest() {
  const left = Math.ceil((rest.end - Date.now()) / 1000);
  if (left <= 0) { $("#restTm").textContent = "GO"; if (navigator.vibrate) navigator.vibrate([120, 80, 120]); clearInterval(rest.t); rest.t = setTimeout(stopRest, 2500); return; }
  $("#restTm").textContent = `${Math.floor(left / 60)}:${pad2(left % 60)}`;
}
function stopRest() { clearInterval(rest.t); clearTimeout(rest.t); $("#rest").classList.remove("on"); }
$("#rest").addEventListener("click", ev => {
  const b = ev.target.closest("[data-rest]"); if (!b) return;
  const v = b.dataset.rest; if (v === "skip") return stopRest();
  rest.end += (+v) * 1000; if (rest.end < Date.now()) return stopRest(); tickRest();
});

/* ───────────── Feuilles & toasts ───────────── */
function sheet(html) { closeSheet(); const bg = document.createElement("div"); bg.className = "sheet-bg"; bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; document.body.appendChild(bg);
  bg.addEventListener("click", ev => { if (ev.target === bg || ev.target.closest("[data-close]")) closeSheet(); handleAct(ev); }); }
function closeSheet() { $$(".sheet-bg").forEach(x => x.remove()); }
let toastT;
function toast(msg, undo, label = "Annuler") {
  $$(".toast").forEach(x => x.remove()); clearTimeout(toastT);
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status");
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button type="button">${esc(label)}</button>` : ""}`;
  if (undo) t.querySelector("button").onclick = () => { undo(); t.remove(); };
  document.body.appendChild(t); toastT = setTimeout(() => t.remove(), undo ? 6000 : 3200);
}

/* ───────────── Routeur ───────────── */
function route() {
  const h = location.hash.replace(/^#\/?/, ""); const [a, b, c] = h.split("/");
  if (!a) return { name: "home" };
  if (a === "programme") return { name: "prog", s: b || "A" };
  if (a === "exercice") return { name: "ex", id: b };
  if (a === "seance") return { name: "wk" };
  if (a === "historique" && b && c === "modifier") return { name: "edit", id: b };
  if (a === "historique" && b) return { name: "hd", id: b };
  if (a === "historique") return { name: "hist" };
  if (a === "progres") return { name: "prog2", q: b, m: c };
  if (a === "poids") return { name: "poids", r: b };
  if (a === "reglages") return { name: "set" };
  return { name: "404" };
}
function vNotFound() { return `<div class="empty"><div class="disp">Introuvable</div><a class="btn sec" href="#/">Retour à l'accueil</a></div>`; }
let clockT;
function render(keepScroll) {
  const r = route(); if (keepScroll !== true) closeSheet(); const y = scrollY;
  const map = { home: vHome, prog: () => vProgramme(r.s), ex: () => vExercise(r.id), wk: vWorkout, hist: vHistory, hd: () => vHistDetail(r.id), edit: () => vEdit(r.id), prog2: () => vProgress(r.q, r.m), poids: () => vWeight(r.r), set: vSettings };
  view.innerHTML = (map[r.name] || vNotFound)();
  const navKey = r.name === "ex" ? "prog" : ["hd", "edit", "hist"].includes(r.name) ? "prog2" : r.name;
  $("#nav").innerHTML = navHTML(navKey);
  if (r.name !== "edit" && DB.editBuf) { DB.editBuf = null; save(); }
  clearInterval(clockT);
  if (r.name === "wk" && DB.draft) { const tick = () => { const c = $("#clock"); if (!c) return; const m = Math.floor((Date.now() - new Date(DB.draft.startedAt)) / 60000); c.textContent = m < 60 ? m + " min" : Math.floor(m / 60) + " h " + pad2(m % 60); }; tick(); clockT = setInterval(tick, 20000); }
  const gal = $("#gal"); if (gal) gal.addEventListener("scroll", () => { const i = Math.round(gal.scrollLeft / gal.clientWidth); $$("#dots i").forEach((d, k) => d.classList.toggle("on", k === i)); }, { passive: true });
  const sel = $("#exsel"); if (sel) sel.onchange = () => { location.hash = "#/progres/" + sel.value; };
  const wk = $("#wg-kg"); if (wk) wk.onkeydown = ev => { if (ev.key === "Enter") { ev.preventDefault(); saveWeight(); } };
  const imp = $("#imp"); if (imp) imp.onchange = () => imp.files[0] && doImport(imp.files[0]);
  const ar = $("#autorest"); if (ar) ar.onchange = () => { DB.settings.autoRest = ar.checked; saveNow(); };
  if (keepScroll === true) window.scrollTo(0, y); else if (!["wk", "edit"].includes(r.name)) window.scrollTo(0, 0);
}
addEventListener("hashchange", render);

/* ───────────── Événements ───────────── */
function handleAct(ev) {
  const go = ev.target.closest("[data-go]"); if (go) { location.hash = go.dataset.go; return; }
  const el = ev.target.closest("[data-act]"); if (!el) return;
  const act = el.dataset.act; const w = editorTarget();
  switch (act) {
    case "back": history.length > 1 ? history.back() : (location.hash = "#/"); break;
    case "start": startSession(el.dataset.s); break;
    case "discard-start": DB.draft = null; saveNow(); closeSheet(); startSession(el.dataset.s); break;
    case "ck": toggleSet(el.closest(".srow")); break;
    case "copyprev": {
      const row = el.closest(".srow"); const e = exOf(row.dataset.ex), i = +row.dataset.i; const prev = prevFor(e.id, w.id, w.date); const p = prev && prev.sets.filter(x => x.done)[i]; if (!p) break;
      const s = w.entries[e.id].sets[i]; s.kg = String(num(p.kg) || 0); s.reps = String(num(p.reps)); rowRefresh(row, e, s); touch(w); break;
    }
    case "addset": case "rmset": {
      const sec = el.closest(".wex"); const id = sec.id.slice(3); const e = exOf(id); const sets = w.entries[id].sets;
      if (act === "addset") { const last = sets[sets.length - 1] || {}; sets.push({ kg: last.kg || "", reps: "", done: false }); }
      else if (sets.length > 1) { const last = sets[sets.length - 1]; if (last.done && !confirm("La dernière série est validée. La retirer ?")) break; sets.pop(); }
      touch(w); sec.outerHTML = exBlockHTML(e, w, route().name === "edit" ? "edit" : "draft"); progRefresh(w); break;
    }
    case "note": { const nt = $(".nt", el.closest(".wex")); nt.hidden = false; $("textarea", nt).focus(); break; }
    case "cardiock": { w.cardio = w.cardio || {}; w.cardio.done = !w.cardio.done; touch(w); $("#wx-cardio").outerHTML = cardioHTML(w); break; }
    case "finish": finishSheet(); break;
    case "checkall": {
      const w2 = DB.draft; let bad = 0;
      for (const id in w2.entries) for (const s of w2.entries[id].sets) if (!s.done && (s.kg !== "" || s.reps !== "")) { if (validSet(exOf(id), s)) bad++; else s.done = true; }
      touch(w2); saveNow(); closeSheet(); render(); finishSheet(); if (bad) toast(bad + " série(s) incomplète(s) laissée(s) non validée(s)."); break;
    }
    case "finish-ok": finishOK(); break;
    case "discard": sheet(`<h2 class="disp">Abandonner ?</h2><p>Les séries saisies dans cette séance seront perdues. Ton historique n'est pas touché.</p>
      <div class="btns"><button class="btn pri" data-act="discard-ok">Oui, abandonner</button><button class="btn ghost" data-close>Non, continuer</button></div>`); break;
    case "discard-ok": DB.draft = null; saveNow(); stopRest(); closeSheet(); location.hash = "#/"; break;
    case "edit": DB.editBuf = null; location.hash = `#/historique/${el.dataset.id}/modifier`; break;
    case "edit-cancel": { const id = DB.editBuf && DB.editBuf.id; DB.editBuf = null; saveNow(); location.hash = id ? "#/historique/" + id : "#/historique"; break; }
    case "edit-save": editSave(); break;
    case "del": {
      const id = el.dataset.id; const x = DB.workouts.find(y => y.id === id); if (!x) break;
      x.deleted = true; markDirty(x); saveNow(); location.hash = "#/historique";
      setTimeout(() => toast("Séance déplacée dans la corbeille", () => { x.deleted = false; markDirty(x); saveNow(); render(); }), 50); break;
    }
    case "restore": { const x = DB.workouts.find(y => y.id === el.dataset.id); if (x) { x.deleted = false; markDirty(x); saveNow(); render(); toast("Séance restaurée ✓"); } break; }
    case "export": doExport(); break;
    case "wsave": saveWeight(); break;
    case "wdel": { const x = DB.weights.find(y => y.id === el.dataset.id); if (!x) break; x.deleted = true; markDirty(x); saveNow(); render(true);
      toast("Pesée supprimée", () => { x.deleted = false; markDirty(x); saveNow(); render(true); }); break; }
    case "wgoal": {
      const g = num($("#wg-goal").value), s0 = $("#wg-start").value.trim() === "" ? null : num($("#wg-start").value);
      if (!(g >= 30 && g <= 250) || (s0 != null && !(s0 >= 30 && s0 <= 250))) { toast("Valeurs invalides (entre 30 et 250 kg)."); break; }
      DB.settings.goalKg = g; DB.settings.startKg = s0; DB.settings.profileUpdatedAt = new Date().toISOString(); DB.settings.profileDirty = true; saveNow(); scheduleSync(); render(true); toast("Objectif enregistré ✓"); break;
    }
    case "sb-save": {
      const u = $("#sb-url").value.trim().replace(/\/+$/, ""), k = $("#sb-key").value.trim();
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(u)) { toast("URL attendue : https://xxxx.supabase.co"); break; }
      let isSecret = /service_role|sb_secret_/i.test(k);
      if (!isSecret && k.split(".").length === 3) { try { isSecret = /service_role/.test(atob(k.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch (e) {} }
      if (isSecret) { toast("Ceci est une clé SECRÈTE : ne l'utilise jamais dans l'appli. Prends la clé publique."); break; }
      if (k.length < 20) { toast("Clé publique invalide."); break; }
      DB.sync.url = u; DB.sync.key = k; SB = null; saveNow(); render(true); break;
    }
    case "sb-reset": DB.sync.url = ""; DB.sync.key = ""; DB.sync.userId = null; DB.sync.cursor = {}; SB = null; saveNow(); render(true); break;
    case "sb-in": case "sb-up": {
      const email = $("#sb-email").value.trim(), pw = $("#sb-pw").value;
      if (!/^\S+@\S+\.\S+$/.test(email) || pw.length < 6) { toast("Indique ton e-mail et un mot de passe (8 caractères ou plus)."); break; }
      el.disabled = true; DB.sync.email = email;
      (async () => {
        try {
          const R = await remote();
          if (act === "sb-up") { const d = await R.signUp(email, pw); if (!d.session) { DB.sync.lastError = null; saveNow(); render(true); sheet(`<h2 class="disp">Vérifie tes e-mails</h2><p>Un lien de confirmation a été envoyé à <b>${esc(email)}</b>. Clique dessus, puis reviens ici et touche « Se connecter ».</p><div class="btns"><button class="btn pri" data-close>Compris</button></div>`); return; } }
          else await R.signIn(email, pw);
          DB.sync.lastError = null; await syncNow(true);
        } catch (e) { DB.sync.lastError = frErr(e); saveNow(); render(true); }
      })(); break;
    }
    case "sb-sync": syncNow(true); break;
    case "add-ex": pick.q = ""; pick.m = ""; pick.eq = ""; openPicker(); setTimeout(() => { const q = $("#pk-q"); if (q && matchMedia("(pointer:fine)").matches) q.focus(); }, 50); break;
    case "pick-back": openPicker(); break;
    case "pick-ex": {
      const id = el.dataset.id;
      if (EXI[id]) { const e = EXI[id]; confirmPick({ id: e.id, nom: e.nom, machine: e.machine, series: e.series, type: e.type }); break; }
      if (LIB && LIB.byId[id]) confirmPick(libDef(LIB.byId[id])); break;
    }
    case "pick-ok": { const d = pick.def; if (!d) break; const n = parseInt(($("#pk-n") || {}).value, 10) || 3; const keep = !!($("#pk-keep") && $("#pk-keep").checked);
      if (EXI[d.id]) { const w = editorTarget(); w.entries[d.id] = { sets: Array.from({ length: n }, () => ({ kg: "", reps: "", done: false })), note: "", extra: true }; if (keep) { DB.settings.extras = DB.settings.extras || {}; const L = DB.settings.extras[w.session] = DB.settings.extras[w.session] || []; if (!L.some(x => x.id === d.id)) L.push({ id: d.id, nom: d.nom, series: n }); DB.settings.profileDirty = true; } touch(w); saveNow(); closeSheet(); render(true); toast("Exercice ajouté ✓"); }
      else addExtra({ ...d, series: n }, n, keep); break; }
    case "custom-ex": customForm(); break;
    case "custom-ok": {
      const name = $("#cx-name").value.trim(); if (name.length < 2) { toast("Donne un nom à ton exercice."); break; }
      const t = $("#cx-t").value, n = parseInt($("#cx-n").value, 10) || 3;
      const d = { id: "perso-" + uid().slice(0, 13).replace(/[^a-z0-9]/gi, ""), nom: name, machine: $("#cx-eq").value, series: n, reps: t === "time" ? [20, 45] : [8, 12], repos: 90, P: [$("#cx-m").value], S: [], custom: true };
      if (t === "time") d.type = "time";
      pick.def = d; addExtra(d, n, false); break;
    }
    case "rm-ex": {
      const sec = el.closest(".wex"); const id = sec.id.slice(3); const ent = w.entries[id];
      if (ent && ent.sets.some(x => x.done) && !confirm("Des séries sont déjà validées pour cet exercice. Le retirer de la séance ?")) break;
      delete w.entries[id]; touch(w); saveNow(); render(true); toast("Exercice retiré de la séance"); break;
    }
    case "rm-keep": { const L = (DB.settings.extras || {})[el.dataset.s] || []; DB.settings.extras[el.dataset.s] = L.filter(x => x.id !== el.dataset.id); DB.settings.profileUpdatedAt = new Date().toISOString(); DB.settings.profileDirty = true; saveNow(); scheduleSync(); render(true); toast("Retiré des prochaines séances " + el.dataset.s); break; }
    case "sb-mode": DB.sync.mode = "supabase"; saveNow(); render(true); break;
    case "gh-mode": DB.sync.mode = "github"; saveNow(); render(true); break;
    case "gh-in": {
      const repo = $("#gh-repo").value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/+$/, "");
      const tok = $("#gh-token").value.trim();
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { toast("Dépôt attendu sous la forme propriétaire/nom."); break; }
      if (!/^(github_pat_|ghp_)[\w]{20,}$/.test(tok)) { toast("Jeton invalide : il commence par github_pat_"); break; }
      el.disabled = true;
      (async () => {
        DB.sync.ghRepo = repo; DB.sync.mode = "github";
        try { localStorage.setItem("mpf.ghtoken", tok); } catch (e) {}
        try {
          await ghRemote(ghCfg()).check();
          DB.sync.lastError = null; DB.settings.profileDirty = DB.settings.profileDirty || !!DB.settings.profileUpdatedAt;
          await syncNow(true);
        } catch (e) { try { localStorage.removeItem("mpf.ghtoken"); } catch (x) {} DB.sync.userId = null; DB.sync.lastError = frErr(e); saveNow(); render(true); }
      })(); break;
    }
    case "gh-out": try { localStorage.removeItem("mpf.ghtoken"); } catch (e) {} DB.sync.userId = null; DB.sync.lastError = null; saveNow(); render(true); toast("Déconnecté. Tes données restent sur cet appareil."); break;
    case "sb-out": (async () => { try { const R = await remote(); await R.signOut(); } catch (e) {} DB.sync.userId = null; DB.sync.lastError = null; saveNow(); render(true); toast("Déconnecté. Tes données restent sur cet appareil."); })(); break;
    case "dl-backup": { const raw = localStorage.getItem("mpf.backup.v5"); if (!raw) break; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([raw], { type: "application/json" })); a.download = "programme-fitness-copie-v5.json"; document.body.appendChild(a); a.click(); a.remove(); break; }
    case "wipe": sheet(`<h2 class="disp">Tout effacer ?</h2><p>Cela supprime les ${DB.workouts.length} séance(s) et ${DB.weights.length} pesée(s) de ce navigateur. Ce qui est déjà synchronisé dans ton compte reste dans le cloud et reviendra à la prochaine connexion. Exporte une sauvegarde avant si tu as un doute.</p>
      <div class="btns"><button class="btn ghost" data-act="export">Exporter d'abord</button><button class="btn pri" data-act="wipe-ok">Effacer définitivement</button><button class="btn ghost" data-close>Annuler</button></div>`); break;
    case "wipe-ok": { const keep = DB.sync; DB = blankDB(); DB.sync = { ...DB.sync, url: keep.url, key: keep.key }; saveNow(); } closeSheet(); render(); toast("Données effacées."); break;
  }
}
view.addEventListener("click", handleAct);
view.addEventListener("input", ev => {
  const t = ev.target; const w = editorTarget(); if (!w) return;
  if (t.dataset.f === "kg" || t.dataset.f === "reps") {
    const row = t.closest(".srow"); const s = w.entries[row.dataset.ex].sets[+row.dataset.i];
    let v = t.value.replace(/[^\d.,]/g, ""); if (t.dataset.f === "reps") v = v.replace(/[.,]/g, "");
    if (v !== t.value) t.value = v;
    s[t.dataset.f] = v; t.classList.remove("bad");
    if (s.done) { const err = validSet(exOf(row.dataset.ex), s); if (err) { s.done = false; rowRefresh(row, exOf(row.dataset.ex), s); progRefresh(w); } }
    touch(w);
  } else if (t.dataset.f === "note") { w.entries[t.closest(".wex").id.slice(3)].note = t.value; touch(w); }
  else if (t.dataset.c) { w.cardio = w.cardio || {}; w.cardio[t.dataset.c] = t.value.replace(/[^\d.,]/g, ""); touch(w); }
  else if (t.dataset.w) { if (t.dataset.w === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(t.value)) return; w[t.dataset.w] = t.value; touch(w); }
});
view.addEventListener("keydown", ev => {
  if (ev.key !== "Enter") return; const t = ev.target; if (!t.dataset.f || t.dataset.f === "note") return;
  ev.preventDefault();
  if (t.dataset.f === "kg") $('[data-f="reps"]', t.closest(".srow")).focus();
  else { t.blur(); toggleSet(t.closest(".srow")); }
});

/* ───────────── PWA ───────────── */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing; nw && nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) toast("Nouvelle version disponible", () => location.reload(), "Recharger");
      });
    });
  }).catch(() => {});
}

window.__mpf = { get db() { return DB; }, version: APP_VERSION, syncNow };
render();
scheduleSync(800);
})();
