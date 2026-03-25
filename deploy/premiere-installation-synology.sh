#!/bin/bash
# ============================================================
# Script de PREMIÈRE installation sur le Synology DS220+
# À exécuter une seule fois via SSH
# ============================================================
#
# Prérequis sur le Synology :
#   1. Docker installé (via Package Center)
#   2. Git installé (via Package Center ou via Entware)
#   3. SSH activé (Panneau de configuration > Terminal)
#
# Commande pour l'exécuter depuis Windows :
#   ssh admin@192.168.1.x "bash -s" < premiere-installation-synology.sh
# ============================================================

set -e

INSTALL_DIR="/volume1/docker/feraille-app"
GIT_REPO="https://github.com/VOTRE-USER/feraille-app.git"  # ← Modifier avec votre dépôt git

echo "=== Installation de Feraille-App sur Synology ==="

# Créer le dossier d'installation
mkdir -p "$INSTALL_DIR"
cd /volume1/docker

# Cloner le dépôt
echo "Clonage du dépôt git..."
git clone "$GIT_REPO" feraille-app

# Créer le dossier de données persistantes
mkdir -p "$INSTALL_DIR/backend/data"

# Rendre le script de mise à jour exécutable
chmod +x "$INSTALL_DIR/deploy/synology-update.sh"

# Premier lancement Docker
echo "Premier démarrage du conteneur..."
cd "$INSTALL_DIR/backend"
docker-compose up --build -d

echo ""
echo "=== Installation terminée ! ==="
echo "API disponible sur : http://$(hostname -I | awk '{print $1}'):3000/api/health"
echo ""
echo "Pour les prochaines mises à jour, utiliser deploy.bat depuis Windows."
