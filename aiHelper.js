const WORKER_URL = "https://explicador2.matheus2023origin.workers.dev/";

export async function solicitarExplicacao(contexto, pergunta) {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "Você é um tutor de química. Responda em português com no máximo 4 frases curtas e 90 palavras. Use somente texto simples, sem Markdown, títulos, listas, tabelas ou blocos de código. Explique o resultado com os dados fornecidos, sem inventar valores.",
        },
        {
          role: "user",
          content: `${pergunta}\n\nDados do cálculo:\n${contexto}`,
        },
      ],
      max_completion_tokens: 180,
      temperature: 0.2,
      chat_template_kwargs: { enable_thinking: false },
    }),
  });
  const resultado = await response.json().catch(() => null);

  if (!response.ok) {
    const erro = resultado?.errors?.map(item => item.message).filter(Boolean).join("; ");
    throw new Error(erro || `O Worker respondeu com status ${response.status}.`);
  }

  const conteudo = resultado?.result?.choices?.[0]?.message?.content
    ?? resultado?.choices?.[0]?.message?.content
    ?? resultado?.result?.response
    ?? resultado?.response;
  const resposta = typeof conteudo === "string"
    ? conteudo
    : Array.isArray(conteudo)
      ? conteudo.map(item => typeof item === "string" ? item : item?.text || "").join("\n")
      : "";

  if (resultado?.success === false || !resposta.trim()) {
    const erro = resultado?.errors?.map(item => item.message).filter(Boolean).join("; ");
    throw new Error(erro || "A IA não retornou uma resposta.");
  }

  return resposta.trim();
}

export function renderizarMarkdownSeguro(elemento, texto) {
  elemento.textContent = String(texto)
    .replace(/\r\n?/g, "\n")
    .replace(/```/g, "")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  elemento.style.whiteSpace = "pre-line";
}