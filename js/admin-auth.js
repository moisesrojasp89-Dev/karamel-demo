import { CATALOG_ITEMS } from './data.js';
import { SITE_CONFIG, DEFAULT_SITE_SETTINGS } from './config.js';
import { escHtml, parsePrice } from './main.js';
import { normalizeCatalogItem, normalizeSiteSettings } from './data-fetch.js';

const PREVIEW_CATALOG_KEY = 'karamel_preview_catalog';
const PREVIEW_SETTINGS_KEY = 'karamel_preview_settings';
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const ALLOWED_IMAGE_EXTS = /\.(?:jpe?g|png|webp|avif)$/i;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function readPreviewJson(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writePreviewJson(key, value) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removePreviewKey(key) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    // Degradación elegante si Web Storage está bloqueado
  }
}

function getBaseCatalogList() {
  const stored = readPreviewJson(PREVIEW_CATALOG_KEY, null);
  const source = Array.isArray(stored) ? stored : CATALOG_ITEMS;
  return source.map((row) => normalizeCatalogItem(row));
}

function slugifyItemId(name) {
  const base = String(name || 'item')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

async function supabaseFetchJson(path, session, options = {}) {
  if (!SITE_CONFIG.SUPABASE_URL || !SITE_CONFIG.SUPABASE_ANON_KEY || !session?.accessToken) {
    return { ok: false, error: 'Sesión Supabase incompleta.' };
  }
  const baseUrl = SITE_CONFIG.SUPABASE_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        apikey: SITE_CONFIG.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) return { ok: false, status: res.status, error: `Error HTTP ${res.status} en Supabase.` };
    const text = await res.text();
    return { ok: true, data: text ? JSON.parse(text) : null };
  } catch {
    return { ok: false, error: 'Error de red al conectar con Supabase.' };
  }
}

/**
 * Autenticación Zero-Trust contra Supabase Auth:
 * El permiso de escritura reside en el JWT con app_metadata.role === 'admin' validado por RLS.
 */
export async function authenticateAdminWithSupabase(email, password) {
  if (!SITE_CONFIG.SUPABASE_URL || !SITE_CONFIG.SUPABASE_ANON_KEY) {
    return { ok: false, error: 'Servidor de autenticación no configurado.' };
  }
  try {
    const baseUrl = SITE_CONFIG.SUPABASE_URL.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SITE_CONFIG.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return { ok: false, error: 'Credenciales inválidas o sin rol administrativo.' };
    const session = await res.json();
    if (session?.user?.app_metadata?.role !== 'admin') {
      return { ok: false, error: 'Tu cuenta no tiene permisos de administrador (app_metadata.role).' };
    }
    return {
      ok: true,
      mode: 'supabase',
      accessToken: String(session.access_token || ''),
      email: String(session.user?.email || email || ''),
    };
  } catch {
    return { ok: false, error: 'Error de red al verificar sesión.' };
  }
}

export function isSafeImageUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) return false;
  if (/^\s*(?:javascript|data|vbscript):/i.test(value)) return false;
  if (/[<>"'`]/.test(value)) return false;
  if (/^https?:\/\/[^\s]+$/i.test(value)) return true;
  return /^(?:\.\/)?assets\/[^\s]+$/i.test(value) && !value.includes('..');
}

export async function uploadCatalogImage(file, accessToken) {
  if (!file) return { ok: false, error: 'Selecciona un archivo de imagen.' };
  const fileType = String(file.type || '').toLowerCase();
  const fileName = String(file.name || '').trim();
  const fileSize = Number(file.size ?? 0);
  if (!ALLOWED_IMAGE_MIME_TYPES.has(fileType) || !ALLOWED_IMAGE_EXTS.test(fileName)) {
    return { ok: false, error: 'Formato inválido. Usa únicamente imágenes JPG, PNG, WebP o AVIF.' };
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'La imagen debe pesar más de 0 bytes y máximo 5 MB.' };
  }
  if (!SITE_CONFIG.SUPABASE_URL || !SITE_CONFIG.SUPABASE_ANON_KEY || !accessToken) {
    return { ok: false, error: 'La subida de archivos requiere sesión activa en Supabase.' };
  }
  const cleanName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/^-+|-+$/g, '') || 'imagen.webp';
  const safeName = `${Date.now()}-${cleanName}`;
  const baseUrl = SITE_CONFIG.SUPABASE_URL.replace(/\/$/, '');
  const res = await supabaseFetchJson(
    `/storage/v1/object/catalog-images/${safeName}`,
    { accessToken },
    {
      method: 'POST',
      headers: { 'Content-Type': fileType, 'x-upsert': 'true' },
      body: file,
    }
  );
  if (!res.ok) return { ok: false, status: res.status, error: res.error || 'No se pudo subir la imagen.' };
  return { ok: true, url: `${baseUrl}/storage/v1/object/public/catalog-images/${safeName}` };
}

