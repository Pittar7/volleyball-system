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
import "../styles/admin.css";

export default function AdminPage() {
  const [tournament, setTournament] = useState(createEmptyTournament());
  const [schedule, setSchedule] = useState([]);
  const [adminView, setAdminView] = useState("setup");
  // setup | groups | bracket | schedule | summary
  const [selectedTeams, setSelectedTeams] = useState([]);
  const groupA = tournament.teams.filter((t) => t.group === "A");
  const groupB = tournament.teams.filter((t) => t.group === "B");
  const [playFor5, setPlayFor5] = useState(false);
  const [playFor7, setPlayFor7] = useState(false);
  const [playFor9, setPlayFor9] = useState(false);
  const [playFor11, setPlayFor11] = useState(false);

  const sortedSchedule = [...schedule].sort((a, b) => a.order - b.order);

  // lista drużyn
  const TEAM_POOL = [
    "AZS Warszawa",
    "Volley Team Kraków",
    "Siatkarska Pasja",
    "Mocny Serwis",
    "Blokersi",
    "Team Smash",
    "Latające Orły",
    "Atakujący",
    "Siatkarskie Wilki",
    "Power Volley",
    "Asy Serwisowe",
    "Złota Siatka",
  ];

  // dodawanie drużyn
  const addTeam = (name) => {
    if (!name) return;
    if (selectedTeams.includes(name)) return;

    setSelectedTeams([...selectedTeams, name]);
  };
  // usuwanie drużyn
  const removeTeam = (name) => {
    setSelectedTeams(selectedTeams.filter((t) => t !== name));
  };

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
    if (selectedTeams.length < 4) {
      alert("Minimum 4 drużyny");
      return;
    }

    const teams = selectedTeams.map((name, index) => ({
      id: crypto.randomUUID(),
      name,
      group: "",
      logo: null,
    }));

    setTournament({
      ...tournament,
      teams,
    });
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
      schedule.filter((m) => m.group === "A"),
    );
    const tableB = calculateTable(
      groupB,
      schedule.filter((m) => m.group === "B"),
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
      (m) => m.type !== "final" && m.type !== "thirdPlace",
    );

    setSchedule([...cleaned, thirdPlace, finalMatch]);
  };
  // generowanie meczów o miejsca 5,7,9,11
  const generatePlacementMatches = () => {
    const tableA = calculateTable(
      groupA,
      schedule.filter((m) => m.group === "A"),
    );

    const tableB = calculateTable(
      groupB,
      schedule.filter((m) => m.group === "B"),
    );

    let nextOrder =
      schedule.length > 0 ? Math.max(...schedule.map((m) => m.order)) + 1 : 1;

    // ❗ USUWAMY STARE MECZE O MIEJSCA
    let updated = schedule.filter((m) => m.type !== "placement");

    const placements = [
      { enabled: playFor5, index: 2, label: "Mecz o 5 miejsce" },
      { enabled: playFor7, index: 3, label: "Mecz o 7 miejsce" },
      { enabled: playFor9, index: 4, label: "Mecz o 9 miejsce" },
      { enabled: playFor11, index: 5, label: "Mecz o 11 miejsce" },
    ];

    placements.forEach(({ enabled, index, label }) => {
      if (!enabled) return;
      if (!tableA[index] || !tableB[index]) return;

      updated.push({
        id: crypto.randomUUID(),
        type: "placement",
        label,
        order: nextOrder++,
        court: "A",
        teamA: tableA[index],
        teamB: tableB[index],
        sets: Array(3).fill({ a: "", b: "" }),
        finished: false,
      });
    });

    setSchedule(updated);
  };
  // Funkcja przesuwania meczów w terminarzu
  const moveMatchUp = (index) => {
    if (index === 0) return;

    const updated = [...sortedSchedule];

    const temp = updated[index - 1].order;
    updated[index - 1].order = updated[index].order;
    updated[index].order = temp;

    setSchedule(updated);
  };

  const moveMatchDown = (index) => {
    if (index === sortedSchedule.length - 1) return;

    const updated = [...sortedSchedule];

    const temp = updated[index + 1].order;
    updated[index + 1].order = updated[index].order;
    updated[index].order = temp;

    setSchedule(updated);
  };

  // ==============================
  // RENDER MECZU
  // ==============================
  const renderMatch = (match) => (
    <div key={match.id} className="admin-match-card results-section">
      {match.label && <div className="match-badge">{match.label}</div>}

      <div className="match-title">
        {match.teamA.name} vs {match.teamB.name}
      </div>

      <div className="results-section">
        <table className="results-table">
          <thead>
            <tr>
              <th>Set</th>
              <th>{match.teamA.name}</th>
              <th>{match.teamB.name}</th>
            </tr>
          </thead>

          <tbody>
            {match.sets.map((set, i) => (
              <tr key={i}>
                <td>#{i + 1}</td>

                <td>
                  <input
                    type="number"
                    placeholder="Wpisz wynik"
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
                  />
                </td>

                <td>
                  <input
                    type="number"
                    placeholder="Wpisz wynik"
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
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="match-actions">
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
          className="admin-btn admin-btn-primary"
        >
          Zapisz wynik
        </button>
      </div>

      {match.finished && (
        <div className="text-green-600 mt-2 font-semibold">
          ✅ Mecz zakończony
        </div>
      )}
    </div>
  );

  //funkcja pomocnicza do renderowania sekcji meczów
  const renderScheduleSection = (title, type) => {
    const matches = sortedSchedule.filter((m) => m.type === type);
    if (!matches.length) return null;

    return (
      <div className="schedule-section">
        <h5 className="schedule-section-title">{title}</h5>

        {matches.map((match, index) => {
          const globalIndex = sortedSchedule.findIndex(
            (m) => m.id === match.id,
          );

          return (
            <div key={match.id} className="schedule-row">
              <div className="schedule-info">
                #{match.order} — {match.teamA.name} vs {match.teamB.name}
              </div>

              <div className="schedule-controls">
                <button
                  onClick={() => moveMatchUp(globalIndex)}
                  disabled={globalIndex === 0}
                >
                  ↑
                </button>

                <button
                  onClick={() => moveMatchDown(globalIndex)}
                  disabled={globalIndex === sortedSchedule.length - 1}
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  return (
    <main className={`admin-page ${adminView}-theme`}>
      {/* ===== GÓRNY PASEK ===== */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold">Panel Administratora ⚙️</h1>
        <div className="admin-actions">
          <button onClick={saveTournament} className="admin-save">
            💾 Zapisz
          </button>

          <button onClick={loadTournament} className="admin-load">
            📂 Wczytaj
          </button>
        </div>
      </div>

      {/* ===== ZAKŁADKI ===== */}
      <div className="admin-tabs">
        <button
          onClick={() => setAdminView("setup")}
          className={adminView === "setup" ? "active" : ""}
        >
          Tworzenie
        </button>

        <button
          onClick={() => setAdminView("groups")}
          className={adminView === "groups" ? "active" : ""}
        >
          Faza grupowa
        </button>

        <button
          onClick={() => setAdminView("bracket")}
          className={adminView === "bracket" ? "active" : ""}
        >
          Drabinka
        </button>
        <button
          onClick={() => setAdminView("schedule")}
          className={adminView === "schedule" ? "active" : ""}
        >
          Terminarz
        </button>
        <button
          onClick={() => setAdminView("summary")}
          className={adminView === "summary" ? "active" : ""}
        >
          Podsumowanie
        </button>
      </div>

      {/* ===== SETUP ===== */}
      {adminView === "setup" && (
        <div className="admin-card team-selector">
          <h3 className="section-title">Wybierz drużyny</h3>

          <select
            onChange={(e) => addTeam(e.target.value)}
            className="admin-select"
            value=""
          >
            <option value="">-- wybierz drużynę --</option>

            {TEAM_POOL.filter((name) => !selectedTeams.includes(name)).map(
              (name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ),
            )}
          </select>

          <div className="selected-teams">
            {selectedTeams.map((team) => (
              <div key={team} className="selected-team">
                {team}
                <button onClick={() => removeTeam(team)}>×</button>
              </div>
            ))}
          </div>

          <div className="team-counter">Wybrano: {selectedTeams.length}</div>

          <button
            onClick={handleGenerate}
            disabled={selectedTeams.length < 4}
            className="admin-btn admin-btn-secondary"
          >
            Utwórz turniej
          </button>

          {/* LISTA DO PRZYPISANIA DO GRUP */}
          {tournament.teams.length > 0 && (
            <div className="group-assignment">
              {tournament.teams.map((team) => (
                <div key={team.id} className="team-row">
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => {
                      const updated = tournament.teams.map((t) =>
                        t.id === team.id ? { ...t, name: e.target.value } : t,
                      );
                      setTournament({ ...tournament, teams: updated });
                    }}
                    className="admin-input"
                  />

                  <select
                    value={team.group || ""}
                    onChange={(e) => {
                      const updated = tournament.teams.map((t) =>
                        t.id === team.id ? { ...t, group: e.target.value } : t,
                      );
                      setTournament({ ...tournament, teams: updated });
                    }}
                    className="admin-select"
                  >
                    <option value="">-- wybierz --</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </div>
              ))}

              <button
                onClick={confirmGroups}
                className="admin-btn admin-btn-primary"
              >
                Zatwierdź grupy
              </button>
            </div>
          )}
        </div>
      )}

      {adminView === "groups" && (
        <>
          <div className="groups-grid">
            {/* GRUPA A */}
            <div className="group-column">
              <h4 className="results-title">GRUPA A</h4>

              {sortedSchedule
                .filter((m) => m.type === "group" && m.group === "A")
                .map(renderMatch)}
            </div>

            {/* GRUPA B */}
            <div className="group-column">
              <h4 className="results-title">GRUPA B</h4>

              {sortedSchedule
                .filter((m) => m.type === "group" && m.group === "B")
                .map(renderMatch)}
            </div>
          </div>
        </>
      )}

      {/* ===== DRABINKA ===== */}
      {adminView === "bracket" && (
        <>
          {/* ===== WYŚWIETLANIE DRABINKI W KOLUMNACH ===== */}

          <div className="bracket-grid">
            {/* LEWA KOLUMNA — MECZE O MIEJSCA */}
            <div className="bracket-column">
              <h4 className="results-title">MECZE O MIEJSCA</h4>

              <div className="column-actions">
                <div className="placement-options">
                  <label className={`place-chip ${playFor5 ? "active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={playFor5}
                      onChange={(e) => setPlayFor5(e.target.checked)}
                    />
                    5 miejsce
                  </label>

                  <label className={`place-chip ${playFor7 ? "active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={playFor7}
                      onChange={(e) => setPlayFor7(e.target.checked)}
                    />
                    7 miejsce
                  </label>

                  <label className={`place-chip ${playFor9 ? "active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={playFor9}
                      onChange={(e) => setPlayFor9(e.target.checked)}
                    />
                    9 miejsce
                  </label>

                  <label className={`place-chip ${playFor11 ? "active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={playFor11}
                      onChange={(e) => setPlayFor11(e.target.checked)}
                    />
                    11 miejsce
                  </label>
                </div>

                <button
                  onClick={generatePlacementMatches}
                  className="admin-btn admin-btn-secondary"
                >
                  Generuj mecze o miejsca
                </button>
              </div>

              {sortedSchedule
                .filter((m) => m.type === "placement")
                .map(renderMatch)}
            </div>

            {/* PRAWA KOLUMNA — FAZA PUCHAROWA */}
            <div className="bracket-column">
              <h4 className="results-title">FAZA PUCHAROWA</h4>

              <div className="column-actions">
                <button
                  onClick={generateSemifinals}
                  className="admin-btn admin-btn-purple"
                >
                  Generuj półfinały
                </button>

                <button
                  onClick={generateFinalMatches}
                  className="admin-btn admin-btn-purple"
                >
                  Generuj finał
                </button>
              </div>

              {sortedSchedule
                .filter((m) =>
                  ["semifinal", "thirdPlace", "final"].includes(m.type),
                )
                .map(renderMatch)}
            </div>
          </div>
        </>
      )}
      {/* ===== TERMINARZ ===== */}
      {adminView === "schedule" && (
        <>
          <h4 className="results-title text-center">TERMINARZ</h4>

          <div className="schedule-list">
            {/* FAZA GRUPOWA */}
            {renderScheduleSection("Faza grupowa", "group")}

            {/* PÓŁFINAŁY */}
            {renderScheduleSection("Półfinały", "semifinal")}

            {/* MECZE O MIEJSCA */}
            {renderScheduleSection("Mecze o miejsca", "placement")}

            {/* MECZ O 3 MIEJSCE */}
            {renderScheduleSection("Mecz o 3 miejsce", "thirdPlace")}

            {/* FINAŁ */}
            {renderScheduleSection("Finał", "final")}
          </div>
        </>
      )}
    </main>
  );
}
