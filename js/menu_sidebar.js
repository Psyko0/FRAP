// js/menu_sidebar.js
(() => {
  const PARTIAL_SIDEBAR   = "partials/Menu_sidebar.html";
  const PARTIAL_SCROLLBAR = "partials/custom_scrollbar.html";

  const q = (sel, root = document) => root.querySelector(sel);

  // Normalise une URL -> compare sur le nom de fichier sans extension
  const normalize = (urlLike) => {
    const u = new URL(urlLike, document.baseURI);     // respecte <base>
    let p = u.pathname.replace(/\/+$/, "");
    let last = (p.split("/").pop() || "index.html").toLowerCase();
    if (!/\./.test(last)) last += ".html";            // cas /pages/Dune_trailer
    return last.replace(/\.html?$/, "");
  };

function markActiveNav(root = document) {
  const normalize = (urlLike) => {
    const u = new URL(urlLike, document.baseURI);
    let p = u.pathname.replace(/\/+$/, "");
    let last = (p.split("/").pop() || "index.html").toLowerCase();
    if (!/\./.test(last)) last += ".html";
    return last.replace(/\.html?$/, "");
  };

  const current = normalize(location.href);

  root.querySelectorAll(".sidebar a, .mobile-menu a").forEach(a => {
    const target = normalize(a.href);
    const isActive = target === current;

    if (isActive) {
      a.classList.add("active", "no-underline");
      a.setAttribute("aria-current", "page");
      a.dataset.nuAuto = "1";               // ← on marque qu’on l’a ajoutée
    } else {
      a.classList.remove("active");
      a.removeAttribute("aria-current");
      if (a.dataset.nuAuto === "1") {       // ← on enlève uniquement si c’est nous
        a.classList.remove("no-underline");
        delete a.dataset.nuAuto;
      }
      // sinon on touche pas: les classes existantes (logo) restent intactes
    }
  });
}



  async function injectPartials() {
    const sidebarPh   = q("#sidebar-placeholder");
    const scrollbarPh = q("#scrollbar-placeholder");
    if (!sidebarPh && !scrollbarPh) return;

    const jobs = [];
    if (sidebarPh)   jobs.push(fetch(PARTIAL_SIDEBAR).then(r => r.text()).then(html => (sidebarPh.innerHTML = html)));
    if (scrollbarPh) jobs.push(fetch(PARTIAL_SCROLLBAR).then(r => r.text()).then(html => (scrollbarPh.innerHTML = html)));
    await Promise.all(jobs);

    // Re-init ce qui dépend du DOM injecté
    window.__theme?.syncThemeToggle?.();
    window.initMobileMenu?.();
    window.initCustomScrollbar?.();

    // Marque l'actif maintenant que le menu existe
    markActiveNav(document);
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectPartials);
  } else {
    injectPartials();
  }

  // Expose au besoin
  window.markActiveNav  = markActiveNav;
  window.reloadSidebars = injectPartials;
})();
