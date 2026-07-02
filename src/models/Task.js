import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Task extends Model {}

Task.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
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
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'due_date',
  },
  priority: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'medium',
    validate: {
      isIn: [['low', 'medium', 'high']],
    },
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'in_progress', 'completed']],
    },
  },
  assignedToId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'assigned_to_id',
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
}, {
  sequelize,
  modelName: 'Task',
  tableName: 'tasks',
});

export default Task;
