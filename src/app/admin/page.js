"use client";

import { useState } from "react";
import {
  createEmptyTournament,
  generateTeams,
  splitIntoGroups,
} from "@/lib/tournamentLogic";

export default function AdminPage() {
  const [tournament, setTournament] = useState(createEmptyTournament());
  const [groupA, setGroupA] = useState([]);
  const [groupB, setGroupB] = useState([]);

  const handleGenerate = () => {
    const teams = generateTeams(tournament.settings.numberOfTeams);
    const { groupA, groupB } = splitIntoGroups(teams);

    setTournament({
      ...tournament,
      teams,
    });

    setGroupA(groupA);
    setGroupB(groupB);
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
    </main>
  );
}
