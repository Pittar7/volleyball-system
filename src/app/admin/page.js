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
  const [availableLogos, setAvailableLogos] = useState([]);

  const [playFor5, setPlayFor5] = useState(false);
  const [playFor7, setPlayFor7] = useState(false);
  const [playFor9, setPlayFor9] = useState(false);
  const [playFor11, setPlayFor11] = useState(false);

  const groupA = tournament.teams.filter((t) => t.group === "A");
  const groupB = tournament.teams.filter((t) => t.group === "B");

  const sortedSchedule = [...schedule].sort((a, b) => a.order - b.order);

  // ==============================
  // LOGA
  // ==============================
  useEffect(() => {
    const fetchLogos = async () => {
      const res = await fetch("/api/logos");
      const data = await res.json();
      setAvailableLogos(data);
    };
    fetchLogos();
  }, []);

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
  // GENEROWANIE GRUP
  // ==============================
  const confirmGroups = () => {
    const groupAMatches = generateGroupMatches(groupA);
    const groupBMatches = generateGroupMatches(groupB);
    const scheduled = generateSchedule(groupAMatches, groupBMatches);
    setSchedule(scheduled);
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
      schedule.filter((m) => m.group === "A"),
    );
    const tableB = calculateTable(
      groupB,
      schedule.filter((m) => m.group === "B"),
    );

    if (tableA.length < 2 || tableB.length < 2) {
      alert("Za mało drużyn");
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
      (m) => m.type === "semifinal" && m.finished,
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
      teamA: winner1,
      teamB: winner2,
      sets: [
        { a: "", b: "" },
        { a: "", b: "" },
        { a: "", b: "" },
        { a: "", b: "" },
        { a: "", b: "" },
      ],
      finished: false,
    };

    const thirdPlace = {
      id: crypto.randomUUID(),
      type: "thirdPlace",
      order: maxOrder + 2,
      court: "B",
      teamA: loser1,
      teamB: loser2,
      sets: [
        { a: "", b: "" },
        { a: "", b: "" },
        { a: "", b: "" },
        { a: "", b: "" },
        { a: "", b: "" },
      ],
      finished: false,
    };

    const cleaned = schedule.filter(
      (m) => m.type !== "final" && m.type !== "thirdPlace",
    );

    setSchedule([...cleaned, thirdPlace, finalMatch]);
  };

  // ==============================
  // RENDER MECZU
  // ==============================
  const renderMatch = (match) => (
    <div key={match.id} className="bg-gray-200 p-4 rounded mb-3">
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
                        idx === i ? { ...s, a: e.target.value } : s,
                      ),
                    }
                  : m,
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
                        idx === i ? { ...s, b: e.target.value } : s,
                      ),
                    }
                  : m,
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
              m.id === match.id ? { ...m, finished: true } : m,
            ),
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

      <button
        onClick={confirmGroups}
        className="ml-4 bg-green-600 text-white px-4 py-2 rounded"
      >
        Zatwierdź grupy
      </button>

      <button
        onClick={generateSemifinals}
        className="ml-4 bg-purple-600 text-white px-4 py-2 rounded"
      >
        Generuj półfinały
      </button>

      <button
        onClick={generateFinalMatches}
        className="ml-4 bg-red-600 text-white px-4 py-2 rounded"
      >
        Generuj finał
      </button>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-6">Harmonogram</h2>

        {["group", "placement", "semifinal", "thirdPlace", "final"].map(
          (type) => {
            const matches = sortedSchedule.filter((m) => m.type === type);
            if (!matches.length) return null;

            let title = "";
            if (type === "group") title = "Mecze grupowe";
            if (type === "placement") title = "Mecze o miejsca";
            if (type === "semifinal") title = "Półfinały";
            if (type === "thirdPlace") title = "Mecz o 3 miejsce";
            if (type === "final") title = "Finał";

            return (
              <div key={type} className="mb-10">
                <h3 className="text-xl font-bold mb-4">{title}</h3>
                {matches.map(renderMatch)}
              </div>
            );
          },
        )}
      </div>
    </main>
  );
}
