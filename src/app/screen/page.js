"use client";

// ==========================
// TRYB TELEBIM - /screen
// Wersja 1: Tabele + Harmonogram
// ==========================

import { useEffect, useState } from "react";

export default function ScreenPage() {
  const [data, setData] = useState(null);

  // ===== POBIERANIE DANYCH =====
  const fetchData = async () => {
    try {
      const res = await fetch("/api/tournament");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Błąd pobierania danych:", err);
    }
  };

  // ===== PIERWSZE ŁADOWANIE + AUTO REFRESH =====
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/tournament");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Błąd pobierania danych:", err);
      }
    };

    loadData();

    const interval = setInterval(loadData, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!data) return <div className="p-10 text-2xl">Ładowanie...</div>;

  const { tournament, schedule } = data;

  const groupA = tournament?.teams?.filter((t) => t.group === "A") || [];
  const groupB = tournament?.teams?.filter((t) => t.group === "B") || [];

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <h1 className="text-4xl font-bold mb-10 text-center">
        {tournament?.name || "Turniej"}
      </h1>

      {/* ===== TABELE GRUP ===== */}
      <div className="grid grid-cols-2 gap-10 mb-16">
        <div>
          <h2 className="text-2xl font-bold mb-4 text-center">Grupa A</h2>
          <ul className="bg-white rounded-xl shadow p-6 space-y-3 list-none">
            {groupA.map((team) => (
              <li
                key={team.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 20,
                }}
              >
                {team.logo && (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={team.logo}
                      alt={team.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                )}

                <span>{team.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4 text-center">Grupa B</h2>
          <ul className="bg-white rounded-xl shadow p-6 space-y-3 list-none">
            {groupB.map((team) => (
              <li
                key={team.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 20,
                }}
              >
                {team.logo && (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={team.logo}
                      alt={team.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                )}

                <span>{team.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ===== HARMONOGRAM ===== */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-center">Harmonogram</h2>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          {schedule?.map((match, index) => (
            <div
              key={index}
              className={`flex justify-between items-center text-xl ${
                match.finished ? "opacity-40" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {match.team1?.logo && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={match.team1.logo}
                      alt=""
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                )}
                {match.team1?.name}
              </div>

              <div className="font-bold">
                {match.score
                  ? `${match.score.team1Sets} : ${match.score.team2Sets}`
                  : "-"}
              </div>

              <div className="flex items-center gap-3">
                {match.team1?.logo && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={match.team1.logo}
                      alt=""
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                )}
                {match.team2?.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
