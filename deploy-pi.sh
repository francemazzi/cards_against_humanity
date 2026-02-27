#!/bin/bash

# Deploy to Raspberry Pi via SSH
# Usage: ./deploy-pi.sh

set -e

PI_HOST="192.168.68.106"
PI_USER="frasma"
PI_PASS="piadina2025"

echo "Deploying to Raspberry Pi at ${PI_USER}@${PI_HOST}..."

# First, find the project directory on the Pi
sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no "$PI_USER@$PI_HOST" << 'ENDSSH'
set -e

# Find project directory
if [ -d "$HOME/cards_against_humanity_be" ]; then
  cd "$HOME/cards_against_humanity_be"
elif [ -d "$HOME/Sviluppo/cards_against_humanity_be" ]; then
  cd "$HOME/Sviluppo/cards_against_humanity_be"
else
  echo "Project directory not found! Looking for it..."
  PROJECT_DIR=$(find $HOME -maxdepth 3 -name "docker-compose.prod.yml" -path "*/cards_against*" 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
  if [ -z "$PROJECT_DIR" ]; then
    echo "ERROR: Cannot find the project directory on the Raspberry Pi"
    exit 1
  fi
  cd "$PROJECT_DIR"
fi

echo "Working in: $(pwd)"

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Rebuild and restart containers
echo "Building Docker images..."
docker compose -f docker-compose.prod.yml build

echo "Restarting containers..."
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Wait and show status
sleep 5
echo ""
echo "Container status:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "Deployment complete!"
ENDSSH

echo "Done! The app should be accessible at http://${PI_HOST}:6609"
