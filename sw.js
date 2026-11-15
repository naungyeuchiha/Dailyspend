/* Daily Spend service worker: offline app shell + runtime caching */
const V="daily-spend-v2";
const SHELL=["./","index.html","css/styles.css","js/config.js","js/core.js","js/sheets.js","js/app.js","manifest.webmanifest","favicon.svg","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];
const CDN=["cdn.jsdelivr.net","fonts.googleapis.com","fonts.gstatic.com"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=="GET")return;
  const own=u.origin===location.origin;
  if(!own&&!CDN.includes(u.hostname))return;           // Google APIs/sign-in always go to the network
  if(own){                                              // network first so updates arrive, cache as fallback
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(ch=>ch.put(r,c));return res})
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==="navigate"?caches.match("index.html"):undefined))));
  }else{                                                // CDN: stale-while-revalidate
    e.respondWith(caches.open(V).then(ch=>ch.match(r).then(m=>{
      const f=fetch(r).then(res=>{if(res.ok||res.type==="opaque")ch.put(r,res.clone());return res}).catch(()=>m);
      return m||f})));
  }
});
