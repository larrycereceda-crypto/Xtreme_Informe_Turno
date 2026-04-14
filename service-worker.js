const CACHE_NAME = "xm-informe-v24-pwa";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./config.js",
  "./data_maestros.json",
  "./manifest.webmanifest",
  "./logo.jpg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.hostname.includes("script.google.com") || url.hostname.includes("googleapis.com")) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ ok: false, error: "offline" }), { headers: { "Content-Type": "application/json" } }))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached || (request.mode === "navigate" ? caches.match("./index.html") : undefined));

      return cached || networkFetch;
    })
  );
});
