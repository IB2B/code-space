
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN;
const USERS_TABLE_ID = process.env.BASEROW_USERS_TABLE_ID;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Find user by email in Baserow
    const res = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&filter__Email__equal=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("Baserow lookup error:", res.status, body);
      return NextResponse.json(
        { error: "Database error. Please try again." },
        { status: 500 },
      );
    }

    const data = await res.json();

    if (data.count === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const user = data.results[0];
    const valid = await bcrypt.compare(password, user["password_hashed"]);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ message: "Login successful" });

    response.cookies.set("session_user", JSON.stringify({
      id: user.id,
      fullName: user["username"],
      email: user["Email"],
      role: user["Role"],
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
