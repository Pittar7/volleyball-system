"use client";

import { useState } from "react";
import {
  createEmptyTournament,
  generateTeams,
  splitIntoGroups,
  generateGroupMatches,
} from "@/lib/tournamentLogic";



export default function AdminPage() {
  const [tournament, setTournament] = useState(createEmptyTournament());
  const [groupA, setGroupA] = useState([]);
  const [groupB, setGroupB] = useState([]);
  const [matchesA, setMatchesA] = useState([]);
  const [matchesB, setMatchesB] = useState([]);

  const handleGenerate = () => {
  const teams = generateTeams(tournament.settings.numberOfTeams);

  setTournament({
    ...tournament,
    teams,
  });

  setGroupA([]);
  setGroupB([]);
  setMatchesA([]);
  setMatchesB([]);
};

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Panel Administratora ⚙️</h1>

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

{tournament.teams.length > 0 && (
  <div className="mt-8">
    <h2 className="text-xl font-bold mb-4">Przypisz drużyny do grup</h2>

    {tournament.teams.map((team) => (
      <div key={team.id} className="flex items-center gap-4 mb-2">
        <span className="w-40">{team.name}</span>

        <select
          value={team.group}
          onChange={(e) => {
            const updatedTeams = tournament.teams.map((t) =>
              t.id === team.id
                ? { ...t, group: e.target.value }
                : t
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
  </div>
)}
<button
  onClick={() => {
    const groupA = tournament.teams.filter(t => t.group === "A");
    const groupB = tournament.teams.filter(t => t.group === "B");

    if (Math.abs(groupA.length - groupB.length) > 1) {
      alert("Grupy nie mogą różnić się więcej niż o 1 drużynę!");
      return;
    }

    const groupAMatches = generateGroupMatches(groupA);
    const groupBMatches = generateGroupMatches(groupB);

    setGroupA(groupA);
    setGroupB(groupB);
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
        <li key={match.id} className="bg-white p-3 rounded shadow">
          {match.teamA.name} vs {match.teamB.name}
        </li>
      ))}
    </ul>

    <h2 className="text-2xl font-bold mt-8 mb-4">Mecze – Grupa B</h2>
    <ul className="space-y-2">
      {matchesB.map((match) => (
        <li key={match.id} className="bg-white p-3 rounded shadow">
          {match.teamA.name} vs {match.teamB.name}
        </li>
      ))}
    </ul>
  </div>
)}
    </main>
  );
}
