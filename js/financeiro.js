/* ==========================================================
   financeiro.js - módulo Financeiro e DRE
   DRE simplificada para gestão do negócio (não substitui
   a contabilidade).
   ========================================================== */

const CATEGORIAS_DESPESA = [
  'Viagem de compras',
  'Gás e energia',
  'Embalagens',
  'Internet e telefone',
  'Brindes da fidelidade',
  'DAS-MEI',
  'Outras'
];

let mesFinanceiro = null;

function gerarDRE(pedidos, despesas, custos, mes) {
  const doMes = item => item.data.startsWith(mes);
  const entregues = pedidos.filter(p => p.status === 'entregue' && doMes(p));
  const receitaBruta = entregues.reduce((s, p) => s + p.quantidade * p.precoUnitario, 0);
  const descontos = entregues.reduce((s, p) => s + (p.desconto || 0), 0);
  const receitaLiquida = receitaBruta - descontos;
  const custoProdutos = entregues.reduce((s, p) => s + p.quantidade * (custos[p.saborId] || 0), 0);
  const lucroBruto = receitaLiquida - custoProdutos;
  const despesasDoMes = despesas.filter(doMes);
  const totalDespesas = despesasDoMes.reduce((s, d) => s + d.valor, 0);
  const resultado = lucroBruto - totalDespesas;
  const porCategoria = {};
  despesasDoMes.forEach(d => { porCategoria[d.categoria] = (porCategoria[d.categoria] || 0) + d.valor; });
  return {
    receitaBruta, descontos, receitaLiquida, custoProdutos, lucroBruto,
    despesas: totalDespesas, porCategoria, resultado,
    unidades: entregues.reduce((s, p) => s + p.quantidade, 0),
    margem: receitaLiquida > 0 ? resultado / receitaLiquida : 0
  };
}

function textoDRE(dre, mes) {
  const cfg = lerConfig();
  return [
    `DRE ${cfg.nomeNegocio} - ${nomeDoMes(mes)}`,
    `Receita bruta: ${moeda(dre.receitaBruta)}`,
    `(-) Descontos: ${moeda(dre.descontos)}`,
    `(=) Receita líquida: ${moeda(dre.receitaLiquida)}`,
    `(-) Custo dos produtos: ${moeda(dre.custoProdutos)}`,
    `(=) Lucro bruto: ${moeda(dre.lucroBruto)}`,
    `(-) Despesas: ${moeda(dre.despesas)}`,
    `(=) Resultado: ${moeda(dre.resultado)}`,
    `Margem líquida: ${porcentagem(dre.margem)}`,
    `Geladinhos vendidos: ${dre.unidades}`
  ].join('\n');
}

