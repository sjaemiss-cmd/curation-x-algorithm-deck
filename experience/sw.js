// A content-derived revision makes updates atomic. New workers wait until old
// tabs close; never replace data/scripts halfway through an experiment.
const CACHE = 'curation-presentation-082a961dd133bc9a';
const FILES = ["index.html", "single.html", "classic.html", "stage.css", "style.css", "device-ui.css", "compare.css", "compare.mjs", "app.mjs", "active-engine.mjs", "engine.mjs", "twitter-engine.mjs", "translations.mjs", "phone-stage.bundle.js", "presentation-cache.js", "data/posts.json", "data/posts.ko.json", "data/source-defaults.json", "data/twitter-2023-defaults.json", "data/provenance.json"];
const ROOT = new URL('./', self.location.href);
const key = url => {
  const u = new URL(url);
  if (u.origin !== ROOT.origin || !u.pathname.startsWith(ROOT.pathname)) return null;
  const relative = u.pathname.slice(ROOT.pathname.length) || 'index.html';
  return FILES.includes(relative) ? new URL(relative, ROOT).href : null;
};
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(FILES.map(file => new Request(new URL(file, ROOT), {cache: 'reload'})));
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) {
    if (name.startsWith('curation-presentation-') && name !== CACHE) await caches.delete(name);
  }
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const canonical = event.request.method === 'GET' && key(event.request.url);
  if (!canonical) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(canonical) || fetch(event.request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_STATUS' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const entries = await Promise.all(FILES.map(file => cache.match(new URL(file, ROOT))));
    event.ports[0].postMessage({ready: entries.every(Boolean), revision: CACHE});
  })());
});
