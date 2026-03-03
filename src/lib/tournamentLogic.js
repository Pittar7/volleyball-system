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
      group: "", // na start brak grupy
      logo: null, // ścieżka do pliku logo (np. "/logos/team1.png")
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
// ==========================
// GENEROWANIE MECZÓW W GRUPIE
// Tworzy mecze każdy z każdym
// Każdy mecz ma miejsce na sety
// ==========================
export function generateGroupMatches(teams) {
  const matches = [];
  const teamList = [...teams];

  // Jeśli nieparzysta liczba drużyn → bye
  if (teamList.length % 2 !== 0) {
    teamList.push(null);
  }

  const totalRounds = teamList.length - 1;
  const half = teamList.length / 2;

  for (let round = 0; round < totalRounds; round++) {
    for (let i = 0; i < half; i++) {
      const teamA = teamList[i];
      const teamB = teamList[teamList.length - 1 - i];

      if (teamA && teamB) {
        matches.push({
          teamA,
          teamB,
          group: teamA.group,
          round: round + 1,
          sets: [
            { a: "", b: "" },
            { a: "", b: "" },
            { a: "", b: "" },
          ],
          finished: false,
        });
      }
    }

    // Rotacja drużyn (algorytm kołowy)
    teamList.splice(1, 0, teamList.pop());
  }

  return matches;
}

export function generateSchedule(matchesA, matchesB) {
  const scheduledMatches = [];

  let round = 1;

  let globalMatchId = 1;
  let order = 1;

  const maxLength = Math.max(matchesA.length, matchesB.length);

  for (let i = 0; i < maxLength; i++) {
    if (matchesA[i]) {
      scheduledMatches.push({
        id: globalMatchId++,
        type: "group",
        ...matchesA[i],
        round,
        order: order++,
        court: "A", // 🔥 grupa A zawsze A
      });
    }

    if (matchesB[i]) {
      scheduledMatches.push({
        id: globalMatchId++,
        type: "group",
        ...matchesB[i],
        round,
        order: order++,
        court: "B", // 🔥 grupa B zawsze B
      });
    }

    round++;
  }

  return scheduledMatches;
}

// ==========================
// LICZENIE TABELI GRUPOWEJ
// Na podstawie zakończonych meczów
// ==========================
export function calculateTable(teams, matches) {
  const table = teams.map((team) => ({
    id: team.id,
    name: team.name,
    played: 0,
    won: 0,
    lost: 0,
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

    let setsA = 0;
    let setsB = 0;

    match.sets.forEach((set) => {
      if (set.a === "" || set.b === "") return;

      const a = parseInt(set.a);
      const b = parseInt(set.b);

      if (isNaN(a) || isNaN(b)) return;

      teamA.smallPointsWon += a;
      teamA.smallPointsLost += b;

      teamB.smallPointsWon += b;
      teamB.smallPointsLost += a;

      if (a > b) setsA++;
      if (b > a) setsB++;
    });

    teamA.played++;
    teamB.played++;

    teamA.setsWon += setsA;
    teamA.setsLost += setsB;

    teamB.setsWon += setsB;
    teamB.setsLost += setsA;

    if (setsA > setsB) {
      if (setsB === 0) {
        teamA.points += 3; // 2:0
      } else {
        teamA.points += 2; // 2:1
        teamB.points += 1; // 1:2
      }
    } else {
      if (setsA === 0) {
        teamB.points += 3; // 0:2
      } else {
        teamB.points += 2; // 2:1
        teamA.points += 1; // 1:2
      }
    }
  });

  return table.sort((a, b) => {
    // 1️⃣ Punkty
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    // 2️⃣ Różnica setów
    const setsDiffA = a.setsWon - a.setsLost;
    const setsDiffB = b.setsWon - b.setsLost;

    if (setsDiffB !== setsDiffA) {
      return setsDiffB - setsDiffA;
    }

    // 3️⃣ Różnica małych punktów
    const smallDiffA = a.smallPointsWon - a.smallPointsLost;
    const smallDiffB = b.smallPointsWon - b.smallPointsLost;

    if (smallDiffB !== smallDiffA) {
      return smallDiffB - smallDiffA;
    }

    // 4️⃣ Bezpośredni mecz
    const directMatch = matches.find(
      (m) =>
        m.finished &&
        ((m.teamA.id === a.id && m.teamB.id === b.id) ||
          (m.teamA.id === b.id && m.teamB.id === a.id)),
    );

    if (directMatch) {
      const { setsA, setsB } = calculateSetsScore(directMatch);

      if (directMatch.teamA.id === a.id) {
        return setsB - setsA; // jeśli A wygrał → ma być wyżej
      } else {
        return setsA - setsB;
      }
    }

    return 0;
  });
}

// ==========================
// GENEROWANIE PÓŁFINAŁÓW
// 1A vs 2B
// 1B vs 2A
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
// OBLICZENIE ZWYCIĘZCY MECZU
// ==========================
export function getMatchWinner(match) {
  let setsA = 0;
  let setsB = 0;

  match.sets.forEach((set) => {
    const a = Number(set.a);
    const b = Number(set.b);

    if (!a && !b) return;

    if (a > b) setsA++;
    if (b > a) setsB++;
  });

  return setsA > setsB ? match.teamA : match.teamB;
}

// ==========================
// GENEROWANIE FINAŁU I MECZU O 3
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

// ==========================
// WALIDACJA WYNIKU MECZU
// Sprawdza czy wynik jest poprawny
// ==========================
export function validateMatch(match) {
  let setsA = 0;
  let setsB = 0;

  for (let set of match.sets) {
    const a = parseInt(set.a);
    const b = parseInt(set.b);

    if (isNaN(a) || isNaN(b)) continue;

    if (a === b) {
      return "Set nie może zakończyć się remisem.";
    }

    if (a > b) setsA++;
    if (b > a) setsB++;
  }

  // 🔥 DLA FINAŁU – musi być 3 wygrane
  if (match.type === "final") {
    if (setsA < 3 && setsB < 3) {
      return "Finał musi być wygrany do 3 setów.";
    }
  }

  // 🔥 DLA MECZU O 3 MIEJSCE – dopuszczamy 2 LUB 3 wygrane
  else if (match.type === "thirdPlace") {
    if (
      setsA < 2 &&
      setsB < 2 // mniej niż 2
    ) {
      return "Mecz musi być wygrany przynajmniej 2 setami.";
    }
  }

  // 🔥 POZOSTAŁE MECZE – standard BO3
  else {
    if (setsA < 2 && setsB < 2) {
      return "Mecz musi być wygrany do 2 setów.";
    }
  }

  if (setsA === setsB) {
    return "Nieprawidłowy wynik meczu.";
  }

  return null;
}
