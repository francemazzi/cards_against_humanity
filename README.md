# 🃏 Cards Against Humanity - Backend

Backend per **Cards Against Humanity Single Player** dove giochi contro agenti LLM che impersonano personaggi famosi della storia.

## 🎮 Come Funziona

```
                    GAME FLOW
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    1. LOBBY    2. PLAYING_CARDS   3. JUDGING
    ┌────────┐  ┌──────────────┐   ┌──────────┐
    │ Create │─▶│ Deal cards   │──▶│ AI/Human │
    │ Game   │  │ Draw black   │   │ picks    │
    │ + AI   │  │ AI plays     │   │ winner   │
    └────────┘  └──────────────┘   └────┬─────┘
         │              │                 │
         │              │                 ▼
         │              │         4. ROUND_ENDED
         │              │         ┌──────────────┐
         │              │         │ Update score │
         │              │         │ Next round?  │
         │              │         └──────┬───────┘
         │              │                │
         │              ◀────────────────┘
         │              │
         │        5. GAME_OVER
         │        ┌──────────┐
         └───────▶│  Winner!  │◀──────┘
                  └──────────┘
```

### Giocatori AI Disponibili

Gli AI impersonano **personaggi storici e famosi**:

| Categoria       | Personaggi                                                                    |
| --------------- | ----------------------------------------------------------------------------- |
| 🏛️ Antichità    | Giulio Cesare, Cleopatra, Caligola, Nerone, Socrate, Alessandro Magno, Attila |
| 🎨 Rinascimento | Leonardo da Vinci, Machiavelli, Lorenzo de' Medici                            |
| 🔬 Scienza      | Albert Einstein, Nikola Tesla, Marie Curie, Galileo, Darwin                   |
| 🎭 Arte/Cultura | Oscar Wilde, Frida Kahlo, Andy Warhol, Salvador Dalí                          |
| 👑 Regnanti     | Maria Antonietta, Napoleone, Elisabetta I, Caterina la Grande                 |
| 🎬 Moderni      | Quentin Tarantino, Gordon Ramsay, Kanye West, Elon Musk                       |
| 🎮 Italiani     | Berlusconi, Sgarbi, Totti, Fantozzi                                           |
| ...             | E molti altri! (70+ personaggi)                                               |

---

## 🏗️ Architettura

```
src/
├── core/                    # Logica di gioco pura (funzionale)
│   ├── engine.ts           # Funzioni pure per manipolare GameState
│   ├── types.ts            # Tipi TypeScript
│   ├── cards.ts            # Caricamento deck di carte
│   ├── persona.ts          # Definizione personaggi AI
│   └── gameService.ts      # Orchestrazione (collega engine, DB, AI)
│
├── ai/
│   └── llm.ts              # Integrazione OpenAI API
│
├── db/
│   └── prisma.ts           # Client Prisma per PostgreSQL
│
├── socket/
│   └── SocketManager.ts    # WebSocket per aggiornamenti real-time
│
├── routes/
│   ├── GameRoute.ts        # API REST per il gioco
│   └── HealthRoute.ts      # Health check
│
├── server/
│   └── Server.ts           # Setup Fastify
│
└── index.ts                # Entry point
```

### Principi di Design

- **Functional Programming**: Logica pura in `engine.ts`, stato immutabile
- **Antirez-style**: Codice semplice, esplicito, senza over-engineering
- **Separation of Concerns**: Engine puro, Service per orchestrazione, Routes per HTTP

---

## 🚀 Quick Start

### 🎯 Avvio Rapido (Senza Docker)

Se vuoi avviare l'applicazione senza usare Docker, usa semplicemente lo script di avvio:

**Linux/macOS:**
```bash
./start.sh
```

**Windows:**
```bash
start.bat
```

Lo script automaticamente:
- ✅ Verifica che Node.js sia installato
- ✅ Installa tutte le dipendenze (backend e frontend)
- ✅ Configura il database con Prisma
- ✅ Compila il codice TypeScript
- ✅ Avvia il backend e il frontend

**Nota:** Assicurati di avere un database PostgreSQL in esecuzione (puoi usare `docker compose up -d db` solo per il database).

---

### 📋 Setup Manuale Completo

#### 1. Prerequisiti

- Node.js 20+
- Docker & Docker Compose (opzionale)
- Chiave API OpenAI

#### 2. Setup

