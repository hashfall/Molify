import { conectarAjudaIA } from "../aiHelper.js";

const botao = document.getElementById("btnIA");
const resposta = document.getElementById("respostaIA");

conectarAjudaIA(
  botao,
  resposta,
  () => {
    if (document.getElementById("result").hidden) return "";
    return [
      `Equação: ${document.getElementById("resEq").textContent}`,
      `${document.getElementById("finalLabel").textContent}: ${document.getElementById("finalValue").textContent}`,
      document.getElementById("finalSub").textContent,
      `Resumo dos cálculos: ${document.getElementById("stats").textContent}`,
      document.getElementById("steps").textContent,
    ].join("\n");
  },
  "Explique o cálculo estequiométrico apresentado, incluindo a proporção da equação, a conversão entre massa e mols e o efeito do rendimento quando aplicável."
);
