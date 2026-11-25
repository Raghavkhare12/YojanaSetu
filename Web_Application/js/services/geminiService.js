import { CONFIG } from '../config.js';

export class GeminiService {
  static apiKey = "";

  static setApiKey(key) {
    this.apiKey = key ? key.trim() : "";
    if (this.apiKey) {
      localStorage.setItem("yojanasetu_gemini_key", this.apiKey);
    } else {
      localStorage.removeItem("yojanasetu_gemini_key");
    }
  }

  static getApiKey() {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem("yojanasetu_gemini_key") || "";
    }
    if (!this.apiKey && CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
      this.apiKey = CONFIG.GEMINI_API_KEY;
    }
    return this.apiKey;
  }

  static isConfigured() {
    // Enabled if either backend proxy is available OR client key is present
    const key = this.getApiKey();
    return Boolean(key && key.length > 10 && !key.startsWith("placeholder") && key !== "MY_GEMINI_API_KEY");
  }

  static async generateAdvice(userQuery, profile, schemes) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return { error: "You appear to be offline. Online Gemini AI requires an active internet connection." };
    }

    const key = this.getApiKey();
    let lastErrorMessage = "";

    // 1. First: Try Secure Backend Proxy (/api/chat)
    try {
      const proxyRes = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(key ? { "x-gemini-key": key } : {})
        },
        body: JSON.stringify({ userQuery, profile, schemes, apiKey: key })
      });

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData && proxyData.replyText) {
          return {
            replyText: proxyData.replyText,
            isPoweredByGemini: true,
            isSecureProxy: true
          };
        }
      } else {
        try {
          const errData = await proxyRes.json();
          if (errData?.error) lastErrorMessage = errData.error;
        } catch (_) {}
      }
    } catch (e) {
      // Backend proxy not running or static host, fallback to client-side call
    }

    // 2. Second: Fallback to Direct Client-Side Gemini Call (if client key is set)
    if (!key) {
      return {
        error: lastErrorMessage || "Gemini API is unavailable. Please ensure the backend server is running with a valid GEMINI_API_KEY or configure a key in the client."
      };
    }

    const schemeContext = schemes.map(s => `
- ID: ${s.id}
  Name: ${s.name} (${s.nameHindi})
  Sector: ${s.sector} | Level: ${s.level}
  Financial: ${s.financialBenefit}
  Eligibility: ${s.eligibilityCriteriaSummary}
  Target: ${s.targetBeneficiary} | Allowed Occupations: ${(s.allowedOccupations || []).join(",")}
  Min Age: ${s.minAge ?? "Any"}, Max Age: ${s.maxAge ?? "Any"}
  Max Income: ₹${s.maxAnnualIncome ? Math.round(s.maxAnnualIncome) : "No cap"}
  Documents: ${(s.requiredDocuments || []).join("; ")}
    `).join("\n");

    const systemInstruction = `
You are YojanaMitra, the personalized AI Government Scheme Advisor in the YojanaSetu portal.
Your task is to give accurate, empathetic, and personalized advice on Indian Government welfare schemes.

CITIZEN PROFILE:
- Name: ${profile.fullName}
- Age: ${profile.age} years | Gender: ${profile.gender}
- State: ${profile.state}, District: ${profile.district} (${profile.areaType} area)
- Occupation: ${profile.occupation}
- Annual Family Income: ₹${Math.round(profile.annualIncome)}
- Social Category: ${profile.casteCategory}
- Agricultural Land: ${profile.landHoldingHectares} Hectares
- Education: ${profile.educationLevel}
- BPL Ration Card: ${profile.hasBplRationCard ? "Yes" : "No"}
- Specially Abled (PwD): ${profile.isSpeciallyAbled ? "Yes" : "No"}

VERIFIED SCHEMES DATABASE:
${schemeContext}

GUIDELINES:
1. Always tailor recommendations to the citizen's specific profile.
2. If user asks about ration card, answer about PM Garib Kalyan Anna Yojana / NFSA Ration Card.
3. Highlight financial assistance amounts clearly.
4. Support English, Hindi, and Hinglish.
5. Keep answers concise, clear, and formatted with markdown bullet points and bold highlights.
    `;

    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userQuery }] }],
      generationConfig: { temperature: 0.3, topP: 0.95, topK: 40 }
    };

    const modelsToTry = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];

    for (const MODEL of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return {
              replyText: text,
              isPoweredByGemini: true
            };
          }
        } else {
          lastErrorMessage = `Gemini API returned HTTP ${response.status}.`;
        }
      } catch (err) {
        console.error(`Gemini client error for ${MODEL}:`, err);
        lastErrorMessage = err.message || "Network error contacting Gemini API.";
      }
    }

    return {
      error: lastErrorMessage || "Unable to get a response from Gemini API."
    };
  }
}
