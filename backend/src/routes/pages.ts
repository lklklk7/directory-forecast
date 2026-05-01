import { Router } from "express";

export const pagesRouter = Router();

// Shared HTML shell
function page(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Twitch Rank Badges</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0e0e10;
      color: #efeff1;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #18181b;
      border: 1px solid #2d2d31;
      border-radius: 12px;
      padding: 2.5rem;
      width: 100%;
      max-width: 440px;
    }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
    p  { color: #adadb8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .btn {
      display: inline-block;
      padding: 0.7rem 1.4rem;
      border-radius: 6px;
      font-size: 0.95rem;
      font-weight: 600;
      text-decoration: none;
      border: none;
      cursor: pointer;
      width: 100%;
      text-align: center;
    }
    .btn-twitch { background: #9147ff; color: #fff; }
    .btn-twitch:hover { background: #772ce8; }
    .btn-submit { background: #9147ff; color: #fff; margin-top: 0.5rem; }
    .btn-submit:hover { background: #772ce8; }
    label { display: block; font-size: 0.85rem; color: #adadb8; margin-bottom: 0.25rem; }
    input, select {
      width: 100%;
      background: #0e0e10;
      border: 1px solid #2d2d31;
      border-radius: 6px;
      color: #efeff1;
      padding: 0.55rem 0.75rem;
      font-size: 0.95rem;
      margin-bottom: 1rem;
    }
    input:focus, select:focus { outline: 2px solid #9147ff; border-color: transparent; }
    .row { display: flex; gap: 0.75rem; }
    .row > * { flex: 1; }
    .error { color: #f55; font-size: 0.9rem; margin-bottom: 1rem; }
    .success-icon { font-size: 2.5rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="card">${body}</div>
</body>
</html>`;
}

// GET /link — show login button or linking form depending on auth state
pagesRouter.get("/link", (req, res) => {
  // Not logged in → show Twitch login button
  if (!req.session.userId) {
    res.send(
      page(
        "Connect Your Account",
        `<h1>Show your rank on Twitch</h1>
         <p>Log in with Twitch to connect your League of Legends account and display your rank badge on the directory.</p>
         <a class="btn btn-twitch" href="/auth/twitch">Log in with Twitch</a>`
      )
    );
    return;
  }

  // Logged in → show Riot linking form
  const error = req.query.error ? `<p class="error">${req.query.error}</p>` : "";
  res.send(
    page(
      "Link Riot Account",
      `<h1>Hi, ${req.session.userLogin}!</h1>
       <p>Enter your Riot ID to link your League of Legends rank.</p>
       ${error}
       <form id="linkForm">
         <div class="row">
           <div>
             <label for="riotName">Riot Name</label>
             <input id="riotName" name="riotName" placeholder="Faker" required />
           </div>
           <div>
             <label for="riotTag">Tag</label>
             <input id="riotTag" name="riotTag" placeholder="T1" required />
           </div>
         </div>
         <label for="region">Region</label>
         <select id="region" name="region">
           <option value="na1">NA</option>
           <option value="euw1">EUW</option>
           <option value="eune1">EUNE</option>
           <option value="kr">KR</option>
           <option value="jp1">JP</option>
           <option value="br1">BR</option>
           <option value="la1">LAN</option>
           <option value="la2">LAS</option>
           <option value="oc1">OCE</option>
           <option value="tr1">TR</option>
           <option value="ru">RU</option>
         </select>
         <button class="btn btn-submit" type="submit">Link Account</button>
       </form>
       <script>
         document.getElementById('linkForm').addEventListener('submit', async (e) => {
           e.preventDefault();
           const btn = e.target.querySelector('button');
           btn.textContent = 'Linking…';
           btn.disabled = true;
           const body = {
             riotName: document.getElementById('riotName').value.trim(),
             riotTag: document.getElementById('riotTag').value.trim(),
             region: document.getElementById('region').value,
           };
           const res = await fetch('/api/link', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(body),
             credentials: 'include',
           });
           const data = await res.json();
           if (res.ok) {
             window.location.href = '/link/success?rank=' + encodeURIComponent(data.rank);
           } else {
             window.location.href = '/link?error=' + encodeURIComponent(data.error ?? 'Something went wrong');
           }
         });
       </script>`
    )
  );
});

// GET /link/success — confirmation page shown after successful linking
pagesRouter.get("/link/success", (req, res) => {
  const rank = req.query.rank ?? "Unranked";
  res.send(
    page(
      "Account Linked",
      `<div class="success-icon">🎉</div>
       <h1>You're all set!</h1>
       <p>Your rank (<strong>${rank}</strong>) will now appear as a badge on the Twitch League of Legends directory.</p>
       <p>Ranks refresh automatically every few hours.</p>`
    )
  );
});
