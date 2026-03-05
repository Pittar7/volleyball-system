"use client";

import { useEffect, useState } from "react";
import MatchMatrix from "@/components/MatchMatrix";
import { calculateTable } from "@/lib/tournamentLogic";
import "../styles/screen.css";
import ReactMarkdown from "react-markdown";

function GroupTable({ table }) {
  return (
    <table className="screen-group-table">
      <thead>
        <tr>
          <th>Drużyna</th>
          <th>M</th>
          <th>Pkt</th>
          <th>Sety</th>
        </tr>
      </thead>

      <tbody>
        {table.map((team) => (
          <tr key={team.id}>
            <td>
              <div className="team-with-logo">
                <div className="team-logos">
                  {team.logos?.map((logo, i) =>
                    logo ? (
                      <img key={i} src={logo} className="team-logo" />
                    ) : null,
                  )}
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
                  {team.logos?.map((logo, i) =>
                    logo ? (
                      <img key={i} src={logo} className="team-logo" />
                    ) : null,
                  )}
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

    const rightRotation = setInterval(() => {
      setRightView((v) => (v + 1) % 2);
    }, 12000);

    return () => {
      clearInterval(leftRotation);
      clearInterval(rightRotation);
    };
  }, []);

  if (!data) return null;

  // ===== DANE =====

  const { tournament, schedule = [] } = data;

  const sortedSchedule = [...schedule].sort((a, b) => a.order - b.order);

  // const liveMatches = sortedSchedule.filter((m) => m.status === "live");
  // const plannedMatches = sortedSchedule.filter(
  //   (m) => m.status === "planned" || !m.status,
  // );

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

  // const visibleMatches = sortedSchedule.slice(0, 10);
  const getTeamById = (id) => tournament.teams.find((t) => t.id === id);

  const finishedMatches = sortedSchedule
    .filter((m) => m.status === "finished" || m.finished)
    .sort((a, b) => b.order - a.order)
    .slice(0, 4);

  const liveMatches = schedule.filter((m) => m.status === "live");

  const plannedMatches = schedule
    .filter((m) => m.status === "planned" || !m.status)
    .sort((a, b) => a.order - b.order)
    .slice(0, 4);
  let topBarMatches = [...liveMatches];

  if (topBarMatches.length < 2) {
    const remaining = 2 - topBarMatches.length;

    const nextPlanned = plannedMatches
      .filter((m) => !liveMatches.some((l) => l.id === m.id))
      .slice(0, remaining);

    topBarMatches = [...topBarMatches, ...nextPlanned];
  }
  const visibleMatches = [
    ...finishedMatches.reverse(),
    ...liveMatches,
    ...plannedMatches,
  ].slice(0, 10);

  return (
    <>
      <div className="screen-live-bar">
        {topBarMatches.map((match, i) => {
          return (
            <div key={match.id} className="live-match">
              <span
                className={`live-status ${
                  match.status === "live" ? "live" : "planned"
                }`}
              >
                {match.status === "live" ? "TRWA" : "ZAPLANOWANY"}
              </span>
              <span className="live-court">Boisko {match.court}</span>

              <span className="live-team">{match.teamA.name}</span>

              <span className="live-vs">vs</span>

              <span className="live-team">{match.teamB.name}</span>

              {i === 0 && <span className="live-separator">|</span>}
            </div>
          );
        })}
      </div>
      <div className="screen-container">
        <div className="screen-layout">
          {/* LEWA STRONA */}

          <div className="screen-left">
            {leftView === 0 && (
              <>
                <h2>Grupa A</h2>
                <GroupTable table={tableA} />

                <h2>Grupa B</h2>
                <GroupTable table={tableB} />
              </>
            )}

            {leftView === 1 && (
              <>
                <h2>Klasyfikacja</h2>
                <LiveRanking schedule={schedule} tournament={tournament} />
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
                    {visibleMatches.map((match) => {
                      const status =
                        match.status ||
                        (match.finished ? "finished" : "planned");

                      return (
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

                            <span>{match.teamA.name}</span>
                          </td>

                          <td>vs</td>

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

                            <span>{match.teamB.name}</span>
                          </td>
                        </tr>
                      );
                    })}
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
          </div>
        </div>
      </div>
    </>
  );
}
