import { solicitarExplicacao, renderizarMarkdownSeguro } from "../aiHelper.js";

const unidades = {
    t: 1000000,
    kg: 1000,
    hg: 100,
    dag: 10,
    g: 1,
    dg: 0.1,
    cg: 0.01,
    mg: 0.001,
    lb: 453.59237,
};

function converterMassa(valor, origem, destino) {

    if (
        valor === "" ||
        valor === null ||
        !Number.isFinite(Number(valor))
    ) {
        throw new Error("Informe um valor numérico válido.");
    }

    if (!(origem in unidades) || !(destino in unidades)) {
        throw new Error("Unidade de massa inválida.");
    }

    const valorEmGramas = Number(valor) * unidades[origem];
    const resultado = valorEmGramas / unidades[destino];
    return resultado;
}

const formulario = document.getElementById("formConversor");
const campoValor = document.getElementById("valor");
const campoOrigem = document.getElementById("origem");
const campoDestino = document.getElementById("destino");
const divResultado = document.getElementById("resultado");
const btnIA = document.getElementById("btnIAConversao");
const respostaIA = document.getElementById("respostaIAConversao");

formulario.addEventListener("submit", function(evento) {

    evento.preventDefault();
    const valor = campoValor.value;
    const origem = campoOrigem.value;
    const destino = campoDestino.value;

    try {
        const resultado = converterMassa(valor, origem, destino);
        const resultadoFormatado = resultado.toLocaleString("pt-BR", {
            maximumFractionDigits: 12
        });

        divResultado.textContent = `${valor} ${origem} = ${resultadoFormatado} ${destino}`;
        btnIA.hidden = false;
        respostaIA.hidden = true;
        respostaIA.textContent = "";

    } catch (erro) {
        divResultado.textContent = erro.message;
        btnIA.hidden = true;
        respostaIA.hidden = true;
    }
});

function invalidarAjudaConversao() {
    btnIA.hidden = true;
    respostaIA.hidden = true;
    respostaIA.textContent = "";
}

[campoValor, campoOrigem, campoDestino].forEach(campo => {
    campo.addEventListener("input", invalidarAjudaConversao);
    campo.addEventListener("change", invalidarAjudaConversao);
});

btnIA.addEventListener("click", async () => {
    const valor = campoValor.value;
    const origem = campoOrigem.value;
    const destino = campoDestino.value;
    const resultado = divResultado.textContent;
    const textoOriginal = btnIA.textContent;

    btnIA.disabled = true;
    btnIA.textContent = "Consultando...";
    respostaIA.hidden = false;
    respostaIA.textContent = "A IA está explicando a conversão...";

    try {
        const explicacao = await solicitarExplicacao(
            `Valor informado: ${valor} ${origem}. Resultado: ${resultado}.`,
            "Explique em poucas frases a conversão entre estas unidades de massa e confira o resultado."
        );
        renderizarMarkdownSeguro(respostaIA, explicacao);
    } catch (erro) {
        respostaIA.textContent = `Erro ao consultar a IA: ${erro.message}`;
    } finally {
        btnIA.disabled = false;
        btnIA.textContent = textoOriginal;
    }
});