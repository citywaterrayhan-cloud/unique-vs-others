@echo off
title Unique vs Others - Website & Admin Panel
cd /d "%~dp0"

echo.
echo ==========================================
echo     UNIQUE VS OTHERS - WEBSITE SERVER
echo ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js LTS first.
    pause
    exit /b 1
)
if not exist "server.js" (
    echo ERROR: server.js was not found.
    pause
    exit /b 1
)
if not exist "node_modules\express" (
    echo Installing required server package...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
)
start "" "http://localhost:3000/"
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000/admin.html"
echo Website:     http://localhost:3000/
echo Admin Panel: http://localhost:3000/admin.html
echo.
echo Keep this window open while using the website/admin panel.
echo Close this window to stop the server.
echo.
node server.js
echo.
echo Server stopped.
pause
