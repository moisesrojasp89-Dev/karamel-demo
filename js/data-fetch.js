import { CATALOG_ITEMS } from './data.js';
import { SITE_CONFIG } from './config.js';

/**
 * Local-First Resilient Fallback (ARCHITECTURE.md):
 * Retorna datos locales inmediatamente si Supabase no está configurado o falla la red.
 */
export async function loadCatalogData() {
  if (!SITE_CONFIG.SUPABASE_URL || !SITE_CONFIG.SUPABASE_ANON_KEY) {
    return { items: CATALOG_ITEMS, source: 'local-fallback' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`${SITE_CONFIG.SUPABASE_URL}/rest/v1/catalog_items?select=*&disponible=eq.true`, {
      headers: { apikey: SITE_CONFIG.SUPABASE_ANON_KEY },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remoteItems = await res.json();
    if (Array.isArray(remoteItems) && remoteItems.length > 0) {
      return { items: remoteItems, source: 'supabase' };
    }
    return { items: CATALOG_ITEMS, source: 'local-fallback' };
  } catch {
    return { items: CATALOG_ITEMS, source: 'local-fallback' };
  } finally {
    clearTimeout(timer);
  }
}
