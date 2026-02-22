"use client";

// ==========================
// STRONA DLA ZAWODNIKÓW /
// ==========================

import { useEffect, useState } from "react";
import MatchMatrix from "@/components/MatchMatrix";

export default function HomePage() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("table"); // table | schedule
  const [tableView, setTableView] = useState("groups"); // groups | main

  // ===== ROZWIJANY MECZ =====
  const [expandedMatchId, setExpandedMatchId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/tournament");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Błąd pobierania danych", err);
      }
    };

    // pierwsze ładowanie
    fetchData();

    // auto refresh co 20 sekund
    const interval = setInterval(fetchData, 20000);

    return () => clearInterval(interval);
  }, []);

  if (!data) return <div className="p-8">Ładowanie...</div>;
  console.log("DATA:", data);
  const { tournament, schedule } = data;

  const groupA = tournament.teams.filter((t) => t.group === "A");
  const groupB = tournament.teams.filter((t) => t.group === "B");

  const groupMatches = schedule.filter((m) => m.type === "group");

  // ===== LICZENIE WYGRANYCH SETÓW =====
  const calculateSetsScore = (match) => {
    let setsA = 0;
    let setsB = 0;

    match.sets.forEach((set) => {
      const a = parseInt(set.a);
      const b = parseInt(set.b);

      if (!isNaN(a) && !isNaN(b)) {
        if (a > b) setsA++;
        if (b > a) setsB++;
      }
    });

    return { setsA, setsB };
  };

  // ===== AKTUALNY MECZ =====
  const currentMatch = groupMatches.find((m) => !m.finished);

  return (
    <main className="min-h-screen p-6 bg-gray-100">
      {/* ===== GÓRNE ZAKŁADKI ===== */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("table")}
          className={`px-4 py-2 rounded ${
            activeTab === "table" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Tabela
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          className={`px-4 py-2 rounded ${
            activeTab === "schedule" ? "bg-blue-600 text-white" : "bg-white"
          }`}
        >
          Terminarz
        </button>
      </div>

      {/* ===== TABELA ===== */}
      {activeTab === "table" && (
        <>
          {/* PODZAKŁADKI */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setTableView("groups")}
              className={`px-4 py-2 rounded ${
                tableView === "groups" ? "bg-green-600 text-white" : "bg-white"
              }`}
            >
              Grupy
            </button>

            <button
              onClick={() => setTableView("matches")}
              className={`px-4 py-2 rounded ${
                tableView === "matches" ? "bg-green-600 text-white" : "bg-white"
              }`}
            >
              Mecze
            </button>

            <button
              onClick={() => setTableView("main")}
              className={`px-4 py-2 rounded ${
                tableView === "main" ? "bg-green-600 text-white" : "bg-white"
              }`}
            >
              Główna
            </button>
          </div>

          {tableView === "groups" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-4">Grupa A</h2>
                {groupA.map((team) => (
                  <div key={team.id} className="py-2 border-b">
                    {team.name}
                  </div>
                ))}
              </div>

              <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-4">Grupa B</h2>
                {groupB.map((team) => (
                  <div key={team.id} className="py-2 border-b">
                    {team.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tableView === "matches" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold mb-4">Grupa A</h2>
                <MatchMatrix
                  teams={groupA}
                  matches={schedule.filter((m) => m.group === "A")}
                  mode="mobile"
                />
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">Grupa B</h2>
                <MatchMatrix
                  teams={groupB}
                  matches={schedule.filter((m) => m.group === "B")}
                  mode="mobile"
                />
              </div>
            </div>
          )}

          {tableView === "main" && (
            <div className="bg-white p-4 rounded shadow">
              Klasyfikacja końcowa (w budowie)
            </div>
          )}
        </>
      )}

      {/* ===== TERMINARZ ===== */}
      {activeTab === "schedule" && (
        <div className="bg-white p-4 rounded shadow space-y-4">
          <h2 className="text-xl font-bold mb-4">Mecze grupowe</h2>

          {groupMatches.map((match) => {
            const isCurrent = currentMatch?.id === match.id;
            const { setsA, setsB } = calculateSetsScore(match);
            const isFinished = match.finished;

            const teamAClass =
              isFinished && setsA > setsB ? "font-bold text-green-700" : "";
            const teamBClass =
              isFinished && setsB > setsA ? "font-bold text-green-700" : "";

            return (
              <div
                key={match.id}
                onClick={() =>
                  setExpandedMatchId(
                    expandedMatchId === match.id ? null : match.id,
                  )
                }
                className={`p-4 rounded border transition-all duration-300 cursor-pointer
            ${
              match.finished
                ? "opacity-40 bg-gray-100"
                : isCurrent
                  ? "bg-yellow-100 border-yellow-500 border-2 shadow-lg"
                  : "bg-white"
            }
          `}
              >
                {isCurrent && (
                  <div className="text-xs font-bold text-yellow-700 mb-1">
                    W TRAKCIE
                  </div>
                )}

                <div className="text-sm text-gray-500 mb-1">
                  Boisko {match.court}
                </div>

                <div className="flex justify-between items-center font-semibold">
                  <span className={teamAClass}>{match.teamA.name}</span>

                  <span className="text-lg font-bold px-3">
                    {isFinished ? `${setsA} : ${setsB}` : "vs"}
                  </span>

                  <span className={teamBClass}>{match.teamB.name}</span>
                </div>

                {/* ===== SZCZEGÓŁY SETÓW ===== */}
                {expandedMatchId === match.id && (
                  <div className="mt-3 pt-2 border-t text-sm text-gray-700">
                    {match.sets.map((set, index) =>
                      set.a && set.b ? (
                        <div key={index}>
                          Set {index + 1}: {set.a} : {set.b}
                        </div>
                      ) : null,
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
