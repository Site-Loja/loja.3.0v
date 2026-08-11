# 🛒 Mania de Alegria — Arquitetura Separada (Front-end + API)

Guia completo para transformar o site monolítico em **Front-end no GitHub Pages** +
**API REST em servidor Ubuntu** + **banco SQLite** + **imagens na pasta do servidor**.

---

## 1. Análise do projeto atual (o que foi feito)

| Item | Antes (monolítico) | Depois (nova arquitetura) |
|---|---|---|
| Produtos | 68 cards fixos escritos à mão dentro do `index.html` | 68 registros no banco SQLite, servidos pela API |
| Front-end | HTML + Tailwind CDN + `js/script.js` (carrossel, carrinho, cupom) | Mesmo visual, mas produtos carregados via `fetch` |
| Imagens | Pasta `imagens/` versionada no Git | Pasta `backend/uploads/produtos/` no servidor (fora do Git) |
| Back-end | Não existia | API Node.js/Express em `backend/` |
| Cadastro/edição | Edição manual do HTML | Painel admin em `admin.html` |

O front-end **mantém** carrossel de banners, carrinho (WhatsApp), cupom
RELAMPAGO, busca e filtros por coleção — tudo funcionando com dados da API.

---

## 2. Estrutura de pastas

```
loja.3.0v/
├── index.html              ← front-end (GitHub Pages)
├── admin.html              ← painel admin (GitHub Pages também)
├── css/style.css
├── js/
│   ├── config.js           ← URL da API (único lugar para configurar)
│   ├── catalogo.js         ← busca produtos na API e renderiza
│   ├── admin.js            ← lógica do painel admin
│   ├── script.js           ← carrossel, carrinho, cupom (adaptado)
│   └── snow-debug.js
├── imagens/                ← assets do layout (logo, banners) — mantidos no Git
├── backend/                ← NÃO sobe para o GitHub Pages (fica no Ubuntu)
│   ├── server.js           ← API completa
│   ├── package.json
│   ├── .env / .env.example
│   ├── .gitignore
│   ├── database.sqlite     ← banco (gerado, fora do Git)
│   ├── uploads/produtos/   ← fotos dos produtos (gerado, fora do Git)
│   └── scripts/migrar-produtos.js
└── .gitignore
```

> **Imagens**: as fotos de **produto** ficam em `backend/uploads/produtos/` no
> servidor. Os **banners e o logo** são assets do layout e continuam no
> repositório (sem eles o site quebra). Se quiser remover as fotos de produto
> do histórico do Git: `git rm -r --cached imagens`.

---

## 3. Banco de dados escolhido: SQLite

Escolhi **SQLite** porque:
- **Zero instalação/configuração** no Ubuntu (arquivo único, sem usuário/senha/porta);
- Perfeito para catálogo com ~68 produtos e um único admin;
- Backup = copiar 1 arquivo.

Se um dia precisar de MySQL/PostgreSQL, a mudança fica restrita ao
`backend/server.js` (as rotas não mudam). As rotas e o front-end já estão
prontos para isso.

---

## 4. Como testar LOCALMENTE (antes de subir para produção)

### 4.1 Subir a API (na sua máquina)

```bash
cd backend
npm install

# (opcional) migrar os produtos do index.html original para o banco:
# Se o index.html já virou dinâmico, recupere o original do git:
git show HEAD:index.html > /tmp/index.html
npm run migrate -- /tmp/index.html
# (sem argumento, usa o index.html atual)

npm start        # ou: npm run dev (reinicia sozinho a cada edição)
```

A API sobe em `http://localhost:3000`:
- `http://localhost:3000/api/health` → `{"status":"ok",...}`
- `http://localhost:3000/api/produtos` → JSON com os 68 produtos

### 4.2 Abrir o front-end localmente

O GitHub Pages não roda Node, então use um servidor estático simples:

```bash
npx serve .          # na raiz do projeto → http://localhost:3001
# ou no VS Code: extensão "Live Server" (porta 5500)
```

O `js/config.js` já usa `http://localhost:3000` quando o site roda em
`localhost` — **funciona sem mexer em nada**.

> ⚠️ **Importante**: o site está publicado em `https` (maniadealegria.shop),
> mas a API local é `http`. Em produção isso vira **mixed content** e o
> navegador bloqueia. Solução na seção 6 (HTTPS via Nginx ou domínio).

---

## 5. Deploy do BACK-END no Ubuntu (passo a passo)

### 5.1 Instalar Node.js 20 LTS

