/* ==========================================================
   util.js - funções de apoio usadas em todo o sistema
   ========================================================== */

// Formata número como dinheiro: 3 -> "R$ 3,00"
function moeda(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Formata proporção como porcentagem: 0.4 -> "40%"
function porcentagem(valor) {
  return ((Number(valor) || 0) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
}

// Data de hoje no formato AAAA-MM-DD, no fuso do aparelho
function hojeISO() {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  return agora.toISOString().slice(0, 10);
}

// Soma dias a uma data AAAA-MM-DD
function somarDias(dataISO, dias) {
  const data = new Date(dataISO + 'T12:00:00');
  data.setDate(data.getDate() + dias);
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
  return data.toISOString().slice(0, 10);
}

// "2026-11-04" -> "04/11/2026"
function dataBR(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// "2026-11" -> "novembro de 2026"
function nomeDoMes(mesISO) {
  const data = new Date(mesISO + '-15T12:00:00');
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function mesAtual() {
  return hojeISO().slice(0, 7);
}

// Identificador único simples para pedidos e despesas
function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Protege o HTML contra textos digitados pelo usuário
function esc(texto) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(texto ?? '').replace(/[&<>"']/g, c => mapa[c]);
}

function soDigitos(texto) {
  return String(texto || '').replace(/\D/g, '');
}

// Monta o link do WhatsApp. Sem número válido, o WhatsApp pede para escolher o contato.
function linkWhatsApp(numero, texto) {
  let digitos = soDigitos(numero);
  if (digitos.length === 10 || digitos.length === 11) digitos = '55' + digitos;
  const valido = digitos.length >= 12 && !digitos.startsWith('0') && !digitos.startsWith('550');
  const base = valido ? `https://wa.me/${digitos}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(texto)}`;
}

// Abre o WhatsApp por um link (funciona melhor no celular que window.open)
function abrirWhatsApp(numero, texto) {
  const link = document.createElement('a');
  link.href = linkWhatsApp(numero, texto);
  link.target = '_blank';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// Caixa de confirmação dentro da página (substitui o confirm() do navegador)
function confirmar(mensagem, textoBotao = 'Confirmar') {
  return new Promise(resolver => {
    const fundo = document.createElement('div');
    fundo.className = 'confirmacao-fundo';
    fundo.innerHTML = `
      <div class="confirmacao" role="alertdialog" aria-modal="true" aria-labelledby="confirmacao-texto">
        <p id="confirmacao-texto">${esc(mensagem)}</p>
        <div class="pedido-acoes">
          <button class="btn btn-secundario" data-resposta="nao">Voltar</button>
          <button class="btn btn-primario" data-resposta="sim">${esc(textoBotao)}</button>
        </div>
      </div>`;
    const fechar = resposta => {
      fundo.remove();
      document.removeEventListener('keydown', teclado);
      resolver(resposta);
    };
    const teclado = e => { if (e.key === 'Escape') fechar(false); };
    fundo.addEventListener('click', e => {
      if (e.target === fundo) return fechar(false);
      const botao = e.target.closest('[data-resposta]');
      if (botao) fechar(botao.dataset.resposta === 'sim');
    });
    document.addEventListener('keydown', teclado);
    document.body.appendChild(fundo);
    fundo.querySelector('[data-resposta="sim"]').focus();
  });
}

// Mensagem rápida no rodapé da tela
function avisar(mensagem, tipo = 'sucesso') {
  let toast = document.querySelector('#toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = mensagem;
  toast.className = `toast visivel ${tipo}`;
  clearTimeout(avisar.timer);
  avisar.timer = setTimeout(() => toast.classList.remove('visivel'), 3200);
}

// Desenho do geladinho (saquinho) na cor do sabor
function svgGeladinho(cor, tamanho = 64) {
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M24 6h16l-4 6h-8z" fill="#fff" stroke="#d9cfc9" stroke-width="1.5"/>
    <rect x="22" y="11" width="20" height="48" rx="10" fill="#fff" stroke="#d9cfc9" stroke-width="1.5"/>
    <rect x="25" y="18" width="14" height="38" rx="7" fill="${cor}"/>
    <rect x="28" y="22" width="3" height="20" rx="1.5" fill="#fff" opacity=".45"/>
  </svg>`;
}

// Baixa um texto como arquivo (CSV, JSON)
function baixarArquivo(nome, texto, tipo = 'text/csv;charset=utf-8') {
  const conteudo = tipo.startsWith('text/csv') ? '﻿' + texto : texto;
  const arquivo = new Blob([conteudo], { type: tipo });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(arquivo);
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
