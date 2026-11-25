/**
 * Main Application Logic for YojanaSetu Website
 * Supports multi-page navigation across index.html, catalogue.html, saved.html, compare.html, profile.html, login.html
 */

import { SCHEMES_DATA } from './data/schemesData.js';
import { EligibilityEngine, MatchStatus } from './engine/eligibilityEngine.js';
import { GeminiService } from './services/geminiService.js';
import { AuthManager } from './auth.js';

class YojanaSetuApp {
  constructor() {
    this.schemes = SCHEMES_DATA;
    this.profile = this.loadProfile();
    this.savedSchemeIds = new Set(this.loadSavedSchemes());
    this.compareSchemeIds = new Set(this.loadCompareSchemes());
    this.documentChecklistState = this.loadDocumentChecklistState();

    this.currentSectorFilter = "All";
    this.searchQuery = "";
    this.sortBy = "match";
    this.theme = localStorage.getItem("yojanasetu_theme") || "light";

    this.chatMessages = [
      {
        sender: "assistant",
        text: "Namaste! 🙏 I am YojanaMitra, your AI Advisor. Ask me anything about Indian Government welfare schemes, Ration Cards, PM-Kisan, Ayushman Bharat, or Mudra loans!"
      }
    ];

    this.initTheme();
    this.initDOM();
    this.bindEvents();
    AuthManager.requireAuth();
    AuthManager.updateUI();
    this.render();
  }

