import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'company_queue';

let connection = null;
let channel = null;

export const connectRabbitMQ = async (retries = 5, delay = 5000) => {
  if (channel) return { connection, channel };

  while (retries > 0) {
    try {
      console.log(`Intentando conectar a RabbitMQ en: ${RABBITMQ_URL}...`);
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      
      // Asegurar que la cola de procesamiento de compañías exista y sea duradera
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      
      console.log(`✔ Conectado a RabbitMQ. Cola '${QUEUE_NAME}' inicializada.`);
      
      // Manejar cierres inesperados de conexión
      connection.on('error', (err) => {
        console.error('[RabbitMQ Connection Error]:', err.message);
        channel = null;
      });
      
      connection.on('close', () => {
        console.log('[RabbitMQ Connection Closed]');
        channel = null;
      });

      return { connection, channel };
    } catch (error) {
      console.error(`⚠ Error conectando a RabbitMQ. Intentos restantes: ${retries - 1}`);
      console.error(error.message);
      retries -= 1;
      if (retries === 0) {
        console.error('❌ No se pudo conectar a RabbitMQ después de múltiples intentos. Saliendo...');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const getChannel = () => channel;
export const getQueueName = () => QUEUE_NAME;
export { connection };
