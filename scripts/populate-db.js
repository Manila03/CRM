import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ingestCompany } from '../src/worker.js';

const MAX_SCROLL_ITERATIONS = 30;

// Usar el plugin de ocultamiento de Puppeteer
puppeteer.use(StealthPlugin());

// Configuración de términos de búsqueda en Google Maps para rastrear locales en Argentina
const BUSINESS_TYPES = [
  'Restaurantes',
  'Ferreterías',
  'Farmacias',
  'Tiendas de ropa',
  'Supermercados',
  'Cafeterías',
  'Panaderías',
  'Peluquerías',
  'Gimnasios',
  'Talleres mecánicos',
  'Veterinarias',
  'Inmobiliarias',
  'Carnicerías',
  'Verdulerías',
  'Dietéticas',
  'Librerías',
  'Dentistas',
  'Hoteles',
  'Heladerías',
  'Jugueterías',
  'Zapaterías',
  'Bazares',
  'Kioscos',
  'Cervecerías',
  'Centros de estética',
  'Consultorios médicos',
  'Viveros',
  'Mueblerías',
  'Pet shops',
  'Casas de computación',
  'Lavaderos de autos',
  'Ópticas',
  'Centros médicos',
  'Escuelas de manejo',
  'Salones de eventos',
  'Estaciones de servicio',
  'Distribuidoras de bebidas',
  'Fiambrerías',
  'Pinturerías',
  'Casas de repuestos'
];

const LOCATIONS = [
  // CABA
  'CABA',
  // Buenos Aires (Provincia)
  'La Plata, Buenos Aires',
  'Mar del Plata, Buenos Aires',
  'Bahía Blanca, Buenos Aires',
  'Tandil, Buenos Aires',
  'Pilar, Buenos Aires',
  'San Isidro, Buenos Aires',
  'Quilmes, Buenos Aires',
  'Tigre, Buenos Aires',
  'Lomas de Zamora, Buenos Aires',
  // Catamarca
  'San Fernando del Valle de Catamarca',
  // Chaco
  'Resistencia, Chaco',
  'Presidencia Roque Sáenz Peña, Chaco',
  // Chubut
  'Comodoro Rivadavia, Chubut',
  'Puerto Madryn, Chubut',
  'Trelew, Chubut',
  // Córdoba
  'Córdoba',
  'Villa Carlos Paz, Córdoba',
  'Río Cuarto, Córdoba',
  'Villa María, Córdoba',
  // Corrientes
  'Corrientes',
  'Goya, Corrientes',
  // Entre Ríos
  'Paraná, Entre Ríos',
  'Concordia, Entre Ríos',
  'Gualeguaychú, Entre Ríos',
  // Formosa
  'Formosa',
  // Jujuy
  'San Salvador de Jujuy',
  'San Pedro de Jujuy',
  // La Pampa
  'Santa Rosa, La Pampa',
  'General Pico, La Pampa',
  // La Rioja
  'La Rioja',
  // Mendoza
  'Mendoza',
  'San Rafael, Mendoza',
  'Godoy Cruz, Mendoza',
  // Misiones
  'Posadas, Misiones',
  'Puerto Iguazú, Misiones',
  // Neuquén
  'Neuquén',
  'San Martín de los Andes, Neuquén',
  // Río Negro
  'San Carlos de Bariloche, Río Negro',
  'Cipolletti, Río Negro',
  'Viedma, Río Negro',
  // Salta
  'Salta',
  'San Ramón de la Nueva Orán, Salta',
  // San Juan
  'San Juan',
  // San Luis
  'San Luis',
  'Villa Mercedes, San Luis',
  // Santa Cruz
  'Río Gallegos, Santa Cruz',
  'El Calafate, Santa Cruz',
  // Santa Fe
  'Rosario, Santa Fe',
  'Santa Fe',
  'Rafaela, Santa Fe',
  'Venado Tuerto, Santa Fe',
  // Santiago del Estero
  'Santiago del Estero',
  'La Banda, Santiago del Estero',
  // Tierra del Fuego
  'Ushuaia, Tierra del Fuego',
  'Río Grande, Tierra del Fuego',
  // Tucumán
  'San Miguel de Tucumán',
  'Yerba Buena, Tucumán'
];

// Generar combinaciones en formato "Negocio en Ubicación"
const ALL_COMBINATIONS = [];
for (const business of BUSINESS_TYPES) {
  for (const location of LOCATIONS) {
    ALL_COMBINATIONS.push(`${business} en ${location}`);
  }
}

// Algoritmo de Fisher-Yates para mezclar (shuffle) las combinaciones y obtener diversidad en cada ejecución
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const limitEnv = process.env.LIMIT;
const runAll = process.env.RUN_ALL === 'true';
const shuffledQueries = shuffleArray(ALL_COMBINATIONS);

