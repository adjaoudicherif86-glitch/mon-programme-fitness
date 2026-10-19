/* Mon Programme Fitness — V5
   Stockage : localStorage de ce navigateur (+ export/import JSON).
   La synchronisation entre appareils (Supabase) arrive à l'étape 2. */
(() => {
"use strict";

const APP_VERSION = "5.0.0";
const KEY = "mpf.v5";
const EX = window.EXERCISES, SES = window.SESSIONS, MUS = window.MUSCLES, CARDIO = window.CARDIO, ANA = window.ANATOMY;
const EXI = Object.fromEntries(EX.map(e => [e.id, e]));
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
const img = (id, i = 0) => `img/ex/${id}-${i}.jpg`;

/* ───────────── Stockage ───────────── */
let storageOK = true;
function blankDB() { return { app: "mon-programme-fitness", version: 5, workouts: [], draft: null, editBuf: null, settings: { autoRest: true } }; }
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankDB();
    const d = JSON.parse(raw);
    const b = blankDB();
    return { ...b, ...d, settings: { ...b.settings, ...(d.settings || {}) }, workouts: Array.isArray(d.workouts) ? d.workouts : [] };
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

const live = () => DB.workouts.filter(w => !w.deleted && w.status === "done");
const sorted = () => live().sort((a, b) => (b.date + (b.finishedAt || "")).localeCompare(a.date + (a.finishedAt || "")));

/* ───────────── Calculs ───────────── */
const doneSets = (w, exId) => ((w.entries[exId] || {}).sets || []).filter(s => s.done && num(s.reps) > 0);
function setVol(e, s) { if (e.type === "time" || e.assist) return 0; const k = num(s.kg), r = num(s.reps); return k > 0 && r > 0 ? k * r : 0; }
function wVol(w) { let v = 0; for (const id in w.entries) { const e = EXI[id]; if (!e) continue; for (const s of doneSets(w, id)) v += setVol(e, s); } return v; }
function wSets(w) { let n = 0; for (const id in w.entries) n += doneSets(w, id).length; return n; }
function wTotalSets(w) { let n = 0; for (const id in w.entries) n += (w.entries[id].sets || []).length; return n; }
function prevFor(exId, excludeId, maxDate) {
  for (const w of sorted()) { if (w.id === excludeId || (maxDate && w.date > maxDate)) continue; const ds = (w.entries[exId] || {}).sets || []; if (ds.some(s => s.done && num(s.reps) > 0)) return { w, sets: ds }; }
  return null;
}
const e1rm = (k, r) => k * (1 + r / 30);
function bestOf(exId, w) {
  const e = EXI[exId]; let best = null;
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
    a("#/historique", "hist", I.hist, "Historique") + a("#/progres", "prog2", I.chart, "Progrès");
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
    const rows = Object.keys(last.entries).filter(id => EXI[id] && doneSets(last, id).length).map(id => {
      const e = EXI[id], b = bestOf(id, last);
      return `<a class="li" href="#/exercice/${id}"><img class="thumb" src="${img(id)}" alt="" loading="lazy"><div class="t"><b>${esc(e.nom)}</b><small>${doneSets(last, id).length} séries</small></div>
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
  <div class="sec-title"><h2 class="disp">Cette semaine</h2></div>
  <div class="tiles">
    <div class="tile"><b>${thisWeek.length}<span class="dim">/3</span></b><small>séances cette semaine</small></div>
    <div class="tile"><b>${ws.length}</b><small>séances terminées au total</small></div>
    <div class="tile"><b>${weekVol ? fmtVol(weekVol).replace(" ", "<small style='display:inline;font-size:14px'> ") + "</small>" : "0"}</b><small>volume soulevé</small></div>
  </div>
  <div class="sec-title"><h2 class="disp">Dernières perfs</h2>${last ? `<span class="mut" style="font-size:13px">${esc(fmtDay(last.date))}</span>` : ""}</div>
  ${lastHTML}`;
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
  <button class="btn pri block" style="margin-top:18px" data-act="start" data-s="${s}">${I.play}Commencer la séance ${s}</button>`;
}

function vExercise(id) {
  const e = EXI[id]; if (!e) return vNotFound();
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
    <div class="card pad" style="margin-top:10px"><div class="eyebrow" style="margin-bottom:10px">Dernière fois · ${esc(fmtDay(pv.w.date))}</div>
      ${pv.sets.filter(x => x.done).map((x, i) => `<div class="pr"><span>Série ${i + 1}</span><b>${setTxt(e, x)}</b></div>`).join("")}</div>
    ${hist.length > 1 ? `<div class="card pad" style="margin-top:10px">${lineChart(hist.map(w => ({ x: w.date, y: e.type === "time" ? bestOf(id, w).r : bestOf(id, w).k })), e.type === "time" ? "s" : "kg")}</div>` : ""}`
    : `<div class="card empty" style="padding:26px">Pas encore de données. Elles apparaîtront ici après ta première séance.</div>`}`;
}

/* ───────────── Séance (saisie) ───────────── */
function newWorkout(s) {
  const entries = {};
  for (const e of EX.filter(x => x.s === s)) {
    const pv = prevFor(e.id);
    const n = Math.max(e.series, pv ? pv.sets.filter(x => x.done).length : 0);
    entries[e.id] = { sets: Array.from({ length: n }, () => ({ kg: "", reps: "", done: false })), note: "" };
  }
  const now = new Date().toISOString();
  return { id: uid(), session: s, date: isoDay(), startedAt: now, updatedAt: now, status: "draft", rev: 0, entries, cardio: { min: "", incl: "", vit: "", done: false }, note: "" };
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
function exBlockHTML(e, w, mode) {
  const ent = w.entries[e.id]; const prev = prevFor(e.id, w.id, w.date);
  const pb = prev ? prev.sets.filter(x => x.done) : [];
  return `<section class="card wex" id="wx-${e.id}">
    <div class="hd"><img src="${img(e.id)}" alt=""><div class="t"><h3 class="disp">${esc(e.nom)}</h3><small>Objectif ${e.series} × ${repTxt(e)} · repos ${restTxt(e.repos)}</small></div>
      <a class="iconbtn" href="#/exercice/${e.id}" aria-label="Fiche de l'exercice">${I.info}</a></div>
    ${prev ? `<div class="last">Dernière fois (${esc(fmtShort(prev.w.date))}) : <b>${pb.map(x => e.type === "time" ? num(x.reps) + " s" : fmtKg(num(x.kg) || 0) + "×" + num(x.reps)).join(" · ")}</b></div>` : `<div class="last">Première fois : ${e.type === "time" ? `vise ${e.reps[0]} secondes en gardant le corps bien aligné.` : e.assist ? "commence avec beaucoup d'aide, puis réduis-la au fil des semaines." : `choisis une charge qui te permet de faire ${e.reps[0]} reps proprement.`}</div>`}
    ${e.assist ? `<div class="last">Ici le poids est une <b>aide</b> : moins de kg = plus difficile.</div>` : ""}
    <div class="sets">
      <div class="sr-h"><span>#</span><span>Précédent</span><span>${e.assist ? "Aide kg" : e.type === "time" ? "Lest kg" : "kg"}</span><span>${e.type === "time" ? "sec" : "reps"}</span><span></span></div>
      ${ent.sets.map((_, i) => setRowHTML(e, w, i, prev)).join("")}
    </div>
    <div class="errmsg" data-err="${e.id}" hidden></div>
    <div class="tools"><button type="button" data-act="addset">+ Série</button>${ent.sets.length > 1 ? `<button type="button" data-act="rmset">− Retirer la dernière</button>` : ""}
      <button type="button" data-act="note">${ent.note ? "Modifier la note" : "Ajouter une note"}</button></div>
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
  const done = wSets(w), tot = wTotalSets(w);
  const isEdit = mode === "edit";
  return `<div class="wk-head"><div class="r">
      ${isEdit ? `<button class="back" data-act="edit-cancel">${I.back}Annuler</button>` : `<div><div class="eyebrow">${esc(SES[w.session].jour)} · ${esc(fmtShort(w.date))}</div><h1 class="disp">${esc(SES[w.session].nom)}</h1></div>`}
      ${isEdit ? `<div class="disp" style="font-size:22px">Modifier</div>` : `<div class="clock" id="clock"></div>`}
    </div><div class="prog"><i id="progbar" style="width:${tot ? (done / tot) * 100 : 0}%"></i></div></div>
    ${isEdit ? `<div class="field" style="margin-top:16px"><label for="w-date">Date de la séance</label><input type="date" id="w-date" data-w="date" value="${esc(w.date)}" max="${isoDay()}"></div>` : ""}
    ${exs.map(e => exBlockHTML(e, w, mode)).join("")}
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
  const e = EXI[row.dataset.ex], i = +row.dataset.i, s = w.entries[e.id].sets[i];
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
  w.status = "done"; w.finishedAt = new Date().toISOString(); w.updatedAt = w.finishedAt; w.rev = (w.rev || 0) + 1;
  w.durationMin = Math.max(1, Math.round((Date.now() - new Date(w.startedAt)) / 60000));
  if (!DB.workouts.some(x => x.id === w.id)) DB.workouts.push(w);
  DB.draft = null; saveNow(); closeSheet(); stopRest();
  location.hash = "#/historique/" + w.id;
  setTimeout(() => toast("Séance enregistrée ✓"), 50);
}

/* ───────────── Historique ───────────── */
function vHistory() {
  const ws = sorted();
  if (!ws.length) return `<header class="top"><h1 class="disp">Historique</h1></header><div class="card empty"><div class="disp">Vide pour l'instant</div>Chaque séance terminée apparaîtra ici, datée, avec toutes tes séries.</div>`;
  let html = `<header class="top"><div><div class="eyebrow">${ws.length} séance${ws.length > 1 ? "s" : ""}</div><h1 class="disp" style="margin-top:6px">Historique</h1></div></header>`;
  let cur = "";
  for (const w of ws) {
    const m = parseDay(w.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (m !== cur) { cur = m; html += `<div class="hgrp eyebrow">${esc(m)}</div>`; }
    html += `<a class="card hcard" href="#/historique/${w.id}"><span class="L disp">${w.session}</span>
      <span><b>${esc(fmtDay(w.date))}${w.importedFrom ? '<span class="badge">import</span>' : ""}</b><small>${wSets(w)} séries${w.durationMin ? " · " + w.durationMin + " min" : ""}${w.cardio && w.cardio.done ? " · cardio ✓" : ""}</small></span>
      <span class="v">${fmtVol(wVol(w))}<small class="mut">volume</small></span></a>`;
  }
  return html;
}
function vHistDetail(id) {
  const w = DB.workouts.find(x => x.id === id && !x.deleted); if (!w) return vNotFound();
  const exs = Object.keys(w.entries).filter(k => EXI[k]);
  const c = w.cardio || {};
  return `<header class="top"><button class="back" data-go="#/historique">${I.back}Historique</button><span class="chip">${esc(SES[w.session].nom)}</span></header>
    <div class="eyebrow">${esc(fmtDay(w.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</div>
    <h1 class="disp" style="font-size:40px;margin:6px 0 16px">${esc(SES[w.session].nom)}</h1>
    <div class="kv"><div><b>${wSets(w)}</b><small>séries</small></div><div><b>${fmtVol(wVol(w))}</b><small>volume</small></div><div><b>${w.durationMin || "–"}</b><small>minutes</small></div></div>
    <div class="card">${exs.map(k => {
      const e = EXI[k], sets = w.entries[k].sets || [];
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
  for (const id in b.entries) { const e = EXI[id]; if (!e) continue; for (const s of b.entries[id].sets) if (s.done) { const err = validSet(e, s); if (err) { toast(e.nom + " : " + err); return; } } }
  const i = DB.workouts.findIndex(x => x.id === b.id); if (i < 0) return;
  b.editedAt = b.updatedAt = new Date().toISOString(); b.rev = (b.rev || 0) + 1;
  DB.workouts[i] = b; DB.editBuf = null; saveNow();
  location.hash = "#/historique/" + b.id; setTimeout(() => toast("Modifications enregistrées ✓"), 50);
}

/* ───────────── Progrès ───────────── */
function weeklyData(n = 8) {
  const m0 = mondayOf(new Date()); const out = [];
  for (let k = n - 1; k >= 0; k--) {
    const a = new Date(m0); a.setDate(a.getDate() - 7 * k); const b = new Date(a); b.setDate(b.getDate() + 7);
    const ws = live().filter(w => { const d = parseDay(w.date); return d >= a && d < b; });
    out.push({ label: a.toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" }), vol: ws.reduce((x, w) => x + wVol(w), 0), n: ws.length });
  }
  return out;
}
function barChart(data) {
  const W = 340, H = 180, pl = 8, pb = 26, pt = 22; const max = Math.max(1, ...data.map(d => d.vol));
  const bw = (W - pl * 2) / data.length;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Volume par semaine">`;
  data.forEach((d, i) => {
    const h = d.vol ? Math.max(3, (H - pb - pt) * d.vol / max) : 3, x = pl + i * bw + 5, y = H - pb - h;
    s += `<rect class="${d.vol ? "bar" : "bar0"}" x="${x}" y="${y}" width="${bw - 10}" height="${h}" rx="4"/>`;
    if (d.vol) s += `<text class="lbl" x="${x + (bw - 10) / 2}" y="${y - 6}" text-anchor="middle">${d.vol >= 1000 ? (d.vol / 1000).toFixed(1).replace(".", ",") + " t" : Math.round(d.vol)}</text>`;
    s += `<text x="${x + (bw - 10) / 2}" y="${H - 8}" text-anchor="middle">${d.label}</text>`;
  });
  return s + "</svg>";
}
function lineChart(pts, unit) {
  const W = 340, H = 190, pl = 34, pr = 14, pt = 18, pb = 28;
  const ys = pts.map(p => p.y); let lo = Math.min(...ys), hi = Math.max(...ys); if (lo === hi) { lo -= 2; hi += 2; }
  const span = hi - lo; lo = Math.max(0, lo - span * .15); hi = hi + span * .15;
  const X = i => pl + (pts.length === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (pts.length - 1));
  const Y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution">`;
  for (let g = 0; g <= 3; g++) { const v = lo + (hi - lo) * g / 3; s += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${pl - 6}" y="${Y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`; }
  s += `<path class="ln" d="${pts.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.y).toFixed(1)).join("")}"/>`;
  pts.forEach((p, i) => { s += `<circle class="pt" cx="${X(i)}" cy="${Y(p.y)}" r="4"/>`; });
  const step = Math.ceil(pts.length / 5);
  pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) s += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${fmtShort(p.x).replace(".", "")}</text>`; });
  s += `<text x="${pl}" y="11" class="lbl">${unit}</text>`;
  return s + "</svg>";
}
function vProgress(q) {
  const ws = live();
  if (!ws.length) return `<header class="top"><h1 class="disp">Progrès</h1></header><div class="card empty"><div class="disp">Pas encore de courbe</div>Termine 2 séances pour voir ta progression charge par charge.</div>`;
  const used = EX.filter(e => ws.some(w => doneSets(w, e.id).length));
  const sel = EXI[q] && used.includes(EXI[q]) ? q : used[0].id; const e = EXI[sel];
  const pts = sorted().filter(w => doneSets(w, sel).length).reverse().map(w => ({ x: w.date, y: e.type === "time" ? bestOf(sel, w).r : bestOf(sel, w).k }));
  const totalSets = ws.reduce((a, w) => a + wSets(w), 0), totalVol = ws.reduce((a, w) => a + wVol(w), 0);
  return `<header class="top"><div><div class="eyebrow">Depuis le ${esc(fmtShort(sorted().slice(-1)[0].date))}</div><h1 class="disp" style="margin-top:6px">Progrès</h1></div></header>
    <div class="tiles"><div class="tile"><b>${ws.length}</b><small>séances</small></div><div class="tile"><b>${totalSets}</b><small>séries validées</small></div><div class="tile"><b>${fmtVol(totalVol).split(" ")[0]}<small style="display:inline;font-size:14px"> ${fmtVol(totalVol).split(" ")[1]}</small></b><small>volume total</small></div></div>
    <div class="sec-title"><h2 class="disp">Volume / semaine</h2></div>
    <div class="card pad">${barChart(weeklyData())}</div>
    <div class="sec-title"><h2 class="disp">Par exercice</h2></div>
    <select class="sel" id="exsel" aria-label="Choisir un exercice">${used.map(x => `<option value="${x.id}" ${x.id === sel ? "selected" : ""}>${x.s} · ${esc(x.nom)}</option>`).join("")}</select>
    <div class="card pad" style="margin-top:10px">
      <div class="eyebrow" style="margin-bottom:8px">${e.type === "time" ? "Meilleur temps (s)" : e.assist ? "Aide utilisée (kg) — plus bas = plus fort" : "Charge de la meilleure série (kg)"}</div>
      ${pts.length > 1 ? lineChart(pts, e.type === "time" ? "s" : "kg") : `<p class="mut" style="margin:0">Une seule séance pour l'instant (${pts[0].y} ${e.type === "time" ? "s" : "kg"}). La courbe apparaîtra à la prochaine.</p>`}
    </div>
    <div class="sec-title"><h2 class="disp">Records</h2></div>
    <div class="card" style="padding:4px 16px">${used.map(x => { const p = prFor(x.id); return `<a class="pr" href="#/exercice/${x.id}" style="text-decoration:none"><span>${esc(x.nom)}</span><b>${x.type === "time" ? p.r + " s" : fmtKg(p.k) + " kg × " + p.r}</b></a>`; }).join("")}</div>`;
}

/* ───────────── Réglages & sauvegardes ───────────── */
function vSettings() {
  const del = DB.workouts.filter(w => w.deleted);
  return `<header class="top"><button class="back" data-go="#/">${I.back}Accueil</button></header>
    <h1 class="disp" style="font-size:40px;margin-bottom:6px">Réglages</h1>
    <p class="mut" style="font-size:14px;margin:0 0 18px">${live().length} séance(s) enregistrée(s) dans <b>ce navigateur</b>${storageOK ? "" : " — ⚠ stockage indisponible"}.</p>
    <div class="card">
      <button class="set-item" data-act="export">${I.dl}<div><b>Exporter une sauvegarde</b><small>Fichier .json avec tout ton historique. À faire régulièrement.</small></div></button>
      <label class="set-item" style="cursor:pointer">${I.ul}<div><b>Importer une sauvegarde</b><small>Fusionne sans doublon (V5 ou ancien fichier V4).</small></div><input type="file" accept="application/json,.json" id="imp" class="sr"></label>
      <label class="set-item" style="cursor:pointer"><span style="width:22px"></span><div><b>Minuteur de repos automatique</b><small>Se lance quand tu valides une série.</small></div>
        <input type="checkbox" id="autorest" ${DB.settings.autoRest ? "checked" : ""} style="width:24px;height:24px;accent-color:#fff"></label>
    </div>
    <div class="card pad" style="margin-top:14px;display:flex;gap:14px">${I.cloud}<div><b>Synchronisation téléphone ↔ ordinateur</b>
      <p class="mut" style="font-size:13px;margin:6px 0 0">Étape 2 du projet (compte Supabase gratuit). En attendant, tes données restent dans ce navigateur : sur iPhone, utilise toujours l'app installée sur l'écran d'accueil et exporte une sauvegarde chaque semaine.</p></div></div>
    ${del.length ? `<div class="sec-title"><h2 class="disp">Corbeille</h2></div><div class="card" style="padding:4px 16px">${del.map(w => `<div class="pr"><span>${esc(SES[w.session].nom)} · ${esc(fmtShort(w.date))}</span><button class="chip" data-act="restore" data-id="${w.id}">Restaurer</button></div>`).join("")}</div>` : ""}
    <div class="sec-title"><h2 class="disp">Zone sensible</h2></div>
    <button class="btn ghost block" data-act="wipe">${I.trash}Tout effacer de ce navigateur</button>
    <div class="credits">
      Version ${APP_VERSION}.<br>
      Photos : <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a> (dédiées au domaine public, licence Unlicense), converties en noir et blanc.<br>
      Planches anatomiques : tracés de <a href="https://github.com/HichamELBSI/react-native-body-highlighter" target="_blank" rel="noopener">react-native-body-highlighter</a> (licence MIT, © 2022 ELABBASSI Hicham), recolorés.<br>
      Les conseils ne remplacent pas l'avis d'un coach ou d'un professionnel de santé.
    </div>`;
}
function doExport() {
  const data = { app: "mon-programme-fitness", version: 5, exportedAt: new Date().toISOString(), workouts: DB.workouts, draft: DB.draft };
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
  for (const w of list) {
    if (!w || !w.id || !w.entries || !SES[w.session]) { skipped++; continue; }
    const i = DB.workouts.findIndex(x => x.id === w.id);
    if (i >= 0) { if ((w.updatedAt || "") > (DB.workouts[i].updatedAt || "")) { DB.workouts[i] = w; updated++; } else skipped++; }
    else if (fps.has(fingerprint(w))) skipped++;
    else { DB.workouts.push(w); fps.add(fingerprint(w)); added++; }
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
      if (Array.isArray(d.workouts)) res = mergeWorkouts(d.workouts);
      else if (Array.isArray(d.entries)) res = mergeWorkouts(fromV4(d));
      else throw new Error("format");
      saveNow(); render();
      toast(`Import : ${res.added} ajoutée(s), ${res.updated} mise(s) à jour, ${res.skipped} ignorée(s)`);
    } catch (e) { toast("Fichier non reconnu : choisis un export .json de l'application."); }
  };
  r.readAsText(file);
}

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
  if (a === "progres") return { name: "prog2", q: b };
  if (a === "reglages") return { name: "set" };
  return { name: "404" };
}
function vNotFound() { return `<div class="empty"><div class="disp">Introuvable</div><a class="btn sec" href="#/">Retour à l'accueil</a></div>`; }
let clockT;
function render() {
  const r = route(); closeSheet();
  const map = { home: vHome, prog: () => vProgramme(r.s), ex: () => vExercise(r.id), wk: vWorkout, hist: vHistory, hd: () => vHistDetail(r.id), edit: () => vEdit(r.id), prog2: () => vProgress(r.q), set: vSettings };
  view.innerHTML = (map[r.name] || vNotFound)();
  const navKey = r.name === "ex" ? "prog" : r.name === "hd" || r.name === "edit" ? "hist" : r.name;
  $("#nav").innerHTML = navHTML(navKey);
  if (r.name !== "edit" && DB.editBuf) { DB.editBuf = null; save(); }
  clearInterval(clockT);
  if (r.name === "wk" && DB.draft) { const tick = () => { const c = $("#clock"); if (!c) return; const m = Math.floor((Date.now() - new Date(DB.draft.startedAt)) / 60000); c.textContent = m < 60 ? m + " min" : Math.floor(m / 60) + " h " + pad2(m % 60); }; tick(); clockT = setInterval(tick, 20000); }
  const gal = $("#gal"); if (gal) gal.addEventListener("scroll", () => { const i = Math.round(gal.scrollLeft / gal.clientWidth); $$("#dots i").forEach((d, k) => d.classList.toggle("on", k === i)); }, { passive: true });
  const sel = $("#exsel"); if (sel) sel.onchange = () => { location.hash = "#/progres/" + sel.value; };
  const imp = $("#imp"); if (imp) imp.onchange = () => imp.files[0] && doImport(imp.files[0]);
  const ar = $("#autorest"); if (ar) ar.onchange = () => { DB.settings.autoRest = ar.checked; saveNow(); };
  if (!["wk", "edit"].includes(r.name)) window.scrollTo(0, 0);
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
      const row = el.closest(".srow"); const e = EXI[row.dataset.ex], i = +row.dataset.i; const prev = prevFor(e.id, w.id, w.date); const p = prev && prev.sets.filter(x => x.done)[i]; if (!p) break;
      const s = w.entries[e.id].sets[i]; s.kg = String(num(p.kg) || 0); s.reps = String(num(p.reps)); rowRefresh(row, e, s); touch(w); break;
    }
    case "addset": case "rmset": {
      const sec = el.closest(".wex"); const id = sec.id.slice(3); const e = EXI[id]; const sets = w.entries[id].sets;
      if (act === "addset") { const last = sets[sets.length - 1] || {}; sets.push({ kg: last.kg || "", reps: "", done: false }); }
      else if (sets.length > 1) { const last = sets[sets.length - 1]; if (last.done && !confirm("La dernière série est validée. La retirer ?")) break; sets.pop(); }
      touch(w); sec.outerHTML = exBlockHTML(e, w, route().name === "edit" ? "edit" : "draft"); progRefresh(w); break;
    }
    case "note": { const nt = $(".nt", el.closest(".wex")); nt.hidden = false; $("textarea", nt).focus(); break; }
    case "cardiock": { w.cardio = w.cardio || {}; w.cardio.done = !w.cardio.done; touch(w); $("#wx-cardio").outerHTML = cardioHTML(w); break; }
    case "finish": finishSheet(); break;
    case "checkall": {
      const w2 = DB.draft; let bad = 0;
      for (const id in w2.entries) for (const s of w2.entries[id].sets) if (!s.done && (s.kg !== "" || s.reps !== "")) { if (validSet(EXI[id], s)) bad++; else s.done = true; }
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
      x.deleted = true; x.updatedAt = new Date().toISOString(); saveNow(); location.hash = "#/historique";
      setTimeout(() => toast("Séance déplacée dans la corbeille", () => { x.deleted = false; x.updatedAt = new Date().toISOString(); saveNow(); render(); }), 50); break;
    }
    case "restore": { const x = DB.workouts.find(y => y.id === el.dataset.id); if (x) { x.deleted = false; x.updatedAt = new Date().toISOString(); saveNow(); render(); toast("Séance restaurée ✓"); } break; }
    case "export": doExport(); break;
    case "wipe": sheet(`<h2 class="disp">Tout effacer ?</h2><p>Cela supprime définitivement les ${DB.workouts.length} séance(s) de ce navigateur. Exporte une sauvegarde avant si tu as un doute.</p>
      <div class="btns"><button class="btn ghost" data-act="export">Exporter d'abord</button><button class="btn pri" data-act="wipe-ok">Effacer définitivement</button><button class="btn ghost" data-close>Annuler</button></div>`); break;
    case "wipe-ok": DB = blankDB(); saveNow(); closeSheet(); render(); toast("Données effacées."); break;
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
    if (s.done) { const err = validSet(EXI[row.dataset.ex], s); if (err) { s.done = false; rowRefresh(row, EXI[row.dataset.ex], s); progRefresh(w); } }
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

window.__mpf = { get db() { return DB; }, version: APP_VERSION };
render();
})();
