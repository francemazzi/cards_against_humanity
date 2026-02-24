# AGENTS.md

## Cursor Cloud specific instructions

### Architecture

Single product with two codebases: backend (root `/`) and frontend (`client/`).

- **Backend**: Fastify + TypeScript + Prisma + Socket.IO on port 3300
- **Frontend**: React + Vite + TailwindCSS on port 5173
- **Database**: PG 15 via Docker on port 5457 <!-- pragma: allowlist secret -->

### Running services

1. **Database (PG 15)**: `sudo docker compose up -d db` (must be running before backend starts)
2. **Backend (dev)**: `npm run dev` from repo root (uses `tsx watch`, hot-reloads)
3. **Frontend (dev)**: `npm run dev` from `client/` directory

### DATABASE_URL gotcha

The system may inject a redacted `DATABASE_URL` env var that overrides dotenv. If Prisma commands fail with auth errors, explicitly export the correct value from `.env.example`:
```bash
export DATABASE_URL="$(grep DATABASE_URL .env.example | cut -d= -f2-)"
```

### Prisma

After dependency installation, always run `npx prisma generate`. Migrations require the database to be running:
```bash
npx prisma generate
npx prisma migrate dev
```

### Tests

- **Unit tests** (no external deps): `npm run test:unit` — 80 tests, ~7s
- **Integration tests** (need DB + OpenAI key): `npm run test:integration` — 11 tests
- See `test/README.md` for details

### Linting

- **Backend**: `npm run lint` — note: the backend ESLint config file is missing (pre-existing issue); the command will error
- **Frontend**: `cd client && npm run lint` — has pre-existing lint errors

### OpenAI API Key

Required for AI gameplay and integration tests. Users provide via `X-OpenAI-Key` header or `OPENAI_API_KEY` env var. Without it, games cannot progress past the human player's turn, and integration tests are skipped.
