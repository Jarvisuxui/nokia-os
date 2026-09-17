const CACHE='nokia-os-v06';
const STATIC=['./manifest.webmanifest','./icon-180.png','./icon-512.png','./v6.js'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(req.mode==='navigate' || url.pathname.endsWith('/index.html')){
    event.respondWith((async()=>{
      try{
        const resp=await fetch(req,{cache:'no-store'});
        const type=resp.headers.get('content-type')||'';
        if(!type.includes('text/html')) return resp;
        let html=await resp.text();
        if(!html.includes('v6.js')) html=html.replace('</body>','<script src="./v6.js?v=6"></script></body>');
        return new Response(html,{status:resp.status,statusText:resp.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
      }catch(e){
        return caches.match('./index.html');
      }
    })());
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(resp=>{
    const copy=resp.clone();
    caches.open(CACHE).then(cache=>cache.put(req,copy));
    return resp;
  })));
});
