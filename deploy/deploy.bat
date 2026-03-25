@echo off
:: ============================================================
:: Script de déploiement depuis Windows vers le Synology
:: Modifier les variables ci-dessous selon votre configuration
:: ============================================================

set SYNOLOGY_USER=admin
set SYNOLOGY_HOST=192.168.1.x
set SYNOLOGY_SCRIPT=/volume1/docker/feraille-app/deploy/synology-update.sh

echo =============================================
echo   Déploiement Feraille-App vers Synology
echo =============================================
echo.
echo Connexion à %SYNOLOGY_USER%@%SYNOLOGY_HOST%...
echo.

ssh %SYNOLOGY_USER%@%SYNOLOGY_HOST% "bash %SYNOLOGY_SCRIPT%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Déploiement réussi !
) else (
    echo.
    echo [ERREUR] Le déploiement a échoué. Vérifiez les logs sur le Synology.
)

pause
