// ============================================================
// PAINEL ADMIN - Mania de Alegria
// Login, listagem, cadastro/edição (com upload) e exclusão.
// ============================================================

const API = CONFIG.API_BASE_URL;
const TOKEN_KEY = 'mania_admin_token';

// ===== HELPERS =====
function obterToken() { return localStorage.getItem(TOKEN_KEY); }

function apiFetch(url, opcoes = {}) {
    const headers = new Headers(opcoes.headers || {});
    const token = obterToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    // não define Content-Type para FormData (o navegador gera o boundary)
    if (!(opcoes.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    return fetch(`${API}${url}`, { ...opcoes, headers });
}

function mostrarToast(mensagem) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .4s';
        setTimeout(() => toast.remove(), 400);
    }, 2600);
}

function formatarPreco(valor) {
    return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

// ===== ELEMENTOS =====
const telaLogin = document.getElementById('telaLogin');
const telaPainel = document.getElementById('telaPainel');
const formLogin = document.getElementById('formLogin');
const loginSenha = document.getElementById('loginSenha');
const loginErro = document.getElementById('loginErro');
const btnLogin = document.getElementById('btnLogin');
const btnSair = document.getElementById('btnSair');
const btnNovoProduto = document.getElementById('btnNovoProduto');
const painelLoading = document.getElementById('painelLoading');
const painelErro = document.getElementById('painelErro');
const painelErroMsg = document.getElementById('painelErroMsg');
const btnRecarregar = document.getElementById('btnRecarregar');
const listaProdutos = document.getElementById('listaProdutos');

const modalForm = document.getElementById('modalForm');
const formProduto = document.getElementById('formProduto');
const modalTitulo = document.getElementById('modalTitulo');
const btnFecharModal = document.getElementById('btnFecharModal');
const btnCancelarForm = document.getElementById('btnCancelarForm');
const btnSalvar = document.getElementById('btnSalvar');
const btnSalvarTexto = document.getElementById('btnSalvarTexto');
const btnSalvarSpinner = document.getElementById('btnSalvarSpinner');

const modalExcluir = document.getElementById('modalExcluir');
const btnCancelarExcluir = document.getElementById('btnCancelarExcluir');
const btnConfirmarExcluir = document.getElementById('btnConfirmarExcluir');

const campoImagem = document.getElementById('campoImagem');
const previewImagem = document.getElementById('previewImagem');
const previewImg = document.getElementById('previewImg');
const previewTexto = document.getElementById('previewTexto');

// ===== LOGIN =====
async function fazerLogin(evento) {
    evento.preventDefault();
    btnLogin.disabled = true;
    loginErro.classList.add('hidden');

    try {
        const resposta = await fetch(`${API}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha: loginSenha.value }),
        });
        const corpo = await resposta.json();
        if (!resposta.ok) throw new Error(corpo.erro || 'Falha no login.');

        localStorage.setItem(TOKEN_KEY, corpo.token);
        mostrarPainel();
    } catch (err) {
        loginErro.textContent = '❌ ' + err.message;
        loginErro.classList.remove('hidden');
    } finally {
        btnLogin.disabled = false;
    }
}

function sair() {
    localStorage.removeItem(TOKEN_KEY);
    telaPainel.classList.add('hidden');
    telaLogin.classList.remove('hidden');
    telaLogin.classList.add('flex');
    loginSenha.value = '';
}

function mostrarPainel() {
    telaLogin.classList.add('hidden');
    telaLogin.classList.remove('flex');
    telaPainel.classList.remove('hidden');
    carregarProdutos();
}

// ===== LISTAGEM =====
function montarCard(p) {
    const imagem = p.imagem_url
        ? `<img alt="${p.nome}" class="h-40 w-full object-cover" src="${p.imagem_url}"/>`
        : '<div class="h-40 w-full flex items-center justify-center text-4xl bg-amber-50">🛍️</div>';

    return `
<div class="card overflow-hidden flex flex-col">
    ${imagem}
    <div class="p-4 flex flex-col flex-1">
        <div class="flex items-start justify-between gap-2">
            <h3 class="font-bold text-gray-900 leading-tight">${p.nome}</h3>
            <span class="text-xs font-bold whitespace-nowrap ${p.em_estoque ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-2 py-1 rounded-full">${p.em_estoque ? 'Em estoque' : 'Esgotado'}</span>
        </div>
        <p class="text-gray-500 text-xs mt-1 line-clamp-2">${p.descricao}</p>
        <div class="flex items-center justify-between mt-3 mb-4">
            <span class="text-amber-600 font-extrabold text-lg">${formatarPreco(p.preco)}</span>
            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">${p.colecao}</span>
        </div>
        <div class="flex gap-2 mt-auto">
            <button class="btn btn-ghost flex-1" data-editar="${p.id}" type="button">✏️ Editar</button>
            <button class="btn btn-danger flex-1" data-excluir="${p.id}" type="button">🗑️ Excluir</button>
        </div>
    </div>
</div>`;
}

async function carregarProdutos() {
    painelLoading.classList.remove('hidden');
    painelErro.classList.add('hidden');
    listaProdutos.innerHTML = '';

    try {
        const resposta = await apiFetch('/api/produtos');
        if (resposta.status === 401) return sair(); // token inválido/expirado
        const corpo = await resposta.json();
        if (!resposta.ok) throw new Error(corpo.erro || 'Erro ao carregar produtos.');

        produtosCache = corpo;
        listaProdutos.innerHTML = corpo.map(montarCard).join('') ||
            '<p class="col-span-full text-center text-gray-400 py-10">Nenhum produto cadastrado.</p>';
    } catch (err) {
        painelErroMsg.textContent = err.message;
        painelErro.classList.remove('hidden');
    } finally {
        painelLoading.classList.add('hidden');
    }
}

// ===== FORMULÁRIO (criar/editar) =====
function abrirFormulario(produto = null) {
    formProduto.reset();
    document.getElementById('produtoId').value = produto ? produto.id : '';
    document.getElementById('produtoImagemAtual').value = produto ? produto.imagem_url : '';
    previewImagem.style.display = 'none';

    if (produto) {
        modalTitulo.textContent = 'Editar Produto';
        document.getElementById('campoNome').value = produto.nome;
        document.getElementById('campoDescricao').value = produto.descricao;
        document.getElementById('campoPreco').value = produto.preco;
        document.getElementById('campoColecao').value = produto.colecao;
        document.getElementById('campoEstoque').checked = produto.em_estoque;
        document.getElementById('campoDestaque').checked = produto.destaque;
        if (produto.imagem_url) {
            previewImagem.style.display = '';
            previewImg.src = produto.imagem_url;
            previewTexto.textContent = 'Imagem atual. Escolha um arquivo acima para substituir.';
        }
    } else {
        modalTitulo.textContent = 'Novo Produto';
    }

    modalForm.classList.remove('hidden');
}

function fecharFormulario() {
    modalForm.classList.add('hidden');
}

// Preview ao escolher arquivo
campoImagem.addEventListener('change', () => {
    const arquivo = campoImagem.files[0];
    if (!arquivo) return;
    if (arquivo.size > 5 * 1024 * 1024) {
        mostrarToast('⚠️ Arquivo muito grande. Máximo de 5 MB.');
        campoImagem.value = '';
        return;
    }
    previewImagem.style.display = '';
    previewImg.src = URL.createObjectURL(arquivo);
    previewTexto.textContent = 'Nova imagem selecionada (será enviada ao salvar).';
});

async function salvarProduto(evento) {
    evento.preventDefault();
    btnSalvar.disabled = true;
    btnSalvarTexto.textContent = 'Salvando...';
    btnSalvarSpinner.classList.remove('hidden');

    const id = document.getElementById('produtoId').value;
    const formData = new FormData();
    formData.append('nome', document.getElementById('campoNome').value.trim());
    formData.append('descricao', document.getElementById('campoDescricao').value.trim());
    formData.append('preco', document.getElementById('campoPreco').value);
    formData.append('colecao', document.getElementById('campoColecao').value);
    formData.append('em_estoque', document.getElementById('campoEstoque').checked ? 1 : 0);
    formData.append('destaque', document.getElementById('campoDestaque').checked ? 1 : 0);
    const arquivo = campoImagem.files[0];
    if (arquivo) formData.append('imagem', arquivo);

    try {
        const url = id ? `/api/produtos/${id}` : '/api/produtos';
        const metodo = id ? 'PUT' : 'POST';

        const resposta = await apiFetch(url, { method: metodo, body: formData });
        const corpo = await resposta.json().catch(() => ({}));

        if (resposta.status === 401) {
            fecharFormulario();
            return sair();
        }
        if (!resposta.ok) throw new Error(corpo.erro || 'Erro ao salvar o produto.');

        mostrarToast(id ? '✅ Produto atualizado!' : '✅ Produto cadastrado!');
        fecharFormulario();
        carregarProdutos();
    } catch (err) {
        mostrarToast('❌ ' + err.message);
    } finally {
        btnSalvar.disabled = false;
        btnSalvarTexto.textContent = 'Salvar Produto';
        btnSalvarSpinner.classList.add('hidden');
    }
}

// ===== EXCLUSÃO =====
let idParaExcluir = null;

function pedirExclusao(id) {
    idParaExcluir = id;
    modalExcluir.classList.remove('hidden');
}

async function confirmarExclusao() {
    btnConfirmarExcluir.disabled = true;
    try {
        const resposta = await apiFetch(`/api/produtos/${idParaExcluir}`, { method: 'DELETE' });
        const corpo = await resposta.json().catch(() => ({}));
        if (resposta.status === 401) {
            modalExcluir.classList.add('hidden');
            return sair();
        }
        if (!resposta.ok) throw new Error(corpo.erro || 'Erro ao excluir.');

        mostrarToast('🗑️ Produto excluído!');
        modalExcluir.classList.add('hidden');
        carregarProdutos();
    } catch (err) {
        mostrarToast('❌ ' + err.message);
    } finally {
        btnConfirmarExcluir.disabled = false;
        idParaExcluir = null;
    }
}

// ===== EVENTOS =====
formLogin.addEventListener('submit', fazerLogin);
btnSair.addEventListener('click', sair);
btnNovoProduto.addEventListener('click', () => abrirFormulario());
formProduto.addEventListener('submit', salvarProduto);
btnFecharModal.addEventListener('click', fecharFormulario);
btnCancelarForm.addEventListener('click', fecharFormulario);
btnCancelarExcluir.addEventListener('click', () => { modalExcluir.classList.add('hidden'); idParaExcluir = null; });
btnConfirmarExcluir.addEventListener('click', confirmarExclusao);
btnRecarregar.addEventListener('click', carregarProdutos);

// Delegação para os botões Editar/Excluir dos cards
listaProdutos.addEventListener('click', (e) => {
    const btnEditar = e.target.closest('[data-editar]');
    const btnExcluir = e.target.closest('[data-excluir]');
    if (btnEditar) {
        const id = btnEditar.dataset.editar;
        const produto = produtosCache.find((p) => String(p.id) === String(id));
        if (produto) abrirFormulario(produto);
    } else if (btnExcluir) {
        pedirExclusao(btnExcluir.dataset.excluir);
    }
});

// Fechar modal clicando fora
modalForm.addEventListener('click', (e) => { if (e.target === modalForm) fecharFormulario(); });
modalExcluir.addEventListener('click', (e) => { if (e.target === modalExcluir) { modalExcluir.classList.add('hidden'); idParaExcluir = null; } });

// ===== INICIALIZAÇÃO =====
let produtosCache = [];

if (obterToken()) {
    telaLogin.classList.add('hidden');
    telaPainel.classList.remove('hidden');
    carregarProdutos();
} else {
    telaLogin.classList.remove('hidden');
    telaLogin.classList.add('flex');
}
