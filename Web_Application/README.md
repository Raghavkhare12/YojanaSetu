<div align="center">

# 🌐 YojanaSetu • Web Application
### National Citizen Welfare & Government Schemes Portal + Secure Gemini AI Proxy

[![Node.js](https://img.shields.io/badge/Server-Node.js_HTTP_%2B_ESM-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](server.js)
[![Express](https://img.shields.io/badge/Dependencies-Express_4.19_%2B_Dotenv-000000?style=for-the-badge&logo=express&logoColor=white)](package.json)
[![Schemes](https://img.shields.io/badge/Verified_Schemes-16_Central_Schemes-133B6B?style=for-the-badge)](js/data/schemesData.js)
[![AI Advisor](https://img.shields.io/badge/AI_Advisor-YojanaMitra_%28Gemini%29-C05621?style=for-the-badge)](server.js)

**A multi-page responsive web portal enabling Indian citizens to authenticate, build demographic profiles, evaluate scheme eligibility in real time, compare benefits side-by-side, track required documents, and chat with YojanaMitra AI in English, हिंदी, or Hinglish.**

[← Back to Root Repo](../README.md) · [Android Companion App →](../Android_Application/README.md)

</div>

---

## ✨ Key Capabilities

- **Multi-Page Citizen Portal**: Dedicated pages for Authentication (`login.html`), Home Dashboard (`index.html`), Searchable Catalogue (`catalogue.html`), Bookmarks (`saved.html`), Comparison Matrix (`compare.html`), and Profile Builder (`profile.html`).
- **Weighted Eligibility Engine**: Deterministic 100-point scoring across 6 demographic dimensions classifying every scheme as `ELIGIBLE`, `PARTIALLY_ELIGIBLE`, or `NOT_ELIGIBLE` with human-readable match reasons and missing criteria.
- **16 Verified Government Schemes**: Pre-loaded central & centrally-sponsored schemes across Agriculture, Healthcare, Housing, Business Loans, Education, Social Security, and Food Security.
- **Secure Backend Gemini Proxy (`server.js`)**: Keeps your `GEMINI_API_KEY` on the server (via `.env` or environment variables), injects the user's live profile and all 16 schemes into the system prompt, and automatically cascades across 5 Gemini Flash models.
- **Client-Side Persistence & Themes**: Stores active sessions (7-day expiry), citizen profile, saved schemes, comparison selections, document checklists, and Light/Dark theme preference in `localStorage`.

---

## 🏗️ Web & Proxy Architecture

```mermaid
flowchart TB
    Browser["Browser (HTML5 + CSS3 + ES Modules)"]

    subgraph Frontend["Client-Side Modules (js/)"]
        direction TB
        Pages["HTML Pages: login | index | catalogue | saved | compare | profile"]
        AppJS["YojanaSetuApp (js/app.js)"]
        AuthJS["AuthManager (js/auth.js)"]
        EligJS["EligibilityEngine (js/engine/eligibilityEngine.js)"]
        DataJS["SCHEMES_DATA (js/data/schemesData.js - 16 Schemes)"]
        GeminiJS["GeminiService (js/services/geminiService.js)"]
        LocalStore[("Browser localStorage")]

        Pages --> AppJS
        AppJS --> AuthJS
        AppJS --> EligJS --> DataJS
        AppJS --> GeminiJS
        AuthJS <--> LocalStore
        AppJS <--> LocalStore
    end

    subgraph Backend["Node.js Server (server.js)"]
        Static["Static File Server (Default: login.html)"]
        Proxy["POST /api/chat Proxy"]
        Env["Key Resolver: body.apiKey -> x-gemini-key -> .env -> process.env"]
        Static -.->|"Auto-port retry: 3000..3050"| Browser
        Proxy --> Env
    end

    GeminiAPI["Google Gemini API (v1beta/models/*:generateContent)"]

    Browser <-->|"HTTP GET /*"| Static
    GeminiJS -->|"1. Primary: POST /api/chat"| Proxy
    Proxy -->|"2. Cascading Model Fallback"| GeminiAPI
    GeminiJS -.->|"3. Direct Client Fallback (if key configured)"| GeminiAPI
```

---

## 🔄 AI Advisor (`POST /api/chat`) Request Sequence

```mermaid
sequenceDiagram
    actor Citizen
    participant UI as YojanaMitra Drawer (app.js)
    participant Client as GeminiService (geminiService.js)
    participant Server as Node Proxy (server.js)
    participant Gemini as Google Gemini API

    Citizen->>UI: Enters query (English / हिंदी / Hinglish)
    UI->>Client: generateAdvice(userQuery, profile, schemes)
    Client->>Server: POST /api/chat { userQuery, profile, schemes }
    Server->>Server: Resolve API Key (body -> header -> .env -> env)
    alt No valid API Key
        Server-->>Client: 400 { error: "Gemini API key is not configured..." }
        Client-->>UI: Display configuration prompt
    else Valid API Key found
        Server->>Server: Build System Instruction (Citizen Profile + 16 Schemes)
        loop Model Cascade (3.8 -> 3.5 -> 2.5 -> 1.5 -> 2.0 Flash)
            Server->>Gemini: POST generateContent
            alt 200 OK
                Gemini-->>Server: Candidate replyText
                Server-->>Client: 200 { replyText, isPoweredByGemini: true, isSecureProxy: true }
            else Non-OK / Network Error
                Gemini-->>Server: Error (try next model)
            end
        end
        Client-->>UI: Render formatted AI advice
    end
```

---

## 🧮 Eligibility Scoring Engine (`EligibilityEngine`)

[`js/engine/eligibilityEngine.js`](js/engine/eligibilityEngine.js) evaluates each scheme against the active citizen profile using a weighted point model:

| Rule Dimension | Weight | Evaluation Rule |
| :--- | :---: | :--- |
| **Occupation** | **25 pts** | Matches `allowedOccupations` (or `"All"`) |
| **Gender** | **20 pts** | Matches `allowedGenders` (or `"All"`) |
| **Annual Income** | **20 pts** | `profile.annualIncome <= scheme.maxAnnualIncome` (or no cap) |
| **Age** | **15 pts** | Within `[minAge, maxAge]` range |
| **Social Category** | **10 pts** | Matches `allowedCategories` (or `"All"`) |
| **Landholding** | **10 pts** | Checked when `scheme.requiresLand === true` (`> 0` and `<= maxLandHectares`) |

### Classification & Sorting Logic
- **`ELIGIBLE`**: `missingCriteria.length === 0`
- **`PARTIALLY_ELIGIBLE`**: `missingCriteria.length === 1` AND `matchPercentage >= 70%`
- **`NOT_ELIGIBLE`**: All other cases
- Results in `evaluateAll()` are sorted by: **Status** (`ELIGIBLE` → `PARTIALLY_ELIGIBLE` → `NOT_ELIGIBLE`) → **Match % (descending)** → **Scheme Name (A–Z)**.

---

## 📚 Pre-Loaded Welfare Schemes (`SCHEMES_DATA`)

[`js/data/schemesData.js`](js/data/schemesData.js) ships with **16 verified schemes**:

1. `PM_KISAN` — PM Kisan Samman Nidhi
2. `AYUSHMAN_BHARAT` — Ayushman Bharat PM-JAY
3. `PMAY_GRAMIN` — Pradhan Mantri Awaas Yojana
4. `PM_MUDRA` — Pradhan Mantri Mudra Yojana (PMMY)
5. `SUKANYA_SAMRIDDHI` — Sukanya Samriddhi Yojana
6. `PM_VISHWAKARMA` — PM Vishwakarma Scheme
7. `POST_MATRIC_SCHOLARSHIP` — Post Matric Scholarship (SC/OBC/EBC)
8. `PM_SVANIDHI` — PM Street Vendor's AtmaNirbhar Nidhi
9. `ATAL_PENSION` — Atal Pension Yojana (APY)
10. `PM_UJJWALA` — Pradhan Mantri Ujjwala Yojana 2.0
11. `KISAN_CREDIT_CARD` — Kisan Credit Card (KCC)
12. `PRAGATI_SCHOLARSHIP` — AICTE Pragati Scholarship for Girls
13. `PM_JEEVAN_JYOTI` — PM Jeevan Jyoti Bima Yojana (PMJJBY)
14. `STAND_UP_INDIA` — Stand-Up India Scheme
15. `MGNREGA` — Mahatma Gandhi NREGA
16. `PM_GKAY_RATION` — PM Garib Kalyan Anna Yojana (NFSA Ration Card)

---

## 📂 Directory Structure

```text
Web_Application/
├── css/
│   └── styles.css                 # Tricolor civic top bar, Light/Dark CSS variables, responsive cards & drawer
├── js/
│   ├── data/
│   │   └── schemesData.js         # 16 structured Indian Government schemes with docs & steps
│   ├── engine/
│   │   ├── eligibilityEngine.js   # Weighted rule evaluator & sorter
│   │   └── chatEngine.js          # Local RAG chatbot fallback engine
│   ├── services/
│   │   └── geminiService.js       # Calls POST /api/chat proxy with client-side fallback
│   ├── app.js                     # Main controller (rendering, filters, bookmarks, compare, checklist, AI drawer)
│   ├── auth.js                    # AuthManager (7-day session, Google simulation, Guest Trial, route guard)
│   └── config.js                  # Shared CONFIG (PORTAL_NAME, VERSION, DEFAULT_MODEL, GEMINI_API_KEY)
├── login.html                     # Default route (/): Citizen Login, Registration & Guest Trial
├── index.html                     # Home Dashboard: Hero stats, profile bar, AI drawer & matches
├── catalogue.html                 # Full searchable & filterable scheme directory
├── saved.html                     # Saved/bookmarked schemes view
├── compare.html                   # Side-by-side comparison matrix
├── profile.html                   # Demographic profile editor & completeness tracker
├── server.js                      # Zero-config Node HTTP static server + Gemini /api/chat proxy
└── package.json                   # Node ESM config ("type": "module", scripts: start/dev)
```

---

## 🔐 Session & Storage Keys (`localStorage`)

| Key | Purpose |
| :--- | :--- |
| `yojanasetu_auth_session` | Active citizen or Guest Trial session (`timestamp`, `loginMethod`, 7-day expiry check) |
| `yojanasetu_citizen_profile` | Demographic fields (name, age, gender, state, occupation, income, landholding, BPL flag) |
| `yojanasetu_saved_schemes` | Array of bookmarked scheme IDs |
| `yojanasetu_compare_schemes` | Array of scheme IDs selected for side-by-side comparison |
| `yojanasetu_doc_checklist` | Per-scheme document readiness checkboxes |
| `yojanasetu_theme` | `"light"` or `"dark"` UI theme preference |
| `yojanasetu_gemini_key` | Optional client-entered Gemini API key fallback |

---

## 🚀 Running Locally

### 1. Install Dependencies
```bash
cd Web_Application
npm install
```

### 2. (Optional) Configure Gemini AI Key
Create a `.env` file inside `Web_Application/`:
```env
GEMINI_API_KEY=your_google_gemini_api_key_here
PORT=3000
```
*(If port `3000` is occupied, `server.js` automatically tries consecutive ports up to `3050`, or you can pass `--port 3001`.)*

### 3. Start the Server
```bash
npm start
```
Open **`http://localhost:3000`** in your browser. By default, `/` serves `login.html`—you can sign in with the pre-filled demo account (`ramesh.farmer@yojanasetu.gov.in`), register a new citizen, or click **Skip Login & Explore in Guest Trial Mode**.
