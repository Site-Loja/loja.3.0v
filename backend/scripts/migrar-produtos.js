// ============================================================
// Script de migração: extrai os produtos do index.html e
// copia as imagens para a pasta de uploads do servidor.
//
// Uso:  npm run migrate
// (a pasta de imagens de origem pode ser passada por argumento)
// ============================================================

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const RAIZ = path.join(__dirname, '..', '..'); // pasta raiz do projeto (loja.3.0v)
// O HTML de origem pode ser passado como argumento.
// Dica: se o index.html já foi transformado para a versão dinâmica, recupere o
// original do git:  git show HEAD:index.html > /tmp/index.html
// e rode:           node scripts/migrar-produtos.js /tmp/index.html
const INDEX_HTML = process.argv[2] || path.join(RAIZ, 'index.html');
const IMAGENS_ORIGEM = process.argv[3] || path.join(RAIZ, 'imagens');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database.sqlite');
const UPLOADS_DIR = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(__dirname, '..', 'uploads', 'produtos');

// --- 1. Lê o index.html e extrai os cards de produto ---
const html = fs.readFileSync(INDEX_HTML, 'utf8');
const regex = /<div class="product-card"([^>]*)>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g;

const produtos = [];
let match;
while ((match = regex.exec(html)) !== null) {
    const attrs = match[1];
    const getAttr = (nome) => {
        const m = attrs.match(new RegExp(`data-${nome}="([^"]*)"`));
        return m ? m[1] : '';
    };

    const nome = getAttr('name');
    if (!nome) continue; // ignora cards sem nome

    produtos.push({
        nome,
        descricao: getAttr('description') || '',
        preco: parseFloat((getAttr('price') || '0').replace(/[^\d.]/g, '')) || 0,
        colecao: getAttr('collection') || 'geral',
        imagem_origem: match[2],
        em_estoque: attrs.includes('pointer-events:none') ? 0 : 1,
    });
}

if (produtos.length === 0) {
    console.error('❌ Nenhum produto encontrado no index.html. Verifique o caminho:', INDEX_HTML);
    process.exit(1);
}

console.log(`📦 Encontrados ${produtos.length} produtos no index.html`);

// --- 2. Copia as imagens para a pasta de uploads ---
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function copiarImagem(caminhoRelativo) {
    if (!caminhoRelativo) return '';
    // aceita "imagens/0001.png", "/imagens/x.png", "imagens/banner01.png"
    const nomeArquivo = path.basename(caminhoRelativo.replace(/\\/g, '/'));
    const origem = path.join(IMAGENS_ORIGEM, nomeArquivo);
    if (!fs.existsSync(origem)) {
        console.warn(`⚠️  Imagem não encontrada (mantendo vazio): ${caminhoRelativo}`);
        return '';
    }
    const destino = path.join(UPLOADS_DIR, nomeArquivo);
    fs.copyFileSync(origem, destino);
    console.log(`🖼️  Copiada: ${nomeArquivo}`);
    return nomeArquivo;
}

// --- 3. Insere no banco SQLite ---
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT NOT NULL DEFAULT '',
        preco REAL NOT NULL DEFAULT 0,
        colecao TEXT NOT NULL DEFAULT 'geral',
        imagem_url TEXT NOT NULL DEFAULT '',
        em_estoque INTEGER NOT NULL DEFAULT 1,
        destaque INTEGER NOT NULL DEFAULT 0,
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    // limpa a tabela antes de migrar (evita duplicatas ao rodar de novo)
    db.run('DELETE FROM produtos');
    console.log('🧹 Tabela limpa (para rodada limpa)');

    const stmt = db.prepare(
        `INSERT INTO produtos (nome, descricao, preco, colecao, imagem_url, em_estoque, destaque)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
    );

    produtos.forEach((p) => {
        const imagem = copiarImagem(p.imagem_origem);
        stmt.run(p.nome, p.descricao, p.preco, p.colecao, imagem, p.em_estoque);
    });

    stmt.finalize();
});

db.close((err) => {
    if (err) {
        console.error('❌ Erro ao fechar o banco:', err.message);
        process.exit(1);
    }
    console.log(`\n✅ Migração concluída!`);
    console.log(`   Produtos: ${produtos.length}`);
    console.log(`   Banco:    ${DB_PATH}`);
    console.log(`   Imagens:  ${UPLOADS_DIR}`);
    console.log(`\n🚀 Agora inicie o servidor: npm start`);
});
