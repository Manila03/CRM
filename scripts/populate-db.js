import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { connectRabbitMQ, getQueueName } from '../src/config/rabbitmq.js';

// Usar el plugin de ocultamiento de Puppeteer
puppeteer.use(StealthPlugin());

// Configuración de términos de búsqueda en Google Maps para rastrear locales en Argentina
const SEARCH_QUERIES = [
  'Restaurantes en Buenos Aires',
  'Ferreterias en Cordoba',
  'Farmacias en Rosario',
  'Tiendas de ropa en Mendoza',
  'Supermercados en La Plata'
];

// Función auxiliar para retardar la ejecución
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('======================================================');
  console.log('📣 INICIANDO PUBLICADOR / SCRAPER DE GOOGLE MAPS 📣');
  console.log('======================================================');

  // 1. Conectar a RabbitMQ para poder publicar mensajes
  let connection, channel;
  try {
    const connInfo = await connectRabbitMQ(5, 3000);
    connection = connInfo.connection;
    channel = connInfo.channel;
  } catch (error) {
    console.error('❌ No se pudo establecer conexión con RabbitMQ. Deteniendo publicador.', error.message);
    process.exit(1);
  }

  const queueName = getQueueName();
  let browser = null;
  let publishedCount = 0;
  let discardedCount = 0;

  // 2. Ejecutar scraping de Google Maps con Puppeteer
  try {
    console.log('\n🔍 Iniciando Puppeteer con plugin de ocultamiento (Stealth)...');
    
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    console.log('✔ Navegador lanzado con éxito.');

    for (const query of SEARCH_QUERIES) {
      console.log(`\n🔎 Buscando en Google Maps: "${query}"...`);
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(4000);

      // Desplazarse por el feed de resultados
      console.log('⏳ Cargando comercios mediante scroll...');
      await page.evaluate(async () => {
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
        for (let i = 0; i < 6; i++) { // Desplazamiento para cargar suficientes comercios reales
          container.scrollBy(0, container.scrollHeight);
          await new Promise(res => setTimeout(res, 1500));
          if (container.scrollHeight === lastHeight) break;
          lastHeight = container.scrollHeight;
        }
      });

      // Extraer los enlaces de locales
      const itemLinks = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a.hfpxzc');
        return Array.from(anchors).map(a => ({
          name: a.getAttribute('aria-label') || 'Comercio Desconocido',
          href: a.getAttribute('href')
        }));
      });

      console.log(`✔ Se encontraron ${itemLinks.length} comercios preliminares.`);

      // Procesar los primeros 12 locales de cada búsqueda
      const itemsToScrape = itemLinks.slice(0, 12);
      for (const item of itemsToScrape) {
        try {
          console.log(`   👉 Extrayendo: "${item.name}"...`);
          
          await page.goto(item.href, { waitUntil: 'networkidle2', timeout: 45000 });
          await delay(3000);

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
            // REGLA DE NEGOCIO: Si no tiene NI Website ni Teléfono, se descarta por completo.
            const hasWebsite = details.website && details.website.trim() !== '' && details.website.trim() !== 'S/D';
            const hasPhone = details.phone && details.phone.trim() !== '' && details.phone.trim() !== 'S/D';

            if (!hasWebsite && !hasPhone) {
              discardedCount++;
              console.log(`      🚫 DESCARTE: "${details.name}" no posee teléfono ni sitio web.`);
              continue;
            }

            // Publicar el comercio como mensaje JSON en la cola de RabbitMQ
            const message = JSON.stringify({
              name: details.name,
              industry: details.category || 'Retail',
              website: details.website || '',
              phone: details.phone || '',
              address: details.address || 'Argentina'
            });

            channel.sendToQueue(queueName, Buffer.from(message), { persistent: true });
            publishedCount++;
            console.log(`      ✔ PUBLICADO en RabbitMQ: "${details.name}"`);
          }
        } catch (itemErr) {
          console.log(`      ⚠ Error extrayendo detalles de este local: ${itemErr.message}`);
        }
      }
    }

    console.log('\n🏁 Scraping e inyección en cola completada.');

  } catch (scrapeErr) {
    console.error('\n❌ Ocurrió un error general durante el proceso de scraping:', scrapeErr.message);
  } finally {
    if (browser) await browser.close();
    
    // Dar un pequeño delay para asegurar la transmisión de los buffers de RabbitMQ antes de cerrar
    await delay(2000);
    if (connection) {
      await channel.close();
      await connection.close();
      console.log('✔ Conexiones a RabbitMQ cerradas de forma ordenada.');
    }
  }

  console.log('======================================================');
  console.log('🎉 RESUMEN DE LA SESIÓN DE PUBLICACIÓN 🎉');
  console.log(`🔹 Mensajes Enviados a Cola: ${publishedCount}`);
  console.log(`🔹 Locales Descartados (Sin Web/Tel): ${discardedCount}`);
  console.log('======================================================\n');
  process.exit(0);
}

main();
