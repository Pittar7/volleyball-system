import { cookies } from "next/headers";

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
export const runtime = "nodejs";

// folder danych

// ==========================
// GET – wczytanie turnieju
// ==========================

export async function GET() {
  const { data, error } = await supabase
    .from("tournament")
    .select("data")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("SUPABASE ERROR:", error);
  }

  if (!data) {
    return NextResponse.json({
      tournament: { teams: [] },
      schedule: [],
    });
  }

  return NextResponse.json(data.data);
}

// ==========================
// POST – zapis turnieju
// ==========================
export async function POST(request) {
  const body = await request.json();

  console.log("SAVE BODY:", body);

  const { error } = await supabase.from("tournament").upsert({
    id: 1,
    data: body,
  });

  if (error) {
    console.error("SUPABASE ERROR:", error);
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
// export async function POST(req) {
//   const cookieStore = await cookies();
//   const auth = cookieStore.get("admin-auth");

//   if (!auth) {
//     return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
//   }

//   try {
//     const body = await req.json();

//     // utwórz folder data jeśli nie istnieje
//     if (!fs.existsSync(dataDir)) {
//       fs.mkdirSync(dataDir, { recursive: true });
//     }

//     // 🔵 BACKUP STAREGO TURNIEJU
//     if (fs.existsSync(filePath)) {
//       fs.copyFileSync(filePath, filePath + ".bak");
//     }

//     // zapis nowego turnieju
//     fs.writeFileSync(filePath, JSON.stringify(body, null, 2));

//     console.log("Tournament saved");

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error("SAVE ERROR:", error);

//     return NextResponse.json({ error: "Błąd zapisu pliku" }, { status: 500 });
//   }
// }
