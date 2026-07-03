import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const useSsl = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true';
const commonOptions = {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? (msg) => console.log(`[Sequelize] ${msg}`) : false,
  define: {
    underscored: true,
    timestamps: true,
  },
  dialectOptions: useSsl ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {},
};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, commonOptions)
  : new Sequelize(
    process.env.DB_NAME || 'crm_db',
    process.env.DB_USER || 'crm_user',
    process.env.DB_PASSWORD || 'crm_password',
    {
      ...commonOptions,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    }
  );

export default sequelize;
