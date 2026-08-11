// ========== CARROSSEL SUAVE ==========
const banners = [
    'imagens/banner01.png',
    'imagens/banner002.png',
    'imagens/banner003.png',
    'imagens/banner004.png',
    'imagens/banner005.png',
];

const carouselContainer = document.querySelector('.banner-carousel .carousel-container');
const bannerSection = document.querySelector('.banner-carousel');

// Limpa o container e cria estrutura
carouselContainer.innerHTML = '';

// Cria wrapper para os slides
const slidesWrapper = document.createElement('div');
slidesWrapper.className = 'carousel-slides-wrapper';

// Cria os slides
banners.forEach((src, i) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    if (i === 0) slide.classList.add('active');
    slide.innerHTML = `<img src="${src}" alt="Banner ${i+1}" loading="${i === 0 ? 'eager' : 'lazy'}">`;
    slidesWrapper.appendChild(slide);
});

carouselContainer.appendChild(slidesWrapper);

// Botões de navegação
const prevBtn = document.createElement('button');
prevBtn.className = 'prev';
prevBtn.innerHTML = '&#10094;';
prevBtn.setAttribute('aria-label', 'Banner anterior');
carouselContainer.appendChild(prevBtn);

const nextBtn = document.createElement('button');
nextBtn.className = 'next';
nextBtn.innerHTML = '&#10095;';
nextBtn.setAttribute('aria-label', 'Próximo banner');
carouselContainer.appendChild(nextBtn);

// Indicadores (dots)
const dotsContainer = document.createElement('div');
dotsContainer.className = 'carousel-dots';
banners.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    if (i === 0) dot.classList.add('active');
    dot.dataset.index = i;
    dot.setAttribute('aria-label', `Ir para banner ${i + 1}`);
    dotsContainer.appendChild(dot);
});
bannerSection.appendChild(dotsContainer);

// Barra de progresso do autoplay
const progressBar = document.createElement('div');
progressBar.className = 'carousel-progress';
bannerSection.appendChild(progressBar);

// Contador de slides
const counter = document.createElement('div');
counter.className = 'carousel-counter';
counter.textContent = `1 / ${banners.length}`;
bannerSection.appendChild(counter);

// Seleciona elementos
const slides_c = document.querySelectorAll('.carousel-slide');
const dots = document.querySelectorAll('.carousel-dot');

let currentIndex_c = 0;
let autoPlayInterval_c;
let progressInterval_c;
let isTransitioning = false;
const AUTOPLAY_MS = 5000;

// Função para mostrar slide com transição
function showSlideSuave(index, smooth = true) {
    if (isTransitioning) return;
    if (index < 0) index = slides_c.length - 1;
    if (index >= slides_c.length) index = 0;

    isTransitioning = true;
    currentIndex_c = index;

    slidesWrapper.style.transition = smooth
        ? 'transform 0.7s cubic-bezier(0.25, 0.1, 0.25, 1)'
        : 'none';

    slidesWrapper.style.transform = `translateX(-${currentIndex_c * 100}%)`;

    // Atualiza classe active nos slides
    slides_c.forEach((s, i) => s.classList.toggle('active', i === currentIndex_c));

    // Atualiza dots
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex_c));

    // Atualiza contador
    counter.textContent = `${currentIndex_c + 1} / ${banners.length}`;

    setTimeout(() => {
        isTransitioning = false;
    }, 700);
}

// Próximo slide
function nextSlideSuave() {
    if (isTransitioning) return;
    showSlideSuave(currentIndex_c + 1);
}

// Slide anterior
function prevSlideSuave() {
    if (isTransitioning) return;
    showSlideSuave(currentIndex_c - 1);
}

// Ir para slide específico
function goToSlideSuave(index) {
    if (isTransitioning) return;
    showSlideSuave(parseInt(index));
}

// Barra de progresso
function startProgress() {
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            progressBar.style.transition = `width ${AUTOPLAY_MS}ms linear`;
            progressBar.style.width = '100%';
        });
    });
}

function resetProgress() {
    progressBar.style.transition = 'none';
    progressBar.style.width = '0%';
}

// Autoplay
function startAutoPlaySuave() {
    stopAutoPlaySuave();
    resetProgress();
    startProgress();
    autoPlayInterval_c = setInterval(() => {
        if (!isTransitioning) {
            nextSlideSuave();
            resetProgress();
            startProgress();
        }
    }, AUTOPLAY_MS);
}

