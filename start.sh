#!/bin/bash

# Cards Against Humanity - Startup Script
# Per Linux e macOS

set -e

echo "🃏 Cards Against Humanity - Avvio Automatico"
echo "=============================================="
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funzione per controllare se un comando esiste
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verifica Node.js
if ! command_exists node; then
    echo -e "${RED}❌ Node.js non trovato!${NC}"
    echo "Installa Node.js da: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js trovato:${NC} $(node --version)"

# Verifica npm
if ! command_exists npm; then
    echo -e "${RED}❌ npm non trovato!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm trovato:${NC} $(npm --version)"
echo ""

# Verifica file .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  File .env non trovato!${NC}"
    echo "Copiando env.template..."
    if [ -f env.template ]; then
        cp env.template .env
        echo -e "${YELLOW}⚠️  IMPORTANTE: Modifica il file .env con le tue configurazioni!${NC}"
        echo -e "${YELLOW}   Specialmente la chiave OPENAI_API_KEY${NC}"
        echo ""
        read -p "Premi INVIO per continuare dopo aver configurato .env..."
    else
        echo -e "${RED}❌ File env.template non trovato!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ File .env trovato${NC}"
echo ""

# Installa dipendenze backend se necessario
echo "📦 Controllo dipendenze backend..."
if [ ! -d "node_modules" ]; then
    echo "Installazione dipendenze backend..."
    npm install
else
    echo -e "${GREEN}✓ Dipendenze backend già installate${NC}"
fi
echo ""

# Installa dipendenze frontend se necessario
echo "📦 Controllo dipendenze frontend..."
cd client
if [ ! -d "node_modules" ]; then
    echo "Installazione dipendenze frontend..."
    npm install
else
    echo -e "${GREEN}✓ Dipendenze frontend già installate${NC}"
fi
cd ..
echo ""

# Genera client Prisma
echo "🔧 Generazione client Prisma..."
npx prisma generate
echo ""

# Esegui migrazioni Prisma
echo "🗄️  Esecuzione migrazioni database..."
echo -e "${YELLOW}⚠️  Assicurati che il database PostgreSQL sia in esecuzione!${NC}"
echo ""
npx prisma migrate dev --name init || {
    echo -e "${YELLOW}⚠️  Migrazione fallita. Se il database non è in esecuzione, avvialo con:${NC}"
    echo "   docker compose up -d db"
    echo ""
    read -p "Premi INVIO per continuare comunque (se il DB è già migrato)..."
}
echo ""

# Build backend
echo "🔨 Build backend..."
npm run build
echo ""

# Funzione per terminare i processi in background
cleanup() {
    echo ""
    echo "🛑 Arresto applicazione..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Cattura CTRL+C per terminare i processi
trap cleanup SIGINT SIGTERM

# Avvia backend
echo "🚀 Avvio backend..."
npm start &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend avviato (PID: $BACKEND_PID)${NC}"
echo ""

# Attendi che il backend sia pronto
echo "⏳ Attesa avvio backend..."
sleep 5

# Avvia frontend
echo "🎨 Avvio frontend..."
cd client
npm run dev &
FRONTEND_PID=$!
cd ..
echo -e "${GREEN}✓ Frontend avviato (PID: $FRONTEND_PID)${NC}"
echo ""

echo "=============================================="
echo -e "${GREEN}✓ Applicazione avviata con successo!${NC}"
echo ""
echo "📍 Backend API:   http://localhost:3300"
echo "📍 Swagger UI:    http://localhost:3300/documentation"
echo "📍 Frontend:      http://localhost:5173"
echo ""
echo "Per arrestare l'applicazione, premi CTRL+C"
echo "=============================================="
echo ""

# Mantieni lo script in esecuzione
wait

