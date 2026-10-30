/* =====================================================================
   CALCULADORA ESTEQUIOMÉTRICA
   Fluxo: ler formulário -> interpretar equação -> checar balanceamento
          -> calcular (massa -> mols -> mols do produto -> massa) -> mostrar
   ===================================================================== */
import { solicitarExplicacao, renderizarMarkdownSeguro } from "../aiHelper.js";

// ---------- 1. Massas atômicas (g/mol) ----------
const massas = {
    H: 1.008, He: 4.003, Li: 6.94, Be: 9.012, B: 10.81, C: 12.011, N: 14.007,
    O: 15.999, F: 18.998, Ne: 20.18, Na: 22.990, Mg: 24.305, Al: 26.982,
    Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948, K: 39.098,
    Ca: 40.078, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845,
    Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, As: 74.922,
    Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Ag: 107.868,
    Cd: 112.414, Sn: 118.710, Sb: 121.760, I: 126.904, Ba: 137.327,
    W: 183.84, Pt: 195.084, Au: 196.967, Hg: 200.592, Pb: 207.2, U: 238.029
};

// ---------- 2. Funções de química ----------

// Troca subscritos unicode (H₂O) por números normais (H2O).
const normalizar = t => t.replace(/[₀-₉]/g, d => "₀₁₂₃₄₅₆₇₈₉".indexOf(d));

/* Transforma uma fórmula em contagem de átomos: "Ca(OH)2" -> {Ca:1, O:2, H:2}.
   Usa uma pilha: cada "(" abre um novo grupo, e o ")" multiplica e soma ao grupo anterior.
   Também aceita hidratos: "CuSO4·5H2O". */
function contarAtomos(formula) {
    const total = {};

    formula.split(/[·*]/).forEach((parte, idx) => {
        let mult = 1;
        if (idx > 0) {                                  // coeficiente do hidrato (ex.: 5H2O)
            const c = parte.match(/^\d+/);
            if (c) { mult = Number(c[0]); parte = parte.slice(c[0].length); }
        }

        const pilha = [{}];
        const re = /([A-Z][a-z]?)(\d*)|[(\[]|[)\]](\d*)/g;
        let m, pos = 0;

        while ((m = re.exec(parte)) && m.index === pos) {
            pos = re.lastIndex;
            const topo = pilha[pilha.length - 1];

            if (m[1]) {                                  // elemento (ex.: Fe2)
                if (massas[m[1]] === undefined) throw Error("Elemento desconhecido: " + m[1]);
                topo[m[1]] = (topo[m[1]] || 0) + (Number(m[2]) || 1);
            } else if (/[(\[]/.test(m[0])) {             // abriu parêntese
                pilha.push({});
            } else {                                     // fechou parêntese
                if (pilha.length < 2) throw Error("Parênteses inválidos em " + formula + ".");
                const grupo = pilha.pop(), n = Number(m[3]) || 1;
                const acima = pilha[pilha.length - 1];
                for (const el in grupo) acima[el] = (acima[el] || 0) + grupo[el] * n;
            }
        }

        if (pos !== parte.length || pilha.length !== 1 || !parte) {
            throw Error("Fórmula inválida: \"" + formula + "\". Confira letras maiúsculas/minúsculas e parênteses.");
        }
        for (const el in pilha[0]) total[el] = (total[el] || 0) + pilha[0][el] * mult;
    });

    return total;
}

// Massa molar = soma (massa do átomo × quantidade).
const massaMolar = atomos =>
    Object.entries(atomos).reduce((soma, [el, n]) => soma + massas[el] * n, 0);

// Lê um lado da equação: "2H2 + O2" -> [{formula:"H2", coef:2, atomos:{H:2}}, ...]
function lerLado(texto) {
    return texto.split("+").map(item => {
        const m = item.trim().match(/^(\d*)\s*(\S.*)$/);
        if (!m) throw Error("Há uma substância vazia na equação. Confira os sinais +.");
        const formula = m[2].replace(/\s+/g, "");
        return { formula, coef: Number(m[1]) || 1, atomos: contarAtomos(formula) };
    });
}

// Soma os átomos de um lado inteiro (já multiplicando pelos coeficientes).
function somarLado(lado) {
    const soma = {};
    lado.forEach(s => {
        for (const el in s.atomos) soma[el] = (soma[el] || 0) + s.atomos[el] * s.coef;
    });
    return soma;
}

// Formata números no padrão brasileiro (vírgula decimal).
const fmt = (n, casas = 4) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas });

