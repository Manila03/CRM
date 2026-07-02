import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Company, User } from '../src/models/index.js';

// Usar el plugin de ocultamiento de Puppeteer
puppeteer.use(StealthPlugin());

// Configuración de términos de búsqueda en Google Maps
const SEARCH_QUERIES = [
  'Restaurantes en Buenos Aires',
  'Ferreterias en Cordoba',
  'Farmacias en Rosario',
  'Tiendas de ropa en Mendoza',
  'Supermercados en La Plata'
];

// Fallback de base de datos hiperrealista con más de 150 comercios/negocios argentinos
const FALLBACK_COMPANIES = [
  // Buenos Aires - Gastronomía
  { name: 'Pizzería Güerrín', industry: 'Gastronomía', website: 'https://pizzeriaguerrin.com.ar', phone: '+54 11 4371-8141', address: 'Av. Corrientes 1368, Buenos Aires' },
  { name: 'Café Tortoni', industry: 'Gastronomía', website: 'http://cafetortoni.com.ar', phone: '+54 11 4342-4328', address: 'Av. de Mayo 825, Buenos Aires' },
  { name: 'Parrilla Don Julio', industry: 'Gastronomía', website: 'https://parrilladonjulio.com', phone: '+54 11 4831-9564', address: 'Guatemala 4699, Buenos Aires' },
  { name: 'El Preferido de Palermo', industry: 'Gastronomía', website: 'https://elpreferidodepalermo.com.ar', phone: '+54 11 4778-9584', address: 'Jorge Luis Borges 2108, Buenos Aires' },
  { name: 'Las Cuartetas', industry: 'Gastronomía', website: 'http://lascuartetas.com.ar', phone: '+54 11 4371-8699', address: 'Av. Corrientes 838, Buenos Aires' },
  { name: 'Pizzería Banchero', industry: 'Gastronomía', website: 'https://banchero.com.ar', phone: '+54 11 4301-1406', address: 'Av. Almirante Brown 1200, Buenos Aires' },
  
  // Buenos Aires - Retail / Supermercados / Farmacias
  { name: 'Supermercados Coto Sucursal Abasto', industry: 'Supermercados', website: 'https://coto.com.ar', phone: '+54 11 4860-2300', address: 'Agüero 568, Buenos Aires' },
  { name: 'Farmacity Palermo', industry: 'Salud y Farmacia', website: 'https://farmacity.com', phone: '+54 11 4779-1200', address: 'Av. Santa Fe 3253, Buenos Aires' },
  { name: 'Librería Jenny - El Ateneo Grand Splendid', industry: 'Librería y Editorial', website: 'https://yenny-elateneo.com', phone: '+54 11 4813-6052', address: 'Av. Santa Fe 1860, Buenos Aires' },
  { name: 'Ferretería El Progreso', industry: 'Ferretería y Construcción', website: 'https://ferreteriaelprogreso.com.ar', phone: '+54 11 4543-0987', address: 'Av. Cabildo 3120, Buenos Aires' },
  { name: 'Dexter Deportes Belgrano', industry: 'Indumentaria', website: 'https://dexter.com.ar', phone: '+54 11 4782-3211', address: 'Av. Cabildo 2200, Buenos Aires' },
  
  // Córdoba - Variados
  { name: 'Parrilla La Cabrera Córdoba', industry: 'Gastronomía', website: 'https://lacabrera.com.ar', phone: '+54 351 482-9087', address: 'Fructuoso Rivera 230, Córdoba' },
  { name: 'Ferretería Industrial Ortiz', industry: 'Ferretería y Construcción', website: 'https://ferreteriaortiz.com.ar', phone: '+54 351 422-3000', address: 'Av. Colón 850, Córdoba' },
  { name: 'Farmacias Líder Sucursal Centro', industry: 'Salud y Farmacia', website: 'https://farmaciaslider.com.ar', phone: '+54 351 426-8000', address: 'Av. General Paz 150, Córdoba' },
  { name: 'Super Mami Dinosaurio Mall', industry: 'Supermercados', website: 'https://e-mami.com.ar', phone: '+54 351 526-1500', address: 'Av. Fuerza Aérea Argentina 1700, Córdoba' },
  { name: 'La Mundial Quesos y Fiambres', industry: 'Fiambrería y Delicatessen', website: 'https://lamundial.com.ar', phone: '+54 351 453-2900', address: 'Av. Patria 450, Córdoba' },
  { name: 'Kiosco El Bosque Nueva Córdoba', industry: 'Kiosco', website: 'https://kiosco-elbosque.com.ar', phone: '+54 351 460-1234', address: 'Rondeau 345, Córdoba' },
  
  // Rosario - Variados
  { name: 'El Cairo Bar', industry: 'Gastronomía', website: 'http://barelcairo.com', phone: '+54 341 429-0012', address: 'Santa Fe 1102, Rosario' },
  { name: 'Sunderland Bar', industry: 'Gastronomía', website: 'https://sunderlandbar.com.ar', phone: '+54 341 440-1090', address: 'Av. Belgrano 2010, Rosario' },
  { name: 'Farmacia Dr. Astore', industry: 'Salud y Farmacia', website: 'https://farmaciaastore.com', phone: '+54 341 421-4567', address: 'Bv. Oroño 450, Rosario' },
  { name: 'Ferretería La Grapa', industry: 'Ferretería y Construcción', website: 'https://ferreterialagrapa.com', phone: '+54 341 430-8901', address: 'Av. Pellegrini 1200, Rosario' },
  { name: 'La Favorita Shopping', industry: 'Centro Comercial', website: 'https://lafavoritarosario.com', phone: '+54 341 420-5600', address: 'Sarmiento 801, Rosario' },
  
  // Mendoza - Variados
  { name: '1884 Restaurante Francis Mallmann', industry: 'Gastronomía', website: 'http://1884restaurante.com.ar', phone: '+54 261 424-3265', address: 'Belgrano 1188, Godoy Cruz, Mendoza' },
  { name: 'Farmacias Chester', industry: 'Salud y Farmacia', website: 'https://farmaciaschester.com', phone: '+54 261 420-0010', address: 'Av. España 1010, Mendoza' },
  { name: 'Ferretería El Átomo Mendoza', industry: 'Ferretería y Construcción', website: 'https://ferreteriaelatomo.com', phone: '+54 261 431-8900', address: 'Av. San Martín 2100, Mendoza' },
  { name: 'Supermercados Vea Mendoza Centro', industry: 'Supermercados', website: 'https://supermercadosvea.com.ar', phone: '+54 261 429-2300', address: 'Av. Las Heras 340, Mendoza' },
  { name: 'Boutique del Vino Mendoza', industry: 'Vinoteca', website: 'https://boutiquedelvino.com.ar', phone: '+54 261 423-1100', address: 'Av. Arístides Villanueva 420, Mendoza' }
];

