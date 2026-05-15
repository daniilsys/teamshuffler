import { Client, ChannelType, TextChannel } from 'discord.js';
import db from '../db';
import { t } from '../i18n';
import { getConfig } from './guildConfig';

export async function cleanupGame(client: Client, gameId: string): Promise<void> {
  const game = await db.activeGame.findUnique({ where: { id: gameId } });
  if (!game) return;

  const guild = client.guilds.cache.get(game.guildId);
  if (!guild) {
    await db.activeGame.delete({ where: { id: gameId } });
    return;
  }

  try {
    const teamA = guild.channels.cache.get(game.teamAChannelId);
    const teamB = guild.channels.cache.get(game.teamBChannelId);
    const category = guild.channels.cache.get(game.categoryId);

    if (teamA) await teamA.delete().catch(() => null);
    if (teamB) await teamB.delete().catch(() => null);
    if (category) await category.delete().catch(() => null);
  } catch {
    // Channels may already be deleted
  }

  await db.activeGame.delete({ where: { id: gameId } }).catch(() => null);

  const config = await getConfig(game.guildId);
  const locale = config?.locale ?? 'en';
  console.log(`[cleanup] Game #${game.gameNumber} cleaned up in guild ${game.guildId}`);

  if (config?.logChannelId) {
    const logChannel = guild.channels.cache.get(config.logChannelId) as TextChannel | undefined;
    await logChannel?.send(t(locale, 'game.ended', { id: game.gameNumber })).catch(() => null);
  }
}

export async function checkAndCleanup(client: Client, channelId: string): Promise<void> {
  const game = await db.activeGame.findFirst({
    where: {
      OR: [
        { teamAChannelId: channelId },
        { teamBChannelId: channelId },
      ],
    },
  });

  if (!game) return;

  const guild = client.guilds.cache.get(game.guildId);
  if (!guild) return;

  const teamA = guild.channels.cache.get(game.teamAChannelId);
  const teamB = guild.channels.cache.get(game.teamBChannelId);

  const aEmpty = !teamA || (teamA.type === ChannelType.GuildVoice && teamA.members.size === 0);
  const bEmpty = !teamB || (teamB.type === ChannelType.GuildVoice && teamB.members.size === 0);

  if (aEmpty && bEmpty) {
    await cleanupGame(client, game.id);
  }
}

export async function cronCleanup(client: Client): Promise<void> {
  const games = await db.activeGame.findMany();

  for (const game of games) {
    const guild = client.guilds.cache.get(game.guildId);
    if (!guild) {
      await db.activeGame.delete({ where: { id: game.id } }).catch(() => null);
      continue;
    }

    const teamA = guild.channels.cache.get(game.teamAChannelId);
    const teamB = guild.channels.cache.get(game.teamBChannelId);

    const aEmpty = !teamA || (teamA.type === ChannelType.GuildVoice && teamA.members.size === 0);
    const bEmpty = !teamB || (teamB.type === ChannelType.GuildVoice && teamB.members.size === 0);

    if (aEmpty && bEmpty) {
      await cleanupGame(client, game.id);
    }
  }
}
