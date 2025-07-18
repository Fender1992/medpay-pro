# MedChat AI Pro - Windows PowerShell Startup Script

Write-Host "🏥 MedChat AI Pro - Next.js Application" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Check if Node.js is installed
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please download and install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green

# Check if npm modules are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
}

# Check environment variables
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "⚠️  Creating .env.local file..." -ForegroundColor Yellow
    @"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Service Keys
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Optional Configuration
NEXT_PUBLIC_APP_NAME="MedChat AI Pro"
NEXT_PUBLIC_APP_VERSION="3.0.0"
"@ | Out-File -FilePath $envFile -Encoding UTF8
    
    Write-Host "📝 Please edit .env.local and add your API keys!" -ForegroundColor Yellow
    Write-Host "Opening .env.local in notepad..." -ForegroundColor Yellow
    Start-Process notepad.exe -ArgumentList $envFile -Wait
}

# Display API key status
Write-Host "`n🔑 API Key Status:" -ForegroundColor Cyan
$envContent = Get-Content $envFile -Raw

if ($envContent -match "ANTHROPIC_API_KEY=your-anthropic-api-key") {
    Write-Host "  ⚠️  Claude AI: Not configured (using mock data)" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ Claude AI: Configured" -ForegroundColor Green
}

if ($envContent -match "OPENAI_API_KEY=your-openai-api-key") {
    Write-Host "  ⚠️  OpenAI: Not configured (using mock data)" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ OpenAI: Configured" -ForegroundColor Green
}

if ($envContent -match "NEXT_PUBLIC_SUPABASE_URL=your-supabase-url") {
    Write-Host "  ⚠️  Supabase: Not configured (using mock data)" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ Supabase: Configured" -ForegroundColor Green
}

Write-Host "`n🚀 Starting MedChat AI Pro..." -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host "🌐 Opening browser at http://localhost:3000" -ForegroundColor Cyan
Write-Host "📌 Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Green

# Open browser after a short delay
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:3000"
} | Out-Null

# Start the development server
npm run dev