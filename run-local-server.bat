@echo off
rem --- se placer dans le dossier du script (chemins avec espaces OK)
cd /d "%~dp0"

rem --- config
set PORT=5500
rem choisis l'URL que tu veux ouvrir au démarrage :
set URL=http://127.0.0.1:%PORT%/pages/About.html?lang=fr
rem (ou : set URL=http://127.0.0.1:%PORT%/index.html)

echo === Démarrage du serveur local sur le port %PORT% ===

rem --- si http-server est installé globalement
where http-server >nul 2>&1
if %errorlevel%==0 (
  start "" "%URL%"
  http-server -c-1 -p %PORT% .
  goto :end
)

rem --- sinon, tente via npx (Node requis, pas d'install globale)
where npx >nul 2>&1
if %errorlevel%==0 (
  start "" "%URL%"
  npx http-server -c-1 -p %PORT% .
  goto :end
)

rem --- sinon, fallback Python
where py >nul 2>&1
if %errorlevel%==0 (
  start "" "%URL%"
  py -m http.server %PORT%
  goto :end
)

where python >nul 2>&1
if %errorlevel%==0 (
  start "" "%URL%"
  python -m http.server %PORT%
  goto :end
)

echo.
echo Impossible de lancer un serveur.
echo Installe Node (pour http-server/npx) ou Python 3.
pause

:end