```bash
# Clona e installa
git clone <repo>
cd cards_against_humanity_be
npm install

# Crea .env
cp .env.example .env
# Modifica .env con la tua OPENAI_API_KEY
```

#### 3. Avvia Database

```bash
docker compose up -d db
```

#### 4. Migrazioni Prisma

```bash
npx prisma generate
npx prisma migrate dev
```

#### 5. Avvia Backend

```bash
# Sviluppo (con hot-reload)
npm run dev

# Oppure build + produzione
npm run build
npm start
```

#### 6. Avvia Frontend

```bash
cd client
npm install
npm run dev
```

Server backend disponibile su `http://localhost:3300`
Swagger UI su `http://localhost:3300/documentation`
Frontend disponibile su `http://localhost:5173`

---

## 📡 API Reference

### Autenticazione

Tutte le chiamate che coinvolgono AI richiedono l'header:

```
X-OpenAI-Key: sk-your-openai-api-key
```

### Endpoints

| Metodo   | Endpoint                                    | Descrizione                       |
| -------- | ------------------------------------------- | --------------------------------- |
| `POST`   | `/api/auth/validate-key`                    | Valida chiave OpenAI              |
| `GET`    | `/api/personas`                             | Lista personaggi (default+custom) |
| `POST`   | `/api/personas`                             | Crea personaggio custom           |
| `GET`    | `/api/personas/custom`                      | Lista personaggi custom           |
| `GET`    | `/api/personas/custom/:id`                  | Dettaglio personaggio custom      |
| `PUT`    | `/api/personas/custom/:id`                  | Aggiorna personaggio custom       |
| `DELETE` | `/api/personas/custom/:id`                  | Elimina personaggio custom        |
| `POST`   | `/api/games`                                | Crea nuova partita                |
| `POST`   | `/api/games/:gameId/start`                  | Avvia partita                     |
| `GET`    | `/api/games/:gameId`                        | Stato partita                     |
| `GET`    | `/api/games/:gameId/players/:playerId/hand` | Mano del giocatore                |
| `POST`   | `/api/games/:gameId/play`                   | Gioca carte                       |
| `POST`   | `/api/games/:gameId/judge`                  | Scegli vincitore (se Czar)        |
| `POST`   | `/api/games/:gameId/next-round`             | Prossimo round                    |

### Esempio: Creare un Personaggio Custom

```bash
curl -X POST http://localhost:3300/api/personas \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mario Rossi",
    "systemPrompt": "Sei Mario Rossi, un italiano medio con umorismo sarcastico e diretto. Apprezzi battute sulla burocrazia italiana, il calcio e la famiglia. Sei sempre ironico ma mai offensivo.",
    "description": "Un italiano medio con senso dell'umorismo"
  }'
```

Risposta:

```json
{
  "id": "custom-persona-uuid",
  "name": "Mario Rossi",
  "systemPrompt": "Sei Mario Rossi...",
  "description": "Un italiano medio con senso dell'umorismo"
}
```

### Esempio: Creare una Partita (con personaggi default o custom)

```bash
curl -X POST http://localhost:3300/api/games \
  -H "Content-Type: application/json" \
  -H "X-OpenAI-Key: sk-your-key" \
  -d '{
    "humanPlayerName": "Francesco",
    "personas": ["caesar", "einstein", "custom-persona-uuid"],
    "pointsToWin": 5
  }'
```

Risposta:

```json
{
  "gameId": "abc-123-def",
  "humanPlayerId": "player-456",
  "message": "Game created..."
}
```

> **Nota**: Puoi usare sia ID di personaggi default (es. `"caesar"`, `"einstein"`) che ID di personaggi custom creati da te.

---

## 🔌 WebSocket (Socket.IO)

Per aggiornamenti real-time, connettiti via Socket.IO.

### Connessione

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3300");

