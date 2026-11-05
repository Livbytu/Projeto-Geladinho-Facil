/* ==========================================================
   precificacao.js - módulo Precificação
   custo do produto = ingredientes ÷ rendimento + embalagem
   preço sugerido   = (custo do produto + rateio) ÷ (1 - margem)
   ========================================================== */

function ingredientesDoCatalogo() {
  const itens = [];
  CATALOGO.sabores.forEach(s => s.ingredientes.forEach(i => {
    if (!itens.includes(i.item)) itens.push(i.item);
  }));
  return itens;
}

function custoProduto(sabor, precos, embalagem) {
  const custoReceita = sabor.ingredientes
    .reduce((soma, ing) => soma + ing.qtd * (precos[ing.item] || 0), 0);
  return custoReceita / sabor.rendimento + embalagem;
}

function rateioDespesas(despesasDoMes, unidadesDoMes) {
  const total = despesasDoMes.reduce((soma, d) => soma + d.valor, 0);
  return unidadesDoMes > 0 ? total / unidadesDoMes : 0;
}

function precoSugerido(custoProd, rateio, margem) {
  return (custoProd + rateio) / (1 - margem);
}

// Custo do produto por sabor (sem rateio), usado na DRE e no Power BI
function custosPorSabor() {
  const precos = lerPrecosIngredientes();
  const cfg = lerConfig();
  const custos = {};
  CATALOGO.sabores.forEach(s => { custos[s.id] = custoProduto(s, precos, cfg.embalagem); });
  return custos;
}

