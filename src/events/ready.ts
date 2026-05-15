import { ActivityType, Client, Events } from 'discord.js';
import cron from 'node-cron';
import { cronCleanup } from '../services/cleanupService';

const STATUSES: { type: ActivityType; name: string }[] = [
  { type: ActivityType.Playing,    name: '/game — shuffle your team' },
  { type: ActivityType.Watching,   name: 'voice channels' },
  { type: ActivityType.Playing,    name: 'Made by daniilsys' },
  { type: ActivityType.Listening,  name: 'team debates' },
  { type: ActivityType.Playing,    name: 'Tip: set a Game Manager role' },
  { type: ActivityType.Competing,  name: 'the shuffle lottery' },
  { type: ActivityType.Playing,    name: 'fair teams since 2026' },
  { type: ActivityType.Watching,   name: 'for empty game channels' },
  { type: ActivityType.Playing,    name: 'Tip: reroll as many times as you want' },
  { type: ActivityType.Playing,    name: 'certified RNG team selector' },
  { type: ActivityType.Listening,  name: 'your cries after a bad shuffle' },
  { type: ActivityType.Playing,    name: 'Tip: /help for the full guide' },
  { type: ActivityType.Playing,    name: 'no more rock paper scissors' },
  { type: ActivityType.Watching,   name: 'the carry get put on the wrong team' },
  { type: ActivityType.Playing,    name: 'Tip: odd number? spectator mode available' },
];

let statusIndex = 0;

function rotateStatus(client: Client): void {
  const status = STATUSES[statusIndex % STATUSES.length];
  client.user?.setPresence({
    activities: [{ type: status.type, name: status.name }],
    status: 'online',
  });
  statusIndex++;
}

export function registerReadyEvent(client: Client): void {
  client.once(Events.ClientReady, (c) => {
    console.log(`Logged in as ${c.user.tag}`);

    rotateStatus(client);

    // Rotate status every 30 seconds
    cron.schedule('*/30 * * * * *', () => rotateStatus(client));

    // Fallback cleanup every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      cronCleanup(client).catch(err => console.error('[cron] cleanup error:', err));
    });
  });
}
