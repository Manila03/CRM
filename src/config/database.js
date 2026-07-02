import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'crm_db',
  process.env.DB_USER || 'crm_user',
  process.env.DB_PASSWORD || 'crm_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[Sequelize] ${msg}`) : false,
    define: {
      underscored: true, // Convierte camelCase a snake_case en la DB
      timestamps: true,
    },
    // Añadimos configuración de SSL para cuando se use Supabase en producción
    dialectOptions: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {},
  }
);

export default sequelize;
