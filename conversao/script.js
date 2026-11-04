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

    const nomes = {
      t: 'tonelada',
      kg: 'quilograma',
      hg: 'hectograma',
      dag: 'decagrama',
      g: 'grama',
      dg: 'decigrama',
      cg: 'centigrama',
      mg: 'miligrama',
      lb: 'libra',
    };

    const simbolos = {
      t: 't',
      kg: 'kg',
      hg: 'hg',
      dag: 'dag',
      g: 'g',
      dg: 'dg',
      cg: 'cg',
      mg: 'mg',
      lb: 'lb',
    };

    const valorInput = document.getElementById('valor');
    const origemSelect = document.getElementById('origem');
    const destinoSelect = document.getElementById('destino');
    const resultadoEl = document.getElementById('resultado');
    const descricaoEl = document.getElementById('descricaoResultado');
    const btn = document.getElementById('btnConverter');
    const btnIA = document.getElementById('btnIA');
    const respostaIA = document.getElementById('respostaIA');

    function formatarNumero(valor) {
      return new Intl.NumberFormat('pt-BR', {
        maximumFractionDigits: 8,
      }).format(valor);
    }

    function converterMassa(valor, origem, destino) {
      if (valor === '' || valor === null || !Number.isFinite(Number(valor))) {
        throw new Error('Informe um valor numérico válido.');
      }

      if (!(origem in unidades) || !(destino in unidades)) {
        throw new Error('Selecione unidades válidas.');
      }

      const valorEmGramas = Number(valor) * unidades[origem];
      return valorEmGramas / unidades[destino];
    }

    function atualizarResultado() {
      try {
        const valor = valorInput.value.trim();
        const origem = origemSelect.value;
        const destino = destinoSelect.value;
        const convertido = converterMassa(valor, origem, destino);

        resultadoEl.textContent = `${formatarNumero(convertido)} ${simbolos[destino]}`;
        descricaoEl.textContent = `${formatarNumero(Number(valor))} ${simbolos[origem]} equivalem a ${formatarNumero(convertido)} ${simbolos[destino]}.`;
        btnIA.hidden = false;
        respostaIA.hidden = true;
        respostaIA.textContent = '';
      } catch (erro) {
        resultadoEl.textContent = 'Valor inválido';
        descricaoEl.textContent = erro.message;
        btnIA.hidden = true;
        respostaIA.hidden = true;
        respostaIA.textContent = '';
      }
    }

    btn.addEventListener('click', atualizarResultado);
    valorInput.addEventListener('input', () => {
      if (valorInput.value.trim() === '') {
        resultadoEl.textContent = '0 g';
        descricaoEl.textContent = 'Digite um valor e escolha as unidades para converter.';
        btnIA.hidden = true;
        respostaIA.hidden = true;
        respostaIA.textContent = '';
        return;
      }
      atualizarResultado();
    });

    origemSelect.addEventListener('change', atualizarResultado);
    destinoSelect.addEventListener('change', atualizarResultado);