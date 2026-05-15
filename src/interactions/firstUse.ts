import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  VoiceChannel,
} from 'discord.js';
import { Colors } from '../utils/colors';
import { t } from '../i18n';
import { getConfig, upsertConfig } from '../services/guildConfig';
import { setupPanelPayload } from './setup';
import { buildHelpPayload } from './help';
import { sendOddMembersPrompt, sendTeamProposal } from './game';

export async function checkFirstUse(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const { guildId, member } = interaction;
  if (!guildId) return false;

  const config = await getConfig(guildId);
  if (config) return false;

  const guildMember = member as GuildMember;
  const isAdmin =
    guildMember.permissions.has(PermissionFlagsBits.Administrator) ||
    guildMember.permissions.has(PermissionFlagsBits.ManageGuild);

  if (!isAdmin) return false;

  const embed = new EmbedBuilder()
    .setColor(Colors.purple)
    .setTitle('TeamShuffler')
    .setDescription(
      '### 👋 Welcome!\nChoose the language for this server before getting started.\nYou can change it anytime in `/setup`.',
    )
    .setFooter({ text: 'This message is only visible to you.' });

  // Encode the command name in customId so we can auto-run it after language pick
  const commandName = interaction.commandName;

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`firstuse_lang:${commandName}`)
      .setPlaceholder('Select a language...')
      .addOptions(
        { label: 'English', value: 'en' },
        { label: 'Français', value: 'fr' },
        { label: 'Deutsch', value: 'de' },
        { label: 'Español', value: 'es' },
      ),
  );

  await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
  return true;
}

export async function handleFirstUseLang(interaction: StringSelectMenuInteraction): Promise<void> {
  const locale = interaction.values[0];
  const commandName = interaction.customId.split(':')[1];
  const { guildId } = interaction;
  if (!guildId || !locale) return;

  await upsertConfig(guildId, { locale });

  switch (commandName) {
    case 'help': {
      const payload = await buildHelpPayload(locale, interaction.client);
      await interaction.update(payload);
      break;
    }

    case 'shuffle': {
      const guildMember = interaction.member as GuildMember;
      const voiceChannel = guildMember.voice.channel as VoiceChannel | null;

      if (!voiceChannel) {
        await interaction.update({ content: t(locale, 'game.error.not_in_voice'), embeds: [], components: [] });
        return;
      }

      const members = voiceChannel.members.filter(m => !m.user.bot).map(m => m.id);

      if (members.length < 2) {
        await interaction.update({ content: t(locale, 'game.error.not_enough_members'), embeds: [], components: [] });
        return;
      }

      if (members.length % 2 !== 0) {
        await sendOddMembersPrompt(interaction, locale, members, voiceChannel.id, interaction.user.id);
        return;
      }

      await sendTeamProposal(interaction, locale, members, members.length, voiceChannel.id, guildId, interaction.user.id);
      break;
    }

    case 'setup':
    case 'game':
    default: {
      await interaction.update(setupPanelPayload(locale));
      break;
    }
  }
}
