import app from './app.js';
import { sequelize } from './models/index.js';

const PORT = process.env.PORT || 5000;

// Reintentar conexión a la base de datos (útil cuando se inicializa Docker Compose)
const connectWithRetry = async (retries = 5, delay = 5000) => {
  while (retries > 0) {
    try {
      console.log('Intentando conectar a la base de datos PostgreSQL...');
      await sequelize.authenticate();
      console.log('Conexión a la base de datos establecida con éxito.');

      // Sincronizar modelos con la base de datos sin borrar datos existentes (alter: false, force: false)
      // Como usamos init.sql para la BD local, las tablas ya estarán creadas
      await sequelize.sync();
      console.log('Sincronización de Sequelize completada.');
      return;
    } catch (err) {
      console.error(`Error al conectar a la base de datos. Intentos restantes: ${retries - 1}`);
      console.error(err.message);
      retries -= 1;
      if (retries === 0) {
        console.error('No se pudo conectar a la base de datos después de múltiples intentos. Saliendo...');
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

const startServer = async () => {
  // await connectWithRetry();

  app.listen(PORT, () => {
    console.log(`Servidor CRM iniciado en puerto ${PORT} en modo ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();
