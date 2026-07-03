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
      const cleanWebsite = comp.website && comp.website.trim() !== '' && comp.website.trim() !== 'S/D' ? comp.website.trim() : null;
      const cleanPhone = comp.phone && comp.phone.trim() !== '' && comp.phone.trim() !== 'S/D' ? comp.phone.trim() : null;

      if (!cleanWebsite && !cleanPhone) {
        console.log(`[Worker] 🚫 DESCARTADA compañía "${comp.name}" por falta de Teléfono y Sitio Web.`);
        channel.ack(msg);
        return;
      }

      // Asignar dueño aleatorio
      const ownerId = userIds[Math.floor(Math.random() * userIds.length)];

      // Simular ingresos y empleados
      const annualRevenue = (Math.random() * 950000 + 50000).toFixed(2);
      const employeesCount = Math.floor(Math.random() * 80) + 3;

      // Persistir en Postgres
      const [company, created] = await Company.findOrCreate({
        where: { name: comp.name },
        defaults: {
          industry: comp.industry || 'Comercio',
          website: cleanWebsite || null,
          phone: cleanPhone || null,
          address: comp.address || 'Argentina',
          annualRevenue,
          employeesCount,
          ownerId
        }
      });

      if (created) {
        console.log(`[Worker] ➕ Insertada nueva compañía: "${company.name}" (ID: ${company.id})`);
      } else {
        // Actualizar datos existentes
        company.phone = cleanPhone || company.phone;
        company.website = cleanWebsite || company.website;
        if (comp.address) company.address = comp.address;
        await company.save();
        console.log(`[Worker] 🔄 Actualizada compañía existente: "${company.name}" (ID: ${company.id})`);
      }

      // Confirmar procesamiento exitoso del mensaje
      channel.ack(msg);

    } catch (parseError) {
      console.error('[Worker] ❌ Error de procesamiento del mensaje. Formato no válido:', companyDataStr);
      console.error(parseError.message);
      // Rechazar mensaje mal formateado para que no vuelva a la cola (no requeue)
      channel.reject(msg, false);
    }
  }, { noAck: false });
};

startWorker().catch(error => {
  console.error('[Worker Fatal Error]:', error);
  process.exit(1);
});
