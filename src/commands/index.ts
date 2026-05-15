import { SlashCommandBuilder } from 'discord.js';
import { data as setupData } from './setup';
import { data as gameData } from './game';
import { data as helpData } from './help';
import { data as shuffleData } from './shuffle';

export const commands: SlashCommandBuilder[] = [setupData, gameData, shuffleData, helpData];
