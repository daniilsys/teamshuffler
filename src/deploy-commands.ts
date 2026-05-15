import { REST, Routes } from 'discord.js';
import { config } from './config';
import { commands } from './commands';

const rest = new REST().setToken(config.token);

async function deploy(): Promise<void> {
  const body = commands.map(c => c.toJSON());

  if (config.guildId) {
    // Guild deploy — instant, for dev
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
    console.log(`Deployed ${body.length} commands to guild ${config.guildId}`);
  } else {
    // Global deploy — up to 1 hour propagation
    await rest.put(Routes.applicationCommands(config.clientId), { body });
    console.log(`Deployed ${body.length} commands globally`);
  }
}

deploy().catch(err => {
  console.error('Command deployment failed:', err);
  process.exit(1);
});
