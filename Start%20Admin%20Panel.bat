@echo off
title Unique vs Others - Admin Panel
cd /d "%~dp0"

echo.
echo ==========================================
echo     UNIQUE VS OTHERS - ADMIN PANEL
echo ==========================================
echo.
echo Starting server...
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
    echo Please keep this BAT file inside the same folder as server.js.
    pause
    exit /b 1
)

start "" "http://localhost:3000/admin.html"

echo Admin Panel is starting...
echo.
echo Keep this window open while using the Admin Panel.
echo Close this window to stop the server.
echo.

node server.js

echo.
echo Server stopped.
pause