// Unisciti a una partita
socket.emit("join_game", {
  gameId: "abc-123-def",
  playerId: "player-456",
  openaiKey: "sk-your-key",
});
```

### Eventi Ricevuti

| Evento            | Payload                             | Descrizione                    |
| ----------------- | ----------------------------------- | ------------------------------ |
| `game_state`      | `GameResponse`                      | Stato aggiornato della partita |
| `player_joined`   | `{ playerId }`                      | Giocatore entrato              |
| `player_left`     | `{ playerId }`                      | Giocatore uscito               |
| `round_started`   | `{ round, czarId, blackCard }`      | Nuovo round iniziato           |
| `cards_played`    | `{ playerId, cardCount }`           | Carte giocate                  |
| `judging_started` | `{ table }`                         | Fase di giudizio               |
| `winner_selected` | `{ winnerId, winningCards, score }` | Vincitore round                |
| `game_over`       | `{ winnerId, finalScores }`         | Fine partita                   |
| `error`           | `{ message }`                       | Errore                         |

---

## 🖥️ Implementazione Frontend

### Tech Stack Consigliato

- **React/Vue/Svelte** + TypeScript
- **Socket.IO Client** per real-time
- **TailwindCSS** per UI

### Struttura Componenti

```
frontend/
├── components/
│   ├── GameLobby.tsx       # Selezione personaggi, crea partita
│   ├── GameBoard.tsx       # Tavolo di gioco principale
│   ├── BlackCard.tsx       # Carta nera corrente
│   ├── WhiteCard.tsx       # Carte bianche (mano/tavolo)
│   ├── PlayerList.tsx      # Lista giocatori con punteggi
│   ├── JudgingPhase.tsx    # Selezione vincitore
│   └── GameOver.tsx        # Schermata vittoria
│
├── hooks/
│   ├── useGame.ts          # Stato partita + API calls
│   └── useSocket.ts        # Connessione Socket.IO
│
├── services/
│   └── api.ts              # Chiamate REST
│
└── types/
    └── game.ts             # Tipi condivisi
```

### Hook useGame (Esempio)

```typescript
// hooks/useGame.ts
import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = "http://localhost:3300";

interface GameState {
  id: string;
  status: "LOBBY" | "PLAYING_CARDS" | "JUDGING" | "ROUND_ENDED" | "GAME_OVER";
  round: number;
  players: Player[];
  czarId: string;
  currentBlackCard: BlackCard | null;
  table: { cards: WhiteCard[]; playerId?: string }[];
  winnerId?: string;
}

export function useGame(openaiKey: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [hand, setHand] = useState<WhiteCard[]>([]);

  // Connetti Socket.IO
  useEffect(() => {
    const s = io(API_URL);
    setSocket(s);

    s.on("game_state", (state) => setGameState(state));
    s.on("error", (err) => console.error("Socket error:", err));

    return () => {
      s.disconnect();
    };
  }, []);

  // Crea partita
  async function createGame(playerName: string, personas: string[]) {
    const res = await fetch(`${API_URL}/api/games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OpenAI-Key": openaiKey,
      },
      body: JSON.stringify({ humanPlayerName: playerName, personas }),
    });
    const data = await res.json();

    setGameId(data.gameId);
    setPlayerId(data.humanPlayerId);

    // Join via socket
    socket?.emit("join_game", {
      gameId: data.gameId,
      playerId: data.humanPlayerId,
      openaiKey,
    });

    return data;
  }

  // Avvia partita
  async function startGame() {
    await fetch(`${API_URL}/api/games/${gameId}/start`, {
      method: "POST",
      headers: { "X-OpenAI-Key": openaiKey },
    });
    await fetchHand();
  }

  // Recupera mano
  async function fetchHand() {
    const res = await fetch(
      `${API_URL}/api/games/${gameId}/players/${playerId}/hand`
    );
    const data = await res.json();
    setHand(data.hand);
  }

  // Gioca carte
  async function playCards(cardIds: string[]) {
    await fetch(`${API_URL}/api/games/${gameId}/play`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OpenAI-Key": openaiKey,
      },
      body: JSON.stringify({ playerId, cardIds }),
    });
    await fetchHand();
  }

  // Giudica (se Czar)
  async function judgeWinner(winnerIndex: number) {
    await fetch(`${API_URL}/api/games/${gameId}/judge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OpenAI-Key": openaiKey,
      },
      body: JSON.stringify({ winnerIndex }),
    });
  }

  return {
    gameState,
    hand,
    playerId,
    createGame,
    startGame,
    playCards,
    judgeWinner,
    isCzar: gameState?.czarId === playerId,
    isMyTurn:
      gameState?.status === "PLAYING_CARDS" && gameState.czarId !== playerId,
  };
}
```

### Componente GameBoard (Esempio)

```tsx
// components/GameBoard.tsx
import { useGame } from "../hooks/useGame";

