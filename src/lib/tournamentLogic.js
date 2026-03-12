// ==========================
// PUSTY TURNIEJ
// ==========================
export function createEmptyTournament() {
  return {
    teams: [],
    matches: [],
    settings: {
      numberOfTeams: 8,
      teamsFromGroup: 2,
    },
    announcements: "",
  };
}

// ==========================
// GENEROWANIE DRUŻYN
// ==========================
export function generateTeams(number) {
  const teams = [];

  for (let i = 1; i <= number; i++) {
    teams.push({
      id: i,
      name: `Drużyna ${i}`,
      group: "",
      logo: null,
    });
  }

  return teams;
}

// ==========================
// PODZIAŁ NA GRUPY
// ==========================
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

// ==========================
// GENEROWANIE MECZÓW W GRUPIE
// round-robin (circle method)
// ==========================
// tournamentLogics.js

export function generateGroupMatches(teams, group) {
  const sorted = [...teams].sort((a, b) => a.seed - b.seed);

  // specjalny harmonogram dla 5 drużyn (1 boisko, brak meczów pod rząd)
  if (sorted.length === 5) {
    const t = sorted;

    const schedule = [
      [t[0], t[1]],
      [t[2], t[3]],

      [t[0], t[4]],
      [t[1], t[2]],

      [t[3], t[4]],
      [t[0], t[2]],

      [t[1], t[3]],
      [t[2], t[4]],

      [t[0], t[3]],
      [t[1], t[4]],
    ];

    return schedule.map((pair, i) => ({
      id: crypto.randomUUID(),
      type: "group",
      group,
      round: Math.floor(i / 2) + 1,
      teamA: pair[0],
      teamB: pair[1],
      sets: [
        { a: "", b: "" },
        { a: "", b: "" },
        { a: "", b: "" },
      ],
      finished: false,
      status: "planned",
    }));
  }

  // fallback dla innych liczby drużyn (zwykły round robin)
  const players = [...sorted];

  if (players.length % 2 === 1) {
    players.push({ id: "BYE" });
  }

  const n = players.length;
  const rounds = n - 1;
  const half = n / 2;

  const matches = [];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const teamA = players[i];
      const teamB = players[n - 1 - i];

      if (teamA.id === "BYE" || teamB.id === "BYE") continue;

      matches.push({
        id: crypto.randomUUID(),
        type: "group",
        group,
        round: r + 1,
        teamA,
        teamB,
        sets: [
          { a: "", b: "" },
          { a: "", b: "" },
          { a: "", b: "" },
        ],
        finished: false,
        status: "planned",
      });
    }

    const fixed = players[0];
    const rest = players.slice(1);

    rest.unshift(rest.pop());

    for (let i = 1; i < players.length; i++) {
      players[i] = rest[i - 1];
    }
  }

  return matches;
}

// ==========================
// GENEROWANIE TERMINARZA
// ==========================
export function generateSchedule(matchesA, matchesB) {
  const schedule = [];
  let order = 1;

  const roundsA = groupByRound(matchesA);
  const roundsB = groupByRound(matchesB);

  const maxRounds = Math.max(roundsA.length, roundsB.length);

  for (let r = 0; r < maxRounds; r++) {
    const roundA = roundsA[r] || [];
    const roundB = roundsB[r] || [];

    const maxMatches = Math.max(roundA.length, roundB.length);

    for (let i = 0; i < maxMatches; i++) {
      if (roundA[i]) {
        schedule.push({
          ...roundA[i],
          order: order++,
          court: "A",
        });
      }

      if (roundB[i]) {
        schedule.push({
          ...roundB[i],
          order: order++,
          court: "B",
        });
      }
    }
  }

  return schedule;
}

// Funkcja pomocnicza
function groupByRound(matches) {
  const rounds = [];

  matches.forEach((m) => {
    const r = m.round - 1;

    if (!rounds[r]) rounds[r] = [];

    rounds[r].push(m);
  });

  return rounds;
}

// ==========================
// POMOCNICZA
// ==========================
function calculateSetsScore(match) {
  let setsA = 0;
  let setsB = 0;

  match.sets.forEach((set) => {
    const a = Number(set.a);
    const b = Number(set.b);

    if (!a && !b) return;

    if (a > b) setsA++;
    if (b > a) setsB++;
  });

  return { setsA, setsB };
}

