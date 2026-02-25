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
  // setup | groups | bracket | summary
  const [selectedTeams, setSelectedTeams] = useState([]);
  const groupA = tournament.teams.filter((t) => t.group === "A");
  const groupB = tournament.teams.filter((t) => t.group === "B");

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
    <div key={match.id} className="admin-match-card results-section">
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
                                idx === i ? { ...s, a: e.target.value } : s
                              ),
                            }
                          : m
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
                                idx === i ? { ...s, b: e.target.value } : s
                              ),
                            }
                          : m
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
                m.id === match.id ? { ...m, finished: true } : m
              )
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
              )
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
                        t.id === team.id ? { ...t, name: e.target.value } : t
                      );
                      setTournament({ ...tournament, teams: updated });
                    }}
                    className="admin-input"
                  />

                  <select
                    value={team.group || ""}
                    onChange={(e) => {
                      const updated = tournament.teams.map((t) =>
                        t.id === team.id ? { ...t, group: e.target.value } : t
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

      {/* ===== FAZA GRUPOWA ===== */}
      {adminView === "groups" && (
        <>
          {/* <div className="admin-card"> */}
          <h4 className="results-title">WYNIKI</h4>
          {/* </div> */}
          {sortedSchedule.filter((m) => m.type === "group").map(renderMatch)}
        </>
      )}

      {/* ===== DRABINKA ===== */}
      {adminView === "bracket" && (
        <>
          <div className="admin-card">
            <h4 className="results-title">WYNIKI</h4>
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
              ["placement", "semifinal", "thirdPlace", "final"].includes(m.type)
            )
            .map(renderMatch)}
        </>
      )}
    </main>
  );
}
