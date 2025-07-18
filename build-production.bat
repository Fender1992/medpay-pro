@echo off
title Building MedChat AI Pro for Production

echo.
echo =====================================
echo   MedChat AI Pro - Production Build
echo =====================================
echo.

:: Check if dependencies are installed
if not exist "node_modules" (
    echo [ERROR] Dependencies not installed!
    echo        Please run install-dependencies.bat first
    pause
    exit /b 1
)

:: Check for .env.local file
if not exist ".env.local" (
    echo [ERROR] .env.local file not found!
    echo        Please configure your API keys first
    pause
    exit /b 1
)

echo [INFO] Building for production...
echo       This may take a few minutes...
echo.

:: Build the application
call npm run build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed!
    echo        Check the error messages above
    pause
    exit /b 1
)

echo.
echo =====================================
echo [SUCCESS] Production build complete!
echo =====================================
echo.
echo To run the production server:
echo   npm start
echo.
echo To deploy to Vercel:
echo   1. Push your code to GitHub
echo   2. Connect to Vercel
echo   3. Import your repository
echo   4. Configure environment variables
echo.
pause