import { Client, Events, VoiceState } from 'discord.js';
import { checkAndCleanup } from '../services/cleanupService';

export function registerVoiceStateEvent(client: Client): void {
  client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
    // Only care about members leaving a channel
    if (!oldState.channelId || oldState.channelId === newState.channelId) return;

    await checkAndCleanup(client, oldState.channelId).catch(err =>
      console.error('[voice] cleanup check error:', err),
    );
  });
}