const SEARCH_QUERIES = runAll 
  ? shuffledQueries 
  : shuffledQueries.slice(0, limitEnv ? parseInt(limitEnv, 10) : 15);


// Función para limpiar emojis, símbolos regionales y emoticonos de un texto (para la dirección)
function cleanEmojisAndEmoticons(text) {
  if (!text) return text;
  
  // Permitimos únicamente: Letras (cualquier idioma/acentos), Números, Espacios, comas, puntos, guiones, barras, paréntesis, signo de grado (°) y numeral (#)
  const cleaned = text.replace(/[^\p{L}\p{N}\s.,\-\/()°#''"']/gu, '');
  
  // Limpiar espacios múltiples que puedan haber quedado
  return cleaned.replace(/\s+/g, ' ').trim();
}

// Función para limpiar teléfonos, dejando únicamente números, espacios y los signos "+" y "-"
function cleanPhone(text) {
  if (!text) return text;
  return text.replace(/[^\d+\-\s]/g, '');
}

// Función para extraer coordenadas latitud/longitud de URLs de Google Maps
function extractCoordinates(url) {
  if (!url) return { lat: null, lon: null };
  
  // Patrón 1: @lat,lon
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return {
      lat: parseFloat(atMatch[1]),
      lon: parseFloat(atMatch[2])
    };
  }

  // Patrón 2: !3dlat!4dlon
  const bangMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bangMatch) {
    return {
      lat: parseFloat(bangMatch[1]),
      lon: parseFloat(bangMatch[2])
    };
  }

  return { lat: null, lon: null };
}

// Función auxiliar para retardar la ejecución
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
  '--window-size=1280,800'
];

async function safeGoto(page, url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 }).catch(() => {});
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`   ⚠ Navegación fallida (intento ${attempt}/${retries}): ${err.message}`);
      await delay(2000 * attempt);
    }
  }
}

async function dismissConsent(page) {
  try {
    await page.evaluate(() => {
      const labels = ['Aceptar todo', 'Accept all', 'Rechazar todo', 'Reject all', 'Acepto'];
      for (const el of document.querySelectorAll('button, div[role="button"]')) {
        const text = el.textContent?.trim() || '';
        if (labels.some(label => text.includes(label))) {
          el.click();
          return;
        }
      }
    });
  } catch {
    // El banner de cookies puede no estar presente.
  }
}

async function waitForResults(page) {
  await page.waitForSelector('a.hfpxzc, div[role="feed"]', { timeout: 30000 }).catch(() => {});
}

