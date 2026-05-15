import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { t } from '../i18n';
import { getConfig } from '../services/guildConfig';

export async function handleHelpCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = interaction.guildId
    ? ((await getConfig(interaction.guildId))?.locale ?? 'en')
    : 'en';

  // Fetch registered commands to build clickable mentions </name:id>
  const commands = await interaction.client.application.commands.fetch().catch(() => null);

  function mention(name: string): string {
    const cmd = commands?.find(c => c.name === name);
    return cmd ? `</${name}:${cmd.id}>` : `\`/${name}\``;
  }

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
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
    )
    .setFooter({ text: t(locale, 'help.footer') });

  await interaction.reply({ embeds: [embed], flags: 64 });
}
