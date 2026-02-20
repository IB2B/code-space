import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const BASEROW_URL = process.env.BASEROW_URL;
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN;
const USERS_TABLE_ID = process.env.BASEROW_USERS_TABLE_ID;

export async function POST(req: NextRequest) {
  try {
    const { fullName, role, email, password } = await req.json();

    if (!fullName || !role || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Check if email already exists in Baserow
    const checkRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true&filter__Email__equal=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
        },
      },
    );

    if (!checkRes.ok) {
      const body = await checkRes.text();
      console.error("Baserow check error:", checkRes.status, body);
      return NextResponse.json(
        { error: "Database error. Please try again." },
        { status: 500 },
      );
    }

    const checkData = await checkRes.json();
    if (checkData.count > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createRes = await fetch(
      `${BASEROW_URL}/api/database/rows/table/${USERS_TABLE_ID}/?user_field_names=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${BASEROW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "Full Name": fullName,
          Role: role,
          Email: email,
          "Password Hash": passwordHash,
        }),
      },
    );

    if (!createRes.ok) {
      const body = await createRes.text();
      console.error("Baserow create error:", createRes.status, body);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 },
    );
  } catch (err) {
    console.error("Register route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