function custoMedioGeladinho() {
  const valores = Object.values(custosPorSabor());
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

// Arredonda para cima em múltiplos de R$ 0,05
function arredondarPreco(valor) {
  return Math.ceil(valor * 20 - 1e-9) / 20;
}

function renderPrecificacao(el) {
  const cfg = lerConfig();
  const precos = lerPrecosIngredientes();
  const mes = mesAtual();
  const despesasMes = lerDespesas().filter(d => d.data.startsWith(mes));
  const rateio = rateioDespesas(despesasMes, cfg.unidadesMes);
  const semPreco = ingredientesDoCatalogo().filter(i => !precos[i]);

  const linhas = CATALOGO.sabores.map(s => {
    const custoReceita = s.ingredientes.reduce((soma, i) => soma + i.qtd * (precos[i.item] || 0), 0);
    const custo = custoProduto(s, precos, cfg.embalagem);
    const sugerido = arredondarPreco(precoSugerido(custo, rateio, cfg.margem));
    const atual = precoDoSabor(s.id);
    const margemAtual = atual > 0 ? (atual - custo - rateio) / atual : 0;
    return { s, custoReceita, custo, sugerido, atual, margemAtual };
  });

  el.innerHTML = `
  <div class="tela">
    <section class="cartao">
      <h2>1. Quanto você paga nos ingredientes</h2>
      <p class="suave">Informe o preço de 1 unidade como aparece na receita (1 caixa, 1 ovo, 1 colher). Para a colher de achocolatado: preço do pacote ÷ colheres que ele rende.</p>
      <div class="form-grade" id="precos-ingredientes">
        ${ingredientesDoCatalogo().map(item => `
          <label>${esc(item)}
            <input type="number" min="0" step="0.01" data-item="${esc(item)}" value="${precos[item] ?? ''}" placeholder="R$ 0,00">
          </label>`).join('')}
      </div>
      ${semPreco.length ? `<p class="alerta-texto">Faltam preços para: ${semPreco.map(esc).join(', ')}. O custo fica abaixo do real até você preencher.</p>` : ''}
    </section>

    <section class="cartao">
      <h2>2. Parâmetros</h2>
      <div class="form-grade">
        <label>Margem desejada (%)
          <input type="number" id="cfg-margem" min="0" max="90" step="1" value="${Math.round(cfg.margem * 100)}">
        </label>
        <label>Embalagem por unidade (R$)
          <input type="number" id="cfg-embalagem" min="0" step="0.01" value="${cfg.embalagem}">
        </label>
        <label>Geladinhos vendidos por mês
          <input type="number" id="cfg-unidades" min="1" step="1" value="${cfg.unidadesMes}">
        </label>
      </div>
      <p class="suave">Despesas lançadas em ${nomeDoMes(mes)}: ${moeda(despesasMes.reduce((s, d) => s + d.valor, 0))}. Rateio por geladinho: <strong>${moeda(rateio)}</strong>.</p>
    </section>

    <section class="cartao">
      <h2>3. Custo e preço por sabor</h2>
      <div class="tabela-rolagem">
        <table class="tabela">
          <thead><tr><th>Sabor</th><th>Custo da receita</th><th>Custo por unidade</th><th>+ Rateio</th><th>Preço sugerido</th><th>Preço atual</th><th>Margem atual</th><th></th></tr></thead>
          <tbody>
            ${linhas.map(l => `
              <tr>
                <td><span class="ponto" style="background:${l.s.cor}"></span>${esc(l.s.nome)}</td>
                <td>${moeda(l.custoReceita)} <span class="suave">(${l.s.rendimento} un.)</span></td>
                <td>${moeda(l.custo)}</td>
                <td>${moeda(l.custo + rateio)}</td>
                <td><strong>${moeda(l.sugerido)}</strong></td>
                <td><input class="input-tabela" type="number" min="0" step="0.05" value="${l.atual.toFixed(2)}" data-preco="${l.s.id}" aria-label="Preço de venda de ${esc(l.s.nome)}"></td>
                <td class="${l.margemAtual < cfg.margem ? 'negativo' : 'positivo'}">${porcentagem(l.margemAtual)}</td>
                <td><button class="btn btn-pequeno btn-secundario" data-usar="${l.s.id}" data-valor="${l.sugerido}">Usar sugerido</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="suave">Margem atual em vermelho = abaixo da margem desejada.</p>
      <div class="pedido-acoes">
        <button class="btn btn-primario" id="exportar-catalogo">Atualizar cardápio (baixar catalogo.json)</button>
      </div>
      <p class="suave">O cardápio público só muda quando o novo catalogo.json for publicado no GitHub, porque o sistema não tem servidor.</p>
    </section>
  </div>`;

  const tela = el.firstElementChild;

  tela.querySelectorAll('[data-item]').forEach(input => input.addEventListener('change', () => {
    const atuais = lerPrecosIngredientes();
    if (input.value === '') delete atuais[input.dataset.item];
    else atuais[input.dataset.item] = Math.max(0, Number(input.value));
    salvar(CHAVES.precosIngredientes, atuais);
    renderPrecificacao(el);
  }));

  const salvarParametro = (campo, valor) => {
    const atual = lerConfig();
    atual[campo] = valor;
    salvarConfig(atual);
    renderPrecificacao(el);
  };
  tela.querySelector('#cfg-margem').addEventListener('change', e =>
    salvarParametro('margem', Math.min(0.9, Math.max(0, Number(e.target.value) / 100))));
  tela.querySelector('#cfg-embalagem').addEventListener('change', e =>
    salvarParametro('embalagem', Math.max(0, Number(e.target.value))));
  tela.querySelector('#cfg-unidades').addEventListener('change', e =>
    salvarParametro('unidadesMes', Math.max(1, Math.floor(Number(e.target.value)))));

  const definirPreco = (id, valor) => {
    const definidos = ler(CHAVES.precosVenda, {});
    definidos[id] = Number(Number(valor).toFixed(2));
    salvar(CHAVES.precosVenda, definidos);
  };
  tela.querySelectorAll('[data-preco]').forEach(input => input.addEventListener('change', () => {
    definirPreco(input.dataset.preco, Math.max(0, Number(input.value)));
    avisar('Preço atualizado. Os próximos pedidos usam o novo valor.');
    renderPrecificacao(el);
  }));
  tela.querySelectorAll('[data-usar]').forEach(botao => botao.addEventListener('click', () => {
    definirPreco(botao.dataset.usar, botao.dataset.valor);
    avisar('Preço sugerido aplicado.');
    renderPrecificacao(el);
  }));

  tela.querySelector('#exportar-catalogo').addEventListener('click', () => {
    const novo = JSON.parse(JSON.stringify(CATALOGO));
    novo.sabores.forEach(s => { s.preco = precoDoSabor(s.id); });
    novo.precosDeExemplo = false;
    baixarArquivo('catalogo.json', JSON.stringify(novo, null, 2), 'application/json');
  });
}
