(function () {
  const STORAGE_KEY = "site.lang";
  const DEFAULT_LANG = "en";
  const SUPPORTED = ["en", "fr"];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function getQueryLang() {
    const p = new URLSearchParams(window.location.search);
    const v = (p.get("lang") || "").toLowerCase();
    return SUPPORTED.includes(v) ? v : null;
  }

  function getBrowserLang() {
    const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : null;
  }

  function getStoredLang() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }

  function storeLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
  }

  // ⚠️ clé : construire l’URL des JSON **relatifs à la page en cours**
  function i18nUrlFor(lang) {
    return new URL(`../i18n/${lang}.json`, document.baseURI).href;
  }

  async function loadDict(lang) {
    const url = i18nUrlFor(lang);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    return res.json();
  }

  function applyI18n(dict) {
    // Texte
    $$("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = get(dict, key);
      if (val != null) el.innerHTML = val;

    });

    // Attributs (ex: data-i18n-attr="title=meta.title,placeholder=search.hint")
    $$("[data-i18n-attr]").forEach((el) => {
      const pairs = el.getAttribute("data-i18n-attr").split(",");
      pairs.forEach((pair) => {
        const [attr, key] = pair.split("=").map((s) => s.trim());
        const val = get(dict, key);
        if (attr && val != null) el.setAttribute(attr, val);
      });
    });
  }

  function get(obj, path) {
    return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
  }

  function setLangButtons(active) {
    $$(".lang-btn").forEach((btn) => {
      const isActive = btn.dataset.lang === active;
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }

  async function switchLang(lang) {
    try {
      const dict = await loadDict(lang);
      applyI18n(dict);
      document.documentElement.lang = lang;
      setLangButtons(lang);
      storeLang(lang);

      // Mettre à jour <title> si défini
      const title = get(dict, "meta.title");
      if (title) document.title = title;

      // Mettre à jour l’URL (paramètre lang) sans recharger
      const url = new URL(window.location);
      url.searchParams.set("lang", lang);
      history.replaceState({}, "", url);
    } catch (err) {
      console.error(err);
      if (lang !== DEFAULT_LANG) switchLang(DEFAULT_LANG);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
  // 1) Event delegation : fonctionne même si les boutons arrivent plus tard
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".lang-btn");
    if (!btn) return;
    const lang = btn.dataset.lang;
    if (!lang) return;
    switchLang(lang);
  });

  // 2) Détecte quand le menu (avec .lang-btn) est injecté et met à jour aria-pressed
  const observer = new MutationObserver(() => {
    const current = getStoredLang() || getQueryLang() || getBrowserLang() || DEFAULT_LANG;
    setLangButtons(current);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // 3) Langue de départ : query > storage > navigateur > défaut
  const start = getQueryLang() || getStoredLang() || getBrowserLang() || DEFAULT_LANG;
  switchLang(start);
});

})();
