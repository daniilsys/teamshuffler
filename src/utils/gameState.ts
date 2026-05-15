import { Teams } from './teams';

interface GameState extends Teams {
  channelId: string;
  guildId: string;
  allMembers: string[];
  totalPlaying: number;
  createdAt: number;
}

const cache = new Map<string, GameState>();
const TTL_MS = 10 * 60 * 1000;

function key(guildId: string, channelId: string): string {
  return `${guildId}:${channelId}`;
}

export function setGameState(guildId: string, channelId: string, state: Omit<GameState, 'createdAt'>): void {
  cache.set(key(guildId, channelId), { ...state, createdAt: Date.now() });
}

export function getGameState(guildId: string, channelId: string): GameState | null {
  const entry = cache.get(key(guildId, channelId));
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    cache.delete(key(guildId, channelId));
    return null;
  }
  return entry;
}

export function deleteGameState(guildId: string, channelId: string): void {
  cache.delete(key(guildId, channelId));
}

setInterval(() => {
  const now = Date.now();
  for (const [k, state] of cache) {
    if (now - state.createdAt > TTL_MS) cache.delete(k);
  }
}, 5 * 60 * 1000);
