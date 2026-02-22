"use client";

import { useEffect, useState } from "react";
import MatchMatrix from "@/components/MatchMatrix";
import "./styles/player.css";

export default function HomePage() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("table");
  const [tableView, setTableView] = useState("groups");

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

    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <div className="player-page">Ładowanie...</div>;

  const { tournament, schedule = [], finalMatch, thirdPlaceMatch } = data;

  const groupA = tournament.teams.filter((t) => t.group === "A");
  const groupB = tournament.teams.filter((t) => t.group === "B");

  const getTeamById = (id) => tournament.teams.find((t) => t.id === id);

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

  const calculateGroupTable = (teams, matches) => {
    const table = teams.map((team) => ({
      id: team.id,
      name: team.name,
      logo: team.logo, // 🔥 DODANE
      played: 0,
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
        const a = parseInt(set.a);
        const b = parseInt(set.b);

        if (!isNaN(a) && !isNaN(b)) {
          teamA.smallPointsWon += a;
          teamA.smallPointsLost += b;
          teamB.smallPointsWon += b;
          teamB.smallPointsLost += a;

          if (a > b) setsA++;
          if (b > a) setsB++;
        }
      });

      teamA.played++;
      teamB.played++;

      teamA.setsWon += setsA;
      teamA.setsLost += setsB;
      teamB.setsWon += setsB;
      teamB.setsLost += setsA;

      if (setsA > setsB) {
        teamA.points += 3;
        teamB.points += 1;
      } else {
        teamB.points += 3;
        teamA.points += 1;
      }
    });

    return table.sort((a, b) => b.points - a.points);
  };

  const tableA = calculateGroupTable(
    groupA,
    schedule.filter((m) => m.group === "A"),
  );

  const tableB = calculateGroupTable(
    groupB,
    schedule.filter((m) => m.group === "B"),
  );

  const ranking = [];

  return (
    <main className="player-page">
      <div
        className="background-logo"
        style={{
          backgroundImage: "url('/logos/logo-turnieju.png')",
        }}
      />

      <div className="tabs">
        <button
          onClick={() => setActiveTab("table")}
          className={`tab-button ${activeTab === "table" ? "active" : ""}`}
        >
          Tabela
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          className={`tab-button ${activeTab === "schedule" ? "active" : ""}`}
        >
          Terminarz
        </button>
      </div>

      {/* ========================== TABELA ========================== */}
      {activeTab === "table" && (
        <div className="player-card">
          {tableView === "groups" && (
            <div className="groups-wrapper">
              {/* GRUPA A */}
              <div>
                <h2 className="section-title">Grupa A</h2>
                <table className="group-table">
                  <thead>
                    <tr>
                      <th>Drużyna</th>
                      <th>M</th>
                      <th>Pkt</th>
                      <th>Sety</th>
                      <th>Małe pkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableA.map((team) => (
                      <tr key={team.id}>
                        <td className="team-cell">
                          {team.logo && (
                            <img
                              src={team.logo}
                              alt={team.name}
                              className="team-logo"
                            />
                          )}
                          <span>{team.name}</span>
                        </td>
                        <td>{team.played}</td>
                        <td>{team.points}</td>
                        <td>
                          {team.setsWon}:{team.setsLost}
                        </td>
                        <td>
                          {team.smallPointsWon}:{team.smallPointsLost}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* GRUPA B */}
              <div>
                <h2 className="section-title">Grupa B</h2>
                <table className="group-table">
                  <thead>
                    <tr>
                      <th>Drużyna</th>
                      <th>M</th>
                      <th>Pkt</th>
                      <th>Sety</th>
                      <th>Małe pkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableB.map((team) => (
                      <tr key={team.id}>
                        <td className="team-cell">
                          {team.logo && (
                            <img
                              src={team.logo}
                              alt={team.name}
                              className="team-logo"
                            />
                          )}
                          <span>{team.name}</span>
                        </td>
                        <td>{team.played}</td>
                        <td>{team.points}</td>
                        <td>
                          {team.setsWon}:{team.setsLost}
                        </td>
                        <td>
                          {team.smallPointsWon}:{team.smallPointsLost}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================== TERMINARZ ========================== */}
      {activeTab === "schedule" && (
        <div className="player-card">
          <h2 className="section-title text-center">Harmonogram turnieju</h2>

          <table className="schedule-table">
            <thead>
              <tr>
                <th>Boisko</th>
                <th>Drużyna A</th>
                <th>Wynik</th>
                <th>Drużyna B</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {schedule
                .sort((a, b) => a.order - b.order)
                .map((match) => {
                  const { setsA, setsB } = calculateSetsScore(match);

                  const unfinished = schedule
                    .filter((m) => !m.finished)
                    .sort((a, b) => a.order - b.order);

                  const isCurrent =
                    unfinished.length > 0 && unfinished[0].id === match.id;

                  const isFinished = match.finished;

                  return (
                    <tr
                      key={match.id}
                      className={
                        isCurrent
                          ? "match-live"
                          : isFinished
                            ? "match-finished"
                            : ""
                      }
                    >
                      <td>{match.court}</td>

                      <td className="team-cell">
                        {getTeamById(match.teamA.id)?.logo && (
                          <img
                            src={getTeamById(match.teamA.id).logo}
                            alt={match.teamA.name}
                            className="team-logo"
                          />
                        )}
                        <span>{match.teamA.name}</span>
                      </td>

                      <td>{isFinished ? `${setsA} : ${setsB}` : "—"}</td>

                      <td className="team-cell">
                        {getTeamById(match.teamB.id)?.logo && (
                          <img
                            src={getTeamById(match.teamB.id).logo}
                            alt={match.teamB.name}
                            className="team-logo"
                          />
                        )}
                        <span>{match.teamB.name}</span>
                      </td>

                      <td>
                        {isCurrent && (
                          <span className="status-live">W TRAKCIE</span>
                        )}

                        {isFinished && (
                          <span className="status-finished">Zakończony</span>
                        )}

                        {!isFinished && !isCurrent && <span>Zaplanowany</span>}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
