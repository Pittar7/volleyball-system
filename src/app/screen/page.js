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
            <td>{team.name}</td>
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
          <th>#</th>
          <th>Drużyna</th>
          <th>Pkt</th>
          <th>M</th>
        </tr>
      </thead>

      <tbody>
        {combined.map((team, index) => (
          <tr key={team.id}>
            <td>{index + 1}</td>
            <td>{team.name}</td>
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
      setLeftView((v) => (v + 1) % 4);
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

  const liveMatches = getLiveMatches(schedule);

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

  const sortedSchedule = [...schedule].sort((a, b) => a.order - b.order);

  const visibleMatches = sortedSchedule.slice(0, 10);

  return (
    <>
      <div className="screen-live-bar">
        {liveMatches.map((match, i) => {
          return (
            <div key={match.id} className="live-match">
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
              </>
            )}

            {leftView === 1 && (
              <>
                <h2>Grupa B</h2>
                <GroupTable table={tableB} />
              </>
            )}

            {leftView === 2 && (
              <>
                <h2>Mecze grupowe</h2>
                <MatchMatrix
                  teams={groupA}
                  matches={schedule.filter((m) => m.group === "A")}
                  mode="screen"
                />
              </>
            )}

            {leftView === 3 && (
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
                  <tbody>
                    {visibleMatches.map((match) => (
                      <tr key={match.id}>
                        <td>{match.court}</td>

                        <td>{match.teamA.name}</td>

                        <td>vs</td>

                        <td>{match.teamB.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {rightView === 1 && (
              <>
                <h2>Harmonogram</h2>

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
