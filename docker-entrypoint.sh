#!/bin/sh
set -e

echo "🔍 Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set!"
    exit 1
fi

# Show DATABASE_URL without password for debugging
DB_URL_MASKED=$(echo $DATABASE_URL | sed 's/:[^@]*@/:***@/')
echo "✅ DATABASE_URL is set: ${DB_URL_MASKED}"

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo "Database host: ${DB_HOST}, port: ${DB_PORT}"

# Wait for database connection
max_attempts=30
attempt=0
until nc -z ${DB_HOST} ${DB_PORT} 2>/dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Database did not become ready in time"
        exit 1
    fi
    echo "Database is unavailable - sleeping (attempt ${attempt}/${max_attempts})"
    sleep 2
done

echo "✅ Database is ready!"
echo "🔄 Generating Prisma client for ARM..."

npx prisma generate

echo "🔄 Running Prisma migrations..."

npx prisma migrate deploy

echo "✅ Migrations completed successfully"

# --- Ollama Setup ---
if [ -n "$OLLAMA_BASE_URL" ]; then
  # Extract host:port from the /v1 URL
  OLLAMA_HOST=$(echo "$OLLAMA_BASE_URL" | sed 's|/v1$||' | sed 's|^http://||')
  OLLAMA_HOSTNAME=$(echo "$OLLAMA_HOST" | cut -d: -f1)
  OLLAMA_PORT=$(echo "$OLLAMA_HOST" | cut -d: -f2)

  echo "⏳ Waiting for Ollama at ${OLLAMA_HOSTNAME}:${OLLAMA_PORT}..."
  ollama_attempts=0
  ollama_max=30
  until nc -z "$OLLAMA_HOSTNAME" "$OLLAMA_PORT" 2>/dev/null; do
    ollama_attempts=$((ollama_attempts + 1))
    if [ $ollama_attempts -ge $ollama_max ]; then
      echo "⚠️  Ollama did not become ready. AI will use fallback behavior."
      break
    fi
    echo "Ollama unavailable - sleeping (attempt ${ollama_attempts}/${ollama_max})"
    sleep 2
  done

  if nc -z "$OLLAMA_HOSTNAME" "$OLLAMA_PORT" 2>/dev/null; then
    echo "✅ Ollama is ready! Pulling model ${OLLAMA_MODEL:-qwen2.5:3b}..."
    curl -s -X POST "http://${OLLAMA_HOST}/api/pull" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"${OLLAMA_MODEL:-qwen2.5:3b}\", \"stream\": false}" \
      --max-time 600 || echo "⚠️  Model pull failed. Continuing anyway."
    echo "✅ Ollama model ready."
  fi
fi

echo "🚀 Starting application..."
exec node dist/index.js

