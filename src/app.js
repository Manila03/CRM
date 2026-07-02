import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';

// Importación de Middleware
import { errorHandler } from './middlewares/errorHandler.js';

// Importación de Rutas
import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/company.routes.js';
import contactRoutes from './routes/contact.routes.js';
import leadRoutes from './routes/lead.routes.js';
import dealRoutes from './routes/deal.routes.js';
import activityRoutes from './routes/activity.routes.js';
import taskRoutes from './routes/task.routes.js';
import reportRoutes from './routes/report.routes.js';

// Importación de la conexión a la Base de Datos para salud
import sequelize from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, './swagger.json'), 'utf8')
);

dotenv.config();

const app = express();

// --- MEDIDAS DE SEGURIDAD Y CONFIGURACIÓN ---
// Helmet ayuda a proteger la aplicación Express. Deshabilitamos CSP para que Swagger UI cargue sus estilos correctamente.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS habilitado para solicitudes de dominios externos
app.use(cors());

// Registro de peticiones HTTP en consola en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Analizar cuerpo JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ENRUTAMIENTO ---

// Documentación de la API (Swagger UI)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);

// Endpoint de verificación de salud (Health check)
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    return res.status(200).json({
      success: true,
      status: 'healthy',
      database: 'connected',
      timestamp: new Date()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Ruta no encontrada (404)
app.use((req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Manejador Global de Errores
app.use(errorHandler);

export default app;
