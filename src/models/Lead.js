import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Lead extends Model {
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

Lead.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'first_name',
    validate: {
      notEmpty: true,
    },
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'last_name',
    validate: {
      notEmpty: true,
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'company_name',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'new',
    validate: {
      isIn: [['new', 'contacted', 'qualified', 'unqualified', 'lost']],
    },
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'other',
    validate: {
      isIn: [['website', 'referral', 'cold_call', 'advertising', 'other']],
    },
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'owner_id',
  },
}, {
  sequelize,
  modelName: 'Lead',
  tableName: 'leads',
});

export default Lead;
