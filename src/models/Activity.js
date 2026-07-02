import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Activity extends Model {}

Activity.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['call', 'email', 'meeting', 'note']],
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  activityDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'activity_date',
  },
  leadId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'lead_id',
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'contact_id',
  },
  dealId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'deal_id',
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
  },
}, {
  sequelize,
  modelName: 'Activity',
  tableName: 'activities',
});

export default Activity;
