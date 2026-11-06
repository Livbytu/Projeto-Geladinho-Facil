# Geladinho Fácil: sistema de teste

Projeto Integrador Desenvolvedor front-end (UC5), Técnico em Informática para Internet, Senac MT.

## Como abrir no VS Code

1. Abra a pasta `geladinho-facil` no VS Code.
2. Instale a extensão Live Server.
3. Clique com o botão direito em `index.html` e escolha "Open with Live Server".

O sistema não abre com dois cliques no arquivo, porque o navegador bloqueia a leitura do `catalogo.json` fora de um servidor.

## Um arquivo HTML, três áreas

O sistema tem um único `index.html` com três áreas:

| Endereço | Quem usa | O que faz |
| --- | --- | --- |
| `index.html` (sem nada no final) | Todos | Tela inicial com acesso ao cardápio, ao painel e aos 8 módulos |
| `index.html#cardapio` | Cliente | Cardápio, carrinho e pedido pelo WhatsApp (use este link no QR Code) |
| `index.html#painel` | Produtora | Início, Pedidos, Fidelidade, Produção e compras, Precificação, Financeiro e DRE, Relatórios, Configurações |

A tela inicial leva a qualquer módulo com um toque. Cada tela do painel tem seu endereço: `#painel-pedidos`, `#painel-financeiro` e assim por diante. Quem troca de área é o arquivo `js/app.js`.

## Primeiro teste

No painel, toque em "Carregar dados de demonstração". O sistema cria 9 semanas de pedidos e despesas fictícios, com cerca de 110 geladinhos por semana. Os telefones de demonstração são inválidos de propósito: as mensagens abrem o WhatsApp sem destinatário.

## Antes de entregar para a cliente

1. Em `data/catalogo.json`, preencher o WhatsApp da produtora (com DDD, só números) e os preços reais de venda.
2. Trocar `"precosDeExemplo": true` por `false`.
3. No painel, em Relatórios, tocar em "Apagar todos os dados".
4. Em Precificação, cadastrar os preços reais dos ingredientes.

## Publicar no GitHub Pages

1. Criar um repositório e enviar todos os arquivos desta pasta.
2. Em Settings, Pages, escolher a branch `main` e a pasta raiz.
3. A tela inicial fica em `https://USUARIO.github.io/REPOSITORIO/`, o cardápio em `.../#cardapio` e o painel em `.../#painel`.
4. O QR Code da placa aponta para o cardápio, nunca para o painel.

## Power BI

1. No painel, em Relatórios, baixar `pedidos.csv`, `sabores.csv` e `despesas.csv`.
2. No Power BI Desktop: Obter dados, Texto/CSV, delimitador ponto e vírgula.
3. Em Transformar dados, alterar o tipo das colunas numéricas usando a localidade Inglês (Estados Unidos).
4. Criar a tabela `Calendario = CALENDARAUTO()` e ligar a `pedidos[data]` e `despesas[data]`; ligar `pedidos[sabor]` a `sabores[sabor]`.
5. Criar as medidas DAX do documento do projeto.

## Organização do código

| Arquivo | Equipe | Conteúdo |
| --- | --- | --- |
| `js/util.js` | Integração | Moeda, datas, link do WhatsApp, download |
| `js/api.js` | Integração | Leitura assíncrona do catálogo (API simulada) |
| `js/armazenamento.js` | Integração | localStorage, configurações, preço de venda |
| `js/vitrine.js` | 1. Vitrine e WhatsApp | Cardápio e pedido |
| `js/pedidos.js` | 2. Pedidos e fidelidade | Registro, status, mensagens prontas |
| `js/fidelidade.js` | 2. Pedidos e fidelidade | Estrelas, brindes, cartão |
| `js/producao.js` | 3. Produção e precificação | Plano de produção e lista de compras |
| `js/precificacao.js` | 3. Produção e precificação | Custo e preço sugerido |
| `js/financeiro.js` | 4. Financeiro e Power BI | Despesas e DRE |
| `js/relatorios.js` | 4. Financeiro e Power BI | CSV, backup, dados de demonstração |
| `js/painel.js` | Integração | Menu, navegação, Início, Configurações |
| `js/app.js` | Integração | Tela inicial e troca entre tela inicial, cardápio e painel |
| `sw.js`, `manifest.json` | 1. Vitrine e WhatsApp | Instalação como aplicativo (PWA) |

## Limites conhecidos

- Os dados do painel ficam só no aparelho em que ele é usado. Faça backup toda semana (Relatórios).
- Preço alterado na Precificação só chega ao cardápio depois de publicar o novo `catalogo.json`.
- Respostas automáticas dentro do WhatsApp exigem a API oficial do WhatsApp Business e um servidor: evolução prevista para a UC11.

## Versão em arquivo único

A pasta `arquivo-unico` tem um `index.html` com estilo, código, imagens e catálogo embutidos. Ele abre com dois cliques, sem Live Server, e pode ser publicado sozinho no GitHub Pages ou no Netlify. Serve para demonstração e para a banca. Para programar, use os arquivos da pasta principal: o arquivo único não muda quando o código é alterado.
