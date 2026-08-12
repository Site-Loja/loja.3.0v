// ============================================================
// CATÁLOGO DINÂMICO - busca os produtos na API e renderiza
// ============================================================

const catalogo = (() => {
    const grid = document.getElementById('produtosDinamicos');
    const loadingEl = document.getElementById('produtosLoading');
    const erroEl = document.getElementById('produtosErro');
    const erroMsgEl = document.getElementById('produtosErroMsg');
    const filtrosContainer = document.getElementById('filtrosColecoes');

    const NOMES_COLECOES = {
        todos: '🌈 Todas',
        camisetas: '👕 Camisetas',
        calcas: '👖 Calças',
        vestidos: '👗 Vestidos',
        conjuntos: '🧸 Conjuntos',
        jaquetas: '🧥 Jaquetas',
        shorts: '🩳 Shorts',
        meias: '🧦 Meias',
        toucas: '🧢 Toucas',
        acessorios: '✨ Acessórios',
        geral: '🛍️ Geral',
    };

    let todosProdutos = [];

    function mostrarLoading() {
        if (loadingEl) loadingEl.style.display = '';
        if (erroEl) erroEl.style.display = 'none';
    }

    function mostrarErro(mensagem) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (erroEl) {
            erroEl.style.display = '';
            if (erroMsgEl) erroMsgEl.textContent = mensagem;
        }
    }

    // Formata preço: 49.9 -> "R$ 49,90"
    function formatarPreco(valor) {
        return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
    }

    function montarCard(p) {
        const preco = formatarPreco(p.preco);
        const nomeColecao = NOMES_COLECOES[p.colecao] || p.colecao;
        const estoque = p.em_estoque
            ? '<div class="stock-badge">Em estoque</div>'
            : '<div class="stock-badge" style="background:#ef4444;">Esgotado</div>';
        const destaque = p.destaque
            ? '<div class="destaque-badge">⭐ Destaque</div>'
            : '';
        const imagem = p.imagem_url
            ? `<img alt="${p.nome}" class="product-image" loading="lazy" src="${p.imagem_url}" onerror="this.closest('.product-card').querySelector('.product-image-container').innerHTML='<div style=\'display:flex;align-items:center;justify-content:center;height:100%;font-size:40px;background:#fef3c7;\'>🛍️</div>';">`
            : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:40px;background:#fef3c7;">🛍️</div>';

        return `
<div class="product-card" data-collection="${p.colecao}" data-description="${p.descricao.replace(/"/g, '&quot;')}" data-name="${p.nome.replace(/"/g, '&quot;')}" data-price="${p.preco}">
<div class="product-image-container">
${imagem}
${destaque}
${estoque}
</div>
<div class="p-3">
<h3 class="product-name mb-1 truncate">${p.nome}</h3>
<p class="text-gray-600 text-xs mb-3 line-clamp-2">${p.descricao}</p>
<div class="flex justify-between items-center mb-3">
<span class="product-price">${preco}</span>
<span class="product-collection">${nomeColecao}</span>
</div>
<button class="add-to-cart-btn" ${p.em_estoque ? '' : 'disabled style="opacity:.4;cursor:not-allowed;"'}>🛒 Adicionar ao Carrinho</button>
</div>
</div>`;
    }

    function renderizar(lista) {
        if (!grid) return;
        grid.innerHTML = lista.map(montarCard).join('') ||
            '<div class="col-span-full py-16 text-center text-gray-500">Nenhum produto encontrado nesta coleção.</div>';
    }

    // Monta os botões de filtro a partir das coleções existentes
    function montarFiltros(produtos) {
        if (!filtrosContainer) return;
        const colecoes = [...new Set(produtos.map((p) => p.colecao))];
        const html = ['<button class="collection-filter active" data-collection="todos">🌈 Todas</button>']
            .concat(colecoes.map((c) => {
                const label = NOMES_COLECOES[c] || c;
                return `<button class="collection-filter" data-collection="${c}">${label}</button>`;
            }))
            .join('');
        filtrosContainer.innerHTML = html;
    }

    // ===== LOADING =====
    function carregarProdutos() {
        mostrarLoading();

        const url = `${CONFIG.API_BASE_URL}/api/produtos`;
        fetch(url)
            .then(async (res) => {
                if (!res.ok) {
                    let mensagem = `Erro ${res.status}`;
                    try {
                        const corpo = await res.json();
                        if (corpo.erro) mensagem = corpo.erro;
                    } catch (_e) { /* resposta não-JSON */ }
                    throw new Error(mensagem);
                }
                return res.json();
            })
            .then((produtos) => {
                todosProdutos = produtos;
                montarFiltros(produtos);
                renderizar(produtos);
                if (loadingEl) loadingEl.style.display = 'none';
            })
            .catch((err) => {
                console.error('❌ Falha ao carregar produtos:', err);
                mostrarErro(err.message || 'Não foi possível conectar ao servidor.');
            });
    }

    // Botão "Tentar novamente"
    const btnTentar = document.getElementById('btnTentarNovamente');
    if (btnTentar) btnTentar.addEventListener('click', carregarProdutos);

    return { carregarProdutos };
})();

document.addEventListener('DOMContentLoaded', catalogo.carregarProdutos);
