// ============================================================
// CONFIGURAÇÃO DA API - MANIA DE ALEGRIA
// ============================================================
// Altere para a URL do seu servidor Ubuntu em produção.
// Exemplo em Desenvolvimento: 'http://localhost:3000'
// Exemplo em Produção: 'https://api.maniadealegria.shop' ou 'http://123.45.67.89:3000'

const CONFIG = {
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://api.maniadealegria.shop',
    UPLOADS_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/uploads/produtos'
        : 'https://api.maniadealegria.shop/uploads/produtos'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
