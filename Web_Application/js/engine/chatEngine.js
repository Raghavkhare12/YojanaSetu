/**
 * Local RAG Chatbot Engine for YojanaSetu Website
 * Matches logic in SchemeChatEngine.kt
 */

import { EligibilityEngine } from './eligibilityEngine.js';

export class SchemeChatEngine {
  // Temporarily disabled: chatbot operates in online Gemini mode only
  static isTemporarilyDisabled = true;

  /**
   * Processes query in English, Hindi, or Hinglish using local RAG retrieval.
   * @param {string} userQuery 
   * @param {Array} schemes 
   * @param {Object|null} profile 
   * @returns {Object} BotReply { replyText, relatedSchemeId, suggestedPrompts }
   */
  static processQuery(userQuery, schemes, profile) {
    if (this.isTemporarilyDisabled) {
      return {
        replyText: "⚠️ Offline RAG chatbot mode is temporarily disabled. YojanaMitra AI currently operates in **online mode via Google Gemini** only.",
        relatedSchemeId: null,
        suggestedPrompts: []
      };
    }

    const queryLower = userQuery.toLowerCase().trim();

    // 1. Check for Greetings / Hello
    if (this.isGreeting(queryLower)) {
      const nameGreeting = profile && profile.fullName ? ` ${profile.fullName}` : "";
      return {
        replyText: `Namaste${nameGreeting}! 🙏 I am YojanaMitra, your dedicated AI Advisor for Indian Government Welfare Schemes.\n\n` +
          `How can I assist you today? You can ask in English, हिंदी, or Hinglish about:\n` +
          `• **Ration Card & Food Subsidy** (Free 5kg grain under PMGKAY/NFSA)\n` +
          `• **Farmer Entitlements** (PM-Kisan ₹6,000/yr, KCC 4% loans)\n` +
          `• **Healthcare** (Ayushman Bharat ₹5 Lakh cashless treatment)\n` +
          `• **Housing & Loans** (PMAY ₹1.20L grant, Mudra loans up to ₹20L)\n` +
          `• **Scholarships & Pensions** (Post-Matric, Pragati, Atal Pension)`,
        suggestedPrompts: [
          "How to apply for Ration Card?",
          "What schemes am I eligible for?",
          "Ayushman Bharat ₹5 Lakh card",
          "PM Kisan ₹6,000 status & eKYC"
        ]
      };
    }

    // 2. Check for Out-of-Scope Queries
    if (this.isOutOfScope(queryLower)) {
      return {
        replyText: `I apologize, but I am specifically designed to assist citizens with **Indian Government Schemes, welfare benefits, scholarships, and citizen entitlements**.\n\n` +
          `Please ask me about schemes like Ration Cards, PM-Kisan, Ayushman Bharat, PMAY Housing, Mudra loans, pensions, or scholarships!`,
        suggestedPrompts: [
          "What schemes am I eligible for?",
          "Ration card eligibility & documents",
          "Atal Pension Yojana details"
        ]
      };
    }

    // 3. Priority Topic 1: Ration Card / Rashan Card / PMGKAY Food Subsidy
    if (this.isRationCardQuery(queryLower)) {
      const rationScheme = schemes.find(s => s.id === "PM_GKAY_RATION");
      const stateName = profile?.state || "your state";
      const hasCardText = profile?.hasBplRationCard
        ? "You have indicated holding a BPL Ration Card in your profile."
        : "You can apply for a new card based on your family income.";

      const reply = `🍚 **Ration Card & PM Garib Kalyan Anna Yojana (PMGKAY / NFSA):**\n\n` +
        `Under the National Food Security Act (NFSA) and PMGKAY, the Government provides **100% Free Foodgrains**:\n` +
        `• **Priority Household (PHH) Card:** 5 kg free foodgrains (wheat/rice/coarse grains) per member every month.\n` +
        `• **Antyodaya Anna Yojana (AAY) Card:** 35 kg free foodgrains per family every month (for the poorest families).\n` +
        `• **One Nation One Ration Card (ONORC):** Migrant workers can collect their ration anywhere across 5.3 Lakh ration shops in India using biometric Aadhaar.\n\n` +
        `📌 **Current Profile Note:** ${hasCardText}\n\n` +
        `📋 **Documents Required to Apply for Ration Card:**\n` +
        `  ☑ Aadhaar Cards of all family members (Mandatory for biometric seeding)\n` +
        `  ☑ Proof of Address (Electricity bill, Voter ID, or Gram Panchayat certificate)\n` +
        `  ☑ Family Income Certificate (Issued by Tehsildar / Revenue Authority)\n` +
        `  ☑ Bank Passbook in the name of the female head of the family\n` +
        `  ☑ Joint passport-size family photograph\n\n` +
        `📝 **How to Apply in ${stateName}:**\n` +
        `1. Visit your state Food & Civil Supplies portal (or **nfsa.gov.in**) or walk into your nearest CSC Center / Tehsil Food Office.\n` +
        `2. Submit the New Ration Card Application Form with member details and Aadhaar numbers.\n` +
        `3. After verification by the Food Supply Inspector, your digital ration card / NFSA slip is issued.\n\n` +
        `📞 **National Food & PDS Helpline:** Dial **1967** (Toll-Free)`;

      return {
        replyText: reply,
        relatedSchemeId: rationScheme?.id || "PM_GKAY_RATION",
        suggestedPrompts: [
          "Documents for Ration Card",
          "How to link Aadhaar with Ration Card?",
          "Check my scheme eligibility"
        ]
      };
    }

    // 4. Check for "My eligibility / What schemes for me"
    if (this.isProfileQuery(queryLower) && profile) {
      const evaluated = EligibilityEngine.evaluateAll(schemes, profile);
      const topMatches = evaluated.filter(e => e.matchStatus === "ELIGIBLE").slice(0, 3);
      const partial = evaluated.filter(e => e.matchStatus === "PARTIALLY_ELIGIBLE").slice(0, 2);

      let sb = `Based on your profile (**${profile.occupation}**, Age **${profile.age}**, Income **₹${Math.round(profile.annualIncome).toLocaleString('en-IN')}**, State **${profile.state}**):\n\n`;

      if (topMatches.length > 0) {
        sb += `✅ **Top Recommended Schemes (100% Eligible):**\n`;
        topMatches.forEach(evalObj => {
          sb += `• **${evalObj.scheme.name}**\n  _${evalObj.scheme.tagline}_\n  💰 ${evalObj.scheme.financialBenefit.substring(0, 90)}...\n\n`;
        });
      }

      if (partial.length > 0) {
        sb += `⚠️ **Potential Additional Matches:**\n`;
        partial.forEach(evalObj => {
          sb += `• **${evalObj.scheme.name}** (${evalObj.matchPercentage}% match)\n  Check: ${evalObj.missingCriteria[0] || "Details"}\n\n`;
        });
      }

      sb += `Click any scheme below to view step-by-step application guidance!`;

      return {
        replyText: sb,
        relatedSchemeId: topMatches[0]?.scheme?.id || null,
        suggestedPrompts: [
          `Required documents for ${topMatches[0]?.scheme?.name || "PM-KISAN"}`,
          "How to apply for Ration Card?",
          "Ayushman Bharat ₹5 Lakh card"
        ]
      };
    }

    // 5. Scheme RAG Retrieval Search
    const matchedScheme = this.findBestMatchingScheme(queryLower, schemes);

    if (matchedScheme) {
      // Check if user is asking specifically about documents
      if (this.isDocumentQuery(queryLower)) {
        const docsList = matchedScheme.requiredDocuments.map(d => `  ☑ ${d}`).join("\n");
        return {
          replyText: `📄 **Required Documents for ${matchedScheme.name} (${matchedScheme.nameHindi}):**\n\n${docsList}\n\n` +
            `💡 *Tip: Use the interactive Document Checklist in the Scheme Details view to track your application readiness!*`,
          relatedSchemeId: matchedScheme.id,
          suggestedPrompts: [
            `How to apply for ${matchedScheme.name}?`,
            `What are the financial benefits?`,
            `Helpline number for ${matchedScheme.name}`
          ]
        };
      }

      // Check if user is asking specifically about how to apply
      if (this.isApplicationQuery(queryLower)) {
        const stepsList = matchedScheme.applicationSteps.map((step, idx) => `${idx + 1}. ${step}`).join("\n\n");
        return {
          replyText: `📝 **Step-by-Step Application Guide for ${matchedScheme.name}:**\n\n${stepsList}\n\n` +
            `🌐 **Official Portal:** ${matchedScheme.officialPortalUrl}\n` +
            `📞 **Toll-Free Helpline:** ${matchedScheme.helplineNumber}`,
          relatedSchemeId: matchedScheme.id,
          suggestedPrompts: [
            "Check required documents",
            `Am I eligible for ${matchedScheme.name}?`,
            "Find more schemes"
          ]
        };
      }

      // Default scheme overview
      const reply = `🏛️ **${matchedScheme.name}**\n` +
        `_${matchedScheme.nameHindi}_\n\n` +
        `📌 **Sector:** ${matchedScheme.sector} | **Level:** ${matchedScheme.level}\n` +
        `🏢 **Ministry:** ${matchedScheme.ministry}\n\n` +
        `💰 **Financial Benefits:**\n${matchedScheme.financialBenefit}\n\n` +
        `👥 **Eligibility:**\n${matchedScheme.eligibilityCriteriaSummary}\n\n` +
        `🌐 **Official Portal:** ${matchedScheme.officialPortalUrl}\n` +
        `📞 **Helpline:** ${matchedScheme.helplineNumber}`;

      return {
        replyText: reply,
        relatedSchemeId: matchedScheme.id,
        suggestedPrompts: [
          `Documents for ${matchedScheme.name}`,
          `How to apply for ${matchedScheme.name}`,
          `Is there any age or income limit?`
        ]
      };
    }

    // 6. Keyword Topic Categorization
    if (queryLower.includes("kisan") || queryLower.includes("farmer") || queryLower.includes("kheti") || queryLower.includes("krishi")) {
      return {
        replyText: `🌾 **Key Government Schemes for Farmers (किसान कल्याण):**\n\n` +
          `1. **PM Kisan Samman Nidhi (PM-KISAN):** ₹6,000/year direct cash transfer in 3 installments of ₹2,000.\n` +
          `2. **Kisan Credit Card (KCC):** Institutional farm credit up to ₹3 Lakh at an effective 4% interest rate.\n` +
          `3. **PM Awas Yojana (Gramin):** ₹1.20 Lakh grant to build a pucca permanent rural home.\n` +
          `4. **PM Garib Kalyan Anna Yojana:** Free monthly ration (5kg/person) for small & marginal farmers.\n\n` +
          `Would you like to check documents or application steps for any of these?`,
        relatedSchemeId: "PM_KISAN",
        suggestedPrompts: [
          "PM Kisan document checklist",
          "Kisan Credit Card details",
          "Ration card for farmers"
        ]
      };
    }

    if (queryLower.includes("student") || queryLower.includes("scholarship") || queryLower.includes("college") || queryLower.includes("padhai") || queryLower.includes("shiksha")) {
      return {
        replyText: `🎓 **Key Government Schemes for Students & Education:**\n\n` +
          `1. **Post-Matric Scholarship for SC/ST/OBC:** 100% course tuition fee waiver + monthly maintenance allowance.\n` +
          `2. **AICTE Pragati Scholarship for Girls:** ₹50,000 per year for technical degree and diploma students.\n\n` +
          `Applications are submitted centrally through the **National Scholarship Portal (scholarships.gov.in)**.`,
        relatedSchemeId: "POST_MATRIC_SCHOLARSHIP",
        suggestedPrompts: [
          "Documents for Post-Matric Scholarship",
          "Pragati Scholarship for Girls",
          "Income limit for scholarship"
        ]
      };
    }

    if (queryLower.includes("health") || queryLower.includes("ilaj") || queryLower.includes("hospital") || queryLower.includes("bimari") || queryLower.includes("ayushman") || queryLower.includes("dawa")) {
      return {
        replyText: `🏥 **Ayushman Bharat PM-JAY (₹5 Lakh Health Cover):**\n\n` +
          `• Provides **₹5,00,000 cashless hospitalization** coverage per family per year.\n` +
          `• Accepted at over 27,000 empaneled hospitals across India.\n` +
          `• Covers all pre-existing diseases, surgeries, and medicines.\n` +
          `• All senior citizens aged 70+ are now also eligible under the universal expansion!\n\n` +
          `Download your Ayushman PVC card from **beneficiary.nha.gov.in** or call **14555**.`,
        relatedSchemeId: "AYUSHMAN_BHARAT",
        suggestedPrompts: [
          "How to get Ayushman card online?",
          "Ayushman Bharat documents",
          "Helpline for PM-JAY"
        ]
      };
    }

    if (queryLower.includes("business") || queryLower.includes("loan") || queryLower.includes("dukaan") || queryLower.includes("mudra") || queryLower.includes("vendor") || queryLower.includes("karobaar")) {
      return {
        replyText: `💼 **Government Business & Livelihood Schemes:**\n\n` +
          `1. **PM MUDRA Yojana:** Collateral-free loans up to ₹20 Lakhs (Shishu up to ₹50k, Kishore ₹5L, Tarun ₹20L).\n` +
          `2. **PM SVANidhi:** Micro-loans of ₹10k, ₹20k & ₹50k with 7% interest subsidy for street vendors and small traders.\n` +
          `3. **PM Vishwakarma:** ₹15,000 toolkit voucher + ₹3 Lakh credit at 5% for traditional craftspeople.\n` +
          `4. **Stand-Up India:** ₹10 Lakh to ₹1 Crore for SC/ST and Women entrepreneurs.`,
        relatedSchemeId: "PM_MUDRA",
        suggestedPrompts: [
          "Mudra loan documents",
          "PM SVANidhi for street vendors",
          "PM Vishwakarma toolkit grant"
        ]
      };
    }

    // Generic fallback
    return {
      replyText: `I can help you find and apply for Central and State government welfare schemes. You can ask about:\n\n` +
        `• **Ration Card:** *'How to apply for Ration Card'* or *'Free grain quota'*\n` +
        `• **Farmer Schemes:** *'PM Kisan registration'* or *'Kisan Credit Card'*\n` +
        `• **Healthcare:** *'Ayushman Bharat ₹5 Lakh card eligibility'*\n` +
        `• **Housing:** *'PMAY Gramin ₹1.20 Lakh housing grant'*\n` +
        `• **Loans:** *'Mudra loan for shopkeeper'* or *'SVANidhi vendor loan'*\n\n` +
        `Or explore our **Schemes Catalogue** to filter by state, income, and occupation!`,
      suggestedPrompts: [
        "How to apply for Ration Card?",
        "Show all schemes for farmers",
        "Ayushman Bharat details",
        "Atal Pension Yojana"
      ]
    };
  }