function stopAutoPlaySuave() {
    if (autoPlayInterval_c) {
        clearInterval(autoPlayInterval_c);
        autoPlayInterval_c = null;
    }
    resetProgress();
}

// Eventos dos botões
prevBtn.addEventListener('click', () => {
    stopAutoPlaySuave();
    prevSlideSuave();
    startAutoPlaySuave();
});

nextBtn.addEventListener('click', () => {
    stopAutoPlaySuave();
    nextSlideSuave();
    startAutoPlaySuave();
});

// Eventos dos dots
dots.forEach(dot => {
    dot.addEventListener('click', () => {
        stopAutoPlaySuave();
        goToSlideSuave(dot.dataset.index);
        startAutoPlaySuave();
    });
});

// Pausar autoplay no hover
bannerSection.addEventListener('mouseenter', stopAutoPlaySuave);
bannerSection.addEventListener('mouseleave', startAutoPlaySuave);

// Navegação pelo teclado
document.addEventListener('keydown', (e) => {
    const rect = bannerSection.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (!isVisible) return;

    if (e.key === 'ArrowLeft') {
        stopAutoPlaySuave();
        prevSlideSuave();
        startAutoPlaySuave();
    } else if (e.key === 'ArrowRight') {
        stopAutoPlaySuave();
        nextSlideSuave();
        startAutoPlaySuave();
    }
});

// Swipe no mobile
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50;

bannerSection.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

bannerSection.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > SWIPE_THRESHOLD) {
        stopAutoPlaySuave();
        if (diff > 0) {
            nextSlideSuave();
        } else {
            prevSlideSuave();
        }
        startAutoPlaySuave();
    }
}, { passive: true });

// Inicia o carrossel
showSlideSuave(0, false);
startAutoPlaySuave();

// Ajuste responsivo
let resizeTimeout_c;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout_c);
    resizeTimeout_c = setTimeout(() => {
        slidesWrapper.style.transition = 'none';
        slidesWrapper.style.transform = `translateX(-${currentIndex_c * 100}%)`;
        setTimeout(() => {
            slidesWrapper.style.transition = 'transform 0.7s cubic-bezier(0.25, 0.1, 0.25, 1)';
        }, 50);
    }, 150);
});

// ============================================================
//  🛒 CARRINHO DE COMPRAS - CÓDIGO COMPLETO
// ============================================================

// ===== VARIÁVEIS DO CARRINHO =====
let cart = [];
let cartCount = 0;
let cartTotal = 0;

// ===== ELEMENTOS DO DOM =====
const cartToggleBtn = document.getElementById('cartToggleBtn');
const cartCloseBtn = document.getElementById('cartCloseBtn');
const cartOverlay = document.getElementById('cartOverlay');
const cartPanel = document.getElementById('cartPanel');
const cartItems = document.getElementById('cartItems');
const cartTotalElement = document.getElementById('cartTotal');
const cartCountElement = document.getElementById('cartCount');
const checkoutBtn = document.getElementById('checkoutBtn');

// ===== FUNÇÕES DO CARRINHO =====

// Abrir carrinho
function openCart() {
    cartOverlay.classList.add('open');
    cartPanel.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// Fechar carrinho
function closeCart() {
    cartOverlay.classList.remove('open');
    cartPanel.classList.remove('open');
    document.body.style.overflow = '';
}

// Alternar carrinho
function toggleCart() {
    if (cartPanel.classList.contains('open')) {
        closeCart();
    } else {
        openCart();
    }
}

// Adicionar ao carrinho
function addToCart(productCard) {
    const name = productCard.dataset.name || 'Produto';
    const price = parseFloat(productCard.dataset.price.replace(/[^\d.]/g, '')) || 0;
    const collection = productCard.dataset.collection || 'Geral';
    const imgSrc = productCard.querySelector('.product-image')?.src || '';
    
    // Verifica se já existe no carrinho
    const existingItem = cart.find(item => item.name === name && item.collection === collection);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: name,
            price: price,
            collection: collection,
            img: imgSrc,
            quantity: 1
        });
    }
    
    updateCart();
    showNotification(`${name} adicionado ao carrinho! 🛒`);
}

