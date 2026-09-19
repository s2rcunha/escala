const CACHE_NAME = 'escala-cci-v1';

const ARQUIVOS_CACHE = [
  './',
  './Index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ======================================================
// INSTALAÇÃO
// Cacheia apenas os arquivos locais essenciais da PWA.
// ======================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARQUIVOS_CACHE))
  );

  self.skipWaiting();
});

// ======================================================
// ATIVAÇÃO
// Remove caches antigos quando houver nova versão.
// ======================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nomesCaches => {
      return Promise.all(
        nomesCaches
          .filter(nome => nome !== CACHE_NAME)
          .map(nome => caches.delete(nome))
      );
    })
  );

  self.clients.claim();
});

// ======================================================
// FETCH
// Não interfere com APIs externas, principalmente
// Google Apps Script.
// ======================================================
self.addEventListener('fetch', event => {
  const requisicao = event.request;
  const url = new URL(requisicao.url);

  // Nunca intercepta POST ou outros métodos.
  if (requisicao.method !== 'GET') {
    return;
  }

  // Não intercepta requisições externas.
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(requisicao)
      .then(resposta => {
        // Atualiza o cache somente com respostas válidas.
        if (resposta && resposta.status === 200) {
          const copia = resposta.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(requisicao, copia));
        }

        return resposta;
      })
      .catch(() => {
        return caches.match(requisicao)
          .then(respostaCache => {
            return respostaCache || caches.match('./Index.html');
          });
      })
  );
});