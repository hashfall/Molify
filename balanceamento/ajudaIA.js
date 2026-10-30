import { solicitarExplicacao, renderizarMarkdownSeguro } from "../aiHelper.js";

const btnIA = document.getElementById("btnIA");
const secaoIA = document.getElementById("iaResponseSection");
const respostaIA = document.getElementById("iaResponseBody");

btnIA.addEventListener("click", async () => {
  const equacao = document.getElementById("resultString")?.textContent?.trim();
  if (!equacao) {
    alert("Calcule e gere o resultado da equação antes de pedir a explicação.");
    return;
  }

  const conteudoOriginal = btnIA.innerHTML;
  btnIA.disabled = true;
  btnIA.textContent = "Consultando...";
  secaoIA.hidden = false;
  respostaIA.textContent = "A IA está explicando o balanceamento...";

  try {
    const explicacao = await solicitarExplicacao(
      `Equação balanceada: ${equacao}`,
      "Explique o balanceamento desta equação e como os coeficientes preservam a quantidade de átomos de cada elemento."
    );
    renderizarMarkdownSeguro(respostaIA, explicacao);
  } catch (erro) {
    respostaIA.textContent = `Erro ao consultar a IA: ${erro.message}`;
  } finally {
    btnIA.disabled = false;
    btnIA.innerHTML = conteudoOriginal;
  }
});