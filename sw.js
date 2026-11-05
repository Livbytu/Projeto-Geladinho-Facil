/* Service worker: guarda os arquivos do app para abrir mais rápido
   e funcionar com internet fraca. O catálogo sempre tenta a versão nova. */
const CACHE = 'geladinho-v1';
const ARQUIVOS = [
  'index.html', 'painel.html', 'css/style.css',
  'js/util.js', 'js/api.js', 'js/armazenamento.js', 'js/pedidos.js', 'js/fidelidade.js',
  'js/producao.js', 'js/precificacao.js', 'js/financeiro.js', 'js/relatorios.js',
  'js/painel.js', 'js/vitrine.js', 'img/icone-192.png', 'img/icone-512.png', 'manifest.json'
];

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ARQUIVOS)));
});

self.addEventListener('activate', evento => {
  evento.waitUntil(caches.keys().then(nomes =>
    Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n)))));
});

// Rede primeiro: a versão nova publicada aparece logo; sem internet, usa a cópia guardada
self.addEventListener('fetch', evento => {
  if (evento.request.method !== 'GET' || !evento.request.url.startsWith(self.location.origin)) return;
  evento.respondWith(
    fetch(evento.request)
      .then(resposta => {
        const copia = resposta.clone();
        caches.open(CACHE).then(cache => cache.put(evento.request, copia));
        return resposta;
      })
      .catch(() => caches.match(evento.request))
  );
});
