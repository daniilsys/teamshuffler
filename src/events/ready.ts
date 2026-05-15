import { Client, Events } from 'discord.js';
import cron from 'node-cron';
import { cronCleanup } from '../services/cleanupService';

export function registerReadyEvent(client: Client): void {
  client.once(Events.ClientReady, (c) => {
    console.log(`Logged in as ${c.user.tag}`);

    // Cron fallback cleanup every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      cronCleanup(client).catch(err => console.error('[cron] cleanup error:', err));
    });
  });
}
