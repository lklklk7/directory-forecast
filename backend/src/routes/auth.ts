import { Router } from "express";

export const authRouter = Router();

const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/authorize";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_USERS_URL = "https://api.twitch.tv/helix/users";

// Step 1: redirect the streamer to Twitch's OAuth consent screen
authRouter.get("/twitch", (_req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!,
    redirect_uri: process.env.TWITCH_REDIRECT_URI!,
    response_type: "code",
    scope: "user:read:email",
  });

  res.redirect(`${TWITCH_AUTH_URL}?${params}`);
});

// Step 2: Twitch redirects back here with ?code=...
authRouter.get("/twitch/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error || typeof code !== "string") {
    res.status(400).json({ error: "OAuth denied or missing code" });
    return;
  }

  // Exchange the authorization code for an access token
  const tokenRes = await fetch(TWITCH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TWITCH_REDIRECT_URI!,
    }),
  });

  if (!tokenRes.ok) {
    res.status(502).json({ error: "Failed to exchange token with Twitch" });
    return;
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };

  // Use the access token to fetch the user's Twitch profile
  const userRes = await fetch(TWITCH_USERS_URL, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
    },
  });

  if (!userRes.ok) {
    res.status(502).json({ error: "Failed to fetch Twitch user" });
    return;
  }

  const { data } = (await userRes.json()) as {
    data: { id: string; login: string }[];
  };

  const twitchUser = data[0];
  if (!twitchUser) {
    res.status(502).json({ error: "No user returned from Twitch" });
    return;
  }

  // Store the Twitch identity in the session
  req.session.userId = twitchUser.id;
  req.session.userLogin = twitchUser.login;

  // Send the streamer to the Riot linking page
  res.redirect(`${process.env.FRONTEND_URL}/link`);
});
