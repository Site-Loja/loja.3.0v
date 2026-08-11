// ============================================================
// API REST - Mania de Alegria
// Node.js + Express + SQLite + Multer
// Execute: npm install && npm start
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();

// ============================================================
// CONFIGURAÇÕES GERAIS (lidas do .env)
// ============================================================
const PORT = process.env.PORT || 3000;
const API_BASE_URL = (process.env.API_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

// Pasta de uploads: usa UPLOADS_DIR do .env quando existir
// (em produção: /var/www/meusite/uploads/produtos)
const UPLOADS_DIR = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(__dirname, 'uploads', 'produtos');
const UPLOADS_URL = `${API_BASE_URL}/uploads/produtos`;

// ============================================================
// SEGURANÇA: headers + CORS + rate limiting
// ============================================================

// Headers de segurança
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite <img> de outros domínios (GitHub Pages)
}));

// CORS: libera origens configuradas no .env (GitHub Pages, localhost, etc.)
const allowedOrigins = (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Sem Origin (curl, Postman, mesmo domínio) => libera
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origem não autorizada pelo CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Limite global de requisições
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: 'Muitas requisições. Tente novamente mais tarde.' },
}));

// Limite específico para uploads (mais restrito)
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: 'Limite de uploads atingido. Tente novamente em 1 hora.' },
});

app.use(express.json({ limit: '1mb' }));

// ============================================================
// AUTENTICAÇÃO DO PAINEL ADMIN
// Altere ADMIN_PASSWORD e ADMIN_TOKEN no .env antes de publicar!
// ============================================================
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'troque-este-token';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// POST /api/login - troca a senha do admin por um token
app.post('/api/login', (req, res) => {
    const senha = String(req.body.senha || '');
    if (senha === ADMIN_PASSWORD) {
        return res.json({ token: ADMIN_TOKEN, mensagem: 'Login realizado com sucesso.' });
    }
    return res.status(401).json({ erro: 'Senha incorreta.' });
});

// Middleware: exige header "Authorization: Bearer <token>"
function exigirAuth(req, res, next) {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (token === ADMIN_TOKEN) return next();
    return res.status(401).json({ erro: 'Não autorizado. Faça login como administrador.' });
}

// ============================================================
// BANCO DE DADOS (SQLite)
// ============================================================
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Erro ao abrir o banco de dados:', err.message);
        process.exit(1);
    }
    console.log(`🗄️  Banco de dados SQLite em: ${DB_PATH}`);
});

// Promisify das funções do sqlite3
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});

// Criação da tabela de produtos
async function initDb() {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS produtos (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nome        TEXT NOT NULL,
            descricao   TEXT NOT NULL DEFAULT '',
            preco       REAL NOT NULL DEFAULT 0,
            colecao     TEXT NOT NULL DEFAULT 'geral',
            imagem_url  TEXT NOT NULL DEFAULT '',
            em_estoque  INTEGER NOT NULL DEFAULT 1,
            destaque    INTEGER NOT NULL DEFAULT 0,
            criado_em   TEXT NOT NULL DEFAULT (datetime('now')),
            atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);
    console.log('✅ Tabela "produtos" pronta');
}
initDb().catch((e) => { console.error('❌ Falha ao inicializar banco:', e); process.exit(1); });

// ============================================================
// UPLOAD DE IMAGENS (multer)
// ============================================================
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Extensões e MIME types permitidos
const EXTENSOES_PERMITIDAS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const MIMES_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