// Generar una gran colección de comercios simulados (150+) usando patrones realistas para completar el set de datos
function generateMassiveFallbackData() {
  const industries = ['Gastronomía', 'Ferretería y Construcción', 'Salud y Farmacia', 'Indumentaria', 'Kiosco y Almacén', 'Servicios Profesionales', 'Supermercados', 'Gimnasio y Deportes', 'Tecnología y Electrónica'];
  const cities = [
    { name: 'Buenos Aires', prefix: '11', code: 'C1000' },
    { name: 'Córdoba', prefix: '351', code: 'X5000' },
    { name: 'Rosario', prefix: '341', code: 'S2000' },
    { name: 'Mendoza', prefix: '261', code: 'M5500' },
    { name: 'La Plata', prefix: '221', code: 'B1900' },
    { name: 'Mar del Plata', prefix: '223', code: 'B7600' },
    { name: 'San Miguel de Tucumán', prefix: '381', code: 'T4000' },
    { name: 'Salta', prefix: '387', code: 'A4400' }
  ];
  
  const namesPool = {
    'Gastronomía': ['Bodegón', 'Parrilla', 'Café', 'Restaurante', 'Pizzería', 'Cervecería', 'Panadería'],
    'Ferretería y Construcción': ['Ferretería', 'Bulonería', 'Corralón', 'Sanitarios', 'Pinturería'],
    'Salud y Farmacia': ['Farmacia', 'Óptica', 'Consultorios', 'Laboratorio', 'Centro Médico'],
    'Indumentaria': ['Boutique', 'Tienda de Ropa', 'Calzados', 'Moda', 'Local de Deportes'],
    'Kiosco y Almacén': ['Kiosco', 'Almacén', 'Fiambrería', 'Minimarket', 'Verdulería'],
    'Servicios Profesionales': ['Estudio Contable', 'Inmobiliaria', 'Consultora', 'Seguros', 'Abogados'],
    'Supermercados': ['Supermercado', 'Autoservicio', 'Express', 'Mayorista'],
    'Gimnasio y Deportes': ['Gimnasio', 'Club de Fit', 'Sport Center', 'Pilates', 'Crossfit'],
    'Tecnología y Electrónica': ['Servicio Técnico', 'Cómputación', 'Celulares', 'Audio y Video', 'Tecnología']
  };

  const adjPool = ['Argentino', 'El Progreso', 'La Unión', 'Sur', 'Del Centro', 'Norte', 'San Martín', 'Belgrano', 'Libertador', 'Colón', 'Avenida', 'Fénix', 'Premium', 'Express', 'La Favorita', 'Plaza', 'Mitre', 'Aconcagua', 'Andino', 'Federal'];
  const streetsPool = ['Av. San Martín', 'Av. Rivadavia', 'Calle Mitre', 'Av. Belgrano', 'Calle Colón', 'Bv. Oroño', 'Calle Sarmiento', 'Calle Pellegrini', 'Av. General Paz', 'Av. de Mayo', 'Calle Urquiza', 'Calle 25 de Mayo', 'Av. 9 de Julio'];

  const generated = [...FALLBACK_COMPANIES];

  // Generar hasta completar 160 compañías
  let count = FALLBACK_COMPANIES.length;
  while (count < 160) {
    const ind = industries[Math.floor(Math.random() * industries.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    
    const prefix = namesPool[ind][Math.floor(Math.random() * namesPool[ind].length)];
    const adj = adjPool[Math.floor(Math.random() * adjPool.length)];
    const name = `${prefix} ${adj}`;

    // Evitar nombres repetidos
    if (generated.some(c => c.name === name)) continue;

    const street = streetsPool[Math.floor(Math.random() * streetsPool.length)];
    const num = Math.floor(Math.random() * 4500) + 50;
    const address = `${street} ${num}, ${city.name}, Argentina`;

    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const website = `https://${cleanName}.com.ar`;

    const phoneBody = `${Math.floor(Math.random() * 8999999) + 1000000}`;
    const phone = `+54 ${city.prefix} ${phoneBody.substring(0,4)}-${phoneBody.substring(4)}`;

    generated.push({ name, industry: ind, website, phone, address });
    count++;
  }

  return generated;
}

// Función auxiliar para retardar la ejecución
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('======================================================');
  console.log('🚀 INICIANDO CRAWLER DE GOOGLE MAPS PARA EL CRM 🚀');
  console.log('======================================================');

  // 1. Obtener usuarios dueños
  let userIds = [];
  try {
    const users = await User.findAll({ attributes: ['id'] });
    userIds = users.map(u => u.id);
    console.log(`✔ Usuarios encontrados en la BD para asignar propiedad: ${userIds.length} usuarios.`);
  } catch (error) {
    console.error('⚠ No se pudieron cargar los usuarios de la base de datos.', error.message);
    console.log('Se procederá utilizando el ID 1 de forma predeterminada.');
    userIds = [1];
  }

  if (userIds.length === 0) {
    userIds = [1];
  }

  let scrapedCompanies = [];
  let browser = null;

  // 2. Intentar scraping de Google Maps con Puppeteer
  try {
    console.log('\n🔍 Iniciando Puppeteer con plugin de ocultamiento (Stealth)...');
    
    // Configurar Puppeteer
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
    // Establecer User-Agent realista
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    console.log('✔ Navegador lanzado con éxito.');

    for (const query of SEARCH_QUERIES) {
      console.log(`\n🔎 Buscando en Google Maps: "${query}"...`);
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      console.log('✔ Página cargada. Buscando resultados...');

      // Esperar a que el panel de resultados o mapa se despliegue
      await delay(4000);

      // Desplazarse (Scroll) por la barra de resultados de Google Maps para cargar más comercios
      console.log('⏳ Cargando comercios mediante scroll vertical...');
      await page.evaluate(async () => {
        // Encontrar el div del listado que tiene scroll. 
        // Usualmente es un contenedor con role="feed" o clase específica
        const findScrollContainer = () => {
          const feeds = document.querySelectorAll('div[role="feed"]');
          if (feeds.length > 0) return feeds[0];
          // Buscar alternativas si cambia el role
          const scrollableDivs = Array.from(document.querySelectorAll('div')).filter(d => {
            const style = window.getComputedStyle(d);
            return (style.overflowY === 'auto' || style.overflowY === 'scroll') && d.scrollHeight > 500;
          });
          return scrollableDivs[0] || null;
        };

        const container = findScrollContainer();
        if (!container) return;

        let lastHeight = container.scrollHeight;
        // Scroll 5 veces para cargar unos 20-30 resultados iniciales de forma rápida
        for (let i = 0; i < 5; i++) {
          container.scrollBy(0, container.scrollHeight);
          await new Promise(res => setTimeout(res, 1500));
          if (container.scrollHeight === lastHeight) break;
          lastHeight = container.scrollHeight;
        }
      });

      // Extraer los enlaces de locales (.hfpxzc es la clase histórica para los enlaces de comercios)
      const itemLinks = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a.hfpxzc');
        return Array.from(anchors).map(a => ({
          name: a.getAttribute('aria-label') || 'Comercio Desconocido',
          href: a.getAttribute('href')
        }));
      });

      console.log(`✔ Se encontraron ${itemLinks.length} comercios preliminares en el feed.`);

      // Para los primeros 10 locales de esta query, ingresar y extraer detalles precisos
      const itemsToScrape = itemLinks.slice(0, 8); // Ajustamos a 8 por query para no demorar demasiado el script
      for (const item of itemsToScrape) {
        try {
          console.log(`   👉 Extrayendo: "${item.name}"...`);
          
          // Navegar directamente al enlace del local
          await page.goto(item.href, { waitUntil: 'networkidle2', timeout: 45000 });
          await delay(3000); // Dar tiempo a que abra el panel lateral de detalles

          // Ejecutar extracción
          const details = await page.evaluate(() => {
            // Selectores estables de Google Maps
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

          // Limpieza y validación
          if (details.name) {
            scrapedCompanies.push({
              name: details.name,
              industry: details.category || 'Retail',
              website: details.website || `https://${details.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.ar`,
              phone: details.phone || 'S/D',
              address: details.address || 'Argentina'
            });
            console.log(`      ✔ Guardado temporal: ${details.name} (Tel: ${details.phone || 'S/D'})`);
          }
        } catch (itemErr) {
          console.log(`      ⚠ Error extrayendo detalles del comercio: ${itemErr.message}`);
        }
      }
    }

    console.log(`\n🏁 Scraping en tiempo real completado. Se obtuvieron ${scrapedCompanies.length} comercios.`);
    await browser.close();

  } catch (scrapeErr) {
    console.error('\n⚠ Ocurrió un inconveniente durante el scraping interactivo en Google Maps.');
    console.error(`Detalle del error: ${scrapeErr.message}`);
    if (browser) await browser.close();
    console.log('Activando el generador masivo fallback para poblar la DB con datos argentinos hiperrealistas...');
  }

  // 3. Evaluar e integrar el set de datos final
  let finalCompaniesList = [];
  if (scrapedCompanies.length >= 10) {
    console.log('✔ Usando datos reales extraídos de Google Maps.');
    finalCompaniesList = scrapedCompanies;
  } else {
    console.log('✔ Generando la totalidad de comercios de Argentina mediante el Fallback del sistema...');
    finalCompaniesList = generateMassiveFallbackData();
  }

  console.log(`\n📦 Procesando ${finalCompaniesList.length} compañías para su inserción...`);

  // 4. Escribir y persistir en la Base de Datos
  let insertedCount = 0;
  let updatedCount = 0;

  for (const comp of finalCompaniesList) {
    try {
      // Asignar dueño aleatorio
      const randomOwnerId = userIds[Math.floor(Math.random() * userIds.length)];
      
      // Simular ingresos y empleados
      const annualRevenue = (Math.random() * 950000 + 50000).toFixed(2); // entre 50k y 1M USD
      const employeesCount = Math.floor(Math.random() * 80) + 3; // entre 3 y 83 empleados

      // Upsert basado en el nombre comercial para evitar duplicación repetitiva en ejecuciones consecutivas
      const [company, created] = await Company.findOrCreate({
        where: { name: comp.name },
        defaults: {
          industry: comp.industry,
          website: comp.website,
          phone: comp.phone,
          address: comp.address,
          annualRevenue,
          employeesCount,
          ownerId: randomOwnerId
        }
      });

      if (created) {
        insertedCount++;
      } else {
        // Actualizar datos de contacto por si cambiaron en Maps
        company.phone = comp.phone;
        company.website = comp.website;
        company.address = comp.address;
        await company.save();
        updatedCount++;
      }
    } catch (dbError) {
      console.error(`❌ Error insertando compañía: ${comp.name}`, dbError.message);
    }
  }

  console.log('\n======================================================');
  console.log('🎉 PROCESO DE POBLACIÓN DE LA DB FINALIZADO 🎉');
  console.log(`🔹 Compañías Nuevas Insertadas: ${insertedCount}`);
  console.log(`🔹 Compañías Existentes Actualizadas: ${updatedCount}`);
  console.log('======================================================\n');
  process.exit(0);
}

main();
