GovencoOS 0.1 — Cloudflare Pages Edition

DEPLOY WITH DIRECT UPLOAD
1. Open Cloudflare Dashboard → Workers & Pages.
2. Create → Pages → Upload assets / Direct Upload.
3. Upload the contents of this folder (or this ZIP if the dashboard accepts it).
4. The root must contain index.html, app.js, styles.css, _headers and _redirects.

GIT DEPLOY
- Framework preset: None
- Build command: leave empty
- Build output directory: /

DATA MODEL
GovencoOS has no server or database. Files and settings live in localStorage for the current site origin.
A cookie sentinel is used. If cookies/site data are cleared, GovencoOS wipes its own localStorage on the next launch and starts fresh.

LOCAL TEST
Open index.html directly, or run a simple local HTTP server for the closest Pages behavior.
