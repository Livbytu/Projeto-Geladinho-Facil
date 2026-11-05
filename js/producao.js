/* ==========================================================
   producao.js - módulo Produção e compras
   Soma os pedidos do período, calcula as receitas e monta
   a lista de compras da viagem.
   ========================================================== */

const periodoProducao = { inicio: null, fim: null };

function gerarPlanoProducao(pedidos, sabores, inicio, fim, extras) {
  return sabores.map(sabor => {
    const encomendas = pedidos
      .filter(p => p.saborId === sabor.id && (p.status === 'novo' || p.status === 'producao'))
      .filter(p => p.data >= inicio && p.data <= fim)
      .reduce((soma, p) => soma + p.quantidade, 0);
    const avulsas = Number(extras[sabor.id] || 0);
    const unidades = encomendas + avulsas;
    const receitas = Math.ceil(unidades / sabor.rendimento);
    return {
      sabor, encomendas, avulsas, unidades, receitas,
      produzidas: receitas * sabor.rendimento,
      sobra: receitas * sabor.rendimento - unidades
    };
  });
}

function gerarListaDeCompras(plano) {
  const lista = {};
  plano.forEach(linha => {
    if (linha.receitas === 0) return;
    linha.sabor.ingredientes.forEach(ing => {
      lista[ing.item] = (lista[ing.item] || 0) + linha.receitas * ing.qtd;
    });
  });
  return lista;
}

function renderProducao(el) {
  if (!periodoProducao.inicio) {
    periodoProducao.inicio = hojeISO();
    periodoProducao.fim = somarDias(hojeISO(), 6);
  }
  const extras = ler(CHAVES.extras, {});
  const plano = gerarPlanoProducao(lerPedidos(), CATALOGO.sabores, periodoProducao.inicio, periodoProducao.fim, extras);
  const lista = gerarListaDeCompras(plano);
  const precos = lerPrecosIngredientes();
  const itens = Object.entries(lista);
  const custoCompras = itens.reduce((soma, [item, qtd]) => soma + qtd * (precos[item] || 0), 0);
  const totalUnidades = plano.reduce((s, l) => s + l.unidades, 0);

  el.innerHTML = `
  <div class="tela">
    <section class="cartao">
      <h2>Período da produção</h2>
      <div class="form-grade">
        <label>De <input type="date" id="prod-inicio" value="${periodoProducao.inicio}"></label>
        <label>Até <input type="date" id="prod-fim" value="${periodoProducao.fim}"></label>
      </div>
      <p class="suave">Entram os pedidos novos e em produção com entrega no período, mais as unidades para venda avulsa que você informar.</p>
    </section>

    <section class="cartao">
      <h2>Plano de produção · ${totalUnidades} geladinhos</h2>
      <div class="tabela-rolagem">
        <table class="tabela">
          <thead><tr><th>Sabor</th><th>Encomendas</th><th>Venda avulsa</th><th>Receitas</th><th>Vai render</th><th>Sobra</th></tr></thead>
          <tbody>
            ${plano.map(l => `
              <tr>
                <td><span class="ponto" style="background:${l.sabor.cor}"></span>${esc(l.sabor.nome)}</td>
                <td>${l.encomendas}</td>
                <td><input class="input-tabela" type="number" min="0" step="1" value="${l.avulsas}" data-extra="${l.sabor.id}" aria-label="Unidades avulsas de ${esc(l.sabor.nome)}"></td>
                <td><strong>${l.receitas}</strong></td>
                <td>${l.produzidas}</td>
                <td>${l.sobra}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="cartao">
      <div class="pedido-linha">
        <h2>Lista de compras</h2>
        ${custoCompras > 0 ? `<span class="badge badge-novo">Estimativa: ${moeda(custoCompras)}</span>` : ''}
      </div>
      ${itens.length ? `
        <ul class="lista-compras">
          ${itens.map(([item, qtd]) => `
            <li><label><input type="checkbox"> <span><strong>${qtd}</strong> × ${esc(item)}</span></label>
            ${precos[item] ? `<span class="suave">${moeda(qtd * precos[item])}</span>` : ''}</li>`).join('')}
        </ul>
        <div class="pedido-acoes">
          <button class="btn btn-whats" id="enviar-lista">Enviar lista no meu WhatsApp</button>
        </div>` : '<p class="vazio">Sem pedidos no período. Informe unidades de venda avulsa para planejar a produção.</p>'}
    </section>
  </div>`;

  const tela = el.firstElementChild;
  tela.querySelector('#prod-inicio').addEventListener('change', e => { periodoProducao.inicio = e.target.value; renderProducao(el); });
  tela.querySelector('#prod-fim').addEventListener('change', e => { periodoProducao.fim = e.target.value; renderProducao(el); });
  tela.querySelectorAll('[data-extra]').forEach(input => {
    input.addEventListener('change', () => {
      const valores = ler(CHAVES.extras, {});
      valores[input.dataset.extra] = Math.max(0, Math.floor(Number(input.value) || 0));
      salvar(CHAVES.extras, valores);
      renderProducao(el);
    });
  });
  const botao = tela.querySelector('#enviar-lista');
  if (botao) {
    botao.addEventListener('click', () => {
      const cfg = lerConfig();
      const linhas = itens.map(([item, qtd]) => `- ${qtd} × ${item}`).join('\n');
      const texto = `Lista de compras ${cfg.nomeNegocio} (${dataBR(periodoProducao.inicio)} a ${dataBR(periodoProducao.fim)}):\n${linhas}` +
        (custoCompras > 0 ? `\nEstimativa: ${moeda(custoCompras)}` : '');
      abrirWhatsApp(cfg.whatsapp, texto);
    });
  }
}
