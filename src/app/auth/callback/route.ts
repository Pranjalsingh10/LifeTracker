import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "error",
    "This confirmation link was already used or expired. Try signing in; if your account is still unconfirmed, sign up again to request a fresh link.",
  );
  return NextResponse.redirect(loginUrl);
}
