// ==========================
// KOMPONENT NAZWA DRUŻYNY + LOGO
// Używamy wszędzie zamiast ręcznego JSX
// ==========================

export default function TeamName({ team, size = 32 }) {
  return (
    <div className="flex items-center gap-2">
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {team.logo ? (
          <img
            src={team.logo}
            alt={team.name}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#e5e7eb",
              borderRadius: 6,
            }}
          />
        )}
      </div>

      <span>{team.name}</span>
    </div>
  );
}