// Remover do carrinho
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

// Alterar quantidade
function changeQuantity(index, delta) {
    if (cart[index]) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        updateCart();
    }
}

// Atualizar carrinho
function updateCart() {
    // Calcula total
    cartTotal = 0;
    cartCount = 0;
    
    cart.forEach(item => {
        cartTotal += item.price * item.quantity;
        cartCount += item.quantity;
    });
    
    // Atualiza contador
    if (cartCountElement) cartCountElement.textContent = cartCount;
    
    // Atualiza total
    if (cartTotalElement) cartTotalElement.textContent = `R$ ${cartTotal.toFixed(2).replace('.', ',')}`;
    
    // Renderiza itens
    renderCartItems();
}

// Renderizar itens do carrinho
function renderCartItems() {
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `<div class="cart-empty">Seu carrinho está vazio 🌟</div>`;
        return;
    }
    
    let html = '';
    cart.forEach((item, index) => {
        const priceFormatted = item.price.toFixed(2).replace('.', ',');
        
        html += `
            <div class="cart-item">
                <div class="cart-item-img">
                    ${item.img ? `<img src="${item.img}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">` : '🛍️'}
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">R$ ${priceFormatted}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="changeQuantity(${index}, -1)">−</button>
                        <span style="font-weight:700;min-width:24px;text-align:center;">${item.quantity}</span>
                        <button class="qty-btn" onclick="changeQuantity(${index}, 1)">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${index})">✕</button>
            </div>
        `;
    });
    
    cartItems.innerHTML = html;
}

// Notificação
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.85);
        color: white;
        padding: 14px 28px;
        border-radius: 30px;
        font-weight: 600;
        z-index: 99999;
        animation: fadeInUp 0.4s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        font-size: 14px;
        max-width: 90%;
        text-align: center;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.4s ease';
        setTimeout(() => {
            notification.remove();
        }, 400);
    }, 2500);
}

// ===== EVENTOS =====

// Abrir/fechar carrinho
if (cartToggleBtn) cartToggleBtn.addEventListener('click', toggleCart);
if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

// Botão de fechar (ESC)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCart();
    }
});

// Botão "Adicionar ao Carrinho" (delegação: funciona com produtos renderizados via API)
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn) return;
    e.stopPropagation();
    const productCard = btn.closest('.product-card');
    if (productCard) {
        addToCart(productCard);
    }
});

// Clique no card do produto (delegação)
document.addEventListener('click', function(e) {
    if (e.target.closest('.add-to-cart-btn')) return;
    const card = e.target.closest('.product-card');
    if (card) {
        console.log('Produto clicado:', card.dataset.name);
    }
});

// Finalizar compra via WhatsApp
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function() {
        if (cart.length === 0) {
            showNotification('Seu carrinho está vazio! 🛒');
            return;
        }
        
        let mensagem = '🛍️ *Novo Pedido - Mania de Alegria* 🛍️%0A%0A';
        mensagem += '*Produtos:*%0A';

        cart.forEach(item => {
            const totalItem = (item.price * item.quantity).toFixed(2);
            mensagem += `- ${item.name} x${item.quantity} = R$ ${totalItem.replace('.', ',')}%0A`;
        });

        if (promoAplicado && valorDesconto > 0) {
            const totalComDesconto = cartTotal - valorDesconto;
            const totalElegivel = calcularTotalComDesconto();
            mensagem += `%0A*Cupom:* ${PROMO_CONFIG.codigo} (-${PROMO_CONFIG.descontoPercentual}%%)%0A`;
            if (cartTotal > totalElegivel) {
                mensagem += `*Desconto aplicado em:* R$ ${totalElegivel.toFixed(2).replace('.', ',')} (sem toucas)%0A`;
            }
            mensagem += `*Desconto:* -R$ ${valorDesconto.toFixed(2).replace('.', ',')}%0A`;
            mensagem += `*Total:* R$ ${totalComDesconto.toFixed(2).replace('.', ',')}%0A%0A`;
        } else {
            mensagem += `%0A*Total: R$ ${cartTotal.toFixed(2).replace('.', ',')}*%0A%0A`;
        }

        const numero = '5538997426348';
        const url = `https://wa.me/${numero}?text=${mensagem}`;
        
        window.open(url, '_blank');
    });
}

