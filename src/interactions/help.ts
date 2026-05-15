import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
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
  'rename',
  'odd',
  'multi',
  'cleanup',
  'lang',
  'more_channels',
] as const;

// ─── /help command ────────────────────────────────────────────────────────────

export async function handleHelpCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = interaction.guildId
    ? ((await getConfig(interaction.guildId))?.locale ?? 'en')
    : 'en';

  const appCommands = await interaction.client.application.commands.fetch().catch(() => null);

  function mention(name: string): string {
    const cmd = appCommands?.find(c => c.name === name);
    return cmd ? `</${name}:${cmd.id}>` : `\`/${name}\``;
  }

  const commandsEmbed = new EmbedBuilder()
    .setColor(Colors.blue)
    .setTitle(t(locale, 'help.title'))
    .setDescription(t(locale, 'help.description'))
    .addFields(
      {
        name: `${mention('setup')} — ${t(locale, 'help.setup.title')}`,
        value: t(locale, 'help.setup.description'),
      },
      {
        name: `${mention('game')} — ${t(locale, 'help.game.title')}`,
        value: t(locale, 'help.game.description'),
      },
      {
        name: `${mention('help')} — ${t(locale, 'help.help.title')}`,
        value: t(locale, 'help.help.description'),
      },
    );

  const faqRow = buildFaqSelect(locale);

  await interaction.reply({
    embeds: [commandsEmbed],
    components: [faqRow],
    flags: 64,
  });
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

  await interaction.update({
    components: [buildFaqSelect(locale)],
    embeds: [answerEmbed],
  });
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
