/* Service worker : rend l'app disponible hors connexion (après une première visite en ligne).
   IMPORTANT : à chaque mise à jour du code, change VERSION ci-dessous. Tes données ne sont pas touchées. */
const VERSION = "mpf-7.0.1";
const SHELL = [
  "./",
  "index.html",
  "app.css?v=7.0.1",
  "app.js?v=7.0.1",
  "config.js?v=7.0.1",
  "data.js?v=7.0.1",
  "vendor/supabase-2.117.2.js",
  "library.json?v=7.0.1",
  "ciqual.json?v=7.0.1",
  "anatomy-data.js?v=7.0.1",
  "manifest.webmanifest",
  "fonts/archivo.woff2",
  "icons/icon-192.png",
  "icons/apple-touch-icon.png",
  "img/ex/crunch-machine-0.jpg",
  "img/ex/crunch-machine-1.jpg",
  "img/ex/curl-halteres-0.jpg",
  "img/ex/curl-halteres-1.jpg",
  "img/ex/curl-marteau-0.jpg",
  "img/ex/curl-marteau-1.jpg",
  "img/ex/dc-halteres-0.jpg",
  "img/ex/dc-halteres-1.jpg",
  "img/ex/dev-epaules-machine-0.jpg",
  "img/ex/dev-epaules-machine-1.jpg",
  "img/ex/dev-incline-machine-0.jpg",
  "img/ex/dev-incline-machine-1.jpg",
  "img/ex/dips-assistes-0.jpg",
  "img/ex/dips-assistes-1.jpg",
  "img/ex/elevations-laterales-0.jpg",
  "img/ex/elevations-laterales-1.jpg",
  "img/ex/leg-curl-assis-0.jpg",
  "img/ex/leg-curl-assis-1.jpg",
  "img/ex/leg-extension-0.jpg",
  "img/ex/leg-extension-1.jpg",
  "img/ex/low-row-0.jpg",
  "img/ex/low-row-1.jpg",
  "img/ex/mollets-machine-0.jpg",
  "img/ex/mollets-machine-1.jpg",
  "img/ex/pec-deck-0.jpg",
  "img/ex/pec-deck-1.jpg",
  "img/ex/planche-0.jpg",
  "img/ex/planche-1.jpg",
  "img/ex/presse-0.jpg",
  "img/ex/presse-1.jpg",
  "img/ex/tirage-neutre-0.jpg",
  "img/ex/tirage-neutre-1.jpg",
  "img/ex/tirage-vertical-0.jpg",
  "img/ex/tirage-vertical-1.jpg",
  "img/ex/triceps-corde-0.jpg",
  "img/ex/triceps-corde-1.jpg"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== "mpf-fonts" && k !== "mpf-img").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(caches.open("mpf-fonts").then(c => c.match(req).then(hit => hit || fetch(req).then(r => { c.put(req, r.clone()); return r; }))));
    return;
  }
  if (url.host === "raw.githubusercontent.com" && url.pathname.startsWith("/yuhonas/free-exercise-db/")) {
    // photos de la bibliothèque : gardées après la 1re vue (utilisables hors connexion)
    e.respondWith(caches.open("mpf-img").then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }))));
    return;
  }
  if (url.origin !== location.origin) return; // API GitHub / Supabase : jamais mis en cache
  if (url.pathname.endsWith("config.js")) { e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req, { ignoreSearch: true }))); return; }
  if (req.mode === "navigate") {
    // « no-cache » : on redemande toujours la page au serveur (sinon le cache de GitHub peut servir l'ancienne version ~10 min)
    e.respondWith(fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put("./", cp)); return r; }).catch(() => caches.match("./")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return r; })));
});
