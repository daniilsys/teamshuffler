import { ChatInputCommandInteraction, GuildMember, VoiceChannel } from 'discord.js';
import { t } from '../i18n';
import { getConfig } from '../services/guildConfig';
import { sendOddMembersPrompt, sendTeamProposal } from './game';
import { checkFirstUse } from './firstUse';

export async function handleShuffleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { guildId, member } = interaction;
  if (!guildId || !member) return;

  if (await checkFirstUse(interaction)) return;

  const config = await getConfig(guildId);
  const locale = config?.locale ?? 'en';

  const guildMember = member as GuildMember;
  const voiceChannel = guildMember.voice.channel as VoiceChannel | null;

  if (!voiceChannel) {
    await interaction.reply({ content: t(locale, 'game.error.not_in_voice'), flags: 64 });
    return;
  }

  const members = voiceChannel.members.filter(m => !m.user.bot).map(m => m.id);

  if (members.length < 2) {
    await interaction.reply({ content: t(locale, 'game.error.not_enough_members'), flags: 64 });
    return;
  }

  if (members.length % 2 !== 0) {
    await sendOddMembersPrompt(interaction, locale, members, voiceChannel.id, interaction.user.id);
    return;
  }

  await sendTeamProposal(interaction, locale, members, members.length, voiceChannel.id, guildId, interaction.user.id);
}
