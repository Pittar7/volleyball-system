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
  const [data, setData] = useState(null);
  const tournament = data?.tournament || { teams: [] };
  const schedule = data?.schedule || [];
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
    "DKWOC",
    "CWSD SZ i JDC „A”",
    "RCI KRAKÓW",
    "RCI OLSZTYN",
    "RCI GDYNIA",
    "RCI WROCŁAW",
    "RCI WARSZAWA",
    "JDC „C”",
    "JWD",
    "RCI BYDGOSZCZ",
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
    console.log("SAVE DATA:", { tournament, schedule });

    const res = await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournament, schedule }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("SAVE ERROR:", text);
      alert("Błąd zapisu");
      return;
    }

    const json = await res.json();
    console.log("SAVE RESPONSE:", json);

    alert("Turniej zapisany");
  };

  const loadTournament = async () => {
    try {
      const res = await fetch("/api/tournament");
      const json = await res.json();

      if (!json) {
        alert("Brak zapisanych danych turnieju");
        return;
      }

      setData(json);
    } catch (err) {
      console.error("Błąd wczytywania", err);
    }
  };
  const logout = async () => {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location = "/admin/login";
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
      logos: [],
      seed: index + 1,
    }));

    setData({
      ...data,
      tournament: {
        ...tournament,
        teams,
      },
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

    // const sortedA = [...groupA].sort((a, b) => a.seed - b.seed);
    // const sortedB = [...groupB].sort((a, b) => a.seed - b.seed);

    const sortedA = [...groupA]
      .sort((a, b) => a.seed - b.seed)
      .map((t, i) => ({ ...t, seed: i + 1 }));

    const sortedB = [...groupB]
      .sort((a, b) => a.seed - b.seed)
      .map((t, i) => ({ ...t, seed: i + 1 }));

    console.log(
      "GROUP A INPUT",
      sortedA.map((t) => ({
        name: t.name,
        seed: t.seed,
      })),
    );

    console.log(
      "GROUP B INPUT",
      sortedB.map((t) => ({
        name: t.name,
        seed: t.seed,
      })),
    );

    // sortedA.forEach((t, i) => (t.seed = i + 1));
    // sortedB.forEach((t, i) => (t.seed = i + 1));

    const groupAMatches = generateGroupMatches(sortedA, "A");
    const groupBMatches = generateGroupMatches(sortedB, "B");

    const scheduled = generateSchedule(groupAMatches, groupBMatches);

    // ❗ usuwamy stare mecze grupowe

    setData({
      ...data,
      schedule: scheduled,
    });
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
        status: "planned",
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
        status: "planned",
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

    setData({
      ...data,
      schedule: [...schedule, ...newMatches],
    });
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
      court: "C",
      status: "planned",
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
      status: "planned",
      label: "Mecz o 3 miejsce",
      teamA: loser1,
      teamB: loser2,
      sets: Array(5).fill({ a: "", b: "" }),
      finished: false,
    };

    const cleaned = schedule.filter(
      (m) => m.type !== "final" && m.type !== "thirdPlace",
    );

    setData({
      ...data,
      schedule: [...cleaned, thirdPlace, finalMatch],
    });
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
        status: "planned",
        label,
        order: nextOrder++,
        court: "A",

        teamA: tableA[index],
        teamB: tableB[index],
        sets: Array(3).fill({ a: "", b: "" }),
        finished: false,
      });
    });

    setData({
      ...data,
      schedule: updated,
    });
  };
  // Funkcja przesuwania meczów w terminarzu
  const moveMatchUp = (index) => {
    if (index === 0) return;

    const updated = [...sortedSchedule];

    const temp = updated[index - 1].order;
    updated[index - 1].order = updated[index].order;
    updated[index].order = temp;

    setData({
      ...data,
      schedule: updated,
    });
  };

  const moveMatchDown = (index) => {
    if (index === sortedSchedule.length - 1) return;

    const updated = [...sortedSchedule];

    const temp = updated[index + 1].order;
    updated[index + 1].order = updated[index].order;
    updated[index].order = temp;

    setData({
      ...data,
      schedule: updated,
    });
  };

  // ==============================
  // RENDER MECZU
  // ==============================
  const renderMatch = (match) => {
    const isCurrent = currentMatches.some((m) => m.id === match.id);

    return (
      <div key={match.id} className="admin-match-card results-section">
        {match.label && <div className="match-badge">{match.label}</div>}

        <div className="match-header">
          {match.label && <span className="match-label">{match.label}</span>}
          {match.teamA.name} vs {match.teamB.name}
          <span
            className={`match-status ${
              match.finished ? "finished" : isCurrent ? "live" : "planned"
            }`}
          >
            {match.finished
              ? "Zakończony"
              : isCurrent
                ? "W trakcie"
                : "Zaplanowany"}
          </span>
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
                        setData({
                          ...data,
                          schedule: updated,
                        });
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
                        setData({
                          ...data,
                          schedule: updated,
                        });
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
                  m.id === match.id
                    ? { ...m, finished: true, status: "finished" }
                    : m,
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
  };

  //funkcja pomocnicza do renderowania sekcji meczów
  const renderScheduleSection = (title, type) => {
    const matches = sortedSchedule.filter((m) => m.type === type);
    if (!matches.length) return null;
    // W schedule-list, DODAJ między group a placement:

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
                {match.type === "group" && (
                  <span className="schedule-group-tag">
                    (Grupa {match.group})
                  </span>
                )}
                <span
                  className={`schedule-status ${match.status || "planned"}`}
                >
                  {match.status === "live"
                    ? "W trakcie"
                    : match.status === "finished"
                      ? "Zakończony"
                      : "Zaplanowany"}
                </span>
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
              <select
                value={match.court}
                onChange={(e) => {
                  const updated = schedule.map((m) =>
                    m.id === match.id ? { ...m, court: e.target.value } : m,
                  );
                  setData({
                    ...data,
                    schedule: updated,
                  });
                }}
                className="court-select"
              >
                <option value="A">Boisko A</option>
                <option value="B">Boisko B</option>
                <option value="C">Centralne</option>
              </select>
              <select
                value={match.status || "planned"}
                onChange={(e) => {
                  const updated = schedule.map((m) =>
                    m.id === match.id ? { ...m, status: e.target.value } : m,
                  );
                  setData({
                    ...data,
                    schedule: updated,
                  });
                }}
                className="status-select"
              >
                <option value="planned">Zaplanowany</option>
                <option value="live">W trakcie</option>
                <option value="finished">Zakończony</option>
              </select>
            </div>
          );
        })}
      </div>
    );
  };
  const renderGroupTable = (teams, groupName) => {
    const matches = schedule.filter(
      (m) => m.type === "group" && m.group === groupName,
    );

    let table = calculateTable(teams, matches);

    // jeśli brak wyników → sortuj po seed
    const hasResults = matches.some((m) => m.finished);

    if (!hasResults) {
      table = [...teams].sort((a, b) => a.seed - b.seed);
    }

    return (
      <table className="admin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Drużyna</th>
            <th>M</th>
            <th>Pkt</th>
            <th>Sety</th>
          </tr>
        </thead>
        <tbody>
          {table.map((team, index) => {
            const isLive = currentMatches.some(
              (m) => m.teamA.id === team.id || m.teamB.id === team.id,
            );

            return (
              <tr
                key={team.id}
                className={`
          ${index < 2 ? "top-team" : ""}
          ${isLive ? " team-live" : ""}
        `}
              >
                <td>{index + 1}</td>
                <td>{team.name}</td>
                <td>{team.played}</td>
                <td>{team.points}</td>
                <td>
                  {team.setsWon}:{team.setsLost}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };
  // ==============================
  // AKTUALNE MECZE (2 BOISKA)
  // ==============================
  const getCurrentMatches = () => {
    const unfinished = sortedSchedule
      .filter((m) => !m.finished)
      .sort((a, b) => a.order - b.order);

    return unfinished.slice(0, 2);
  };

  const currentMatches = getCurrentMatches();
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
          <button onClick={logout} className="admin-logout">
            🚪 Wyloguj
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
          onClick={() => setAdminView("announcements")}
          className={adminView === "announcements" ? "active" : ""}
        >
          Harmonogram
        </button>
        <button
          onClick={() => setAdminView("summary")}
          className={adminView === "summary" ? "active" : ""}
        >
          Podsumowanie
        </button>
      </div>
      {/*harmonogram */}
      {adminView === "announcements" && (
        <div className="admin-card">
          <h3 className="section-title">Komunikaty organizatora</h3>

          <textarea
            className="announcement-editor"
            value={tournament.announcements || ""}
            onChange={(e) =>
              setData({
                ...data,
                tournament: {
                  ...tournament,
                  announcements: e.target.value,
                },
              })
            }
            placeholder={`Np.

21.06 – Faza grupowa
Mecze od 9:00

22.06 – Półfinały
14:00

23.06 – Finał
16:00`}
          />
        </div>
      )}
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
                      setData({
                        ...data,
                        tournament: {
                          ...tournament,
                          teams: updated,
                        },
                      });
                    }}
                    className="admin-input"
                  />
                  <select
                    value={team.logos?.[0] || ""}
                    onChange={(e) => {
                      const updated = tournament.teams.map((t) =>
                        t.id === team.id
                          ? {
                              ...t,
                              logos: [e.target.value, t.logos?.[1] || ""],
                            }
                          : t,
                      );

                      setData({
                        ...data,
                        tournament: {
                          ...tournament,
                          teams: updated,
                        },
                      });
                    }}
                    className="admin-select"
                  >
                    <option value="">Logo 1</option>
                    <option value="/logos/CWSD.png">CSWD</option>
                    <option value="/logos/CZC SZ.png">CZC SZ</option>
                    <option value="/logos/DKWOC.png">DKWOC</option>
                    <option value="/logos/JDC A.png">JDC A</option>
                    <option value="/logos/JDC B.png">JDC B</option>
                    <option value="/logos/JDC C.png">JDC C</option>
                    <option value="/logos/JWD.png">JWD</option>
                    <option value="/logos/RCI Bydgoszcz.png">
                      RCI Bydgoszcz
                    </option>
                    <option value="/logos/RCI Gdynia.png">RCI Gdynia</option>
                    <option value="/logos/RCI Krakow.png">RCI Kraków</option>
                    <option value="/logos/RCI Olsztyn.png">RCI Olsztyn</option>
                    <option value="/logos/RCI Warszawa.png">
                      RCI Warszawa
                    </option>
                    <option value="/logos/RCI Wroclaw.png">RCI Wrocław</option>
                  </select>
                  <select
                    value={team.logos?.[1] || ""}
                    onChange={(e) => {
                      const updated = tournament.teams.map((t) =>
                        t.id === team.id
                          ? {
                              ...t,
                              logos: [t.logos?.[0] || "", e.target.value],
                            }
                          : t,
                      );

                      setData({
                        ...data,
                        tournament: {
                          ...tournament,
                          teams: updated,
                        },
                      });
                    }}
                    className="admin-select"
                  >
                    <option value="">Logo 2</option>
                    <option value="/logos/CWSD.png">CSWD</option>
                    <option value="/logos/CZC SZ.png">CZC SZ</option>
                    <option value="/logos/DKWOC.png">DKWOC</option>
                    <option value="/logos/JDC A.png">JDC A</option>
                    <option value="/logos/JDC B.png">JDC B</option>
                    <option value="/logos/JDC C.png">JDC C</option>
                    <option value="/logos/JWD.png">JWD</option>
                    <option value="/logos/RCI Bydgoszcz.png">
                      RCI Bydgoszcz
                    </option>
                    <option value="/logos/RCI Gdynia.png">RCI Gdynia</option>
                    <option value="/logos/RCI Krakow.png">RCI Kraków</option>
                    <option value="/logos/RCI Olsztyn.png">RCI Olsztyn</option>
                    <option value="/logos/RCI Warszawa.png">
                      RCI Warszawa
                    </option>
                    <option value="/logos/RCI Wroclaw.png">RCI Wrocław</option>
                  </select>
                  <div className="team-logo-preview">
                    {team.logos?.map((logo, i) =>
                      logo ? (
                        <img
                          key={i}
                          src={logo}
                          className="admin-logo-preview"
                        />
                      ) : null,
                    )}
                  </div>
                  <select
                    value={team.group || ""}
                    onChange={(e) => {
                      const updated = tournament.teams.map((t) =>
                        t.id === team.id ? { ...t, group: e.target.value } : t,
                      );
                      setData({
                        ...data,
                        tournament: {
                          ...tournament,
                          teams: updated,
                        },
                      });
                    }}
                    className="admin-select"
                  >
                    <option value="">-- wybierz --</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </div>
              ))}
              <button className="admin-btn admin-btn-secondary">
                Zatwierdź drużyny
              </button>
            </div>
          )}
        </div>
      )}
      {adminView === "setup" && groupA.length > 0 && (
        <div className="seed-section">
          <h3 className="section-title">Kolejność w grupach</h3>

          <div className="groups-grid">
            {/* GRUPA A */}
            <div>
              <h4>Grupa A</h4>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Drużyna</th>
                    <th>Kolejność</th>
                  </tr>
                </thead>

                <tbody>
                  {[...groupA]
                    .sort((a, b) => a.seed - b.seed)
                    .map((team) => (
                      <tr key={team.id}>
                        <td>{team.seed}</td>

                        <td>{team.name}</td>

                        <td>
                          <input
                            type="number"
                            value={team.seed ?? ""}
                            min="1"
                            onChange={(e) => {
                              const updated = tournament.teams.map((t) =>
                                t.id === team.id
                                  ? { ...t, seed: Number(e.target.value) }
                                  : t,
                              );

                              setData({
                                ...data,
                                tournament: {
                                  ...tournament,
                                  teams: updated,
                                },
                              });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* GRUPA B */}
            <div>
              <h4>Grupa B</h4>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Drużyna</th>
                    <th>Kolejność</th>
                  </tr>
                </thead>

                <tbody>
                  {groupB
                    .sort((a, b) => a.seed - b.seed)
                    .map((team) => (
                      <tr key={team.id}>
                        <td>{team.seed}</td>

                        <td>{team.name}</td>

                        <td>
                          <input
                            type="number"
                            value={team.seed ?? ""}
                            min="1"
                            onChange={(e) => {
                              const updated = tournament.teams.map((t) =>
                                t.id === team.id
                                  ? { ...t, seed: Number(e.target.value) }
                                  : t,
                              );

                              setData({
                                ...data,
                                tournament: {
                                  ...tournament,
                                  teams: updated,
                                },
                              });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="seed-actions">
            <button
              onClick={confirmGroups}
              className="admin-btn admin-btn-primary"
            >
              Generuj mecze fazy grupowej
            </button>
          </div>
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
          <div className="schedule-layout">
            {/* LEWA STRONA — TERMINARZ */}
            <div className="schedule-main">
              <h4 className="results-title text-center">TERMINARZ</h4>

              <div className="schedule-list">
                {renderScheduleSection("Faza grupowa", "group")}

                {renderScheduleSection("Półfinały", "semifinal")}
                {renderScheduleSection("Mecze o miejsca", "placement")}
                {renderScheduleSection("Mecz o 3 miejsce", "thirdPlace")}
                {renderScheduleSection("Finał", "final")}
              </div>
            </div>

            {/* PRAWA STRONA — TABELE GRUP */}
            <div className="schedule-side">
              <h4 className="results-title text-center">TABELE GRUP</h4>

              <div className="group-preview">
                <h5>Grupa A</h5>
                {renderGroupTable(groupA, "A")}
              </div>

              <div className="group-preview">
                <h5>Grupa B</h5>
                {renderGroupTable(groupB, "B")}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