  static isGreeting(q) {
    return /^(hi|hello|hey|namaste|pranam|ram ram|kese ho|how are you|good morning|good evening)/i.test(q);
  }

  static isOutOfScope(q) {
    const words = [
      "cricket score", "ipl", "movie", "recipe", "python code", "java code",
      "weather forecast", "who won", "bitcoin", "stock market prediction",
      "tell me a joke", "lyrics", "song", "capital of", "president of usa"
    ];
    return words.some(w => q.includes(w));
  }

  static isProfileQuery(q) {
    const triggers = [
      "my eligibility", "eligible for me", "schemes for me", "mere liye",
      "kya main eligible hu", "kon si scheme", "which scheme for me",
      "recommend for me", "meri eligibility", "suitable schemes"
    ];
    return triggers.some(t => q.includes(t));
  }

  static isDocumentQuery(q) {
    const triggers = ["document", "kagaz", "papers", "pramaan patra", "proof", "checklist", "kya lagega", "dastavej"];
    return triggers.some(t => q.includes(t));
  }

  static isApplicationQuery(q) {
    const triggers = ["apply", "how to apply", "aavedan", "process", "steps", "kaise kare", "procedure", "form", "kaise banaye"];
    return triggers.some(t => q.includes(t));
  }

  static isRationCardQuery(q) {
    const triggers = [
      "rashan", "ration", "rashan card", "ration card", "bpl card",
      "antyodaya", "aay", "phh", "khadya", "food grain", "anaj",
      "pmgkay", "garib kalyan anna", "one nation one ration card", "onorc",
      "ration quota", "ration shop", "fps"
    ];
    return triggers.some(t => q.includes(t));
  }

