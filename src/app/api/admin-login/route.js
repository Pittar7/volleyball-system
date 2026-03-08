import { NextResponse } from "next/server";

let attempts = 0;

export async function POST(req) {
  if (attempts >= 5) {
    return NextResponse.json(
      { error: "Za dużo prób logowania. Spróbuj później." },
      { status: 429 },
    );
  }

  const { password } = await req.json();

  if (password === process.env.ADMIN_PASSWORD) {
    attempts = 0; // reset po poprawnym logowaniu

    const res = NextResponse.json({ success: true });

    res.cookies.set("admin-auth", "true", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });

    return res;
  }

  attempts++; // zwiększamy licznik prób

  return NextResponse.json({ error: "Błędne hasło" }, { status: 401 });
}
