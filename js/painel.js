/* ==========================================================
   painel.js - menu, navegação e telas Início, Configurações e Mais
   Carregado por último: usa as funções dos outros módulos.
   ========================================================== */

const ICONES = {
  inicio: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  pedidos: 'M9 3h6v3H9zM15 5h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3M8 11h8M8 15h6',
  fidelidade: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z',
  producao: 'M3 4h2l2.4 11h11.2L21 7H6.2M9 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  precificacao: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM7.5 7.5h.01',
  financeiro: 'M4 20V11M10 20V5M16 20v-6M2 20h20',
  relatorios: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M12 11v6M9 14l3 3 3-3',
  configuracoes: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  mais: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'
};

const MODULOS = [
  { id: 'inicio', titulo: 'Início', render: renderInicio },
  { id: 'pedidos', titulo: 'Pedidos', render: renderPedidos },
  { id: 'fidelidade', titulo: 'Fidelidade', render: renderFidelidade },
  { id: 'producao', titulo: 'Produção e compras', curto: 'Produção', render: renderProducao },
  { id: 'precificacao', titulo: 'Precificação', render: renderPrecificacao },
  { id: 'financeiro', titulo: 'Financeiro e DRE', curto: 'Finanças', render: renderFinanceiro },
  { id: 'relatorios', titulo: 'Relatórios', render: renderRelatorios },
  { id: 'configuracoes', titulo: 'Configurações', render: renderConfiguracoes }
];
const NO_RODAPE = ['inicio', 'pedidos', 'producao', 'financeiro'];
const TELA_MAIS = { id: 'mais', titulo: 'Mais opções', render: renderMais };

function icone(nome) {
  return `<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[nome]}"/></svg>`;
}

function montarMenus() {
  document.querySelector('#menu-lateral-lista').innerHTML = MODULOS.map(m =>
    `<li><a href="#${m.id}" data-tela="${m.id}">${icone(m.id)}<span>${m.titulo}</span></a></li>`).join('');

  document.querySelector('#menu-inferior').innerHTML = [...MODULOS.filter(m => NO_RODAPE.includes(m.id)), TELA_MAIS]
    .map(m => `<a href="#${m.id}" data-tela="${m.id}">${icone(m.id)}<span>${m.curto || (m.id === 'mais' ? 'Mais' : m.titulo)}</span></a>`).join('');
}