// Sanitização do nome do arquivo: mantém apenas letras/números/'-'/'_'
function sanitizarNomeArquivo(nomeOriginal) {
    const ext = path.extname(nomeOriginal).toLowerCase();
    const base = path.basename(nomeOriginal, ext)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')   // remove acentos
        .replace(/[^a-zA-Z0-9-_]/g, '-')   // troca caracteres especiais por '-'
        .replace(/-+/g, '-')               // remove hífens duplicados
        .slice(0, 60)                      // limita tamanho
        .replace(/^-+|-+$/g, '');
    return `${base || 'imagem'}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => cb(null, sanitizarNomeArquivo(file.originalname)),
});

const fileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (MIMES_PERMITIDOS.has(file.mimetype) && EXTENSOES_PERMITIDAS.has(ext)) {
        return cb(null, true);
    }
    return cb(new Error('Tipo de arquivo não permitido. Envie apenas JPG, PNG, WEBP, GIF ou AVIF.'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // máximo 5 MB
});

// Erros do multer viram respostas JSON amigáveis
function tratarErroMulter(err, _req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ erro: 'Arquivo muito grande. Máximo permitido: 5 MB.' });
        }
        return res.status(400).json({ erro: `Erro no upload: ${err.code}` });
    }
    if (err.message && err.message.includes('Tipo de arquivo')) {
        return res.status(400).json({ erro: err.message });
    }
    next(err);
}

// ============================================================
// VALIDAÇÃO DE DADOS DO PRODUTO
// ============================================================
function validarProduto(body) {
    const erros = [];
    const nome = (body.nome || '').toString().trim();
    const preco = Number(body.preco);
    const colecao = (body.colecao || 'geral').toString().trim().toLowerCase();

    if (!nome) erros.push('O campo "nome" é obrigatório.');
    if (nome.length > 120) erros.push('O nome deve ter no máximo 120 caracteres.');
    if (Number.isNaN(preco) || preco < 0) erros.push('O campo "preco" deve ser um número maior ou igual a 0.');
    if (colecao.length > 50) erros.push('A coleção deve ter no máximo 50 caracteres.');

    return {
        erros,
        dados: {
            nome,
            descricao: (body.descricao || '').toString().trim().slice(0, 500),
            preco: Math.round(preco * 100) / 100,
            colecao: colecao || 'geral',
            imagem_url: (body.imagem_url || '').toString().trim(),
            em_estoque: body.em_estoque === undefined || body.em_estoque === '' ? 1 : Number(body.em_estoque) ? 1 : 0,
            destaque: Number(body.destaque) ? 1 : 0,
        },
    };
}

// ============================================================
// HELPERS
// ============================================================
// Converte linha do banco para JSON da API (com URL absoluta da imagem)
function formatarProduto(row) {
    if (!row) return null;
    return {
        id: row.id,
        nome: row.nome,
        descricao: row.descricao,
        preco: row.preco,
        colecao: row.colecao,
        imagem_url: row.imagem_url
            ? (/^https?:\/\//.test(row.imagem_url) ? row.imagem_url : `${UPLOADS_URL}/${row.imagem_url}`)
            : '',
        em_estoque: Boolean(row.em_estoque),
        destaque: Boolean(row.destaque),
        criado_em: row.criado_em,
        atualizado_em: row.atualizado_em,
    };
}

// Remove o arquivo de imagem do disco, se existir e pertencer a este servidor
function removerImagemDoDisco(imagemUrl) {
    if (!imagemUrl) return;
    const nome = path.basename(imagemUrl);
    if (!nome || /^https?:\/\//.test(nome)) return;
    const caminho = path.join(UPLOADS_DIR, nome);
    fs.unlink(caminho, () => {}); // ignora erro se o arquivo não existir
}

// ============================================================
// ENDPOINTS
// ============================================================

// Health check (útil para o monitoramento)
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', servico: 'mania-de-alegria-api', data: new Date().toISOString() });
});

// ---- GET /api/produtos - Listar todos ----
// Suporte a ?colecao= e ?busca=
app.get('/api/produtos', async (req, res, next) => {
    try {
        const { colecao, busca } = req.query;
        let sql = 'SELECT * FROM produtos WHERE 1=1';
        const params = [];

        if (colecao) {
            sql += ' AND colecao = ?';
            params.push(colecao.toString().toLowerCase());
        }
        if (busca) {
            sql += ' AND (nome LIKE ? OR descricao LIKE ?)';
            params.push(`%${busca}%`, `%${busca}%`);
        }
        sql += ' ORDER BY id DESC';

        const rows = await dbAll(sql, params);
        res.json(rows.map(formatarProduto));
    } catch (err) {
        next(err);
    }
});

// ---- GET /api/produtos/:id - Buscar um produto ----
app.get('/api/produtos/:id', async (req, res, next) => {
    try {
        const row = await dbGet('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ erro: 'Produto não encontrado.' });
        res.json(formatarProduto(row));
    } catch (err) {
        next(err);
    }
});

// ---- POST /api/produtos - Cadastrar (multipart/form-data, com imagem opcional) ----
app.post('/api/produtos', exigirAuth, uploadLimiter, upload.single('imagem'), async (req, res, next) => {
    try {
        const { erros, dados } = validarProduto(req.body);
        if (erros.length) {
            if (req.file) removerImagemDoDisco(req.file.filename); // limpa upload descartado
            return res.status(400).json({ erro: erros.join(' ') });
        }

        // Imagem enviada junto com o produto? Usa o nome do arquivo salvo
        if (req.file) dados.imagem_url = req.file.filename;

        const result = await dbRun(
            `INSERT INTO produtos (nome, descricao, preco, colecao, imagem_url, em_estoque, destaque)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [dados.nome, dados.descricao, dados.preco, dados.colecao, dados.imagem_url, dados.em_estoque, dados.destaque]
        );

        const row = await dbGet('SELECT * FROM produtos WHERE id = ?', [result.lastID]);
        res.status(201).json(formatarProduto(row));
    } catch (err) {
        if (req.file) removerImagemDoDisco(req.file.filename);
        next(err);
    }
});

