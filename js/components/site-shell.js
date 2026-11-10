/**
 * site-shell.js — Enrutador cliente instantáneo (0ms) con View Transitions, hidratación y precarga en memoria.
 */
const pageCache = new Map();

function stripSlash(p) {
  if (!p) return '/';
  return (p.length > 1 && p.endsWith('/')) ? p.slice(0, -1) : p;
}

export async function prefetchPage(url) {
  const clean = stripSlash((url || '').split('#')[0]);
  if (!clean || pageCache.has(clean) || !clean.startsWith('/') || clean.startsWith('//')) return;
  try {
    const res = await fetch(clean, { headers: { 'X-Karamel-Prefetch': '1' } });
    if (res.ok) {
      const html = await res.text();
      pageCache.set(clean, html);
    }
  } catch {}
}

export function warmRoutes() {
  if (typeof window === 'undefined') return;
  const currentClean = stripSlash(window.location.pathname);
  if (!pageCache.has(currentClean)) {
    pageCache.set(currentClean, document.documentElement.outerHTML);
  }
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 40));
  idle(() => {
    ['./', 'contacto', 'privacidad', 'terminos'].forEach(prefetchPage);
  });
}

export function updateActiveNavLinks(path) {
  const currentPath = stripSlash(path || window.location.pathname);
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = stripSlash((link.getAttribute('href') || '').split('#')[0]);
    if (href === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

export async function navigateTo(url, isPop = false) {
  const [pathPart, hashPart] = url.split('#');
  const cleanPath = pathPart || window.location.pathname;
  const currentClean = stripSlash(window.location.pathname);
  const targetClean = stripSlash(cleanPath);

  // Si es ancla en la misma página, scroll suave y salir
  if (targetClean === currentClean) {
    if (hashPart) {
      const el = document.getElementById(hashPart);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        if (!isPop) history.pushState(null, '', url);
      }
    }
    return;
  }

  // Obtener HTML (de caché en memoria o fetch inmediato)
  let html = pageCache.get(targetClean) || pageCache.get(cleanPath);
  if (!html) {
    try {
      const res = await fetch(cleanPath);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      html = await res.text();
      pageCache.set(targetClean, html);
    } catch {
      window.location.href = url;
      return;
    }
  }

  const parser = new DOMParser();
  const nextDoc = parser.parseFromString(html, 'text/html');
  const nextRoot = nextDoc.getElementById('app-root');
  const currentRoot = document.getElementById('app-root');

  if (!nextRoot || !currentRoot) {
    window.location.href = url;
    return;
  }

  const swapContent = () => {
    document.title = nextDoc.title;
    currentRoot.innerHTML = nextRoot.innerHTML;
    updateActiveNavLinks(targetClean);

    if (hashPart) {
      const el = document.getElementById(hashPart);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (!isPop) {
      history.pushState(null, '', url);
    }

    document.dispatchEvent(new CustomEvent('karamel:navigate', { detail: { path: targetClean } }));
  };

  if (document.startViewTransition) {
    document.startViewTransition(swapContent);
  } else {
    swapContent();
  }
}

export function initSiteShell() {
  warmRoutes();
  updateActiveNavLinks();

  // Precarga especulativa al posicionar puntero o toque sobre cualquier enlace
  document.addEventListener('pointerover', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('//')) return;
    prefetchPage(href);
  }, { passive: true });

  // Desenfocar inmediatamente ante clic o toque para anular cualquier focus ring nativo del SO
  document.addEventListener('pointerdown', (e) => {
    const interactive = e.target.closest('a, button');
    if (interactive && document.activeElement && document.activeElement !== interactive) {
      document.activeElement.blur();
    }
  });

  // Interceptar clics en enlaces internos para navegación suave (0ms, sin recarga ni destellos)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('//')) return;
    if (a.hasAttribute('target') && a.getAttribute('target') !== '_self') return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    if (document.activeElement) document.activeElement.blur();
    navigateTo(href);
  });

  // Soporte para botones Atrás/Adelante del navegador
  window.addEventListener('popstate', () => {
    navigateTo(window.location.pathname + window.location.hash, true);
  });

  const yearNode = document.getElementById('footer-year');
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }
}
export const SHELL_BRAND = "Velvet Aura Beauty";
