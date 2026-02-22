// ==========================
// API – ZAPIS I ODCZYT TURNIEJU
// ==========================
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "tournament.json");

// ==========================
// GET – wczytanie danych
// ==========================
export async function GET() {
  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(null);
    }

    const data = fs.readFileSync(filePath, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ error: "Błąd odczytu pliku" }, { status: 500 });
  }
}

// ==========================
// POST – zapis danych
// ==========================
export async function POST(request) {
  try {
    const body = await request.json();
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Błąd zapisu pliku" }, { status: 500 });
  }
}
