/**
 * Eligibility Engine for YojanaSetu Website
 * Matches logic in EligibilityEngine.kt
 */

export const MatchStatus = {
  ELIGIBLE: "ELIGIBLE",
  PARTIALLY_ELIGIBLE: "PARTIALLY_ELIGIBLE",
  NOT_ELIGIBLE: "NOT_ELIGIBLE"
};

export class EligibilityEngine {
  /**
   * Evaluates a single scheme against a citizen profile.
   * @param {Object} scheme 
   * @param {Object} profile 
   */
  static evaluate(scheme, profile) {
    const matchedReasons = [];
    const missingCriteria = [];
    let totalPoints = 0;
    let earnedPoints = 0;

    // 1. Age Evaluation
    totalPoints += 15;
    const minAge = scheme.minAge ?? 0;
    const maxAge = scheme.maxAge ?? 120;
    const userAge = parseInt(profile.age, 10) || 0;

    if (userAge >= minAge && userAge <= maxAge) {
      earnedPoints += 15;
      matchedReasons.push(`Age ${userAge} is within eligible range (${minAge} - ${maxAge} years)`);
    } else {
      missingCriteria.push(`Age must be between ${minAge} and ${maxAge} years (current: ${userAge})`);
    }

    // 2. Gender Evaluation
    totalPoints += 20;
    const allowedGenders = scheme.allowedGenders || ["All"];
    const genderMatches = allowedGenders.includes("All") ||
      allowedGenders.some(g => g.toLowerCase() === (profile.gender || "").toLowerCase());

    if (genderMatches) {
      earnedPoints += 20;
      if (!allowedGenders.includes("All")) {
        matchedReasons.push(`Gender matches required beneficiary profile (${profile.gender})`);
      } else {
        matchedReasons.push("Open to all genders");
      }
    } else {
      missingCriteria.push(`Reserved exclusively for ${allowedGenders.join("/")} beneficiaries`);
    }

    // 3. Occupation Evaluation
    totalPoints += 25;
    const allowedOccupations = scheme.allowedOccupations || ["All"];
    const occMatches = allowedOccupations.includes("All") ||
      allowedOccupations.some(o => o.toLowerCase() === (profile.occupation || "").toLowerCase());

    if (occMatches) {
      earnedPoints += 25;
      if (!allowedOccupations.includes("All")) {
        matchedReasons.push(`Occupation matches: ${profile.occupation}`);
      } else {
        matchedReasons.push(`Valid for your occupation (${profile.occupation})`);
      }
    } else {
      missingCriteria.push(`Targeted for ${allowedOccupations.join(", ")} (current: ${profile.occupation})`);
    }

    // 4. Annual Income Evaluation
    totalPoints += 20;
    const annualIncome = parseFloat(profile.annualIncome) || 0;
    if (scheme.maxAnnualIncome === null || scheme.maxAnnualIncome === undefined) {
      earnedPoints += 20;
      matchedReasons.push("No upper income cap or restriction");
    } else {
      if (annualIncome <= scheme.maxAnnualIncome) {
        earnedPoints += 20;
        matchedReasons.push(`Income (₹${Math.round(annualIncome).toLocaleString('en-IN')}) is below ceiling of ₹${Math.round(scheme.maxAnnualIncome).toLocaleString('en-IN')}`);
      } else {
        missingCriteria.push(`Annual income must be under ₹${Math.round(scheme.maxAnnualIncome).toLocaleString('en-IN')} (current: ₹${Math.round(annualIncome).toLocaleString('en-IN')})`);
      }
    }

    // 5. Caste Category Evaluation
    totalPoints += 10;
    const allowedCategories = scheme.allowedCategories || ["All"];
    const categoryMatches = allowedCategories.includes("All") ||
      allowedCategories.some(c => c.toLowerCase() === (profile.casteCategory || "").toLowerCase());

    if (categoryMatches) {
      earnedPoints += 10;
      if (!allowedCategories.includes("All")) {
        matchedReasons.push(`Eligible for ${profile.casteCategory} category`);
      } else {
        matchedReasons.push("Applicable across all social categories");
      }
    } else {
      missingCriteria.push(`Restricted to ${allowedCategories.join(", ")} categories`);
    }

    // 6. Landholding Evaluation
    const landHectares = parseFloat(profile.landHoldingHectares) || 0;
    if (scheme.requiresLand) {
      totalPoints += 10;
      if (landHectares > 0) {
        if (scheme.maxLandHectares === null || scheme.maxLandHectares === undefined || landHectares <= scheme.maxLandHectares) {
          earnedPoints += 10;
          matchedReasons.push(`Cultivable land record matches (${landHectares} Ha)`);
        } else {
          missingCriteria.push(`Landholding must be under ${scheme.maxLandHectares} Ha (current: ${landHectares} Ha)`);
        }
      } else {
        missingCriteria.push("Requires agricultural/cultivable landholding record");
      }
    }

    // Calculate final match score percentage
    const matchPercentage = Math.round((earnedPoints / totalPoints) * 100);

    let matchStatus;
    if (missingCriteria.length === 0) {
      matchStatus = MatchStatus.ELIGIBLE;
    } else if (missingCriteria.length === 1 && matchPercentage >= 70) {
      matchStatus = MatchStatus.PARTIALLY_ELIGIBLE;
    } else {
      matchStatus = MatchStatus.NOT_ELIGIBLE;
    }

    let recommendationSummary = "";
    if (matchStatus === MatchStatus.ELIGIBLE) {
      recommendationSummary = "High Match: You meet all verified eligibility rules for this scheme.";
    } else if (matchStatus === MatchStatus.PARTIALLY_ELIGIBLE) {
      recommendationSummary = `Potential Match: You meet most criteria, but review ${missingCriteria[0] || "specific clauses"}.`;
    } else {
      recommendationSummary = `Not Eligible based on current profile details (${missingCriteria.join("; ")}).`;
    }

    return {
      scheme,
      matchStatus,
      matchPercentage,
      matchedReasons,
      missingCriteria,
      recommendationSummary
    };
  }

  /**
   * Evaluates and sorts all schemes by eligibility and relevance.
   * @param {Array} schemes 
   * @param {Object} profile 
   */
  static evaluateAll(schemes, profile) {
    const evaluations = schemes.map(s => this.evaluate(s, profile));

    return evaluations.sort((a, b) => {
      // 1. Eligible first
      if (a.matchStatus === MatchStatus.ELIGIBLE && b.matchStatus !== MatchStatus.ELIGIBLE) return -1;
      if (a.matchStatus !== MatchStatus.ELIGIBLE && b.matchStatus === MatchStatus.ELIGIBLE) return 1;

      // 2. Partially eligible second
      if (a.matchStatus === MatchStatus.PARTIALLY_ELIGIBLE && b.matchStatus !== MatchStatus.PARTIALLY_ELIGIBLE) return -1;
      if (a.matchStatus !== MatchStatus.PARTIALLY_ELIGIBLE && b.matchStatus === MatchStatus.PARTIALLY_ELIGIBLE) return 1;

      // 3. Match percentage descending
      if (b.matchPercentage !== a.matchPercentage) return b.matchPercentage - a.matchPercentage;

      // 4. Scheme name alphabetical
      return a.scheme.name.localeCompare(b.scheme.name);
    });
  }
}