export async function optimizeImageToWebp(file, maxEdge = 900, quality = 0.82) {
  if (!file || typeof document === 'undefined' || typeof URL === 'undefined') {
    return { file, originalBytes: file?.size || 0, optimizedBytes: file?.size || 0, converted: false };
  }
  const originalBytes = Number(file.size || 0);
  if (file.type === 'image/webp' && originalBytes > 0 && originalBytes <= 120 * 1024) {
    return { file, originalBytes, optimizedBytes: originalBytes, converted: false };
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      el.src = objectUrl;
    });
    const natW = img.naturalWidth || img.width || 1;
    const natH = img.naturalHeight || img.height || 1;
    const scale = Math.min(1, maxEdge / Math.max(natW, natH));
    const width = Math.max(1, Math.round(natW * scale));
    const height = Math.max(1, Math.round(natH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { file, originalBytes, optimizedBytes: originalBytes, converted: false };
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob || blob.size <= 0 || (originalBytes > 0 && blob.size >= originalBytes && file.type === 'image/webp')) {
      return { file, originalBytes, optimizedBytes: originalBytes, converted: false };
    }
    const baseName = String(file.name || 'producto').replace(/\.[^.]+$/, '');
    const outFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
    return { file: outFile, originalBytes, optimizedBytes: blob.size, width, height, converted: true };
  } catch {
    return { file, originalBytes, optimizedBytes: originalBytes, converted: false };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function fetchAdminItems(session = { mode: 'local-preview' }) {
  if (session?.mode === 'supabase') {
    const res = await supabaseFetchJson('/rest/v1/catalog_items?select=*&order=featured.desc,name.asc', session);
    if (!res.ok) return { ok: false, status: res.status, error: res.error, items: [] };
    const items = Array.isArray(res.data) ? res.data.map((row) => normalizeCatalogItem(row)) : [];
    return { ok: true, items };
  }
  return { ok: true, items: getBaseCatalogList() };
}

export async function saveAdminItem(item, session = { mode: 'local-preview' }) {
  const cleanName = String(item?.name ?? '').trim();
  const cleanCategory = String(item?.category ?? '').trim();
  if (!cleanName || !cleanCategory) {
    return { ok: false, error: 'El nombre y la categoría son obligatorios.' };
  }
  const rawUrl = String(item?.imageUrl ?? item?.image_url ?? '').trim();
  if (rawUrl && !isSafeImageUrl(rawUrl)) {
    return { ok: false, error: 'URL de imagen insegura o inválida. Usa https:// o assets/...' };
  }
  const normalized = normalizeCatalogItem({
    ...item,
    id: String(item?.id ?? '').trim() || slugifyItemId(cleanName),
    name: cleanName,
    category: cleanCategory,
    brand: String(item?.brand ?? '').trim() || SITE_CONFIG.BUSINESS_NAME,
    priceUsd: parsePrice(item?.priceUsd ?? item?.price_usd ?? 0),
    stock: Math.max(0, Math.floor(Number(item?.stock ?? 15) || 0)),
    imageUrl: rawUrl || undefined,
    featured: Boolean(item?.featured),
    disponible: item?.disponible !== false,
  });

  if (session?.mode === 'supabase') {
    const payload = {
      id: normalized.id,
      category: normalized.category,
      brand: normalized.brand || SITE_CONFIG.BUSINESS_NAME,
      name: normalized.name,
      description: normalized.description,
      price_usd: normalized.priceUsd,
      stock: normalized.stock,
      badge: normalized.badge || null,
      image_url: normalized.imageUrl || null,
      featured: Boolean(normalized.featured),
      disponible: normalized.disponible !== false,
    };
    const res = await supabaseFetchJson('/rest/v1/catalog_items?on_conflict=id', session, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, status: res.status, error: res.error };
    const saved = Array.isArray(res.data) && res.data[0] ? normalizeCatalogItem(res.data[0]) : normalized;
    return { ok: true, item: saved };
  }

  const current = getBaseCatalogList();
  const idx = current.findIndex((entry) => entry.id === normalized.id);
  const nextList = idx >= 0
    ? current.map((entry, pos) => (pos === idx ? normalized : entry))
    : [normalized, ...current];
  writePreviewJson(PREVIEW_CATALOG_KEY, nextList);
  return { ok: true, item: normalized, items: nextList };
}

export async function toggleItemAvailability(id, disponible, session = { mode: 'local-preview' }) {
  const nextState = Boolean(disponible);
  if (session?.mode === 'supabase') {
    const res = await supabaseFetchJson(`/rest/v1/catalog_items?id=eq.${encodeURIComponent(id)}`, session, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ disponible: nextState }),
    });
    return res.ok ? { ok: true } : { ok: false, status: res.status, error: res.error };
  }
  const nextList = getBaseCatalogList().map((item) => (item.id === id ? { ...item, disponible: nextState } : item));
  writePreviewJson(PREVIEW_CATALOG_KEY, nextList);
  return { ok: true, items: nextList };
}

