
import { solicitarExplicacao, renderizarMarkdownSeguro } from "../aiHelper.js";

const calcularBtn = document.getElementById("calcular");
const btnIA = document.getElementById("btnIAMols");
const respostaIA = document.getElementById("respostaIAMols");
const campoComposto = document.getElementById("componente");
const campoMols = document.getElementById("valor_mols");
const campoMassaMolar = document.getElementById("massa-molar");
let resultadoAtual = null;

const compostoSelecionado = document.getElementById("compostoSelecionado");
const compostoDaUrl = new URLSearchParams(window.location.search).get("composto");
if (compostoSelecionado && compostoDaUrl) {
	compostoSelecionado.textContent = `Composto selecionado: ${compostoDaUrl}`;
	compostoSelecionado.hidden = false;
}

const irCalculadora = document.getElementById("irCalculadora");
if (irCalculadora) {
	irCalculadora.addEventListener("click", () => {
		const formula = campoComposto?.value.trim().replace(/[₀-₉]/g, digito => "₀₁₂₃₄₅₆₇₈₉".indexOf(digito));
		const destino = formula ? `mols.html?composto=${encodeURIComponent(formula)}` : "mols.html";
		window.location.href = destino;
	});
}

function calcularMols() {
	const mols = Number(campoMols.value.trim().replace(",", "."));
	const massaMolar = Number(campoMassaMolar.value.trim().replace(",", "."));
	if (!Number.isFinite(mols) || mols <= 0 || !Number.isFinite(massaMolar) || massaMolar <= 0) {
		alert("Informe uma quantidade de mols e uma massa molar maiores que zero.");
		return;
	}

	const massa = mols * massaMolar;
	const volume = mols * 22.4;
	document.getElementById("peso").textContent = `${massa.toFixed(2)} g`;
	document.getElementById("volume").textContent = `${volume.toFixed(2)} L`;
	resultadoAtual = { mols, massaMolar, massa, volume };
	btnIA.hidden = false;
	respostaIA.hidden = true;
	respostaIA.textContent = "";
}

if (calcularBtn) calcularBtn.addEventListener("click", calcularMols);
for (const campo of [campoMols, campoMassaMolar]) {
	campo?.addEventListener("input", () => {
		resultadoAtual = null;
		if (btnIA) btnIA.hidden = true;
		if (respostaIA) {
			respostaIA.hidden = true;
			respostaIA.textContent = "";
		}
	});
}

if (btnIA && respostaIA) {
	btnIA.addEventListener("click", async () => {
		if (!resultadoAtual) return;
		const textoOriginal = btnIA.textContent;
		const formula = compostoDaUrl || "composto informado";
		const { mols, massaMolar, massa, volume } = resultadoAtual;
		btnIA.disabled = true;
		btnIA.textContent = "Consultando...";
		respostaIA.hidden = false;
		respostaIA.textContent = "A IA está explicando o cálculo...";

		try {
			const explicacao = await solicitarExplicacao(
				`Composto: ${formula}. Quantidade: ${mols} mol. Massa molar: ${massaMolar} g/mol. Massa calculada: ${massa.toFixed(2)} g. Volume calculado: ${volume.toFixed(2)} L, considerando 22,4 L/mol nas CNTP.`,
				"Explique em poucas frases as relações entre mols, massa molar e volume molar nas CNTP, mencionando que o volume pressupõe um gás ideal."
			);
			renderizarMarkdownSeguro(respostaIA, explicacao);
		} catch (erro) {
			respostaIA.textContent = `Erro ao consultar a IA: ${erro.message}`;
		} finally {
			btnIA.disabled = false;
			btnIA.textContent = textoOriginal;
		}
	});
}
