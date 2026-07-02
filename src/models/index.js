import sequelize from '../config/database.js';
import User from './User.js';
import Company from './Company.js';
import Contact from './Contact.js';
import Lead from './Lead.js';
import Deal from './Deal.js';
import Activity from './Activity.js';
import Task from './Task.js';

// --- RELACIONES ---

// User relations
User.hasMany(Company, { foreignKey: 'ownerId', as: 'ownedCompanies', onDelete: 'SET NULL' });
Company.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Contact, { foreignKey: 'ownerId', as: 'ownedContacts', onDelete: 'SET NULL' });
Contact.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Lead, { foreignKey: 'ownerId', as: 'ownedLeads', onDelete: 'SET NULL' });
Lead.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Deal, { foreignKey: 'ownerId', as: 'ownedDeals', onDelete: 'SET NULL' });
Deal.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Activity, { foreignKey: 'userId', as: 'activities', onDelete: 'CASCADE' });
Activity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Task, { foreignKey: 'assignedToId', as: 'assignedTasks', onDelete: 'SET NULL' });
Task.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignedUser' });


// Company relations
Company.hasMany(Contact, { foreignKey: 'companyId', as: 'contacts', onDelete: 'SET NULL' });
Contact.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Company.hasMany(Deal, { foreignKey: 'companyId', as: 'deals', onDelete: 'CASCADE' });
Deal.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });


// Contact relations
Contact.hasMany(Deal, { foreignKey: 'contactId', as: 'deals', onDelete: 'SET NULL' });
Deal.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

Contact.hasMany(Activity, { foreignKey: 'contactId', as: 'activities', onDelete: 'CASCADE' });
Activity.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

Contact.hasMany(Task, { foreignKey: 'contactId', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });


// Lead relations
Lead.hasMany(Activity, { foreignKey: 'leadId', as: 'activities', onDelete: 'CASCADE' });
Activity.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

Lead.hasMany(Task, { foreignKey: 'leadId', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });


// Deal relations
Deal.hasMany(Activity, { foreignKey: 'dealId', as: 'activities', onDelete: 'CASCADE' });
Activity.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });

Deal.hasMany(Task, { foreignKey: 'dealId', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(Deal, { foreignKey: 'dealId', as: 'deal' });

export {
  sequelize,
  User,
  Company,
  Contact,
  Lead,
  Deal,
  Activity,
  Task
};