export async function deleteAdminItem(id, session = { mode: 'local-preview' }) {
  if (session?.mode === 'supabase') {
    const res = await supabaseFetchJson(`/rest/v1/catalog_items?id=eq.${encodeURIComponent(id)}`, session, { method: 'DELETE' });
    return res.ok ? { ok: true } : { ok: false, status: res.status, error: res.error };
  }
  const nextList = getBaseCatalogList().filter((item) => item.id !== id);
  writePreviewJson(PREVIEW_CATALOG_KEY, nextList);
  return { ok: true, items: nextList };
}

export async function fetchAdminSettings(session = { mode: 'local-preview' }) {
  if (session?.mode === 'supabase') {
    const res = await supabaseFetchJson('/rest/v1/site_settings?id=eq.default&select=*', session);
    if (!res.ok) return { ok: false, status: res.status, error: res.error, settings: normalizeSiteSettings(DEFAULT_SITE_SETTINGS) };
    const row = Array.isArray(res.data) && res.data[0] ? res.data[0] : DEFAULT_SITE_SETTINGS;
    return { ok: true, settings: normalizeSiteSettings(row) };
  }
  const stored = readPreviewJson(PREVIEW_SETTINGS_KEY, null);
  return { ok: true, settings: normalizeSiteSettings(stored || DEFAULT_SITE_SETTINGS) };
}

export async function saveAdminSettings(settings, session = { mode: 'local-preview' }) {
  const normalized = normalizeSiteSettings(settings);
  if (session?.mode === 'supabase') {
    const payload = {
      id: 'default',
      business_hours: normalized.businessHours,
      contact_phones: normalized.contactPhones,
      payment_methods: normalized.paymentMethods,
      announcement_text: normalized.announcementText,
      promo_headline: normalized.promoHeadline,
      delivery_eta: normalized.deliveryEta,
    };
    const res = await supabaseFetchJson('/rest/v1/site_settings?on_conflict=id', session, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, status: res.status, error: res.error };
    const saved = Array.isArray(res.data) && res.data[0] ? normalizeSiteSettings(res.data[0]) : normalized;
    return { ok: true, settings: saved };
  }
  writePreviewJson(PREVIEW_SETTINGS_KEY, normalized);
  return { ok: true, settings: normalized };
}

