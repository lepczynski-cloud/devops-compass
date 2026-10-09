(() => {
  "use strict";

  const DATA = window.COMPASS_DATA;
  const app = document.getElementById("app");
  if (!DATA || !app) return;

  const STORAGE_KEY = "devopsCompassState_v1";
  const SCHEMA_VERSION = 1;
  const TOTAL_STEPS = 5;
  const allowedStatuses = new Set(["not_started", "learning", "covered", "revisit"]);
  const knownProfiles = new Set(DATA.profiles.map((item) => item.id));
  const knownDirections = new Set(DATA.directions.map((item) => item.id));
  const knownAreas = new Set(DATA.areas.map((item) => item.id));
  const knownCapabilities = new Set(DATA.capabilities.map((item) => item.id));
  const knownSkills = new Set(DATA.skills.map((item) => item.id));
  const skillById = new Map(DATA.skills.map((item) => [item.id, item]));
  const profileById = new Map(DATA.profiles.map((item) => [item.id, item]));
  const directionById = new Map(DATA.directions.map((item) => [item.id, item]));
  const areaById = new Map(DATA.areas.map((item) => [item.id, item]));
  const capabilityById = new Map(DATA.capabilities.map((item) => [item.id, item]));
  const resourceById = new Map((DATA.resourceLibrary || []).map((item) => [item.id, item]));

  let view = "home";
  let wizardStep = 0;
  let validationMessage = "";
  let showDirectionHelp = false;
  let areasTouched = false;
  let deferredInstallPrompt = null;
  let toastTimer = null;
  let activeSkillId = null;
  let previousView = "dashboard";
  const openAssessmentAreas = new Set();

  const defaultLanguage = (navigator.language || "en").toLowerCase().startsWith("pl") ? "pl" : "en";
  const defaultTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

  function emptyState() {
    const now = new Date().toISOString();
    return {
      schemaVersion: SCHEMA_VERSION,
      appVersion: DATA.version,
      language: defaultLanguage,
      theme: defaultTheme,
      onboardingComplete: false,
      profile: null,
      direction: null,
      interests: [],
      selectedAreas: [],
      assessments: {},
      skillStatus: {},
      createdAt: now,
      updatedAt: now
    };
  }

  function normaliseState(candidate) {
    const base = emptyState();
    if (!candidate || typeof candidate !== "object") return base;

    base.language = candidate.language === "pl" ? "pl" : "en";
    base.theme = candidate.theme === "light" ? "light" : "dark";
    base.onboardingComplete = Boolean(candidate.onboardingComplete);
    base.profile = knownProfiles.has(candidate.profile) ? candidate.profile : null;
    base.direction = knownDirections.has(candidate.direction) ? candidate.direction : null;
    base.interests = Array.isArray(candidate.interests)
      ? candidate.interests.filter((id) => DATA.interests.some((item) => item.id === id)).slice(0, 2)
      : [];
    base.selectedAreas = Array.isArray(candidate.selectedAreas)
      ? [...new Set(candidate.selectedAreas.filter((id) => knownAreas.has(id)))]
      : [];

    if (candidate.assessments && typeof candidate.assessments === "object") {
      for (const [id, value] of Object.entries(candidate.assessments)) {
        if (knownCapabilities.has(id) && [0, 1, 2, 3].includes(value)) {
          base.assessments[id] = value;
        }
      }
    }

    if (candidate.skillStatus && typeof candidate.skillStatus === "object") {
      for (const [id, value] of Object.entries(candidate.skillStatus)) {
        if (knownSkills.has(id) && allowedStatuses.has(value)) {
          base.skillStatus[id] = value;
        }
      }
    }

    base.createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : base.createdAt;
    base.updatedAt = typeof candidate.updatedAt === "string" ? candidate.updatedAt : base.updatedAt;
    base.appVersion = DATA.version;
    if (!base.profile || !base.direction) base.onboardingComplete = false;
    return base;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normaliseState(JSON.parse(raw)) : emptyState();
    } catch (error) {
      console.warn("Could not read local progress.", error);
      return emptyState();
    }
  }

  let state = loadState();
  let draft = structuredCloneSafe(state);

  function structuredCloneSafe(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function saveState(showNotice = false) {
    state.updatedAt = new Date().toISOString();
    state.appVersion = DATA.version;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (showNotice) showToast(t("saved"));
    } catch (error) {
      console.warn("Could not save local progress.", error);
    }
  }

  function txt(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    return value[state.language] || value.en || "";
  }

  function t(key, params = {}) {
    let result = txt(DATA.i18n[key] || key);
    for (const [name, value] of Object.entries(params)) {
      result = result.replaceAll(`{${name}}`, String(value));
    }
    return result;
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function iconArrow() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
  }

  function iconDownload() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"></path></svg>';
  }

  function iconUpload() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V9M7 14l5-5 5 5M5 3h14"></path></svg>';
  }

  function iconEdit() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.7-10.7a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20ZM14.8 6.8l2.8 2.8"></path></svg>';
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = state.theme === "dark" ? "#07131a" : "#f4f8f7";
  }

  function updateStaticI18n() {
    document.documentElement.lang = state.language;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      if (DATA.i18n[key]) element.textContent = t(key);
    });
    document.querySelectorAll("[data-language-label]").forEach((element) => {
      element.textContent = state.language === "en" ? "PL" : "EN";
    });
    document.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
    document.querySelectorAll("[data-app-version]").forEach((element) => {
      element.textContent = DATA.version;
    });
    const title = state.language === "pl"
      ? "DevOps Compass - Wiedz, czego uczyć się dalej"
      : "DevOps Compass - Know what to learn next";
    document.title = title;
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.content = state.language === "pl"
        ? "Bezpłatna publiczna beta z wybranymi materiałami do nauki DevOps i gotowymi promptami do dowolnego AI. Bez reklam i konta."
        : "Free public beta with curated DevOps learning resources and ready prompts for any AI. No ads or account.";
    }
  }

  function setView(nextView, options = {}) {
    view = nextView;
    validationMessage = "";
    render();
    if (options.top !== false) window.scrollTo({ top: 0, behavior: options.smooth ? "smooth" : "auto" });
  }

  function render() {
    applyTheme();
    updateStaticI18n();
    closeMobileMenu();
    if (view === "wizard") renderWizard();
    else if (view === "dashboard" && state.onboardingComplete) renderDashboard();
    else if (view === "skill" && activeSkillId && knownSkills.has(activeSkillId)) renderSkillGuide(activeSkillId);
    else renderHome();
  }

  function renderHome() {
    const primaryLabel = state.onboardingComplete ? t("continuePath") : t("buildPath");
    const primaryAction = state.onboardingComplete ? "dashboard" : "start";
    const linux = skillById.get("linux-cli-files");
    const sampleResources = linux.resourceIds.slice(0, 2).map((id) => resourceById.get(id)).filter(Boolean);
    const routeNodes = [
      ["OS", false], ["Linux", true], ["Git", true], ["Networks", true], ["Bash", false],
      ["Containers", true], ["CI/CD", true], ["Cloud", false], ["IaC", false], ["Observability", false],
      ["Security", false], ["Kubernetes", false], ["SRE", false], ["Platform", false], ["AI", false]
    ];

    app.innerHTML = `
      <section class="home-hero shell">
        <div class="home-hero-copy">
          <aside class="beta-notice" aria-label="${esc(t("betaBannerLabel"))}">
            <span class="beta-notice-label">${esc(t("betaBannerLabel"))}</span>
            <div class="beta-notice-copy"><strong>${esc(t("betaBannerTitle"))}</strong><p>${esc(t("betaBannerText"))}</p></div>
            <a class="beta-notice-link" href="https://github.com/lepczynski-cloud/devops-compass/issues/new/choose" target="_blank" rel="noopener">${esc(t("betaBannerAction"))} ${iconArrow()}</a>
          </aside>
          <p class="eyebrow">${esc(t("heroEyebrow"))}</p>
          <h1>${esc(t("heroTitle1"))} <span>${esc(t("heroTitle2"))}</span></h1>
          <p class="home-promise">${esc(t("homePromise"))}</p>
          <div class="home-primary-action">
            <button class="button primary large" type="button" data-action="${primaryAction}">${esc(primaryLabel)} ${iconArrow()}</button>
            <small>${esc(t("homePrimaryHint"))}</small>
          </div>
          <div class="home-proof-line" aria-label="Project qualities">
            <span>${esc(t("proofFree"))}</span>
            <span>${esc(t("proofNoAds"))}</span>
            <span>${esc(t("proofAnyAi"))}</span>
            <span>Open source</span>
          </div>
        </div>

        <div class="route-demo" aria-label="${esc(t("samplePathTitle"))}">
          <div class="terminal-bar"><span></span><span></span><span></span><code>devops-compass / route</code></div>
          <div class="route-demo-head">
            <div><strong>${esc(t("samplePathTitle"))}</strong><p>${esc(t("samplePathText"))}</p></div>
            <span class="route-demo-count">5 / 15</span>
          </div>
          <div class="route-node-grid">
            ${routeNodes.map(([label, active], index) => `<span class="route-demo-node ${active ? "active" : ""}" style="--i:${index}">${esc(label)}</span>`).join("")}
          </div>
          <div class="route-sequence" aria-hidden="true">
            <span>Linux</span><b>→</b><span>Git</span><b>→</b><span>Networks</span><b>→</b><span>Containers</span><b>→</b><span>CI/CD</span>
          </div>
        </div>
      </section>

      <section class="home-section shell" id="how">
        <div class="home-section-head">
          <p class="eyebrow">${esc(t("whatYouGet"))}</p>
          <h2>${esc(state.language === "pl" ? "Nie tylko nazwa tematu. Każdy krok prowadzi do działania." : "Not just a topic name. Every step leads to an action.")}</h2>
        </div>
        <div class="value-list">
          ${valueRow("01", t("valuePriority"), t("valuePriorityText"))}
          ${valueRow("02", t("valueGuide"), t("valueGuideText"))}
          ${valueRow("03", t("valueResources"), t("valueResourcesText"))}
          ${valueRow("04", t("valueAi"), t("valueAiText"))}
        </div>
      </section>

      <section class="home-section shell sample-guide-section">
        <div class="home-section-head split">
          <div>
            <p class="eyebrow">${esc(t("sampleGuideTitle"))}</p>
            <h2>${esc(txt(linux.name))}</h2>
            <p>${esc(t("sampleGuideText"))}</p>
          </div>
          <span class="sample-effort">${esc(t("firstPass"))}: ${esc(linux.effort)}</span>
        </div>
        <div class="sample-guide">
          <div class="sample-guide-main">
            <span class="guide-label">${esc(t("startHere"))}</span>
            <p class="sample-quick-win">${esc(txt(linux.quickWin))}</p>
            <div class="sample-checks">
              ${txt(linux.ready).map((item) => `<span>✓ ${esc(item)}</span>`).join("")}
            </div>
          </div>
          <div class="sample-resources">
            <span class="guide-label">${esc(t("freeResources"))}</span>
            ${sampleResources.map((resource) => `<a href="${esc(resource.url)}" target="_blank" rel="noopener"><strong>${esc(txt(resource.title))}</strong><small>${esc(resource.provider)} · ${esc(txt(resource.type))}</small></a>`).join("")}
          </div>
        </div>
        <p class="course-boundary">${esc(t("guideNotCourse"))}</p>
      </section>

      <section class="home-section shell process-section">
        <div class="home-section-head">
          <p class="eyebrow">${esc(t("howEyebrow"))}</p>
          <h2>${esc(t("howTitle"))}</h2>
          <p>${esc(t("howLead"))}</p>
        </div>
        <div class="process-line">
          ${stepCard("01", t("step1Title"), t("step1Text"))}
          ${stepCard("02", t("step2Title"), t("step2Text"))}
          ${stepCard("03", t("step3Title"), t("step3Text"))}
        </div>
      </section>

      <section class="home-section shell" id="about">
        <div class="about-compact">
          <div class="author-signature"><span>WL</span><div><strong>Wojciech Lepczyński</strong><small>${esc(t("footerExperience"))}</small></div></div>
          <div class="about-compact-copy">
            <p class="eyebrow">${esc(t("aboutEyebrow"))}</p>
            <h2>${esc(t("aboutTitle"))}</h2>
            <p>${esc(t("aboutLead"))}</p>
            <p class="author-note">${esc(t("authorText"))}</p>
          </div>
        </div>
      </section>

      <section class="section-tight shell">
        <div class="cta-band simplified">
          <div><h2>${esc(t("ctaTitle"))}</h2><p>${esc(t("ctaText"))}</p></div>
          <button class="button primary" type="button" data-action="${primaryAction}">${esc(primaryLabel)} ${iconArrow()}</button>
        </div>
      </section>
    `;
  }

  function stepCard(number, title, text) {
    return `<div class="process-step"><span>${esc(number)}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></div>`;
  }

  function valueRow(number, title, text) {
    return `<div class="value-row"><span>${esc(number)}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></div>`;
  }

  function principle(number, title, text) {
    return `<div class="principle"><span class="principle-icon">${esc(number)}</span><div><strong>${esc(title)}</strong><p>${esc(text)}</p></div></div>`;
  }

  function startWizard(edit = false) {
    draft = structuredCloneSafe(state);
    if (!edit && !draft.onboardingComplete) {
      draft.profile = null;
      draft.direction = null;
      draft.interests = [];
      draft.selectedAreas = [];
      draft.assessments = {};
      draft.skillStatus = {};
    }
    wizardStep = 0;
    showDirectionHelp = false;
    areasTouched = Boolean(edit);
    openAssessmentAreas.clear();
    setView("wizard");
  }

  function renderWizard() {
    const steps = [renderProfileStep, renderDirectionStep, renderAreasStep, renderAssessmentStep, renderReviewStep];
    app.innerHTML = `
      <div class="wizard-wrap shell">
        <div class="wizard-header">
          <button class="wizard-exit" type="button" data-action="wizard-exit">← ${esc(t("exit"))}</button>
          <div class="wizard-progress" aria-label="${esc(t("stepOf", { current: wizardStep + 1, total: TOTAL_STEPS }))}">
            ${Array.from({ length: TOTAL_STEPS }, (_, index) => `<span class="progress-dot ${index < wizardStep ? "done" : ""} ${index === wizardStep ? "active" : ""}"></span>`).join("")}
          </div>
        </div>
        <section class="wizard-panel">
          ${steps[wizardStep]()}
          ${validationMessage ? `<p class="validation-message" role="alert">${esc(validationMessage)}</p>` : ""}
          ${wizardActions()}
        </section>
      </div>
    `;
  }

  function wizardActions() {
    const isLast = wizardStep === TOTAL_STEPS - 1;
    const canSkipAssessment = wizardStep === 3;
    const blocked = (wizardStep === 0 && !draft.profile) || (wizardStep === 1 && !draft.direction);
    return `
      <div class="wizard-actions sticky-actions">
        <div>${wizardStep > 0 ? `<button class="button ghost" type="button" data-action="wizard-back">${esc(t("back"))}</button>` : `<span class="wizard-action-hint">${esc(t("chooseThenContinue"))}</span>`}</div>
        <div class="wizard-actions-right">
          ${canSkipAssessment ? `<button class="button ghost" type="button" data-action="wizard-skip">${esc(t("skip"))}</button>` : ""}
          <button class="button primary" type="button" data-action="${isLast ? "wizard-finish" : "wizard-next"}" ${blocked ? "disabled" : ""}>${esc(isLast ? t("finish") : t("next"))} ${iconArrow()}</button>
        </div>
      </div>
    `;
  }

  function wizardTitle(kickerKey, titleKey, introKey) {
    return `
      <div class="wizard-title-row">
        <span class="wizard-kicker">${esc(t("stepOf", { current: wizardStep + 1, total: TOTAL_STEPS }))} · ${esc(t(kickerKey))}</span>
        <h1>${esc(t(titleKey))}</h1>
        <p class="wizard-intro">${esc(t(introKey))}</p>
      </div>
    `;
  }

  function renderProfileStep() {
    return `
      ${wizardTitle("setupStartKicker", "setupStartTitle", "setupStartIntro")}
      <div class="choice-grid">
        ${DATA.profiles.map((profile) => choiceCard(profile, draft.profile === profile.id, "choose-profile")).join("")}
      </div>
      <div class="wizard-note"><span class="note-mark">i</span><span>${esc(state.language === "pl" ? "To nie jest poziom globalny. Konkretne umiejętności potwierdzisz w dalszym kroku." : "This is not a global skill level. You will confirm concrete abilities in a later step.")}</span></div>
    `;
  }

  function renderDirectionStep() {
    const suggestion = suggestedDirection();
    return `
      ${wizardTitle("setupDirectionKicker", "setupDirectionTitle", "setupDirectionIntro")}
      <div class="choice-grid three">
        ${DATA.directions.map((direction) => choiceCard(direction, draft.direction === direction.id, "choose-direction")).join("")}
      </div>
      <div class="wizard-note"><span class="note-mark">i</span><span>${esc(state.language === "pl" ? "Nie masz pewności? Wybierz DevOps Foundations. Specjalizację można zmienić później bez utraty postępu." : "Not sure? Choose DevOps Foundations. You can change specialization later without losing progress.")}</span></div>
      <div style="margin-top:18px">
        <button class="text-link" type="button" data-action="toggle-direction-help">${esc(t("chooseInterests"))} ${showDirectionHelp ? "−" : "+"}</button>
      </div>
      ${showDirectionHelp ? `
        <div class="choice-grid three" style="margin-top:18px">
          ${DATA.interests.map((interest) => interestCard(interest)).join("")}
        </div>
        <div class="direction-result">
          <div>
            <span class="wizard-kicker">${esc(t("directionSuggested"))}</span>
            <h3>${esc(txt(directionById.get(suggestion).name))}</h3>
            <p>${esc(t("interestHint"))}</p>
          </div>
          <button class="button secondary small" type="button" data-action="use-suggestion" data-id="${esc(suggestion)}">${esc(state.language === "pl" ? "Użyj tej sugestii" : "Use this suggestion")}</button>
        </div>
      ` : ""}
    `;
  }

  function renderAreasStep() {
    return `
      ${wizardTitle("setupAreasKicker", "setupAreasTitle", "setupAreasIntro")}
      <div class="area-select-grid">
        ${DATA.areas.map((area) => `
          <button class="area-select ${draft.selectedAreas.includes(area.id) ? "selected" : ""}" type="button" data-action="toggle-area" data-id="${esc(area.id)}" aria-pressed="${draft.selectedAreas.includes(area.id)}">
            <span class="area-icon">${esc(area.icon)}</span>
            <span><strong>${esc(txt(area.name))}</strong><small>${esc(txt(area.description))}</small></span>
          </button>
        `).join("")}
      </div>
      <div class="wizard-note"><span class="note-mark">i</span><span>${esc(t("setupAreasNone"))}</span></div>
    `;
  }

  function renderAssessmentStep() {
    const selected = DATA.areas.filter((area) => draft.selectedAreas.includes(area.id));
    if (selected.length && !selected.some((area) => openAssessmentAreas.has(area.id))) {
      openAssessmentAreas.add(selected[0].id);
    }
    return `
      ${wizardTitle("setupAssessKicker", "setupAssessTitle", "setupAssessIntro")}
      ${selected.length ? `
        <div class="assessment-list">
          ${selected.map((area) => assessmentGroup(area, openAssessmentAreas.has(area.id))).join("")}
        </div>
        <div class="wizard-note"><span class="note-mark">i</span><span>${esc(state.language === "pl" ? "Brak zaznaczenia oznacza „Nie wiem”. Otwarta sekcja pozostaje otwarta podczas wyboru odpowiedzi." : "No selection means “Not sure”. The open section stays open while you answer.")}</span></div>
      ` : `<div class="empty-state" style="margin-top:34px">${esc(t("setupAssessEmpty"))}</div>`}
    `;
  }

  function assessmentGroup(area, open) {
    const capabilities = area.capabilities.map((id) => capabilityById.get(id)).filter(Boolean);
    const answered = capabilities.filter((capability) => Number.isInteger(draft.assessments[capability.id])).length;
    return `
      <details class="assessment-group" data-assessment-area="${esc(area.id)}" ${open ? "open" : ""}>
        <summary><span class="area-icon">${esc(area.icon)}</span><strong>${esc(txt(area.name))}</strong><small data-assessment-count>${answered}/${capabilities.length} ${esc(t("answered"))}</small></summary>
        <div class="assessment-body">
          ${capabilities.map((capability) => capabilityRow(capability)).join("")}
        </div>
      </details>
    `;
  }

  function capabilityRow(capability) {
    const current = draft.assessments[capability.id];
    const levels = [
      [0, t("notYet")],
      [1, t("withDocs")],
      [2, t("independent")],
      [3, t("troubleshoot")]
    ];
    return `
      <div class="capability-row">
        <div class="capability-copy">
          <strong>${esc(txt(capability.name))}</strong>
          <small>${esc(txt(capability.hint))}</small>
        </div>
        <div class="level-options" role="group" aria-label="${esc(txt(capability.name))}">
          ${levels.map(([value, label]) => `
            <button class="level-button ${current === value ? "selected" : ""}" type="button" data-action="set-level" data-id="${esc(capability.id)}" data-value="${value}" aria-pressed="${current === value}">${esc(label)}</button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderReviewStep() {
    const result = buildRecommendations(draft);
    const profile = profileById.get(draft.profile);
    const direction = directionById.get(draft.direction);
    const areaNames = draft.selectedAreas.map((id) => areaById.get(id)).filter(Boolean).map((item) => txt(item.name));
    return `
      ${wizardTitle("setupReviewKicker", "setupReviewTitle", "setupReviewIntro")}
      <div class="profile-bar" style="margin-top:34px">
        <div class="profile-main"><span class="skill-icon">${esc(profile?.icon || "01")}</span><div><strong>${esc(t("summaryStart"))}</strong><small>${esc(profile ? txt(profile.name) : "")}</small></div></div>
        <div class="profile-stat"><strong>${esc(direction?.icon || "FD")}</strong><small>${esc(direction ? txt(direction.name) : "")}</small></div>
        <div class="profile-stat"><strong>${draft.selectedAreas.length}</strong><small>${esc(t("summaryAreas"))}</small></div>
        <div class="profile-stat"><strong>${result.now.length}</strong><small>${esc(t("summaryFirst"))}</small></div>
      </div>
      <div class="dashboard-section">
        <div class="dashboard-section-head"><div><h2>${esc(t("summaryFirst"))}</h2><p>${esc(t("learnNowDesc"))}</p></div></div>
        <div class="skill-grid">
          ${result.now.map((skill, index) => renderSkillCard(skill, "priority", index + 1, draft, false)).join("") || `<div class="empty-state">${esc(state.language === "pl" ? "Po zapisaniu ścieżki zobaczysz priorytety." : "Your priorities will appear after saving the path.")}</div>`}
        </div>
      </div>
      <div class="wizard-note"><span class="note-mark">i</span><span><strong>${esc(t("summaryAreas"))}:</strong> ${esc(areaNames.join(", ") || t("noneSelected"))}</span></div>
    `;
  }

  function choiceCard(item, selected, action) {
    return `
      <button class="choice-card ${selected ? "selected" : ""}" type="button" data-action="${action}" data-id="${esc(item.id)}" aria-pressed="${selected}">
        <span class="choice-icon">${esc(item.icon)}</span>
        <span><strong>${esc(txt(item.name))}</strong><p>${esc(txt(item.description))}</p></span>
        <span class="choice-check">${selected ? esc(t("selectedLabel")) : "✓"}</span>
      </button>
    `;
  }

  function interestCard(item) {
    const selected = draft.interests.includes(item.id);
    return `
      <button class="choice-card ${selected ? "selected" : ""}" type="button" data-action="choose-interest" data-id="${esc(item.id)}" aria-pressed="${selected}">
        <span class="choice-icon">${esc(item.icon)}</span>
        <span><strong>${esc(txt(item.name))}</strong></span>
        <span class="choice-check">✓</span>
      </button>
    `;
  }

  function suggestedDirection() {
    if (!draft.interests.length) return "foundations";
    const scores = {};
    for (const id of draft.interests) {
      const interest = DATA.interests.find((item) => item.id === id);
      if (!interest) continue;
      for (const [direction, score] of Object.entries(interest.scores)) {
        scores[direction] = (scores[direction] || 0) + score;
      }
    }
    return Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "foundations";
  }

  function goNext() {
    validationMessage = "";
    if (wizardStep === 0 && !draft.profile) validationMessage = t("validationChoice");
    if (wizardStep === 1 && !draft.direction) validationMessage = t("validationDirection");
    if (validationMessage) {
      renderWizard();
      return;
    }
    wizardStep = Math.min(TOTAL_STEPS - 1, wizardStep + 1);
    renderWizard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishWizard() {
    if (!draft.profile || !draft.direction) return;
    state = normaliseState({
      ...draft,
      onboardingComplete: true,
      createdAt: state.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    saveState();
    setView("dashboard");
  }

  function skillEvidence(skill, sourceState) {
    const manual = sourceState.skillStatus[skill.id];
    if (manual === "covered") return { status: "covered", values: [] };
    if (manual === "learning") return { status: "learning", values: [] };
    if (manual === "revisit") return { status: "revisit", values: [] };
    if (manual === "not_started") return { status: "unmet", values: [] };

    const evidence = skill.evidence || [];
    if (!evidence.length) return { status: "unmet", values: [] };

    const values = evidence
      .filter((id) => Number.isInteger(sourceState.assessments[id]))
      .map((id) => sourceState.assessments[id]);
    const evidenceAreas = [...new Set(evidence.map((id) => capabilityById.get(id)?.area).filter(Boolean))];
    const areaClaimed = evidenceAreas.some((id) => sourceState.selectedAreas.includes(id));
    const allAnswered = values.length === evidence.length;
    const covered = allAnswered && values.every((value) => value >= (skill.required ?? 2));
    if (covered) return { status: "covered", values };
    if (values.some((value) => value > 0) || (areaClaimed && !allAnswered)) return { status: "verify", values };
    return { status: "unmet", values };
  }

  function orderedPath(direction) {
    const requested = DATA.paths[direction] || DATA.paths.foundations;
    const requestedSet = new Set(requested);
    const visited = new Set();
    const visiting = new Set();
    const ordered = [];

    function visit(id) {
      if (visited.has(id) || visiting.has(id) || !knownSkills.has(id)) return;
      visiting.add(id);
      const skill = skillById.get(id);
      for (const prerequisite of skill.prerequisites || []) {
        if (!requestedSet.has(prerequisite)) requestedSet.add(prerequisite);
        visit(prerequisite);
      }
      visiting.delete(id);
      visited.add(id);
      ordered.push(skill);
    }

    for (const id of requested) visit(id);
    return ordered;
  }

  function buildRecommendations(sourceState = state) {
    const direction = sourceState.direction && DATA.paths[sourceState.direction] ? sourceState.direction : "foundations";
    const path = orderedPath(direction);
    const covered = [];
    const verify = [];
    const learning = [];
    const unmet = [];
    const revisit = [];

    for (const skill of path) {
      const result = skillEvidence(skill, sourceState);
      if (result.status === "covered") covered.push(skill);
      else if (result.status === "verify") verify.push(skill);
      else if (result.status === "learning") learning.push(skill);
      else if (result.status === "revisit") revisit.push(skill);
      else unmet.push(skill);
    }

    const now = [...learning, ...unmet.filter((skill) => !learning.some((item) => item.id === skill.id))].slice(0, 3);
    const nowIds = new Set(now.map((skill) => skill.id));
    const next = unmet.filter((skill) => !nowIds.has(skill.id)).slice(0, 6);
    const nextIds = new Set(next.map((skill) => skill.id));
    const later = [
      ...unmet.filter((skill) => !nowIds.has(skill.id) && !nextIds.has(skill.id)),
      ...revisit
    ];

    return {
      path,
      now,
      verify: verify.slice(0, 8),
      next,
      later,
      covered,
      learning
    };
  }

  function renderDashboard() {
    const result = buildRecommendations();
    const profile = profileById.get(state.profile);
    const direction = directionById.get(state.direction);
    const coveredCount = result.covered.length;
    const learningCount = Object.values(state.skillStatus).filter((status) => status === "learning").length;

    app.innerHTML = `
      <div class="dashboard shell">
        <div class="dashboard-hero compact-dashboard-hero">
          <div>
            <p class="eyebrow">${esc(t("welcomeBack"))}</p>
            <h1>${esc(t("dashboardTitle"))}</h1>
            <p>${esc(state.language === "pl" ? "Otwórz przewodnik przy temacie. Znajdziesz tam konkretny plan, darmowe materiały, sposób weryfikacji i prompt dla AI." : "Open the guide for any topic. It includes a concrete plan, free resources, verification and an AI tutor prompt.")}</p>
          </div>
          <div class="dashboard-actions">
            <button class="button secondary small" type="button" data-action="edit-profile">${iconEdit()} ${esc(t("editProfile"))}</button>
            <button class="button ghost small" type="button" data-action="export">${iconDownload()} ${esc(t("exportProfile"))}</button>
            <button class="button ghost small" type="button" data-action="import">${iconUpload()} ${esc(t("importProfile"))}</button>
            <button class="button danger small" type="button" data-action="reset">${esc(t("resetProfile"))}</button>
          </div>
        </div>

        <div class="profile-bar">
          <div class="profile-main"><span class="skill-icon">${esc(profile?.icon || "01")}</span><div><strong>${esc(profile ? txt(profile.name) : "")}</strong><small>${esc(t("startingFrom"))}</small></div></div>
          <div class="profile-stat"><strong>${esc(direction?.icon || "FD")}</strong><small>${esc(direction ? txt(direction.name) : "")}</small></div>
          <div class="profile-stat"><strong>${coveredCount}</strong><small>${esc(t("coveredCount"))}</small></div>
          <div class="profile-stat"><strong>${learningCount}</strong><small>${esc(t("learningCount"))}</small></div>
        </div>
        <div class="local-banner"><span>${esc(t("savedLocally"))}</span><button class="text-link" type="button" data-action="privacy">${esc(t("privacy"))}</button></div>

        <section class="dashboard-section route-context-section">
          <div class="dashboard-section-head"><div><h2>${esc(t("routePreview"))}</h2><p>${esc(t("routePreviewText"))}</p></div></div>
          ${renderPathLogic(result)}
        </section>

        ${dashboardSection("learnNow", "learnNowDesc", result.now, "priority", true)}
        ${result.verify.length ? dashboardSection("verifyFirst", "verifyDesc", result.verify, "verify", true) : ""}
        ${dashboardSection("upNext", "upNextDesc", result.next, "", true)}

        <section class="dashboard-section">
          <div class="dashboard-section-head"><div><h2>${esc(t("later"))}</h2><p>${esc(t("laterDesc"))}</p></div><span class="count-badge">${result.later.length}</span></div>
          <details class="collapsible-list">
            <summary>${esc(t("showLater"))}</summary>
            <div class="skill-grid">${result.later.map((skill, index) => renderSkillCard(skill, "", index + 1)).join("") || emptyMessage()}</div>
          </details>
        </section>

        <section class="dashboard-section">
          <div class="dashboard-section-head"><div><h2>${esc(t("alreadyCovered"))}</h2><p>${esc(t("coveredDesc"))}</p></div><span class="count-badge">${result.covered.length}</span></div>
          <details class="collapsible-list">
            <summary>${esc(t("showCovered"))}</summary>
            <div class="skill-grid">${result.covered.map((skill, index) => renderSkillCard(skill, "covered", index + 1)).join("") || emptyMessage()}</div>
          </details>
        </section>
      </div>
    `;
  }

  function dashboardSection(titleKey, descKey, skills, cardClass, showCount) {
    return `
      <section class="dashboard-section">
        <div class="dashboard-section-head">
          <div><h2>${esc(t(titleKey))}</h2><p>${esc(t(descKey))}</p></div>
          ${showCount ? `<span class="count-badge">${skills.length}</span>` : ""}
        </div>
        <div class="skill-grid">${skills.map((skill, index) => renderSkillCard(skill, cardClass, index + 1)).join("") || emptyMessage()}</div>
      </section>
    `;
  }

  function emptyMessage() {
    return `<div class="empty-state">${esc(state.language === "pl" ? "Brak tematów w tej sekcji." : "No topics in this section.")}</div>`;
  }

  function effectiveStatus(skill, sourceState = state) {
    if (sourceState.skillStatus[skill.id]) return sourceState.skillStatus[skill.id];
    return skillEvidence(skill, sourceState).status === "covered" ? "covered" : "not_started";
  }

  function renderSkillCard(skill, cardClass = "", index = 1, sourceState = state, interactive = true) {
    const category = txt(DATA.categoryLabels[skill.category] || skill.category);
    const status = effectiveStatus(skill, sourceState);
    return `
      <article class="skill-card ${cardClass}">
        <div class="skill-card-top">
          <span class="skill-icon">${esc(skill.icon)}</span>
          <span class="skill-index">${String(index).padStart(2, "0")}</span>
        </div>
        <h3>${esc(txt(skill.name))}</h3>
        <p>${esc(txt(skill.summary))}</p>
        <div class="skill-meta-line"><span>${esc(skill.effort || "3–6 h")}</span><span>${(skill.resourceIds || []).length} ${esc(state.language === "pl" ? "materiały" : "resources")}</span></div>
        <div class="skill-card-footer">
          <span class="chip">${esc(category)}</span>
          ${interactive ? `<button class="button guide-button" type="button" data-action="skill-details" data-id="${esc(skill.id)}">${esc(t("openGuide"))} ${iconArrow()}</button>` : ""}
        </div>
        ${interactive ? `
          <select class="status-select" data-status-skill="${esc(skill.id)}" aria-label="${esc(t("status"))}" style="margin-top:12px">
            ${statusOptions(status)}
          </select>
        ` : ""}
      </article>
    `;
  }

  function statusOptions(current) {
    const options = [
      ["not_started", t("statusNotStarted")],
      ["learning", t("statusLearning")],
      ["covered", t("statusCovered")],
      ["revisit", t("statusRevisit")]
    ];
    return options.map(([value, label]) => `<option value="${value}" ${value === current ? "selected" : ""}>${esc(label)}</option>`).join("");
  }

  function renderPathLogic(result) {
    const items = [
      ...result.covered.slice(-2).map((skill) => ({ skill, state: "covered", label: t("routeCovered") })),
      ...result.verify.slice(0, 2).map((skill) => ({ skill, state: "verify", label: t("routeVerify") })),
      ...result.now.map((skill) => ({ skill, state: "now", label: t("routeNow") })),
      ...result.next.slice(0, 5).map((skill) => ({ skill, state: "next", label: t("routeNext") })),
      ...result.later.slice(0, 3).map((skill) => ({ skill, state: "later", label: t("later") }))
    ];
    if (!items.length) return emptyMessage();
    return `
      <div class="route-board">
        ${items.map(({ skill, state: rowState, label }, index) => `
          <div class="route-board-item ${rowState}">
            ${index ? `<span class="route-arrow" aria-hidden="true">→</span>` : ""}
            <button type="button" data-action="skill-details" data-id="${esc(skill.id)}">
              <small>${esc(label)}</small><strong>${esc(txt(skill.name))}</strong>
            </button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function openSkillGuide(skillId) {
    if (!knownSkills.has(skillId)) return;
    previousView = view === "skill" ? previousView : (view === "dashboard" ? "dashboard" : "home");
    activeSkillId = skillId;
    setView("skill");
  }

  function renderSkillGuide(skillId) {
    const skill = skillById.get(skillId);
    if (!skill) return setView(state.onboardingComplete ? "dashboard" : "home");
    const resources = (skill.resourceIds || []).map((id) => resourceById.get(id)).filter(Boolean);
    const prereqs = (skill.prerequisites || []).map((id) => skillById.get(id)).filter(Boolean);
    const path = state.onboardingComplete ? orderedPath(state.direction) : [];
    const pathIndex = path.findIndex((item) => item.id === skill.id);
    const nextSkill = pathIndex >= 0 ? path[pathIndex + 1] : null;
    const status = effectiveStatus(skill);
    const category = txt(DATA.categoryLabels[skill.category] || skill.category);
    const prompt = buildAiPrompt(skill);
    const issueUrl = `https://github.com/lepczynski-cloud/devops-compass/issues/new?template=content_suggestion.yml&title=${encodeURIComponent(`Content: ${skill.name.en}`)}`;

    app.innerHTML = `
      <div class="learning-guide shell">
        <button class="guide-back" type="button" data-action="back-from-guide">← ${esc(state.onboardingComplete ? t("backToPath") : t("home"))}</button>

        <header class="guide-hero">
          <div class="guide-hero-main">
            <div class="guide-kicker"><span class="skill-icon">${esc(skill.icon)}</span><span>${esc(category)}</span></div>
            <h1>${esc(txt(skill.name))}</h1>
            <p>${esc(txt(skill.summary))}</p>
            <div class="guide-meta"><span>${esc(t("firstPass"))}: <strong>${esc(skill.effort)}</strong></span><span>${esc(t("contentReviewed"))}: <strong>${esc(formatDate(skill.reviewedAt))}</strong></span><span><strong>${resources.length}</strong> ${esc(state.language === "pl" ? "darmowe materiały" : "free resources")}</span></div>
          </div>
          <aside class="guide-status-card">
            <label><span>${esc(t("status"))}</span><select class="status-select" data-status-skill="${esc(skill.id)}">${statusOptions(status)}</select></label>
            <small>${esc(t("statusHelp"))}</small>
          </aside>
        </header>

        <section class="quick-win-panel">
          <div class="quick-win-label"><span>01</span><strong>${esc(t("startHere"))}</strong></div>
          <p>${esc(txt(skill.quickWin))}</p>
        </section>

        <div class="guide-layout">
          <main class="guide-main">
            <section class="guide-section">
              <div class="guide-section-head"><span>02</span><div><h2>${esc(t("learningPlan"))}</h2><p>${esc(t("learningPlanIntro"))}</p></div></div>
              <div class="learning-plan-list">
                <article><span>1</span><div><h3>${esc(t("planUnderstand"))}</h3><p>${esc(t("planUnderstandText"))}</p><ul>${txt(skill.topics).map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div></article>
                <article><span>2</span><div><h3>${esc(t("planDo"))}</h3><p>${esc(t("planDoText"))}</p><div class="command-note">${esc(txt(skill.quickWin))}</div></div></article>
                <article><span>3</span><div><h3>${esc(t("planVerify"))}</h3><p>${esc(t("planVerifyText"))}</p></div></article>
              </div>
            </section>

            <section class="guide-section" id="resources">
              <div class="guide-section-head"><span>03</span><div><h2>${esc(t("freeResources"))}</h2><p>${esc(state.language === "pl" ? "Zacznij od pierwszego materiału. Kolejne służą do uzupełnienia lub jako dokumentacja." : "Start with the first resource. Use the others to fill gaps or as reference.")}</p></div></div>
              <div class="resource-grid">
                ${resources.length ? resources.map((resource, index) => resourceCard(resource, index)).join("") : `<div class="empty-state">${esc(t("noResource"))}</div>`}
              </div>
            </section>

            <section class="guide-section verification-section">
              <div class="guide-section-head"><span>04</span><div><h2>${esc(t("verificationChecklist"))}</h2><p>${esc(state.language === "pl" ? "Nie zaznaczaj tematu jako opanowanego tylko dlatego, że przeczytałeś dokumentację." : "Do not mark the topic covered just because you read the documentation.")}</p></div></div>
              <div class="verification-list">
                ${txt(skill.ready).map((item) => `<label><input type="checkbox"><span>${esc(item)}</span></label>`).join("")}
                <label><input type="checkbox"><span>${esc(state.language === "pl" ? "Potrafię wyjaśnić wynik bez kopiowania odpowiedzi z AI." : "I can explain the result without copying an AI answer.")}</span></label>
                <label><input type="checkbox"><span>${esc(state.language === "pl" ? "Mam własny dowód: komendy, notatkę, diagram, konfigurację lub repozytorium." : "I have my own evidence: commands, notes, a diagram, configuration or repository.")}</span></label>
              </div>
            </section>

            <section class="guide-section ai-tutor-section">
              <div class="guide-section-head"><span>05</span><div><h2>${esc(t("aiTutor"))}</h2><p>${esc(t("aiTutorText"))}</p></div></div>
              <div class="prompt-toolbar"><button class="button secondary small" type="button" data-action="copy-prompt" data-id="${esc(skill.id)}">${esc(t("copyPrompt"))}</button></div>
              <textarea class="ai-prompt" readonly rows="18" data-ai-prompt="${esc(skill.id)}">${esc(prompt)}</textarea>
            </section>
          </main>

          <aside class="guide-sidebar">
            <section>
              <h2>${esc(t("prerequisiteContext"))}</h2>
              ${prereqs.length ? `<div class="sidebar-links">${prereqs.map((item) => `<button type="button" data-action="skill-details" data-id="${esc(item.id)}"><span>${esc(item.icon)}</span>${esc(txt(item.name))}</button>`).join("")}</div>` : `<p>${esc(t("noPrereqs"))}</p>`}
            </section>
            ${nextSkill ? `<section><h2>${esc(t("upNext"))}</h2><button class="next-guide" type="button" data-action="skill-details" data-id="${esc(nextSkill.id)}"><span>${esc(nextSkill.icon)}</span><div><strong>${esc(txt(nextSkill.name))}</strong><small>${esc(txt(nextSkill.summary))}</small></div>${iconArrow()}</button></section>` : ""}
            <section><h2>${esc(t("practitionerNote"))}</h2><p class="author-note">${esc(txt(skill.note))}</p></section>
            <section class="guide-feedback"><a href="${esc(issueUrl)}" target="_blank" rel="noopener">${esc(t("reportContent"))} ${iconArrow()}</a></section>
          </aside>
        </div>
      </div>
    `;
  }

  function resourceCard(resource, index) {
    return `
      <article class="resource-card">
        <div class="resource-card-top"><span>${String(index + 1).padStart(2, "0")}</span><span class="free-chip">${esc(t("freeLabel"))}</span></div>
        <h3>${esc(txt(resource.title))}</h3>
        <p class="resource-provider">${esc(resource.provider)} · ${esc(txt(resource.type))} · ${esc(resource.language)}</p>
        <p><strong>${esc(t("resourceReason"))}:</strong> ${esc(txt(resource.note))}</p>
        <a class="resource-link" href="${esc(resource.url)}" target="_blank" rel="noopener">${esc(t("openResource"))} ${iconArrow()}</a>
      </article>
    `;
  }

  function buildAiPrompt(skill) {
    const profile = profileById.get(state.profile);
    const direction = directionById.get(state.direction);
    const topics = txt(skill.topics).map((item) => `- ${item}`).join("\n");
    const ready = txt(skill.ready).map((item) => `- ${item}`).join("\n");
    if (state.language === "pl") {
      return `Działaj jako cierpliwy senior DevOps i nauczyciel praktyk.\n\nMój punkt startowy: ${profile ? txt(profile.name) : "nieokreślony"}.\nMój kierunek: ${direction ? txt(direction.name) : "DevOps Foundations"}.\nTemat: ${txt(skill.name)}.\nCel tematu: ${txt(skill.summary)}.\n\nZakres, który mam poznać:\n${topics}\n\nChcę dojść do momentu, w którym:\n${ready}\n\nProwadź mnie według tych zasad:\n1. Najpierw wyjaśnij model mentalny prostym językiem, ale bez spłycania.\n2. Podziel naukę na krótkie etapy i po każdym zadaj mi jedno pytanie sprawdzające. Nie podawaj od razu wszystkich odpowiedzi.\n3. Zaproponuj małe zadanie możliwe do wykonania lokalnie. Wyjaśnij każdą komendę, oczekiwany rezultat i sposób cofnięcia zmian.\n4. Dla komend destrukcyjnych lub zmieniających stan najpierw pokaż wariant read-only, dry-run albo bezpieczną alternatywę.\n5. Nie proś o sekrety, tokeny, hasła ani dane firmowe.\n6. Opieraj twierdzenia na oficjalnej dokumentacji. Podaj tytuły i adresy źródeł. Powiedz wyraźnie, gdy czegoś nie jesteś pewien.\n7. Na końcu poproś mnie o samodzielne wyjaśnienie wyniku i sprawdź je według kryteriów powyżej.\n\nZacznij od krótkiego planu i pierwszego pojęcia. Odpowiadaj po polsku, a nazwy techniczne i komendy pozostaw po angielsku.`;
    }
    return `Act as a patient senior DevOps engineer and practical tutor.\n\nMy starting point: ${profile ? txt(profile.name) : "not specified"}.\nMy direction: ${direction ? txt(direction.name) : "DevOps Foundations"}.\nTopic: ${txt(skill.name)}.\nOutcome: ${txt(skill.summary)}.\n\nScope I need to learn:\n${topics}\n\nI want to reach the point where:\n${ready}\n\nTeach me using these rules:\n1. Start with a clear mental model without oversimplifying it.\n2. Split the topic into short stages and ask me one checking question after each stage. Do not reveal every answer immediately.\n3. Propose a small task I can do locally. Explain every command, expected result and rollback.\n4. Before any destructive or state-changing command, show a read-only, dry-run or safer alternative.\n5. Never ask for secrets, tokens, passwords or company data.\n6. Base claims on official documentation. Give source titles and URLs, and state uncertainty clearly.\n7. Finish by asking me to explain the result independently and evaluate it against the readiness criteria above.\n\nStart with a short plan and the first concept.`;
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat(state.language === "pl" ? "pl-PL" : "en-GB", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00Z`));
    } catch (_) {
      return value;
    }
  }

  async function copyPrompt(skillId) {
    const field = document.querySelector(`[data-ai-prompt="${CSS.escape(skillId)}"]`);
    if (!field) return;
    try {
      await navigator.clipboard.writeText(field.value);
      showToast(t("promptCopied"));
    } catch (_) {
      field.focus();
      field.select();
      try {
        document.execCommand("copy");
        field.setSelectionRange(0, 0);
        field.blur();
        showToast(t("promptCopied"));
      } catch (_) { showToast(t("copyFailed")); }
    }
  }

  function showDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function openPrivacyDialog(mode = "privacy") {
    const dialog = document.getElementById("privacy-dialog");
    const content = document.getElementById("privacy-dialog-content");
    if (mode === "reset") {
      content.innerHTML = `
        <span class="modal-kicker">DevOps Compass</span>
        <h2 id="privacy-title">${esc(t("resetTitle"))}</h2>
        <p class="modal-lede">${esc(t("resetText"))}</p>
        <div class="modal-actions">
          <button class="button secondary" type="button" data-action="close-privacy">${esc(t("cancel"))}</button>
          <button class="button danger" type="button" data-action="confirm-reset">${esc(t("confirmReset"))}</button>
        </div>
      `;
    } else {
      content.innerHTML = `
        <span class="modal-kicker">Local-first</span>
        <h2 id="privacy-title">${esc(t("privacyTitle"))}</h2>
        <p class="modal-lede">${esc(t("privacyText1"))}</p>
        <div class="modal-section"><p>${esc(t("privacyText2"))}</p></div>
        <div class="modal-actions"><button class="button secondary" type="button" data-action="close-privacy">${esc(t("close"))}</button></div>
      `;
    }
    showDialog(dialog);
  }

  function exportProgress() {
    const payload = {
      product: "DevOps Compass",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: DATA.version,
      state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `devops-compass-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(t("exported"));
  }

  async function importProgress(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.product !== "DevOps Compass" || parsed.schemaVersion !== SCHEMA_VERSION || !parsed.state) throw new Error("Invalid export");
      state = normaliseState(parsed.state);
      saveState();
      draft = structuredCloneSafe(state);
      showToast(t("imported"));
      setView(state.onboardingComplete ? "dashboard" : "home");
    } catch (error) {
      console.warn(error);
      showToast(t("importError"));
    }
  }

  function resetProgress() {
    const language = state.language;
    const theme = state.theme;
    state = emptyState();
    state.language = language;
    state.theme = theme;
    draft = structuredCloneSafe(state);
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    saveState();
    closeDialog(document.getElementById("privacy-dialog"));
    setView("home");
  }

  function showToast(message, actionLabel = "", action = null) {
    const toast = document.querySelector("[data-toast]");
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.innerHTML = `${esc(message)}${actionLabel ? ` <button class="text-link" type="button" data-toast-action>${esc(actionLabel)}</button>` : ""}`;
    toast.hidden = false;
    if (action && actionLabel) {
      toast.querySelector("[data-toast-action]")?.addEventListener("click", action, { once: true });
    }
    toastTimer = setTimeout(() => { toast.hidden = true; }, 7000);
  }

  function closeMobileMenu() {
    const menu = document.querySelector("[data-mobile-nav]");
    const button = document.querySelector('[data-action="menu"]');
    if (menu) menu.hidden = true;
    if (button) button.setAttribute("aria-expanded", "false");
  }

  function toggleMobileMenu() {
    const menu = document.querySelector("[data-mobile-nav]");
    const button = document.querySelector('[data-action="menu"]');
    if (!menu || !button) return;
    menu.hidden = !menu.hidden;
    button.setAttribute("aria-expanded", String(!menu.hidden));
  }

  function scrollToSection(id) {
    if (view !== "home") {
      view = "home";
      render();
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }));
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleClick(event) {
    const scrollTarget = event.target.closest("[data-scroll]");
    if (scrollTarget) {
      event.preventDefault();
      scrollToSection(scrollTarget.dataset.scroll);
      return;
    }

    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === "home") { event.preventDefault(); setView("home", { smooth: true }); }
    else if (action === "start") startWizard(false);
    else if (action === "dashboard") setView("dashboard");
    else if (action === "edit-profile") startWizard(true);
    else if (action === "theme") {
      state.theme = state.theme === "dark" ? "light" : "dark";
      draft.theme = state.theme;
      saveState();
      applyTheme();
    }
    else if (action === "language") {
      state.language = state.language === "en" ? "pl" : "en";
      draft.language = state.language;
      saveState();
      render();
    }
    else if (action === "menu") toggleMobileMenu();
    else if (action === "privacy") openPrivacyDialog();
    else if (action === "close-privacy") closeDialog(document.getElementById("privacy-dialog"));
    else if (action === "reset") openPrivacyDialog("reset");
    else if (action === "confirm-reset") resetProgress();
    else if (action === "export") exportProgress();
    else if (action === "import") document.querySelector("[data-import-input]")?.click();
    else if (action === "install" && deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.finally(() => {
        deferredInstallPrompt = null;
        document.querySelectorAll("[data-install-button]").forEach((button) => { button.hidden = true; });
      });
    }
    else if (action === "wizard-exit") setView(state.onboardingComplete ? "dashboard" : "home");
    else if (action === "wizard-back") { wizardStep = Math.max(0, wizardStep - 1); validationMessage = ""; renderWizard(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else if (action === "wizard-next") goNext();
    else if (action === "wizard-skip") { wizardStep = 4; renderWizard(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else if (action === "wizard-finish") finishWizard();
    else if (action === "choose-profile") {
      draft.profile = id;
      const profile = profileById.get(id);
      if (!state.onboardingComplete && !areasTouched && profile) {
        draft.selectedAreas = [...profile.suggestedAreas];
      }
      validationMessage = "";
      renderWizard();
    }
    else if (action === "choose-direction") { draft.direction = id; validationMessage = ""; renderWizard(); }
    else if (action === "toggle-direction-help") { showDirectionHelp = !showDirectionHelp; renderWizard(); }
    else if (action === "choose-interest") {
      if (draft.interests.includes(id)) draft.interests = draft.interests.filter((item) => item !== id);
      else if (draft.interests.length < 2) draft.interests.push(id);
      else draft.interests = [draft.interests[1], id];
      renderWizard();
    }
    else if (action === "use-suggestion") { draft.direction = id; showDirectionHelp = false; renderWizard(); }
    else if (action === "toggle-area") {
      areasTouched = true;
      draft.selectedAreas = draft.selectedAreas.includes(id)
        ? draft.selectedAreas.filter((item) => item !== id)
        : [...draft.selectedAreas, id];
      renderWizard();
    }
    else if (action === "set-level") {
      const value = Number(target.dataset.value);
      const shouldClear = draft.assessments[id] === value;
      if (shouldClear) delete draft.assessments[id];
      else draft.assessments[id] = value;
      const row = target.closest(".capability-row");
      row?.querySelectorAll('[data-action="set-level"]').forEach((button) => {
        const selected = !shouldClear && Number(button.dataset.value) === value;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      const group = target.closest("[data-assessment-area]");
      const area = areaById.get(group?.dataset.assessmentArea);
      if (group && area) {
        const answered = area.capabilities.filter((capabilityId) => Number.isInteger(draft.assessments[capabilityId])).length;
        const counter = group.querySelector("[data-assessment-count]");
        if (counter) counter.textContent = `${answered}/${area.capabilities.length} ${t("answered")}`;
      }
    }
    else if (action === "skill-details") openSkillGuide(id);
    else if (action === "back-from-guide") setView(state.onboardingComplete ? "dashboard" : previousView);
    else if (action === "copy-prompt") copyPrompt(id);
  }

  function handleChange(event) {
    const select = event.target.closest("[data-status-skill]");
    if (select) {
      const id = select.dataset.statusSkill;
      const value = select.value;
      if (knownSkills.has(id) && allowedStatuses.has(value)) {
        state.skillStatus[id] = value;
        saveState();
        if (view === "skill" && activeSkillId === id) {
          const help = select.closest(".guide-status-card");
          help?.classList.add("saved-flash");
          setTimeout(() => help?.classList.remove("saved-flash"), 700);
          showToast(t("saved"));
        } else if (view === "dashboard") {
          renderDashboard();
        }
      }
    }
  }


  function handleToggle(event) {
    const details = event.target.closest?.("[data-assessment-area]");
    if (!details) return;
    const id = details.dataset.assessmentArea;
    if (details.open) openAssessmentAreas.add(id);
    else openAssessmentAreas.delete(id);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              showToast(t("appUpdated"), t("refresh"), () => window.location.reload());
            }
          });
        });
      } catch (error) {
        console.warn("Service worker registration failed.", error);
      }
    });
  }

  document.addEventListener("click", handleClick);
  document.addEventListener("change", handleChange);
  document.addEventListener("toggle", handleToggle, true);
  document.querySelector("[data-import-input]")?.addEventListener("change", (event) => {
    importProgress(event.target.files?.[0]);
    event.target.value = "";
  });
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    document.querySelectorAll("[data-install-button]").forEach((button) => { button.hidden = false; });
  });
  window.addEventListener("appinstalled", () => showToast(t("installed")));
  window.addEventListener("scroll", () => {
    document.getElementById("site-header")?.classList.toggle("is-scrolled", window.scrollY > 12);
  }, { passive: true });

  applyTheme();
  updateStaticI18n();
  if (location.hash.startsWith("#skill=")) {
    const requested = decodeURIComponent(location.hash.slice(7));
    if (knownSkills.has(requested)) { activeSkillId = requested; previousView = state.onboardingComplete ? "dashboard" : "home"; view = "skill"; }
  } else if (location.hash === "#dashboard" && state.onboardingComplete) view = "dashboard";
  render();
  registerServiceWorker();
})();