// ===== FILTROS E BUSCA =====

// Filtros de coleção (delegação: o container é preenchido via API)
const filtrosColecoes = document.getElementById('filtrosColecoes');
if (filtrosColecoes) {
    filtrosColecoes.addEventListener('click', function(e) {
        const filter = e.target.closest('.collection-filter');
        if (!filter) return;
        this.querySelectorAll('.collection-filter').forEach(f => f.classList.remove('active'));
        filter.classList.add('active');

        const collection = filter.dataset.collection.toLowerCase();
        filterProducts(collection);
    });
}

// Busca
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const products = document.querySelectorAll('.product-card');
        
        products.forEach(product => {
            const name = product.dataset.name?.toLowerCase() || '';
            const desc = product.dataset.description?.toLowerCase() || '';
            const collection = product.dataset.collection?.toLowerCase() || '';
            
            const match = name.includes(searchTerm) || 
                         desc.includes(searchTerm) || 
                         collection.includes(searchTerm);
            
            product.style.display = match ? '' : 'none';
        });
    });
}

// Função de filtro
function filterProducts(collection) {
    const products = document.querySelectorAll('.product-card');

    products.forEach(product => {
        const productCollection = (product.dataset.collection || '').toLowerCase();

        if (collection === 'todos') {
            product.style.display = '';
        } else {
            product.style.display = productCollection === collection ? '' : 'none';
        }
    });
}

// ===== BOTÃO "COMPRAR AGORA" =====
const btnComprar = document.getElementById('btnComprarAgora');
if (btnComprar) {
    btnComprar.addEventListener('click', function() {
        document.getElementById('colecoes').scrollIntoView({ behavior: 'smooth' });
    });
}

// ===== INICIALIZAÇÃO =====
console.log('🛒 Carrinho carregado!');
console.log('🎨 Filtros e busca carregados!');

// ============================================================
//  🏷️ SISTEMA DE CÓDIGO PROMOCIONAL
// ============================================================
// ✏️ PARA MUDAR O CÓDIGO, EDITE AQUI:
const PROMO_CONFIG = {
    codigo: 'RELAMPAGO',           // Código que o cliente digita
    descontoPercentual: 10,          // Porcentagem de desconto (ex: 10 = 10%)
    dataValidade: '2026-12-31',     // Data de validade (AAAA-MM-DD)
    textoMensagem: 'Cupom aplicado com sucesso!'  // Mensagem de sucesso
};
// ============================================================

let promoAplicado = false;
let valorDesconto = 0;

// Elementos do DOM do cupom
const promoInput = document.getElementById('promoInput');
const promoApplyBtn = document.getElementById('promoApplyBtn');
const promoMessage = document.getElementById('promoMessage');
const promoDiscountRow = document.getElementById('promoDiscountRow');
const promoDiscountValue = document.getElementById('promoDiscountValue');
const promoFinalRow = document.getElementById('promoFinalRow');
const promoFinalTotal = document.getElementById('promoFinalTotal');

// Verificar se o cupom está dentro da validade
function verificarValidade() {
    const hoje = new Date();
    const validade = new Date(PROMO_CONFIG.dataValidade + 'T23:59:59');
    return hoje <= validade;
}

// Aplicar cupom de desconto
function aplicarCupom() {
    if (!promoInput || !promoMessage) return;

    const codigoDigitado = promoInput.value.trim().toUpperCase();

    // Verificar validade
    if (!verificarValidade()) {
        promoMessage.textContent = '❌ Este cupom expirou!';
        promoMessage.className = 'promo-message erro';
        promoAplicado = false;
        valorDesconto = 0;
        atualizarDesconto();
        return;
    }

    // Verificar código
    if (codigoDigitado === PROMO_CONFIG.codigo.toUpperCase()) {
        promoAplicado = true;
        promoMessage.textContent = `✅ ${PROMO_CONFIG.textoMensagem} (-${PROMO_CONFIG.descontoPercentual}%)`;
        promoMessage.className = 'promo-message sucesso';
        promoInput.disabled = true;
        promoApplyBtn.textContent = '✓ Aplicado';
        promoApplyBtn.style.background = '#10b981';
        promoApplyBtn.disabled = true;
        atualizarDesconto();
    } else {
        promoMessage.textContent = '❌ Código inválido!';
        promoMessage.className = 'promo-message erro';
        promoAplicado = false;
        valorDesconto = 0;
        atualizarDesconto();
    }
}

