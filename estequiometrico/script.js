/* =====================================================================
   CÁLCULO ESTEQUIOMÉTRICO · interface por seleção de elementos
   Depende de ../balanceamento/elementos/elementos.js (lista ELEMENTOS)
   e das imagens em ../balanceamento/elementos/img/.
   Fluxo: montar equação -> checar balanceamento -> escolher conhecido/desejado
          -> calcular (massa -> mols -> mols do alvo -> massa) -> mostrar
   ===================================================================== */

// ---------- 1. Dados ----------
const IMG = "../balanceamento/elementos/img/thumb/";
const MAX_SUBS = 4;      // substâncias por lado
const MAX_PARTES = 6;    // elementos por substância

// Massa atômica (g/mol) pelo número atômico (índice 0 não é usado).
const MASSAS_Z = [0, 1.008, 4.003, 6.94, 9.012, 10.81, 12.011, 14.007, 15.999, 18.998, 20.18, 22.990, 24.305, 26.982,
    28.085, 30.974, 32.06, 35.45, 39.948, 39.098, 40.078, 44.956, 47.867, 50.942, 51.996, 54.938, 55.845, 58.933,
    58.693, 63.546, 65.38, 69.723, 72.630, 74.922, 78.971, 79.904, 83.798, 85.468, 87.62, 88.906, 91.224, 92.906,
    95.95, 98, 101.07, 102.906, 106.42, 107.868, 112.414, 114.818, 118.710, 121.760, 127.60, 126.904, 131.293,
    132.905, 137.327, 138.905, 140.116, 140.908, 144.242, 145, 150.36, 151.964, 157.25, 158.925, 162.500, 164.930,
    167.259, 168.934, 173.045, 174.967, 178.486, 180.948, 183.84, 186.207, 190.23, 192.217, 195.084, 196.967,
    200.592, 204.38, 207.2, 208.980, 209, 210, 222, 223, 226, 227, 232.038, 231.036, 238.029, 237, 244, 243, 247,
    247, 251, 252, 257, 258, 259, 266, 267, 268, 269, 270, 277, 278, 281, 282, 285, 286, 289, 290, 293, 294, 294];

const MASSA = {};
ELEMENTOS.forEach(e => (MASSA[e.s] = MASSAS_Z[e.z]));

const EXEMPLOS = [   // [nome, equação, conhecido, quantidade (g), desejado]
    ["Formação da água", "2H2 + O2 -> 2H2O", "H2", 4, "H2O"],
    ["Amônia (Haber-Bosch)", "N2 + 3H2 -> 2NH3", "N2", 28, "NH3"],
    ["Combustão do metano", "CH4 + 2O2 -> CO2 + 2H2O", "CH4", 16, "CO2"],
    ["Ferrugem", "4Fe + 3O2 -> 2Fe2O3", "Fe", 56, "Fe2O3"],
    ["Decomposição do calcário", "CaCO3 -> CaO + CO2", "CaCO3", 100, "CO2"],
    ["Neutralização", "2NaOH + H2SO4 -> Na2SO4 + 2H2O", "NaOH", 80, "Na2SO4"],
    ["Combustão do etanol", "C2H6O + 3O2 -> 2CO2 + 3H2O", "C2H6O", 46, "H2O"],
    ["Cal hidratada", "Ca(OH)2 + 2HCl -> CaCl2 + 2H2O", "Ca(OH)2", 74, "CaCl2"]
];

// ---------- 2. Química ----------
const $ = id => document.getElementById(id);
const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const subs = t => String(t).replace(/\d/g, d => SUBS[d]);
const normalizar = t => t.replace(/[₀-₉]/g, d => SUBS.indexOf(d));
const fmt = (n, casas = 4) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas });

