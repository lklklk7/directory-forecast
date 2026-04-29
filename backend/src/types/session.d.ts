import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;       // Twitch user ID
    userLogin: string;    // Twitch username (lowercase)
  }
}
