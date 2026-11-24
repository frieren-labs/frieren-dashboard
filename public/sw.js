// No-op service worker: frieren-dashboard registers no SW. This file exists
// so stale registrations from other local projects on the same port resolve
// with 200 and remove themselves instead of 404-spamming the server log.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.claim())
      .catch(() => undefined),
  );
});
