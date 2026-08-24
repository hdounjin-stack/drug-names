/* PharmaCore offline cache — cache-first with background refresh.
   After the first successful online visit, the whole app (HTML, icons,
   fonts) is stored locally and works with zero internet connection.
   Your added drugs/chapters/tables live separately in localStorage
   and are untouched by this file. */
const CACHE = 'pharmacore-shell-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.allSettled(SHELL.map(u=>c.add(u))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // App shell (HTML) = network-first: always try the freshest copy when online,
  // so updates you publish are picked up instead of a stale cached version.
  const isShell = url.origin===location.origin &&
    (url.pathname==='/' || url.pathname.endsWith('/index.html'));
  if(isShell){
    e.respondWith(
      fetch(e.request).then(res=>{
        if(res && res.ok){
          const copy=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request, copy));
        }
        return res;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }
  // everything else (icons, fonts) = cache-first with background refresh
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const network = fetch(e.request).then(res=>{
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c=>c.put(e.request, copy));
        }
        return res;
      }).catch(()=>cached);
      return cached || network;
    })
  );
});
