@echo off
REM Cards Against Humanity - Startup Script
REM Per Windows

setlocal enabledelayedexpansion

echo.
echo 🃏 Cards Against Humanity - Avvio Automatico
echo ==============================================
echo.

REM Verifica Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js non trovato!
    echo Installa Node.js da: https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js trovato
node --version

REM Verifica npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm non trovato!
    pause
    exit /b 1
)

echo ✓ npm trovato
npm --version
echo.

REM Verifica file .env
if not exist .env (
    echo ⚠️  File .env non trovato!
    if exist env.template (
        echo Copiando env.template...
        copy env.template .env
        echo ⚠️  IMPORTANTE: Modifica il file .env con le tue configurazioni!
        echo    Specialmente la chiave OPENAI_API_KEY
        echo.
        pause
    ) else (
        echo ❌ File env.template non trovato!
        pause
        exit /b 1
    )
)

echo ✓ File .env trovato
echo.

REM Installa dipendenze backend se necessario
echo 📦 Controllo dipendenze backend...
if not exist node_modules (
    echo Installazione dipendenze backend...
    call npm install
) else (
    echo ✓ Dipendenze backend già installate
)
echo.

REM Installa dipendenze frontend se necessario
echo 📦 Controllo dipendenze frontend...
cd client
if not exist node_modules (
    echo Installazione dipendenze frontend...
    call npm install
) else (
    echo ✓ Dipendenze frontend già installate
)
cd ..
echo.

REM Genera client Prisma
echo 🔧 Generazione client Prisma...
call npx prisma generate
echo.

REM Esegui migrazioni Prisma
echo 🗄️  Esecuzione migrazioni database...
echo ⚠️  Assicurati che il database PostgreSQL sia in esecuzione!
echo.
call npx prisma migrate dev --name init
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Migrazione fallita. Se il database non è in esecuzione, avvialo con:
    echo    docker compose up -d db
    echo.
    echo Premi un tasto per continuare comunque se il DB è già migrato...
    pause
)
echo.

REM Build backend
echo 🔨 Build backend...
call npm run build
echo.

REM Avvia backend
echo 🚀 Avvio backend...
start "Cards Against Humanity - Backend" cmd /k "npm start"
echo ✓ Backend avviato
echo.

REM Attendi che il backend sia pronto
echo ⏳ Attesa avvio backend...
timeout /t 5 /nobreak >nul

REM Avvia frontend
echo 🎨 Avvio frontend...
cd client
start "Cards Against Humanity - Frontend" cmd /k "npm run dev"
cd ..
echo ✓ Frontend avviato
echo.

echo ==============================================
echo ✓ Applicazione avviata con successo!
echo.
echo 📍 Backend API:   http://localhost:3300
echo 📍 Swagger UI:    http://localhost:3300/documentation
echo 📍 Frontend:      http://localhost:5173
echo.
echo Per arrestare l'applicazione, chiudi le finestre aperte
echo ==============================================
echo.
pause

