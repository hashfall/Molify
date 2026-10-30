/* Balanceador de equações — Balanceamento de Equação
   Estado da equação viaja pela URL (?eq=...) entre esta página e a galeria. */
const ROTULOS = ["Reagente 1", "Reagente 2", "Produto 1", "Produto 2"];
const SEPARADORES = ["+", "→", "+"];
const MAX_PARTES = 4;

let estado = carregarEstado();

function carregarEstado() {
  try {
    const eq = new URLSearchParams(location.search).get("eq");
    if (eq) {
      const d = JSON.parse(eq);
      if (Array.isArray(d) && d.length === 4) return d.map((t) => (Array.isArray(t) ? t.filter((p) => p && p.s && p.n > 0) : []));
    }
  } catch (e) { }
  return [[], [], [], []];
}

const sub = (n) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[d]);
const formulaTexto = (partes) => partes.map((p) => p.s + (p.n > 1 ? p.n : "")).join("");
const formulaBonita = (partes) => partes.map((p) => p.s + (p.n > 1 ? sub(p.n) : "")).join("");

/* ---------- Cálculo ----------
   Retorna a equação balanceada em string, ex.: "2H2 + O2 = 2H2O + ..." */
function contarAtomos(partes) {
  const c = {};
  partes.forEach((p) => (c[p.s] = (c[p.s] || 0) + p.n));
  return c;
}

function balancear(termos) {
  const atomos = termos.map(contarAtomos);
  const elementos = [...new Set(atomos.flatMap((a) => Object.keys(a)))];
  const sinal = [1, 1, -1, -1]; // reagentes +, produtos −
  const LIM = 40;
  let melhor = null, menorSoma = Infinity;
  for (let a = 1; a <= LIM; a++)
    for (let b = 1; b <= LIM; b++) {
      if (a + b >= menorSoma) break;
      for (let c = 1; c <= LIM; c++)
        for (let d = 1; d <= LIM; d++) {
          const soma = a + b + c + d;
          if (soma >= menorSoma) break;
          const k = [a, b, c, d];
          if (elementos.every((e) => k.reduce((s, x, i) => s + sinal[i] * x * (atomos[i][e] || 0), 0) === 0)) {
            melhor = k;
            menorSoma = soma;
          }
        }
    }
  if (!melhor) return null;
  const termo = (i) => (melhor[i] > 1 ? melhor[i] : "") + formulaTexto(termos[i]);
  return {
    coef: melhor,
    texto: `${termo(0)} + ${termo(1)} = ${termo(2)} + ${termo(3)}`,
    bonito: `${melhor[0] > 1 ? melhor[0] : ""}${formulaBonita(termos[0])} + ${melhor[1] > 1 ? melhor[1] : ""}${formulaBonita(termos[1])} → ${melhor[2] > 1 ? melhor[2] : ""}${formulaBonita(termos[2])} + ${melhor[3] > 1 ? melhor[3] : ""}${formulaBonita(termos[3])}`
  };
}

/* ---------- Interface ---------- */
const $ = (id) => document.getElementById(id);

function irParaGaleria(slot) {
  location.href = "elementos/index.html?slot=" + slot + "&eq=" + encodeURIComponent(JSON.stringify(estado));
}

function persistirURL() {
  history.replaceState(null, "", "?eq=" + encodeURIComponent(JSON.stringify(estado)));
}

function render() {
  const eq = $("equation");
  eq.innerHTML = "";
  estado.forEach((partes, i) => {
    const card = document.createElement("div");
    card.className = "slot" + (partes.length ? " filled" : "");
    const label = document.createElement("span");
    label.className = "slot-label";
    label.textContent = ROTULOS[i];
    card.appendChild(label);

    const formula = document.createElement("div");
    formula.className = "slot-formula";
    if (!partes.length) {
      const vazio = document.createElement("button");
      vazio.type = "button";
      vazio.className = "slot-empty";
      vazio.innerHTML = "<b>+</b><span>Escolher elemento</span>";
      vazio.onclick = () => irParaGaleria(i);
      formula.appendChild(vazio);
    } else {
      partes.forEach((p, j) => {
        const chip = document.createElement("span");
        chip.className = "chip-el";
        chip.innerHTML = `${p.s}${p.n > 1 ? `<sub>${p.n}</sub>` : ""}`;
        const x = document.createElement("button");
        x.type = "button";
        x.className = "chip-x";
        x.setAttribute("aria-label", "Remover " + p.s);
        x.textContent = "×";
        x.onclick = () => { partes.splice(j, 1); atualizar(); };
        chip.appendChild(x);
        formula.appendChild(chip);
      });
    }
    card.appendChild(formula);

    if (partes.length) {
      const add = document.createElement("button");
      add.type = "button";
      add.className = "slot-add";
      add.textContent = "+ elemento";
      add.disabled = partes.length >= MAX_PARTES;
      add.onclick = () => irParaGaleria(i);
      card.appendChild(add);
    }
    eq.appendChild(card);
    if (i < 3) {
      const s = document.createElement("span");
      s.className = "sep";
      s.textContent = SEPARADORES[i];
      eq.appendChild(s);
    }
  });
}

function atualizar() {
  persistirURL();
  render();
  const completo = estado.every((t) => t.length);
  $("btnCalc").disabled = !completo;
  $("hint").hidden = completo;
  $("result").hidden = true;
  $("error").hidden = true;
}

$("btnCalc").onclick = () => {
  const r = balancear(estado);
  if (!r) {
    $("result").hidden = true;
    $("error").hidden = false;
    $("error").textContent = "Não foi possível balancear: os elementos escolhidos não fecham uma equação (coeficientes até 40).";
    return;
  }
  $("error").hidden = true;
  $("result").hidden = false;
  $("resultString").textContent = r.texto;
  $("resultPretty").textContent = r.bonito;
  window.ultimoResultado = r.texto;
};
$("btnReset").onclick = () => { estado = [[], [], [], []]; atualizar(); };
$("btnCopy").onclick = async () => {
  try { await navigator.clipboard.writeText(window.ultimoResultado || ""); $("btnCopy").textContent = "Copiado!"; }
  catch (e) { $("btnCopy").textContent = "Copie manualmente"; }
  setTimeout(() => ($("btnCopy").textContent = "Copiar"), 1600);
};
atualizar();