export function GameBoard({ openaiKey }: { openaiKey: string }) {
  const { gameState, hand, playCards, judgeWinner, isCzar, isMyTurn } =
    useGame(openaiKey);

  if (!gameState) return <div>Loading...</div>;

  return (
    <div className="game-board">
      {/* Header con stato e round */}
      <header>
        <h2>Round {gameState.round}</h2>
        <span className="status">{gameState.status}</span>
      </header>

      {/* Punteggi */}
      <aside className="scoreboard">
        {gameState.players.map((p) => (
          <div key={p.id} className={p.id === gameState.czarId ? "czar" : ""}>
            {p.name}: {p.score} pts
            {p.id === gameState.czarId && " 👑"}
          </div>
        ))}
      </aside>

      {/* Carta Nera */}
      {gameState.currentBlackCard && (
        <div className="black-card">{gameState.currentBlackCard.text}</div>
      )}

      {/* Tavolo (carte giocate) */}
      {gameState.status === "JUDGING" && (
        <div className="table">
          {gameState.table.map((submission, idx) => (
            <div
              key={idx}
              className="submission"
              onClick={() => isCzar && judgeWinner(idx)}
            >
              {submission.cards.map((c) => c.text).join(" ")}
            </div>
          ))}
        </div>
      )}

      {/* Mano del giocatore */}
      {isMyTurn && (
        <div className="hand">
          <h3>La tua mano:</h3>
          {hand.map((card) => (
            <button
              key={card.id}
              onClick={() => playCards([card.id])}
              className="white-card"
            >
              {card.text}
            </button>
          ))}
        </div>
      )}

      {/* Game Over */}
      {gameState.status === "GAME_OVER" && (
        <div className="game-over">
          🎉 Vincitore:{" "}
          {gameState.players.find((p) => p.id === gameState.winnerId)?.name}
        </div>
      )}
    </div>
  );
}
```

### Flusso UI

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Start Screen]                                             │
│       │                                                     │
│       ▼                                                     │
│  [Enter OpenAI Key] ────────▶ POST /api/auth/validate-key   │
│       │                                                     │
│       ▼                                                     │
│  [Lobby: Select Personas] ──▶ GET /api/personas             │
│       │                                                     │
│       ▼                                                     │
│  [Create Game] ─────────────▶ POST /api/games               │
│       │                      + Socket.IO join_game          │
│       ▼                                                     │
│  [Start Game] ──────────────▶ POST /api/games/:id/start     │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────┐            │
│  │            GAME LOOP                        │            │
│  │                                             │            │
│  │  [Show Black Card]                          │            │
│  │       │                                     │            │
│  │       ▼                                     │            │
│  │  [Am I Czar?]───Yes──▶ [Wait for others]    │            │
│  │       │                                     │            │
│  │      No                                     │            │
│  │       │                                     │            │
│  │       ▼                                     │            │
│  │  [Show Hand] ◀──────── GET .../hand         │            │
│  │       │                                     │            │
│  │       ▼                                     │            │
│  │  [Select Card] ─────▶ POST .../play         │            │
│  │       │                                     │            │
│  │       ▼                                     │            │
│  │  [Wait: JUDGING] ◀──── Socket: game_state   │            │
│  │       │                                     │            │
│  │       ▼                                     │            │
│  │  [Am I Czar?]───Yes──▶ [Select Winner]      │            │
│  │       │                     │               │            │
│  │      No                     │               │            │
│  │       │                     ▼               │            │
│  │       │              POST .../judge         │            │
│  │       │                     │               │            │
│  │       ◀─────────────────────┘               │            │
│  │       │                                     │            │
│  │       ▼                                     │            │
│  │  [Show Winner] ◀────── Socket: winner       │            │
│  │       │                                     │            │
│  │       ▼                                     │            │
│  │  [Game Over?]──No──▶ [Next Round] ──────────┘            │
│  │       │                                     │            │
│  │      Yes                                    │            │
│  │       │                                     │            │
│  └───────┼─────────────────────────────────────┘            │
│          │                                                  │
│          ▼                                                  │
│  [Victory Screen]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Test

```bash
# Tutti i test
npm test

# Solo unit test (veloci ~1s)
npm run test:unit

# Solo integration test (con LLM reale ~10s)
npm run test:integration
```

Vedi [test/README.md](test/README.md) per dettagli.

---

## 🐳 Docker

```bash
# Avvia tutto (API + DB)
docker compose up -d

# Solo database
docker compose up -d db
```

---

## 📝 Variabili d'Ambiente

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5457/cards_db

# OpenAI (solo per development/test)
OPENAI_API_KEY=sk-your-key

# Server
PORT=3300
HOST=0.0.0.0
```

---

## 📄 License

MIT
