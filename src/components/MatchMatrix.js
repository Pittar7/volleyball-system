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
      <table className="border-collapse w-full text-center">
        <thead>
          <tr>
            <th className="border p-2 bg-gray-200"> </th>
            {teams.map((team) => (
              <th key={team.id} className="border p-2 bg-gray-100">
                {team.name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {teams.map((rowTeam) => (
            <tr key={rowTeam.id}>
              <td className="border p-2 bg-gray-100 font-semibold">
                {rowTeam.name}
              </td>

              {teams.map((colTeam) => {
                if (rowTeam.id === colTeam.id) {
                  return (
                    <td key={colTeam.id} className="border p-2 bg-gray-50">
                      —
                    </td>
                  );
                }

                const match = getMatch(rowTeam.id, colTeam.id);

                if (!match || !match.finished) {
                  return (
                    <td key={colTeam.id} className="border p-2 text-gray-400">
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
                    className="border p-2 cursor-pointer hover:bg-gray-100"
                    onClick={() =>
                      mode === "mobile" &&
                      setExpandedCell(expandedCell === cellKey ? null : cellKey)
                    }
                  >
                    <div className="font-semibold">{score}</div>

                    {/* SCREEN MODE → zawsze pokazuj sety */}
                    {mode === "screen" && (
                      <div className="text-xs mt-1 space-y-1">
                        {match.sets.map((set, index) =>
                          set.a && set.b ? (
                            <div key={index}>
                              {isReversed
                                ? `${set.b}:${set.a}`
                                : `${set.a}:${set.b}`}
                            </div>
                          ) : null,
                        )}
                      </div>
                    )}

                    {/* MOBILE MODE → klik rozwija */}
                    {mode === "mobile" && expandedCell === cellKey && (
                      <div className="text-xs mt-1 space-y-1">
                        {match.sets.map((set, index) =>
                          set.a && set.b ? (
                            <div key={index}>
                              {isReversed
                                ? `${set.b}:${set.a}`
                                : `${set.a}:${set.b}`}
                            </div>
                          ) : null,
                        )}
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
