#!/bin/bash

# Script di deployment per Raspberry Pi
# Uso: ./deploy.sh [DOMAIN_OR_IP]
# Esempio: ./deploy.sh frasma.tail57cb32.ts.net
# Esempio: ./deploy.sh 192.168.68.106

set -e

echo "🚀 Avvio deployment Cards Against Humanity..."

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verifica che Docker sia installato
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker non è installato. Installalo prima di continuare.${NC}"
    exit 1
fi

# Verifica Docker Compose (supporta sia V1 che V2)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo -e "${RED}❌ Docker Compose non è installato. Installalo prima di continuare.${NC}"
    echo -e "${YELLOW}   Prova: sudo apt install docker-compose${NC}"
    echo -e "${YELLOW}   Oppure assicurati che Docker Compose V2 sia abilitato${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose trovato: ${DOCKER_COMPOSE_CMD}${NC}"

# Verifica se esiste il file .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  File .env non trovato. Creazione da template...${NC}"
    
    # Chiedi il dominio o IP
    if [ -z "$1" ]; then
        echo -e "${BLUE}💡 Inserisci il dominio Tailscale o l'IP del Raspberry Pi${NC}"
        echo -e "${BLUE}   Esempio Tailscale: frasma.tail57cb32.ts.net${NC}"
        echo -e "${BLUE}   Esempio IP locale: 192.168.68.106${NC}"
        read -p "Dominio/IP: " DOMAIN_OR_IP
    else
        DOMAIN_OR_IP=$1
    fi
    
    # Crea il file .env
    cat > .env << EOF
# API Configuration
API_PORT=3300

# Client Configuration
CLIENT_PORT=6609
# IMPORTANT: Use your Tailscale domain or IP address
VITE_API_URL=http://${DOMAIN_OR_IP}:3300

# Database Configuration
DB_PORT=5457
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
EOF
    
    echo -e "${GREEN}✅ File .env creato con password generata automaticamente${NC}"
    echo -e "${GREEN}   VITE_API_URL configurato su: http://${DOMAIN_OR_IP}:3300${NC}"
else
    echo -e "${GREEN}✅ File .env trovato${NC}"
    
    # Verifica che VITE_API_URL non sia ancora localhost (controlla solo la riga VITE_API_URL)
    VITE_API_URL_VALUE=$(grep "^VITE_API_URL=" .env 2>/dev/null | cut -d '=' -f2- | tr -d ' ' || echo "")
    if [[ "$VITE_API_URL_VALUE" == *"localhost"* ]]; then
        echo -e "${YELLOW}⚠️  Attenzione: VITE_API_URL contiene ancora 'localhost'${NC}"
        echo -e "${YELLOW}   Valore attuale: ${VITE_API_URL_VALUE}${NC}"
        echo -e "${YELLOW}   Assicurati di averlo aggiornato con il dominio Tailscale o l'IP${NC}"
        read -p "Vuoi continuare comunque? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Build delle immagini
echo -e "${YELLOW}🔨 Building delle immagini Docker...${NC}"
${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml build

# Ferma i container esistenti (se presenti)
echo -e "${YELLOW}🛑 Fermata dei container esistenti...${NC}"
${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml down 2>/dev/null || true

# Avvia i container
echo -e "${YELLOW}🚀 Avvio dei container...${NC}"
${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml up -d

# Attendi che i servizi siano pronti
echo -e "${YELLOW}⏳ Attesa avvio servizi...${NC}"
sleep 5

# Verifica lo stato dei container
echo -e "${YELLOW}📊 Stato dei container:${NC}"
${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml ps

# Estrai la configurazione dal .env
CLIENT_PORT=$(grep CLIENT_PORT .env | cut -d '=' -f2 | tr -d ' ')
VITE_API_URL=$(grep VITE_API_URL .env | cut -d '=' -f2 | tr -d ' ')

# Estrai il dominio/IP dall'URL API
API_DOMAIN=$(echo $VITE_API_URL | sed 's|http://||' | sed 's|:3300||')
CLIENT_URL="http://${API_DOMAIN}:${CLIENT_PORT:-6609}"

echo ""
echo -e "${GREEN}✅ Deployment completato!${NC}"
echo ""
echo -e "${GREEN}📍 Il client è accessibile su:${NC}"
echo -e "   ${CLIENT_URL}"
echo ""
echo -e "${GREEN}🔗 URL API configurato:${NC}"
echo -e "   ${VITE_API_URL}"
echo ""
if [[ $API_DOMAIN == *".ts.net"* ]]; then
    echo -e "${BLUE}🌐 Tailscale configurato correttamente!${NC}"
    echo -e "${BLUE}   Il servizio è accessibile da qualsiasi dispositivo connesso a Tailscale${NC}"
fi
echo ""
echo -e "${YELLOW}💡 Per visualizzare i log:${NC}"
echo -e "   ${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml logs -f"
echo ""
echo -e "${YELLOW}💡 Per fermare i servizi:${NC}"
echo -e "   ${DOCKER_COMPOSE_CMD} -f docker-compose.prod.yml down"
echo ""

