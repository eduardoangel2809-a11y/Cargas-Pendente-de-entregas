// ══════════════════════════════════════════════════════════════
//  Service Worker — Angel 2809 Projetos Logísticos
//  Estratégia:
//   - HTML (navegação): network-first, cai para cache quando offline
//     (evita servir uma versão antiga do app quando há internet)
//   - Ícones/manifest (mesma origem): cache-first
//   - Recursos externos (CDN, Firebase, fontes): sempre rede, sem cache
//    (evita travar o app com libs antigas em cache)
//
//  Ao publicar uma nova versão do app, incremente CACHE_VERSION para
//  forçar a limpeza do cache antigo nos dispositivos dos usuários.
// ══════════════════════════════════════════════════════════════

const CACHE_VERSION = "v1";
const CACHE_NAME = `angel2809-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn("SW: falha ao pré-cachear shell", err))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("angel2809-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Navegação (HTML) → network-first, fallback para cache (offline)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", clone));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Recursos da própria origem (ícones, manifest) → cache-first
  if (isSameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        });
      })
    );
    return;
  }

  // Recursos externos (CDN, Firebase, fontes) → direto na rede, sem cache
  // (não intercepta — deixa o navegador tratar normalmente)
});
