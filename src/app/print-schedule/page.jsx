"use client";

import { useEffect, useState, Fragment } from "react";
import "@/app/styles/print.css";

export default function PrintSchedule() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/tournament");
      const json = await res.json();
      setData(json);

      setTimeout(() => window.print(), 500);
    };

    fetchData();
  }, []);

  if (!data) return null;

  const schedule = [...data.schedule].sort((a, b) => a.order - b.order);

  // grupowanie po boiskach
  const courts = {};

  schedule.forEach((match) => {
    const court = match.court || "Nieznane";

    if (!courts[court]) courts[court] = [];

    courts[court].push(match);
  });

  return (
    <div className="print-container">
      <h1>Terminarz turnieju</h1>

      {Object.entries(courts).map(([court, matches]) => (
        <div key={court} className="court-section">
          <h2>Boisko {court}</h2>

          <table className="print-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Drużyna A</th>
                <th>Wynik</th>
                <th>Drużyna B</th>
              </tr>
            </thead>

            <tbody>
              {matches.map((match, i) => (
                <Fragment key={match.id}>
                  <tr className="match-row">
                    <td className="match-number">{i + 1}</td>

                    <td className="team-name">{match.teamA?.name || ""}</td>

                    <td className="score-cell">:</td>

                    <td className="team-name">{match.teamB?.name || ""}</td>
                  </tr>

                  <tr className="set-row">
                    <td></td>
                    <td colSpan="3">Set 1: __________________</td>
                  </tr>

                  <tr className="set-row">
                    <td></td>
                    <td colSpan="3">Set 2: __________________</td>
                  </tr>

                  <tr className="set-row">
                    <td></td>
                    <td colSpan="3">Set 3: __________________</td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