```bash
# no servidor Ubuntu (SSH):
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # deve mostrar v20.x
```

### 5.2 Enviar o código e instalar

```bash
sudo mkdir -p /var/www/meusite
sudo chown -R $USER:$USER /var/www/meusite

# envie o backend (pode usar rsync/scp/git):
rsync -av --exclude node_modules --exclude .env backend/ /var/www/meusite/backend/

cd /var/www/meusite/backend
npm install --omit=dev

# crie o .env de produção (veja o exemplo):
cp .env.example .env
nano .env
#  - API_BASE_URL=http://SEU-IP:3000
#  - UPLOADS_DIR=/var/www/meusite/uploads/produtos
#  - CORS_ORIGINS=https://maniadealegria.shop,https://SEU-USUARIO.github.io
#  - ADMIN_PASSWORD=uma-senha-forte
#  - ADMIN_TOKEN=openssl rand -hex 32   (gere um token)

mkdir -p /var/www/meusite/uploads/produtos
```

### 5.3 Migrar os produtos (uma vez)

```bash
cd /var/www/meusite/backend
# envie também o index.html original OU rode a migração na sua máquina e
# envie o database.sqlite + uploads/produtos/ gerados:
npm run migrate -- /caminho/para/index.html
```

### 5.4 Manter o servidor no ar com PM2

```bash
sudo npm install -g pm2
cd /var/www/meusite/backend
pm2 start server.js --name mania-api
pm2 save
pm2 startup   # roda o comando sugerido e copia/cola no terminal
```

Comandos úteis: `pm2 logs mania-api`, `pm2 restart mania-api`, `pm2 status`.

### 5.5 (Recomendado) Nginx como proxy reverso + HTTPS

Instalar e configurar:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/mania
```

```nginx
server {
    listen 80;
    server_name api.maniadealegria.shop;   # subdomínio para a API

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10m;           # permite uploads até 5MB
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mania /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS grátis:
sudo certbot --nginx -d api.maniadealegria.shop
```

Com HTTPS, o `API_BASE_URL` vira `https://api.maniadealegria.shop` e o problema
de mixed content desaparece.

---

## 6. Deploy do FRONT-END no GitHub Pages

1. Suba os arquivos da raiz (index.html, admin.html, css/, js/, imagens/) para o
   repositório `maniadealegria/maniadealegria.github.io` (ou o repo do projeto);
2. GitHub → **Settings → Pages → Source: Deploy from a branch → main → / (root)**;
3. Edite `js/config.js` com o endereço real da API:
   ```js
   API_BASE_URL: 'https://api.maniadealegria.shop',   // ou http://SEU-IP:3000
   ```
4. Confirme que esse endereço está em `CORS_ORIGINS` no `.env` do servidor.

> 🔒 **Importante**: `admin.html` também fica público no GitHub Pages, mas a
> API só aceita cadastro/edição/exclusão com o token (senha). Quem abrir o
> painel sem login vê apenas a tela de senha.

---

## 7. Endpoints da API

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/api/health` | Status do serviço | — |
| GET | `/api/produtos` | Lista todos (`?colecao=` e `?busca=` opcionais) | — |
| GET | `/api/produtos/:id` | Busca um produto | — |
| POST | `/api/login` | Troca senha por token (`{"senha":"..."}`) | — |
| POST | `/api/produtos` | Cadastra (multipart, campo `imagem`) | Bearer token |
| PUT | `/api/produtos/:id` | Atualiza (multipart, imagem opcional) | Bearer token |
| DELETE | `/api/produtos/:id` | Remove produto + imagem do disco | Bearer token |
| POST | `/api/upload` | Upload de imagem avulso | Bearer token |

A imagem é retornada como URL completa: `http://SEU-IP:3000/uploads/produtos/nome.jpg`.

---

## 8. Exemplos de uso no front-end (fetch puro)

```js
// Listar produtos
fetch(`${CONFIG.API_BASE_URL}/api/produtos`)
  .then(r => r.json())
  .then(produtos => console.log(produtos));

// Cadastrar com imagem (FormData)
const formData = new FormData();
formData.append('nome', 'Camiseta Nova');
formData.append('descricao', 'Camiseta infantil');
formData.append('preco', '49.90');
formData.append('colecao', 'camisetas');
formData.append('em_estoque', '1');
formData.append('imagem', inputArquivo.files[0]);  // <input type="file">

fetch(`${CONFIG.API_BASE_URL}/api/produtos`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${localStorage.getItem('mania_admin_token')}` },
  body: formData,   // NÃO defina Content-Type: o navegador gera sozinho
});