  static findBestMatchingScheme(q, schemes) {
    if (q.includes("rashan") || q.includes("ration") || q.includes("pmgkay") || q.includes("anna yojana") || q.includes("khadya")) {
      return schemes.find(s => s.id === "PM_GKAY_RATION");
    }
    if (q.includes("pm kisan") || q.includes("pm-kisan") || q.includes("samman nidhi") || (q.includes("kisan") && !q.includes("credit") && !q.includes("kcc"))) {
      return schemes.find(s => s.id === "PM_KISAN");
    }
    if (q.includes("kcc") || (q.includes("credit") && q.includes("card")) || q.includes("crop loan")) {
      return schemes.find(s => s.id === "KISAN_CREDIT_CARD");
    }
    if (q.includes("ayushman") || q.includes("pmjay") || q.includes("pm-jay") || q.includes("golden card") || (q.includes("health") && q.includes("card"))) {
      return schemes.find(s => s.id === "AYUSHMAN_BHARAT");
    }
    if (q.includes("awas") || q.includes("pmay") || q.includes("makan") || q.includes("ghar banana") || q.includes("housing")) {
      return schemes.find(s => s.id === "PMAY_GRAMIN");
    }
    if (q.includes("mudra") || q.includes("shishu loan") || q.includes("tarun loan") || q.includes("kishore loan")) {
      return schemes.find(s => s.id === "PM_MUDRA");
    }
    if (q.includes("sukanya") || q.includes("ssy") || (q.includes("girl") && q.includes("savings"))) {
      return schemes.find(s => s.id === "SUKANYA_SAMRIDDHI");
    }
    if (q.includes("vishwakarma") || q.includes("karigar") || q.includes("artisan") || q.includes("toolkit")) {
      return schemes.find(s => s.id === "PM_VISHWAKARMA");
    }
    if (q.includes("svanidhi") || q.includes("street vendor") || q.includes("thela") || q.includes("rehri")) {
      return schemes.find(s => s.id === "PM_SVANIDHI");
    }
    if (q.includes("atal pension") || q.includes("apy") || (q.includes("pension") && q.includes("60"))) {
      return schemes.find(s => s.id === "ATAL_PENSION");
    }
    if (q.includes("ujjwala") || q.includes("cylinder") || (q.includes("free") && q.includes("gas"))) {
      return schemes.find(s => s.id === "PM_UJJWALA");
    }
    if (q.includes("pragati") || (q.includes("aicte") && q.includes("girl"))) {
      return schemes.find(s => s.id === "PRAGATI_SCHOLARSHIP");
    }
    if (q.includes("post matric") || (q.includes("scholarship") && (q.includes("sc") || q.includes("obc") || q.includes("college")))) {
      return schemes.find(s => s.id === "POST_MATRIC_SCHOLARSHIP");
    }
    if (q.includes("jeevan jyoti") || q.includes("pmjjby") || q.includes("life insurance")) {
      return schemes.find(s => s.id === "PM_JEEVAN_JYOTI");
    }
    if (q.includes("stand up") || q.includes("standup")) {
      return schemes.find(s => s.id === "STAND_UP_INDIA");
    }
    if (q.includes("nrega") || q.includes("mgnrega") || q.includes("majdoor") || q.includes("100 din")) {
      return schemes.find(s => s.id === "MGNREGA");
    }

    const stopWords = new Set([
      "card", "cards", "scheme", "schemes", "yojana", "yojna", "yojnas",
      "india", "bharat", "pradhan", "mantri", "national", "state",
      "central", "government", "sarkari", "online", "apply", "details",
      "information", "about", "what", "which", "give", "tell"
    ]);

    return schemes.find(scheme => {
      const schemeTokens = scheme.name.toLowerCase()
        .replace(/[()-]/g, " ")
        .split(" ")
        .filter(t => t.length >= 4 && !stopWords.has(t));

      return schemeTokens.some(token => q.includes(token));
    });
  }
}
