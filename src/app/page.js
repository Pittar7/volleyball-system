"use client";

import { useEffect, useState } from "react";
import MatchMatrix from "@/components/MatchMatrix";
import "./styles/player.css";

export default function HomePage() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("table");
  const [scheduleView, setScheduleView] = useState("groups");
  const [tableView, setTableView] = useState("groups");
  // groups | matches | main

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

  const { tournament, schedule = [] } = data;

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

  const getMatchWinner = (match) => {
    const { setsA, setsB } = calculateSetsScore(match);
    return setsA > setsB ? match.teamA : match.teamB;
  };

  const calculateGroupTable = (teams, matches) => {
    const table = teams.map((team) => ({
      id: team.id,
      name: team.name,
      logo: team.logo,
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
    schedule.filter(
      (m) => m.type === "group" && groupA.some((t) => t.id === m.teamA.id),
    ),
  );

  const tableB = calculateGroupTable(
    groupB,
    schedule.filter(
      (m) => m.type === "group" && groupB.some((t) => t.id === m.teamA.id),
    ),
  );

  const generateFinalRanking = () => {
    let ranking = [];

    // ===== 1–2 miejsce (Finał) =====
    const finalMatch = schedule.find((m) => m.type === "final" && m.finished);

    if (finalMatch) {
      const winner = getMatchWinner(finalMatch);
      const loser =
        winner.id === finalMatch.teamA.id ? finalMatch.teamB : finalMatch.teamA;

      ranking.push({ place: 1, team: winner });
      ranking.push({ place: 2, team: loser });
    }

    // ===== 3–4 miejsce =====
    const thirdPlaceMatch = schedule.find(
      (m) => m.type === "thirdPlace" && m.finished,
    );

    if (thirdPlaceMatch) {
      const winner = getMatchWinner(thirdPlaceMatch);
      const loser =
        winner.id === thirdPlaceMatch.teamA.id
          ? thirdPlaceMatch.teamB
          : thirdPlaceMatch.teamA;

      ranking.push({ place: 3, team: winner });
      ranking.push({ place: 4, team: loser });
    }

    // ===== MECZE O MIEJSCA =====
    const placementMatches = schedule.filter(
      (m) => m.type === "placement" && m.finished,
    );

    placementMatches.forEach((match) => {
      const winner = getMatchWinner(match);
      const loser = winner.id === match.teamA.id ? match.teamB : match.teamA;

      const placeNumber = parseInt(match.label.match(/\d+/)[0]);

      ranking.push({ place: placeNumber, team: winner });
      ranking.push({ place: placeNumber + 1, team: loser });
    });

    // ===== SORTOWANIE =====
    ranking = ranking.sort((a, b) => a.place - b.place);

    return ranking;
  };

  const ranking = generateFinalRanking();

  const renderMatchRow = (match) => {
    const { setsA, setsB } = calculateSetsScore(match);

    const unfinished = schedule
      .filter((m) => !m.finished)
      .sort((a, b) => a.order - b.order);

    const currentMatches = unfinished.slice(0, 2);
    const isCurrent = currentMatches.some((m) => m.id === match.id);
    const isFinished = match.finished;

    return (
      <tr
        key={match.id}
        className={
          isCurrent ? "match-live" : isFinished ? "match-finished" : ""
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
          {isCurrent && <span className="status-live">W TRAKCIE</span>}
          {isFinished && <span className="status-finished">Zakończony</span>}
          {!isFinished && !isCurrent && <span>Zaplanowany</span>}
        </td>
      </tr>
    );
  };

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
      {activeTab === "table" && (
        <div className="player-card">
          <h2 className="section-title text-center">Tabela turnieju</h2>

          {/* ===== PODZAKŁADKI ===== */}
          <div className="sub-tabs">
            <button
              onClick={() => setTableView("groups")}
              className={tableView === "groups" ? "sub-active" : ""}
            >
              Grupy
            </button>

            <button
              onClick={() => setTableView("matches")}
              className={tableView === "matches" ? "sub-active" : ""}
            >
              Mecze
            </button>

            <button
              onClick={() => setTableView("main")}
              className={tableView === "main" ? "sub-active" : ""}
            >
              Główna
            </button>
          </div>

          {/* ===== GRUPY ===== */}
          {tableView === "groups" && (
            <div className="groups-wrapper">
              {/* GRUPA A */}
              <div>
                <h3 className="section-title">Grupa A</h3>
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
                    {tableA.map((team) => {
                      const diff = team.smallPointsWon - team.smallPointsLost;
                      const sign = diff > 0 ? "+" : "";

                      return (
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
                            <span
                              className={
                                diff > 0
                                  ? "diff-plus"
                                  : diff < 0
                                    ? "diff-minus"
                                    : ""
                              }
                            >
                              {" "}
                              ({sign}
                              {diff})
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* GRUPA B */}
              <div>
                <h3 className="section-title">Grupa B</h3>
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
                    {tableB.map((team) => {
                      const diff = team.smallPointsWon - team.smallPointsLost;
                      const sign = diff > 0 ? "+" : "";

                      return (
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
                            <span
                              className={
                                diff > 0
                                  ? "diff-plus"
                                  : diff < 0
                                    ? "diff-minus"
                                    : ""
                              }
                            >
                              {" "}
                              ({sign}
                              {diff})
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== MACIERZ MECZÓW ===== */}
          {tableView === "matches" && (
            <div className="space-y-8">
              <div>
                <h3 className="section-title">Grupa A</h3>
                <MatchMatrix
                  teams={groupA}
                  matches={schedule.filter(
                    (m) =>
                      m.type === "group" &&
                      groupA.some((t) => t.id === m.teamA.id),
                  )}
                  mode="mobile"
                />
              </div>

              <div>
                <h3 className="section-title">Grupa B</h3>
                <MatchMatrix
                  teams={groupB}
                  matches={schedule.filter(
                    (m) =>
                      m.type === "group" &&
                      groupB.some((t) => t.id === m.teamA.id),
                  )}
                  mode="mobile"
                />
              </div>
            </div>
          )}

          {/* ===== KLASYFIKACJA KOŃCOWA ===== */}
          {tableView === "main" && (
            <div className="final-ranking-wrapper">
              <h3 className="section-title text-center">
                Klasyfikacja końcowa
              </h3>

              <div className="ranking-table-container">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th>Miejsce</th>
                      <th>Drużyna</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {ranking.map((row) => (
                      <tr
                        key={row.place}
                        className={
                          row.place === 1
                            ? "rank-gold"
                            : row.place === 2
                              ? "rank-silver"
                              : row.place === 3
                                ? "rank-bronze"
                                : ""
                        }
                      >
                        <td className="rank-place">{row.place}.</td>

                        <td className="ranking-team">
                          {(() => {
                            const fullTeam = getTeamById(row.team.id);

                            if (fullTeam?.logo) {
                              return (
                                <img
                                  src={fullTeam.logo}
                                  alt={fullTeam.name}
                                  className={
                                    row.place <= 3
                                      ? "ranking-logo-big"
                                      : "ranking-logo"
                                  }
                                />
                              );
                            }

                            return (
                              <div className="ranking-logo-placeholder">?</div>
                            );
                          })()}

                          <span className="ranking-team-name">
                            {getTeamById(row.team.id)?.name}
                          </span>
                        </td>

                        <td className="rank-medal">
                          {row.place === 1 && "🥇"}
                          {row.place === 2 && "🥈"}
                          {row.place === 3 && "🥉"}
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
      {activeTab === "schedule" && (
        <div className="player-card">
          <h2 className="section-title text-center">Harmonogram turnieju</h2>

          <div className="sub-tabs">
            <button
              onClick={() => setScheduleView("groups")}
              className={scheduleView === "groups" ? "sub-active" : ""}
            >
              Grupy
            </button>

            <button
              onClick={() => setScheduleView("bracket")}
              className={scheduleView === "bracket" ? "sub-active" : ""}
            >
              Drabinka
            </button>
          </div>

          {scheduleView === "groups" && (
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
                  .filter((m) => m.type === "group")
                  .sort((a, b) => a.order - b.order)
                  .map(renderMatchRow)}
              </tbody>
            </table>
          )}

          {scheduleView === "bracket" && (
            <>
              {["placement", "semifinal", "thirdPlace", "final"].map((type) => {
                const matches = schedule
                  .filter((m) => m.type === type)
                  .sort((a, b) => a.order - b.order);

                if (!matches.length) return null;

                return (
                  <div key={type} className="bracket-section">
                    <h3 className="section-title">
                      {type === "placement"
                        ? "Mecze o miejsca"
                        : type === "semifinal"
                          ? "Półfinały"
                          : type === "thirdPlace"
                            ? "Mecz o 3 miejsce"
                            : "Finał"}
                    </h3>

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
                      <tbody>{matches.map(renderMatchRow)}</tbody>
                    </table>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </main>
  );
}
