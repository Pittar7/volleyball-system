"use client";

import { useState, useEffect } from "react";
import {
  createEmptyTournament,
  generateTeams,
  generateGroupMatches,
  generateSchedule,
  calculateTable,
  getMatchWinner,
  validateMatch,
} from "@/lib/tournamentLogic";

export default function AdminPage() {
  const [tournament, setTournament] = useState(createEmptyTournament());
  const [schedule, setSchedule] = useState([]);
  const [adminView, setAdminView] = useState("setup");
  // setup | groups | bracket | summary

  const groupA = tournament.teams.filter((t) => t.group === "A");
  const groupB = tournament.teams.filter((t) => t.group === "B");

  const sortedSchedule = [...schedule].sort((a, b) => a.order - b.order);

  // ==============================
  // ZAPIS / WCZYTANIE
  // ==============================
  const saveTournament = async () => {
    await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournament, schedule }),
    });
    alert("Turniej zapisany");
  };

  const loadTournament = async () => {
    const res = await fetch("/api/tournament");
    const data = await res.json();
    if (!data) return alert("Brak danych");
    setTournament(data.tournament);
    setSchedule(data.schedule || []);
  };

  // ==============================
  // GENEROWANIE DRUŻYN
  // ==============================
  const handleGenerate = () => {
    const teams = generateTeams(tournament.settings.numberOfTeams);
    setTournament({ ...tournament, teams });
  };

  // ==============================
  // ZATWIERDZANIE GRUP
  // ==============================
  const confirmGroups = () => {
    if (!groupA.length || !groupB.length) {
      alert("Obie grupy muszą mieć przynajmniej 1 drużynę");
      return;
    }

    const groupAMatches = generateGroupMatches(groupA);
    const groupBMatches = generateGroupMatches(groupB);
    const scheduled = generateSchedule(groupAMatches, groupBMatches);

    setSchedule(scheduled);
    setAdminView("groups");
  };

  // ==============================
  // PÓŁFINAŁY
  // ==============================
  const generateSemifinals = () => {
    if (schedule.some((m) => m.type === "semifinal")) {
      alert("Półfinały już wygenerowane");
      return;
    }

    const tableA = calculateTable(
      groupA,
      schedule.filter((m) => m.group === "A")
    );
    const tableB = calculateTable(
      groupB,
      schedule.filter((m) => m.group === "B")
    );

    if (tableA.length < 2 || tableB.length < 2) {
      alert("Za mało drużyn do półfinałów");
      return;
    }

    const maxOrder =
      schedule.length > 0 ? Math.max(...schedule.map((m) => m.order)) : 0;

    const newMatches = [
      {
        id: crypto.randomUUID(),
        type: "semifinal",
        order: maxOrder + 1,
        court: "A",
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
        id: crypto.randomUUID(),
        type: "semifinal",
        order: maxOrder + 2,
        court: "B",
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

    setSchedule([...schedule, ...newMatches]);
  };

  // ==============================
  // FINAŁ + MECZ O 3
  // ==============================
  const generateFinalMatches = () => {
    const semifinals = schedule.filter(
      (m) => m.type === "semifinal" && m.finished
    );

    if (semifinals.length !== 2) {
      alert("Najpierw zakończ półfinały");
      return;
    }

    const winner1 = getMatchWinner(semifinals[0]);
    const winner2 = getMatchWinner(semifinals[1]);

    const loser1 =
      winner1.id === semifinals[0].teamA.id
        ? semifinals[0].teamB
        : semifinals[0].teamA;

    const loser2 =
      winner2.id === semifinals[1].teamA.id
        ? semifinals[1].teamB
        : semifinals[1].teamA;

    const maxOrder = Math.max(...schedule.map((m) => m.order));

    const finalMatch = {
      id: crypto.randomUUID(),
      type: "final",
      order: maxOrder + 1,
      court: "A",
      label: "Finał",
      teamA: winner1,
      teamB: winner2,
      sets: Array(5).fill({ a: "", b: "" }),
      finished: false,
    };

    const thirdPlace = {
      id: crypto.randomUUID(),
      type: "thirdPlace",
      order: maxOrder + 2,
      court: "B",
      label: "Mecz o 3 miejsce",
      teamA: loser1,
      teamB: loser2,
      sets: Array(5).fill({ a: "", b: "" }),
      finished: false,
    };

    const cleaned = schedule.filter(
      (m) => m.type !== "final" && m.type !== "thirdPlace"
    );

    setSchedule([...cleaned, thirdPlace, finalMatch]);
  };

  // ==============================
  // RENDER MECZU
  // ==============================
  const renderMatch = (match) => (
    <div key={match.id} className="bg-gray-200 p-4 rounded mb-4">
      <div className="font-semibold mb-2">
        {match.label && (
          <span className="text-purple-700 mr-3">{match.label}</span>
        )}
        {match.teamA.name} vs {match.teamB.name}
      </div>

      {match.sets.map((set, i) => (
        <div key={i} className="flex gap-2 mb-1">
          <input
            type="number"
            value={set.a}
            onChange={(e) => {
              const updated = schedule.map((m) =>
                m.id === match.id
                  ? {
                      ...m,
                      sets: m.sets.map((s, idx) =>
                        idx === i ? { ...s, a: e.target.value } : s
                      ),
                    }
                  : m
              );
              setSchedule(updated);
            }}
            className="w-16 border p-1 rounded"
          />
          <input
            type="number"
            value={set.b}
            onChange={(e) => {
              const updated = schedule.map((m) =>
                m.id === match.id
                  ? {
                      ...m,
                      sets: m.sets.map((s, idx) =>
                        idx === i ? { ...s, b: e.target.value } : s
                      ),
                    }
                  : m
              );
              setSchedule(updated);
            }}
            className="w-16 border p-1 rounded"
          />
        </div>
      ))}

      <button
        onClick={() => {
          const error = validateMatch(match);
          if (error) return alert(error);

          setSchedule(
            schedule.map((m) =>
              m.id === match.id ? { ...m, finished: true } : m
            )
          );
        }}
        className="mt-2 bg-blue-600 text-white px-3 py-1 rounded"
      >
        Zapisz wynik
      </button>

      {match.finished && (
        <div className="text-green-600 mt-2 font-semibold">
          ✅ Mecz zakończony
        </div>
      )}
    </div>
  );

  return (
    <main className="min-h-screen p-8">
      {/* ===== GÓRNY PASEK ===== */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold">Panel Administratora ⚙️</h1>
        <div className="flex gap-3">
          <button
            onClick={saveTournament}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            💾 Zapisz
          </button>
          <button
            onClick={loadTournament}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            📂 Wczytaj
          </button>
        </div>
      </div>

      {/* ===== ZAKŁADKI ===== */}
      <div className="flex gap-4 mb-8">
        {["setup", "groups", "bracket", "summary"].map((view) => (
          <button
            key={view}
            onClick={() => setAdminView(view)}
            className={`px-4 py-2 rounded ${
              adminView === view ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {view === "setup" && "Tworzenie"}
            {view === "groups" && "Faza grupowa"}
            {view === "bracket" && "Drabinka"}
            {view === "summary" && "Podsumowanie"}
          </button>
        ))}
      </div>

      {/* ===== SETUP ===== */}
      {adminView === "setup" && (
        <>
          <div className="mb-4">
            <label>Liczba drużyn:</label>
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
              className="border p-2 ml-2 w-20"
            />
          </div>

          <button
            onClick={handleGenerate}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Generuj drużyny
          </button>

          {tournament.teams.length > 0 && (
            <div className="mt-6 space-y-2">
              {tournament.teams.map((team) => (
                <div key={team.id} className="flex gap-4 items-center">
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => {
                      const updated = tournament.teams.map((t) =>
                        t.id === team.id ? { ...t, name: e.target.value } : t
                      );
                      setTournament({ ...tournament, teams: updated });
                    }}
                    className="border p-1 rounded w-40"
                  />

                  <select
                    value={team.group || ""}
                    onChange={(e) => {
                      const updated = tournament.teams.map((t) =>
                        t.id === team.id ? { ...t, group: e.target.value } : t
                      );
                      setTournament({ ...tournament, teams: updated });
                    }}
                    className="border p-1 rounded"
                  >
                    <option value="">-- wybierz --</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </div>
              ))}

              <button
                onClick={confirmGroups}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
              >
                Zatwierdź grupy
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== FAZA GRUPOWA ===== */}
      {adminView === "groups" &&
        sortedSchedule.filter((m) => m.type === "group").map(renderMatch)}

      {/* ===== DRABINKA ===== */}
      {adminView === "bracket" && (
        <>
          <div className="flex gap-4 mb-6">
            <button
              onClick={generateSemifinals}
              className="bg-purple-600 text-white px-4 py-2 rounded"
            >
              Generuj półfinały
            </button>
            <button
              onClick={generateFinalMatches}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Generuj finał
            </button>
          </div>

          {sortedSchedule
            .filter((m) =>
              ["placement", "semifinal", "thirdPlace", "final"].includes(m.type)
            )
            .map(renderMatch)}
        </>
      )}
    </main>
  );
}
