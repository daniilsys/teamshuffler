import { SlashCommandBuilder } from 'discord.js';
import { data as setupData } from './setup';
import { data as gameData } from './game';

export const commands: SlashCommandBuilder[] = [setupData, gameData];
