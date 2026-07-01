import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

  if (error) {
        return NextResponse.redirect(new URL("/?vincere=error&reason=" + encodeURIComponent(error), req.url));
  }
    if (!code) {
          return new Response(JSON.stringify({ error: "No code" }), { status: 400 });
    }

  const clientId = process.env.VINCERE_CLIENT_ID!;
    const redirectUri =
          process.env.VINCERE_REDIRECT_URI ||
          "https://recruiter-agent-two.vercel.app/api/vincere/callback";

  try {
        const tokenRes = await fetch("https://id.vincere.io/oauth2/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                          grant_type: "authorization_code",
                          code,
                          client_id: clientId,
                          redirect_uri: redirectUri,
                }).toString(),
        });

      const raw = await tokenRes.text();
        let tokenData: any;
        try {
                tokenData = JSON.parse(raw);
        } catch {
                return NextResponse.redirect(new URL("/?vincere=error&reason=token_parse_error", req.url));
        }

      if (!tokenRes.ok) {
              return NextResponse.redirect(
                        new URL("/?vincere=error&reason=" + encodeURIComponent(tokenData.error || "token_failed"), req.url)
                      );
      }

      const idToken = tokenData.id_token || tokenData.access_token;
        if (!idToken) {
                return NextResponse.redirect(new URL("/?vincere=error&reason=no_token", req.url));
        }

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

      await prisma.integration.upsert({
              where: { provider: "vincere" },
              update: {
                        accessToken: idToken,
                        refreshToken: tokenData.refresh_token || undefined,
                        expiresAt,
              },
              create: {
                        provider: "vincere",
                        accessToken: idToken,
                        refreshToken: tokenData.refresh_token || null,
                        expiresAt,
              },
      });

      return NextResponse.redirect(new URL("/?vincere=connected", req.url));
  } catch (e: any) {
        return NextResponse.redirect(new URL("/?vincere=error&reason=" + encodeURIComponent(e.message), req.url));
  }
}
