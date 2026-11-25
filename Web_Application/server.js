import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEnvKey() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...vals] = trimmed.split('=');
        if (key.trim() === 'GEMINI_API_KEY') {
          const val = vals.join('=').trim();
          if (val && val !== 'MY_GEMINI_API_KEY' && !val.startsWith('placeholder')) {
            return val;
          }
        }
      }
    }
  }
  return process.env.GEMINI_API_KEY || "";
}

// Parse initial port from environment variable or CLI arguments (e.g. node server.js 3001 or --port 3001)
let targetPort = parseInt(process.env.PORT, 10);
if (isNaN(targetPort)) {
  const args = process.argv.slice(2);
  const portArgIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
  if (portArgIndex !== -1 && args[portArgIndex + 1]) {
    targetPort = parseInt(args[portArgIndex + 1], 10);
  } else if (args[0] && !isNaN(parseInt(args[0], 10))) {
    targetPort = parseInt(args[0], 10);
  }
}
if (isNaN(targetPort)) {
  targetPort = 3000;
}

let currentPort = targetPort;
const MAX_PORT_ATTEMPTS = 50;
let attempts = 0;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  let pathname = '/';
  try {
    const rawUrl = (req.url || '/').replace(/^\/\//, '/');
    const host = req.headers.host || `localhost:${currentPort}`;
    const parsedUrl = new URL(rawUrl, `http://${host}`);
    pathname = parsedUrl.pathname;
  } catch (e) {
    pathname = '/';
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. Handle Secure Proxy Endpoint: POST /api/chat
  if (req.method === 'POST' && pathname === '/api/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { userQuery, profile, schemes, apiKey: clientApiKey } = data;
        const headerKey = req.headers['x-gemini-key'];

        let apiKey = clientApiKey || headerKey || getEnvKey();
        if (apiKey === 'MY_GEMINI_API_KEY' || (apiKey && apiKey.startsWith('placeholder'))) {
          apiKey = '';
        }

        if (!apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "Gemini API key is not configured. Please paste your key in the server .env or via the 🔑 Gemini Key button." }));
        }

        if (!userQuery) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "userQuery is required" }));
        }

        const schemeContext = (schemes || []).map(s => `
- ID: ${s.id}
  Name: ${s.name} (${s.nameHindi})
  Sector: ${s.sector} | Level: ${s.level}
  Financial: ${s.financialBenefit}
  Eligibility: ${s.eligibilityCriteriaSummary}
  Target: ${s.targetBeneficiary}
  Documents: ${(s.requiredDocuments || []).join("; ")}
        `).join("\n");

        const prof = profile || {};
        const systemInstruction = `
You are YojanaMitra, the personalized AI Government Scheme Advisor in the YojanaSetu portal.
Your task is to give accurate, empathetic, and personalized advice on Indian Government welfare schemes.

CITIZEN PROFILE:
- Name: ${prof.fullName || "Citizen"}
- Age: ${prof.age || "N/A"} years | Gender: ${prof.gender || "All"}
- State: ${prof.state || "India"}, District: ${prof.district || "N/A"}
- Occupation: ${prof.occupation || "General"}
- Annual Family Income: ₹${prof.annualIncome ? Math.round(prof.annualIncome) : "N/A"}
- Social Category: ${prof.casteCategory || "All"}
- Landholding: ${prof.landHoldingHectares || 0} Hectares
- BPL Ration Card: ${prof.hasBplRationCard ? "Yes" : "No"}

VERIFIED SCHEMES DATABASE:
${schemeContext}

GUIDELINES:
1. Tailor recommendations specifically to this citizen profile.
2. If query is about ration card, answer about PM Garib Kalyan Anna Yojana / NFSA Ration Card.
3. Highlight financial assistance amounts clearly.
4. Support English, Hindi, and Hinglish.
5. Format answers clearly with bullet points and bold text.
        `;

        const modelsToTry = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
        let apiRes = null;
        let lastErrorText = "";

        const payload = {
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: userQuery }] }],
          generationConfig: { temperature: 0.3, topP: 0.95, topK: 40 }
        };

        for (const MODEL of modelsToTry) {
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
          try {
            const res = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            if (res.ok) {
              apiRes = res;
              console.log(`[Gemini Proxy] Success using model: ${MODEL}`);
              break;
            } else {
              lastErrorText = await res.text();
              console.warn(`[Gemini Proxy] Model ${MODEL} returned ${res.status}: ${lastErrorText}`);
            }
          } catch (err) {
            console.warn(`[Gemini Proxy] Failed fetch for model ${MODEL}:`, err.message);
          }
        }

        if (!apiRes || !apiRes.ok) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: `Gemini API call failed across all models. Details: ${lastErrorText}` }));
        }

        const apiData = await apiRes.json();
        const replyText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!replyText) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: "Empty response from Gemini API" }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          replyText: replyText,
          isPoweredByGemini: true,
          isSecureProxy: true
        }));
      } catch (err) {
        console.error("Proxy error:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
    return;
  }

  // 2. Serve Static Web Files (Default landing is login.html)
  let filePath = path.join(__dirname, pathname === '/' ? 'login.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'text/html';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found - YojanaSetu</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    attempts++;
    if (attempts <= MAX_PORT_ATTEMPTS) {
      console.log(`⚠️ Port ${currentPort} is currently in use. Auto-switching to port ${currentPort + 1}...`);
      currentPort++;
      setTimeout(() => {
        startServer(currentPort);
      }, 100);
    } else {
      console.error(`❌ Could not find an available port after ${MAX_PORT_ATTEMPTS} attempts.`);
      process.exit(1);
    }
  } else {
    console.error("Server startup error:", err);
    process.exit(1);
  }
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n====================================================`);
    console.log(`🚀 YojanaSetu Web Server & Secure Proxy is live!`);
    console.log(`🌐 Website URL: http://localhost:${port}`);
    console.log(`🔒 Proxy Endpoint: http://localhost:${port}/api/chat`);
    if (port !== targetPort) {
      console.log(`💡 Note: Port ${targetPort} was busy, so port ${port} was automatically assigned.`);
    }
    console.log(`====================================================\n`);
  });
}

startServer(currentPort);

