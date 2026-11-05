/* ==========================================================
   relatorios.js - módulo Relatórios
   Exporta CSV para o Power BI, faz backup e gera dados
   de demonstração para testes.
   ========================================================== */

function paraCSV(linhas, colunasPadrao) {
  const colunas = linhas.length ? Object.keys(linhas[0]) : colunasPadrao;
  const celula = v => typeof v === 'number' ? v : `"${String(v ?? '').replace(/"/g, '""')}"`;
  const corpo = linhas.map(l => colunas.map(c => celula(l[c])).join(';'));
  return [colunas.join(';'), ...corpo].join('\n');
}

// O telefone não sai do app: cada cliente vira um número (LGPD, princípio da necessidade)
function linhasPedidosParaBI(pedidos) {
  const ids = {};
  return pedidos.map(p => {
    if (!ids[p.telefone]) ids[p.telefone] = Object.keys(ids).length + 1;
    return {
      id_pedido: p.id, data: p.data, cliente_id: ids[p.telefone], sabor: nomeDoSabor(p.saborId),
      quantidade: p.quantidade, preco_unitario: p.precoUnitario,
      desconto: p.desconto || 0, status: STATUS[p.status]
    };
  });
}

function linhasSaboresParaBI() {
  const custos = custosPorSabor();
  return CATALOGO.sabores.map(s => ({
    sabor: s.nome, custo_unitario: Number(custos[s.id].toFixed(4)),
    rendimento: s.rendimento, preco_venda: precoDoSabor(s.id)
  }));
}

function linhasDespesasParaBI() {
  return lerDespesas().map(d => ({ data: d.data, categoria: d.categoria, descricao: d.descricao || '', valor: d.valor }));
}

function exportarBackup() {
  const dados = {};
  Object.entries(CHAVES).forEach(([nome, chave]) => { dados[nome] = ler(chave, null); });
  dados.geradoEm = new Date().toISOString();
  baixarArquivo(`backup-geladinho-${hojeISO()}.json`, JSON.stringify(dados, null, 2), 'application/json');
}

function importarBackup(arquivo, aoTerminar) {
  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      const dados = JSON.parse(leitor.result);
      if (!Array.isArray(dados.pedidos)) throw new Error('formato');
      Object.entries(CHAVES).forEach(([nome, chave]) => {
        if (dados[nome] != null) salvar(chave, dados[nome]);
        else localStorage.removeItem(chave);
      });
      avisar('Backup restaurado.');
      aoTerminar();
    } catch (erro) {
      avisar('Arquivo de backup inválido.', 'erro');
    }
  };
  leitor.readAsText(arquivo);
}

function apagarTudo() {
  Object.values(CHAVES).forEach(chave => { try { localStorage.removeItem(chave); } catch (e) { /* ignora */ } });
}

