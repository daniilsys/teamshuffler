import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
} from 'discord.js';
import { Colors } from '../utils/colors';
import { t } from '../i18n';
import { getConfig, upsertConfig } from '../services/guildConfig';

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

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('firstuse_lang:en').setLabel('English').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('firstuse_lang:fr').setLabel('Français').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('firstuse_lang:de').setLabel('Deutsch').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('firstuse_lang:es').setLabel('Español').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
  return true;
}

export async function handleFirstUseLang(interaction: ButtonInteraction): Promise<void> {
  const locale = interaction.customId.split(':')[1];
  const { guildId } = interaction;
  if (!guildId || !locale) return;

  await upsertConfig(guildId, { locale });

  const embed = new EmbedBuilder()
    .setColor(Colors.blurple)
    .setTitle(t(locale, 'firstuse.done_title'))
    .setDescription(t(locale, 'firstuse.done_description'));

  await interaction.update({ embeds: [embed], components: [] });
}