/* "Ca(OH)2" -> {Ca:1, O:2, H:2}. Pilha: "(" abre grupo, ")" multiplica e soma. */
function contarAtomos(formula) {
    const pilha = [{}], re = /([A-Z][a-z]?)(\d*)|[(\[]|[)\]](\d*)/g;
    let m, pos = 0;
    while ((m = re.exec(formula)) && m.index === pos) {
        pos = re.lastIndex;
        const topo = pilha[pilha.length - 1];
        if (m[1]) {
            if (!MASSA[m[1]]) throw Error("Elemento desconhecido: " + m[1] + ".");
            topo[m[1]] = (topo[m[1]] || 0) + (Number(m[2]) || 1);
        } else if (/[(\[]/.test(m[0])) pilha.push({});
        else {
            if (pilha.length < 2) throw Error("Parênteses inválidos em " + formula + ".");
            const g = pilha.pop(), n = Number(m[3]) || 1, acima = pilha[pilha.length - 1];
            for (const el in g) acima[el] = (acima[el] || 0) + g[el] * n;
        }
    }
    if (pos !== formula.length || pilha.length !== 1 || !formula)
        throw Error('Fórmula inválida: "' + formula + '". Confira maiúsculas/minúsculas e parênteses.');
    return pilha[0];
}

/* Texto -> partes [{s, n, a, hyd}]. Aceita grupos "(OH)2" e hidratos "·5H2O". */
function parseFormula(txt) {
    txt = normalizar(txt).replace(/\s+/g, "");
    if (!txt) throw Error("Digite uma fórmula.");
    if (/^\d/.test(txt)) throw Error("Digite só a fórmula, sem coeficiente (ele é definido no cartão).");
    const pedacos = txt.split(/[·*]/), partes = [];
    if (!pedacos[0]) throw Error("Fórmula inválida: \"" + txt + "\".");
    pedacos.forEach((pc, i) => {
        if (i > 0) {                                     // hidrato: 5H2O
            const c = pc.match(/^\d+/), n = c ? Number(c[0]) : 1, f = c ? pc.slice(c[0].length) : pc;
            partes.push({ s: f, n, a: contarAtomos(f), hyd: true });
            return;
        }
        const re = /(?:([A-Z][a-z]?)|(\((?:[^()]|\([^()]*\))*\)|\[[^\[\]]*\]))(\d*)/y;
        let pos = 0;
        while (pos < pc.length) {
            re.lastIndex = pos;
            const m = re.exec(pc);
            if (!m) throw Error('Fórmula inválida: "' + txt + '". Confira maiúsculas/minúsculas e parênteses.');
            pos = re.lastIndex;
            const n = Number(m[3]) || 1;
            if (m[1]) {
                if (!MASSA[m[1]]) throw Error("Elemento desconhecido: " + m[1] + ".");
                partes.push({ s: m[1], n, a: { [m[1]]: 1 } });
            } else partes.push({ s: m[2], n, a: contarAtomos(m[2].slice(1, -1)) });
        }
    });
    return partes;
}

const texto = ps => ps.map(p => p.hyd ? "·" + (p.n > 1 ? p.n : "") + p.s : p.s + (p.n > 1 ? p.n : "")).join("");
const bonito = ps => subs(texto(ps));
const chipHTML = p => p.hyd ? "·" + (p.n > 1 ? p.n : "") + subs(p.s) : subs(p.s) + (p.n > 1 ? "<sub>" + p.n + "</sub>" : "");

function atomosDe(ps) {
    const t = {};
    ps.forEach(p => { for (const el in p.a) t[el] = (t[el] || 0) + p.a[el] * p.n; });
    return t;
}
const massaMolar = ps => Object.entries(atomosDe(ps)).reduce((s, [el, n]) => s + MASSA[el] * n, 0);

/* "2H2 + O2" -> [{coef:2, parts}, ...] (usado nos exemplos) */
function lerLado(t) {
    return t.split("+").map(item => {
        const m = item.trim().match(/^(\d*)\s*(\S.*)$/);
        if (!m) throw Error("Há uma substância vazia na equação.");
        return { coef: Number(m[1]) || 1, parts: parseFormula(m[2]) };
    });
}

/* Átomos de um lado inteiro, já multiplicados pelos coeficientes. */
function somaLado(lado) {
    const t = {};
    lado.forEach(s => { const a = atomosDe(s.parts); for (const el in a) t[el] = (t[el] || 0) + a[el] * s.coef; });
    return t;
}

/* Encontra os menores coeficientes inteiros (eliminação de Gauss). null se não houver solução única. */
function autoBalancear() {
    const flat = [...S.sides[0].map(s => [1, s]), ...S.sides[1].map(s => [-1, s])];
    const ats = flat.map(([, s]) => atomosDe(s.parts)), n = flat.length;
    const els = [...new Set(ats.flatMap(a => Object.keys(a)))];
    const A = els.map(e => flat.map(([sg], j) => sg * (ats[j][e] || 0)));
    const piv = [];
    let r = 0;
    for (let c = 0; c < n && r < A.length; c++) {
        let p = r;
        for (let i = r + 1; i < A.length; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
        if (Math.abs(A[p][c]) < 1e-9) continue;
        [A[r], A[p]] = [A[p], A[r]];
        const d = A[r][c];
        A[r] = A[r].map(v => v / d);
        for (let i = 0; i < A.length; i++) {
            if (i === r) continue;
            const f = A[i][c];
            if (Math.abs(f) > 1e-12) A[i] = A[i].map((v, k) => v - f * A[r][k]);
        }
        piv.push(c); r++;
    }
    const livres = [...Array(n).keys()].filter(c => !piv.includes(c));
    if (livres.length !== 1) return null;
    const x = Array(n).fill(0);
    x[livres[0]] = 1;
    piv.forEach((c, i) => (x[c] = -A[i][livres[0]]));
    for (let k = 1; k <= 1000; k++) {
        let y = x.map(v => v * k);
        if (!y.every(v => Math.abs(v - Math.round(v)) < 1e-6)) continue;
        y = y.map(Math.round);
        if (y.every(v => v <= 0)) y = y.map(v => -v);
        return y.every(v => v > 0 && v <= 99) ? y : null;
    }
    return null;
}

// ---------- 3. Estado ----------
const novo = (parts = [], coef = 1) => ({ parts, coef });
const padrao = () => ({ sides: [[novo(), novo()], [novo(), novo()]], known: "0.0", target: "1.0", unit: "g", amount: "", yield: "100" });
let S = carregar();
const rotulo = (lado, i) => (lado ? "Produto " : "Reagente ") + (i + 1);
const pegar = id => { const [l, i] = id.split(".").map(Number); return S.sides[l] && S.sides[l][i]; };
const completo = () => S.sides.every(l => l.every(s => s.parts.length));
const termo = s => (s.coef > 1 ? s.coef : "") + bonito(s.parts);
const equacaoBonita = () => S.sides.map(l => l.map(termo).join(" + ")).join(" → ");
const equacaoTexto = () => S.sides.map(l => l.map(s => (s.coef > 1 ? s.coef : "") + texto(s.parts)).join(" + ")).join(" -> ");

function carregar() {
    try {
        const d = JSON.parse(new URLSearchParams(location.search).get("s"));
        if (d && d.l.length === 2) {
            const e = padrao();
            e.sides = d.l.map(l => l.slice(0, MAX_SUBS).map(([c, f]) => novo(f ? parseFormula(f) : [], Math.min(99, Math.max(1, c | 0)))));
            if (e.sides.some(l => !l.length)) throw 0;
            Object.assign(e, { known: d.k, target: d.t, unit: d.u === "mol" ? "mol" : "g", amount: d.a, yield: d.y });
            return e;
        }
    } catch (e) { }
    return padrao();
}

function salvar() {
    try {
        const d = { l: S.sides.map(l => l.map(s => [s.coef, texto(s.parts)])), k: S.known, t: S.target, u: S.unit, a: S.amount, y: S.yield };
        history.replaceState(null, "", "?s=" + encodeURIComponent(JSON.stringify(d)));
    } catch (e) { }
}

// ---------- 4. Interface: equação ----------
function criar(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
}

function stepper(valor, min, max, aoMudar) {
    const box = criar("div", "stepper sm");
    const menos = criar("button", null, "−"), mais = criar("button", null, "+");
    menos.type = mais.type = "button";
    menos.setAttribute("aria-label", "Diminuir"); mais.setAttribute("aria-label", "Aumentar");
    menos.disabled = valor <= min; mais.disabled = valor >= max;
    menos.onclick = () => aoMudar(valor - 1);
    mais.onclick = () => aoMudar(valor + 1);
    box.append(menos, criar("output", null, valor), mais);
    return box;
}

function slot(lado, i) {
    const sub = S.sides[lado][i], cheio = sub.parts.length > 0;
    const card = criar("div", "slot" + (cheio ? " filled" : ""));
    card.append(criar("span", "slot-label", rotulo(lado, i)));

    if (S.sides[lado].length > 1) {
        const del = criar("button", "slot-del", "×");
        del.type = "button";
        del.setAttribute("aria-label", "Remover " + rotulo(lado, i));
        del.onclick = () => { S.sides[lado].splice(i, 1); atualizar(); };
        card.append(del);
    }

    const formula = criar("div", "slot-formula");
    if (!cheio) {
        const vazio = criar("button", "slot-empty", "<b>+</b><span>Escolher elemento</span>");
        vazio.type = "button";
        vazio.onclick = () => abrirSeletor(lado, i);
        formula.append(vazio);
    } else {
        sub.parts.forEach((p, j) => {
            const chip = criar("span", "chip-el", chipHTML(p));
            const x = criar("button", "chip-x", "×");
            x.type = "button";
            x.setAttribute("aria-label", "Remover " + p.s);
            x.onclick = () => { sub.parts.splice(j, 1); atualizar(); };
            chip.append(x);
            formula.append(chip);
        });
    }
    card.append(formula);

    if (cheio) {
        const add = criar("button", "slot-add", "+ elemento");
        add.type = "button";
        add.disabled = sub.parts.length >= MAX_PARTES;
        add.onclick = () => abrirSeletor(lado, i);
        card.append(add, criar("span", "slot-mass", "M = " + fmt(massaMolar(sub.parts), 3) + " g/mol"));
        const coef = criar("div", "coef", "<span>Coeficiente</span>");
        coef.append(stepper(sub.coef, 1, 99, v => { sub.coef = v; atualizar(); }));
        card.append(coef);
    }
    return card;
}

function renderEquacao() {
    const eq = $("equation");
    eq.innerHTML = "";
    S.sides.forEach((l, lado) => {
        l.forEach((_, i) => {
            if (i) eq.append(criar("span", "sep", "+"));
            eq.append(slot(lado, i));
        });
        if (l.length < MAX_SUBS) {
            const b = criar("button", "add-sub", "+");
            b.type = "button";
            b.title = "Adicionar " + (lado ? "produto" : "reagente");
            b.setAttribute("aria-label", b.title);
            b.onclick = () => { l.push(novo()); atualizar(); };
            eq.append(b);
        }
        if (!lado) eq.append(criar("span", "sep arrow", "→"));
    });
}

function renderBalanco() {
    const box = $("balance");
    box.innerHTML = "";
    box.className = "balance";
    if (!completo()) return;
    const [r, p] = S.sides.map(somaLado);
    const els = [...new Set([...Object.keys(r), ...Object.keys(p)])];
    const ok = els.every(e => (r[e] || 0) === (p[e] || 0));
    box.classList.add(ok ? "ok" : "bad");
    box.append(criar("strong", null, ok ? "✓ Equação balanceada" : "⚠ Equação não balanceada"));
    const chips = criar("div", "bal-chips");
    els.forEach(e => {
        const igual = (r[e] || 0) === (p[e] || 0);
        chips.append(criar("span", "bal-chip " + (igual ? "ok" : "bad"), `${e} <b>${r[e] || 0}</b> ${igual ? "=" : "≠"} <b>${p[e] || 0}</b>`));
    });
    box.append(chips);
    if (!ok) {
        const b = criar("button", "btn-ghost small", "⚖️ Balancear automaticamente");
        b.type = "button";
        b.onclick = () => {
            const c = autoBalancear();
            if (!c) return mostrarErro("Não foi possível balancear automaticamente: confira se os elementos aparecem nos dois lados.");
            [...S.sides[0], ...S.sides[1]].forEach((s, i) => (s.coef = c[i]));
            atualizar();
        };
        box.append(b);
    }
}

function renderPainel() {
    const cheio = completo();
    ["known", "target"].forEach(id => {
        const sel = $(id);
        sel.innerHTML = "";
        sel.disabled = !cheio;
        if (!cheio) return sel.append(new Option("Monte a equação primeiro", ""));
        S.sides.forEach((l, lado) => l.forEach((s, i) =>
            sel.append(new Option(`${termo(s)}  ·  ${rotulo(lado, i)}`, lado + "." + i))));
        if (!pegar(S[id])) S[id] = id === "known" ? "0.0" : "1.0";
        sel.value = S[id];
    });
    if (document.activeElement !== $("amount")) $("amount").value = S.amount;
    if (document.activeElement !== $("yield")) $("yield").value = S.yield;
    $("unit").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.u === S.unit));
}

function atualizar(manter) {
    salvar();
    renderEquacao();
    renderBalanco();
    renderPainel();
    const cheio = completo(), qtd = Number(S.amount) > 0;
    $("btnCalc").disabled = !(cheio && qtd);
    $("hint").hidden = cheio && qtd;
    $("hint").textContent = cheio ? "Informe a quantidade conhecida para liberar o cálculo." : "Preencha todas as substâncias e a quantidade para liberar o cálculo.";
    if (!manter) { $("result").hidden = true; $("error").hidden = true; }
}

function mostrarErro(msg) {
    $("result").hidden = true;
    $("error").hidden = false;
    $("error").textContent = "⚠️ " + msg;
}

// ---------- 5. Cálculo ----------
let ultimoTexto = "";

function calcular() {
    try {
        const [r, p] = S.sides.map(somaLado);
        const faltam = [...new Set([...Object.keys(r), ...Object.keys(p)])].filter(e => (r[e] || 0) !== (p[e] || 0));
        if (faltam.length) throw Error("A equação não está balanceada (confira: " + faltam.join(", ") + "). Ajuste os coeficientes ou use “Balancear automaticamente”.");
        if (S.known === S.target) throw Error("Escolha uma substância desejada diferente da conhecida.");
        const K = pegar(S.known), T = pegar(S.target), amount = Number(S.amount), rend = Number(S.yield);
        if (!Number.isFinite(amount) || amount <= 0) throw Error("Digite uma quantidade maior que zero.");
        if (!Number.isFinite(rend) || rend <= 0 || rend > 100) throw Error("O rendimento deve estar entre 0 e 100%.");

        const eProduto = S.target.startsWith("1");
        const usaRend = eProduto && rend !== 100;
        const mmK = massaMolar(K.parts), mmT = massaMolar(T.parts);
        const nK = S.unit === "g" ? amount / mmK : amount;
        const nTeor = nK * T.coef / K.coef;
        const nT = usaRend ? nTeor * rend / 100 : nTeor;
        const mT = nT * mmT, fK = bonito(K.parts), fT = bonito(T.parts);

        // textos
        $("resTitle").textContent = "Resultado";
        $("resEq").textContent = equacaoBonita();
        $("finalLabel").textContent = `Massa de ${fT} ${eProduto ? "formada" : "consumida"}${usaRend ? " (com rendimento)" : ""}`;
        $("finalValue").textContent = fmt(mT, 3) + " g";
        $("finalSub").textContent = `= ${fmt(nT)} mol` + (usaRend ? ` · teórico: ${fmt(nTeor * mmT, 3)} g (100%)` : "") +
            (!eProduto && rend !== 100 ? " · rendimento ignorado (substância consumida)" : "");

        const stat = (l, v) => `<div class="stat"><span>${l}</span><b>${v}</b></div>`;
        $("stats").innerHTML = stat(`Massa molar · ${fK}`, fmt(mmK, 3) + " g/mol") + stat(`Mols de ${fK}`, fmt(nK) + " mol") +
            stat(`Mols de ${fT}`, fmt(nT) + " mol") + stat(`Massa molar · ${fT}`, fmt(mmT, 3) + " g/mol");

        let mR = 0, mP = 0;
        $("tbody").innerHTML = S.sides.map((l, lado) => l.map((s, i) => {
            const n = nK * s.coef / K.coef, m = n * massaMolar(s.parts);
            lado ? (mP += m) : (mR += m);
            const cls = s === K ? "known" : s === T ? "target" : "";
            return `<tr class="${cls}"><td>${bonito(s.parts)}<small>${rotulo(lado, i)}${cls ? " · " + (cls === "known" ? "conhecida" : "desejada") : ""}</small></td>` +
                `<td>${s.coef}</td><td>${fmt(massaMolar(s.parts), 3)} g/mol</td><td>${fmt(n)} mol</td><td>${fmt(m, 3)} g</td></tr>`;
        }).join("")).join("");
        $("lavoisier").textContent = `Conservação de massa: reagentes ${fmt(mR, 3)} g = produtos ${fmt(mP, 3)} g (valores teóricos, 100% de rendimento).`;

        const passos = [
            `1) Massa molar\n   ${fK} = ${fmt(mmK, 3)} g/mol\n   ${fT} = ${fmt(mmT, 3)} g/mol`,
            S.unit === "g"
                ? `2) Massa → mols de ${fK}\n   n = m / M = ${fmt(amount)} / ${fmt(mmK, 3)} = ${fmt(nK)} mol`
                : `2) Quantidade conhecida\n   n(${fK}) = ${fmt(nK)} mol (já informado em mols)`,
            `3) Proporção da equação\n   ${K.coef} mol ${fK} : ${T.coef} mol ${fT}\n   n(${fT}) = ${fmt(nK)} × ${T.coef}/${K.coef} = ${fmt(nTeor)} mol`
        ];
        if (usaRend) passos.push(`4) Rendimento de ${fmt(rend)}%\n   n real = ${fmt(nTeor)} × ${fmt(rend)}/100 = ${fmt(nT)} mol`);
        passos.push(`${passos.length + 1}) Mols → massa de ${fT}\n   m = n × M = ${fmt(nT)} × ${fmt(mmT, 3)} = ${fmt(mT, 3)} g`);
        $("steps").textContent = passos.join("\n\n");

        ultimoTexto = `${equacaoBonita()}\n${fmt(amount)} ${S.unit} de ${fK} → ${fmt(mT, 3)} g de ${fT} (${fmt(nT)} mol)`;
        $("error").hidden = true;
        $("result").hidden = false;
        $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) { mostrarErro(e.message); }
}

// ---------- 6. Seletor de elementos ----------
const POS = z => {                                       // posição (linha, coluna) na tabela de 18 colunas
    if (z === 1) return [1, 1]; if (z === 2) return [1, 18];
    if (z <= 4) return [2, z - 2]; if (z <= 10) return [2, z + 8];
    if (z <= 12) return [3, z - 10]; if (z <= 18) return [3, z];
    if (z <= 36) return [4, z - 18]; if (z <= 54) return [5, z - 36];
    if (z <= 56) return [6, z - 54]; if (z <= 71) return [9, z - 54];
    if (z <= 86) return [6, z - 68]; if (z <= 88) return [7, z - 86];
    if (z <= 103) return [10, z - 86]; return [7, z - 100];
};
const CAT = { "Não metal": "nm", "Gás nobre": "gn", "Metal alcalino": "al", "Alcalino-terroso": "at", "Semimetal": "sm",
    "Halogênio": "ha", "Metal representativo": "mr", "Metal de transição": "mt", "Lantanídeo": "la", "Actinídeo": "ac" };
const semAcento = t => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const pick = { lado: 0, i: 0, el: null, idx: 1, voltar: null };

function montarTabela() {
    const t = $("ptable");
    ELEMENTOS.forEach(e => {
        const [r, c] = POS(e.z);
        const b = criar("button", "cell c-" + CAT[e.c], `<small>${e.z}</small><b>${e.s}</b>`);
        b.type = "button"; b.dataset.z = e.z; b.title = e.n;
        b.style.gridArea = `${r} / ${c}`;
        b.onclick = () => escolherElemento(e.z);
        b.ondblclick = () => { escolherElemento(e.z); adicionarElemento(); };
        t.append(b);
    });
    const lg = criar("div", "legend");
    Object.entries(CAT).forEach(([nome, k]) => lg.append(criar("span", "c-" + k, "<i></i>" + nome)));
    t.parentNode.append(lg);
    [["6", "57–71"], ["7", "89–103"]].forEach(([r, txt]) => {
        const g = criar("span", "cell ghost", txt);
        g.style.gridArea = `${r} / 3`;
        t.append(g);
    });
}

function abrirSeletor(lado, i) {
    Object.assign(pick, { lado, i, el: null, idx: 1, voltar: document.activeElement });
    $("pickCtx").textContent = "Selecionando para: " + rotulo(lado, i);
    $("search").value = "";
    $("formulaInput").value = ""; $("formulaErr").hidden = true;
    filtrar();
    $("pEmpty").hidden = false; $("pInfo").hidden = true;
    document.querySelectorAll(".cell.sel").forEach(c => c.classList.remove("sel"));
    $("picker").hidden = false;
    document.body.classList.add("noscroll");
    $("pickClose").focus();
}

function fecharSeletor() {
    $("picker").hidden = true;
    document.body.classList.remove("noscroll");
    if (pick.voltar && pick.voltar.focus) try { pick.voltar.focus(); } catch (e) { }
}

function escolherElemento(z) {
    const e = ELEMENTOS[z - 1];
    pick.el = e; pick.idx = 1;
    document.querySelectorAll(".cell.sel").forEach(c => c.classList.remove("sel"));
    document.querySelector(`.cell[data-z="${z}"]`).classList.add("sel");
    $("pImg").src = IMG + e.f + ".webp";
    $("pImg").alt = `Cartão do elemento ${e.n}`;
    $("pName").textContent = `${e.n} (${e.s})`;
    $("pMeta").textContent = `Nº ${e.z} · ${e.c} · ${fmt(MASSA[e.s], 3)} g/mol`;
    $("pEmpty").hidden = true; $("pInfo").hidden = false;
    atualizarIndice();
}

function atualizarIndice() {
    const sub = S.sides[pick.lado][pick.i], cheio = sub.parts.length >= MAX_PARTES;
    $("idxValue").textContent = pick.idx;
    $("idxMinus").disabled = pick.idx <= 1;
    $("idxPlus").disabled = pick.idx >= 99;
    $("idxPreview").textContent = cheio ? `Limite de ${MAX_PARTES} elementos nesta substância.`
        : "Fica: " + bonito([...sub.parts, { s: pick.el.s, n: pick.idx, a: {} }]);
    $("pAdd").disabled = cheio;
}

function adicionarElemento() {
    if (!pick.el) return;
    const sub = S.sides[pick.lado][pick.i];
    if (sub.parts.length >= MAX_PARTES) return;
    sub.parts.push({ s: pick.el.s, n: pick.idx, a: { [pick.el.s]: 1 } });
    fecharSeletor();
    atualizar();
}

function filtrar() {
    const q = semAcento($("search").value.trim());
    let primeiro = null;
    document.querySelectorAll(".cell[data-z]").forEach(c => {
        const e = ELEMENTOS[c.dataset.z - 1];
        const ok = !q || semAcento(e.n).includes(q) || e.s.toLowerCase() === q || String(e.z) === q || semAcento(e.s).startsWith(q);
        c.classList.toggle("dim", !ok);
        if (ok && !primeiro) primeiro = e.z;
    });
    return q ? primeiro : null;
}

// ---------- 7. Eventos ----------
$("idxMinus").onclick = () => { pick.idx--; atualizarIndice(); };
$("idxPlus").onclick = () => { pick.idx++; atualizarIndice(); };
$("pAdd").onclick = adicionarElemento;
$("pickClose").onclick = fecharSeletor;
$("picker").addEventListener("mousedown", e => { if (e.target === $("picker")) fecharSeletor(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("picker").hidden) fecharSeletor(); });
$("search").addEventListener("input", filtrar);
$("search").addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); const z = filtrar(); if (z) escolherElemento(z); }
});
$("pside").addEventListener("keydown", e => {
    if (e.target.id === "formulaInput") return;
    if (e.key === "Enter" && pick.el) adicionarElemento();
    if (e.key === "ArrowUp" || e.key === "ArrowRight") { if (pick.el && pick.idx < 99) { pick.idx++; atualizarIndice(); } }
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") { if (pick.el && pick.idx > 1) { pick.idx--; atualizarIndice(); } }
});
$("formulaForm").addEventListener("submit", e => {
    e.preventDefault();
    try {
        S.sides[pick.lado][pick.i].parts = parseFormula($("formulaInput").value);
        fecharSeletor();
        atualizar();
    } catch (err) {
        $("formulaErr").hidden = false;
        $("formulaErr").textContent = err.message;
    }
});

