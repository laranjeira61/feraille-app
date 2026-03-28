#!/bin/bash
# ============================================================
# Script de mise à jour - À exécuter sur le Synology DS220+
# Chemin conseillé : /volume1/docker/feraille-app/deploy/synology-update.sh
# ============================================================

set -e

# Add Synology Docker binary paths to PATH
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/syno/bin

APP_DIR="/volume1/docker/feraille-app/backend"
LOG_FILE="/volume1/docker/feraille-app/deploy/update.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Début de la mise à jour ==="

# Aller dans le répertoire du backend
cd "$APP_DIR"

# Récupérer les dernières modifications depuis git
log "Git pull..."
git pull origin main

# Reconstruire et redémarrer le conteneur Docker
log "Rebuild du conteneur Docker..."
docker compose up --build -d

# Attendre que le conteneur soit healthy
log "Attente du démarrage..."
sleep 10

# Vérifier que l'API répond
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
  log "✓ API opérationnelle (HTTP $HTTP_STATUS)"
else
  log "✗ ATTENTION : API non disponible (HTTP $HTTP_STATUS)"
  exit 1
fi

log "=== Mise à jour terminée avec succès ==="
