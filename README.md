# Momentum Blasters — Live Market Terminal

## Deploy on Render.com (5 minutes)

### Step 1 — Create GitHub repo
1. Go to github.com → New repository → name it `momentum-blasters`
2. Upload ALL files: `index.js`, `package.json`, `render.yaml`, `README.md`, `dashboard.html`

### Step 2 — Deploy on Render
1. Go to render.com → New → Web Service
2. Connect your `momentum-blasters` GitHub repo
3. Settings auto-fill from render.yaml
4. Click **Create Web Service**
5. Wait ~2 min → get URL like `https://momentum-blasters.onrender.com`

### Step 3 — Change your password (important!)
In Render dashboard → your service → Environment:
- `DASHBOARD_USER` = your username (default: mohit)
- `DASHBOARD_PASS` = your password (default: momentum2026) ← CHANGE THIS
- `SESSION_SECRET` = any random string

### How it works
- Visit your URL → redirected to login page
- Enter username + password → access dashboard
- Session lasts 24 hours (no need to login again)
- `/logout` to sign out

### Notes
- This replaces the old `chartink-proxy` — you only need ONE Render service now
- Backend URL is auto-configured — no manual editing needed
- Free Render tier sleeps after 15 min inactivity — first load takes ~30 sec