// Atualizar
fetch(`${CONFIG.API_BASE_URL}/api/produtos/5`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData,
});

// Excluir
fetch(`${CONFIG.API_BASE_URL}/api/produtos/5`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` },
});
```

---

## 8.1 Formulário HTML mínimo com upload

```html
<form id="formProduto">
  <input name="nome" placeholder="Nome" required>
  <input name="preco" placeholder="Preço" type="number" step="0.01" required>
  <input name="imagem" type="file" accept="image/*">
  <button type="submit">Salvar</button>
</form>
<script>
document.getElementById('formProduto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const res = await fetch(`${CONFIG.API_BASE_URL}/api/produtos`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  const produto = await res.json();
  if (!res.ok) return alert('Erro: ' + produto.erro);
  alert('Produto cadastrado! ID ' + produto.id);
});
</script>
```

O painel completo (login, listagem, editar, excluir, preview) já está pronto em
**`admin.html`** — use-o como referência.

---

## 9. Segurança implementada

- ✅ **Validação de arquivos**: apenas JPG/PNG/WEBP/GIF/AVIF, máximo 5 MB
  (tamanho e tipo verificados no servidor — não confie só no front-end);
- ✅ **Nome de arquivo sanitizado**: remove acentos/caracteres especiais e
  adiciona sufixo aleatório (`calca-2-a1b2c3d4.png`) — evita sobrescrita e
  path traversal;
- ✅ **Rate limiting**: 300 req/15min na API; uploads limitados a 50/hora;
- ✅ **Autenticação**: POST/PUT/DELETE exigem `Authorization: Bearer <token>`,
  obtido no `POST /api/login` com a senha do `.env`;
- ✅ **Headers seguros**: helmet (X-Frame-Options, nosniff, CSP no front);
- ✅ **CORS restrito**: só origens listadas em `CORS_ORIGINS` (use `*` apenas
  em desenvolvimento);
- ⚠️ **Compressão de imagem**: o upload salva o arquivo original. Para
  redimensionar/comprimir no servidor, instale `sharp`
  (`npm install sharp`) e use `sharp(req.file.path).resize({width:1000})
  .jpeg({quality:80}).toFile(...)` no handler do upload — o guia mantém o
  mínimo para não adicionar dependência nativa.

> 🔑 **Antes de publicar, troque** `ADMIN_PASSWORD` e `ADMIN_TOKEN` no `.env`!

---

## 10. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Access-Control-Allow-Origin` ausente no navegador (CORS) | Origem não está no `CORS_ORIGINS` do servidor | Adicione `https://maniadealegria.shop` e reinicie o PM2 (`pm2 restart mania-api`) |
| Imagens não carregam (`ERR_CONNECTION_REFUSED`) | `API_BASE_URL` no `config.js` aponta para localhost | Aponte para o IP/domínio real do servidor |
| Imagens bloqueadas em produção (`mixed content`) | Site em HTTPS chamando API em HTTP | Coloque a API atrás de HTTPS (certbot) ou use `https://api.maniadealegria.shop` |
| `404` ao acessar a imagem | Arquivo não existe na pasta `UPLOADS_DIR` | Confira `ls /var/www/meusite/uploads/produtos/` e o caminho no `.env` |
| `401 Não autorizado` ao salvar | Token ausente/expirado no painel | Faça login de novo em `admin.html` |
| `413 Arquivo muito grande` | Imagem > 5 MB | Reduza a imagem (ou aumente `limits.fileSize` no `server.js`) |
| `500 Erro interno` no upload | Pasta `uploads` sem permissão | `sudo chown -R $USER:$USER /var/www/meusite/uploads` |
| O site mostra "Não foi possível carregar os produtos" | API fora do ar | `pm2 status` e `pm2 logs mania-api` |
| Porta 3000 ocupada | Outro serviço na porta | Mude `PORT` no `.env` e atualize `config.js` |

---

## 11. Fluxo de trabalho do dia a dia

1. **Adicionar produto**: abra `admin.html` → Novo Produto → preencha + imagem → Salvar;
2. **Editar/excluir**: card do produto no painel → Editar/Excluir;
3. A loja (`index.html`) busca os produtos automaticamente — **nenhuma edição
   manual de HTML nunca mais**;
4. Backup rápido: copie `database.sqlite` + `uploads/produtos/` do servidor.
