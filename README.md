<div align="center">

<br/>

```
████████╗███████╗ █████╗ ███╗   ███╗
╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
   ██║   █████╗  ███████║██╔████╔██║
   ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║
   ██║   ███████╗██║  ██║██║ ╚═╝ ██║
   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
███████╗██╗  ██╗██╗   ██╗███████╗███████╗██╗     ███████╗██████╗
██╔════╝██║  ██║██║   ██║██╔════╝██╔════╝██║     ██╔════╝██╔══██╗
███████╗███████║██║   ██║█████╗  █████╗  ██║     █████╗  ██████╔╝
╚════██║██╔══██║██║   ██║██╔══╝  ██╔══╝  ██║     ██╔══╝  ██╔══██╗
███████║██║  ██║╚██████╔╝██║     ██║     ███████╗███████╗██║  ██║
╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝
```

**Divide and conquer — instantly shuffle your Discord voice channel into balanced teams.**

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

<br/>

</div>

---

## What it does

TeamShuffler is a Discord bot that creates fair, randomized teams from players in a voice channel — in seconds. No spreadsheets, no arguments about picks, no bias.

- Detects who's in the voice channel
- Handles odd numbers gracefully (spectator mode or uneven split)
- Moves players into dedicated game channels automatically
- Cleans up after the game is over

Built for public use. One `/setup`, then `/game` forever.

---

## Commands

| Command | Who can use | Description |
|---------|------------|-------------|
| `/setup` | Administrators | Interactive configuration panel |
| `/game` | Game Managers · Admins | Shuffle members into two teams |

---

## Setup flow

```
/setup
  ├── 📁 Create Category    → spawns "Team Creation" category + 3 voice channels
  ├── 👑 Set Game Manager   → native Discord role picker
  ├── 🌐 Change Language    → English / Français
  └── 📊 Server Status      → current configuration overview
```

## Game flow

```
/game
  ├── Not in voice?            → friendly error
  ├── Not in creation channel? → offer to move everyone to an available slot
  ├── Odd member count?        → choose: N-1 vs N+1 split
  └── Team proposal
        ├── 🔀 Reroll          → re-shuffle, keep same format
        └── 🎮 Play!           → create GAME #N category, move teams, start
              └── Everyone leaves → auto-delete channels & category
```

---

## Stack

```
discord.js 14   ·   TypeScript 5   ·   Prisma ORM   ·   PostgreSQL 16   ·   Docker
```

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Node 20 | LTS, native ESM |
| Bot framework | discord.js 14 | Slash commands, component builders, v10 API |
| Database | PostgreSQL 16 | Reliable, arrays for channel ID lists |
| ORM | Prisma | Type-safe queries, zero-config migrations |
| Containers | Docker + Compose | One-command deploy anywhere |
| i18n | Custom (`t()`) | Zero deps, nested keys, variable interpolation |

---

## Quick start

### Prerequisites

- Node 20+
- Docker & Docker Compose
- A Discord application with a bot token ([create one](https://discord.com/developers/applications))

### 1 — Clone & install

```bash
git clone https://github.com/daniil-iss/teamshuffler.git
cd teamshuffler
npm install
```

### 2 — Configure

```bash
cp .env.example .env
```

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id

# Development only — instant guild-scoped command registration
# GUILD_ID=your_dev_guild_id

DATABASE_URL=postgresql://teamshuffler:password@localhost:5432/teamshuffler
```

### 3 — Start the database

```bash
docker compose up db -d
npm run db:migrate
```

### 4 — Deploy slash commands & run

```bash
# Development
npm run deploy-commands
npm run dev

# Production (everything in Docker)
docker compose up -d
```

> The `docker-entrypoint.sh` handles migrations and command deployment automatically on startup.

---

## Bot permissions

Enable these in the Discord Developer Portal:

| Permission | Required for |
|------------|-------------|
| Manage Channels | Creating / deleting game categories |
| Move Members | Moving players into team channels |
| View Channels | Seeing voice channel state |

**Gateway Intents**: `GUILDS` · `GUILD_VOICE_STATES` · `GUILD_MEMBERS`

> `GUILD_MEMBERS` is a privileged intent — enable it in the bot settings page.

---

## i18n

All bot messages are fully translated. Add a new locale by:

1. Creating `src/i18n/locales/<code>.json` (copy `en.json` as a base)
2. Adding `<code>` to `SUPPORTED_LOCALES` in `src/i18n/index.ts`
3. Adding the option in `handleLangMenu` inside `src/interactions/setup.ts`

---

## Project structure

```
src/
├── commands/          slash command definitions
├── events/            ready · interactionCreate · voiceStateUpdate
├── interactions/      setup.ts · game.ts  (all button/select handlers)
├── services/          guildConfig · cleanupService
├── utils/             teams · gameState cache · permissions
├── i18n/              t() function + locale files
├── client.ts          Discord client factory
├── deploy-commands.ts command registration script
└── index.ts           entry point
```

---

## Cleanup strategy

Game channels are removed by two complementary mechanisms:

| Trigger | Mechanism |
|---------|-----------|
| Last player leaves | `voiceStateUpdate` event → immediate cleanup |
| Bot restart / missed events | `node-cron` runs every 5 minutes |

Both paths share the same `cleanupService.ts` logic.

---

## License

MIT — do whatever you want with it.