  // ==========================================
  // LocalStorage State Management
  // ==========================================
  loadProfile() {
    const saved = localStorage.getItem("yojanasetu_citizen_profile");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      profileName: "Primary (Self)",
      fullName: "Ramesh Kumar",
      age: 34,
      gender: "Male",
      state: "Uttar Pradesh",
      district: "Varanasi",
      areaType: "Rural",
      occupation: "Farmer",
      annualIncome: 180000,
      casteCategory: "OBC",
      isMinority: false,
      isSpeciallyAbled: false,
      maritalStatus: "Married",
      landHoldingHectares: 1.2,
      educationLevel: "12th Pass",
      hasBplRationCard: true
    };
  }

  saveProfile(updatedProfile) {
    this.profile = { ...this.profile, ...updatedProfile };
    localStorage.setItem("yojanasetu_citizen_profile", JSON.stringify(this.profile));
    this.render();
    this.showToast("Profile updated successfully!");
  }

  loadSavedSchemes() {
    const saved = localStorage.getItem("yojanasetu_saved_schemes");
    return saved ? JSON.parse(saved) : ["PM_KISAN", "AYUSHMAN_BHARAT"];
  }

  saveSavedSchemes() {
    localStorage.setItem("yojanasetu_saved_schemes", JSON.stringify([...this.savedSchemeIds]));
  }

  loadCompareSchemes() {
    const saved = localStorage.getItem("yojanasetu_compare_schemes");
    return saved ? JSON.parse(saved) : ["PM_KISAN", "AYUSHMAN_BHARAT"];
  }

  saveCompareSchemes() {
    localStorage.setItem("yojanasetu_compare_schemes", JSON.stringify([...this.compareSchemeIds]));
  }

  loadDocumentChecklistState() {
    const saved = localStorage.getItem("yojanasetu_doc_checklist");
    return saved ? JSON.parse(saved) : {};
  }

  saveDocumentChecklistState() {
    localStorage.setItem("yojanasetu_doc_checklist", JSON.stringify(this.documentChecklistState));
  }

  initTheme() {
    document.documentElement.setAttribute("data-theme", this.theme);
  }

  toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light";
    localStorage.setItem("yojanasetu_theme", this.theme);
    this.initTheme();
  }

  // ==========================================
  // DOM Cache
  // ==========================================
  initDOM() {
    this.elements = {
      themeToggleBtn: document.getElementById("themeToggleBtn"),
      apiKeyBtn: document.getElementById("apiKeyBtn"),
      userProfileBtn: document.getElementById("userProfileBtn"),
      savedCountBadge: document.getElementById("savedCountBadge"),
      
      // Profile elements
      profileAvatar: document.getElementById("profileAvatar"),
      profileNameText: document.getElementById("profileNameText"),
      profileMetaTags: document.getElementById("profileMetaTags"),
      completenessPercent: document.getElementById("completenessPercent"),
      editProfileBtn: document.getElementById("editProfileBtn"),

      // Controls
      searchInput: document.getElementById("searchInput"),
      voiceSearchBtn: document.getElementById("voiceSearchBtn"),
      sortSelect: document.getElementById("sortSelect"),
      sectorChipsContainer: document.getElementById("sectorChipsContainer"),

      // Containers
      schemesGrid: document.getElementById("schemesGrid"),
      sectionTitle: document.getElementById("sectionTitle"),
      comparisonContainer: document.getElementById("comparisonContainer"),

      // Modals
      schemeModal: document.getElementById("schemeModal"),
      profileModal: document.getElementById("profileModal"),

      // Chat Drawer
      chatDrawer: document.getElementById("chatDrawer"),
      chatToggleTrigger: document.getElementById("chatToggleTrigger"),
      closeChatBtn: document.getElementById("closeChatBtn"),
      chatMessagesContainer: document.getElementById("chatMessagesContainer"),
      chatInput: document.getElementById("chatInput"),
      sendChatBtn: document.getElementById("sendChatBtn"),
      chatPromptsContainer: document.getElementById("chatPromptsContainer"),
      
      toastContainer: document.getElementById("toastContainer")
    };
  }

  // ==========================================
  // Event Listeners
  // ==========================================
  bindEvents() {
    this.elements.themeToggleBtn?.addEventListener("click", () => this.toggleTheme());

    this.elements.apiKeyBtn?.addEventListener("click", () => {
      const current = GeminiService.getApiKey();
      const input = prompt("Enter your Google Gemini API Key (starts with AIzaSy...):", current);
      if (input !== null) {
        GeminiService.setApiKey(input);
        if (input.trim()) {
          this.showToast("Gemini API Key saved! Live AI features enabled.");
        } else {
          this.showToast("Gemini API Key cleared. Online Gemini mode requires a valid API key.");
        }
      }
    });

    this.elements.editProfileBtn?.addEventListener("click", () => {
      window.location.href = "profile.html";
    });

    this.elements.searchInput?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderSchemes();
    });

    this.elements.voiceSearchBtn?.addEventListener("click", () => {
      this.startVoiceRecognition();
    });

    this.elements.sortSelect?.addEventListener("change", (e) => {
      this.sortBy = e.target.value;
      this.renderSchemes();
    });

    const profileForm = document.getElementById("profileForm");
    profileForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(profileForm);
      const updated = {
        fullName: formData.get("fullName"),
        age: parseInt(formData.get("age"), 10) || 0,
        gender: formData.get("gender"),
        state: formData.get("state"),
        district: formData.get("district"),
        areaType: formData.get("areaType"),
        occupation: formData.get("occupation"),
        annualIncome: parseFloat(formData.get("annualIncome")) || 0,
        casteCategory: formData.get("casteCategory"),
        landHoldingHectares: parseFloat(formData.get("landHoldingHectares")) || 0,
        educationLevel: formData.get("educationLevel"),
        hasBplRationCard: formData.get("hasBplRationCard") === "true",
        isSpeciallyAbled: formData.get("isSpeciallyAbled") === "true"
      };
      this.saveProfile(updated);
    });

    this.elements.chatToggleTrigger?.addEventListener("click", () => {
      this.elements.chatDrawer.classList.toggle("active");
    });
    this.elements.closeChatBtn?.addEventListener("click", () => {
      this.elements.chatDrawer.classList.remove("active");
    });

    this.elements.sendChatBtn?.addEventListener("click", () => this.handleSendMessage());
    this.elements.chatInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleSendMessage();
    });

    document.querySelectorAll(".preset-profile-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const presetType = e.target.dataset.preset;
        this.loadPresetProfile(presetType);
      });
    });

    document.querySelectorAll(".modal-overlay").forEach(overlay => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.closeModal(overlay);
      });
    });

    document.querySelectorAll(".close-modal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const modal = btn.closest(".modal-overlay");
        if (modal) this.closeModal(modal);
      });
    });
  }

  // ==========================================
  // Rendering Core
  // ==========================================
  render() {
    this.renderProfileSummary();
    this.renderSectorChips();
    this.renderSchemes();
    this.renderComparison();
    this.renderChatMessages();
    this.updateBadges();
  }

  renderProfileSummary() {
    const p = this.profile;
    if (this.elements.profileAvatar) {
      this.elements.profileAvatar.textContent = p.fullName ? p.fullName.charAt(0).toUpperCase() : "U";
    }
    if (this.elements.profileNameText) {
      this.elements.profileNameText.textContent = `${p.fullName} (${p.occupation})`;
    }
    if (this.elements.profileMetaTags) {
      this.elements.profileMetaTags.innerHTML = `
        <span class="profile-tag">🎂 Age ${p.age}</span>
        <span class="profile-tag">📍 ${p.district}, ${p.state}</span>
        <span class="profile-tag">💰 ₹${Math.round(p.annualIncome).toLocaleString('en-IN')}/yr</span>
        <span class="profile-tag">🏷️ ${p.casteCategory}</span>
        ${p.hasBplRationCard ? '<span class="profile-tag" style="background:var(--success-bg);color:var(--success)">🍚 BPL Card Holder</span>' : ''}
        ${p.landHoldingHectares > 0 ? `<span class="profile-tag">🌾 ${p.landHoldingHectares} Ha Land</span>` : ''}
      `;
    }

    let filled = 0;
    const fields = [p.fullName, p.age, p.gender, p.state, p.district, p.occupation, p.annualIncome, p.casteCategory, p.educationLevel, p.maritalStatus];
    fields.forEach(f => { if (f) filled++; });
    const percent = Math.round((filled / fields.length) * 100);

    if (this.elements.completenessPercent) {
      this.elements.completenessPercent.textContent = `${percent}%`;
    }
  }

  renderSectorChips() {
    const sectors = ["All", "Agriculture", "Healthcare", "Education", "Housing", "Social Security", "Women & Child", "Business & Livelihood"];
    if (!this.elements.sectorChipsContainer) return;

    this.elements.sectorChipsContainer.innerHTML = sectors.map(sec => `
      <button class="chip ${this.currentSectorFilter === sec ? 'active' : ''}" data-sector="${sec}">
        ${sec}
      </button>
    `).join("");

    this.elements.sectorChipsContainer.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", (e) => {
        this.currentSectorFilter = e.target.dataset.sector;
        this.renderSectorChips();
        this.renderSchemes();
      });
    });
  }

  renderSchemes() {
    if (!this.elements.schemesGrid) return;

    const pagePath = window.location.pathname.toLowerCase();
    const isSavedPage = pagePath.includes("saved.html");

    const evaluatedList = EligibilityEngine.evaluateAll(this.schemes, this.profile);

    let filtered = evaluatedList;
    if (isSavedPage) {
      filtered = filtered.filter(item => this.savedSchemeIds.has(item.scheme.id));
    }

    if (this.currentSectorFilter !== "All") {
      filtered = filtered.filter(item => item.scheme.sector === this.currentSectorFilter);
    }

    if (this.searchQuery) {
      filtered = filtered.filter(item => 
        item.scheme.name.toLowerCase().includes(this.searchQuery) ||
        item.scheme.nameHindi.toLowerCase().includes(this.searchQuery) ||
        item.scheme.tagline.toLowerCase().includes(this.searchQuery) ||
        item.scheme.sector.toLowerCase().includes(this.searchQuery)
      );
    }

    if (this.sortBy === "benefit") {
      filtered.sort((a, b) => (b.scheme.financialBenefit || "").length - (a.scheme.financialBenefit || "").length);
    } else if (this.sortBy === "name") {
      filtered.sort((a, b) => a.scheme.name.localeCompare(b.scheme.name));
    }

    if (filtered.length === 0) {
      this.elements.schemesGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border-color);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3>No Welfare Schemes Found</h3>
          <p style="color: var(--text-muted); margin-top: 0.5rem;">Try clearing search filters or changing the sector category.</p>
        </div>
      `;
      return;
    }

    this.elements.schemesGrid.innerHTML = filtered.map(item => this.createSchemeCardHTML(item)).join("");

    this.elements.schemesGrid.querySelectorAll(".btn-view-details").forEach(btn => {
      btn.addEventListener("click", () => {
        const schemeId = btn.dataset.id;
        this.openSchemeDetailModal(schemeId);
      });
    });

    this.elements.schemesGrid.querySelectorAll(".btn-bookmark").forEach(btn => {
      btn.addEventListener("click", () => {
        const schemeId = btn.dataset.id;
        this.toggleSaveScheme(schemeId);
      });
    });

    this.elements.schemesGrid.querySelectorAll(".btn-compare").forEach(btn => {
      btn.addEventListener("click", () => {
        const schemeId = btn.dataset.id;
        this.toggleCompareScheme(schemeId);
      });
    });
  }

  createSchemeCardHTML(item) {
    const s = item.scheme;
    const isSaved = this.savedSchemeIds.has(s.id);
    const isComparing = this.compareSchemeIds.has(s.id);

    let badgeClass = "eligible";
    let badgeText = `${item.matchPercentage}% Eligible`;
    if (item.matchStatus === MatchStatus.PARTIALLY_ELIGIBLE) {
      badgeClass = "partially_eligible";
      badgeText = `${item.matchPercentage}% Potential`;
    } else if (item.matchStatus === MatchStatus.NOT_ELIGIBLE) {
      badgeClass = "not_eligible";
      badgeText = `Not Eligible`;
    }

    const reasonsHTML = item.matchedReasons.slice(0, 2).map(r => `
      <div class="reason-item match" style="color:var(--success);font-size:0.8rem;margin-top:0.2rem;">✔ ${r}</div>
    `).join("") + item.missingCriteria.slice(0, 1).map(m => `
      <div class="reason-item missing" style="color:var(--warning);font-size:0.8rem;margin-top:0.2rem;">✖ ${m}</div>
    `).join("");

    return `
      <div class="scheme-card" data-id="${s.id}">
        <div>
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;margin-bottom:0.75rem;">
            <div>
              <h3 style="font-size:1.15rem;font-weight:700;">${s.name}</h3>
              <div style="font-size:0.85rem;color:var(--text-muted);">${s.nameHindi}</div>
            </div>
            <span class="match-badge ${badgeClass}">${badgeText}</span>
          </div>

          <p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:1rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${s.tagline}</p>

          <div class="scheme-benefit-box">
            💰 <strong>Benefit:</strong> ${s.financialBenefit}
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:1rem;">
            <span style="background:var(--bg-tertiary);font-size:0.75rem;padding:0.2rem 0.5rem;border-radius:var(--radius-sm);">🏷️ ${s.sector}</span>
            <span style="background:var(--bg-tertiary);font-size:0.75rem;padding:0.2rem 0.5rem;border-radius:var(--radius-sm);">🏛️ ${s.level}</span>
          </div>

          <div style="border-top:1px dashed var(--border-color);padding-top:0.5rem;margin-bottom:1rem;">
            ${reasonsHTML}
          </div>
        </div>

        <div class="scheme-card-actions">
          <div style="display:flex;gap:0.5rem;">
            <button class="icon-btn btn-bookmark ${isSaved ? 'active' : ''}" data-id="${s.id}" title="${isSaved ? 'Remove Bookmark' : 'Save Scheme'}">
              ${isSaved ? '★' : '☆'}
            </button>
            <button class="icon-btn btn-compare ${isComparing ? 'active' : ''}" data-id="${s.id}" title="Compare Side-by-Side">
              ⚖️
            </button>
          </div>
          <button class="btn-primary btn-view-details" data-id="${s.id}">
            View Details & Apply →
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================
  // Scheme Detail Modal & Checklist
  // ==========================================
  openSchemeDetailModal(schemeId) {
    const s = this.schemes.find(x => x.id === schemeId);
    if (!s) return;

    const evalObj = EligibilityEngine.evaluate(s, this.profile);
    const body = document.getElementById("schemeModalBody");
    const title = document.getElementById("schemeModalTitle");

    title.textContent = s.name;

    const docState = this.documentChecklistState[s.id] || {};

    const docsHTML = s.requiredDocuments.map((doc, idx) => {
      const isChecked = docState[doc] === true;
      return `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid var(--border-color);">
          <input type="checkbox" id="doc_${s.id}_${idx}" data-scheme="${s.id}" data-doc="${doc}" ${isChecked ? 'checked' : ''} style="width:18px;height:18px;">
          <label for="doc_${s.id}_${idx}">${doc}</label>
        </div>
      `;
    }).join("");

    const stepsHTML = s.applicationSteps.map((step, idx) => `
      <div style="position:relative;padding-left:2rem;margin-bottom:1.25rem;">
        <div style="position:absolute;left:0;top:0;width:24px;height:24px;border-radius:50%;background:var(--accent-primary);color:white;font-size:0.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;">${idx + 1}</div>
        <p style="font-size:0.92rem;">${step}</p>
      </div>
    `).join("");

    body.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <span class="match-badge ${evalObj.matchStatus === 'ELIGIBLE' ? 'eligible' : 'partially_eligible'}">
          ${evalObj.matchPercentage}% Match - ${evalObj.recommendationSummary}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
        <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg);">
          <h4 style="margin-bottom: 0.5rem; color: var(--accent-primary);">💰 Financial Benefit</h4>
          <p style="font-size: 0.9rem;">${s.financialBenefit}</p>
        </div>
        <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg);">
          <h4 style="margin-bottom: 0.5rem; color: var(--info);">🎁 Non-Financial Support</h4>
          <p style="font-size: 0.9rem;">${s.nonFinancialBenefit}</p>
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h4>📋 Interactive Required Document Checklist</h4>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">Check off prepared documents:</p>
        <div style="background:var(--bg-tertiary);padding:1rem;border-radius:var(--radius-lg);">
          ${docsHTML}
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h4>📝 Step-by-Step Application Workflow</h4>
        <div style="margin-top:1rem;">
          ${stepsHTML}
        </div>
      </div>

      <div style="background: var(--bg-tertiary); padding: 1.25rem; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">Official Portal</div>
          <a href="${s.officialPortalUrl}" target="_blank" style="font-weight: 700; font-size: 1rem;">${s.officialPortalUrl} 🔗</a>
        </div>
        <div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">Toll-Free Helpline</div>
          <div style="font-weight: 700; font-size: 1rem; color: var(--success);">📞 ${s.helplineNumber}</div>
        </div>
        <a href="${s.officialPortalUrl}" target="_blank" class="btn-primary" style="text-decoration: none;">
          Apply Online Now ↗
        </a>
      </div>
    `;

    body.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener("change", (e) => {
        const schemeKey = e.target.dataset.scheme;
        const docKey = e.target.dataset.doc;
        if (!this.documentChecklistState[schemeKey]) {
          this.documentChecklistState[schemeKey] = {};
        }
        this.documentChecklistState[schemeKey][docKey] = e.target.checked;
        this.saveDocumentChecklistState();
      });
    });

    this.openModal(this.elements.schemeModal);
  }

  // ==========================================
  // Comparison Rendering
  // ==========================================
  toggleCompareScheme(schemeId) {
    if (this.compareSchemeIds.has(schemeId)) {
      this.compareSchemeIds.delete(schemeId);
      this.showToast("Removed from comparison list");
    } else {
      if (this.compareSchemeIds.size >= 3) {
        this.showToast("You can compare maximum 3 schemes side-by-side.");
        return;
      }
      this.compareSchemeIds.add(schemeId);
      this.showToast("Added to comparison list!");
    }
    this.saveCompareSchemes();
    this.render();
  }

  renderComparison() {
    const container = this.elements.comparisonContainer;
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 2rem; background: var(--bg-card); border-radius: var(--radius-xl); border: 1px dashed var(--border-color); box-shadow: var(--shadow-sm);">
        <div style="font-size: 3.5rem; margin-bottom: 1rem;">🚧</div>
        <span style="display: inline-block; background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning); font-size: 0.8rem; font-weight: 700; padding: 0.25rem 0.85rem; border-radius: var(--radius-full); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em;">In Progress</span>
        <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">In Progress</h2>
        <p style="color: var(--text-muted); max-width: 480px; margin: 0 auto 1.5rem;">The Side-by-Side Scheme Comparison feature is currently in progress. Please check back soon.</p>
        <a href="catalogue.html" class="btn-primary">📚 Browse Schemes Catalogue</a>
      </div>
    `;
  }

  // ==========================================
  // Chatbot Logic
  // ==========================================
  // Chatbot Logic & Markdown Formatter
  // ==========================================
  escapeHTML(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  formatMarkdown(text) {
    if (!text) return "";
    let html = this.escapeHTML(text);

    // Format bold **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Format italic *text* or _text_ -> <em>text</em>
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Headers: ### Title or ## Title
    html = html.replace(/^### (.*$)/gim, '<div style="font-weight:700;font-size:0.95rem;margin-top:0.4rem;color:var(--accent-primary);">$1</div>');
    html = html.replace(/^## (.*$)/gim, '<div style="font-weight:800;font-size:1rem;margin-top:0.5rem;color:var(--accent-primary);">$1</div>');

    // Convert bullet points starting with •, -, * into formatted divs
    html = html.replace(/^[\s]*[•\-\*][\s]+(.*)$/gm, '<div class="chat-bullet" style="margin-left:0.5rem;margin-top:0.25rem;">• $1</div>');

    // Convert numbered lists 1. 2. 3.
    html = html.replace(/^[\s]*(\d+)\.[\s]+(.*)$/gm, '<div class="chat-number" style="margin-left:0.5rem;margin-top:0.25rem;"><strong>$1.</strong> $2</div>');

    // Convert URLs to clickable links
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary);text-decoration:underline;">$1</a>');

    // Convert newlines to <br>
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/<\/div><br>/g, '</div>');

    return html;
  }

  renderChatMessages() {
    const container = this.elements.chatMessagesContainer;
    if (!container) return;

    container.innerHTML = this.chatMessages.map(msg => `
      <div class="chat-msg ${msg.sender}">
        ${msg.sender === 'assistant' ? this.formatMarkdown(msg.text) : this.escapeHTML(msg.text)}
      </div>
    `).join("");

    container.scrollTop = container.scrollHeight;
  }

  async handleSendMessage(customQuery = null) {
    const query = customQuery || (this.elements.chatInput ? this.elements.chatInput.value.trim() : "");
    if (!query) return;

    this.chatMessages.push({ sender: "user", text: query });
    if (this.elements.chatInput) this.elements.chatInput.value = "";
    this.renderChatMessages();

    this.chatMessages.push({ sender: "assistant", text: "YojanaMitra is thinking... 🤔" });
    this.renderChatMessages();

    let botReply = null;
    let isLiveGemini = false;

    const geminiResult = await GeminiService.generateAdvice(query, this.profile, this.schemes);
    if (geminiResult && geminiResult.replyText) {
      botReply = {
        replyText: geminiResult.replyText,
        suggestedPrompts: ["How to apply for Ration Card?", "What schemes am I eligible for?"]
      };
      isLiveGemini = true;
    }

    this.chatMessages.pop();

    let replyMessage;
    if (isLiveGemini && botReply) {
      replyMessage = `⚡ *[Live Gemini AI]*\n\n` + botReply.replyText;
    } else {
      const reason = geminiResult?.error ? `\n\n_Reason: ${geminiResult.error}_` : "";
      replyMessage = `⚠️ **YojanaMitra AI is Online-Only (Gemini)**\n\nUnable to connect to Google Gemini right now. Offline RAG chatbot mode is temporarily disabled — please ensure you are online and have a valid Gemini API key configured.${reason}`;
    }

    this.chatMessages.push({ sender: "assistant", text: replyMessage });
    this.renderChatMessages();

    if (botReply?.suggestedPrompts && this.elements.chatPromptsContainer) {
      this.elements.chatPromptsContainer.innerHTML = `
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.3rem;">Suggested Quick Queries:</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
          ${botReply.suggestedPrompts.map(p => `<button class="prompt-chip" data-prompt="${p}">${p}</button>`).join("")}
        </div>
      `;

      this.elements.chatPromptsContainer.querySelectorAll(".prompt-chip").forEach(btn => {
        btn.addEventListener("click", () => {
          this.handleSendMessage(btn.dataset.prompt);
        });
      });
    }
  }

  startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showToast("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    this.elements.voiceSearchBtn?.classList.add("listening");
    this.showToast("Listening... Speak now!");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (this.elements.searchInput) {
        this.elements.searchInput.value = transcript;
      }
      this.searchQuery = transcript.toLowerCase();
      this.renderSchemes();
      this.elements.voiceSearchBtn?.classList.remove("listening");
    };

    recognition.onerror = () => {
      this.elements.voiceSearchBtn?.classList.remove("listening");
      this.showToast("Could not recognize voice speech.");
    };

    recognition.start();
  }

  // ==========================================
  // Helpers
  // ==========================================
  toggleSaveScheme(schemeId) {
    if (this.savedSchemeIds.has(schemeId)) {
      this.savedSchemeIds.delete(schemeId);
      this.showToast("Removed scheme from bookmarks");
    } else {
      this.savedSchemeIds.add(schemeId);
      this.showToast("Saved scheme to bookmarks!");
    }
    this.saveSavedSchemes();
    this.updateBadges();
    this.renderSchemes();
  }

  updateBadges() {
    if (this.elements.savedCountBadge) {
      this.elements.savedCountBadge.textContent = this.savedSchemeIds.size;
    }
  }

  loadPresetProfile(type) {
    if (type === "farmer") {
      this.saveProfile({
        fullName: "Ramesh Kumar", age: 34, gender: "Male", state: "Uttar Pradesh", district: "Varanasi",
        occupation: "Farmer", annualIncome: 180000, casteCategory: "OBC", landHoldingHectares: 1.2, hasBplRationCard: true
      });
    } else if (type === "student") {
      this.saveProfile({
        fullName: "Priya Sharma", age: 19, gender: "Female", state: "Madhya Pradesh", district: "Bhopal",
        occupation: "Student", annualIncome: 120000, casteCategory: "SC", landHoldingHectares: 0, hasBplRationCard: true
      });
    } else if (type === "artisan") {
      this.saveProfile({
        fullName: "Vikram Vishwakarma", age: 42, gender: "Male", state: "Rajasthan", district: "Jaipur",
        occupation: "Artisan / Craftsman", annualIncome: 220000, casteCategory: "OBC", landHoldingHectares: 0, hasBplRationCard: true
      });
    }
  }

  openModal(modal) {
    if (modal) modal.classList.add("active");
  }

  closeModal(modal) {
    if (modal) modal.classList.remove("active");
  }

  showToast(message) {
    const toast = document.createElement("div");
    toast.style.cssText = `
      background: var(--accent-primary);
      color: white;
      padding: 0.75rem 1.25rem;
      border-radius: var(--radius-lg);
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      margin-top: 0.5rem;
    `;
    toast.textContent = message;

    if (this.elements.toastContainer) {
      this.elements.toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new YojanaSetuApp();
});
