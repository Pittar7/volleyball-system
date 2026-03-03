"use client";

import { useState } from "react";

export default function MatchMatrix({
  teams,
  matches,
  mode = "mobile", // mobile | screen
}) {
  const [expandedCell, setExpandedCell] = useState(null);

  const getMatch = (teamAId, teamBId) => {
    return matches.find(
      (m) =>
        (m.teamA.id === teamAId && m.teamB.id === teamBId) ||
        (m.teamA.id === teamBId && m.teamB.id === teamAId),
    );
  };

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

  return (
    <div className="overflow-auto">
      <table className="match-matrix">
        <thead>
          <tr>
            <th className="matrix-corner"></th>
            {teams.map((team) => (
              <th key={team.id} className="matrix-header">
                {team.name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {teams.map((rowTeam) => (
            <tr key={rowTeam.id}>
              <td className="matrix-row-header">{rowTeam.name}</td>

              {teams.map((colTeam) => {
                if (rowTeam.id === colTeam.id) {
                  return (
                    <td key={colTeam.id} className="matrix-diagonal">
                      —
                    </td>
                  );
                }

                const match = getMatch(rowTeam.id, colTeam.id);

                if (!match || !match.finished) {
                  return (
                    <td key={colTeam.id} className="matrix-empty">
                      -
                    </td>
                  );
                }

                const { setsA, setsB } = calculateSetsScore(match);

                const isReversed = match.teamA.id !== rowTeam.id;

                const score = isReversed
                  ? `${setsB}:${setsA}`
                  : `${setsA}:${setsB}`;

                const cellKey = `${rowTeam.id}-${colTeam.id}`;

                return (
                  <td
                    key={colTeam.id}
                    className="matrix-score-cell"
                    onClick={() =>
                      mode === "mobile" &&
                      setExpandedCell(expandedCell === cellKey ? null : cellKey)
                    }
                  >
                    <div className="matrix-score">
                      {isReversed ? (
                        <>
                          <span className={setsB > setsA ? "winner" : ""}>
                            {setsB}
                          </span>
                          :
                          <span className={setsA > setsB ? "winner" : ""}>
                            {setsA}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={setsA > setsB ? "winner" : ""}>
                            {setsA}
                          </span>
                          :
                          <span className={setsB > setsA ? "winner" : ""}>
                            {setsB}
                          </span>
                        </>
                      )}
                    </div>

                    {/* SCREEN MODE → zawsze pokazuj sety */}
                    {mode === "screen" && (
                      <div className="matrix-sets">
                        {match.sets.map((set, index) => {
                          if (!set.a || !set.b) return null;

                          const a = parseInt(set.a);
                          const b = parseInt(set.b);

                          const left = isReversed ? b : a;
                          const right = isReversed ? a : b;

                          return (
                            <div key={index}>
                              <span className={left > right ? "winner" : ""}>
                                {left}
                              </span>
                              :
                              <span className={right > left ? "winner" : ""}>
                                {right}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* MOBILE MODE → klik rozwija */}
                    {mode === "mobile" && expandedCell === cellKey && (
                      <div className="matrix-sets">
                        {match.sets.map((set, index) => {
                          if (!set.a || !set.b) return null;

                          const a = parseInt(set.a);
                          const b = parseInt(set.b);

                          const left = isReversed ? b : a;
                          const right = isReversed ? a : b;

                          return (
                            <div key={index}>
                              <span className={left > right ? "winner" : ""}>
                                {left}
                              </span>
                              :
                              <span className={right > left ? "winner" : ""}>
                                {right}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
