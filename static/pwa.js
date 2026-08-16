// Registered from the root path (not /static/sw.js) so its default scope
// covers the whole app, not just the static folder — a service worker can
// only control pages at or below its own path unless the server sends a
// Service-Worker-Allowed header, so serving it from / avoids needing that.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
