// Minimal service worker: only exists to make the site installable as an
// app (Chrome/Edge require one to show the install prompt). It caches
// static assets so the app shell loads instantly on repeat visits, but
// deliberately does NOT cache pages or API responses (/chat, /me, /history,
// etc.) — those carry live, per-user data and must always come from the
// network, otherwise a student could see stale or another session's state.

const CACHE_NAME = "rsu-assist-static-v1";
const STATIC_EXTENSIONS = [".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".ico"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/static/") && STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !isStaticAsset(url)) {
    return; // let the browser handle everything else normally
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
  );
});
