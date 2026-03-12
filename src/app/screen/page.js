"use client";

import { useEffect, useState, Fragment } from "react";
import MatchMatrix from "@/components/MatchMatrix";
import { calculateTable } from "@/lib/tournamentLogic";
import "@/app/styles/screen.css";
import ReactMarkdown from "react-markdown";
import { QRCodeCanvas } from "qrcode.react";
function GroupTable({ table, teams }) {
  return (
    <table className="screen-group-table">
      <thead>
        <tr>
          <th>Miejsce</th>
          <th>Drużyna</th>
          <th>M</th>
          <th>Pkt</th>
          <th>Sety</th>
        </tr>
      </thead>

      <tbody>
        {table.map((team, index) => (
          <tr key={team.id}>
            <td className="table-place">{index + 1}</td>
            <td>
              <div className="team-with-logo">
                <div className="team-logos">
                  {(() => {
                    const fullTeam = teams.find((t) => t.id === team.id);

                    return fullTeam?.logos?.map((logo, i) =>
                      logo ? (
                        <img key={i} src={logo} className="team-logo" />
                      ) : null,
                    );
                  })()}
                </div>

                <span>{team.name}</span>
              </div>
            </td>
            <td>{team.played}</td>
            <td>{team.points}</td>
            <td>
              {team.setsWon}:{team.setsLost}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function LiveRanking({ tournament, schedule }) {
  const groupA = tournament.teams.filter((t) => t.group === "A");
  const groupB = tournament.teams.filter((t) => t.group === "B");

  const tableA = calculateTable(
    groupA,
    schedule.filter((m) => m.type === "group" && m.group === "A"),
  );

  const tableB = calculateTable(
    groupB,
    schedule.filter((m) => m.type === "group" && m.group === "B"),
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

  return (
    <table className="screen-ranking">
      <thead>
        <tr>
          <th>Miejsce</th>
          <th>Drużyna</th>
          <th>Pkt</th>
          <th>Liczba Meczów</th>
        </tr>
      </thead>

      <tbody>
        {combined.map((team, index) => (
          <tr key={team.id}>
            <td>{index + 1}</td>
            <td>
              <div className="team-with-logo">
                <div className="team-logos">
                  {(() => {
                    const fullTeam = tournament.teams.find(
                      (t) => t.id === team.id,
                    );

                    return fullTeam?.logos?.map((logo, i) =>
                      logo ? (
                        <img key={i} src={logo} className="team-logo" />
                      ) : null,
                    );
                  })()}
                </div>

                <span>{team.name}</span>
              </div>
            </td>
            <td>{team.points}</td>
            <td>{team.played}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ScreenPage() {
  const [data, setData] = useState(null);
  const [leftView, setLeftView] = useState(0);
  const [rightView, setRightView] = useState(0);

  const getVisibleMatches = () => {
    const finished = sortedSchedule.filter((m) => m.finished).slice(-4); // ostatnie 4 zakończone

    const upcoming = sortedSchedule.filter((m) => !m.finished).slice(0, 12); // kolejne mecze

    return [...finished, ...upcoming];
  };
  // ===== HELPER =====

  const getLiveMatches = (schedule) => {
    const unfinished = schedule
      .filter((m) => !m.finished)
      .sort((a, b) => a.order - b.order);

    return unfinished.slice(0, 2);
  };

  // ===== FETCH =====

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/tournament");
      const json = await res.json();
      setData(json);
    };

    fetchData();
    const interval = setInterval(fetchData, 15000);

    return () => clearInterval(interval);
  }, []);

  // ===== ROTACJA TELEBIMU =====

  useEffect(() => {
    const leftRotation = setInterval(() => {
      setLeftView((v) => (v + 1) % 2);
    }, 10000);

    let timer;

    const rotateRight = (view) => {
      const duration = view === 0 ? 15000 : 5000; // 👈 czas dla slajdu

      timer = setTimeout(() => {
        const next = (view + 1) % 2;
        setRightView(next);
        rotateRight(next);
      }, duration);
    };

    rotateRight(0);

    return () => {
      clearInterval(leftRotation);
      clearTimeout(timer);
    };
  }, []);

  if (!data) return null;

  // ===== DANE =====

  const tournament = data?.tournament || { teams: [] };
  const schedule = data?.schedule || [];

  const groupMatches = schedule.filter((m) => m.type === "group");

  const groupsFinished =
    groupMatches.length > 0 && groupMatches.every((m) => m.finished);

  const bracketGenerated = schedule.some((m) =>
    ["semifinal", "placement", "thirdPlace", "final"].includes(m.type),
  );
  const sortedSchedule = [...schedule].sort((a, b) => a.order - b.order);
  const visibleMatches = getVisibleMatches();

  const groupA = tournament.teams.filter((t) => t.group === "A");
  const groupB = tournament.teams.filter((t) => t.group === "B");

  const tableA = calculateTable(
    groupA,
    schedule.filter((m) => m.type === "group" && m.group === "A"),
  );

  const tableB = calculateTable(
    groupB,
    schedule.filter((m) => m.type === "group" && m.group === "B"),
  );

  const getTeamById = (id) => tournament.teams.find((t) => t.id === id);
  const liveMatches = schedule.filter(
    (m) => m.status === "live" && !m.finished,
  );

  const plannedMatches = sortedSchedule.filter(
    (m) => m.status === "planned" || !m.status,
  );

  let topBarMatches = [...liveMatches];

  if (topBarMatches.length < 2) {
    const remaining = 2 - topBarMatches.length;

    const nextPlanned = plannedMatches
      .filter((m) => !liveMatches.some((l) => l.id === m.id))
      .slice(0, remaining);

    topBarMatches = [...topBarMatches, ...nextPlanned];
  }

  // 👇 TELEBIM TERMINARZA
  const getMatchScore = (match) => {
    let a = 0;
    let b = 0;

    match.sets.forEach((s) => {
      const sa = parseInt(s.a);
      const sb = parseInt(s.b);

      if (isNaN(sa) || isNaN(sb)) return;

      if (sa > sb) a++;
      if (sb > sa) b++;
    });

    return `${a}:${b}`;
  };
  const getMatchWinner = (match) => {
    let setsA = 0;
    let setsB = 0;

    match.sets.forEach((s) => {
      const a = parseInt(s.a);
      const b = parseInt(s.b);

      if (!isNaN(a) && !isNaN(b)) {
        if (a > b) setsA++;
        if (b > a) setsB++;
      }
    });

    if (setsA > setsB) return match.teamA.id;
    if (setsB > setsA) return match.teamB.id;

    return null;
  };
  const generateLiveRanking = () => {
    const block1 = [tableA[0], tableB[0], tableA[1], tableB[1]]
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.setsWon - b.setsLost - (a.setsWon - a.setsLost),
      );

    const block2 = [tableA[2], tableB[2]]
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.setsWon - b.setsLost - (a.setsWon - a.setsLost),
      );

    const block3 = [tableA[3], tableB[3]]
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.setsWon - b.setsLost - (a.setsWon - a.setsLost),
      );

    const block4 = [tableA[4], tableB[4]].filter(Boolean);

    return [...block1, ...block2, ...block3, ...block4];
  };
  const semifinalMatches = sortedSchedule.filter((m) => m.type === "semifinal");
  const placementMatches = sortedSchedule.filter((m) => m.type === "placement");
  const thirdPlaceMatch = sortedSchedule.find((m) => m.type === "thirdPlace");
  const finalMatch = sortedSchedule.find((m) => m.type === "final");

  const liveRanking = generateLiveRanking();
  const finalFinished = finalMatch?.finished;
  const teamStillPlaying = (teamId) => {
    return schedule.some(
      (m) => !m.finished && (m.teamA?.id === teamId || m.teamB?.id === teamId),
    );
  };
  const liveBracket = {
    semifinals: [
      { teamA: tableA[0], teamB: tableB[1] },
      { teamA: tableB[0], teamB: tableA[1] },
    ],

    place5: { teamA: tableA[2], teamB: tableB[2] },
    place7: { teamA: tableA[3], teamB: tableB[3] },
    place9: { teamA: tableA[4], teamB: tableB[4] },
  };

  return (
    <>
      {topBarMatches.length > 0 && (
        <div className="screen-live-bar">
          <div className="screen-live-track">
            {[...topBarMatches, ...topBarMatches].map((match, i) => {
              const teamA = getTeamById(match.teamA?.id);
              const teamB = getTeamById(match.teamB?.id);

              return (
                <div key={`${match.id}-${i}`} className="live-match">
                  <span
                    className={`live-status ${
                      match.status === "live" ? "live" : "planned"
                    }`}
                  >
                    {match.status === "live" ? "TRWA" : "ZAPLANOWANY"}
                  </span>

                  <span className="live-court">
                    {match.court === "C"
                      ? "Boisko Centralne"
                      : `Boisko ${match.court}`}
                  </span>

                  <div className="live-team">
                    {teamA?.logos?.map((logo, i) =>
                      logo ? (
                        <img key={i} src={logo} className="live-logo" />
                      ) : null,
                    )}
                    <span>{match.teamA.name}</span>

                    {match.finished && (
                      <span className="match-score">
                        {getMatchScore(match)}
                      </span>
                    )}
                  </div>

                  <span className="live-vs">vs</span>

                  <div className="live-team">
                    {teamB?.logos?.map((logo, i) =>
                      logo ? (
                        <img key={i} src={logo} className="live-logo" />
                      ) : null,
                    )}
                    <span>{match.teamB.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="screen-container">
        <div className="screen-layout">
          {/* LEWA STRONA */}

          <div className="screen-left">
            {/* GRUPY */}
            {leftView === 0 && !groupsFinished && (
              <>
                <h2>Grupa A</h2>
                <GroupTable table={tableA} teams={tournament.teams} />

                <h2>Grupa B</h2>
                <GroupTable table={tableB} teams={tournament.teams} />
              </>
            )}

            {/* DRABINKA LUB PROGNOZA */}
            {leftView === 1 && !groupsFinished && (
              <>
                <h2>Prognoza drabinki</h2>

                <div className="bracket-preview">
                  {/* PÓŁFINAŁY */}
                  <div className="live-bracket-section">
                    <h4>Półfinały</h4>

                    {liveBracket.semifinals.map((match, i) => (
                      <div
                        key={`${match.teamA?.id}-${match.teamB?.id}`}
                        className="live-bracket-match"
                      >
                        <div className="team-with-logo">
                          <div className="team-logos">
                            {getTeamById(match.teamA?.id)?.logos?.map(
                              (logo, i) =>
                                logo ? (
                                  <img
                                    key={i}
                                    src={logo}
                                    className="team-logo"
                                  />
                                ) : null,
                            )}
                          </div>
                          <span>{match.teamA?.name || "—"}</span>
                        </div>

                        <span className="live-vs">vs</span>

                        <div className="team-with-logo">
                          <div className="team-logos">
                            {getTeamById(match.teamB?.id)?.logos?.map(
                              (logo, i) =>
                                logo ? (
                                  <img
                                    key={i}
                                    src={logo}
                                    className="team-logo"
                                  />
                                ) : null,
                            )}
                          </div>
                          <span>{match.teamB?.name || "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* MECZ O 5 */}
                  {liveBracket.place5?.teamA && (
                    <div className="live-bracket-section">
                      <h4>Mecz o 5 miejsce</h4>

                      <div className="live-bracket-match">
                        <div className="team-with-logo">
                          <div className="team-logos">
                            {getTeamById(
                              liveBracket.place5.teamA?.id,
                            )?.logos?.map((logo, i) =>
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
                            {getTeamById(
                              liveBracket.place5.teamB?.id,
                            )?.logos?.map((logo, i) =>
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
                  {liveBracket.place7?.teamA && (
                    <div className="live-bracket-section">
                      <h4>Mecz o 7 miejsce</h4>

                      <div className="live-bracket-match">
                        <div className="team-with-logo">
                          <div className="team-logos">
                            {getTeamById(
                              liveBracket.place7.teamA?.id,
                            )?.logos?.map((logo, i) =>
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
                            {getTeamById(
                              liveBracket.place7.teamB?.id,
                            )?.logos?.map((logo, i) =>
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
                  {tournament.teams.length >= 10 &&
                    liveBracket.place9?.teamA && (
                      <div className="live-bracket-section">
                        <h4>Mecz o 9 miejsce</h4>

                        <div className="live-bracket-match">
                          <div className="team-with-logo">
                            <div className="team-logos">
                              {getTeamById(
                                liveBracket.place9.teamA?.id,
                              )?.logos?.map((logo, i) =>
                                logo ? (
                                  <img
                                    key={i}
                                    src={logo}
                                    className="team-logo"
                                  />
                                ) : null,
                              )}
                            </div>
                            <span>{liveBracket.place9.teamA?.name}</span>
                          </div>

                          <span className="live-vs">vs</span>

                          <div className="team-with-logo">
                            <div className="team-logos">
                              {getTeamById(
                                liveBracket.place9.teamB?.id,
                              )?.logos?.map((logo, i) =>
                                logo ? (
                                  <img
                                    key={i}
                                    src={logo}
                                    className="team-logo"
                                  />
                                ) : null,
                              )}
                            </div>
                            <span>{liveBracket.place9.teamB?.name}</span>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </>
            )}
            {/* DRABINKA TURNIEJU */}
            {leftView === 0 && groupsFinished && (
              <>
                <h2>Drabinka turnieju</h2>

                <div className="bracket-preview">
                  {/* PÓŁFINAŁY */}
                  {semifinalMatches.length > 0 && (
                    <div className="live-bracket-section">
                      <div className="bracket-label">Półfinały</div>

                      {semifinalMatches.map((match) => (
                        <div key={match.id} className="live-bracket-match">
                          <span>{match.teamA?.name}</span>

                          <span className="live-vs">
                            {match.finished ? getMatchScore(match) : "vs"}
                          </span>

                          <span>{match.teamB?.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* MECZE O MIEJSCA */}
                  {placementMatches.map((match) => (
                    <div key={match.id} className="live-bracket-section">
                      <div className="bracket-label">{match.label}</div>

                      <div className="live-bracket-match">
                        <span>{match.teamA?.name}</span>

                        <span className="live-vs">
                          {match.finished ? getMatchScore(match) : "vs"}
                        </span>

                        <span>{match.teamB?.name}</span>
                      </div>
                    </div>
                  ))}

                  {/* MECZ O 3 */}
                  {thirdPlaceMatch && (
                    <div className="live-bracket-section">
                      <div className="bracket-label">
                        {thirdPlaceMatch.label}
                      </div>

                      <div className="live-bracket-match">
                        <span>{thirdPlaceMatch.teamA?.name}</span>

                        <span className="live-vs">
                          {thirdPlaceMatch.finished
                            ? getMatchScore(thirdPlaceMatch)
                            : "vs"}
                        </span>

                        <span>{thirdPlaceMatch.teamB?.name}</span>
                      </div>
                    </div>
                  )}

                  {/* FINAŁ */}
                  {finalMatch && (
                    <div className="live-bracket-section">
                      <div className="bracket-label">{finalMatch.label}</div>

                      <div className="live-bracket-match">
                        <span>{finalMatch.teamA?.name}</span>

                        <span className="live-vs">
                          {finalMatch.finished
                            ? getMatchScore(finalMatch)
                            : "vs"}
                        </span>

                        <span>{finalMatch.teamB?.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            {leftView === 1 && groupsFinished && (
              <>
                <h2>Klasyfikacja końcowa</h2>

                <table className="screen-ranking">
                  <thead>
                    <tr>
                      <th>Miejsce</th>
                      <th>Drużyna</th>
                    </tr>
                  </thead>

                  <tbody>
                    {liveRanking.map((team, index) => (
                      <tr
                        key={team.id}
                        className={
                          finalFinished
                            ? index === 0
                              ? "rank-gold"
                              : index === 1
                                ? "rank-silver"
                                : index === 2
                                  ? "rank-bronze"
                                  : "rank-locked"
                            : teamStillPlaying(team.id)
                              ? "rank-pending"
                              : "rank-locked"
                        }
                      >
                        <td className="rank-place">
                          {finalFinished && index === 0 && "🥇 "}
                          {finalFinished && index === 1 && "🥈 "}
                          {finalFinished && index === 2 && "🥉 "}
                          {index + 1}
                        </td>

                        <td>
                          <div className="team-with-logo">
                            <div className="team-logos">
                              {team.logos?.map((logo, i) =>
                                logo ? (
                                  <img
                                    key={i}
                                    src={logo}
                                    className="team-logo"
                                  />
                                ) : null,
                              )}
                            </div>

                            <span>{team.name}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* PRAWA STRONA */}

          <div className="screen-right">
            {rightView === 0 && (
              <>
                <h2>Terminarz</h2>

                <table className="screen-schedule">
                  <thead>
                    <tr className="schedule-head-main">
                      <th rowSpan="2">Status</th>
                      <th rowSpan="2">Boisko</th>
                      {/* <th colSpan="3">Mecz</th> */}
                      <th>Drużyna</th>
                      <th></th>
                      <th>Drużyna</th>
                    </tr>

                    {/* <tr className="schedule-head-sub">
                    <th>Drużyna</th>
                    <th></th>
                    <th>Drużyna</th>
                  </tr> */}
                  </thead>

                  <tbody>
                    {(() => {
                      let semifinalShown = false;

                      return visibleMatches.map((match) => {
                        const status = match.finished
                          ? "finished"
                          : match.status === "live"
                            ? "live"
                            : "planned";

                        const winner = match.finished
                          ? getMatchWinner(match)
                          : null;

                        return (
                          <Fragment key={match.id}>
                            {(() => {
                              if (
                                match.type === "semifinal" &&
                                !semifinalShown
                              ) {
                                semifinalShown = true;

                                return (
                                  <tr className="match-label-row">
                                    <td colSpan="5" className="match-label">
                                      Półfinały
                                    </td>
                                  </tr>
                                );
                              }

                              if (match.label) {
                                return (
                                  <tr className="match-label-row">
                                    <td colSpan="5" className="match-label">
                                      {match.label}
                                    </td>
                                  </tr>
                                );
                              }

                              return null;
                            })()}

                            <tr key={match.id}>
                              <td className={`schedule-status ${status}`}>
                                {status === "live"
                                  ? "Trwa"
                                  : status === "finished"
                                    ? "Zakończony"
                                    : "Zaplanowany"}
                              </td>

                              <td>{match.court}</td>

                              <td className="screen-team">
                                {getTeamById(match.teamA.id)?.logos?.map(
                                  (logo, i) =>
                                    logo ? (
                                      <img
                                        key={i}
                                        src={logo}
                                        className="screen-team-logo"
                                      />
                                    ) : null,
                                )}
                                <span
                                  className={
                                    winner === match.teamA.id ? "winner" : ""
                                  }
                                >
                                  {match.teamA.name}
                                </span>
                              </td>

                              <td className="match-center">
                                {match.finished ? getMatchScore(match) : "vs"}
                              </td>

                              <td className="screen-team">
                                {getTeamById(match.teamB.id)?.logos?.map(
                                  (logo, i) =>
                                    logo ? (
                                      <img
                                        key={i}
                                        src={logo}
                                        className="screen-team-logo"
                                      />
                                    ) : null,
                                )}
                                <span
                                  className={
                                    winner === match.teamB.id ? "winner" : ""
                                  }
                                >
                                  {match.teamB.name}
                                </span>
                              </td>
                            </tr>
                          </Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </>
            )}

            {rightView === 1 && (
              <>
                <h2>Tablica ogłoszeń</h2>

                <div className="screen-announcements">
                  <ReactMarkdown>
                    {tournament.announcements || "Brak komunikatów"}
                  </ReactMarkdown>
                </div>
              </>
            )}
            <div className="screen-qr">
              <QRCodeCanvas
                value={
                  typeof window !== "undefined" ? window.location.origin : ""
                }
                size={120}
                bgColor="#ffffff"
                fgColor="#000000"
              />
              <span>Skanuj aby zobaczyć wyniki</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
