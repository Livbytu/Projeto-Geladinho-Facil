/* ==========================================================
   api.js - "API" simulada: lê o catálogo de um arquivo JSON
   Na UC11 (back-end) esta função passa a chamar um servidor real.
   ========================================================== */

async function buscarCatalogo() {
  const resposta = await fetch('data/catalogo.json', { cache: 'no-store' });
  if (!resposta.ok) {
    throw new Error('Não foi possível carregar o cardápio.');
  }
  return resposta.json();
}
