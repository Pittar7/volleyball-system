"use client";

import { useState, useEffect } from "react";
import {
  createEmptyTournament,
  generateTeams,
  splitIntoGroups,
  generateGroupMatches,
  generateSchedule,
  calculateTable,
  generateSemifinals,
  generateFinals,
  getMatchWinner,
  validateMatch,
} from "@/lib/tournamentLogic";

export default function AdminPage() {
  // ===== STANY =====
  const [tournament, setTournament] = useState(createEmptyTournament());
  const groupA = tournament.teams.filter((t) => t.group === "A");
  const groupB = tournament.teams.filter((t) => t.group === "B");
  const [matchesA, setMatchesA] = useState([]);
  const [matchesB, setMatchesB] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [tableA, setTableA] = useState([]);
  const [tableB, setTableB] = useState([]);
  const [semifinals, setSemifinals] = useState([]);
  const [finalMatch, setFinalMatch] = useState(null);
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState(null);
  const [availableLogos, setAvailableLogos] = useState([]);

  // ===== POBIERANIE LOGO =====
  useEffect(() => {
    const fetchLogos = async () => {
      const res = await fetch("/api/logos");
      const data = await res.json();
      setAvailableLogos(data);
    };

    fetchLogos();
  }, []);

  // ==========================
  // AUTOZAPIS CO 5 MINUT
  // ==========================
  useEffect(() => {
    const interval = setInterval(
      async () => {
        const data = {
          tournament,
          groupA,
          groupB,
          schedule,
          tableA,
          tableB,
          semifinals,
          finalMatch,
          thirdPlaceMatch,
        };

        try {
          await fetch("/api/tournament", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          console.log("Autozapis wykonany");
        } catch (error) {
          console.error("Błąd autozapisu", error);
        }
      },
      5 * 60 * 1000,
    ); // 5 minut

    return () => clearInterval(interval);
  }, [
    tournament,
    groupA,
    groupB,
    schedule,
    tableA,
    tableB,
    semifinals,
    finalMatch,
    thirdPlaceMatch,
  ]);

  // ===== FUNKCJE =====

  // ==========================
  // ZAPIS TURNIEJU DO JSON
  // ==========================
  const saveTournament = async () => {
    const data = {
      tournament,
      groupA,
      groupB,
      schedule,
      tableA,
      tableB,
      semifinals,
      finalMatch,
      thirdPlaceMatch,
    };

    try {
      await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      alert("Turniej zapisany!");
    } catch (error) {
      alert("Błąd zapisu!");
      console.error(error);
    }
  };

  // ==========================
  // WCZYTANIE TURNIEJU
  // ==========================
  const loadTournament = async () => {
    try {
      const res = await fetch("/api/tournament");
      const data = await res.json();

      if (!data) {
        alert("Brak zapisanych danych.");
        return;
      }

      setTournament(data.tournament);
      setSchedule(data.schedule);
      setTableA(data.tableA);
      setTableB(data.tableB);
      setSemifinals(data.semifinals);
      setFinalMatch(data.finalMatch);
      setThirdPlaceMatch(data.thirdPlaceMatch);

      alert("Turniej wczytany!");
    } catch (error) {
      alert("Błąd wczytywania!");
      console.error(error);
    }
  };

  const handleGenerate = () => {
    const teams = generateTeams(tournament.settings.numberOfTeams);

    setTournament({
      ...tournament,
      teams,
    });

    setMatchesA([]);
    setMatchesB([]);
  };

  // ===== RETURN JSX =====
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Panel Administratora ⚙️</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={saveTournament}
          className="bg-gray-800 text-white px-4 py-2 rounded"
        >
          Zapisz turniej
        </button>

        <button
          onClick={loadTournament}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Wczytaj turniej
        </button>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-semibold">Liczba drużyn:</label>
        <input
          type="number"
          min="4"
          max="12"
          value={tournament.settings.numberOfTeams}
          onChange={(e) =>
            setTournament({
              ...tournament,
              settings: {
                ...tournament.settings,
                numberOfTeams: Number(e.target.value),
              },
            })
          }
          className="border p-2 rounded w-24"
        />
      </div>

      <button
        onClick={handleGenerate}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Generuj drużyny
      </button>

      {groupA.length > 0 && (
        <div className="grid grid-cols-2 gap-8 mt-8">
          <div>
            <h2 className="text-xl font-bold mb-2">Grupa A</h2>
            <ul className="space-y-1">
              {groupA.map((team) => (
                <li key={team.id} className="bg-white p-2 rounded shadow">
                  {team.name}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2">Grupa B</h2>
            <ul className="space-y-1">
              {groupB.map((team) => (
                <li key={team.id} className="bg-white p-2 rounded shadow">
                  {team.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tournament.teams.map((team) => (
        <div key={team.id} className="flex items-center gap-4 mb-2">
          {/* LOGO DRUŻYNY */}
          {team.logo ? (
            <div
              style={{
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={team.logo}
                alt={team.name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-gray-300 rounded flex items-center justify-center text-xs">
              ?
            </div>
          )}

          {/* NAZWA DRUŻYNY */}
          <input
            type="text"
            value={team.name}
            onChange={(e) => {
              const updatedTeams = tournament.teams.map((t) =>
                t.id === team.id ? { ...t, name: e.target.value } : t,
              );

              setTournament({
                ...tournament,
                teams: updatedTeams,
              });
            }}
            className="border p-1 rounded w-40"
          />

          {/* WYBÓR LOGO */}
          <select
            value={team.logo || ""}
            onChange={(e) => {
              const updatedTeams = tournament.teams.map((t) =>
                t.id === team.id ? { ...t, logo: e.target.value || null } : t,
              );

              setTournament({
                ...tournament,
                teams: updatedTeams,
              });
            }}
            className="border p-1 rounded"
          >
            <option value="">Brak logo</option>

            {availableLogos.map((file) => (
              <option key={file} value={`/logos/${file}`}>
                {file}
              </option>
            ))}
          </select>

          {/* WYBÓR GRUPY */}
          <select
            value={team.group}
            onChange={(e) => {
              const updatedTeams = tournament.teams.map((t) =>
                t.id === team.id ? { ...t, group: e.target.value } : t,
              );

              setTournament({
                ...tournament,
                teams: updatedTeams,
              });
            }}
            className="border p-1 rounded"
          >
            <option value="">-- wybierz --</option>
            <option value="A">Grupa A</option>
            <option value="B">Grupa B</option>
          </select>
        </div>
      ))}
      <button
        onClick={() => {
          const groupA = tournament.teams.filter((t) => t.group === "A");
          const groupB = tournament.teams.filter((t) => t.group === "B");

          if (Math.abs(groupA.length - groupB.length) > 1) {
            alert("Grupy nie mogą różnić się więcej niż o 1 drużynę!");
            return;
          }

          const groupAMatches = generateGroupMatches(groupA);
          const groupBMatches = generateGroupMatches(groupB);

          const scheduled = generateSchedule(groupAMatches, groupBMatches);
          setSchedule(scheduled);

          setMatchesA(groupAMatches);
          setMatchesB(groupBMatches);
        }}
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Zatwierdź grupy
      </button>

      {matchesA.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Mecze – Grupa A</h2>
          <ul className="space-y-2">
            {matchesA.map((match) => (
              <li
                key={`${match.teamA.id}-${match.teamB.id}`}
                className="bg-white p-3 rounded shadow"
              >
                {match.teamA.name} vs {match.teamB.name}
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">Mecze – Grupa B</h2>
          <ul className="space-y-2">
            {matchesB.map((match) => (
              <li
                key={`${match.teamA.id}-${match.teamB.id}`}
                className="bg-white p-3 rounded shadow"
              >
                {match.teamA.name} vs {match.teamB.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ==========================
 WYŚWIETLANIE HARMONOGRAMU + WYNIKI
 ==========================*/}

      {schedule.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Harmonogram</h2>

          {schedule.map((match, index) => (
            <div
              key={`${match.group}-${match.id}-${match.round}`}
              className="bg-gray-200 p-4 rounded mb-3"
            >
              <div className="font-semibold mb-2">
                Runda {match.round} | Boisko {match.court} | {match.teamA.name}{" "}
                vs {match.teamB.name}
              </div>

              {/* Pola do wpisywania setów */}
              {match.sets.map((set, setIndex) => (
                <div key={setIndex} className="flex gap-2 mb-1">
                  <input
                    type="number"
                    placeholder="A"
                    value={set.a}
                    onChange={(e) => {
                      const updatedSchedule = [...schedule];
                      updatedSchedule[index].sets[setIndex].a = e.target.value;
                      setSchedule(updatedSchedule);
                    }}
                    className="w-16 border p-1 rounded"
                  />

                  <input
                    type="number"
                    placeholder="B"
                    value={set.b}
                    onChange={(e) => {
                      const updatedSchedule = [...schedule];
                      updatedSchedule[index].sets[setIndex].b = e.target.value;
                      setSchedule(updatedSchedule);
                    }}
                    className="w-16 border p-1 rounded"
                  />
                </div>
              ))}

              <button
                onClick={() => {
                  const error = validateMatch(match);

                  if (error) {
                    alert(error);
                    return;
                  }

                  const updatedSchedule = [...schedule];
                  updatedSchedule[index].finished = true;
                  setSchedule(updatedSchedule);

                  const groupAMatches = updatedSchedule.filter(
                    (m) => m.group === "A",
                  );
                  const groupBMatches = updatedSchedule.filter(
                    (m) => m.group === "B",
                  );

                  const updatedTableA = calculateTable(groupA, groupAMatches);
                  const updatedTableB = calculateTable(groupB, groupBMatches);

                  setTableA(updatedTableA);
                  setTableB(updatedTableB);

                  if (updatedTableA.length >= 2 && updatedTableB.length >= 2) {
                    setSemifinals(
                      generateSemifinals(updatedTableA, updatedTableB),
                    );
                  }
                }}
                className="mt-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Zapisz wynik
              </button>

              {match.finished && (
                <div className="text-green-600 mt-2 font-semibold">
                  ✅ Mecz zakończony
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* ==========================
 WYŚWIETLANIE TABELI
 ==========================*/}
      {tableA.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Tabela – Grupa A</h2>
          {tableA.map((team) => (
            <div key={team.id} className="bg-white p-2 mb-1 rounded shadow">
              {team.name} | Pkt: {team.points} | Sety: {team.setsWon}-
              {team.setsLost} | Małe pkt:{" "}
              {team.smallPointsWon - team.smallPointsLost}
            </div>
          ))}
        </div>
      )}

      {tableB.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Tabela – Grupa B</h2>
          {tableB.map((team) => (
            <div key={team.id} className="bg-white p-2 mb-1 rounded shadow">
              {team.name} | Pkt: {team.points} | Sety: {team.setsWon}-
              {team.setsLost} | Małe pkt:{" "}
              {team.smallPointsWon - team.smallPointsLost}
            </div>
          ))}
        </div>
      )}

      {/* ==========================
 WYŚWIETLANIE PÓŁFINAŁÓW
 ========================== */}
      {semifinals.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Półfinały</h2>

          {semifinals.map((match, index) => (
            <div key={match.id} className="bg-yellow-100 p-4 rounded mb-3">
              <div className="font-semibold mb-2">
                {match.teamA.name} vs {match.teamB.name}
              </div>

              {match.sets.map((set, setIndex) => (
                <div key={setIndex} className="flex gap-2 mb-1">
                  <input
                    type="number"
                    value={set.a}
                    onChange={(e) => {
                      const updated = [...semifinals];
                      updated[index].sets[setIndex].a = e.target.value;
                      setSemifinals(updated);
                    }}
                    className="w-16 border p-1 rounded"
                  />
                  <input
                    type="number"
                    value={set.b}
                    onChange={(e) => {
                      const updated = [...semifinals];
                      updated[index].sets[setIndex].b = e.target.value;
                      setSemifinals(updated);
                    }}
                    className="w-16 border p-1 rounded"
                  />
                </div>
              ))}

              <button
                onClick={() => {
                  const updated = [...semifinals];
                  updated[index].finished = true;
                  setSemifinals(updated);

                  const finals = generateFinals(updated);

                  if (finals) {
                    setFinalMatch(finals.final);
                    setThirdPlaceMatch(finals.thirdPlace);
                  }
                }}
                className="mt-2 bg-purple-600 text-white px-3 py-1 rounded"
              >
                Zapisz wynik
              </button>
            </div>
          ))}
        </div>
      )}

      {/*} ==========================
// MECZ O 3 MIEJSCE
// ========================== */}

      {thirdPlaceMatch && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Mecz o 3 miejsce</h2>

          <div className="bg-orange-100 p-4 rounded mb-4">
            <div className="font-semibold mb-2">
              {thirdPlaceMatch.teamA.name} vs {thirdPlaceMatch.teamB.name}
            </div>

            {thirdPlaceMatch.sets.map((set, setIndex) => (
              <div key={setIndex} className="flex gap-2 mb-1">
                <input
                  type="number"
                  value={set.a}
                  onChange={(e) => {
                    const updated = { ...thirdPlaceMatch };
                    updated.sets[setIndex].a = e.target.value;
                    setThirdPlaceMatch(updated);
                  }}
                  className="w-16 border p-1 rounded"
                />
                <input
                  type="number"
                  value={set.b}
                  onChange={(e) => {
                    const updated = { ...thirdPlaceMatch };
                    updated.sets[setIndex].b = e.target.value;
                    setThirdPlaceMatch(updated);
                  }}
                  className="w-16 border p-1 rounded"
                />
              </div>
            ))}

            <button
              onClick={() => {
                const updated = { ...thirdPlaceMatch, finished: true };
                setThirdPlaceMatch(updated);
              }}
              className="mt-2 bg-orange-600 text-white px-3 py-1 rounded"
            >
              Zapisz wynik meczu o 3
            </button>
          </div>
        </div>
      )}

      {/* ==========================
// FINAŁ - WYNIK
// ========================== */}

      {finalMatch && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Finał</h2>

          <div className="bg-green-100 p-4 rounded mb-4">
            <div className="font-semibold mb-2">
              {finalMatch.teamA.name} vs {finalMatch.teamB.name}
            </div>

            {finalMatch.sets.map((set, setIndex) => (
              <div key={setIndex} className="flex gap-2 mb-1">
                <input
                  type="number"
                  value={set.a}
                  onChange={(e) => {
                    const updated = { ...finalMatch };
                    updated.sets[setIndex].a = e.target.value;
                    setFinalMatch(updated);
                  }}
                  className="w-16 border p-1 rounded"
                />
                <input
                  type="number"
                  value={set.b}
                  onChange={(e) => {
                    const updated = { ...finalMatch };
                    updated.sets[setIndex].b = e.target.value;
                    setFinalMatch(updated);
                  }}
                  className="w-16 border p-1 rounded"
                />
              </div>
            ))}

            <button
              onClick={() => {
                const updated = { ...finalMatch, finished: true };
                setFinalMatch(updated);
              }}
              className="mt-2 bg-green-700 text-white px-3 py-1 rounded"
            >
              Zapisz wynik finału
            </button>
          </div>
        </div>
      )}

      {/* ==========================
// KLASYFIKACJA KOŃCOWA
// ========================== */}
      {finalMatch?.finished && thirdPlaceMatch?.finished && (
        <div className="mt-12 bg-gray-800 text-white p-6 rounded">
          <h2 className="text-3xl font-bold mb-4">Klasyfikacja końcowa</h2>

          {(() => {
            const winnerFinal = getMatchWinner(finalMatch);
            const loserFinal =
              winnerFinal.id === finalMatch.teamA.id
                ? finalMatch.teamB
                : finalMatch.teamA;

            const winnerThird = getMatchWinner(thirdPlaceMatch);
            const loserThird =
              winnerThird.id === thirdPlaceMatch.teamA.id
                ? thirdPlaceMatch.teamB
                : thirdPlaceMatch.teamA;

            return (
              <>
                <div>🥇 1 miejsce: {winnerFinal.name}</div>
                <div>🥈 2 miejsce: {loserFinal.name}</div>
                <div>🥉 3 miejsce: {winnerThird.name}</div>
                <div>4 miejsce: {loserThird.name}</div>
              </>
            );
          })()}
        </div>
      )}
    </main>
  );
}
