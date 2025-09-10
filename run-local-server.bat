@echo off
setlocal

rem --- go to this script folder (handles spaces)
cd /d "%~dp0"

rem --- config
set "PORT=5500"
set "LRPORT=35729"
set "URL=http://127.0.0.1:%PORT%/pages/About.html?lang=fr"
rem (or: set "URL=http://127.0.0.1:%PORT%/index.html")

echo ============================================
echo === Starting LiveReload on %LRPORT%      ===
echo ============================================

rem --- LiveReload watcher (requires Node/npx)
where npx >nul 2>&1
if %errorlevel%==0 (
  start "livereload" cmd /c "npx livereload -p %LRPORT% -w 150 ."
) else (
  echo [info] npx not found - LiveReload disabled
)

echo ============================================
echo === Starting local server on %PORT%      ===
echo ============================================

rem --- open browser
start "" "%URL%"

rem --- use global http-server if available
where http-server >nul 2>&1
if %errorlevel%==0 (
  http-server -c-1 -p %PORT% .
  goto :end
)

rem --- else try npx http-server (Node without global install)
where npx >nul 2>&1
if %errorlevel%==0 (
  npx http-server -c-1 -p %PORT% .
  goto :end
)

rem --- else fallback to Python
where py >nul 2>&1
if %errorlevel%==0 (
  py -m http.server %PORT%
  goto :end
)

where python >nul 2>&1
if %errorlevel%==0 (
  python -m http.server %PORT%
  goto :end
)

echo.
echo ERROR: no server available. Install Node (for http-server/npx) or Python 3.
pause

:end
endlocal
