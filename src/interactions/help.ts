import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { Colors } from '../utils/colors';
import { t } from '../i18n';
import { getConfig } from '../services/guildConfig';

const FAQ_KEYS = [
  'who_game',
  'who_setup',
  'shuffle_vs_game',
  'rename',
  'odd',
  'multi',
  'cleanup',
  'lang',
  'more_channels',
] as const;

const INVITE_PERMISSIONS = '286346256';

// ─── Shared payload builder ───────────────────────────────────────────────────

export async function buildHelpPayload(locale: string, client: Client): Promise<{
  embeds: EmbedBuilder[];
  components: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[];
}> {
  const appCommands = await client.application!.commands.fetch().catch(() => null);

  function mention(name: string): string {
    const cmd = appCommands?.find(c => c.name === name);
    return cmd ? `</${name}:${cmd.id}>` : `\`/${name}\``;
  }

  const commandsEmbed = new EmbedBuilder()
    .setColor(Colors.blue)
    .setTitle(t(locale, 'help.title'))
    .setDescription(t(locale, 'help.description'))
    .addFields(
      { name: `${mention('setup')} — ${t(locale, 'help.setup.title')}`, value: t(locale, 'help.setup.description') },
      { name: `${mention('game')} — ${t(locale, 'help.game.title')}`, value: t(locale, 'help.game.description') },
      { name: `${mention('shuffle')} — ${t(locale, 'help.shuffle.title')}`, value: t(locale, 'help.shuffle.description') },
      { name: `${mention('help')} — ${t(locale, 'help.help.title')}`, value: t(locale, 'help.help.description') },
    );

  const clientId = client.user!.id;
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${INVITE_PERMISSIONS}&scope=bot+applications.commands`;

  const inviteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel(t(locale, 'help.btn_invite')).setURL(inviteUrl).setStyle(ButtonStyle.Link),
  );

  return { embeds: [commandsEmbed], components: [buildFaqSelect(locale), inviteRow] };
}

// ─── /help command ────────────────────────────────────────────────────────────

export async function handleHelpCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = interaction.guildId
    ? ((await getConfig(interaction.guildId))?.locale ?? 'en')
    : 'en';

  const payload = await buildHelpPayload(locale, interaction.client);
  await interaction.reply({ ...payload, flags: 64 });
}

// ─── FAQ select menu handler ──────────────────────────────────────────────────

export async function handleFaqSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const locale = interaction.guildId
    ? ((await getConfig(interaction.guildId))?.locale ?? 'en')
    : 'en';

  const key = interaction.values[0] as typeof FAQ_KEYS[number];

  const appCommands = await interaction.client.application.commands.fetch().catch(() => null);
  function mention(name: string): string {
    const cmd = appCommands?.find(c => c.name === name);
    return cmd ? `</${name}:${cmd.id}>` : `\`/${name}\``;
  }

  const question = t(locale, `help.faq.q_${key}`);
  const answer = t(locale, `help.faq.a_${key}`, { cmd: mention('setup') });

  const answerEmbed = new EmbedBuilder()
    .setColor(Colors.purple)
    .setTitle(question)
    .setDescription(answer);

  const backRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('help_back')
      .setLabel('← Back')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({
    components: [buildFaqSelect(locale), backRow],
    embeds: [answerEmbed],
  });
}

export async function handleHelpBack(interaction: ButtonInteraction): Promise<void> {
  const locale = interaction.guildId
    ? ((await getConfig(interaction.guildId))?.locale ?? 'en')
    : 'en';

  const payload = await buildHelpPayload(locale, interaction.client);
  await interaction.update(payload);
}

// ─── Shared builder ───────────────────────────────────────────────────────────

function buildFaqSelect(locale: string): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_faq')
      .setPlaceholder(t(locale, 'help.faq.placeholder'))
      .addOptions(
        FAQ_KEYS.map(key => ({
          label: t(locale, `help.faq.q_${key}`),
          value: key,
        })),
      ),
  );
}
