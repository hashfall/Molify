"use strict";
import { solicitarExplicacao, renderizarMarkdownSeguro } from "../aiHelper.js";

/* Calculadora de mols — usa Vm = 22,4 L/mol nas CNTP (0 °C, 1 atm). */
const VOLUME_MOLAR_CNTP = 22.4;
const compostos = [
  { nome: "Água (H₂O)", formula: "H2O", massa: 18 },
  { nome: "Dióxido de carbono (CO₂)", formula: "CO2", massa: 44 },
  { nome: "Cloreto de sódio (NaCl)", formula: "NaCl", massa: 58 },
  { nome: "Metano (CH₄)", formula: "CH4", massa: 16 },
  { nome: "Oxigénio (O₂)", formula: "O2", massa: 32 }
];
const modos = {
  mols: { titulo: "Mols", instrucao: "Informe a quantidade de mols", placeholder: "Ex.: 2,5", unidade: "mol", saidaA: "Peso (massa)", saidaB: "Volume (litros)", unidadeA: "g", unidadeB: "L", cor: "#8b5cf6" },
  peso: { titulo: "Peso", instrucao: "Informe a massa", placeholder: "Ex.: 100", unidade: "g", saidaA: "Mols", saidaB: "Volume (litros)", unidadeA: "mol", unidadeB: "L", cor: "#10b981" },
  litros: { titulo: "Litros", instrucao: "Informe o volume", placeholder: "Ex.: 22,4", unidade: "L", saidaA: "Mols", saidaB: "Peso (massa)", unidadeA: "mol", unidadeB: "g", cor: "#2f8cff" }
};
const icones = {
  mols: '<svg viewBox="0 0 32 32" width="27" height="27" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 3h10M13 3v10L5 27a2 2 0 0 0 2 3h18a2 2 0 0 0 2-3l-8-14V3"/><path d="M10 23h12M13 19h7"/></svg>',
  peso: '<svg viewBox="0 0 32 32" width="27" height="27" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 10V7a5 5 0 0 1 10 0v3M8 10h16l4 18H4z"/><path d="M13 17h6"/></svg>',
  litros: '<svg viewBox="0 0 32 32" width="27" height="27" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3S6 15 6 21a10 10 0 0 0 20 0C26 15 16 3 16 3z"/></svg>',
  composto: '<svg viewBox="0 0 32 32" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="16" r="3"/><circle cx="24" cy="7" r="3"/><circle cx="24" cy="25" r="3"/><path d="m10 15 11-7M10 17l11 7"/></svg>',
  calcular: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2"/></svg>',
  pesquisar: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>'
};

const app = document.getElementById("app");
let modoAtual = "mols";
let telaAtual = "inicio";
let compostoAtual = compostos[0];
let resultados = null;

