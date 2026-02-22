export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const logosDir = path.join(process.cwd(), "public", "logos");

    if (!fs.existsSync(logosDir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(logosDir);

    const images = files.filter((file) =>
      /\.(png|jpg|jpeg|svg|webp)$/i.test(file),
    );

    return NextResponse.json(images);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Błąd odczytu logo" }, { status: 500 });
  }
}
