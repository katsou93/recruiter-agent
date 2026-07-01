import { NextResponse } from "next/server";

export async function GET() {
    const clientId = process.env.VINCERE_CLIENT_ID;
    const redirectUri =
          process.env.VINCERE_REDIRECT_URI ||
          "https://recruiter-agent-two.vercel.app/api/vincere/callback";

  if (!clientId) {
        return new Response("Missing VINCERE_CLIENT_ID", { status: 500 });
  }

  const authUrl =
        "https://id.vincere.io/oauth2/authorize" +
        "?client_id=" + clientId +
        "&redirect_uri=" + encodeURIComponent(redirectUri) +
        "&response_type=code";

  return NextResponse.redirect(authUrl);
}
