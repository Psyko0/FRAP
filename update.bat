@echo off
cd /d "%~dp0"

REM Demander un message de commit
set /p msg=Message de commit : 

REM Ajouter tous les fichiers modifiés
git add .

REM Commit avec le message fourni
git commit -m "%msg%"

REM Mettre à jour avec rebase
git pull --rebase origin main

REM Pousser sur GitHub
git push origin main

echo.
echo ==============================
echo   ✅ Push terminé avec succès
echo ==============================
pause
