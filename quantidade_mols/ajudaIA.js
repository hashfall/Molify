import { conectarAjudaIA } from "../aiHelper.js";

const botao = document.getElementById("btnIA");
const resposta = document.getElementById("respostaIA");
const tipo = botao?.dataset.tipo;
const campos = {
  massa: document.getElementById("massa"),
  massaMolar: document.getElementById("massaMolar"),
  mols: document.getElementById("mols"),
  volumeMolar: document.getElementById("volumeMolar"),
  resultadoMols: document.getElementById("resultadoMols"),
  resultadoParticulas: document.getElementById("resultadoParticulas"),
  resultadoLitros: document.getElementById("resultadoLitros"),
  resultadoMl: document.getElementById("resultadoMl"),
};

const perguntas = {
  mols: "Explique como a massa e a massa molar foram usadas para calcular a quantidade de mols e o número de partículas.",
  peso: "Explique como a massa e a massa molar foram usadas para calcular os mols e o volume nas CNTP.",
  litros: "Explique como a quantidade de mols e o volume molar foram usados para calcular litros e mililitros.",
};

function obterContexto() {
  if (tipo === "mols") {
    return `Massa: ${campos.massa.value} g. Massa molar: ${campos.massaMolar.value} g/mol. Resultado: ${campos.resultadoMols.textContent}; ${campos.resultadoParticulas.textContent}. Fórmulas: n = m / M e N = n × 6,022 × 10²³.`;
  }
  if (tipo === "peso") {
    return `Massa: ${campos.massa.value} g. Massa molar: ${campos.massaMolar.value} g/mol. Resultado: ${campos.resultadoMols.textContent}; ${campos.resultadoLitros.textContent}. Volume molar de referência: 22,4 L/mol nas CNTP.`;
  }
  if (tipo === "litros") {
    return `Quantidade: ${campos.mols.value} mol. Volume molar: ${campos.volumeMolar.value} L/mol. Resultado: ${campos.resultadoLitros.textContent}; ${campos.resultadoMl.textContent}.`;
  }
  return "";
}

conectarAjudaIA(botao, resposta, obterContexto, perguntas[tipo]);