// ---- PUT /api/produtos/:id - Atualizar (multipart/form-data, imagem opcional) ----
app.put('/api/produtos/:id', exigirAuth, uploadLimiter, upload.single('imagem'), async (req, res, next) => {
    try {
        const existente = await dbGet('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
        if (!existente) {
            if (req.file) removerImagemDoDisco(req.file.filename);
            return res.status(404).json({ erro: 'Produto não encontrado.' });
        }

        // merge: campos ausentes mantêm o valor atual do banco
        const body = {
            nome: req.body.nome ?? existente.nome,
            descricao: req.body.descricao ?? existente.descricao,
            preco: req.body.preco ?? existente.preco,
            colecao: req.body.colecao ?? existente.colecao,
            em_estoque: req.body.em_estoque ?? existente.em_estoque,
            destaque: req.body.destaque ?? existente.destaque,
        };
        const { erros, dados } = validarProduto(body);
        if (erros.length) {
            if (req.file) removerImagemDoDisco(req.file.filename);
            return res.status(400).json({ erro: erros.join(' ') });
        }

        dados.imagem_url = existente.imagem_url;
        // Nova imagem enviada => remove a antiga do disco
        if (req.file) {
            removerImagemDoDisco(existente.imagem_url);
            dados.imagem_url = req.file.filename;
        }

        await dbRun(
            `UPDATE produtos
             SET nome = ?, descricao = ?, preco = ?, colecao = ?, imagem_url = ?,
                 em_estoque = ?, destaque = ?, atualizado_em = datetime('now')
             WHERE id = ?`,
            [dados.nome, dados.descricao, dados.preco, dados.colecao, dados.imagem_url,
             dados.em_estoque, dados.destaque, req.params.id]
        );

        const row = await dbGet('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
        res.json(formatarProduto(row));
    } catch (err) {
        if (req.file) removerImagemDoDisco(req.file.filename);
        next(err);
    }
});

// ---- DELETE /api/produtos/:id - Remover (e apaga a imagem do disco) ----
app.delete('/api/produtos/:id', exigirAuth, async (req, res, next) => {
    try {
        const existente = await dbGet('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
        if (!existente) return res.status(404).json({ erro: 'Produto não encontrado.' });

        await dbRun('DELETE FROM produtos WHERE id = ?', [req.params.id]);
        removerImagemDoDisco(existente.imagem_url);
        res.json({ mensagem: 'Produto removido com sucesso.', id: Number(req.params.id) });
    } catch (err) {
        next(err);
    }
});

// ---- POST /api/upload - Upload de imagem avulso (usado pelo formulário separado) ----
app.post('/api/upload', exigirAuth, uploadLimiter, upload.single('imagem'), (req, res) => {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado no campo "imagem".' });
    res.status(201).json({
        mensagem: 'Imagem enviada com sucesso.',
        nome_arquivo: req.file.filename,
        url: `${UPLOADS_URL}/${req.file.filename}`,
    });
});

// ---- Servir as imagens publicamente ----
app.use('/uploads/produtos', express.static(UPLOADS_DIR, {
    maxAge: '7d',
    immutable: false,
}));

// ============================================================
// TRATAMENTO DE ERROS GLOBAL
// ============================================================
// Erros do multer (tamanho/tipo de arquivo) viram 400/413 amigáveis
app.use(tratarErroMulter);

app.use((err, _req, res, _next) => {
    console.error('❌ Erro:', err.message);
    const status = err.status || err.statusCode || 500;
    const mensagem = err.expose || status < 500 ? err.message : 'Erro interno do servidor.';
    res.status(status).json({ erro: mensagem });
});

// Rotas não encontradas
app.use((_req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada. Veja /api/health para verificar o serviço.' });
});

// ============================================================
// INICIALIZAÇÃO
// ============================================================
app.listen(PORT, () => {
    console.log(`🚀 API rodando em ${API_BASE_URL}`);
    console.log(`🖼️  Imagens servidas de: ${UPLOADS_DIR}`);
    console.log(`🔗 Exemplo de URL de imagem: ${UPLOADS_URL}/exemplo.jpg`);
});