async function main() {
  console.log('======================================================');
  console.log('📣 INICIANDO SCRAPER + INGESTIÓN DE GOOGLE MAPS 📣');
  console.log(`📊 Total de combinaciones posibles: ${ALL_COMBINATIONS.length}`);
  console.log(`🔍 Consultas seleccionadas para esta sesión: ${SEARCH_QUERIES.length}`);
  console.log(`💡 Para limitar la ejecución: LIMIT=X node scripts/populate-db.js`);
  console.log(`💡 Para ejecutar todo: RUN_ALL=true node scripts/populate-db.js`);
  console.log('======================================================');

  let browser = null;
  let ingestedCount = 0;
  let discardedCount = 0;
  let errorCount = 0;
  const seenHrefs = new Set();

  // 2. Ejecutar scraping de Google Maps con Puppeteer
  try {
    console.log('\n🔍 Iniciando Puppeteer con plugin de ocultamiento (Stealth)...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: BROWSER_ARGS
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(45000);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-AR,es;q=0.9' });

    console.log('✔ Navegador lanzado con éxito.');

    for (const query of SEARCH_QUERIES) {
      try {
      console.log(`\n🔎 Buscando en Google Maps: "${query}"...`);
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      
      await safeGoto(page, searchUrl);
      await dismissConsent(page);
      await delay(3000);
      await waitForResults(page);

      // Desplazarse por el feed de resultados
      console.log('⏳ Cargando comercios mediante scroll...');
      await page.evaluate(async (maxScrollIterations) => {
        const findScrollContainer = () => {
          const feeds = document.querySelectorAll('div[role="feed"]');
          if (feeds.length > 0) return feeds[0];
          const scrollableDivs = Array.from(document.querySelectorAll('div')).filter(d => {
            const style = window.getComputedStyle(d);
            return (style.overflowY === 'auto' || style.overflowY === 'scroll') && d.scrollHeight > 500;
          });
          return scrollableDivs[0] || null;
        };

        const container = findScrollContainer();
        if (!container) return;

        let lastHeight = container.scrollHeight;
        let stagnantRounds = 0;
        for (let i = 0; i < maxScrollIterations; i++) {
          container.scrollBy(0, container.scrollHeight);
          await new Promise(res => setTimeout(res, 1500));
          if (container.scrollHeight === lastHeight) {
            stagnantRounds++;
            if (stagnantRounds >= 2) break;
          } else {
            stagnantRounds = 0;
            lastHeight = container.scrollHeight;
          }
        }
      }, MAX_SCROLL_ITERATIONS);

      // Extraer los enlaces de locales
      const itemLinks = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a.hfpxzc');
        return Array.from(anchors).map(a => ({
          name: a.getAttribute('aria-label') || 'Comercio Desconocido',
          href: a.getAttribute('href')
        }));
      });

      console.log(`✔ Se encontraron ${itemLinks.length} comercios preliminares.`);

      const itemsToScrape = itemLinks.filter(item => {
        if (!item.href || seenHrefs.has(item.href)) return false;
        seenHrefs.add(item.href);
        return true;
      });

      console.log(`   📋 Procesando ${itemsToScrape.length} comercios nuevos (${itemLinks.length} en pantalla, ${seenHrefs.size} únicos en sesión).`);

      for (const item of itemsToScrape) {
        try {
          console.log(`   👉 Extrayendo: "${item.name}"...`);
          
          await safeGoto(page, item.href);
          await delay(2500);

          const currentUrl = page.url();
          const coords = extractCoordinates(currentUrl) || extractCoordinates(item.href);

          const details = await page.evaluate(() => {
            const nameEl = document.querySelector('h1.DUwDvf');
            const categoryEl = document.querySelector('button.DkEaCc, span.DkEaCc');
            const addressEl = document.querySelector('button[data-item-id="address"]');
            const phoneEl = document.querySelector('button[data-item-id^="phone:tel:"]');
            const websiteEl = document.querySelector('a[data-item-id="authority"]');

            const name = nameEl ? nameEl.textContent.trim() : null;
            const category = categoryEl ? categoryEl.textContent.trim() : 'Comercio';
            
            let address = addressEl ? addressEl.textContent.trim() : null;
            if (address && address.startsWith('Dirección:')) {
              address = address.replace('Dirección:', '').trim();
            }

            let phone = phoneEl ? phoneEl.textContent.trim() : null;
            if (phone && phone.startsWith('Teléfono:')) {
              phone = phone.replace('Teléfono:', '').trim();
            }

            const website = websiteEl ? websiteEl.getAttribute('href') : null;

            return { name, category, address, phone, website };
          });

          if (details.name) {
            // Limpiar teléfono (solo números, "+" y "-") y dirección (sin emojis ni emoticonos)
            details.phone = cleanPhone(details.phone);
            details.address = cleanEmojisAndEmoticons(details.address);
            details.lat = coords.lat;
            details.lon = coords.lon;

            // REGLA DE NEGOCIO: Si no tiene NI Website ni Teléfono, se descarta por completo.
            const hasWebsite = details.website && details.website.trim() !== '' && details.website.trim() !== 'S/D';
            const hasPhone = details.phone && details.phone.trim() !== '' && details.phone.trim() !== 'S/D';

            if (!hasWebsite && !hasPhone) {
              discardedCount++;
              console.log(`      🚫 DESCARTE: "${details.name}" no posee teléfono ni sitio web.`);
              continue;
            }

            const result = await ingestCompany({
              name: details.name,
              industry: details.category || 'Retail',
              website: details.website || '',
              phone: details.phone || '',
              address: details.address || 'Argentina',
              lat: details.lat,
              lon: details.lon,
              gmapsUrl: item.href
            });

            if (result.discarded) {
              discardedCount++;
              console.log(`      🚫 DESCARTE: "${details.name}" no posee teléfono ni sitio web.`);
            } else if (result.ok) {
              ingestedCount++;
              console.log(`      ✔ INGESTADO: "${details.name}" (Lat: ${details.lat}, Lon: ${details.lon})`);
            } else {
              errorCount++;
              console.error(`      ❌ Error al ingestar "${details.name}": ${result.status} - ${result.response}`);
            }
          }
        } catch (itemErr) {
          console.log(`      ⚠ Error extrayendo detalles de este local: ${itemErr.message}`);
        }
      }
      } catch (queryErr) {
        console.error(`   ❌ Error en búsqueda "${query}": ${queryErr.message}`);
      }
    }

    console.log('\n🏁 Scraping e ingestión completada.');

  } catch (scrapeErr) {
    console.error('\n❌ Ocurrió un error general durante el proceso de scraping:', scrapeErr.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log('======================================================');
  console.log('🎉 RESUMEN DE LA SESIÓN DE INGESTIÓN 🎉');
  console.log(`🔹 Comercios Ingestados: ${ingestedCount}`);
  console.log(`🔹 Locales Descartados (Sin Web/Tel): ${discardedCount}`);
  console.log(`🔹 Errores de Ingestión: ${errorCount}`);
  console.log(`🔹 Comercios únicos vistos: ${seenHrefs.size}`);
  console.log('======================================================\n');
  process.exit(0);
}

main();
