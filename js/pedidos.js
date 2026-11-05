/* ==========================================================
   pedidos.js - módulo Pedidos
   Registro, status e mensagens prontas para o WhatsApp
   ========================================================== */

const STATUS = {
  novo: 'Novo',
  producao: 'Em produção',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

const PROXIMO_STATUS = { novo: 'producao', producao: 'entregue' };

let filtroPedidos = 'abertos';
let formPedidoAberto = false;

function mensagemPedido(tipo, pedido) {
  const cfg = lerConfig();
  const sabor = nomeDoSabor(pedido.saborId);
  const itens = `${pedido.quantidade} geladinho${pedido.quantidade > 1 ? 's' : ''} de ${sabor}`;
  const textos = {
    confirmar: `Olá, ${pedido.cliente}! Seu pedido de ${itens} está confirmado para ${dataBR(pedido.data)}. Total: ${moeda(totalDoPedido(pedido))}. Obrigada pela preferência! ${cfg.nomeNegocio}`,
    entrega: `Olá, ${pedido.cliente}! Seu pedido de ${itens} saiu para entrega.`,
    pronto: `Olá, ${pedido.cliente}! Seu pedido de ${itens} está pronto para retirada.`,
    cobrar: `Olá, ${pedido.cliente}! Passando para lembrar o pagamento do pedido de ${dataBR(pedido.data)} (${itens}): ${moeda(totalDoPedido(pedido))}. Obrigada!`
  };
  return textos[tipo];
}

function clientesConhecidos() {
  const mapa = {};
  lerPedidos().forEach(p => { mapa[p.cliente] = p.telefone; });
  return mapa;
}

function renderPedidos(el) {
  const pedidos = lerPedidos();
  const conhecidos = clientesConhecidos();
  const opcoesSabor = CATALOGO.sabores
    .map(s => `<option value="${s.id}">${esc(s.nome)} (${moeda(precoDoSabor(s.id))})</option>`).join('');

  const filtros = {
    abertos: p => p.status === 'novo' || p.status === 'producao',
    entregue: p => p.status === 'entregue',
    cancelado: p => p.status === 'cancelado',
    todos: () => true
  };
  const lista = pedidos.filter(filtros[filtroPedidos])
    .sort((a, b) => filtroPedidos === 'abertos' ? a.data.localeCompare(b.data) : b.data.localeCompare(a.data))
    .slice(0, 60);

  el.innerHTML = `
  <div class="tela">
    <details class="cartao novo-pedido" id="caixa-novo-pedido" ${formPedidoAberto || pedidos.length === 0 ? 'open' : ''}>
      <summary><h2>+ Novo pedido</h2></summary>
      <form id="form-pedido" class="form-grade" novalidate>
        <label>Cliente
          <input name="cliente" list="lista-clientes" required autocomplete="off" placeholder="Nome do cliente">
        </label>
        <datalist id="lista-clientes">
          ${Object.keys(conhecidos).map(n => `<option value="${esc(n)}">`).join('')}
        </datalist>
        <label>WhatsApp
          <input name="telefone" type="tel" inputmode="tel" required placeholder="(66) 99999-9999">
        </label>
        <label>Sabor
          <select name="saborId">${opcoesSabor}</select>
        </label>
        <label>Quantidade
          <input name="quantidade" type="number" min="1" step="1" value="1" required>
        </label>
        <label>Preço unitário (R$)
          <input name="precoUnitario" type="number" min="0" step="0.05" required>
        </label>
        <label>Desconto (R$)
          <input name="desconto" type="number" min="0" step="0.05" value="0">
        </label>
        <label>Data de entrega
          <input name="data" type="date" value="${hojeISO()}" required>
        </label>
        <label class="largura-total">Observação
          <input name="obs" placeholder="Ex.: entregar na escola">
        </label>
        <p class="total-previo largura-total" id="total-previo"></p>
        <p class="erro-form largura-total" id="erro-pedido" role="alert"></p>
        <button class="btn btn-primario largura-total" type="submit">Registrar pedido</button>
      </form>
    </details>

    <section>
      <div class="abas" role="tablist" aria-label="Filtrar pedidos">
        ${[['abertos', 'Em aberto'], ['entregue', 'Entregues'], ['cancelado', 'Cancelados'], ['todos', 'Todos']]
          .map(([id, nome]) => `<button role="tab" class="aba ${filtroPedidos === id ? 'ativa' : ''}" aria-selected="${filtroPedidos === id}" data-filtro="${id}">${nome} <span>${pedidos.filter(filtros[id]).length}</span></button>`).join('')}
      </div>
      <div class="lista-pedidos">
        ${lista.length ? lista.map(cartaoPedido).join('') : '<p class="vazio">Nenhum pedido aqui.</p>'}
      </div>
    </section>
  </div>`;

  const tela = el.firstElementChild;
  const form = tela.querySelector('#form-pedido');
  tela.querySelector('#caixa-novo-pedido').addEventListener('toggle', e => { formPedidoAberto = e.target.open; });

  function atualizarPreco() {
    form.precoUnitario.value = precoDoSabor(form.saborId.value).toFixed(2);
    atualizarTotal();
  }
  function atualizarTotal() {
    const total = Number(form.quantidade.value) * Number(form.precoUnitario.value) - Number(form.desconto.value || 0);
    tela.querySelector('#total-previo').textContent = `Total do pedido: ${moeda(total)}`;
  }
  atualizarPreco();

  form.saborId.addEventListener('change', atualizarPreco);
  form.quantidade.addEventListener('input', atualizarTotal);
  form.precoUnitario.addEventListener('input', atualizarTotal);
  form.desconto.addEventListener('input', atualizarTotal);
  form.cliente.addEventListener('change', () => {
    const tel = conhecidos[form.cliente.value];
    if (tel && !form.telefone.value) form.telefone.value = tel;
  });

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    const erro = tela.querySelector('#erro-pedido');
    const dados = Object.fromEntries(new FormData(form));
    const quantidade = Number(dados.quantidade);

    if (!dados.cliente.trim()) return (erro.textContent = 'Informe o nome do cliente.');
    if (soDigitos(dados.telefone).length < 10) return (erro.textContent = 'Informe o WhatsApp com DDD.');
    if (!Number.isInteger(quantidade) || quantidade < 1) return (erro.textContent = 'A quantidade deve ser um número inteiro maior que zero.');
    if (!dados.data) return (erro.textContent = 'Informe a data de entrega.');

    const todos = lerPedidos();
    todos.push({
      id: novoId(),
      cliente: dados.cliente.trim(),
      telefone: soDigitos(dados.telefone),
      saborId: dados.saborId,
      quantidade,
      precoUnitario: Number(dados.precoUnitario),
      desconto: Number(dados.desconto || 0),
      data: dados.data,
      obs: dados.obs.trim(),
      status: 'novo'
    });
    salvarPedidos(todos);
    filtroPedidos = 'abertos';
    avisar('Pedido registrado.');
    renderPedidos(el);
  });

  tela.addEventListener('click', async evento => {
    const botao = evento.target.closest('button');
    if (!botao) return;
    if (botao.dataset.filtro) {
      filtroPedidos = botao.dataset.filtro;
      return renderPedidos(el);
    }
    const id = botao.dataset.id;
    if (!id) return;
    const todos = lerPedidos();
    const pedido = todos.find(p => p.id === id);
    if (!pedido) return;

    switch (botao.dataset.acao) {
      case 'avancar':
        pedido.status = PROXIMO_STATUS[pedido.status] || pedido.status;
        salvarPedidos(todos);
        avisar(pedido.status === 'entregue'
          ? `Entregue! ${pedido.cliente} ganhou ${pedido.quantidade} estrela(s).`
          : `Pedido em produção.`);
        break;
      case 'cancelar':
        if (!(await confirmar(`Cancelar o pedido de ${pedido.cliente}?`, 'Cancelar pedido'))) return;
        pedido.status = 'cancelado';
        salvarPedidos(todos);
        avisar('Pedido cancelado.', 'alerta');
        break;
      case 'excluir':
        if (!(await confirmar(`Excluir definitivamente o pedido de ${pedido.cliente}?`, 'Excluir'))) return;
        salvarPedidos(todos.filter(p => p.id !== id));
        avisar('Pedido excluído.', 'alerta');
        break;
      case 'whats':
        abrirWhatsApp(pedido.telefone, mensagemPedido(botao.dataset.tipo, pedido));
        return;
      default:
        return;
    }
    renderPedidos(el);
  });
}

