import { Colors } from '../utils/colors';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageComponentInteraction,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { t } from '../i18n';
import { getConfig, upsertConfig } from '../services/guildConfig';

// ─── Shared builders ─────────────────────────────────────────────────────────

function mainPanelEmbed(locale: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.blue)
    .setTitle(t(locale, 'setup.panel.title'))
    .setDescription(t(locale, 'setup.panel.description'));
}

function mainPanelRows(locale: string): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_category')
      .setLabel(t(locale, 'setup.panel.btn_category'))
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📁'),
    new ButtonBuilder()
      .setCustomId('setup_role')
      .setLabel(t(locale, 'setup.panel.btn_role'))
      .setStyle(ButtonStyle.Primary)
      .setEmoji('👑'),
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_lang')
      .setLabel(t(locale, 'setup.panel.btn_language'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🌐'),
    new ButtonBuilder()
      .setCustomId('setup_status')
      .setLabel(t(locale, 'setup.panel.btn_status'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📊'),
  );

  return [row1, row2];
}

function backRow(locale: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_back')
      .setLabel(t(locale, 'setup.role.btn_back'))
      .setStyle(ButtonStyle.Secondary),
  );
}

// ─── Shared payload builder ───────────────────────────────────────────────────

export function setupPanelPayload(locale: string): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  return { embeds: [mainPanelEmbed(locale)], components: mainPanelRows(locale) };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function handleSetupCommand(interaction: MessageComponentInteraction | { reply: Function; guildId: string | null }): Promise<void> {
  // Called from command handler
  const guildId = (interaction as { guildId: string | null }).guildId;
  if (!guildId) return;

  const config = await getConfig(guildId);
  const locale = config?.locale ?? 'en';

  await (interaction as { reply: Function }).reply({
    embeds: [mainPanelEmbed(locale)],
    components: mainPanelRows(locale),
    flags: 64, // Ephemeral
  });
}

// ─── Button / select menu router ─────────────────────────────────────────────

export async function handleSetupInteraction(interaction: MessageComponentInteraction): Promise<void> {
  const { customId, guildId } = interaction;
  if (!guildId) return;

  const config = await getConfig(guildId);
  const locale = config?.locale ?? 'en';

  switch (customId) {
    case 'setup_category':
      return handleCategory(interaction, guildId, locale);
    case 'setup_role':
      return handleRoleMenu(interaction, locale);
    case 'setup_create_role':
      return handleCreateRole(interaction, guildId, locale);
    case 'setup_role_select':
      return handleRoleSelect(interaction as StringSelectMenuInteraction, guildId, locale);
    case 'setup_lang':
      return handleLangMenu(interaction, locale);
    case 'setup_lang_select':
      return handleLangSelect(interaction as StringSelectMenuInteraction, guildId, locale);
    case 'setup_status':
      return handleStatus(interaction, guildId, locale);
    case 'setup_back':
      return handleBack(interaction, locale);
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCategory(interaction: MessageComponentInteraction, guildId: string, locale: string): Promise<void> {
  await interaction.deferUpdate();

  const guild = interaction.guild!;
  const bot = guild.members.me;

  if (!bot?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.followUp({ content: t(locale, 'errors.bot_permissions'), flags: 64 });
    return;
  }

  const config = await getConfig(guildId);
  const existingCategoryId = config?.categoryId;

  // Remove old category if it exists
  if (existingCategoryId) {
    const old = guild.channels.cache.get(existingCategoryId);
    if (old) {
      for (const ch of guild.channels.cache.values()) {
        if (ch.parentId === existingCategoryId) await ch.delete().catch(() => null);
      }
      await old.delete().catch(() => null);
    }
  }

  const categoryName = t(locale, 'channels.category_name');

  const category = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
  });

  const channelIds: string[] = [];
  for (let n = 1; n <= 3; n++) {
    const ch = await guild.channels.create({
      name: t(locale, 'channels.creation_channel', { n }),
      type: ChannelType.GuildVoice,
      parent: category.id,
    });
    channelIds.push(ch.id);
  }

  await upsertConfig(guildId, {
    categoryId: category.id,
    creationChannelIds: channelIds,
  });

  const confirmText = existingCategoryId
    ? t(locale, 'setup.category.reconfigured')
    : t(locale, 'setup.category.created', { name: categoryName });

  const embed = mainPanelEmbed(locale).addFields({ name: '✓', value: confirmText });

  await interaction.editReply({ embeds: [embed], components: mainPanelRows(locale) });
}

async function handleRoleMenu(interaction: MessageComponentInteraction, locale: string): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(Colors.blue)
    .setTitle(t(locale, 'setup.role.title'))
    .setDescription(t(locale, 'setup.role.description'));

  const roleRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
    new RoleSelectMenuBuilder()
      .setCustomId('setup_role_select')
      .setPlaceholder(t(locale, 'setup.role.placeholder')),
  );

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_create_role')
      .setLabel(t(locale, 'setup.role.btn_create'))
      .setStyle(ButtonStyle.Success)
      .setEmoji('✨'),
    new ButtonBuilder()
      .setCustomId('setup_back')
      .setLabel(t(locale, 'setup.role.btn_back'))
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [roleRow, actionRow] });
}

