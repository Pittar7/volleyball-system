"use client";

import { useEffect, useState } from "react";
import MatchMatrix from "@/components/MatchMatrix";
import "./styles/player.css";
import { calculateTable } from "@/lib/tournamentLogic";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";
export default function HomePage() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("table");
  const [scheduleView, setScheduleView] = useState("groups");
  const [tableView, setTableView] = useState("groups");
  // groups | matches | main
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth <= 900);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);
  }, []);
  const fetchData = async () => {
    try {
      const res = await fetch("/api/tournament");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Błąd pobierania danych", err);
    }
  };
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("tournament-live")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tournament",
        },
        (payload) => {
          setData(payload.new.data);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  if (!data) return <div className="player-page">Ładowanie...</div>;

  const tournament = data?.tournament || { teams: [] };
  const schedule = data?.schedule || [];

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

  const tableA = calculateTable(
    groupA,
    schedule.filter(
      (m) => m.type === "group" && groupA.some((t) => t.id === m.teamA.id),
    ),
  );

  const tableB = calculateTable(
    groupB,
    schedule.filter(
      (m) => m.type === "group" && groupB.some((t) => t.id === m.teamA.id),
    ),
  );
  const bracketGenerated = schedule.some((m) =>
    ["semifinal", "placement", "thirdPlace", "final"].includes(m.type),
  );

  const liveBracket = {
    semifinals: [
      { teamA: tableA[0], teamB: tableB[1] },
      { teamA: tableB[0], teamB: tableA[1] },
    ],
    place5: { teamA: tableA[2], teamB: tableB[2] },
    place7: { teamA: tableA[3], teamB: tableB[3] },
    place9: { teamA: tableA[4], teamB: tableB[4] },
  };
  const finalMatchFinished = schedule.some(
    (m) => m.type === "final" && m.finished,
  );
  const generateFinalRanking = () => {
    let ranking = [];
    if (!finalMatchFinished) {
      // ranking tymczasowy na podstawie tabel grupowych

      const combined = [...tableA, ...tableB]
        .map((team) => ({
          ...team,
          setRatio:
            team.setsLost === 0 ? team.setsWon : team.setsWon / team.setsLost,
          smallPointRatio:
            team.smallPointsLost === 0
              ? team.smallPointsWon
              : team.smallPointsWon / team.smallPointsLost,
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.setRatio !== a.setRatio) return b.setRatio - a.setRatio;
          return b.smallPointRatio - a.smallPointRatio;
        });

      return combined.map((team, index) => ({
        place: index + 1,
        team,
        played: team.played,
      }));
    }
    const finalMatch = schedule.find((m) => m.type === "final" && m.finished);

    // 🔹 JEŚLI FINAŁ ROZEGRANY → normalna klasyfikacja
    if (finalMatch) {
      const winner = getMatchWinner(finalMatch);
      const loser =
        winner.id === finalMatch.teamA.id ? finalMatch.teamB : finalMatch.teamA;

      ranking.push({ place: 1, team: winner });
      ranking.push({ place: 2, team: loser });

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

      return ranking.sort((a, b) => a.place - b.place);
    }

    // 🔹 JEŚLI TURNIEJ W TRAKCIE → ranking tymczasowy z tabel grup
    const combined = [...tableA, ...tableB];

    return combined.map((team, index) => ({
      place: index + 1,
      team,
      provisional: true,
    }));
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

    const hasStarted = match.sets.some((s) => s.a !== "" || s.b !== "");

    return (
      <tr
        key={match.id}
        className={`
        ${isCurrent ? "match-live-row" : ""}
        ${isFinished ? "match-finished-row" : ""}
      `}
      >
        <td className="court-cell">{match.court}</td>

        <td className="team-cell">
          <div className="team-logos">
            {getTeamById(match.teamA.id)?.logos?.map((logo, i) =>
              logo ? <img key={i} src={logo} className="team-logo" /> : null,
            )}
          </div>
          <span>{match.teamA.name}</span>
        </td>

        <td className="score-cell">
          {isFinished ? (
            <span className="score-final">
              {setsA} : {setsB}
            </span>
          ) : hasStarted ? (
            <span className="score-live">
              {setsA} : {setsB}
            </span>
          ) : (
            <span className="score-pending">— : —</span>
          )}
        </td>

        <td className="team-cell">
          <div className="team-logos">
            {getTeamById(match.teamB.id)?.logos?.map((logo, i) =>
              logo ? <img key={i} src={logo} className="team-logo" /> : null,
            )}
          </div>
          <span>{match.teamB.name}</span>
        </td>

        <td className="status-cell">
          {match.status === "live" && (
            <span className="status-badge live">🔴 W trakcie</span>
          )}

          {match.status === "finished" && (
            <span className="status-badge finished">Zakończony</span>
          )}

          {(match.status === "planned" || !match.status) && (
            <span className="status-badge planned">Zaplanowany</span>
          )}
        </td>
      </tr>
    );
  };
  const sortedSchedule = [...schedule].sort((a, b) => a.order - b.order);

  const liveMatches = sortedSchedule.filter((m) => m.status === "live");

  const plannedMatches = sortedSchedule.filter(
    (m) => m.status === "planned" || !m.status,
  );

  let tickerMatches = [...liveMatches];

  if (tickerMatches.length < 2) {
    const remaining = 2 - tickerMatches.length;

    const nextPlanned = plannedMatches
      .filter((m) => !liveMatches.some((l) => l.id === m.id))
      .slice(0, remaining);

    tickerMatches = [...tickerMatches, ...nextPlanned];
  }

  return (
    <main className="player-page">
      <div className="live-ticker">
        <div className="live-ticker">
          <div className="live-ticker-track">
            {(isMobile
              ? [...tickerMatches, ...tickerMatches]
              : tickerMatches
            ).map((match, i) => (
              <div key={i} className="ticker-match">
                <span className="ticker-court">Boisko {match.court}</span>

                <div className="ticker-team">
                  {getTeamById(match.teamA.id)?.logos?.map((logo, i) =>
                    logo ? (
                      <img key={i} src={logo} className="ticker-logo" />
                    ) : null,
                  )}
                  <span>{match.teamA.name}</span>
                </div>

                <span className="ticker-vs">vs</span>

                <div className="ticker-team">
                  {getTeamById(match.teamB.id)?.logos?.map((logo, i) =>
                    logo ? (
                      <img key={i} src={logo} className="ticker-logo" />
                    ) : null,
                  )}
                  <span>{match.teamB.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="background-logo"
        style={{
          backgroundImage: "url('./logos/logo-turnieju.jpg')",
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
        <button
          onClick={() => setActiveTab("announcements")}
          className={`tab-button ${activeTab === "announcements" ? "active" : ""}`}
        >
          Harmonogram
        </button>
      </div>

      {/*harmonogram*/}
      {activeTab === "announcements" && (
        <div className="player-card">
          <h2 className="section-title text-center">Harmonogram turnieju</h2>

          <div className="announcement-board">
            <ReactMarkdown>
              {tournament.announcements || "Brak komunikatów"}
            </ReactMarkdown>
          </div>
        </div>
      )}
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
                            <div className="team-with-logo">
                              <div className="team-logos">
                                {(getTeamById(team.id)?.logos || [])
                                  .filter(
                                    (logo) =>
                                      typeof logo === "string" &&
                                      logo.trim() !== "",
                                  )
                                  .map((logo, i) => (
                                    <img
                                      key={i}
                                      src={logo}
                                      className="team-logo"
                                      alt="logo"
                                    />
                                  ))}
                              </div>

                              <span className="team-name">{team.name}</span>
                            </div>
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
                            <div className="team-with-logo">
                              <div className="team-logos">
                                {(getTeamById(team.id)?.logos || [])
                                  .filter(
                                    (logo) =>
                                      typeof logo === "string" &&
                                      logo.trim() !== "",
                                  )
                                  .map((logo, i) => (
                                    <img
                                      key={i}
                                      src={logo}
                                      className="team-logo"
                                      alt="logo"
                                    />
                                  ))}
                              </div>

                              <span className="team-name">{team.name}</span>
                            </div>
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
                      {!finalMatchFinished && <th>M</th>}
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {ranking.map((row) => (
                      <tr
                        key={row.place}
                        className={
                          finalMatchFinished
                            ? row.place === 1
                              ? "rank-gold"
                              : row.place === 2
                                ? "rank-silver"
                                : row.place === 3
                                  ? "rank-bronze"
                                  : ""
                            : ""
                        }
                      >
                        <td className="rank-place">{row.place}.</td>

                        <td className="ranking-team">
                          {(() => {
                            const fullTeam = getTeamById(row.team.id);

                            return (
                              <div className="ranking-team">
                                <div className="team-logos">
                                  {fullTeam?.logos
                                    ?.filter((logo) => logo)
                                    .map((logo, i) => (
                                      <img
                                        key={i}
                                        src={logo}
                                        className={
                                          row.place <= 3
                                            ? "ranking-logo-big"
                                            : "ranking-logo"
                                        }
                                      />
                                    ))}
                                </div>

                                <span className="ranking-team-name">
                                  {fullTeam?.name || row.team.name}
                                </span>
                              </div>
                            );
                          })()}

                          {/* <span className="ranking-team-name">
                            {getTeamById(row.team.id)?.name}
                          </span> */}
                        </td>
                        {!finalMatchFinished && (
                          <td className="ranking-played">{row.played}</td>
                        )}
                        <td className="rank-medal">
                          {finalMatchFinished && row.place === 1 && "🥇"}
                          {finalMatchFinished && row.place === 2 && "🥈"}
                          {finalMatchFinished && row.place === 3 && "🥉"}
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
          {!bracketGenerated && scheduleView === "bracket" && (
            <div className="bracket-preview">
              <div className="live-bracket-note">
                🔴 Prognoza na podstawie aktualnej tabeli
              </div>

              {/* PÓŁFINAŁY */}
              <div className="live-bracket-section">
                <h4>Półfinały</h4>

                {liveBracket.semifinals.map((match, i) => (
                  <div className="live-bracket-match">
                    <div className="team-with-logo">
                      <div className="team-logos">
                        {getTeamById(match.teamA?.id)?.logos?.map((logo, i) =>
                          logo ? (
                            <img key={i} src={logo} className="team-logo" />
                          ) : null,
                        )}
                      </div>
                      <span>{match.teamA?.name || "—"}</span>
                    </div>

                    <span className="live-vs">vs</span>

                    <div className="team-with-logo">
                      <div className="team-logos">
                        {getTeamById(match.teamB?.id)?.logos?.map((logo, i) =>
                          logo ? (
                            <img key={i} src={logo} className="team-logo" />
                          ) : null,
                        )}
                      </div>
                      <span>{match.teamB?.name || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* MECZ O 5 */}
              {liveBracket.place5?.teamA && liveBracket.place5?.teamB && (
                <div className="live-bracket-section">
                  <h4>Mecz o 5 miejsce</h4>
                  <div className="live-bracket-match">
                    <div className="team-with-logo">
                      <div className="team-logos">
                        {getTeamById(liveBracket.place5.teamA?.id)?.logos?.map(
                          (logo, i) =>
                            logo ? (
                              <img key={i} src={logo} className="team-logo" />
                            ) : null,
                        )}
                      </div>

                      <span>{liveBracket.place5.teamA?.name}</span>
                    </div>

                    <span className="live-vs">vs</span>

                    <div className="team-with-logo">
                      <div className="team-logos">
                        {getTeamById(liveBracket.place5.teamB?.id)?.logos?.map(
                          (logo, i) =>
                            logo ? (
                              <img key={i} src={logo} className="team-logo" />
                            ) : null,
                        )}
                      </div>

                      <span>{liveBracket.place5.teamB?.name}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* MECZ O 7 */}
              {liveBracket.place7?.teamA && liveBracket.place7?.teamB && (
                <div className="live-bracket-section">
                  <h4>Mecz o 7 miejsce</h4>
                  <div className="live-bracket-match">
                    <div className="team-with-logo">
                      <div className="team-logos">
                        {getTeamById(liveBracket.place7.teamA?.id)?.logos?.map(
                          (logo, i) =>
                            logo ? (
                              <img key={i} src={logo} className="team-logo" />
                            ) : null,
                        )}
                      </div>

                      <span>{liveBracket.place7.teamA?.name}</span>
                    </div>

                    <span className="live-vs">vs</span>

                    <div className="team-with-logo">
                      <div className="team-logos">
                        {getTeamById(liveBracket.place7.teamB?.id)?.logos?.map(
                          (logo, i) =>
                            logo ? (
                              <img key={i} src={logo} className="team-logo" />
                            ) : null,
                        )}
                      </div>

                      <span>{liveBracket.place7.teamB?.name}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* MECZ O 9 */}
              {liveBracket.place9?.teamA && liveBracket.place9?.teamB && (
                <div className="live-bracket-section">
                  <h4>Mecz o 9 miejsce</h4>
                  <div className="live-bracket-match">
                    <div className="team-with-logo">
                      <div className="team-logos">
                        {getTeamById(liveBracket.place9.teamA?.id)?.logos?.map(
                          (logo, i) =>
                            logo ? (
                              <img key={i} src={logo} className="team-logo" />
                            ) : null,
                        )}
                      </div>

                      <span>{liveBracket.place9.teamA?.name}</span>
                    </div>

                    <span className="live-vs">vs</span>

                    <div className="team-with-logo">
                      <div className="team-logos">
                        {getTeamById(liveBracket.place9.teamB?.id)?.logos?.map(
                          (logo, i) =>
                            logo ? (
                              <img key={i} src={logo} className="team-logo" />
                            ) : null,
                        )}
                      </div>

                      <span>{liveBracket.place9.teamB?.name}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
