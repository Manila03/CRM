import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Deal extends Model {}

const stageProbabilities = {
  prospecting: 10,
  qualification: 30,
  proposal: 60,
  negotiation: 80,
  closed_won: 100,
  closed_lost: 0,
};

Deal.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  stage: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'prospecting',
    validate: {
      isIn: [['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']],
    },
  },
  probability: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
    validate: {
      min: 0,
      max: 100,
    },
  },
  expectedCloseDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'expected_close_date',
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'contact_id',
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'owner_id',
  },
}, {
  sequelize,
  modelName: 'Deal',
  tableName: 'deals',
  hooks: {
    beforeSave: (deal) => {
      // Si el usuario cambia la etapa pero no la probabilidad, ajustarla por defecto
      if (deal.changed('stage') && !deal.changed('probability')) {
        deal.probability = stageProbabilities[deal.stage] !== undefined ? stageProbabilities[deal.stage] : 10;
      }
    },
  },
});

export default Deal;
export { stageProbabilities };
