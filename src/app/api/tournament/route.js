import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// folder danych
const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "tournament.json");

// ==========================
// GET – wczytanie turnieju
// ==========================

export async function GET() {
  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(null);
    }

    const data = fs.readFileSync(filePath, "utf-8");

    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error("READ ERROR:", error);

    return NextResponse.json({ error: "Błąd odczytu pliku" }, { status: 500 });
  }
}

// ==========================
// POST – zapis turnieju
// ==========================

export async function POST(req) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("admin-auth");

  if (!auth) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // utwórz folder data jeśli nie istnieje
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 🔵 BACKUP STAREGO TURNIEJU
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, filePath + ".bak");
    }

    // zapis nowego turnieju
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2));

    console.log("Tournament saved");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SAVE ERROR:", error);

    return NextResponse.json({ error: "Błąd zapisu pliku" }, { status: 500 });
  }
}
