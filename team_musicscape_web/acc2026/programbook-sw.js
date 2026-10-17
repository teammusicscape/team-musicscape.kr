/* Offline cache for the online programbook (/acc2026/programbook).
   Lives one level up so its scope can cover the slash-less page URL.
   Bump VERSION whenever page images or the page itself change. */
var VERSION = 'programbook-v3';
var BASE = '/acc2026/programbook/';
var PAGE = '/acc2026/programbook';

var ASSETS = [PAGE, BASE + 'page-flip.browser.js'];
for (var i = 1; i <= 8; i++) {
  ASSETS.push(BASE + 'pages/p' + i + '.webp');
  ASSETS.push(BASE + 'pages/p' + i + '-s.webp');
}
ASSETS.push(BASE + 'pages/p23.webp', BASE + 'pages/p23-s.webp');   // pages 2–3 joined (portrait view)

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf('programbook-') === 0 && k !== VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isPage(url) {
  return url.pathname === PAGE || url.pathname === BASE || url.pathname === BASE + 'index.html';
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // The page itself: try the network (to pick up updates), fall back to cache offline.
  if (req.mode === 'navigate' && isPage(url)) {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(PAGE, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(PAGE);
      })
    );
    return;
  }

  // Page images and script: cache first.
  if (url.pathname.indexOf(BASE) === 0) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res.ok && url.pathname.slice(-4) !== '.pdf') {
            var copy = res.clone();
            caches.open(VERSION).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      })
    );
  }
});
