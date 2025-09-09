// /js/partials-loader.js — injecteur unique (racine + /pages), safe Live Server

// 0) Nettoie tout <script> que Live Server pourrait coller dans les partiels
function stripScripts(html) {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, '');
}

(async () => {
  const sidebarPh   = document.getElementById("sidebar-placeholder");
  const scrollbarPh = document.getElementById("scrollbar-placeholder");
  if (!sidebarPh && !scrollbarPh) return;

  // Evite le cache pendant le dev
  const bust = `v=${Date.now()}`;
  const TRY = (p) =>
    fetch(p + (p.includes("?") ? "&" : "?") + bust, { cache: "no-store", credentials: "same-origin" });

  // Tente d'abord ./partials/... puis ../partials/... (fonctionne en racine et /pages)
  async function fetchWithFallback(primary, fallback) {
    let r = await TRY(primary);
    if (!r.ok && fallback) r = await TRY(fallback);
    if (!r.ok) throw new Error(`Fetch failed: ${primary} / ${fallback || ""} -> ${r.status}`);
    return r.text();
  }

  const [sidebarHtml, scrollbarHtml] = await Promise.all([
    sidebarPh   ? fetchWithFallback("./partials/Menu_sidebar.html",     "../partials/Menu_sidebar.html")     : Promise.resolve(null),
    scrollbarPh ? fetchWithFallback("./partials/custom_scrollbar.html", "../partials/custom_scrollbar.html") : Promise.resolve(null),
  ]);

  if (sidebarPh && sidebarHtml)     sidebarPh.innerHTML   = stripScripts(sidebarHtml);
  if (scrollbarPh && scrollbarHtml) scrollbarPh.innerHTML = stripScripts(scrollbarHtml);

  // Auto-fix : si jamais les deux blocs n’étaient pas dans le partiel (ou cassés), on les recrée
  (function ensureSidebarExtras(root) {
    const sidebar = root.querySelector('.sidebar');
    const ul = sidebar?.querySelector('ul');
    if (!sidebar || !ul) return;

    // Switch thème (dans le <ul>, en bas)
    if (!sidebar.querySelector('.theme-switch-wrapper')) {
      const li = document.createElement('li');
      li.className = 'mb5';
      li.innerHTML = `
        <div class="theme-switch-wrapper">
          <label class="theme-switch">
            <input type="checkbox" id="theme-toggle" />
            <span class="slider"></span>
          </label>
        </div>`;
      ul.appendChild(li);
    }

    // Sélecteur de langue (juste après le </ul>)
    if (!sidebar.querySelector('.lang-switch')) {
      const lang = document.createElement('div');
      lang.className = 'lang-switch';
      lang.setAttribute('role', 'group');
      lang.setAttribute('aria-label', 'Lang');
      lang.innerHTML = `
        <button class="lang-btn" data-lang="en" aria-pressed="true">EN</button>
        <button class="lang-btn" data-lang="fr" aria-pressed="false">FR</button>`;
      ul.insertAdjacentElement('afterend', lang);
    }
  })(sidebarPh);

  // Marque le lien actif (sans réécrire le HTML)
  (function markActiveNav(root = document) {
    const links = root.querySelectorAll('.sidebar a.menu_page, .mobile-menu a.menu_page, .sidebar .about a, .mobile-menu .about');
    const current = (location.pathname.split('/').pop() || "index.html").toLowerCase();
    links.forEach(a => {
      const href = (a.getAttribute('href') || "").split('/').pop()?.toLowerCase();
      const isActive = href === current || (current === "" && href === "index.html");
      a.classList.toggle('active', !!isActive);
      if (isActive) a.classList.add('no-underline');
    });
  })();

  // Rebranchements dépendants du DOM injecté
  window.__theme?.syncThemeToggle?.();
  window.initMobileMenu?.();
  window.initCustomScrollbar?.();

  // Signal global pour scripts externes
  document.dispatchEvent(new Event("sidebar:ready"));
})().catch(e => console.error("[partials-loader] error:", e));
