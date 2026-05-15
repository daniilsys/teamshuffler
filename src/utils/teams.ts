export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface Teams {
  teamA: string[];
  teamB: string[];
  spectators: string[];
}

export function createTeams(memberIds: string[], totalPlaying: number): Teams {
  const shuffled = shuffle(memberIds);
  const playing = shuffled.slice(0, totalPlaying);
  const spectators = shuffled.slice(totalPlaying);

  const half = Math.floor(totalPlaying / 2);
  return {
    teamA: playing.slice(0, half),
    teamB: playing.slice(half),
    spectators,
  };
}
