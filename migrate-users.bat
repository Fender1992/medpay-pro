@echo off
title MedChat AI Pro - User Migration

echo.
echo =====================================
echo   MedChat AI Pro - User Migration
echo =====================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo https://nodejs.org/
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] Installing dependencies first...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo [INFO] Starting user migration to Supabase...
echo       This will create demo accounts and sample data
echo.

:: Run the migration script
node migrate-users.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Migration failed!
    echo        Check the error messages above
    pause
    exit /b 1
)

echo.
echo =====================================
echo [SUCCESS] Migration completed!
echo =====================================
echo.
echo Demo accounts are now available:
echo   admin@medchat.ai / admin123
echo   doctor@medchat.ai / doctor123
echo   patient@medchat.ai / patient123
echo.
echo Next: Run start-windows.bat to test the app
pause