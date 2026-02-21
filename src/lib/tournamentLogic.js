export function createEmptyTournament() {
  return {
    teams: [],
    matches: [],
    settings: {
      numberOfTeams: 8,
      teamsFromGroup: 2,
    },
  };
}

export function generateTeams(number) {
  const teams = [];

  for (let i = 1; i <= number; i++) {
    teams.push({
      id: i,
      name: `Drużyna ${i}`,
      group: null,
    });
  }

  return teams;
}

export function splitIntoGroups(teams) {
  const groupA = [];
  const groupB = [];

  teams.forEach((team, index) => {
    if (index % 2 === 0) {
      team.group = "A";
      groupA.push(team);
    } else {
      team.group = "B";
      groupB.push(team);
    }
  });

  return { groupA, groupB };
}
export function generateGroupMatches(teams) {
  const matches = [];
  let matchId = 1;

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        id: matchId++,
        teamA: teams[i],
        teamB: teams[j],
        group: teams[i].group,
        sets: [],
        finished: false,
      });
    }
  }

  return matches;
}
