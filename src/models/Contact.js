import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Contact extends Model {
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

Contact.init({
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
  jobTitle: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'job_title',
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'company_id',
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'owner_id',
  },
}, {
  sequelize,
  modelName: 'Contact',
  tableName: 'contacts',
});

export default Contact;
