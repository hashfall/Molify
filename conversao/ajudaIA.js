import { conectarAjudaIA } from "../aiHelper.js";

const botao = document.getElementById("btnIA");
const resposta = document.getElementById("respostaIA");

conectarAjudaIA(
  botao,
  resposta,
  () => {
    if (botao.hidden) return "";
    const valor = document.getElementById("valor").value;
    const origem = document.getElementById("origem");
    const destino = document.getElementById("destino");
    return `Valor original: ${valor} ${origem.options[origem.selectedIndex].text}. ${document.getElementById("descricaoResultado").textContent} Unidade de destino: ${destino.options[destino.selectedIndex].text}.`;
  },
  "Explique a conversão de massa realizada, a relação entre as unidades de origem e destino e como o fator de conversão foi aplicado."
);
