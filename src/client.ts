import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registerReadyEvent } from './events/ready';
import { registerInteractionEvent } from './events/interactionCreate';
import { registerVoiceStateEvent } from './events/voiceStateUpdate';

export function createClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
  });

  registerReadyEvent(client);
  registerInteractionEvent(client);
  registerVoiceStateEvent(client);

  return client;
}
