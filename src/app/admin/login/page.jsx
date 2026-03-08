"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");

  const login = async () => {
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location = "/admin";
    } else {
      alert("Nieprawidłowe hasło");
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>Logowanie administratora</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          login();
        }}
      >
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Zaloguj</button>
      </form>

      <br />
      <br />

      {/* <button onClick={login}>Zaloguj</button> */}
    </div>
  );
}