// ---------- 3. Cálculo principal ----------
function calcular(evento) {
    evento.preventDefault();                             // impede a página de recarregar
    const aviso = document.getElementById("aviso");
    const saida = document.getElementById("saida");

    try {
        const equacao = normalizar(document.getElementById("equacao").value)
            .replace(/⟶|→|=>|->|=/g, "->");
        const reagente = normalizar(document.getElementById("reagente").value).replace(/\s+/g, "");
        const produto = normalizar(document.getElementById("produto").value).replace(/\s+/g, "");
        const massa = Number(document.getElementById("massa").value);

        if (!Number.isFinite(massa) || massa <= 0) throw Error("Digite uma massa maior que zero.");

        const lados = equacao.split("->");
        if (lados.length !== 2) throw Error("Equação inválida. Use uma única seta (->) para separar os lados.");

        const ladoR = lerLado(lados[0]);
        const ladoP = lerLado(lados[1]);

        // Procura o reagente e o produto dentro da equação.
        const R = ladoR.find(s => s.formula === reagente);
        const P = ladoP.find(s => s.formula === produto);
        if (!R) throw Error("O reagente \"" + reagente + "\" não está no lado esquerdo da equação.");
        if (!P) throw Error("O produto \"" + produto + "\" não está no lado direito da equação.");

        // Balanceamento: cada elemento precisa ter a mesma quantidade nos dois lados.
        const aR = somarLado(ladoR), aP = somarLado(ladoP);
        const faltam = [...new Set([...Object.keys(aR), ...Object.keys(aP)])]
            .filter(el => (aR[el] || 0) !== (aP[el] || 0));
        if (faltam.length) throw Error("A equação não está balanceada (confira: " + faltam.join(", ") + ").");

        // Estequiometria: massa -> mols -> mols do produto -> massa.
        const mmR = massaMolar(R.atomos);
        const mmP = massaMolar(P.atomos);
        const nR = massa / mmR;
        const nP = nR * P.coef / R.coef;
        const final = nP * mmP;

        // Mostra os cartões de resultado.
        const set = (id, txt) => (document.getElementById(id).textContent = txt);
        set("r-mmR", fmt(mmR, 3) + " g/mol");
        set("r-nR", fmt(nR) + " mol");
        set("r-nP", fmt(nP) + " mol");
        set("r-mmP", fmt(mmP, 3) + " g/mol");
        set("r-final", fmt(final, 3) + " g");

        // Passo a passo explicado.
        set("resultado",
            "1) Massa molar\n" +
            "   " + reagente + " = " + fmt(mmR, 3) + " g/mol\n" +
            "   " + produto + " = " + fmt(mmP, 3) + " g/mol\n\n" +
            "2) Massa -> mols do reagente\n" +
            "   n = m / M = " + fmt(massa) + " / " + fmt(mmR, 3) + " = " + fmt(nR) + " mol\n\n" +
            "3) Proporção da equação\n" +
            "   " + R.coef + " mol " + reagente + " : " + P.coef + " mol " + produto + "\n" +
            "   n(" + produto + ") = " + fmt(nR) + " × " + P.coef + "/" + R.coef + " = " + fmt(nP) + " mol\n\n" +
            "4) Mols -> massa do produto\n" +
            "   m = n × M = " + fmt(nP) + " × " + fmt(mmP, 3) + " = " + fmt(final, 3) + " g");

        aviso.hidden = true;
        saida.hidden = false;
        document.getElementById("btnIAEsteq").hidden = false;
        const respostaIA = document.getElementById("respostaIAEsteq");
        respostaIA.hidden = true;
        respostaIA.textContent = "";
    } catch (erro) {
        aviso.hidden = false;
        aviso.classList.add("erro");
        aviso.textContent = "⚠️ " + erro.message;
        saida.hidden = true;
        return;
    }
    aviso.classList.remove("erro");
}

// ---------- 4. Eventos ----------
const form = document.getElementById("formulario");
form.addEventListener("submit", calcular);               // vale para clique e tecla Enter
form.addEventListener("input", () => {
    document.getElementById("btnIAEsteq").hidden = true;
    const respostaIA = document.getElementById("respostaIAEsteq");
    respostaIA.hidden = true;
    respostaIA.textContent = "";
});

const btnIAEsteq = document.getElementById("btnIAEsteq");
const respostaIAEsteq = document.getElementById("respostaIAEsteq");
btnIAEsteq.addEventListener("click", async () => {
    const textoOriginal = btnIAEsteq.textContent;
    const contexto = [
        `Equação balanceada: ${document.getElementById("equacao").value}`,
        `Reagente: ${document.getElementById("reagente").value}`,
        `Massa do reagente: ${document.getElementById("massa").value} g`,
        `Produto desejado: ${document.getElementById("produto").value}`,
        `Passo a passo calculado: ${document.getElementById("resultado").textContent}`,
    ].join("\n");

    btnIAEsteq.disabled = true;
    btnIAEsteq.textContent = "Consultando...";
    respostaIAEsteq.hidden = false;
    respostaIAEsteq.textContent = "A IA está explicando o cálculo...";

    try {
        const explicacao = await solicitarExplicacao(
            contexto,
            "Explique como a massa do reagente é convertida em mols, como a proporção dos coeficientes determina os mols do produto e como se obtém a massa final."
        );
        renderizarMarkdownSeguro(respostaIAEsteq, explicacao);
    } catch (erro) {
        respostaIAEsteq.textContent = `Erro ao consultar a IA: ${erro.message}`;
    } finally {
        btnIAEsteq.disabled = false;
        btnIAEsteq.textContent = textoOriginal;
    }
});

// Exemplos prontos: o valor da opção é "equação|reagente|massa|produto".
document.getElementById("exemplo").addEventListener("change", e => {
    const [eq, reag, massa, prod] = e.target.value.split("|");
    document.getElementById("equacao").value = eq;
    document.getElementById("reagente").value = reag;
    document.getElementById("massa").value = massa;
    document.getElementById("produto").value = prod;
    form.requestSubmit();                                // já calcula ao escolher
});

// "Restaurar exemplo": volta ao padrão e limpa o resultado.
form.addEventListener("reset", () => {
    const aviso = document.getElementById("aviso");
    aviso.hidden = false;
    aviso.classList.remove("erro");
    aviso.textContent = "Preencha os campos e clique em \"Calcular massa do produto\".";
    document.getElementById("saida").hidden = true;
});