// Atualizar valores de desconto na tela
// Produtos que NÃO recebem desconto
const CATEGORIAS_SEM_DESCONTO = ['toucas'];

function calcularTotalComDesconto() {
    let total = 0;
    cart.forEach(item => {
        const collection = (item.collection || '').toLowerCase().trim();
        const semDesconto = CATEGORIAS_SEM_DESCONTO.includes(collection);
        console.log(`[Cupom] ${item.name} | coleção: "${collection}" | sem desconto: ${semDesconto}`);
        if (!semDesconto) {
            total += item.price * item.quantity;
        }
    });
    console.log(`[Cupom] Total elegível para desconto: R$ ${total.toFixed(2)}`);
    return total;
}

function atualizarDesconto() {
    if (!promoDiscountRow || !promoDiscountValue || !promoFinalRow || !promoFinalTotal) return;

    if (promoAplicado && cartTotal > 0) {
        const totalElegivel = calcularTotalComDesconto();

        // Se não tem nenhum produto elegível, não aplica desconto
        if (totalElegivel <= 0) {
            promoDiscountRow.style.display = 'none';
            promoFinalRow.style.display = 'none';
            valorDesconto = 0;
            return;
        }

        valorDesconto = totalElegivel * (PROMO_CONFIG.descontoPercentual / 100);
        const totalComDesconto = cartTotal - valorDesconto;

        promoDiscountRow.style.display = 'flex';
        promoDiscountValue.textContent = `-R$ ${valorDesconto.toFixed(2).replace('.', ',')}`;

        promoFinalRow.style.display = 'flex';
        promoFinalTotal.textContent = `R$ ${totalComDesconto.toFixed(2).replace('.', ',')}`;
    } else {
        promoDiscountRow.style.display = 'none';
        promoFinalRow.style.display = 'none';
        valorDesconto = 0;
    }
}

// Atualizar desconto quando o carrinho mudar
const originalUpdateCart = updateCart;
updateCart = function() {
    originalUpdateCart();
    atualizarDesconto();
};

// Evento do botão aplicar cupom
if (promoApplyBtn) {
    promoApplyBtn.addEventListener('click', aplicarCupom);
}

// Aplicar com Enter
if (promoInput) {
    promoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            aplicarCupom();
        }
    });
}

// Limpar cupom quando carrinho esvaziar
const originalRemoveFromCart = removeFromCart;
removeFromCart = function(index) {
    originalRemoveFromCart(index);
    if (cart.length === 0) {
        limparCupom();
    }
};

const originalChangeQuantity = changeQuantity;
changeQuantity = function(index, delta) {
    originalChangeQuantity(index, delta);
    if (cart.length === 0) {
        limparCupom();
    }
};

// Função para limpar/resetar cupom
function limparCupom() {
    promoAplicado = false;
    valorDesconto = 0;
    if (promoInput) {
        promoInput.value = '';
        promoInput.disabled = false;
    }
    if (promoApplyBtn) {
        promoApplyBtn.textContent = 'Aplicar';
        promoApplyBtn.style.background = '';
        promoApplyBtn.disabled = false;
    }
    if (promoMessage) {
        promoMessage.textContent = '';
        promoMessage.className = 'promo-message';
    }
    atualizarDesconto();
}

// Adicionar botão de remover cupom ao lado do input
if (promoInput && promoApplyBtn) {
    const promoRow = promoInput.parentElement;

    // Inserir botão de limpar após o botão aplicar
    const limparBtn = document.createElement('button');
    limparBtn.className = 'promo-apply-btn';
    limparBtn.textContent = '✕';
    limparBtn.style.background = '#ef4444';
    limparBtn.style.padding = '10px 12px';
    limparBtn.style.display = 'none';
    limparBtn.title = 'Remover cupom';
    promoRow.appendChild(limparBtn);

    // Mostrar/esconder botão de limpar
    const observer = new MutationObserver(() => {
        limparBtn.style.display = promoAplicado ? 'block' : 'none';
    });
    observer.observe(promoMessage, { childList: true, attributes: true, subtree: true });

    limparBtn.addEventListener('click', limparCupom);
}