import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  VoiceChannel,
} from 'discord.js';
import { t } from '../i18n';
import { getConfig, incrementGameCounter } from '../services/guildConfig';
import { isAdminOrGameManager } from '../utils/permissions';
import { createTeams } from '../utils/teams';
import { deleteGameState, getGameState, setGameState } from '../utils/gameState';
import db from '../db';

// ─── /game command entry ──────────────────────────────────────────────────────

export async function handleGameCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { guildId, member } = interaction;
  if (!guildId || !member) return;

  const config = await getConfig(guildId);
  const locale = config?.locale ?? 'en';

  if (!config || !config.categoryId || config.creationChannelIds.length === 0) {
    await interaction.reply({ content: t(locale, 'game.error.no_config'), flags: 64 });
    return;
  }

  if (!isAdminOrGameManager(member as GuildMember, config.gameManagerRoleId)) {
    await interaction.reply({ content: t(locale, 'game.error.no_permission'), flags: 64 });
    return;
  }

  const guildMember = member as GuildMember;
  const voiceChannel = guildMember.voice.channel as VoiceChannel | null;

  if (!voiceChannel) {
    await interaction.reply({ content: t(locale, 'game.error.not_in_voice'), flags: 64 });
    return;
  }

  if (!config.creationChannelIds.includes(voiceChannel.id)) {
    await handleNotInCreationChannel(interaction, locale, config.creationChannelIds, voiceChannel.id);
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

// ─── Invoker guard ────────────────────────────────────────────────────────────

async function assertInvoker(interaction: ButtonInteraction, invokerUserId: string, locale: string): Promise<boolean> {
  if (interaction.user.id !== invokerUserId) {
    await interaction.reply({ content: t(locale, 'game.error.not_invoker'), flags: 64 });
    return false;
  }
  return true;
}

// ─── Not in creation channel ──────────────────────────────────────────────────

async function handleNotInCreationChannel(
  interaction: ChatInputCommandInteraction,
  locale: string,
  creationChannelIds: string[],
  currentChannelId: string,
): Promise<void> {
  const guild = interaction.guild!;
  const availableChannel = creationChannelIds.find(id => {
    const ch = guild.channels.cache.get(id);
    return ch?.type === ChannelType.GuildVoice && (ch as VoiceChannel).members.size === 0;
  });

  const embed = new EmbedBuilder()
    .setColor('#FEE75C')
    .setDescription(t(locale, 'game.error.not_in_creation'));

  if (!availableChannel) {
    embed.setFooter({ text: t(locale, 'game.error.no_available_channel') });
    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`game_move:${interaction.user.id}:${currentChannelId}:${availableChannel}`)
      .setLabel(t(locale, 'game.error.move_suggestion'))
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🔀'),
  );

  await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
}

// ─── Odd members prompt ───────────────────────────────────────────────────────

async function sendOddMembersPrompt(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  locale: string,
  members: string[],
  channelId: string,
  invokerUserId: string,
): Promise<void> {
  const count = members.length;
  const smaller = count - 1;
  const a1 = Math.floor(smaller / 2);
  const b1 = smaller - a1;
  const a2 = Math.floor(count / 2);
  const b2 = count - a2;

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(t(locale, 'game.odd_members.title', { count }))
    .setDescription(t(locale, 'game.odd_members.description'));

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`game_size:${invokerUserId}:${channelId}:${smaller}`)
      .setLabel(t(locale, 'game.odd_members.btn_smaller', { a: a1, b: b1 }))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`game_size:${invokerUserId}:${channelId}:${count}`)
      .setLabel(t(locale, 'game.odd_members.btn_all', { a: a2, b: b2 }))
      .setStyle(ButtonStyle.Secondary),
  );

  setGameState(interaction.guildId!, channelId, {
    teamA: [],
    teamB: [],
    spectators: [],
    allMembers: members,
    totalPlaying: 0,
    channelId,
    guildId: interaction.guildId!,
  });

  if (interaction instanceof ButtonInteraction) {
    await interaction.update({ embeds: [embed], components: [row] });
  } else {
    await interaction.reply({ embeds: [embed], components: [row] });
  }
}

// ─── Team proposal ────────────────────────────────────────────────────────────

