import { GuildMember, PermissionFlagsBits } from 'discord.js';

export function isAdminOrGameManager(member: GuildMember, gameManagerRoleId?: string | null): boolean {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  if (gameManagerRoleId && member.roles.cache.has(gameManagerRoleId)) return true;
  return false;
}