// ==========================
// TABELA GRUPOWA
// ==========================
export function calculateTable(teams, matches) {
  const table = teams.map((team) => ({
    id: team.id,
    name: team.name,
    played: 0,
    points: 0,
    setsWon: 0,
    setsLost: 0,
    smallPointsWon: 0,
    smallPointsLost: 0,
  }));

  matches.forEach((match) => {
    if (!match.finished) return;

    const teamA = table.find((t) => t.id === match.teamA.id);
    const teamB = table.find((t) => t.id === match.teamB.id);

    const { setsA, setsB } = calculateSetsScore(match);

    teamA.played++;
    teamB.played++;

    teamA.setsWon += setsA;
    teamA.setsLost += setsB;

    teamB.setsWon += setsB;
    teamB.setsLost += setsA;

    // 🔥 LICZENIE MAŁYCH PUNKTÓW
    match.sets.forEach((set) => {
      const a = parseInt(set.a);
      const b = parseInt(set.b);

      if (isNaN(a) || isNaN(b)) return;

      teamA.smallPointsWon += a;
      teamA.smallPointsLost += b;

      teamB.smallPointsWon += b;
      teamB.smallPointsLost += a;
    });

    // PUNKTY MECZOWE
    if (setsA > setsB) {
      teamA.points += setsB === 0 ? 3 : 2;
      teamB.points += setsB === 0 ? 0 : 1;
    } else {
      teamB.points += setsA === 0 ? 3 : 2;
      teamA.points += setsA === 0 ? 0 : 1;
    }
  });

  return table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    const diffA = a.setsWon - a.setsLost;
    const diffB = b.setsWon - b.setsLost;

    if (diffB !== diffA) return diffB - diffA;

    const smallA = a.smallPointsWon - a.smallPointsLost;
    const smallB = b.smallPointsWon - b.smallPointsLost;

    return smallB - smallA;
  });
}

// ==========================
// PÓŁFINAŁY
// ==========================
export function generateSemifinals(tableA, tableB) {
  if (tableA.length < 2 || tableB.length < 2) return [];

  return [
    {
      id: "SF1",
      teamA: tableA[0],
      teamB: tableB[1],
      sets: [
        { a: "", b: "" },
        { a: "", b: "" },
        { a: "", b: "" },
      ],
      finished: false,
    },

    {
      id: "SF2",
      teamA: tableB[0],
      teamB: tableA[1],
      sets: [
        { a: "", b: "" },
        { a: "", b: "" },
        { a: "", b: "" },
      ],
      finished: false,
    },
  ];
}

// ==========================
// ZWYCIĘZCA MECZU
// ==========================
export function getMatchWinner(match) {
  const { setsA, setsB } = calculateSetsScore(match);

  return setsA > setsB ? match.teamA : match.teamB;
}

// ==========================
// WALIDACJA MECZU
// ==========================
export function validateMatch(match) {
  const { setsA, setsB } = calculateSetsScore(match);

  if (match.type === "final") {
    if (setsA < 3 && setsB < 3) return "Finał musi być wygrany do 3 setów.";
  } else {
    if (setsA < 2 && setsB < 2) return "Mecz musi być wygrany do 2 setów.";
  }

  if (setsA === setsB) return "Nieprawidłowy wynik.";

  return null;
}

// ==========================
// FINAŁ + MECZ O 3
// ==========================
export function generateFinals(semifinals) {
  if (semifinals.length !== 2) return null;

  const sf1 = semifinals[0];
  const sf2 = semifinals[1];

  if (!sf1.finished || !sf2.finished) return null;

  const winner1 = getMatchWinner(sf1);
  const winner2 = getMatchWinner(sf2);

  const loser1 = winner1.id === sf1.teamA.id ? sf1.teamB : sf1.teamA;
  const loser2 = winner2.id === sf2.teamA.id ? sf2.teamB : sf2.teamA;

  return {
    final: {
      id: "FINAL",
      teamA: winner1,
      teamB: winner2,
      sets: [
        { a: "", b: "" },
        { a: "", b: "" },
        { a: "", b: "" },
      ],
      finished: false,
    },

    thirdPlace: {
      id: "THIRD",
      teamA: loser1,
      teamB: loser2,
      sets: [
        { a: "", b: "" },
        { a: "", b: "" },
        { a: "", b: "" },
      ],
      finished: false,
    },
  };
}
