import { CATALOG_ITEMS } from './data.js';
import { SITE_CONFIG, DEFAULT_SITE_SETTINGS } from './config.js';

const PREVIEW_CATALOG_KEY = 'karamel_preview_catalog';
const PREVIEW_SETTINGS_KEY = 'karamel_preview_settings';

function readPreviewJson(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function sanitizeImageUrl(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (/^\s*(?:javascript:|data:|vbscript:)/i.test(value)) return '';
  if (/[<>"'`]/.test(value)) return '';
  if (/^https?:\/\/[^\s]+$/i.test(value)) return value;
  if (/^(?:\.\/)?assets\/[^\s]+$/i.test(value) && !value.includes('..')) return value;
  return '';
}

export function parseSafePrice(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  const cleaned = String(raw ?? '0').replace(/[^0-9,.-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export function normalizeCatalogItem(row) {
  const src = row && typeof row === 'object' ? row : {};
  const priceUsd = parseSafePrice(src.priceUsd ?? src.price_usd ?? 0);
  const rawStock = Number(src.stock ?? 15);
  const stock = Number.isFinite(rawStock) && rawStock >= 0 ? Math.floor(rawStock) : 15;
  const rawRating = Number(src.rating ?? 4.9);
  const rating = Number.isFinite(rawRating) && rawRating >= 1 && rawRating <= 5 ? rawRating : 4.9;
  return {
    id: String(src.id ?? ''),
    category: String(src.category ?? 'General'),
    brand: src.brand ? String(src.brand) : '',
    name: String(src.name ?? ''),
    description: String(src.description ?? ''),
    priceUsd,
    stock,
    badge: src.badge ? String(src.badge) : '',
    imageUrl: sanitizeImageUrl(src.imageUrl ?? src.image_url ?? ''),
    rating,
    shades: Array.isArray(src.shades) ? src.shades : [],
    featured: Boolean(src.featured),
    disponible: src.disponible !== false,
  };
}

function normalizeStringArray(primary, secondary, fallback, allowEmpty = false) {
  const candidate = primary !== undefined ? primary : secondary;
  let list = null;
  if (Array.isArray(candidate)) {
    list = candidate;
  } else if (typeof candidate === 'string') {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = null;
    }
  }
  if (!list) return [...fallback];
  const cleaned = list.map((v) => String(v ?? '').trim()).filter(Boolean);
  if (cleaned.length === 0 && !allowEmpty) return [...fallback];
  return cleaned;
}

export function normalizeSiteSettings(row) {
  const src = Array.isArray(row) ? row[0] : row;
  if (!src || typeof src !== 'object') {
    return {
      ...DEFAULT_SITE_SETTINGS,
      contactPhones: [...DEFAULT_SITE_SETTINGS.contactPhones],
      paymentMethods: [...DEFAULT_SITE_SETTINGS.paymentMethods],
    };
  }
  const pickStr = (camel, snake, fallback, rejectEmpty = false) => {
    const raw = src[camel] !== undefined && src[camel] !== null ? src[camel] : src[snake];
    if (raw === undefined || raw === null) return fallback;
    const str = String(raw);
    if (rejectEmpty && !str.trim()) return fallback;
    return str;
  };
  return {
    businessHours: pickStr('businessHours', 'business_hours', DEFAULT_SITE_SETTINGS.businessHours, true),
    contactPhones: normalizeStringArray(src.contactPhones, src.contact_phones, DEFAULT_SITE_SETTINGS.contactPhones, false),
    paymentMethods: normalizeStringArray(src.paymentMethods, src.payment_methods, DEFAULT_SITE_SETTINGS.paymentMethods, true),
    announcementText: pickStr('announcementText', 'announcement_text', DEFAULT_SITE_SETTINGS.announcementText),
    promoHeadline: pickStr('promoHeadline', 'promo_headline', DEFAULT_SITE_SETTINGS.promoHeadline),
    deliveryEta: pickStr('deliveryEta', 'delivery_eta', DEFAULT_SITE_SETTINGS.deliveryEta),
  };
}

/**
 * Local-First Resilient Fallback (ARCHITECTURE.md):
 * Retorna datos locales o de vista previa inmediatamente si Supabase no está configurado o falla la red.
 */
export async function loadCatalogData() {
  if (!SITE_CONFIG.SUPABASE_URL || !SITE_CONFIG.SUPABASE_ANON_KEY) {
    const preview = readPreviewJson(PREVIEW_CATALOG_KEY);
    if (Array.isArray(preview)) {
      const items = preview
        .filter((item) => item && typeof item === 'object' && item.disponible !== false)
        .map(normalizeCatalogItem);
      return { items, source: 'local-preview', isEmpty: items.length === 0 };
    }
    return { items: CATALOG_ITEMS, source: 'local-fallback', isEmpty: false };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const baseUrl = SITE_CONFIG.SUPABASE_URL.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/rest/v1/catalog_items?select=*&disponible=eq.true`, {
      headers: { apikey: SITE_CONFIG.SUPABASE_ANON_KEY },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remoteItems = await res.json();
    if (!Array.isArray(remoteItems)) throw new Error('Invalid catalog payload');
    if (remoteItems.length === 0) {
      return { items: [], source: 'supabase', isEmpty: true };
    }
    return { items: remoteItems.map(normalizeCatalogItem), source: 'supabase', isEmpty: false };
  } catch {
    return { items: CATALOG_ITEMS, source: 'local-fallback', isEmpty: false };
  } finally {
    clearTimeout(timer);
  }
}

function withSettingsSource(settings, source) {
  Object.defineProperty(settings, 'source', { value: source, enumerable: false, configurable: true });
  return settings;
}

export async function loadSiteSettings() {
  if (!SITE_CONFIG.SUPABASE_URL || !SITE_CONFIG.SUPABASE_ANON_KEY) {
    const preview = readPreviewJson(PREVIEW_SETTINGS_KEY);
    if (preview && typeof preview === 'object' && !Array.isArray(preview)) {
      return withSettingsSource(normalizeSiteSettings(preview), 'local-preview');
    }
    return withSettingsSource(normalizeSiteSettings(DEFAULT_SITE_SETTINGS), 'local-fallback');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const baseUrl = SITE_CONFIG.SUPABASE_URL.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/rest/v1/site_settings?id=eq.default&select=*`, {
      headers: { apikey: SITE_CONFIG.SUPABASE_ANON_KEY },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (row && typeof row === 'object') {
      return withSettingsSource(normalizeSiteSettings(row), 'supabase');
    }
    return withSettingsSource(normalizeSiteSettings(DEFAULT_SITE_SETTINGS), 'local-fallback');
  } catch {
    return withSettingsSource(normalizeSiteSettings(DEFAULT_SITE_SETTINGS), 'local-fallback');
  } finally {
    clearTimeout(timer);
  }
}