// Gerador de números pseudoaleatórios com semente: os dados de demonstração saem sempre iguais
function geradorAleatorio(semente) {
  return function () {
    semente |= 0; semente = semente + 0x6D2B79F5 | 0;
    let t = Math.imul(semente ^ semente >>> 15, 1 | semente);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Dados FICTÍCIOS para testar o sistema e o Power BI (cerca de 110 geladinhos por semana)
function carregarDadosDemo() {
  const aleatorio = geradorAleatorio(2026);
  const nomes = ['Ana P.', 'Bruno S.', 'Carla M.', 'Diego R.', 'Elaine T.', 'Fábio L.', 'Gabi O.', 'Heloísa C.',
    'Igor N.', 'Juliana F.', 'Kauã B.', 'Larissa A.', 'Marcos V.', 'Natália G.', 'Otávio D.', 'Paula H.', 'Rafael E.', 'Sabrina I.'];
  // Telefones começando com 0 são inválidos de propósito: o WhatsApp não envia para ninguém real
  const clientes = nomes.map((nome, i) => ({ nome, telefone: '000000000' + String(i + 1).padStart(2, '0') }));
  const pesos = [['pudim', 0.3], ['morango', 0.25], ['maracuja', 0.2], ['chocolate', 0.25]];
  const sortearSabor = () => {
    let r = aleatorio();
    for (const [id, peso] of pesos) { if ((r -= peso) <= 0) return id; }
    return 'pudim';
  };

  salvar(CHAVES.precosIngredientes, {
    'Ovos': 0.9, 'Leite condensado': 6.5, 'Leite (medida da lata)': 1.5, 'Creme de leite': 3.8,
    'Suco de morango (pacote)': 1.6, 'Suco de maracujá (pacote)': 1.6, 'Achocolatado (colher)': 0.3
  });
  salvar(CHAVES.precosVenda, {});
  salvar(CHAVES.resgates, {});

  const hoje = hojeISO();
  const pedidos = [];
  for (let dia = -62; dia <= 6; dia++) {
    const data = somarDias(hoje, dia);
    const semana = new Date(data + 'T12:00:00').getDay();
    if (semana === 0) continue; // domingo sem entregas
    const quantidadePedidos = 3 + Math.floor(aleatorio() * 3);
    for (let n = 0; n < quantidadePedidos; n++) {
      const cliente = clientes[Math.floor(aleatorio() * clientes.length)];
      const saborId = sortearSabor();
      let status = dia < 0 ? 'entregue' : dia === 0 ? 'producao' : 'novo';
      if (dia < 0 && aleatorio() < 0.05) status = 'cancelado';
      const quantidade = 1 + Math.floor(aleatorio() * 7);
      pedidos.push({
        id: novoId() + n, cliente: cliente.nome, telefone: cliente.telefone, saborId, quantidade,
        precoUnitario: precoDoSabor(saborId), desconto: quantidade >= 6 && aleatorio() < 0.3 ? 1 : 0,
        data, obs: '', status
      });
    }
  }

  const despesas = [];
  for (let dia = -62; dia <= 0; dia++) {
    const data = somarDias(hoje, dia);
    const d = new Date(data + 'T12:00:00');
    if (d.getDay() === 1) despesas.push({ id: novoId() + dia, data, categoria: 'Viagem de compras', descricao: 'Passagem e frete (exemplo)', valor: 40 });
    if (d.getDate() === 5) {
      despesas.push({ id: novoId() + 'g' + dia, data, categoria: 'Gás e energia', descricao: 'Exemplo', valor: 35 });
      despesas.push({ id: novoId() + 'e' + dia, data, categoria: 'Embalagens', descricao: 'Saquinhos (exemplo)', valor: 22 });
    }
  }

  salvarPedidos(pedidos);
  salvarDespesas(despesas);
  salvar(CHAVES.demo, true);
}

function renderRelatorios(el) {
  const pedidos = lerPedidos();
  el.innerHTML = `
  <div class="tela">
    <section class="cartao">
      <h2>Exportar para o Power BI</h2>
      <p class="suave">Três arquivos CSV separados por ponto e vírgula, com números em ponto decimal. No Power BI, use Obter dados → Texto/CSV e escolha a localidade Inglês (Estados Unidos) ao alterar os tipos. O telefone dos clientes não é exportado.</p>
      <div class="grade-botoes">
        <button class="btn btn-primario" data-csv="pedidos">pedidos.csv <small>${pedidos.length} linhas</small></button>
        <button class="btn btn-primario" data-csv="sabores">sabores.csv <small>${CATALOGO.sabores.length} linhas</small></button>
        <button class="btn btn-primario" data-csv="despesas">despesas.csv <small>${lerDespesas().length} linhas</small></button>
      </div>
    </section>

    <section class="cartao">
      <h2>Backup</h2>
      <p class="suave">Os dados ficam só neste aparelho. Exporte o backup toda semana e guarde o arquivo no seu WhatsApp ou e-mail.</p>
      <div class="grade-botoes">
        <button class="btn btn-secundario" id="btn-backup">Exportar backup</button>
        <label class="btn btn-secundario">Restaurar backup
          <input type="file" accept=".json,application/json" id="arquivo-backup" hidden>
        </label>
      </div>
    </section>

    <section class="cartao">
      <h2>Dados de demonstração</h2>
      <p class="suave">Gera 9 semanas de pedidos e despesas fictícios, com preços de ingredientes de exemplo, para testar o sistema, a DRE e o Power BI. Substitui os dados atuais.</p>
      <div class="grade-botoes">
        <button class="btn btn-secundario" id="btn-demo">Carregar dados de demonstração</button>
        <button class="btn btn-perigo" id="btn-apagar">Apagar todos os dados</button>
      </div>
    </section>
  </div>`;

  const tela = el.firstElementChild;
  tela.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-csv]');
    if (!botao) return;
    const tipo = botao.dataset.csv;
    const conteudo = {
      pedidos: () => paraCSV(linhasPedidosParaBI(lerPedidos()), ['id_pedido', 'data', 'cliente_id', 'sabor', 'quantidade', 'preco_unitario', 'desconto', 'status']),
      sabores: () => paraCSV(linhasSaboresParaBI()),
      despesas: () => paraCSV(linhasDespesasParaBI(), ['data', 'categoria', 'descricao', 'valor'])
    }[tipo]();
    baixarArquivo(`${tipo}.csv`, conteudo);
  });
  tela.querySelector('#btn-backup').addEventListener('click', exportarBackup);
  tela.querySelector('#arquivo-backup').addEventListener('change', e => {
    if (e.target.files[0]) importarBackup(e.target.files[0], () => navegar());
  });
  tela.querySelector('#btn-demo').addEventListener('click', async () => {
    if (lerPedidos().length && !(await confirmar('Isso substitui os pedidos e despesas atuais. Continuar?', 'Substituir dados'))) return;
    carregarDadosDemo();
    avisar('Dados de demonstração carregados.');
    navegar();
  });
  tela.querySelector('#btn-apagar').addEventListener('click', async () => {
    if (!(await confirmar('Apagar todos os pedidos, despesas, preços e configurações deste aparelho?', 'Apagar tudo'))) return;
    apagarTudo();
    avisar('Dados apagados.', 'alerta');
    navegar();
  });
}