async function sendTeamProposal(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  locale: string,
  allMembers: string[],
  totalPlaying: number,
  channelId: string,
  guildId: string,
  invokerUserId: string,
): Promise<void> {
  const teams = createTeams(allMembers, totalPlaying);
  setGameState(guildId, channelId, { ...teams, allMembers, totalPlaying, channelId, guildId });

  const embed = buildProposalEmbed(locale, teams.teamA, teams.teamB, teams.spectators);
  const row = proposalRow(locale, channelId, invokerUserId);

  if (interaction instanceof ButtonInteraction) {
    await interaction.update({ embeds: [embed], components: [row] });
  } else {
    await interaction.reply({ embeds: [embed], components: [row] });
  }
}

function buildProposalEmbed(locale: string, teamA: string[], teamB: string[], spectators: string[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor('#57F287')
    .setTitle(t(locale, 'game.proposal.title'))
    .addFields(
      { name: t(locale, 'game.proposal.team_a'), value: teamA.map(id => `<@${id}>`).join('\n'), inline: true },
      { name: t(locale, 'game.proposal.team_b'), value: teamB.map(id => `<@${id}>`).join('\n'), inline: true },
    );

  if (spectators.length > 0) {
    embed.addFields({
      name: t(locale, 'game.proposal.spectator'),
      value: spectators.map(id => `<@${id}>`).join('\n'),
      inline: true,
    });
  }

  return embed;
}

function proposalRow(locale: string, channelId: string, invokerUserId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`game_reroll:${invokerUserId}:${channelId}`)
      .setLabel(t(locale, 'game.proposal.btn_reroll'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔀'),
    new ButtonBuilder()
      .setCustomId(`game_play:${invokerUserId}:${channelId}`)
      .setLabel(t(locale, 'game.proposal.btn_play'))
      .setStyle(ButtonStyle.Success)
      .setEmoji('🎮'),
  );
}

// ─── Button router ────────────────────────────────────────────────────────────

export async function handleGameInteraction(interaction: ButtonInteraction): Promise<void> {
  const { customId, guildId } = interaction;
  if (!guildId) return;

  const config = await getConfig(guildId);
  const locale = config?.locale ?? 'en';

  if (customId.startsWith('game_move:')) {
    const [, invokerUserId, srcChannelId, destChannelId] = customId.split(':');
    if (!await assertInvoker(interaction, invokerUserId, locale)) return;
    return handleMove(interaction, locale, guildId, srcChannelId, destChannelId, invokerUserId, config);
  }

  if (customId.startsWith('game_size:')) {
    const [, invokerUserId, channelId, sizeStr] = customId.split(':');
    if (!await assertInvoker(interaction, invokerUserId, locale)) return;
    return handleSizePick(interaction, locale, guildId, channelId, parseInt(sizeStr, 10), invokerUserId);
  }

  if (customId.startsWith('game_reroll:')) {
    const [, invokerUserId, channelId] = customId.split(':');
    if (!await assertInvoker(interaction, invokerUserId, locale)) return;
    return handleReroll(interaction, locale, guildId, channelId, invokerUserId);
  }

  if (customId.startsWith('game_play:')) {
    const [, invokerUserId, channelId] = customId.split(':');
    if (!await assertInvoker(interaction, invokerUserId, locale)) return;
    return handlePlay(interaction, locale, guildId, channelId, invokerUserId, config);
  }
}

// ─── Move members ─────────────────────────────────────────────────────────────

async function handleMove(
  interaction: ButtonInteraction,
  locale: string,
  guildId: string,
  srcChannelId: string,
  destChannelId: string,
  invokerUserId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any,
): Promise<void> {
  await interaction.deferUpdate();

  const guild = interaction.guild!;
  const bot = guild.members.me;

  if (!bot?.permissions.has(PermissionFlagsBits.MoveMembers)) {
    await interaction.followUp({ content: t(locale, 'game.error.move_failed'), flags: 64 });
    return;
  }

  const src = guild.channels.cache.get(srcChannelId) as VoiceChannel | null;
  const dest = guild.channels.cache.get(destChannelId) as VoiceChannel | null;

  if (!src || !dest) {
    await interaction.followUp({ content: t(locale, 'errors.generic'), flags: 64 });
    return;
  }

  const membersToMove = src.members.filter(m => !m.user.bot);
  const movedIds: string[] = [];

  for (const m of membersToMove.values()) {
    const ok = await m.voice.setChannel(dest).then(() => true).catch(() => false);
    if (ok) movedIds.push(m.id);
  }

  // After move, go straight to team proposal
  if (movedIds.length < 2) {
    const embed = new EmbedBuilder()
      .setColor('#FEE75C')
      .setDescription(t(locale, 'game.error.not_enough_members'));
    await interaction.editReply({ embeds: [embed], components: [] });
    return;
  }

  if (movedIds.length % 2 !== 0) {
    await sendOddMembersPrompt(interaction, locale, movedIds, destChannelId, invokerUserId);
    return;
  }

  await sendTeamProposal(interaction, locale, movedIds, movedIds.length, destChannelId, guildId, invokerUserId);
}

// ─── Size pick (odd case) ─────────────────────────────────────────────────────

async function handleSizePick(
  interaction: ButtonInteraction,
  locale: string,
  guildId: string,
  channelId: string,
  totalPlaying: number,
  invokerUserId: string,
): Promise<void> {
  const state = getGameState(guildId, channelId);

  if (!state) {
    await interaction.reply({ content: t(locale, 'game.error.state_expired'), flags: 64 });
    return;
  }

  const guild = interaction.guild!;
  const ch = guild.channels.cache.get(channelId) as VoiceChannel | null;
  const liveMembers = ch ? ch.members.filter(m => !m.user.bot).map(m => m.id) : state.allMembers;

  await sendTeamProposal(interaction, locale, liveMembers, totalPlaying, channelId, guildId, invokerUserId);
}

// ─── Reroll ───────────────────────────────────────────────────────────────────

async function handleReroll(
  interaction: ButtonInteraction,
  locale: string,
  guildId: string,
  channelId: string,
  invokerUserId: string,
): Promise<void> {
  const state = getGameState(guildId, channelId);

  if (!state) {
    await interaction.reply({ content: t(locale, 'game.error.state_expired'), flags: 64 });
    return;
  }

  const guild = interaction.guild!;
  const ch = guild.channels.cache.get(channelId) as VoiceChannel | null;
  const liveMembers = ch ? ch.members.filter(m => !m.user.bot).map(m => m.id) : state.allMembers;

  await sendTeamProposal(interaction, locale, liveMembers, state.totalPlaying || liveMembers.length, channelId, guildId, invokerUserId);
}

// ─── Play ─────────────────────────────────────────────────────────────────────

async function handlePlay(
  interaction: ButtonInteraction,
  locale: string,
  guildId: string,
  channelId: string,
  invokerUserId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any,
): Promise<void> {
  const state = getGameState(guildId, channelId);

  if (!state) {
    await interaction.reply({ content: t(locale, 'game.error.state_expired'), flags: 64 });
    return;
  }

  await interaction.deferUpdate();

  const guild = interaction.guild!;
  const bot = guild.members.me;

  if (!bot?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.followUp({ content: t(locale, 'errors.bot_permissions'), flags: 64 });
    return;
  }

  const gameId = await incrementGameCounter(guildId);
  const categoryName = t(locale, 'channels.game_category', { id: gameId });
  const teamAName = t(locale, 'channels.team_a');
  const teamBName = t(locale, 'channels.team_b');

  const category = await guild.channels.create({ name: categoryName, type: ChannelType.GuildCategory });
  const teamAChannel = await guild.channels.create({ name: teamAName, type: ChannelType.GuildVoice, parent: category.id });
  const teamBChannel = await guild.channels.create({ name: teamBName, type: ChannelType.GuildVoice, parent: category.id });

  if (bot.permissions.has(PermissionFlagsBits.MoveMembers)) {
    for (const memberId of state.teamA) {
      const m = guild.members.cache.get(memberId);
      await m?.voice.setChannel(teamAChannel).catch(() => null);
    }
    for (const memberId of state.teamB) {
      const m = guild.members.cache.get(memberId);
      await m?.voice.setChannel(teamBChannel).catch(() => null);
    }
  }

  await db.activeGame.create({
    data: {
      guildId,
      gameNumber: gameId,
      categoryId: category.id,
      teamAChannelId: teamAChannel.id,
      teamBChannelId: teamBChannel.id,
    },
  });

  deleteGameState(guildId, channelId);

  const embed = new EmbedBuilder()
    .setColor('#57F287')
    .setTitle(t(locale, 'game.started.title', { id: gameId }))
    .setDescription(t(locale, 'game.started.description'))
    .addFields(
      { name: t(locale, 'game.started.team_a'), value: state.teamA.map(id => `<@${id}>`).join('\n') || '—', inline: true },
      { name: t(locale, 'game.started.team_b'), value: state.teamB.map(id => `<@${id}>`).join('\n') || '—', inline: true },
    );

  if (state.spectators.length > 0) {
    embed.addFields({
      name: t(locale, 'game.proposal.spectator'),
      value: state.spectators.map(id => `<@${id}>`).join('\n'),
      inline: true,
    });
  }

  await interaction.editReply({ embeds: [embed], components: [] });
}
