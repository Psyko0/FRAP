@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

REM Aller dans le dossier du script (racine du repo)
cd /d "%~dp0"

REM --- Sanity checks ---
where git >nul 2>&1 || (echo [ERR] Git n'est pas dans le PATH. & goto :end)
git rev-parse --is-inside-work-tree >nul 2>&1 || (echo [ERR] Pas un repo Git ici. & goto :end)

REM Remote 'origin' present ?
git remote get-url origin >nul 2>&1 || (
  echo [ERR] Aucun remote 'origin'.
  echo -> Fais une fois:  git remote add origin https://github.com/TONCOMPTE/TONREPO.git
  goto :end
)

REM Branche courante (fallback sur main)
for /f "usebackq tokens=*" %%b in (`git rev-parse --abbrev-ref HEAD 2^>nul`) do set "BRANCH=%%b"
if not defined BRANCH set "BRANCH=main"
echo [INFO] Branche : %BRANCH%

REM --- Message de commit ---
set "msg="
set /p msg=Message de commit (vide = auto) : 
if "%msg%"=="" (
  for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set "D=%%a-%%b-%%c"
  set "msg=update: %D% %time%"
)

REM --- Stage (inclut suppressions) ---
echo [GIT] add -A
git add -A || goto :gitfail

REM --- Commit si quelque chose est staged ---
git rev-parse --verify HEAD >nul 2>&1
if errorlevel 1 (
  REM premier commit possible
  git diff --cached --quiet && echo [INFO] Rien a committer. & goto :pull
  echo [GIT] commit (first)
  git commit -m "%msg%" || goto :gitfail
) else (
  git diff --cached --quiet
  if errorlevel 1 (
    echo [GIT] commit
    git commit -m "%msg%" || goto :gitfail
  ) else (
    echo [INFO] Rien a committer.
  )
)

:pull
REM --- Integrer upstream proprement ---
echo [GIT] fetch origin %BRANCH%
git fetch origin %BRANCH% || goto :gitfail
echo [GIT] pull --rebase
git pull --rebase origin %BRANCH% || goto :gitfail

REM --- Push ---
echo [GIT] push origin %BRANCH%
git push -u origin %BRANCH% || goto :gitfail

echo.
echo ==============================
echo   ✅ Push termine avec succes
echo ==============================
goto :end

:gitfail
echo.
echo [ERR] Une commande Git a echoue. Verifie les messages ci-dessus
echo (conflit rebase, droits d'acces, remote/branche incorrects, etc.)

:end
echo.
pause
