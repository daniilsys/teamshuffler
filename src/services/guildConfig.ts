import db from '../db';
import { GuildConfig } from '@prisma/client';

export async function getConfig(guildId: string): Promise<GuildConfig | null> {
  return db.guildConfig.findUnique({ where: { guildId } });
}

export async function upsertConfig(guildId: string, data: Partial<Omit<GuildConfig, 'id' | 'guildId' | 'createdAt' | 'updatedAt'>>): Promise<GuildConfig> {
  return db.guildConfig.upsert({
    where: { guildId },
    create: { guildId, ...data },
    update: data,
  });
}

export async function incrementGameCounter(guildId: string): Promise<number> {
  const config = await db.guildConfig.upsert({
    where: { guildId },
    create: { guildId, gameCounter: 1 },
    update: { gameCounter: { increment: 1 } },
  });
  return config.gameCounter;
}
