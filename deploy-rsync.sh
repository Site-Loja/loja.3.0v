#!/usr/bin/env bash
# ============================================================
# DEPLOY DO BACK-END PARA O SERVIDOR UBUNTU (via rsync + ssh)
# ============================================================
# 1) Confira SSH_KEY e SERVIDOR abaixo.
# 2) Rode:  ./deploy-rsync.sh
# ============================================================
set -euo pipefail

# >>> EDITAR AQUI (se necessário) <<<
SSH_KEY="/run/media/jhonn/1TB/ssh-key-2026-08-11.key"  # chave privada do servidor
SERVIDOR="ubuntu@163.176.76.229"                       # usuário @ IP do servidor
REMOTO_DIR="/var/www/meusite"                          # pasta base no servidor

PROJETO="$(cd "$(dirname "$0")" && pwd)"
API="$SERVIDOR:$REMOTO_DIR"
RSYNC_SSH="ssh -i $SSH_KEY"
SSH="ssh -i $SSH_KEY"

echo "==> [1/6] Garantindo Node.js 20 e PM2 no servidor (só instala se faltar)..."
$SSH "$SERVIDOR" "command -v node >/dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs); command -v pm2 >/dev/null 2>&1 || sudo npm install -g pm2; node -v && pm2 -v"

echo "==> [2/6] Preparando pastas no servidor (sudo)..."
$SSH "$SERVIDOR" "sudo mkdir -p $REMOTO_DIR/backend $REMOTO_DIR/uploads/produtos && sudo chown -R \$USER:\$USER $REMOTO_DIR"

echo "==> [3/6] Enviando código do backend (sem node_modules/banco/uploads)..."
rsync -avz -e "$RSYNC_SSH" --delete \
    --exclude node_modules \
    --exclude database.sqlite \
    --exclude database.sqlite-journal \
    --exclude uploads \
    --exclude .env \
    "$PROJETO/backend/" "$API/backend/"

echo "==> [4/6] Enviando banco de dados, imagens e .env (produção)..."
rsync -avz -e "$RSYNC_SSH" "$PROJETO/backend/database.sqlite" "$API/backend/database.sqlite"
rsync -avz -e "$RSYNC_SSH" "$PROJETO/backend/.env" "$API/backend/.env"
rsync -avz -e "$RSYNC_SSH" "$PROJETO/backend/uploads/produtos/" "$API/uploads/produtos/"

echo "==> [5/6] Instalando dependências no servidor..."
$SSH "$SERVIDOR" "cd $REMOTO_DIR/backend && npm install --omit=dev"

echo "==> [6/6] (Re)iniciando com PM2..."
$SSH "$SERVIDOR" "cd $REMOTO_DIR/backend && (pm2 describe mania-api >/dev/null 2>&1 && pm2 restart mania-api || pm2 start server.js --name mania-api) && pm2 save"

echo ""
echo "✅ Deploy concluído!"
echo "   Teste da API:  curl http://163.176.76.229:3000/api/health"
echo "   Saúde:  $SSH $SERVIDOR 'pm2 status'"
echo "   Logs:   $SSH $SERVIDOR 'pm2 logs mania-api'"
