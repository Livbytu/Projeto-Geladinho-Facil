/* ==========================================================
   vitrine.js - cardápio do cliente e pedido pelo WhatsApp
   ========================================================== */

const carrinho = {};
let CARDAPIO = null;

async function iniciarVitrine() {
  const lista = document.querySelector('#catalogo');
  try {
    CARDAPIO = await buscarCatalogo();
    preencherCabecalho();
    mostrarSabores();
    atualizarResumo();
  } catch (erro) {
    lista.innerHTML = `<p class="vazio">${esc(erro.message)} Abra o projeto com a extensão Live Server do VS Code ou publique no GitHub Pages.</p>`;
  }

  const campoData = document.querySelector('#data');
  campoData.min = hojeISO();
  try { document.querySelector('#nome').value = localStorage.getItem('gf-nome-cliente') || ''; } catch (e) { /* ignora */ }

  document.querySelector('#btn-pedir').addEventListener('click', enviarPedido);
  lista.addEventListener('click', alterarQuantidade);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function preencherCabecalho() {
  const { produtora, fidelidade, precosDeExemplo } = CARDAPIO;
  document.querySelectorAll('[data-nome-negocio]').forEach(el => { el.textContent = produtora.nome; });
  document.querySelector('#slogan').textContent = `${produtora.slogan} · ${produtora.cidade}`;
  document.querySelector('#regra-fidelidade').textContent =
    `Cada geladinho vale 1 estrela. Juntou ${fidelidade.estrelasParaBrinde}, ganhou ${fidelidade.brinde}. A produtora envia seu cartão pelo WhatsApp a cada entrega.`;
  document.querySelector('#aviso-exemplo').hidden = !precosDeExemplo;
}

function precoTexto(sabor) {
  return sabor.preco != null ? moeda(sabor.preco) : 'Consultar valor';
}

function mostrarSabores() {
  const lista = document.querySelector('#catalogo');
  lista.innerHTML = CARDAPIO.sabores.map(sabor => `
    <article class="card-sabor" style="--cor-sabor:${sabor.cor}">
      <div class="card-sabor-imagem">${svgGeladinho(sabor.cor, 96)}</div>
      <div class="card-sabor-corpo">
        <h3>${esc(sabor.nome)}</h3>
        <p class="suave">${esc(sabor.descricao)}</p>
        <div class="card-sabor-rodape">
          <strong class="preco">${precoTexto(sabor)}</strong>
          <div class="stepper" role="group" aria-label="Quantidade de ${esc(sabor.nome)}">
            <button type="button" data-acao="menos" data-id="${sabor.id}" aria-label="Tirar um ${esc(sabor.nome)}">−</button>
            <output id="qtd-${sabor.id}" aria-live="polite">0</output>
            <button type="button" data-acao="mais" data-id="${sabor.id}" aria-label="Adicionar um ${esc(sabor.nome)}">+</button>
          </div>
        </div>
      </div>
    </article>`).join('');
}

function alterarQuantidade(evento) {
  const botao = evento.target.closest('button[data-acao]');
  if (!botao) return;
  const id = botao.dataset.id;
  const atual = carrinho[id] || 0;
  carrinho[id] = botao.dataset.acao === 'mais' ? Math.min(99, atual + 1) : Math.max(0, atual - 1);
  document.querySelector(`#qtd-${id}`).textContent = carrinho[id];
  botao.closest('.card-sabor').classList.toggle('selecionado', carrinho[id] > 0);
  atualizarResumo();
}

function itensDoCarrinho() {
  return CARDAPIO.sabores
    .filter(s => carrinho[s.id] > 0)
    .map(s => ({ sabor: s, qtd: carrinho[s.id], subtotal: s.preco != null ? s.preco * carrinho[s.id] : null }));
}

function atualizarResumo() {
  const itens = itensDoCarrinho();
  const unidades = itens.reduce((s, i) => s + i.qtd, 0);
  const temValorACombinar = itens.some(i => i.subtotal == null);
  const total = itens.reduce((s, i) => s + (i.subtotal || 0), 0);

  document.querySelector('#qtd-total').textContent = `${unidades} geladinho${unidades === 1 ? '' : 's'}`;
  document.querySelector('#valor-total').textContent = temValorACombinar ? `${moeda(total)} + a combinar` : moeda(total);
  document.querySelector('#btn-pedir').disabled = unidades === 0;
  document.querySelector('#barra').classList.toggle('ativa', unidades > 0);
  document.querySelector('#resumo').innerHTML = itens.length
    ? `<ul class="lista-simples">${itens.map(i => `<li><span>${i.qtd} × ${esc(i.sabor.nome)}</span><span>${i.subtotal != null ? moeda(i.subtotal) : 'a combinar'}</span></li>`).join('')}</ul>`
    : '<p class="suave">Escolha os sabores no cardápio acima.</p>';
}

function enviarPedido() {
  const aviso = document.querySelector('#aviso');
  const nome = document.querySelector('#nome').value.trim();
  const recebimento = document.querySelector('#entrega').value;
  const data = document.querySelector('#data').value;
  const obs = document.querySelector('#obs').value.trim();
  const itens = itensDoCarrinho();

  if (itens.length === 0) {
    aviso.textContent = 'Escolha pelo menos um sabor.';
    return;
  }
  if (!nome) {
    aviso.textContent = 'Informe seu nome para a produtora saber de quem é o pedido.';
    document.querySelector('#seu-pedido').scrollIntoView({ behavior: 'smooth' });
    document.querySelector('#nome').focus();
    return;
  }
  if (data && data < hojeISO()) {
    aviso.textContent = 'Escolha uma data a partir de hoje.';
    return;
  }
  aviso.textContent = '';
  try { localStorage.setItem('gf-nome-cliente', nome); } catch (e) { /* ignora */ }

  const unidades = itens.reduce((s, i) => s + i.qtd, 0);
  const total = itens.reduce((s, i) => s + (i.subtotal || 0), 0);
  const linhas = itens.map(i => `• ${i.qtd} × ${i.sabor.nome}${i.subtotal != null ? ` (${moeda(i.subtotal)})` : ''}`).join('\n');
  const texto =
    `Olá! Quero fazer um pedido no ${CARDAPIO.produtora.nome}:\n\n${linhas}\n\n` +
    `Total: ${moeda(total)} (${unidades} geladinho${unidades === 1 ? '' : 's'})\n` +
    `Nome: ${nome}\nRecebimento: ${recebimento}` +
    (data ? `\nPara: ${dataBR(data)}` : '') +
    (obs ? `\nObservação: ${obs}` : '');

  abrirWhatsApp(CARDAPIO.produtora.whatsapp, texto);
}

iniciarVitrine();
