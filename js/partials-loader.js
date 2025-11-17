// /js/partials-loader.js — injecteur unique (racine + /pages), safe Live Server
// Ajout : prise en charge de #projects-placeholder + exclusion du projet courant

// 0) Nettoie tout <script> que Live Server pourrait coller dans les partiels
function stripScripts(html) {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, '');
}

(async () => {
  const sidebarPh    = document.getElementById("sidebar-placeholder");
  const scrollbarPh  = document.getElementById("scrollbar-placeholder");
  const projectsPh   = document.getElementById("projects-placeholder"); // NEW

  // Si aucun placeholder n'existe, on sort
  if (!sidebarPh && !scrollbarPh && !projectsPh) return;

  // Evite le cache pendant le dev
  const bust = `v=${Date.now()}`;
  const TRY = (p) =>
    fetch(p + (p.includes("?") ? "&" : "?") + bust, {
      cache: "no-store",
      credentials: "same-origin"
    });

  // Tente d'abord ./partials/... puis ../partials/... (fonctionne en racine et /pages)
  async function fetchWithFallback(primary, fallback) {
    let r = await TRY(primary);
    if (!r.ok && fallback) r = await TRY(fallback);
    if (!r.ok) throw new Error(`Fetch failed: ${primary} / ${fallback || ""} -> ${r.status}`);
    return r.text();
  }

  // 1) Récupération parallèle des partiels nécessaires
  const [sidebarHtml, scrollbarHtml, projectsHtml] = await Promise.all([
    sidebarPh   ? fetchWithFallback("./partials/Menu_sidebar.html",     "../partials/Menu_sidebar.html")     : Promise.resolve(null),
    scrollbarPh ? fetchWithFallback("./partials/custom_scrollbar.html", "../partials/custom_scrollbar.html") : Promise.resolve(null),
    projectsPh  ? fetchWithFallback("./partials/DA_prjcts.html",        "../partials/DA_prjcts.html")        : Promise.resolve(null), // ⬅️ UPDATED
  ]);

  // 2) Injection sidebar + scrollbar
  if (sidebarPh && sidebarHtml)     sidebarPh.innerHTML   = stripScripts(sidebarHtml);
  if (scrollbarPh && scrollbarHtml) scrollbarPh.innerHTML = stripScripts(scrollbarHtml);

  // 3) Injection de la galerie projets + exclusion du projet courant
  if (projectsPh && projectsHtml) {
    projectsPh.innerHTML = stripScripts(projectsHtml);

    // Détermine le "slug courant" par ordre de priorité :
    const currentFromAttr   = (projectsPh.getAttribute('data-current') || "").toLowerCase().trim();
    const currentFromGlobal = (window.CURRENT_PROJECT || "").toLowerCase().trim();

    function deduceCurrentSlug(root) {
      const path = location.pathname.toLowerCase();
      const cards = Array.from(root.querySelectorAll('[data-project]'));
      for (const el of cards) {
        const slug = (el.getAttribute('data-project') || "").toLowerCase().trim();
        const href = (el.getAttribute('href') || "").toLowerCase();
        if (slug && (path.includes(slug) || (href && path.endsWith(href.split('/').pop())))) {
          return slug;
        }
      }
      const last = (path.split('/').pop() || "").replace(/\.[a-z0-9]+$/i, '');
      return last || "";
    }

    const current =
      currentFromAttr ||
      currentFromGlobal ||
      deduceCurrentSlug(projectsPh) ||
      "";

    if (current) {
      projectsPh.querySelectorAll(`[data-project="${current}"]`).forEach(el => el.remove());
    }

    document.dispatchEvent(new Event("projects:ready"));
  }

  // 4) Auto-fix sidebar extras
  (function ensureSidebarExtras(root) {
    const sidebar = root?.querySelector?.('.sidebar');
    const ul = sidebar?.querySelector?.('ul');
    if (!sidebar || !ul) return;

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

  // 5) Active nav highlight
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

  // 6) Rebranchements dépendants du DOM injecté
  window.__theme?.syncThemeToggle?.();
  window.initMobileMenu?.();
  window.initCustomScrollbar?.();

  document.dispatchEvent(new Event("sidebar:ready"));
})().catch(e => console.error("[partials-loader] error:", e));
