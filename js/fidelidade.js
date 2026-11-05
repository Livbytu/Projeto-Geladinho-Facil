/* ==========================================================
   fidelidade.js - módulo Fidelidade
   1 estrela por geladinho entregue. A cada N estrelas, 1 brinde.
   As estrelas são calculadas a partir dos pedidos entregues,
   então nunca ficam diferentes do histórico.
   ========================================================== */

let buscaFidelidade = '';

function resumoClientes() {
  const cfg = lerConfig();
  const resgates = ler(CHAVES.resgates, {});
  const clientes = {};

  lerPedidos().forEach(p => {
    const c = clientes[p.telefone] || (clientes[p.telefone] = {
      nome: p.cliente, telefone: p.telefone, estrelas: 0, pedidos: 0, ultimo: ''
    });
    c.nome = p.cliente;
    if (p.status === 'entregue') {
      c.estrelas += p.quantidade;
      c.pedidos += 1;
      if (p.data > c.ultimo) c.ultimo = p.data;
    }
  });

  return Object.values(clientes).map(c => {
    const ganhos = Math.floor(c.estrelas / cfg.estrelasParaBrinde);
    const resgatados = resgates[c.telefone] || 0;
    return {
      ...c,
      ganhos,
      resgatados,
      disponiveis: Math.max(0, ganhos - resgatados),
      noCartao: c.estrelas % cfg.estrelasParaBrinde
    };
  }).sort((a, b) => b.estrelas - a.estrelas);
}

function desenharEstrelas(quantidade, total) {
  let html = '';
  for (let i = 0; i < total; i++) {
    html += `<span class="estrela ${i < quantidade ? 'cheia' : ''}" aria-hidden="true">★</span>`;
  }
  return `<span class="estrelas" role="img" aria-label="${quantidade} de ${total} estrelas">${html}</span>`;
}

function mensagemCartao(cliente) {
  const cfg = lerConfig();
  const visual = '★'.repeat(cliente.noCartao) + '☆'.repeat(cfg.estrelasParaBrinde - cliente.noCartao);
  let texto = `Olá, ${cliente.nome}! Seu cartão fidelidade ${cfg.nomeNegocio}: ${visual} (${cliente.noCartao} de ${cfg.estrelasParaBrinde}).`;
  if (cliente.disponiveis > 0) texto += ` Você tem ${cliente.disponiveis} brinde(s) para retirar: ${cfg.brinde}!`;
  else texto += ` Faltam ${cfg.estrelasParaBrinde - cliente.noCartao} para ganhar ${cfg.brinde}.`;
  return texto;
}

function renderFidelidade(el) {
  const cfg = lerConfig();
  const todos = resumoClientes();
  const termo = buscaFidelidade.toLowerCase();
  const clientes = todos.filter(c => c.nome.toLowerCase().includes(termo));
  const comBrinde = todos.filter(c => c.disponiveis > 0).length;

  el.innerHTML = `
  <div class="tela">
    <div class="kpis">
      <div class="kpi"><span>Clientes</span><strong>${todos.length}</strong></div>
      <div class="kpi"><span>Com brinde a retirar</span><strong>${comBrinde}</strong></div>
      <div class="kpi"><span>Regra</span><strong class="kpi-texto">${cfg.estrelasParaBrinde} estrelas = ${esc(cfg.brinde)}</strong></div>
    </div>
    <label class="busca">Buscar cliente
      <input type="search" id="busca-cliente" value="${esc(buscaFidelidade)}" placeholder="Digite o nome">
    </label>
    <div class="grade-cartoes">
      ${clientes.length ? clientes.map(c => `
        <article class="cartao cartao-fidelidade ${c.disponiveis ? 'tem-brinde' : ''}">
          <div class="pedido-linha">
            <strong>${esc(c.nome)}</strong>
            ${c.disponiveis ? `<span class="badge badge-brinde">${c.disponiveis} brinde(s)</span>` : ''}
          </div>
          ${desenharEstrelas(c.noCartao, cfg.estrelasParaBrinde)}
          <p class="suave">${c.estrelas} estrelas no total · ${c.pedidos} pedido(s) entregue(s)${c.ultimo ? ' · último em ' + dataBR(c.ultimo) : ''}</p>
          <div class="pedido-acoes">
            <button class="btn btn-pequeno btn-whats" data-acao="enviar" data-tel="${c.telefone}">Enviar cartão</button>
            <button class="btn btn-pequeno btn-primario" data-acao="resgatar" data-tel="${c.telefone}" ${c.disponiveis ? '' : 'disabled'}>Entregar brinde</button>
          </div>
        </article>`).join('') : '<p class="vazio">Os clientes aparecem aqui quando o primeiro pedido for marcado como entregue.</p>'}
    </div>
  </div>`;

  const tela = el.firstElementChild;
  const busca = tela.querySelector('#busca-cliente');
  busca.addEventListener('input', () => {
    buscaFidelidade = busca.value;
    renderFidelidade(el);
    const novoCampo = el.querySelector('#busca-cliente');
    novoCampo.focus();
    novoCampo.setSelectionRange(novoCampo.value.length, novoCampo.value.length);
  });

  tela.addEventListener('click', evento => {
    const botao = evento.target.closest('button[data-tel]');
    if (!botao) return;
    const cliente = todos.find(c => c.telefone === botao.dataset.tel);
    if (botao.dataset.acao === 'enviar') {
      abrirWhatsApp(cliente.telefone, mensagemCartao(cliente));
    }
    if (botao.dataset.acao === 'resgatar') {
      const resgates = ler(CHAVES.resgates, {});
      resgates[cliente.telefone] = (resgates[cliente.telefone] || 0) + 1;
      salvar(CHAVES.resgates, resgates);
      // O brinde entra como despesa na DRE, pelo custo médio de um geladinho
      const despesas = lerDespesas();
      despesas.push({
        id: novoId(), data: hojeISO(), categoria: 'Brindes da fidelidade',
        descricao: `Brinde para ${cliente.nome}`, valor: Number(custoMedioGeladinho().toFixed(2))
      });
      salvarDespesas(despesas);
      avisar(`Brinde entregue para ${cliente.nome}.`);
      renderFidelidade(el);
    }
  });
}
