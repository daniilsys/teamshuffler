import { ButtonInteraction, Client, Events, Interaction, StringSelectMenuInteraction } from 'discord.js';
import { handleSetupCommand, handleSetupInteraction } from '../interactions/setup';
import { handleGameCommand, handleGameInteraction } from '../interactions/game';
import { getConfig } from '../services/guildConfig';
import { t } from '../i18n';

export function registerInteractionEvent(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      // Slash commands
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup') {
          await handleSetupCommand(interaction as unknown as { reply: Function; guildId: string | null });
        } else if (interaction.commandName === 'game') {
          await handleGameCommand(interaction);
        }
        return;
      }

      // Buttons
      if (interaction.isButton()) {
        const btn = interaction as ButtonInteraction;
        if (btn.customId.startsWith('setup_')) {
          await handleSetupInteraction(btn);
        } else if (btn.customId.startsWith('game_')) {
          await handleGameInteraction(btn);
        }
        return;
      }

      // Select menus
      if (interaction.isStringSelectMenu() || interaction.isRoleSelectMenu()) {
        const select = interaction as StringSelectMenuInteraction;
        if (select.customId.startsWith('setup_')) {
          await handleSetupInteraction(select as unknown as ButtonInteraction);
        }
        return;
      }
    } catch (err) {
      console.error('[interaction] unhandled error:', err);
      const locale = interaction.guildId
        ? (await getConfig(interaction.guildId))?.locale ?? 'en'
        : 'en';

      const msg = { content: t(locale, 'errors.generic'), flags: 64 };
      if ('replied' in interaction && interaction.replied) return;
      if ('deferred' in interaction && interaction.deferred) {
        await (interaction as ButtonInteraction).followUp(msg).catch(() => null);
      } else if ('reply' in interaction) {
        await (interaction as ButtonInteraction).reply(msg).catch(() => null);
      }
    }
  });
}