async function handleCreateRole(interaction: MessageComponentInteraction, guildId: string, locale: string): Promise<void> {
  await interaction.deferUpdate();

  const guild = interaction.guild!;
  const bot = guild.members.me;

  if (!bot?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.followUp({ content: t(locale, 'errors.bot_permissions'), flags: 64 });
    return;
  }

  const roleName = t(locale, 'setup.role.role_name');
  const role = await guild.roles.create({ name: roleName, reason: 'TeamShuffler setup' });

  await upsertConfig(guildId, { gameManagerRoleId: role.id });

  const embed = mainPanelEmbed(locale).addFields({
    name: '✓',
    value: t(locale, 'setup.role.created', { role: `<@&${role.id}>` }),
  });

  await interaction.editReply({ embeds: [embed], components: mainPanelRows(locale) });
}

async function handleRoleSelect(interaction: StringSelectMenuInteraction, guildId: string, locale: string): Promise<void> {
  // RoleSelectMenuInteraction extends StringSelectMenuInteraction in djs14
  const roleId = interaction.values[0];
  if (!roleId) return;

  await upsertConfig(guildId, { gameManagerRoleId: roleId });

  const embed = mainPanelEmbed(locale).addFields({
    name: '✓',
    value: t(locale, 'setup.role.set', { role: `<@&${roleId}>` }),
  });

  await interaction.update({ embeds: [embed], components: mainPanelRows(locale) });
}

async function handleLangMenu(interaction: MessageComponentInteraction, locale: string): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(Colors.blue)
    .setTitle(t(locale, 'setup.language.title'))
    .setDescription(t(locale, 'setup.language.description'));

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('setup_lang_select')
      .setPlaceholder(t(locale, 'setup.language.placeholder'))
      .addOptions([
        { label: t(locale, 'setup.language.en'), value: 'en' },
        { label: t(locale, 'setup.language.fr'), value: 'fr' },
        { label: t(locale, 'setup.language.de'), value: 'de' },
        { label: t(locale, 'setup.language.es'), value: 'es' },
      ]),
  );

  await interaction.update({ embeds: [embed], components: [selectRow, backRow(locale)] });
}

async function handleLangSelect(interaction: StringSelectMenuInteraction, guildId: string, locale: string): Promise<void> {
  const newLocale = interaction.values[0];
  if (!newLocale) return;

  await upsertConfig(guildId, { locale: newLocale });

  const langNames: Record<string, string> = { en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español' };
  const langName = langNames[newLocale] ?? newLocale;
  const embed = mainPanelEmbed(newLocale).addFields({
    name: '✓',
    value: t(newLocale, 'setup.language.updated', { lang: langName }),
  });

  await interaction.update({ embeds: [embed], components: mainPanelRows(newLocale) });
}

async function handleStatus(interaction: MessageComponentInteraction, guildId: string, locale: string): Promise<void> {
  const config = await getConfig(guildId);

  const notSet = t(locale, 'setup.status.not_set');
  const configured = t(locale, 'setup.status.configured');

  const embed = new EmbedBuilder()
    .setColor(Colors.blue)
    .setTitle(t(locale, 'setup.status.title'))
    .addFields(
      {
        name: t(locale, 'setup.status.category'),
        value: config?.categoryId ? configured : notSet,
        inline: true,
      },
      {
        name: t(locale, 'setup.status.channels'),
        value: config?.creationChannelIds.length
          ? `${config.creationChannelIds.length} channels`
          : notSet,
        inline: true,
      },
      {
        name: t(locale, 'setup.status.role'),
        value: config?.gameManagerRoleId ? `<@&${config.gameManagerRoleId}>` : notSet,
        inline: true,
      },
      {
        name: t(locale, 'setup.status.language'),
        value: locale === 'fr' ? 'Français' : 'English',
        inline: true,
      },
    );

  await interaction.update({ embeds: [embed], components: [backRow(locale)] });
}

async function handleBack(interaction: MessageComponentInteraction, locale: string): Promise<void> {
  await interaction.update({ embeds: [mainPanelEmbed(locale)], components: mainPanelRows(locale) });
}
