/**
 * scripts/provision_supabase.js — Automatización Zero-Copy-Paste de Supabase (Velvet Aura Beauty)
 *
 * Ejecuta automáticamente:
 * 1. Inyección de SUPABASE_URL y SUPABASE_ANON_KEY en js/config.js.
 * 2. Sincronización 1:1 del catálogo inicial en public.catalog_items y public.site_settings vía REST API.
 * 3. Creación/actualización del usuario Administrador en Supabase Auth con app_metadata: { role: 'admin' }.
 */
import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_KEY) {
    throw new Error('Faltan SUPABASE_URL, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
  }

  // 1. Inyectar llaves públicas en js/config.js
  const configPath = path.resolve(process.cwd(), 'js/config.js');
  if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent
      .replace(/SUPABASE_URL:\s*['"][^'"]*['"]/, `SUPABASE_URL: ${JSON.stringify(SUPABASE_URL)}`)
      .replace(/SUPABASE_ANON_KEY:\s*['"][^'"]*['"]/, `SUPABASE_ANON_KEY: ${JSON.stringify(SUPABASE_ANON_KEY)}`);
    fs.writeFileSync(configPath, configContent, 'utf8');
  }

  // 2. Sincronizar catálogo inicial (1:1 con js/data.js)
  const items = [
  {
    "id": "armani-luminous-silk-foundation",
    "category": "Rostro & Bases",
    "brand": "Armani Beauty",
    "name": "Luminous Silk Perfect Glow Flawless Foundation",
    "description": "Base líquida icónica libre de aceites con tecnología Micro-fil para un acabado luminoso de seda y cobertura modulable.",
    "priceUsd": 69,
    "stock": 14,
    "badge": "Holy Grail",
    "imageUrl": "assets/products/rostro-01.webp",
    "rating": 5,
    "variantLabel": "Tono / Subtono",
    "variants": [
      "Fair Neutral (2N)",
      "Light Warm (3.5W)",
      "Medium Golden (5.5G)",
      "Tan Warm (7.5W)"
    ],
    "shades": [
      "#F3D6C2",
      "#E8B99A",
      "#D49B72",
      "#B87A54",
      "#8A5A3B"
    ],
    "featured": true
  },
  {
    "id": "mario-surrealskin-foundation",
    "category": "Rostro & Bases",
    "brand": "Makeup By Mario",
    "name": "SurrealSkin Natural Finish Foundation",
    "description": "Base transpirable con tecnología MoistureGrip que ilumina e hidrata la piel hasta por 12 horas con efecto segunda piel.",
    "priceUsd": 48,
    "stock": 19,
    "badge": "Best Seller",
    "imageUrl": "assets/products/rostro-02.webp",
    "rating": 4.9,
    "variantLabel": "Tono / Subtono",
    "variants": [
      "Fair Neutral (2N)",
      "Light Warm (3.5W)",
      "Medium Golden (5.5G)",
      "Tan Warm (7.5W)"
    ],
    "shades": [
      "#F3D6C2",
      "#E8B99A",
      "#D49B72",
      "#B87A54",
      "#8A5A3B"
    ],
    "featured": true
  },
  {
    "id": "fenty-pro-filtr-soft-matte",
    "category": "Rostro & Bases",
    "brand": "Fenty Beauty",
    "name": "Pro Filt’r Soft Matte Longwear Foundation",
    "description": "Base mate suave de larga duración resistente al clima y al sudor, difumina poros al instante sin obstruirlos.",
    "priceUsd": 40,
    "stock": 22,
    "badge": "40+ Tonos",
    "imageUrl": "assets/products/rostro-03.webp",
    "rating": 4.9,
    "variantLabel": "Tono / Subtono",
    "variants": [
      "Fair Neutral (2N)",
      "Light Warm (3.5W)",
      "Medium Golden (5.5G)",
      "Tan Warm (7.5W)"
    ],
    "shades": [
      "#F3D6C2",
      "#E8B99A",
      "#D49B72",
      "#B87A54",
      "#8A5A3B"
    ],
    "featured": false
  },
  {
    "id": "tower28-swipe-serum-concealer",
    "category": "Rostro & Bases",
    "brand": "Tower 28 Beauty",
    "name": "Swipe All-Over Hydrating Serum Concealer",
    "description": "Corrector en sérum ultra hidratante con ácido hialurónico y centella asiática; cubre ojeras sin marcar líneas de expresión.",
    "priceUsd": 24,
    "stock": 4,
    "badge": "Viral Sephora",
    "imageUrl": "assets/products/rostro-04.webp",
    "rating": 5,
    "variantLabel": "Tono / Subtono",
    "variants": [
      "Fair Neutral (2N)",
      "Light Warm (3.5W)",
      "Medium Golden (5.5G)",
      "Tan Warm (7.5W)"
    ],
    "shades": [
      "#F3D6C2",
      "#E8B99A",
      "#D49B72",
      "#B87A54",
      "#8A5A3B"
    ],
    "featured": true
  },
  {
    "id": "nars-radiant-creamy-concealer",
    "category": "Rostro & Bases",
    "brand": "NARS",
    "name": "Radiant Creamy Concealer",
    "description": "Corrector multiusos enriquecido con extractos botánicos hidratantes y polvos difusores de luz para 16 horas de perfección.",
    "priceUsd": 32,
    "stock": 16,
    "badge": "Clásico Pro",
    "imageUrl": "assets/products/rostro-05.webp",
    "rating": 4.9,
    "variantLabel": "Tono / Subtono",
    "variants": [
      "Fair Neutral (2N)",
      "Light Warm (3.5W)",
      "Medium Golden (5.5G)",
      "Tan Warm (7.5W)"
    ],
    "shades": [
      "#F3D6C2",
      "#E8B99A",
      "#D49B72",
      "#B87A54",
      "#8A5A3B"
    ],
    "featured": false
  },
  {
    "id": "haus-labs-triclone-foundation",
    "category": "Rostro & Bases",
    "brand": "Haus Labs",
    "name": "Triclone Skin Tech Medium Coverage Foundation",
    "description": "Base biotecnológica con árnica fermentada que reduce rojeces, protege la barrera cutánea y deja acabado satinado.",
    "priceUsd": 49,
    "stock": 9,
    "badge": "Clean Tech",
    "imageUrl": "assets/products/rostro-06.webp",
    "rating": 4.9,
    "variantLabel": "Tono / Subtono",
    "variants": [
      "Fair Neutral (2N)",
      "Light Warm (3.5W)",
      "Medium Golden (5.5G)",
      "Tan Warm (7.5W)"
    ],
    "shades": [
      "#F3D6C2",
      "#E8B99A",
      "#D49B72",
      "#B87A54",
      "#8A5A3B"
    ],
    "featured": true
  },
  {
    "id": "summer-fridays-lip-butter-balm",
    "category": "Labios",
    "brand": "Summer Fridays",
    "name": "Lip Butter Balm Vanilla Beige & Cherry",
    "description": "Bálsamo vegano con manteca de karité y murumuru que hidrata profundamente y aporta brillo cristalino sin sensación pegajosa.",
    "priceUsd": 24,
    "stock": 3,
    "badge": "#1 Viral",
    "imageUrl": "assets/products/labios-01.webp",
    "rating": 5,
    "variantLabel": "Aroma / Tono",
    "variants": [
      "Vanilla Beige",
      "Cherry",
      "Pink Sugar",
      "Brown Sugar"
    ],
    "shades": [
      "#B3123F",
      "#D6335C",
      "#E8627E",
      "#F08FA3",
      "#7A1E3A"
    ],
    "featured": true
  },
  {
    "id": "rare-beauty-kind-words-matte-lipstick",
    "category": "Labios",
    "brand": "Rare Beauty",
    "name": "Kind Words Matte Lipstick",
    "description": "Labial mate cremoso y rico en pigmentos que se desliza como mantequilla manteniendo los labios suaves y flexibles todo el día.",
    "priceUsd": 20,
    "stock": 18,
    "badge": "Best Seller",
    "imageUrl": "assets/products/labios-02.webp",
    "rating": 4.9,
    "variantLabel": "Tono",
    "variants": [
      "Humble (Rosa Nude)",
      "Worthy (Malva Suave)",
      "Lively (Rosa Rosado)",
      "Bold (Ciruela)"
    ],
    "shades": [
      "#B3123F",
      "#D6335C",
      "#E8627E",
      "#F08FA3",
      "#7A1E3A"
    ],
    "featured": true
  },
  {
    "id": "clinique-almost-lipstick-black-honey",
    "category": "Labios",
    "brand": "Clinique",
    "name": "Almost Lipstick Tono Black Honey",
    "description": "Pigmento transparente camaleónico que se fusiona con el tono natural de tus labios creando un acabado ciruela único.",
    "priceUsd": 25,
    "stock": 11,
    "badge": "Cult Classic",
    "imageUrl": "assets/products/labios-03.webp",
    "rating": 4.9,
    "variantLabel": "Tono",
    "variants": [
      "Black Honey (Clásico)",
      "Pink Honey"
    ],
    "shades": [
      "#B3123F",
      "#D6335C",
      "#E8627E",
      "#F08FA3",
      "#7A1E3A"
    ],
    "featured": false
  },
  {
    "id": "dior-addict-lip-glow-oil",
    "category": "Labios",
    "brand": "Dior",
    "name": "Dior Addict Lip Glow Oil Cherry Oil",
    "description": "Aceite labial nutritivo brillante infundido con aceite de cereza que realza el color natural y protege contra la resequedad.",
    "priceUsd": 40,
    "stock": 5,
    "badge": "Alta Costura",
    "imageUrl": "assets/products/labios-04.webp",
    "rating": 5,
    "variantLabel": "Tono",
    "variants": [
      "015 Cherry",
      "001 Pink",
      "012 Rosewood",
      "020 Mahogany"
    ],
    "shades": [
      "#B3123F",
      "#D6335C",
      "#E8627E",
      "#F08FA3",
      "#7A1E3A"
    ],
    "featured": true
  },
  {
    "id": "charlotte-tilbury-pillow-talk-lipstick",
    "category": "Labios",
    "brand": "Charlotte Tilbury",
    "name": "Matte Revolution Lipstick Pillow Talk Original",
    "description": "El labial nude-rosa universalmente favorecedor con extracto de orquídea y pigmentos reflectantes 3D para labios más llenos.",
    "priceUsd": 35,
    "stock": 15,
    "badge": "Icónico",
    "imageUrl": "assets/products/labios-05.webp",
    "rating": 4.9,
    "variantLabel": "Tono",
    "variants": [
      "Pillow Talk Original",
      "Pillow Talk Medium",
      "Pillow Talk Intense"
    ],
    "shades": [
      "#B3123F",
      "#D6335C",
      "#E8627E",
      "#F08FA3",
      "#7A1E3A"
    ],
    "featured": true
  },
  {
    "id": "rhode-peptide-lip-tint",
    "category": "Labios",
    "brand": "Rhode",
    "name": "Peptide Lip Tint Espresso & Ribbon",
    "description": "Tratamiento labial restaurador con péptidos, manteca de cupuaçu y babasú que rellena líneas finas con un velo de color.",
    "priceUsd": 18,
    "stock": 4,
    "badge": "Tendencia",
    "imageUrl": "assets/products/labios-06.webp",
    "rating": 4.9,
    "variantLabel": "Tono",
    "variants": [
      "Espresso",
      "Ribbon",
      "Toast",
      "Raspberry Jelly"
    ],
    "shades": [
      "#B3123F",
      "#D6335C",
      "#E8627E",
      "#F08FA3",
      "#7A1E3A"
    ],
    "featured": true
  },
  {
    "id": "rare-beauty-soft-pinch-blush",
    "category": "Rubores & Glow",
    "brand": "Rare Beauty",
    "name": "Soft Pinch Liquid Blush (Hope & Happy)",
    "description": "Rubor líquido ligero de ultra-alta pigmentación; una sola gota brinda un rubor saludable y difuminado que dura todo el día.",
    "priceUsd": 25,
    "stock": 5,
    "badge": "Top Ventas",
    "imageUrl": "assets/products/rubor-01.webp",
    "rating": 5,
    "variantLabel": "Tono",
    "variants": [
      "Hope (Malva Nude)",
      "Happy (Rosa Frío)",
      "Joy (Durazno)",
      "Believe (Ciruela)"
    ],
    "shades": [
      "#E77A86",
      "#F09BA3",
      "#D96A5F",
      "#C4515C",
      "#F3B6AE"
    ],
    "featured": true
  },
  {
    "id": "milk-cooling-water-jelly-tint",
    "category": "Rubores & Glow",
    "brand": "Milk Makeup",
    "name": "Cooling Water Jelly Tint Lip + Cheek Stain",
    "description": "Tinta en gelatina con colágeno vegano y agua de mar que refresca al contacto y deja una acuarela indeleble en mejillas y labios.",
    "priceUsd": 24,
    "stock": 13,
    "badge": "Jelly Viral",
    "imageUrl": "assets/products/rubor-02.webp",
    "rating": 4.9,
    "variantLabel": "Tono",
    "variants": [
      "Burst (Rosa Frambuesa)",
      "Spritz (Coral)",
      "Chill (Rojo Cereza)",
      "Splash (Fucsia)"
    ],
    "shades": [
      "#E77A86",
      "#F09BA3",
      "#D96A5F",
      "#C4515C",
      "#F3B6AE"
    ],
    "featured": false
  },
  {
    "id": "patrick-ta-major-headlines-blush-duo",
    "category": "Rubores & Glow",
    "brand": "Patrick Ta",
    "name": "Major Headlines Double-Take Crème & Powder Blush Duo",
    "description": "Dúo profesional de rubor en polvo compacto y crema luminosa diseñado para aplicar en capas con efecto piel de porcelana.",
    "priceUsd": 38,
    "stock": 8,
    "badge": "MUA Favorite",
    "imageUrl": "assets/products/rubor-03.webp",
    "rating": 4.9,
    "variantLabel": "Tono",
    "variants": [
      "She’s That Girl",
      "She’s So LA",
      "Oh She’s Different",
      "Just Enough"
    ],
    "shades": [
      "#E77A86",
      "#F09BA3",
      "#D96A5F",
      "#C4515C",
      "#F3B6AE"
    ],
    "featured": true
  },
  {
    "id": "dior-forever-glow-star-filter",
    "category": "Rubores & Glow",
    "brand": "Dior",
    "name": "Forever Glow Star Filter Multi-Use Highlighter",
    "description": "Fluido sublimador con 94% de ingredientes de origen natural que difumina, alisa e ilumina el rostro con efecto filtro real.",
    "priceUsd": 53,
    "stock": 7,
    "badge": "Lujo Puro",
    "imageUrl": "assets/products/rostro-03.webp",
    "rating": 5,
    "variantLabel": "Tono",
    "variants": [
      "01 Fair",
      "02 Light",
      "03 Medium",
      "04 Tan"
    ],
    "shades": [
      "#E77A86",
      "#F09BA3",
      "#D96A5F",
      "#C4515C",
      "#F3B6AE"
    ],
    "featured": true
  },
  {
    "id": "saie-dew-blush-liquid-cheek",
    "category": "Rubores & Glow",
    "brand": "Saie",
    "name": "Dew Blush Liquid Cheek Flush",
    "description": "Rubor cremoso a base de agua con extracto de saúco y regaliz que ilumina las mejillas con acabado jugoso natural.",
    "priceUsd": 25,
    "stock": 17,
    "badge": "Clean Beauty",
    "imageUrl": "assets/products/labios-01.webp",
    "rating": 4.9,
    "variantLabel": "Tono",
    "variants": [
      "Hope (Rosa Suave)",
      "Happy (Rosa Frío)",
      "Joy (Durazno)",
      "Champagne Glow"
    ],
    "shades": [
      "#E77A86",
      "#F09BA3",
      "#D96A5F",
      "#C4515C",
      "#F3B6AE"
    ],
    "featured": false
  },
  {
    "id": "rare-beauty-positive-light-highlighter",
    "category": "Rubores & Glow",
    "brand": "Rare Beauty",
    "name": "Positive Light Silky Touch Highlighter",
    "description": "Iluminador en polvo con microesferas de cristal que transfiere el brillo de un iluminador líquido a una textura sedosa.",
    "priceUsd": 25,
    "stock": 10,
    "badge": "Glass Skin",
    "imageUrl": "assets/products/rostro-01.webp",
    "rating": 4.9,
    "variantLabel": "Tono",
    "variants": [
      "Enlighten (Champán Frío)",
      "Exhilarate (Dorado)",
      "Mesmerize (Rosa Oro)"
    ],
    "shades": [
      "#E77A86",
      "#F09BA3",
      "#D96A5F",
      "#C4515C",
      "#F3B6AE"
    ],
    "featured": false
  },
  {
    "id": "mario-master-mattes-palette",
    "category": "Ojos & Cejas",
    "brand": "Makeup By Mario",
    "name": "Master Mattes Eyeshadow Palette Original",
    "description": "Paleta de 12 sombras mate neutras inspiradas en los tonos reales de la piel humana; pigmentación cremosa y agarre superior.",
    "priceUsd": 56,
    "stock": 9,
    "badge": "Pro Essential",
    "imageUrl": "assets/products/ojos-01.webp",
    "rating": 5,
    "variantLabel": "Edición",
    "variants": [
      "Original Neutrals (12 tonos)",
      "The Neutrals (Tonos Fríos)"
    ],
    "shades": [
      "#4A3728",
      "#6B4A34",
      "#8C6A4A",
      "#2E2620",
      "#A98A6B"
    ],
    "featured": true
  },
  {
    "id": "too-faced-better-than-sex-mascara",
    "category": "Ojos & Cejas",
    "brand": "Too Faced",
    "name": "Better Than Sex Volumizing & Lengthening Mascara",
    "description": "Máscara con cepillo en forma de reloj de arena y polímeros espesantes para pestañas con volumen dramático y rizo extremo.",
    "priceUsd": 30,
    "stock": 20,
    "badge": "#1 Mascara",
    "imageUrl": "assets/products/ojos-02.webp",
    "rating": 4.9,
    "variantLabel": "Fórmula",
    "variants": [
      "Negro Intenso",
      "Negro Waterproof",
      "Chocolate"
    ],
    "featured": false
  },
  {
    "id": "benefit-roller-lash-mascara",
    "category": "Ojos & Cejas",
    "brand": "Benefit Cosmetics",
    "name": "Roller Lash Curling & Lifting Mascara",
    "description": "Cepillo Hook ‘n’ Roll que atrapa, separa, levanta y riza incluso las pestañas más rectas durante 12 horas continuas.",
    "priceUsd": 30,
    "stock": 14,
    "badge": "Efecto Lifting",
    "imageUrl": "assets/products/rostro-04.webp",
    "rating": 4.9,
    "variantLabel": "Tono / Formato",
    "variants": [
      "Negro Intenso (Full Size)",
      "Negro Intenso (Mini)",
      "Brown"
    ],
    "featured": false
  },
  {
    "id": "lancome-idole-lash-lifting-mascara",
    "category": "Ojos & Cejas",
    "brand": "Lancôme",
    "name": "Lash Idôle Lash-Lifting & Volumizing Mascara",
    "description": "Varita curva con 360 micro-cerdas y extracto de té blanco que define pestaña por pestaña con volumen en abanico sin grumos.",
    "priceUsd": 32,
    "stock": 12,
    "badge": "Cero Grumos",
    "imageUrl": "assets/products/rostro-06.webp",
    "rating": 5,
    "variantLabel": "Fórmula",
    "variants": [
      "01 Glossy Black",
      "01 Waterproof"
    ],
    "featured": false
  },
  {
    "id": "rare-beauty-brow-harmony-gel",
    "category": "Ojos & Cejas",
    "brand": "Rare Beauty",
    "name": "Brow Harmony Flexible Lifting Eyebrow Gel",
    "description": "Gel laminador de cejas resistente al agua que levanta y fija cada vello con acabado natural sin dejar residuos blancos.",
    "priceUsd": 21,
    "stock": 16,
    "badge": "Cejas Laminadas",
    "imageUrl": "assets/products/ojos-01.webp",
    "rating": 4.9,
    "variantLabel": "Acabado",
    "variants": [
      "Transparente Universal",
      "Soft Brown",
      "Deep Brown"
    ],
    "featured": false
  },
  {
    "id": "milk-hydro-grip-primer",
    "category": "Skincare & Primers",
    "brand": "Milk Makeup",
    "name": "Hydro Grip Hydrating Makeup Primer",
    "description": "Primer en gel con extracto de agave azul, ácido hialurónico y niacinamida que fija el maquillaje hasta por 12 horas con brillo fresco.",
    "priceUsd": 38,
    "stock": 11,
    "badge": "Agarre 12H",
    "imageUrl": "assets/products/skin-01.webp",
    "rating": 4.9,
    "variantLabel": "Presentación",
    "variants": [
      "Tamaño Regular (Full Size)",
      "Travel Size"
    ],
    "featured": true
  },
  {
    "id": "tower28-sos-daily-rescue-spray",
    "category": "Skincare & Primers",
    "brand": "Tower 28 Beauty",
    "name": "SOS Daily Rescue Facial Spray",
    "description": "Bruma calmante con ácido hipocloroso aprobada por dermatólogos que reduce rojeces, equilibra el pH y prepara la piel antes del maquillaje.",
    "priceUsd": 28,
    "stock": 18,
    "badge": "Piel Sensible",
    "imageUrl": "assets/products/skin-02.webp",
    "rating": 5,
    "variantLabel": "Presentación",
    "variants": [
      "Tamaño Regular (Full Size)",
      "Travel Size"
    ],
    "featured": false
  },
  {
    "id": "glow-recipe-watermelon-dew-drops",
    "category": "Skincare & Primers",
    "brand": "Glow Recipe",
    "name": "Watermelon Glow Niacinamide Dew Drops Serum",
    "description": "Sérum iluminador híbrido con niacinamida y sandía que hidrata instantáneamente y aporta brillo perlado sin mica ni glitter.",
    "priceUsd": 35,
    "stock": 10,
    "badge": "K-Beauty Glow",
    "imageUrl": "assets/products/skin-03.webp",
    "rating": 4.9,
    "variantLabel": "Presentación",
    "variants": [
      "Tamaño Regular (Full Size)",
      "Travel Size"
    ],
    "featured": true
  },
  {
    "id": "charlotte-magic-cream-moisturizer",
    "category": "Skincare & Primers",
    "brand": "Charlotte Tilbury",
    "name": "Charlotte’s Magic Cream Moisturizer with Hyaluronic Acid",
    "description": "Crema hidratante de backstage con complejo Cushion + Lift Mesh que rellena e ilumina el lienzo de la piel en 28 segundos.",
    "priceUsd": 65,
    "stock": 6,
    "badge": "Backstage Icon",
    "imageUrl": "assets/products/skin-04.webp",
    "rating": 4.9,
    "variantLabel": "Presentación",
    "variants": [
      "Tamaño Regular (Full Size)",
      "Travel Size"
    ],
    "featured": false
  },
  {
    "id": "charlotte-airbrush-setting-spray",
    "category": "Fijadores & Bronzers",
    "brand": "Charlotte Tilbury",
    "name": "Airbrush Flawless Setting Spray",
    "description": "Spray fijador sin alcohol ni aceites con té verde japonés y aloe vera que sella el maquillaje intacto hasta por 16 horas.",
    "priceUsd": 38,
    "stock": 4,
    "badge": "16H Lock",
    "imageUrl": "assets/products/skin-03.webp",
    "rating": 5,
    "variantLabel": "Presentación",
    "variants": [
      "Full Size 100 ml",
      "Travel Size 34 ml",
      "Dúo Backstage 2×100 ml"
    ],
    "featured": true
  },
  {
    "id": "mario-softsculpt-shaping-stick",
    "category": "Fijadores & Bronzers",
    "brand": "Makeup By Mario",
    "name": "SoftSculpt Cream Contour & Bronzer Shaping Stick",
    "description": "Barra de contorno y bronceador en crema de doble punta con brocha integrada; se difumina sin líneas duras con acabado mate natural.",
    "priceUsd": 34,
    "stock": 13,
    "badge": "Incluye Brocha",
    "imageUrl": "assets/products/rubor-02.webp",
    "rating": 4.9,
    "variantLabel": "Tono",
    "variants": [
      "Light",
      "Light Medium",
      "Medium",
      "Medium Dark"
    ],
    "shades": [
      "#C98A5A",
      "#A96A3F",
      "#8C4E2A",
      "#E0B48C",
      "#6E3A20"
    ],
    "featured": true
  },
  {
    "id": "huda-easy-bake-loose-powder",
    "category": "Fijadores & Bronzers",
    "brand": "Huda Beauty",
    "name": "Easy Bake Loose Baking & Setting Powder (Cherry Blossom & Pound Cake)",
    "description": "Polvo suelto ultra-refinado con pigmentos correctores que controla el brillo, difumina poros e ilumina el contorno de ojos.",
    "priceUsd": 38,
    "stock": 5,
    "badge": "Filtro Airbrush",
    "imageUrl": "assets/products/rostro-03.webp",
    "rating": 4.9,
    "variantLabel": "Tono",
    "variants": [
      "Cherry Blossom Cake",
      "Pound Cake",
      "Sugar Cookie (Translúcido)",
      "Peach Pie"
    ],
    "shades": [
      "#C98A5A",
      "#A96A3F",
      "#8C4E2A",
      "#E0B48C",
      "#6E3A20"
    ],
    "featured": true
  }
];
  const rows = items.map((item) => ({
    id: item.id,
    category: item.category,
    brand: item.brand || "Velvet Aura Beauty",
    name: item.name,
    description: item.description,
    price_usd: item.priceUsd,
    stock: typeof item.stock === 'number' ? item.stock : 15,
    badge: item.badge || null,
    image_url: item.imageUrl || null,
    featured: Boolean(item.featured),
    disponible: true,
  }));

  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/catalog_items?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });

  if (!upsertRes.ok) {
    const errText = await upsertRes.text();
    throw new Error(`Error al sincronizar catalog_items (${upsertRes.status}): ${errText}`);
  }

  // 2b. Sincronizar configuración inicial del comercio (1:1 con DEFAULT_SITE_SETTINGS)
  const defaultSettings = {
  "businessHours": "Lunes a sábado, 9:00 – 19:00",
  "contactPhones": [
    "+584125558899"
  ],
  "paymentMethods": [
    "Pago Móvil",
    "Zelle",
    "Transferencia",
    "Efectivo"
  ],
  "announcementText": "✦ Catálogo Oficial Verificado · Stock en Tiempo Real · Atención Inmediata vía WhatsApp",
  "promoHeadline": "Boutique de maquillaje de autor y skincare clínico: 30 fórmulas virales con stock inmediato y entrega hoy.",
  "deliveryEta": "Despacho el mismo día"
};
  const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: 'default',
      business_hours: defaultSettings.businessHours,
      contact_phones: defaultSettings.contactPhones,
      payment_methods: defaultSettings.paymentMethods,
      announcement_text: defaultSettings.announcementText,
      promo_headline: defaultSettings.promoHeadline,
      delivery_eta: defaultSettings.deliveryEta,
    }),
  });

  if (!settingsRes.ok) {
    const settingsErr = await settingsRes.text();
    throw new Error(`Error al sincronizar site_settings (${settingsRes.status}): ${settingsErr}`);
  }

  // 3. Crear usuario Admin con app_metadata.role = "admin" en Supabase Auth
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        app_metadata: { role: 'admin' },
      }),
    });

    if (!authRes.ok && authRes.status !== 422) {
      const authErr = await authRes.text();
      throw new Error(`Error creando usuario Admin en Supabase Auth (${authRes.status}): ${authErr}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
