-- Datos Semilla en Paridad 1:1 con js/data.js y js/config.js (BACKEND.md)
INSERT INTO public.catalog_items (id, category, brand, name, description, price_usd, stock, image_url, featured, disponible)
VALUES
  ('armani-luminous-silk-foundation', 'Rostro & Bases', 'Armani Beauty', 'Luminous Silk Perfect Glow Flawless Foundation', 'Base líquida icónica libre de aceites con tecnología Micro-fil para un acabado luminoso de seda y cobertura modulable.', 69.00, 14, 'assets/products/rostro-01.webp', true, TRUE),
  ('mario-surrealskin-foundation', 'Rostro & Bases', 'Makeup By Mario', 'SurrealSkin Natural Finish Foundation', 'Base transpirable con tecnología MoistureGrip que ilumina e hidrata la piel hasta por 12 horas con efecto segunda piel.', 48.00, 19, 'assets/products/rostro-02.webp', true, TRUE),
  ('fenty-pro-filtr-soft-matte', 'Rostro & Bases', 'Fenty Beauty', 'Pro Filt’r Soft Matte Longwear Foundation', 'Base mate suave de larga duración resistente al clima y al sudor, difumina poros al instante sin obstruirlos.', 40.00, 22, 'assets/products/rostro-03.webp', false, TRUE),
  ('tower28-swipe-serum-concealer', 'Rostro & Bases', 'Tower 28 Beauty', 'Swipe All-Over Hydrating Serum Concealer', 'Corrector en sérum ultra hidratante con ácido hialurónico y centella asiática; cubre ojeras sin marcar líneas de expresión.', 24.00, 4, 'assets/products/rostro-04.webp', true, TRUE),
  ('nars-radiant-creamy-concealer', 'Rostro & Bases', 'NARS', 'Radiant Creamy Concealer', 'Corrector multiusos enriquecido con extractos botánicos hidratantes y polvos difusores de luz para 16 horas de perfección.', 32.00, 16, 'assets/products/rostro-05.webp', false, TRUE),
  ('haus-labs-triclone-foundation', 'Rostro & Bases', 'Haus Labs', 'Triclone Skin Tech Medium Coverage Foundation', 'Base biotecnológica con árnica fermentada que reduce rojeces, protege la barrera cutánea y deja acabado satinado.', 49.00, 9, 'assets/products/rostro-06.webp', true, TRUE),
  ('summer-fridays-lip-butter-balm', 'Labios', 'Summer Fridays', 'Lip Butter Balm Vanilla Beige & Cherry', 'Bálsamo vegano con manteca de karité y murumuru que hidrata profundamente y aporta brillo cristalino sin sensación pegajosa.', 24.00, 3, 'assets/products/labios-01.webp', true, TRUE),
  ('rare-beauty-kind-words-matte-lipstick', 'Labios', 'Rare Beauty', 'Kind Words Matte Lipstick', 'Labial mate cremoso y rico en pigmentos que se desliza como mantequilla manteniendo los labios suaves y flexibles todo el día.', 20.00, 18, 'assets/products/labios-02.webp', true, TRUE),
  ('clinique-almost-lipstick-black-honey', 'Labios', 'Clinique', 'Almost Lipstick Tono Black Honey', 'Pigmento transparente camaleónico que se fusiona con el tono natural de tus labios creando un acabado ciruela único.', 25.00, 11, 'assets/products/labios-03.webp', false, TRUE),
  ('dior-addict-lip-glow-oil', 'Labios', 'Dior', 'Dior Addict Lip Glow Oil Cherry Oil', 'Aceite labial nutritivo brillante infundido con aceite de cereza que realza el color natural y protege contra la resequedad.', 40.00, 5, 'assets/products/labios-04.webp', true, TRUE),
  ('charlotte-tilbury-pillow-talk-lipstick', 'Labios', 'Charlotte Tilbury', 'Matte Revolution Lipstick Pillow Talk Original', 'El labial nude-rosa universalmente favorecedor con extracto de orquídea y pigmentos reflectantes 3D para labios más llenos.', 35.00, 15, 'assets/products/labios-05.webp', true, TRUE),
  ('rhode-peptide-lip-tint', 'Labios', 'Rhode', 'Peptide Lip Tint Espresso & Ribbon', 'Tratamiento labial restaurador con péptidos, manteca de cupuaçu y babasú que rellena líneas finas con un velo de color.', 18.00, 4, 'assets/products/labios-06.webp', true, TRUE),
  ('rare-beauty-soft-pinch-blush', 'Rubores & Glow', 'Rare Beauty', 'Soft Pinch Liquid Blush (Hope & Happy)', 'Rubor líquido ligero de ultra-alta pigmentación; una sola gota brinda un rubor saludable y difuminado que dura todo el día.', 25.00, 5, 'assets/products/rubor-01.webp', true, TRUE),
  ('milk-cooling-water-jelly-tint', 'Rubores & Glow', 'Milk Makeup', 'Cooling Water Jelly Tint Lip + Cheek Stain', 'Tinta en gelatina con colágeno vegano y agua de mar que refresca al contacto y deja una acuarela indeleble en mejillas y labios.', 24.00, 13, 'assets/products/rubor-02.webp', false, TRUE),
  ('patrick-ta-major-headlines-blush-duo', 'Rubores & Glow', 'Patrick Ta', 'Major Headlines Double-Take Crème & Powder Blush Duo', 'Dúo profesional de rubor en polvo compacto y crema luminosa diseñado para aplicar en capas con efecto piel de porcelana.', 38.00, 8, 'assets/products/rubor-03.webp', true, TRUE),
  ('dior-forever-glow-star-filter', 'Rubores & Glow', 'Dior', 'Forever Glow Star Filter Multi-Use Highlighter', 'Fluido sublimador con 94% de ingredientes de origen natural que difumina, alisa e ilumina el rostro con efecto filtro real.', 53.00, 7, 'assets/products/rostro-03.webp', true, TRUE),
  ('saie-dew-blush-liquid-cheek', 'Rubores & Glow', 'Saie', 'Dew Blush Liquid Cheek Flush', 'Rubor cremoso a base de agua con extracto de saúco y regaliz que ilumina las mejillas con acabado jugoso natural.', 25.00, 17, 'assets/products/labios-01.webp', false, TRUE),
  ('rare-beauty-positive-light-highlighter', 'Rubores & Glow', 'Rare Beauty', 'Positive Light Silky Touch Highlighter', 'Iluminador en polvo con microesferas de cristal que transfiere el brillo de un iluminador líquido a una textura sedosa.', 25.00, 10, 'assets/products/rostro-01.webp', false, TRUE),
  ('mario-master-mattes-palette', 'Ojos & Cejas', 'Makeup By Mario', 'Master Mattes Eyeshadow Palette Original', 'Paleta de 12 sombras mate neutras inspiradas en los tonos reales de la piel humana; pigmentación cremosa y agarre superior.', 56.00, 9, 'assets/products/ojos-01.webp', true, TRUE),
  ('too-faced-better-than-sex-mascara', 'Ojos & Cejas', 'Too Faced', 'Better Than Sex Volumizing & Lengthening Mascara', 'Máscara con cepillo en forma de reloj de arena y polímeros espesantes para pestañas con volumen dramático y rizo extremo.', 30.00, 20, 'assets/products/ojos-02.webp', false, TRUE),
  ('benefit-roller-lash-mascara', 'Ojos & Cejas', 'Benefit Cosmetics', 'Roller Lash Curling & Lifting Mascara', 'Cepillo Hook ‘n’ Roll que atrapa, separa, levanta y riza incluso las pestañas más rectas durante 12 horas continuas.', 30.00, 14, 'assets/products/rostro-04.webp', false, TRUE),
  ('lancome-idole-lash-lifting-mascara', 'Ojos & Cejas', 'Lancôme', 'Lash Idôle Lash-Lifting & Volumizing Mascara', 'Varita curva con 360 micro-cerdas y extracto de té blanco que define pestaña por pestaña con volumen en abanico sin grumos.', 32.00, 12, 'assets/products/rostro-06.webp', false, TRUE),
  ('rare-beauty-brow-harmony-gel', 'Ojos & Cejas', 'Rare Beauty', 'Brow Harmony Flexible Lifting Eyebrow Gel', 'Gel laminador de cejas resistente al agua que levanta y fija cada vello con acabado natural sin dejar residuos blancos.', 21.00, 16, 'assets/products/ojos-01.webp', false, TRUE),
  ('milk-hydro-grip-primer', 'Skincare & Primers', 'Milk Makeup', 'Hydro Grip Hydrating Makeup Primer', 'Primer en gel con extracto de agave azul, ácido hialurónico y niacinamida que fija el maquillaje hasta por 12 horas con brillo fresco.', 38.00, 11, 'assets/products/skin-01.webp', true, TRUE),
  ('tower28-sos-daily-rescue-spray', 'Skincare & Primers', 'Tower 28 Beauty', 'SOS Daily Rescue Facial Spray', 'Bruma calmante con ácido hipocloroso aprobada por dermatólogos que reduce rojeces, equilibra el pH y prepara la piel antes del maquillaje.', 28.00, 18, 'assets/products/skin-02.webp', false, TRUE),
  ('glow-recipe-watermelon-dew-drops', 'Skincare & Primers', 'Glow Recipe', 'Watermelon Glow Niacinamide Dew Drops Serum', 'Sérum iluminador híbrido con niacinamida y sandía que hidrata instantáneamente y aporta brillo perlado sin mica ni glitter.', 35.00, 10, 'assets/products/skin-03.webp', true, TRUE),
  ('charlotte-magic-cream-moisturizer', 'Skincare & Primers', 'Charlotte Tilbury', 'Charlotte’s Magic Cream Moisturizer with Hyaluronic Acid', 'Crema hidratante de backstage con complejo Cushion + Lift Mesh que rellena e ilumina el lienzo de la piel en 28 segundos.', 65.00, 6, 'assets/products/skin-04.webp', false, TRUE),
  ('charlotte-airbrush-setting-spray', 'Fijadores & Bronzers', 'Charlotte Tilbury', 'Airbrush Flawless Setting Spray', 'Spray fijador sin alcohol ni aceites con té verde japonés y aloe vera que sella el maquillaje intacto hasta por 16 horas.', 38.00, 4, 'assets/products/skin-03.webp', true, TRUE),
  ('mario-softsculpt-shaping-stick', 'Fijadores & Bronzers', 'Makeup By Mario', 'SoftSculpt Cream Contour & Bronzer Shaping Stick', 'Barra de contorno y bronceador en crema de doble punta con brocha integrada; se difumina sin líneas duras con acabado mate natural.', 34.00, 13, 'assets/products/rubor-02.webp', true, TRUE),
  ('huda-easy-bake-loose-powder', 'Fijadores & Bronzers', 'Huda Beauty', 'Easy Bake Loose Baking & Setting Powder (Cherry Blossom & Pound Cake)', 'Polvo suelto ultra-refinado con pigmentos correctores que controla el brillo, difumina poros e ilumina el contorno de ojos.', 38.00, 5, 'assets/products/rostro-03.webp', true, TRUE)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  brand = EXCLUDED.brand,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_usd = EXCLUDED.price_usd,
  stock = EXCLUDED.stock,
  image_url = EXCLUDED.image_url,
  featured = EXCLUDED.featured,
  disponible = EXCLUDED.disponible;

INSERT INTO public.site_settings (id, business_hours, contact_phones, payment_methods, announcement_text, promo_headline, delivery_eta)
VALUES (
  'default',
  'Lunes a sábado, 9:00 – 19:00',
  '["+584125558899"]'::jsonb,
  '["Pago Móvil","Zelle","Transferencia","Efectivo"]'::jsonb,
  '✦ Catálogo Oficial Verificado · Stock en Tiempo Real · Atención Inmediata vía WhatsApp',
  'Boutique de maquillaje de autor y skincare clínico: 30 fórmulas virales con stock inmediato y entrega hoy.',
  'Despacho el mismo día'
)
ON CONFLICT (id) DO UPDATE SET
  business_hours = EXCLUDED.business_hours,
  contact_phones = EXCLUDED.contact_phones,
  payment_methods = EXCLUDED.payment_methods,
  announcement_text = EXCLUDED.announcement_text,
  promo_headline = EXCLUDED.promo_headline,
  delivery_eta = EXCLUDED.delivery_eta,
  updated_at = NOW();