function cartaoPedido(p) {
  const aberto = p.status === 'novo' || p.status === 'producao';
  const sabor = CATALOGO.sabores.find(s => s.id === p.saborId);
  return `
  <article class="pedido">
    <div class="pedido-icone">${svgGeladinho(sabor ? sabor.cor : '#ccc', 44)}</div>
    <div class="pedido-info">
      <div class="pedido-linha">
        <strong>${esc(p.cliente)}</strong>
        <span class="badge badge-${p.status}">${STATUS[p.status]}</span>
      </div>
      <p>${p.quantidade} × ${esc(nomeDoSabor(p.saborId))} · ${moeda(totalDoPedido(p))} · ${dataBR(p.data)}</p>
      ${p.obs ? `<p class="suave">${esc(p.obs)}</p>` : ''}
      <div class="pedido-acoes">
        ${aberto ? `<button class="btn btn-pequeno btn-primario" data-acao="avancar" data-id="${p.id}">${p.status === 'novo' ? 'Iniciar produção' : 'Marcar entregue'}</button>` : ''}
        ${p.status === 'novo' ? `<button class="btn btn-pequeno btn-whats" data-acao="whats" data-tipo="confirmar" data-id="${p.id}">Confirmar</button>` : ''}
        ${p.status === 'producao' ? `<button class="btn btn-pequeno btn-whats" data-acao="whats" data-tipo="entrega" data-id="${p.id}">Saiu para entrega</button>
        <button class="btn btn-pequeno btn-whats" data-acao="whats" data-tipo="pronto" data-id="${p.id}">Pronto p/ retirar</button>` : ''}
        ${p.status === 'entregue' ? `<button class="btn btn-pequeno btn-whats" data-acao="whats" data-tipo="cobrar" data-id="${p.id}">Lembrar pagamento</button>` : ''}
        ${aberto ? `<button class="btn btn-pequeno btn-secundario" data-acao="cancelar" data-id="${p.id}">Cancelar</button>` : ''}
        ${!aberto ? `<button class="btn btn-pequeno btn-texto" data-acao="excluir" data-id="${p.id}">Excluir</button>` : ''}
      </div>
    </div>
  </article>`;
}
