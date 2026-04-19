# Draw and Guess

A lightweight real-time browser game for fast team ice-breakers.

This project is a single shared-session Pictionary-style game built with Next.js, React, TypeScript, and Socket.IO. It is intentionally scoped as an MVP: no auth, no rooms, no database, and no persistence.

## What it does

- Automatically adds each visitor to the current live session
- Assigns a temporary one-word identity from an animal or fruit, with a matching emoji avatar
- Requires at least 3 connected players to start
- Rotates one player into the drawer role each round
- Shows the secret word only to the current drawer
- Separates `drawing` and `guessing` into distinct phases
- Uses a server-authoritative in-memory game engine
- Syncs the canvas via stroke events instead of image snapshots
- Scores correct guessers and reveals the answer at round end

## Gameplay loop

1. Players join the page and are added to the shared session.
2. Once at least 3 players are connected, any player can start a round.
3. The server picks the next drawer and a secret word.
4. During `drawing`, only the drawer can draw.
5. During `guessing`, the canvas becomes read-only and non-drawers submit guesses.
6. The server validates guesses and updates scores.
7. The answer is revealed and the next round waits for a manual start.

## Tech stack

- Next.js App Router
- React 19
- TypeScript
- Socket.IO
- HTML5 Canvas
- Tailwind v4 utility classes
- Custom Node HTTP server for Next.js + Socket.IO

## Development

### Requirements

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

This starts the custom server defined in `server.ts`, which boots Next.js and Socket.IO together.

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm run start
```

## Common local issues

### `ERR_CONNECTION_REFUSED`

The local dev server is not running, or port `3000` is occupied by a stale process.

Fast checks:

```bash
curl -I http://localhost:3000
```

If it fails, restart the app:

```bash
npm run dev
```

If the terminal says another dev server is already running on `3000`, stop the old process first and then rerun `npm run dev`.

### Browser shows stale UI after edits

Do a hard refresh after large layout or server-side changes. The custom server setup is reliable, but hot reload can occasionally lag behind recent edits.

## Project structure

```text
app/
  layout.tsx
  page.tsx
  globals.css

components/
  drawing-board.tsx
  game-shell.tsx
  guess-panel.tsx
  player-list.tsx
  round-result.tsx
  status-bar.tsx

lib/
  game/
    constants.ts
    engine.ts
    identity.ts
    normalize.ts
    types.ts
    words.ts
  socket/
    client.ts
    events.ts

server.ts
```

## Architecture notes

### Server-authoritative game state

The game state lives in `lib/game/engine.ts`. The server controls:

- connected players
- current phase
- phase timers
- current drawer
- secret word assignment
- scoring
- round completion

Clients render server snapshots and send interaction events. They do not control phase progression.

### Socket contract

Client events:

- `game:start`
- `draw:stroke`
- `guess:submit`

Server events:

- `session:joined`
- `game:snapshot`
- `canvas:stroke`
- `system:error`

### Identity rules

Temporary identities are created from a fixed pool of animal and fruit names in `lib/game/identity.ts`. Each name is paired with a matching emoji avatar.

## Current MVP constraints

- One shared live session only
- In-memory state only
- No reconnection recovery
- No room management
- No persistent scores
- No authentication
- No mobile-specific UX polish yet

## Design reference folders

These folders are checked into the repo as style references that informed the UI iterations:

- `figma/`
- `pinterest/`

They are reference materials only and are not required to run the game.
