const express    = require('express');
const axios      = require('axios');
const cors       = require('cors');
const cheerio    = require('cheerio');
const session    = require('express-session');
const path       = require('path');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

const LOGIN_USER = process.env.DASHBOARD_USER || 'mohit';
const LOGIN_PASS = process.env.DASHBOARD_PASS || 'momentum2026';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'mb-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' }
}));

// Page auth — redirect to login
function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  res.redirect('/login');
}

// API auth — return 401 JSON (so fetch() gets JSON, not HTML)
function requireAuthApi(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ── Login page ──
app.get('/login', (req, res) => {
  const error = req.query.error ? '<p style="color:#ff1744;margin-top:12px;font-size:13px;">Invalid username or password</p>' : '';
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Momentum Blasters</title><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#0a0a0a;font-family:'Plus Jakarta Sans',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;}.card{background:#111;border:1px solid rgba(0,230,118,0.18);border-radius:14px;padding:44px 38px;width:380px;text-align:center;}.dot{width:9px;height:9px;border-radius:50%;background:#00e676;display:inline-block;margin-right:8px;box-shadow:0 0 8px rgba(0,230,118,0.7);vertical-align:middle;}.logo{font-size:12px;letter-spacing:0.2em;color:#00e676;font-weight:700;vertical-align:middle;}.sub{font-size:12px;color:#3a4a3a;margin:8px 0 32px;}.divider{height:1px;background:rgba(0,230,118,0.1);margin-bottom:24px;}input{width:100%;background:#0e0e0e;border:1px solid rgba(0,230,118,0.12);border-radius:8px;padding:13px 15px;color:#e8f5e9;font-size:14px;font-family:inherit;margin-bottom:12px;outline:none;transition:border 0.2s;}input:focus{border-color:rgba(0,230,118,0.45);}input::placeholder{color:#3a4a3a;}button{width:100%;background:#00e676;border:none;border-radius:8px;padding:14px;color:#0a0a0a;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;letter-spacing:0.05em;}button:hover{background:#69f0ae;}.footer{font-size:11px;color:#2a3a2a;margin-top:24px;}</style></head><body><div class="card"><div><span class="dot"></span><span class="logo">MOMENTUM BLASTERS</span></div><div class="sub">Live Market Terminal · Secure Access</div><div class="divider"></div><form method="POST" action="/login"><input type="text" name="username" placeholder="Username" autocomplete="username" required><input type="password" name="password" placeholder="Password" autocomplete="current-password" required><button type="submit">SIGN IN</button></form>${error}<div class="footer">Protected · Private · Real-time</div></div></body></html>`);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === LOGIN_USER && password === LOGIN_PASS) {
    req.session.loggedIn = true;
    req.session.save(() => res.redirect('/'));
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ── Serve dashboard ──
app.get('/', requireAuth, (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');
  // Auto-set BACKEND_URL to empty string so all API calls are relative
  html = html.replace(/const BACKEND_URL\s*=\s*['"][^'"]*['"];/, "const BACKEND_URL = '';");
  res.send(html);
});

// ── Chartink helper ──
async function runScan(scan_clause) {
  const sess = axios.create({
    baseURL: 'https://chartink.com',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
    },
    withCredentials: true,
    timeout: 20000,
  });
  const pageRes = await sess.get('/screener/');
  const cookies = pageRes.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || '';
  const $ = cheerio.load(pageRes.data);
  let csrf = $('meta[name="csrf-token"]').attr('content');
  if (!csrf) {
    const match = pageRes.data.match(/csrf[_-]token['"]\s*[,:]\s*['"]([\w+/=]+)['"]/i)
               || pageRes.data.match(/content="([\w+/=]{20,})"\s+name="csrf-token"/i);
    csrf = match?.[1];
  }
  if (!csrf) throw new Error('Could not extract CSRF token');
  const scanRes = await sess.post('/screener/process', new URLSearchParams({ scan_clause }).toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-TOKEN': csrf,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://chartink.com/screener/',
      'Origin': 'https://chartink.com',
      'Cookie': cookies,
      'Accept': 'application/json, text/javascript, */*; q=0.01',
    },
    timeout: 20000,
  });
  return scanRes.data;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const BREADTH = {
  total:     '( {cash} ( daily close > 0 ) )',
  above10MA: '( {cash} ( daily close > daily ema( daily close,10 ) ) )',
  above20MA: '( {cash} ( daily close > daily ema( daily close,20 ) ) )',
  above50MA: '( {cash} ( daily close > daily ema( daily close,50 ) ) )',
  above200MA:'( {cash} ( daily close > daily ema( daily close,200 ) ) )',
  adv4pct:   '( {cash} ( daily close >= 1.04 * 1 day ago daily close ) )',
  dec4pct:   '( {cash} ( daily close <= 0.96 * 1 day ago daily close ) )',
};

// ── API routes — use requireAuthApi (returns JSON 401, not HTML redirect) ──
app.get('/breadth', requireAuthApi, async (req, res) => {
  try {
    const counts = {};
    for (const [key, clause] of Object.entries(BREADTH)) {
      try {
        const data = await runScan(clause);
        counts[key] = data?.recordsTotal || data?.data?.length || 0;
        await sleep(700);
      } catch(e) { counts[key] = 0; }
    }
    const total = counts.total || 1800;
    return res.json({
      total,
      above10MA: counts.above10MA, above20MA: counts.above20MA,
      above50MA: counts.above50MA, above200MA: counts.above200MA,
      adv4pct: counts.adv4pct, dec4pct: counts.dec4pct,
      pct10MA:   +((counts.above10MA  / total * 100).toFixed(2)),
      pct20MA:   +((counts.above20MA  / total * 100).toFixed(2)),
      pct50MA:   +((counts.above50MA  / total * 100).toFixed(2)),
      pct200MA:  +((counts.above200MA / total * 100).toFixed(2)),
      netBreadth:+((counts.adv4pct - counts.dec4pct).toFixed(2)),
      timestamp: new Date().toISOString(),
    });
  } catch(err) { return res.status(502).json({ error: err.message }); }
});

app.post('/scan', requireAuthApi, async (req, res) => {
  const scan_clause = req.body?.scan_clause;
  if (!scan_clause) return res.status(400).json({ error: 'scan_clause is required' });
  try {
    const data = await runScan(scan_clause);
    if (!data?.data) return res.status(502).json({ error: 'Chartink returned empty data' });
    return res.json({ total: data.recordsTotal || data.data.length, data: data.data });
  } catch(err) { return res.status(502).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`Momentum Blasters running on port ${PORT}`));
