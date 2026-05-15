import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('game')
  .setDescription('Shuffle members into two teams');
