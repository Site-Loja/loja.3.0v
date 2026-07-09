// ============================================================
//  ❄️ SNOW DEBUG - VERSÃO SEM PIX
//  Ativar com: ?debug=Dev
//  - Neve com temas: Natal, Namorados, Carnaval
//  - Seletor de temas visível
//  - Carrinho normal (sem Pix)
//  - Botão "Finalizar Compra" volta ao WhatsApp
// ============================================================

// ============================================================
//  1. VERIFICAÇÃO DO MODO DEBUG
// ============================================================

const isDebug = window.location.search.includes('debug=Dev');

if (isDebug) {
    document.documentElement.classList.add('modo-debug');
    console.log('🔧 ========================================');
    console.log('🔧 MODO DEBUG ATIVADO!');
    console.log('🔧 ========================================');
    console.log('✅ Seletor de temas visível');
    console.log('✅ Temas: Natal, Namorados, Carnaval');
    console.log('❌ Sistema PIX REMOVIDO');
    console.log('🔧 ========================================');
}

// ============================================================
//  2. CONFIGURAÇÕES DOS TEMAS
// ============================================================

const TEMAS = {
    natal: {
        nome: '🎄 Natal',
        cor: ['#ffffff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'],
        tamanho: [1, 4],
        velocidade: [0.8, 2.5],
        qtde: 200,
        brilho: true,
        opacidade: [0.6, 1],
        formato: 'estrela'
    },
    namorados: {
        nome: '❤️ Dia dos Namorados',
        cor: ['#ff0000', '#ff6b6b', '#ff85a2', '#ffb3c6', '#ff4d6d'],
        tamanho: [3, 10],
        velocidade: [0.7, 2.5],
        qtde: 140,
        brilho: true,
        opacidade: [0.6, 1],
        formato: 'coracao'
    },
    carnaval: {
        nome: '🎭 Carnaval',
        cor: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'],
        tamanho: [1.5, 4.5],
        velocidade: [1.5, 4],
        qtde: 250,
        brilho: true,
        opacidade: [0.7, 1],
        formato: 'confete'
    }
};

// ============================================================
//  3. DETECÇÃO AUTOMÁTICA DA DATA
// ============================================================

function getTemaAutomatico() {
    const hoje = new Date();
    const dia = hoje.getDate();
    const mes = hoje.getMonth() + 1;

    if (mes === 12 && dia >= 20) return 'natal';
    if (mes === 6 && dia === 12) return 'namorados';
    if (mes === 2 || mes === 3) {
        if (mes === 2 && dia >= 10) return 'carnaval';
        if (mes === 3 && dia <= 10) return 'carnaval';
    }
    return null;
}

// ============================================================
//  4. CLASSE DA NEVE
// ============================================================

class SnowEffect {
    constructor() {
        this.canvas = document.getElementById('snowCanvas');
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'snowCanvas';
            document.body.prepend(this.canvas);
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.flakes = [];
        this.temaAtual = null;
        this.animationId = null;
        this.isRunning = false;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        const temaInicial = getTemaAutomatico();
        if (temaInicial && TEMAS[temaInicial]) {
            this.setTema(temaInicial);
            this.start();
        } else {
            this.canvas.style.display = 'none';
        }
        
        if (isDebug) {
            this.setupThemeSelector();
            this.mostrarAvisoDebug();
            if (!temaInicial || !TEMAS[temaInicial]) {
                this.canvas.style.display = 'block';
                this.setTema('natal');
                this.start();
            }
        }
    }
    
