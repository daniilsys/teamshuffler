import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Colors } from '../utils/colors';
import { t } from '../i18n';
import { getConfig } from '../services/guildConfig';

export async function handleHelpCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = interaction.guildId
    ? ((await getConfig(interaction.guildId))?.locale ?? 'en')
    : 'en';

  const commands = await interaction.client.application.commands.fetch().catch(() => null);

  function mention(name: string): string {
    const cmd = commands?.find(c => c.name === name);
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

  const faqEmbed = new EmbedBuilder()
    .setColor(Colors.purple)
    .setTitle(t(locale, 'help.faq.title'))
    .addFields(
      {
        name: t(locale, 'help.faq.q_who_game'),
        value: t(locale, 'help.faq.a_who_game'),
      },
      {
        name: t(locale, 'help.faq.q_who_setup'),
        value: t(locale, 'help.faq.a_who_setup'),
      },
      {
        name: t(locale, 'help.faq.q_rename'),
        value: t(locale, 'help.faq.a_rename'),
      },
      {
        name: t(locale, 'help.faq.q_odd'),
        value: t(locale, 'help.faq.a_odd'),
      },
      {
        name: t(locale, 'help.faq.q_multi'),
        value: t(locale, 'help.faq.a_multi'),
      },
      {
        name: t(locale, 'help.faq.q_cleanup'),
        value: t(locale, 'help.faq.a_cleanup'),
      },
      {
        name: t(locale, 'help.faq.q_lang'),
        value: t(locale, 'help.faq.a_lang', { cmd: mention('setup') }),
      },
      {
        name: t(locale, 'help.faq.q_more_channels'),
        value: t(locale, 'help.faq.a_more_channels', { cmd: mention('setup') }),
      },
    )
    .setFooter({ text: t(locale, 'help.footer') });

  await interaction.reply({ embeds: [commandsEmbed, faqEmbed], flags: 64 });
}
