/* Lapsight service worker (offline support). Built by the swPlugin in vite.config.ts, which fills in
 * __VERSION__ and __PRECACHE__ (every built file); do not edit dist/sw.js by hand.
 *
 * - Install: download every file of this version into a cache named after the version.
 * - Page loads: network first (so a new deploy shows up), the cached page when offline.
 * - Built files (hashed names never change): cache first.
 * - Other files of the site: cached copy at once, refreshed in the background.
 * - Other websites (map tiles from OpenFreeMap): not touched; the browser's own cache applies.
 * - A new version waits until the page says "skip waiting" (the user tapped Reload), so a page is
 *   never switched to new code halfway through.
 */
const VERSION = "535dad5a9d75";
const PRECACHE = ["./","assets/index-LmOkx1zr.js","assets/MiniMap-DiNgDRse.js","assets/RouteMap-DgiLe00U.js","assets/mapMarkers-Dnos7NzU.js","assets/maplibre-gl-BJqcOGhp.js","assets/maplibre-gl-worker-CjXlFWZs.js","assets/index-DP_WsRsP.css","assets/mapMarkers-qvkd0SPb.css","assets/maplibre-gl-worker-Boc9pDRP.mjs","favicon.ico","favicon.svg","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-192.png","icons/icon-maskable-512.png","icons/icon-monochrome-512.png","icons/mark-dark.svg","icons/mark-light.svg","manifest.webmanifest","preview/feature-dark.jpg","preview/feature-light.jpg","preview/map-dark.jpg","preview/map-light.jpg","sample/lapsight-sample-run.fit"];
const CACHE = `lapsight-${VERSION}`;
const scope = self.registration.scope;
const url = (p) => new URL(p, scope).href;
// Servers send headers like "Vary: Origin"; the page's script requests carry an Origin the install didn't, so match by
// address alone or Chrome finds nothing in the cache when offline.
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.map(url))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('lapsight-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(scope)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(url('./'), copy));
          return res;
        })
        .catch(() => caches.match(url('./'), MATCH).then((r) => r || caches.match(url('index.html'), MATCH))),
    );
    return;
  }

  if (req.url.includes('/assets/')) {
    event.respondWith(caches.match(req, MATCH).then((hit) => hit || fetch(req)));
    return;
  }

  event.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(req, MATCH).then((hit) => {
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fresh;
      }),
    ),
  );
});