function renderFinanceiro(el) {
  if (!mesFinanceiro) mesFinanceiro = mesAtual();
  const mes = mesFinanceiro;
  const dre = gerarDRE(lerPedidos(), lerDespesas(), custosPorSabor(), mes);
  const despesasMes = lerDespesas().filter(d => d.data.startsWith(mes)).sort((a, b) => b.data.localeCompare(a.data));
  const base = dre.receitaLiquida || 1;
  const linha = (rotulo, valor, classe = '') => `
    <tr class="${classe}">
      <td>${rotulo}</td>
      <td class="${valor < 0 ? 'negativo' : ''}">${moeda(valor)}</td>
      <td class="suave">${dre.receitaLiquida ? porcentagem(valor / base) : '-'}</td>
    </tr>`;

  el.innerHTML = `
  <div class="tela">
    <div class="barra-acoes">
      <label class="inline">Mês <input type="month" id="mes-dre" value="${mes}"></label>
      <button class="btn btn-whats btn-pequeno" id="enviar-dre">Enviar DRE no WhatsApp</button>
    </div>

    <div class="kpis">
      <div class="kpi"><span>Receita líquida</span><strong>${moeda(dre.receitaLiquida)}</strong></div>
      <div class="kpi"><span>Resultado</span><strong class="${dre.resultado < 0 ? 'negativo' : 'positivo'}">${moeda(dre.resultado)}</strong></div>
      <div class="kpi"><span>Margem líquida</span><strong>${porcentagem(dre.margem)}</strong></div>
      <div class="kpi"><span>Geladinhos vendidos</span><strong>${dre.unidades}</strong></div>
    </div>

    <section class="cartao">
      <h2>DRE de ${nomeDoMes(mes)}</h2>
      <div class="tabela-rolagem">
        <table class="tabela tabela-dre">
          <thead><tr><th>Linha</th><th>Valor</th><th>% da receita líquida</th></tr></thead>
          <tbody>
            ${linha('(+) Receita bruta de vendas', dre.receitaBruta)}
            ${linha('(−) Descontos concedidos', -dre.descontos)}
            ${linha('(=) Receita líquida', dre.receitaLiquida, 'subtotal')}
            ${linha('(−) Custo dos produtos vendidos', -dre.custoProdutos)}
            ${linha('(=) Lucro bruto', dre.lucroBruto, 'subtotal')}
            ${Object.entries(dre.porCategoria).map(([cat, valor]) => linha(`(−) ${esc(cat)}`, -valor, 'detalhe')).join('')}
            ${linha('(−) Total de despesas operacionais', -dre.despesas)}
            ${linha('(=) Resultado do mês', dre.resultado, 'total')}
          </tbody>
        </table>
      </div>
      <p class="suave">Receita considera só pedidos entregues. O custo dos produtos usa os preços de ingredientes cadastrados hoje na Precificação.</p>
    </section>

    <section class="cartao">
      <h2>Lançar despesa</h2>
      <form id="form-despesa" class="form-grade" novalidate>
        <label>Data <input name="data" type="date" value="${hojeISO()}" required></label>
        <label>Categoria
          <select name="categoria">${CATEGORIAS_DESPESA.map(c => `<option>${c}</option>`).join('')}</select>
        </label>
        <label>Descrição <input name="descricao" placeholder="Ex.: passagem para fazer compras"></label>
        <label>Valor (R$) <input name="valor" type="number" min="0.01" step="0.01" required></label>
        <p class="erro-form largura-total" id="erro-despesa" role="alert"></p>
        <button class="btn btn-primario largura-total" type="submit">Lançar despesa</button>
      </form>
    </section>

    <section class="cartao">
      <h2>Despesas do mês</h2>
      ${despesasMes.length ? `
      <div class="tabela-rolagem">
        <table class="tabela">
          <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            ${despesasMes.map(d => `
              <tr>
                <td>${dataBR(d.data)}</td><td>${esc(d.categoria)}</td><td>${esc(d.descricao || '')}</td>
                <td>${moeda(d.valor)}</td>
                <td><button class="btn btn-pequeno btn-texto" data-excluir="${d.id}">Excluir</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : '<p class="vazio">Nenhuma despesa lançada neste mês.</p>'}
    </section>
  </div>`;

  const tela = el.firstElementChild;
  tela.querySelector('#mes-dre').addEventListener('change', e => {
    if (e.target.value) { mesFinanceiro = e.target.value; renderFinanceiro(el); }
  });
  tela.querySelector('#enviar-dre').addEventListener('click', () =>
    abrirWhatsApp(lerConfig().whatsapp, textoDRE(dre, mes)));

  tela.querySelector('#form-despesa').addEventListener('submit', evento => {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.target));
    const valor = Number(dados.valor);
    const erro = tela.querySelector('#erro-despesa');
    if (!dados.data) return (erro.textContent = 'Informe a data.');
    if (!(valor > 0)) return (erro.textContent = 'Informe um valor maior que zero.');
    const despesas = lerDespesas();
    despesas.push({ id: novoId(), data: dados.data, categoria: dados.categoria, descricao: dados.descricao.trim(), valor });
    salvarDespesas(despesas);
    mesFinanceiro = dados.data.slice(0, 7);
    avisar('Despesa lançada.');
    renderFinanceiro(el);
  });

  tela.addEventListener('click', async evento => {
    const botao = evento.target.closest('[data-excluir]');
    if (!botao) return;
    if (!(await confirmar('Excluir esta despesa?', 'Excluir'))) return;
    salvarDespesas(lerDespesas().filter(d => d.id !== botao.dataset.excluir));
    renderFinanceiro(el);
  });
}