function formatar(valor) {
  if (!Number.isFinite(valor)) return "—";
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 4 }).format(valor);
}
function normalizarNumero(valor) {
  // Aceita vírgula decimal; remove espaços e permite separador de milhar habitual.
  const texto = String(valor ?? "").trim().replace(/\s/g, "");
  if (!texto) return NaN;
  return Number(texto.replace(",", "."));
}
function cabecalho(titulo, mostrarVoltar = true) {
  return `<header class="header">
    <button class="icon-btn" type="button" data-acao="voltar" aria-label="Voltar" ${mostrarVoltar ? "" : "style=\"visibility:hidden\""}>‹</button>
    <h1>${titulo}</h1>
    <button class="icon-btn" type="button" data-acao="info" aria-label="Informações">⚙</button>
  </header>`;
}
function desenharSeparadores() {
  return `<nav class="tabs" aria-label="Tipo de cálculo">${Object.entries(modos).map(([id, m]) => `
    <button class="tab ${modoAtual === id ? "active" : ""}" type="button" data-acao="modo" data-modo="${id}" aria-pressed="${modoAtual === id}">
      <span class="circle">${icones[id]}</span><span>${m.titulo}</span>
    </button>`).join("")}</nav>`;
}
function desenharInicio() {
  app.dataset.mode = modoAtual;
  app.innerHTML = `${cabecalho("", false)}
    <section class="card" style="text-align:center;padding:24px 16px;background:radial-gradient(ellipse at 50% 20%,rgba(110,35,200,.36),transparent 68%),linear-gradient(180deg,rgba(20,35,85,.55),rgba(10,20,55,.7))">
      <div style="font-size:54px;line-height:1.1">⚗</div><h2 style="font-size:24px;margin:3px 0">Bem Vindo ao</h2>
      <div style="font-size:56px;line-height:1.05;font-weight:800;background:linear-gradient(90deg,#bb37f4,#3589ff);color:transparent;background-clip:text">Molify</div>
      <p style="max-width:290px;margin:10px auto 0;font-size:14px">Converte entre mols, massa e volume de forma rápida e simples.</p>
    </section>
    ${Object.entries(modos).map(([id, m]) => `<button class="card" type="button" data-acao="modo" data-modo="${id}" style="width:100%;display:flex;align-items:center;gap:13px;text-align:left;color:var(--text);cursor:pointer">
      <span style="width:52px;height:52px;flex:none;border-radius:50%;display:grid;place-items:center;color:${m.cor};background:color-mix(in srgb,${m.cor} 28%,#0a1230)">${icones[id]}</span>
      <span style="flex:1"><b>${m.titulo}</b><br><small style="color:var(--muted)">${id === "mols" ? "Converte mols em peso e litros" : id === "peso" ? "Converte peso em mols e litros" : "Converte litros em mols e peso"}</small></span><span style="font-size:24px">›</span>
    </button>`).join("")}
    <p class="note">ⓘ &nbsp;Use a massa molar do composto para obter resultados precisos.</p>`;
}
function desenharCalculadora() {
  telaAtual = "calculadora";
  app.dataset.mode = modoAtual;
  const m = modos[modoAtual];
  app.innerHTML = `${cabecalho(m.titulo)}${desenharSeparadores()}
    <section class="card">
      <div class="field"><label for="quantidade">${m.instrucao}</label><div class="input-wrap"><span class="ico">${icones[modoAtual]}</span><input id="quantidade" type="text" inputmode="decimal" placeholder="${m.placeholder}" autocomplete="off"><span class="unit">${m.unidade}</span></div></div>
      <div class="field"><label for="massa-molar">Massa molar do composto</label><div class="input-wrap"><span class="ico">${icones.composto}</span><input id="massa-molar" type="text" inputmode="decimal" placeholder="Ex.: 58,44" value="${formatar(compostoAtual.massa)}" autocomplete="off"><span class="unit">g/mol</span></div></div>
      <p class="hint">Ex.: ${compostos.slice(0,3).map(c => `<button class="hintbtn" type="button" data-acao="selecionar" data-formula="${c.formula}">${c.nome} = ${formatar(c.massa)}</button>`).join(" &nbsp;|&nbsp; ")}</p>
      <button class="btn" type="button" data-acao="calcular">${icones.calcular} &nbsp; Calcular</button>
      <p class="note" id="erro" role="alert" hidden></p>
    </section>
    <section class="card"><h2>Resultados</h2><div class="results">
      <article class="result"><div class="label">${icones[modoAtual === "peso" ? "mols" : "peso"]} ${m.saidaA}</div><div class="value"><span id="resultado-a">${resultados?.a ?? "—"}</span> <small>${m.unidadeA}</small></div></article>
      <article class="result"><div class="label">${icones[modoAtual === "litros" ? "peso" : "litros"]} ${m.saidaB}</div><div class="value"><span id="resultado-b">${resultados?.b ?? "—"}</span> <small>${m.unidadeB}</small></div></article>
    </div><p class="note">ⓘ &nbsp;Para o cálculo de volume, foi considerado gás ideal nas CNTP (0 °C e 1 atm).</p>
      <button class="btn" type="button" data-acao="abrir-compostos">Escolher composto</button>
      <button class="btn" id="btnIAVolume" type="button" data-acao="ajuda-ia" ${resultados ? "" : "hidden"}>Explicar resultado com IA</button>
      <div class="note" id="respostaIAVolume" role="status" aria-live="polite" hidden></div>
    </section>`;
}
function desenharCompostos(filtro = "") {
  telaAtual = "compostos";
  app.dataset.mode = modoAtual;
  const termo = filtro.toLocaleLowerCase("pt-PT");
  const encontrados = compostos.filter(c => `${c.nome} ${c.formula}`.toLocaleLowerCase("pt-PT").includes(termo));
  app.innerHTML = `${cabecalho(modos[modoAtual].titulo)}${desenharSeparadores()}
    <section class="card"><div class="input-wrap"><span class="ico">${icones.pesquisar}</span><input id="pesquisa" type="search" placeholder="Buscar composto..." value="${escaparHTML(filtro)}" autocomplete="off"></div>
    <div id="lista-compostos">${desenharItensCompostos(encontrados)}</div>
    <p class="note">ⓘ &nbsp;Você também pode inserir a massa molar manualmente.</p>
    <button class="btn" type="button" data-acao="continuar">Continuar</button></section>`;
  document.getElementById("pesquisa").addEventListener("input", evento => {
    const lista = document.getElementById("lista-compostos");
    const q = evento.target.value.toLocaleLowerCase("pt-PT");
    lista.innerHTML = desenharItensCompostos(compostos.filter(c => `${c.nome} ${c.formula}`.toLocaleLowerCase("pt-PT").includes(q)));
  });
}
function desenharItensCompostos(lista) {
  if (!lista.length) return '<p class="note">Nenhum composto encontrado.</p>';
  return lista.map(c => `<button class="card" type="button" data-acao="escolher-composto" data-formula="${c.formula}" aria-pressed="${c === compostoAtual}" style="width:100%;display:flex;align-items:center;gap:11px;text-align:left;color:var(--text);cursor:pointer;margin:10px 0 0;border-color:${c === compostoAtual ? "#8b5cf6" : "var(--border-soft)"};background:${c === compostoAtual ? "rgba(100,45,150,.3)" : "rgba(5,12,38,.6)"}">
    <span style="width:38px;height:38px;display:grid;place-items:center;border:1px solid #7042a4;border-radius:9px;color:#d3a1ff">${icones.mols}</span>
    <span style="flex:1;font-size:13px">${c.nome}<br><small style="color:var(--muted)">${formatar(c.massa)} g/mol</small></span>${c === compostoAtual ? '<b aria-label="Selecionado">✓</b>' : ""}</button>`).join("");
}
function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, caracter => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]);
}
function calcular() {
  const quantidade = normalizarNumero(document.getElementById("quantidade")?.value);
  const massaMolar = normalizarNumero(document.getElementById("massa-molar")?.value);
  if (!Number.isFinite(quantidade) || quantidade <= 0) return erro("Introduza uma quantidade válida maior que zero.");
  if (!Number.isFinite(massaMolar) || massaMolar <= 0) return erro("Introduza uma massa molar válida maior que zero.");

  let mols, massa, volume;
  if (modoAtual === "mols") {
    mols = quantidade;
    massa = mols * massaMolar;
    volume = mols * VOLUME_MOLAR_CNTP;
  } else if (modoAtual === "peso") {
    massa = quantidade;
    mols = massa / massaMolar;
    volume = mols * VOLUME_MOLAR_CNTP;
  } else {
    volume = quantidade;
    mols = volume / VOLUME_MOLAR_CNTP;
    massa = mols * massaMolar;
  }

  const a = modoAtual === "mols" ? massa : mols;
  const b = modoAtual === "litros" ? massa : volume;
  resultados = { a: formatar(a), b: formatar(b) };
  document.getElementById("resultado-a").textContent = resultados.a;
  document.getElementById("resultado-b").textContent = resultados.b;
  document.getElementById("btnIAVolume").hidden = false;
  const respostaIA = document.getElementById("respostaIAVolume");
  respostaIA.hidden = true;
  respostaIA.textContent = "";
}
function erro(mensagem) {
  const elemento = document.getElementById("erro");
  if (elemento) { elemento.textContent = mensagem; elemento.hidden = false; }
  else mostrarToast(mensagem);
}
function mostrarToast(mensagem) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = mensagem;
  toast.hidden = false;
  clearTimeout(mostrarToast.timer);
  mostrarToast.timer = setTimeout(() => { toast.hidden = true; }, 2800);
}
function selecionarComposto(formula, voltarAoCalculo = true) {
  const encontrado = compostos.find(c => c.formula === formula);
  if (!encontrado) return;
  compostoAtual = encontrado;
  resultados = null;
  if (voltarAoCalculo) desenharCalculadora();
  else {
    const pesquisa = document.getElementById("pesquisa");
    desenharCompostos(pesquisa?.value || "");
  }
}

