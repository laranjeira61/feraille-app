@echo off
:: ============================================================
:: Script de déploiement depuis Windows vers le Synology
:: Modifier les variables ci-dessous selon votre configuration
:: ============================================================

set SYNOLOGY_USER=cedric
set SYNOLOGY_HOST=192.168.10.11
set SYNOLOGY_SCRIPT=/volume1/docker/feraille-app/deploy/synology-update.sh

echo =============================================
echo   Déploiement Feraille-App vers Synology
echo =============================================
echo.
echo Connexion à %SYNOLOGY_USER%@%SYNOLOGY_HOST%...
echo.

ssh -t %SYNOLOGY_USER%@%SYNOLOGY_HOST% "sudo bash %SYNOLOGY_SCRIPT%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Déploiement réussi !
) else (
    echo.
    echo [ERREUR] Le déploiement a échoué. Vérifiez les logs sur le Synology.
)

pause
