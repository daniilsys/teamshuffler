import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure TeamShuffler for this server')
  .setDefaultMemberPermissions(0x8); // Administrator only