async function explicarResultadoIA(botao) {
  if (!resultados) return;

  const quantidade = document.getElementById("quantidade").value;
  const massaMolar = document.getElementById("massa-molar").value;
  const modo = modos[modoAtual];
  const contexto = [
    `Modo de cálculo: ${modo.titulo}.`,
    `Composto: ${compostoAtual.nome} (${compostoAtual.formula}).`,
    `Quantidade informada: ${quantidade} ${modo.unidade}.`,
    `Massa molar: ${massaMolar} g/mol.`,
    `${modo.saidaA}: ${resultados.a} ${modo.unidadeA}.`,
    `${modo.saidaB}: ${resultados.b} ${modo.unidadeB}.`,
    `Volume molar usado: ${VOLUME_MOLAR_CNTP} L/mol nas CNTP.`,
  ].join("\n");
  const respostaIA = document.getElementById("respostaIAVolume");
  const textoOriginal = botao.textContent;

  botao.disabled = true;
  botao.textContent = "Consultando...";
  respostaIA.hidden = false;
  respostaIA.textContent = "A IA está explicando o resultado...";

  try {
    const explicacao = await solicitarExplicacao(
      contexto,
      "Explique em poucas frases como esse resultado foi calculado usando as relações entre mols, massa molar e volume molar. Esclareça a hipótese de gás ideal nas CNTP para o volume."
    );
    renderizarMarkdownSeguro(respostaIA, explicacao);
  } catch (erro) {
    respostaIA.textContent = `Erro ao consultar a IA: ${erro.message}`;
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

app.addEventListener("click", evento => {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;
  switch (botao.dataset.acao) {
    case "modo":
      modoAtual = botao.dataset.modo;
      resultados = null;
      desenharCalculadora();
      break;
    case "voltar":
      if (telaAtual === "compostos") desenharCalculadora();
      else desenharInicio();
      break;
    case "info":
      mostrarToast("Volume molar utilizado: 22,4 L/mol nas CNTP (0 °C e 1 atm). A massa molar pode ser alterada manualmente.");
      break;
    case "calcular": calcular(); break;
    case "ajuda-ia": explicarResultadoIA(botao); break;
    case "abrir-compostos": desenharCompostos(); break;
    case "continuar": desenharCalculadora(); break;
    case "selecionar": selecionarComposto(botao.dataset.formula); break;
    case "escolher-composto": selecionarComposto(botao.dataset.formula, false); break;
  }
});

app.addEventListener("input", evento => {
  if (!evento.target.matches("#quantidade, #massa-molar")) return;
  resultados = null;
  const botaoIA = document.getElementById("btnIAVolume");
  const respostaIA = document.getElementById("respostaIAVolume");
  if (botaoIA) botaoIA.hidden = true;
  if (respostaIA) {
    respostaIA.hidden = true;
    respostaIA.textContent = "";
  }
});

desenharInicio();