function initAdminWorkspaceUi() {
  const byId = (id) => document.getElementById(id);
  const authSection = byId('admin-auth-section');
  const workspace = byId('admin-workspace');
  const authForm = byId('supabase-admin-auth-form');
  if (!authSection || !workspace || !authForm) return;

  const authStatus = byId('admin-auth-status');
  const statusNode = byId('admin-status');
  const searchInput = byId('admin-search');
  const itemsList = byId('admin-items-list');
  const itemForm = byId('admin-item-form');
  const tabButtons = document.querySelectorAll('[data-admin-tab]');

  let currentSession = null;
  let adminItems = [];
  let adminSettings = normalizeSiteSettings(DEFAULT_SITE_SETTINGS);

  const setStatus = (node, msg, isError = false) => {
    if (!node) return;
    node.textContent = msg;
    node.classList.toggle('admin-status--error', Boolean(isError));
    node.classList.toggle('admin-status--ok', Boolean(msg && !isError));
  };

  const hasSupabaseConfig = Boolean(SITE_CONFIG.SUPABASE_URL && SITE_CONFIG.SUPABASE_ANON_KEY);
  const previewBtn = byId('admin-preview-btn');
  if (previewBtn && hasSupabaseConfig) {
    previewBtn.hidden = true;
  }

  const handleSessionExpired = (res) => {
    if (res?.status !== 401) return false;
    currentSession = null;
    workspace.hidden = true;
    authSection.hidden = false;
    setStatus(statusNode, '');
    setStatus(authStatus, 'Tu sesión expiró. Inicia sesión de nuevo.', true);
    return true;
  };

  const renderChips = (listNode, values, attrName, primaryLabel) => {
    if (!listNode) return;
    listNode.innerHTML = values.length
      ? values.map((val, idx) => {
          const extra = idx === 0 && primaryLabel ? ` · ${escHtml(primaryLabel)}` : '';
          return `<li class="admin-chip"><span>${escHtml(val)}${extra}</span><button type="button" class="admin-chip-remove" data-${attrName}="${idx}" aria-label="Eliminar ${escHtml(val)}">×</button></li>`;
        }).join('')
      : '<li class="admin-chip"><span>Sin elementos registrados</span></li>';
  };

  const renderSettingsForm = () => {
    if (byId('settings-hours')) byId('settings-hours').value = adminSettings.businessHours || '';
    if (byId('settings-announcement')) byId('settings-announcement').value = adminSettings.announcementText || '';
    if (byId('settings-promo')) byId('settings-promo').value = adminSettings.promoHeadline || '';
    if (byId('settings-eta')) byId('settings-eta').value = adminSettings.deliveryEta || '';
    renderChips(byId('admin-phones-list'), adminSettings.contactPhones || [], 'remove-phone', 'WhatsApp principal');
    renderChips(byId('admin-payments-list'), adminSettings.paymentMethods || [], 'remove-payment', '');
  };

  const renderItemsList = () => {
    if (!itemsList) return;
    const query = String(searchInput?.value || '').trim().toLowerCase();
    const filtered = adminItems.filter((item) =>
      !query || `${item.id} ${item.name} ${item.category} ${item.brand || ''}`.toLowerCase().includes(query)
    );
    const countNode = byId('admin-items-count');
    if (countNode) countNode.textContent = `${filtered.length} de ${adminItems.length} ítems`;
    if (filtered.length === 0) {
      itemsList.innerHTML = '<p class="mcard-desc">No hay ítems que coincidan con el filtro actual.</p>';
      return;
    }
    itemsList.innerHTML = filtered.map((item) => {
      const isAvail = item.disponible !== false;
      const eid = escHtml(item.id);
      return `<article class="admin-item" data-item-id="${eid}">
        <div class="admin-item-main">
          <div class="admin-item-meta">
            <strong>${escHtml(item.name)}</strong>
            <span class="admin-badge ${isAvail ? 'admin-badge--success' : 'admin-badge--muted'}">${isAvail ? 'Disponible' : 'Agotado'}</span>
            <span class="mcard-desc">${escHtml(item.category)} · ID: ${eid}</span>
          </div>
          <div class="admin-item-quick">
            <label class="admin-quick-field">Precio
              <input type="number" class="form-control admin-quick-price" data-quick-price="${eid}" value="${parsePrice(item.priceUsd).toFixed(2)}" min="0" step="0.01">
            </label>
            <label class="admin-quick-field">Stock
              <input type="number" class="form-control admin-quick-stock" data-quick-stock="${eid}" value="${Number(item.stock ?? 15)}" min="0" step="1">
            </label>
          </div>
        </div>
        <div class="admin-item-actions">
          <button type="button" class="btn-outline" data-action="quick-save" data-id="${eid}">Aplicar</button>
          <button type="button" class="btn-outline" data-action="toggle-avail" data-id="${eid}" data-next="${isAvail ? 'false' : 'true'}">${isAvail ? 'Marcar agotado' : 'Activar'}</button>
          <button type="button" class="btn-outline" data-action="edit" data-id="${eid}">Editar</button>
          <button type="button" class="btn-outline admin-btn-danger" data-action="delete" data-id="${eid}">Eliminar</button>
        </div>
      </article>`;
    }).join('');
  };

  const fillItemForm = (item) => {
    byId('item-id').value = item ? item.id : '';
    byId('item-name').value = item ? item.name : '';
    byId('item-category').value = item ? item.category : '';
    byId('item-price').value = item ? parsePrice(item.priceUsd).toFixed(2) : '';
    byId('item-stock').value = item ? String(item.stock ?? 15) : '15';
    byId('item-badge').value = item?.badge || '';
    byId('item-image-url').value = item?.imageUrl || '';
    byId('item-description').value = item ? item.description : '';
    byId('item-featured').checked = Boolean(item?.featured);
    byId('item-disponible').checked = item ? item.disponible !== false : true;
    if (byId('item-image-file')) byId('item-image-file').value = '';
  };

  const enterWorkspace = async (session) => {
    currentSession = session;
    authSection.hidden = true;
    workspace.hidden = false;
    if (byId('admin-mode-badge')) {
      byId('admin-mode-badge').textContent = session.mode === 'supabase' ? 'Supabase Conectado' : 'Vista Previa Local';
    }
    if (byId('settings-reset-btn')) byId('settings-reset-btn').hidden = session.mode === 'supabase';
    const [itemsRes, settingsRes] = await Promise.all([
      fetchAdminItems(currentSession),
      fetchAdminSettings(currentSession),
    ]);
    if (handleSessionExpired(itemsRes) || handleSessionExpired(settingsRes)) return;
    adminItems = itemsRes.items || [];
    adminSettings = settingsRes.settings || normalizeSiteSettings(DEFAULT_SITE_SETTINGS);
    renderItemsList();
    renderSettingsForm();
    setStatus(statusNode, itemsRes.ok ? 'Panel listo para editar.' : (itemsRes.error || 'Error cargando catálogo.'), !itemsRes.ok);
  };

  const bindChipField = (listId, inputId, addBtnId, fieldKey, attrName, primaryLabel) => {
    const listNode = byId(listId);
    const inputNode = byId(inputId);
    byId(addBtnId)?.addEventListener('click', () => {
      const val = String(inputNode?.value || '').trim();
      if (!val) return;
      adminSettings = { ...adminSettings, [fieldKey]: [...(adminSettings[fieldKey] || []), val] };
      inputNode.value = '';
      renderChips(listNode, adminSettings[fieldKey], attrName, primaryLabel);
    });
    listNode?.addEventListener('click', (event) => {
      const btn = event.target.closest(`[data-${attrName}]`);
      if (!btn) return;
      const idx = Number(btn.getAttribute(`data-${attrName}`));
      adminSettings = { ...adminSettings, [fieldKey]: (adminSettings[fieldKey] || []).filter((_, i) => i !== idx) };
      renderChips(listNode, adminSettings[fieldKey], attrName, primaryLabel);
    });
  };

  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(authStatus, 'Verificando credenciales...');
    const res = await authenticateAdminWithSupabase(byId('admin-email')?.value || '', byId('admin-password')?.value || '');
    if (!res.ok) return setStatus(authStatus, res.error || 'No autorizado.', true);
    setStatus(authStatus, '');
    await enterWorkspace(res);
  });

  byId('admin-preview-btn')?.addEventListener('click', async () => {
    if (SITE_CONFIG.SUPABASE_URL && SITE_CONFIG.SUPABASE_ANON_KEY) {
      return setStatus(authStatus, 'La vista previa local está deshabilitada en producción.', true);
    }
    setStatus(authStatus, '');
    await enterWorkspace({ mode: 'local-preview' });
  });

  byId('admin-logout-btn')?.addEventListener('click', () => {
    currentSession = null;
    workspace.hidden = true;
    authSection.hidden = false;
    setStatus(statusNode, '');
  });

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-admin-tab');
      tabButtons.forEach((other) => {
        const active = other.getAttribute('data-admin-tab') === target;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-selected', String(active));
      });
      if (byId('admin-tab-catalog')) byId('admin-tab-catalog').hidden = target !== 'catalog';
      if (byId('admin-tab-settings')) byId('admin-tab-settings').hidden = target !== 'settings';
    });
  });

  searchInput?.addEventListener('input', renderItemsList);

  itemsList?.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn || !currentSession) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    const found = adminItems.find((entry) => entry.id === id);
    if (!id) return;

    if (action === 'edit' && found) {
      fillItemForm(found);
      itemForm?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (action === 'quick-save' && found) {
      const card = btn.closest('.admin-item');
      const res = await saveAdminItem({
        ...found,
        priceUsd: parsePrice(card?.querySelector('[data-quick-price]')?.value),
        stock: Number(card?.querySelector('[data-quick-stock]')?.value),
      }, currentSession);
      if (handleSessionExpired(res)) return;
      if (!res.ok) return setStatus(statusNode, res.error || 'No se pudo actualizar.', true);
      const listRes = await fetchAdminItems(currentSession);
      if (handleSessionExpired(listRes)) return;
      adminItems = listRes.items || adminItems;
      renderItemsList();
      return setStatus(statusNode, `Actualizado: ${found.name}`);
    }
    if (action === 'toggle-avail') {
      const next = btn.getAttribute('data-next') === 'true';
      const res = await toggleItemAvailability(id, next, currentSession);
      if (handleSessionExpired(res)) return;
      if (!res.ok) return setStatus(statusNode, res.error || 'No se pudo cambiar estado.', true);
      const listRes = await fetchAdminItems(currentSession);
      if (handleSessionExpired(listRes)) return;
      adminItems = listRes.items || adminItems;
      renderItemsList();
      return setStatus(statusNode, next ? 'Ítem activado en catálogo.' : 'Ítem marcado como agotado.');
    }
    if (action === 'delete') {
      if (btn.dataset.confirmDelete !== 'true') {
        btn.dataset.confirmDelete = 'true';
        btn.textContent = '¿Confirmar?';
        setTimeout(() => {
          if (btn.dataset.confirmDelete === 'true') {
            delete btn.dataset.confirmDelete;
            btn.textContent = 'Eliminar';
          }
        }, 4000);
        return;
      }
      delete btn.dataset.confirmDelete;
      const res = await deleteAdminItem(id, currentSession);
      if (handleSessionExpired(res)) return;
      if (!res.ok) return setStatus(statusNode, res.error || 'No se pudo eliminar.', true);
      adminItems = adminItems.filter((entry) => entry.id !== id);
      renderItemsList();
      setStatus(statusNode, 'Ítem eliminado del catálogo.');
    }
  });

  const imageFileInput = byId('item-image-file');
  const imageUrlInput = byId('item-image-url');
  const imageHintNode = byId('item-image-hint');
  let pendingOptimizedFile = null;

  imageFileInput?.addEventListener('change', async () => {
    pendingOptimizedFile = null;
    const rawFile = imageFileInput.files?.[0];
    if (!rawFile || !imageHintNode) return;
    imageHintNode.textContent = 'Optimizando imagen a WebP...';
    const opt = await optimizeImageToWebp(rawFile);
    pendingOptimizedFile = opt.file;
    const origKb = Math.max(1, Math.round(opt.originalBytes / 1024));
    const finalKb = Math.max(1, Math.round(opt.optimizedBytes / 1024));
    const saved = opt.originalBytes > 0 ? Math.max(0, Math.round((1 - opt.optimizedBytes / opt.originalBytes) * 100)) : 0;
    imageHintNode.textContent = opt.converted
      ? `Optimizada a WebP (${opt.width}×${opt.height}): ${origKb} KB → ${finalKb} KB (-${saved}%)`
      : `Lista para subir: ${finalKb} KB (ya está optimizada)`;
  });

  imageUrlInput?.addEventListener('blur', () => {
    if (!imageHintNode) return;
    const val = String(imageUrlInput.value || '').trim();
    if (/^https?:\/\/.+\.(png|jpe?g|bmp)(\?.*)?$/i.test(val)) {
      imageHintNode.textContent = 'Consejo de velocidad: esa URL no es WebP. Sube el archivo abajo para comprimirlo automáticamente.';
    }
  });

  itemForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentSession) return;
    let imageUrl = String(byId('item-image-url')?.value || '').trim();
    const rawFile = byId('item-image-file')?.files?.[0];
    if (rawFile) {
      const opt = pendingOptimizedFile ? { file: pendingOptimizedFile } : await optimizeImageToWebp(rawFile);
      const uploadRes = await uploadCatalogImage(opt.file, currentSession.accessToken);
      pendingOptimizedFile = null;
      if (handleSessionExpired(uploadRes)) return;
      if (!uploadRes.ok) return setStatus(statusNode, uploadRes.error || 'No se pudo subir la imagen.', true);
      imageUrl = uploadRes.url;
    }
    const payload = {
      id: byId('item-id')?.value || '',
      name: byId('item-name')?.value || '',
      category: byId('item-category')?.value || '',
      priceUsd: parsePrice(byId('item-price')?.value),
      stock: Number(byId('item-stock')?.value ?? 15),
      badge: byId('item-badge')?.value || '',
      imageUrl,
      description: byId('item-description')?.value || '',
      featured: Boolean(byId('item-featured')?.checked),
      disponible: Boolean(byId('item-disponible')?.checked),
    };
    const res = await saveAdminItem(payload, currentSession);
    if (handleSessionExpired(res)) return;
    if (!res.ok) return setStatus(statusNode, res.error || 'Error al guardar ítem.', true);
    const listRes = await fetchAdminItems(currentSession);
    if (handleSessionExpired(listRes)) return;
    adminItems = listRes.items || adminItems;
    renderItemsList();
    fillItemForm(null);
    setStatus(statusNode, `Ítem guardado: ${res.item?.name || payload.name}`);
  });

  byId('item-reset-btn')?.addEventListener('click', () => fillItemForm(null));
  bindChipField('admin-phones-list', 'new-phone-input', 'add-phone-btn', 'contactPhones', 'remove-phone', 'WhatsApp principal');
  bindChipField('admin-payments-list', 'new-payment-input', 'add-payment-btn', 'paymentMethods', 'remove-payment', '');

  byId('admin-settings-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentSession) return;
    const res = await saveAdminSettings({
      ...adminSettings,
      businessHours: byId('settings-hours')?.value || '',
      announcementText: byId('settings-announcement')?.value || '',
      promoHeadline: byId('settings-promo')?.value || '',
      deliveryEta: byId('settings-eta')?.value || '',
    }, currentSession);
    if (handleSessionExpired(res)) return;
    if (!res.ok) return setStatus(statusNode, res.error || 'Error al guardar datos del comercio.', true);
    adminSettings = res.settings;
    renderSettingsForm();
    setStatus(statusNode, 'Datos del comercio guardados correctamente.');
  });

  byId('settings-reset-btn')?.addEventListener('click', () => {
    removePreviewKey(PREVIEW_CATALOG_KEY);
    removePreviewKey(PREVIEW_SETTINGS_KEY);
    adminSettings = normalizeSiteSettings(DEFAULT_SITE_SETTINGS);
    renderSettingsForm();
    if (currentSession?.mode === 'local-preview') {
      adminItems = getBaseCatalogList();
      renderItemsList();
    }
    setStatus(statusNode, 'Vista previa local restablecida a los valores iniciales.');
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initAdminWorkspaceUi();
}
