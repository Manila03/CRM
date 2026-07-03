import { connectRabbitMQ, getQueueName } from './config/rabbitmq.js';
import { sequelize, Company, User } from './models/index.js';

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

// Genera un ID determinista numérico de OSM (32-bit hash positivo de nombre + dirección)
function generateOsmId(name, address) {
  const str = `${name}_${address || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Parsea la dirección para extraer calle, número de puerta, ciudad y país
function parseAddressTags(address) {
  const tags = [];
  if (!address) return tags;

  tags.push({ k: 'addr:full', v: address });

  // Intenta separar la dirección por comas. El formato suele ser: "Calle Altura, Localidad, Provincia"
  const parts = address.split(',').map(p => p.trim());
  if (parts.length > 0) {
    const streetPart = parts[0];
    // Extrae la calle y el número al final de la calle (ej: "Mendez de Andes 1400")
    const match = streetPart.match(/^(.*?)\s+(\d+)$/);
    if (match) {
      tags.push({ k: 'addr:street', v: match[1].trim() });
      tags.push({ k: 'addr:housenumber', v: match[2].trim() });
    } else {
      tags.push({ k: 'addr:street', v: streetPart });
    }
  }

  if (parts.length > 1) {
    tags.push({ k: 'addr:city', v: parts[1] });
  }

  tags.push({ k: 'addr:country', v: 'AR' }); // Predeterminado para Argentina

  return tags;
}

const startWorker = async () => {
  console.log('======================================================');
  console.log('👷 INICIANDO CONSUMIDOR DE COMPAÑÍAS (WORKER) 👷');
  console.log('======================================================');

  // 1. Conectar a PostgreSQL con reintentos
  let dbConnected = false;
  while (!dbConnected) {
    try {
      await sequelize.authenticate();
      console.log('✔ Conectado a la base de datos PostgreSQL.');
      dbConnected = true;
    } catch (err) {
      console.error('⚠ Esperando conexión a la base de datos...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // 2. Conectar a RabbitMQ
  const { channel } = await connectRabbitMQ();
  const queueName = getQueueName();

  // Obtener usuarios existentes para asignar ownership de forma aleatoria
  let userIds = [];
  try {
    const users = await User.findAll({ attributes: ['id'] });
    userIds = users.map(u => u.id);
    console.log(`✔ Usuarios en DB para propiedad: [${userIds.join(', ')}]`);
  } catch (error) {
    console.error('⚠ No se pudieron cargar los usuarios de la base de datos. Se usará el ID 1.');
    userIds = [1];
  }

  if (userIds.length === 0) userIds = [1];

  // Limitar la cantidad de mensajes sin confirmar (Prefetch) por Worker
  // Esto permite procesar hasta 5 mensajes simultáneamente por este Worker
  channel.prefetch(5);

  console.log(`\n📥 Esperando mensajes en la cola '${queueName}'...`);

  // 3. Consumir mensajes
  channel.consume(queueName, async (msg) => {
    if (!msg) return;

    const companyDataStr = msg.content.toString();
    try {
      const comp = JSON.parse(companyDataStr);
      console.log(`[Worker] 📦 Recibida compañía: "${comp.name}"`);

      // Limpiar teléfono (solo números, "+" y "-") y dirección (sin emojis ni emoticonos)
      comp.phone = cleanPhone(comp.phone);
      comp.address = cleanEmojisAndEmoticons(comp.address);

      // REGLA DE NEGOCIO: Si no se encuentra NI Website ni Teléfono, descartar la entrada completamente.
      // Limpiamos los placeholders comunes como 'S/D' o vacíos
      const sanitizedWebsite = comp.website && comp.website.trim() !== '' && comp.website.trim() !== 'S/D' ? comp.website.trim() : null;
      const sanitizedPhone = comp.phone && comp.phone.trim() !== '' && comp.phone.trim() !== 'S/D' ? comp.phone.trim() : null;

      if (!sanitizedWebsite && !sanitizedPhone) {
        console.log(`[Worker] 🚫 DESCARTADA compañía "${comp.name}" por falta de Teléfono y Sitio Web.`);
        channel.ack(msg);
        return;
      }

      // Asignar dueño aleatorio
      const ownerId = userIds[Math.floor(Math.random() * userIds.length)];

      // Simular ingresos y empleados
      const annualRevenue = (Math.random() * 950000 + 50000).toFixed(2);
      const employeesCount = Math.floor(Math.random() * 80) + 3;

      // Generar ID determinista de OSM
      const osmId = generateOsmId(comp.name, comp.address);

      // Mapear los tags requeridos por OSM y todos los campos simulados para no perder información
      const tags = [
        { k: 'name', v: comp.name },
        { k: 'name:es', v: comp.name },
        { k: 'amenity', v: comp.industry || 'Comercio' },
        { k: 'phone', v: sanitizedPhone || '' },
        { k: 'website', v: sanitizedWebsite || '' }
      ];

      // Mapear los campos de la dirección parsed
      const addrTags = parseAddressTags(comp.address);
      tags.push(...addrTags);

      // Campos que se almacenarían en la base de datos de compañías en el CRM
      tags.push({ k: 'annual_revenue', v: String(annualRevenue) });
      tags.push({ k: 'employees_count', v: String(employeesCount) });
      tags.push({ k: 'crm_owner_id', v: String(ownerId) });
      if (comp.gmapsUrl) {
        tags.push({ k: 'gmaps_url', v: comp.gmapsUrl });
      }

      // Payload final de la API
      const apiPayload = {
        nodes: [
          {
            id: osmId,
            type: 'node',
            lat: (comp.lat !== undefined && comp.lat !== null) ? comp.lat : null,
            lon: (comp.lon !== undefined && comp.lon !== null) ? comp.lon : null,
            tags
          }
        ]
      };

      const ingestSecret = process.env.INGEST_SECRET;
      if (!ingestSecret) {
        console.warn('[Worker] ⚠ ADVERTENCIA: La variable INGEST_SECRET no está definida en el entorno.');
      }

      console.log(`[Worker] 🚀 Enviando punto de venta "${comp.name}" a la API externa de Lovable...`);
      
      const response = await fetch('https://hayquehacerplatita.lovable.app/api/public/ingest/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ingest-secret': ingestSecret || ''
        },
        body: JSON.stringify(apiPayload)
      });

      const resStatus = response.status;
      const resText = await response.text();

      if (response.ok) {
        console.log(`[Worker] ✔ API Externa: Enviado con éxito. Status: ${resStatus}. Respuesta: ${resText}`);
        channel.ack(msg);
      } else {
        console.error(`[Worker] ❌ API Externa: Error al enviar. Status: ${resStatus}. Respuesta: ${resText}`);
        // Para errores del cliente 4xx (400, 401, etc.), no reintentamos para evitar bucles infinitos
        if (resStatus >= 400 && resStatus < 500) {
          console.error(`[Worker] 🚫 Error irrecuperable (Cliente ${resStatus}). Descartando mensaje.`);
          channel.ack(msg);
        } else {
          console.error('[Worker] 🔄 Error temporal del servidor. Reencolando mensaje para reintento...');
          channel.reject(msg, true);
        }
      }

    } catch (parseError) {
      console.error('[Worker] ❌ Error de procesamiento del mensaje:', companyDataStr);
      console.error(parseError.message);
      // Si el error fue de conexión de red en fetch, reencolamos
      if (parseError.name === 'TypeError' || parseError.code === 'ENOTFOUND' || parseError.message.includes('fetch')) {
        console.log('[Worker] 🔄 Error de conexión HTTP. Reencolando mensaje...');
        channel.reject(msg, true);
      } else {
        channel.reject(msg, false);
      }
    }
  }, { noAck: false });
};

startWorker().catch(error => {
  console.error('[Worker Fatal Error]:', error);
  process.exit(1);
});