    mostrarAvisoDebug() {
        const aviso = document.createElement('div');
        aviso.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            color: white;
            padding: 10px 20px;
            border-radius: 30px;
            font-weight: 600;
            z-index: 999999;
            box-shadow: 0 8px 30px rgba(0,0,0,0.5);
            font-size: 13px;
            text-align: center;
            border: 2px solid #f59e0b;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
            justify-content: center;
        `;
        aviso.innerHTML = `
            🔧 <strong>MODO DEBUG</strong> 
            <span style="opacity:0.5;">|</span> 
            🎨 Temas: Natal ❤️ Namorados 🎭 Carnaval
            <span style="opacity:0.5;">|</span> 
            ❌ PIX REMOVIDO
            <button onclick="this.parentElement.remove()" style="
                background:rgba(255,255,255,0.15);
                border:none;
                color:white;
                border-radius:50%;
                width:28px;
                height:28px;
                cursor:pointer;
                font-size:16px;
            ">✕</button>
        `;
        document.body.appendChild(aviso);
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    setTema(nomeTema) {
        this.temaAtual = nomeTema;
        const tema = TEMAS[nomeTema];
        if (!tema) return;

        // Atualiza classe do body para estilos CSS do tema
        document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();

        this.flakes = [];
        for (let i = 0; i < tema.qtde; i++) {
            const cor = Array.isArray(tema.cor) ? tema.cor[Math.floor(Math.random() * tema.cor.length)] : tema.cor;
            const tamanhoMin = tema.tamanho?.[0] || 1;
            const tamanhoMax = tema.tamanho?.[1] || 3;
            const velMin = tema.velocidade?.[0] || 0.6;
            const velMax = tema.velocidade?.[1] || 2;
            const flake = {
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height - this.canvas.height,
                size: Math.random() * (tamanhoMax - tamanhoMin) + tamanhoMin,
                speed: Math.random() * (velMax - velMin) + velMin,
                wind: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.4 + 0.5,
                cor: cor,
                formato: tema.formato || 'circulo',
                rotacao: Math.random() * Math.PI * 2,
                rotacaoSpeed: (Math.random() - 0.5) * 0.02,
                brilho: tema.brilho || false,
                confeteW: Math.random() * 3 + 1.5,
                confeteH: Math.random() * 1.5 + 0.8,
                oscilacao: Math.random() * Math.PI * 2,
            };
            this.flakes.push(flake);
        }
    }
    
    drawFlake(flake) {
        const ctx = this.ctx;
        const { x, y, size, cor, opacity, formato, rotacao, brilho } = flake;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotacao);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = cor;
        
        if (formato === 'estrela') {
            ctx.beginPath();
            const points = 5;
            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? size : size * 0.4;
                const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
                if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            }
            ctx.closePath();
            ctx.fill();
            if (brilho) {
                ctx.shadowColor = cor;
                ctx.shadowBlur = 12;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        } else if (formato === 'coracao') {
            const s = size * 0.5;
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.25);
            ctx.bezierCurveTo(-s * 0.5, -s * 0.7, -s * 0.7, 0, 0, s * 0.5);
            ctx.bezierCurveTo(s * 0.7, 0, s * 0.5, -s * 0.7, 0, -s * 0.25);
            ctx.closePath();
            ctx.fill();
            if (brilho) {
                ctx.shadowColor = cor;
                ctx.shadowBlur = 12;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        } else if (formato === 'confete') {
            const w = flake.confeteW || size * 1.2;
            const h = flake.confeteH || size * 0.5;
            ctx.fillRect(-w/2, -h/2, w, h);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            if (brilho) {
                ctx.shadowColor = cor;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        ctx.restore();
    }
    
    updateFlake(flake) {
        flake.y += flake.speed;
        flake.oscilacao = (flake.oscilacao || 0) + 0.01;
        flake.x += flake.wind + Math.sin(flake.oscilacao) * 0.2;
        flake.rotacao += flake.rotacaoSpeed || 0.01;
        if (flake.y > this.canvas.height + 20) {
            flake.y = -20;
            flake.x = Math.random() * this.canvas.width;
        }
    }
    
    animate() {
        if (!this.isRunning) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const flake of this.flakes) {
            this.drawFlake(flake);
            this.updateFlake(flake);
        }
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    setupThemeSelector() {
        const select = document.getElementById('themeSelect');
        if (!select) return;
        select.innerHTML = `
            <option value="auto">🔮 Automático</option>
            <option value="natal">🎄 Natal</option>
            <option value="namorados">❤️ Namorados</option>
            <option value="carnaval">🎭 Carnaval</option>
        `;
        select.value = this.temaAtual || 'auto';
        select.addEventListener('change', (e) => {
            const valor = e.target.value;
            if (valor === 'auto') {
                const auto = getTemaAutomatico();
                if (auto && TEMAS[auto]) {
                    this.setTema(auto);
                    this.canvas.style.display = 'block';
                    this.start();
                } else {
                    this.stop();
                    this.canvas.style.display = 'none';
                    document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();
                }
            } else {
                this.canvas.style.display = 'block';
                this.setTema(valor);
                this.start();
            }
            this.atualizarIcone(valor);
        });
        this.atualizarIcone(this.temaAtual || 'auto');
    }
    
    atualizarIcone(tema) {
        const icon = document.querySelector('.theme-selector .theme-icon');
        if (!icon) return;
        const icones = { 'natal': '🎄', 'namorados': '❤️', 'carnaval': '🎭', 'auto': '🔮' };
        icon.textContent = icones[tema] || '❄️';
    }
}

// ============================================================
//  5. INICIALIZAÇÃO
// ============================================================

// Função para notificações
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
        z-index: 999999;
        font-size: 14px;
        max-width: 90%;
        text-align: center;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.4s ease';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// Inicia a neve
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando snow-debug.js...');
    
    setTimeout(() => {
        const snow = new SnowEffect();
        window.snowEffect = snow;
        
        if (isDebug) {
            console.log('🔧 ========================================');
            console.log('🔧 MODO DEBUG - TUDO PRONTO!');
            console.log('🔧 ========================================');
            console.log('❄️ Temas: Natal, Namorados, Carnaval');
            console.log('❌ PIX REMOVIDO - Use WhatsApp');
            console.log('🔧 ========================================');
        }
    }, 200);
});

console.log('❄️ snow-debug.js carregado!');
console.log('💡 Use ?debug=Dev para ativar o modo debug');
console.log('❌ Sistema PIX REMOVIDO');