function navegar() {
  const id = location.hash.slice(1) || 'inicio';
  const modulo = MODULOS.find(m => m.id === id) || (id === 'mais' ? TELA_MAIS : MODULOS[0]);
  const conteudo = document.querySelector('#conteudo');

  document.querySelector('#titulo-tela').textContent = modulo.titulo;
  document.title = `${modulo.titulo} | ${lerConfig().nomeNegocio}`;
  document.querySelectorAll('[data-tela]').forEach(link => {
    const ativo = link.dataset.tela === modulo.id ||
      (modulo.id !== 'mais' && !NO_RODAPE.includes(modulo.id) && link.dataset.tela === 'mais' && link.closest('#menu-inferior'));
    link.classList.toggle('ativo', Boolean(ativo));
    if (ativo) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  document.querySelector('#selo-demo').hidden = !ler(CHAVES.demo, false);
  document.querySelector('#nome-negocio-menu').textContent = lerConfig().nomeNegocio;

  modulo.render(conteudo);
  window.scrollTo(0, 0);
}

/* ---------- Início ---------- */

function renderInicio(el) {
  const pedidos = lerPedidos();
  const mes = mesAtual();
  const dre = gerarDRE(pedidos, lerDespesas(), custosPorSabor(), mes);
  const abertos = pedidos.filter(p => p.status === 'novo' || p.status === 'producao')
    .sort((a, b) => a.data.localeCompare(b.data));
  const paraHoje = abertos.filter(p => p.data <= hojeISO());
  const brindes = resumoClientes().filter(c => c.disponiveis > 0).length;

  const porSabor = CATALOGO.sabores.map(s => ({
    s,
    unidades: pedidos.filter(p => p.status === 'entregue' && p.saborId === s.id && p.data.startsWith(mes))
      .reduce((soma, p) => soma + p.quantidade, 0)
  }));
  const maior = Math.max(1, ...porSabor.map(x => x.unidades));

  el.innerHTML = `
  <div class="tela">
    ${pedidos.length === 0 ? `
      <section class="cartao boas-vindas">
        <h2>Bem-vinda ao painel</h2>
        <p>Registre o primeiro pedido ou carregue dados de demonstração para conhecer o sistema.</p>
        <div class="pedido-acoes">
          <a class="btn btn-primario" href="#pedidos">Registrar pedido</a>
          <button class="btn btn-secundario" id="inicio-demo">Carregar dados de demonstração</button>
        </div>
      </section>` : ''}

    <div class="kpis">
      <a class="kpi" href="#pedidos"><span>Entregas para hoje</span><strong>${paraHoje.length}</strong></a>
      <a class="kpi" href="#pedidos"><span>Pedidos em aberto</span><strong>${abertos.length}</strong></a>
      <a class="kpi" href="#financeiro"><span>Receita em ${nomeDoMes(mes).split(' ')[0]}</span><strong>${moeda(dre.receitaLiquida)}</strong></a>
      <a class="kpi" href="#financeiro"><span>Resultado do mês</span><strong class="${dre.resultado < 0 ? 'negativo' : 'positivo'}">${moeda(dre.resultado)}</strong></a>
      <a class="kpi" href="#fidelidade"><span>Brindes a entregar</span><strong>${brindes}</strong></a>
    </div>

    <div class="duas-colunas">
      <section class="cartao">
        <div class="pedido-linha"><h2>Próximas entregas</h2><a href="#pedidos" class="link">Ver todos</a></div>
        ${abertos.length ? `<ul class="lista-simples">
          ${abertos.slice(0, 6).map(p => `
            <li>
              <span>${svgGeladinho((CATALOGO.sabores.find(s => s.id === p.saborId) || {}).cor || '#ccc', 28)}</span>
              <span><strong>${esc(p.cliente)}</strong><br><small class="suave">${p.quantidade} × ${esc(nomeDoSabor(p.saborId))}</small></span>
              <span class="${p.data < hojeISO() ? 'negativo' : ''}">${p.data === hojeISO() ? 'Hoje' : dataBR(p.data)}</span>
            </li>`).join('')}
        </ul>` : '<p class="vazio">Nenhuma entrega pendente.</p>'}
      </section>

      <section class="cartao">
        <h2>Vendas por sabor no mês</h2>
        <div class="barras" role="list">
          ${porSabor.map(x => `
            <div class="barra-linha" role="listitem">
              <span>${esc(x.s.nome)}</span>
              <div class="barra-trilho"><div class="barra-valor" style="width:${(x.unidades / maior) * 100}%;background:${x.s.cor}"></div></div>
              <strong>${x.unidades}</strong>
            </div>`).join('')}
        </div>
        <div class="pedido-acoes">
          <a class="btn btn-secundario btn-pequeno" href="#producao">Lista de compras</a>
          <a class="btn btn-secundario btn-pequeno" href="#financeiro">Ver DRE</a>
        </div>
      </section>
    </div>
  </div>`;

  const botaoDemo = el.querySelector('#inicio-demo');
  if (botaoDemo) botaoDemo.addEventListener('click', () => {
    carregarDadosDemo();
    avisar('Dados de demonstração carregados.');
    navegar();
  });
}

/* ---------- Mais (celular) ---------- */

function renderMais(el) {
  el.innerHTML = `
  <div class="tela">
    <div class="grade-modulos">
      ${MODULOS.map(m => `<a class="modulo" href="#${m.id}">${icone(m.id)}<span>${m.titulo}</span></a>`).join('')}
      <a class="modulo" href="index.html" target="_blank">${icone('inicio')}<span>Ver cardápio do cliente</span></a>
    </div>
  </div>`;
}

/* ---------- Configurações ---------- */

function renderConfiguracoes(el) {
  const cfg = lerConfig();
  el.innerHTML = `
  <div class="tela">
    <section class="cartao">
      <h2>Dados do negócio</h2>
      <form id="form-config" class="form-grade" novalidate>
        <label>Nome do negócio <input name="nomeNegocio" value="${esc(cfg.nomeNegocio)}" required></label>
        <label>Seu WhatsApp (recebe listas e DRE) <input name="whatsapp" type="tel" value="${esc(cfg.whatsapp)}" placeholder="(66) 99999-9999"></label>
        <label>Estrelas para ganhar brinde <input name="estrelasParaBrinde" type="number" min="1" step="1" value="${cfg.estrelasParaBrinde}"></label>
        <label>Brinde <input name="brinde" value="${esc(cfg.brinde)}"></label>
        <button class="btn btn-primario largura-total" type="submit">Salvar</button>
      </form>
    </section>
    <section class="cartao">
      <h2>Instalar como aplicativo</h2>
      <p class="suave">No Chrome do celular, abra o menu (três pontos) e toque em "Adicionar à tela inicial". O painel abre em tela cheia, com ícone próprio.</p>
      <p class="suave">O número de WhatsApp que recebe os pedidos do cardápio fica no arquivo data/catalogo.json.</p>
    </section>
  </div>`;

  el.querySelector('#form-config').addEventListener('submit', evento => {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.target));
    const atual = lerConfig();
    salvarConfig({
      ...atual,
      nomeNegocio: dados.nomeNegocio.trim() || CONFIG_PADRAO.nomeNegocio,
      whatsapp: soDigitos(dados.whatsapp),
      estrelasParaBrinde: Math.max(1, Math.floor(Number(dados.estrelasParaBrinde)) || 5),
      brinde: dados.brinde.trim() || CONFIG_PADRAO.brinde
    });
    avisar('Configurações salvas.');
    navegar();
  });
}

/* ---------- Inicialização ---------- */

async function iniciarPainel() {
  montarMenus();
  try {
    CATALOGO = await buscarCatalogo();
    // Na primeira vez, a regra de fidelidade vem do catálogo
    if (!ler(CHAVES.config, null)) {
      salvarConfig({
        ...CONFIG_PADRAO,
        nomeNegocio: CATALOGO.produtora.nome,
        estrelasParaBrinde: CATALOGO.fidelidade.estrelasParaBrinde,
        brinde: CATALOGO.fidelidade.brinde
      });
    }
    window.addEventListener('hashchange', navegar);
    navegar();
  } catch (erro) {
    document.querySelector('#conteudo').innerHTML =
      `<p class="vazio">${esc(erro.message)} Abra o projeto com a extensão Live Server do VS Code ou publique no GitHub Pages.</p>`;
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

iniciarPainel();
