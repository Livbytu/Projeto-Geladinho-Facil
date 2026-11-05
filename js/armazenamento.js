/* ==========================================================
   armazenamento.js - dados do painel guardados no aparelho
   (localStorage). Os dados ficam só neste navegador.
   ========================================================== */

const CHAVES = {
  pedidos: 'gf-pedidos',
  despesas: 'gf-despesas',
  config: 'gf-config',
  precosIngredientes: 'gf-precos-ingredientes',
  precosVenda: 'gf-precos-venda',
  resgates: 'gf-resgates',
  extras: 'gf-extras-producao',
  demo: 'gf-dados-demo'
};

const CONFIG_PADRAO = {
  nomeNegocio: 'Geladinho Fácil',
  whatsapp: '',
  estrelasParaBrinde: 5,
  brinde: '1 geladinho grátis',
  margem: 0.4,
  embalagem: 0.05,
  unidadesMes: 440
};

// Catálogo carregado do JSON (preenchido pelo painel.js)
let CATALOGO = null;

function ler(chave, padrao) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : padrao;
  } catch (erro) {
    return padrao;
  }
}

function salvar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch (erro) {
    avisar('Não foi possível salvar neste navegador.', 'erro');
  }
}

function lerConfig() { return { ...CONFIG_PADRAO, ...ler(CHAVES.config, {}) }; }
function salvarConfig(config) { salvar(CHAVES.config, config); }

function lerPedidos() { return ler(CHAVES.pedidos, []); }
function salvarPedidos(pedidos) { salvar(CHAVES.pedidos, pedidos); }

function lerDespesas() { return ler(CHAVES.despesas, []); }
function salvarDespesas(despesas) { salvar(CHAVES.despesas, despesas); }

function lerPrecosIngredientes() { return ler(CHAVES.precosIngredientes, {}); }

// Preço de venda: o definido na Precificação ou, se não houver, o do catálogo
function precoDoSabor(saborId) {
  const definidos = ler(CHAVES.precosVenda, {});
  if (definidos[saborId] != null) return Number(definidos[saborId]);
  const sabor = CATALOGO.sabores.find(s => s.id === saborId);
  return sabor && sabor.preco != null ? Number(sabor.preco) : 0;
}

function nomeDoSabor(saborId) {
  const sabor = CATALOGO.sabores.find(s => s.id === saborId);
  return sabor ? sabor.nome : saborId;
}

function totalDoPedido(pedido) {
  return pedido.quantidade * pedido.precoUnitario - (pedido.desconto || 0);
}