$("known").onchange = e => { S.known = e.target.value; atualizar(); };
$("target").onchange = e => { S.target = e.target.value; atualizar(); };
$("amount").oninput = e => { S.amount = e.target.value; atualizar(); };
$("yield").oninput = e => { S.yield = e.target.value; atualizar(); };
$("amount").onkeydown = $("yield").onkeydown = e => { if (e.key === "Enter" && !$("btnCalc").disabled) calcular(); };
$("unit").onclick = e => { if (e.target.dataset.u) { S.unit = e.target.dataset.u; atualizar(); } };
$("btnCalc").onclick = calcular;
$("btnReset").onclick = () => { S = padrao(); atualizar(); };
$("btnCopy").onclick = async () => {
    try { await navigator.clipboard.writeText(ultimoTexto); $("btnCopy").textContent = "Copiado!"; }
    catch (e) { $("btnCopy").textContent = "Copie manualmente"; }
    setTimeout(() => ($("btnCopy").textContent = "Copiar resultado"), 1600);
};

EXEMPLOS.forEach(([nome, eq, conhecido, qtd, desejado]) => {
    const b = criar("button", "ex-chip", nome);
    b.type = "button";
    b.onclick = () => {
        const [l, r] = eq.split("->").map(lerLado);
        S = padrao();
        S.sides = [l, r];
        S.known = "0." + l.findIndex(s => texto(s.parts) === conhecido);
        S.target = "1." + r.findIndex(s => texto(s.parts) === desejado);
        S.amount = String(qtd);
        atualizar();
        calcular();
    };
    $("examples").append(b);
});

montarTabela();
atualizar();
