-- Esquema PostgreSQL / Supabase Certificado (BACKEND.md)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    FALSE
  );
$$;

CREATE TABLE IF NOT EXISTS public.catalog_items (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  brand TEXT,
  name TEXT NOT NULL CHECK (char_length(name) <= 160),
  description TEXT NOT NULL CHECK (char_length(description) <= 600),
  price_usd NUMERIC(10, 2) NOT NULL CHECK (price_usd >= 0),
  stock INTEGER NOT NULL DEFAULT 15 CHECK (stock >= 0),
  badge TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  disponible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalog_public_read ON public.catalog_items
  FOR SELECT TO anon, authenticated
  USING (disponible = TRUE);

CREATE POLICY catalog_admin_all ON public.catalog_items
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
