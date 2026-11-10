import { SITE_CONFIG } from './config.js';
import { escHtml } from './main.js';

/**
 * Autenticación Zero-Trust contra Supabase Auth (DISCOVERY.md Sección 4):
 * Cero contraseñas o hashes en cliente. El permiso de escritura reside exclusivamente
 * en la firma criptográfica del JWT con app_metadata.role === 'admin' validado por RLS en PostgreSQL.
 */
export async function authenticateAdminWithSupabase(email, password) {
  if (!SITE_CONFIG.SUPABASE_URL || !SITE_CONFIG.SUPABASE_ANON_KEY) {
    return { ok: false, error: 'Servidor de autenticación no configurado.' };
  }
  try {
    const res = await fetch(`${SITE_CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SITE_CONFIG.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      return { ok: false, error: 'Credenciales inválidas o sin rol administrativo.' };
    }
    const session = await res.json();
    return { ok: true, accessToken: escHtml(session.access_token || '') };
  } catch {
    return { ok: false, error: 'Error de red al verificar sesión.' };
  }
}
