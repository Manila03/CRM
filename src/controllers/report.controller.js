import { Deal, Lead, User, sequelize } from '../models/index.js';

// Reporte 1: Estado del Pipeline de Ventas (Agrupado por Etapa)
export const getPipelineSummary = async (req, res, next) => {
  try {
    // Si el usuario es representante, solo ve su pipeline. Admin/Manager ven todo.
    const whereClause = {};
    if (req.user.role === 'sales_rep') {
      whereClause.ownerId = req.user.id;
    }

    const summary = await Deal.findAll({
      where: whereClause,
      attributes: [
        'stage',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
      ],
      group: ['stage'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

// Reporte 2: Rendimiento de Ventas por Representante (Monto total ganado)
export const getSalesPerformance = async (req, res, next) => {
  try {
    // Solo managers y admins deberían ver el rendimiento de todos los representantes.
    // Si un sales_rep accede, solo verá su propio rendimiento.
    const whereClause = { stage: 'closed_won' };
    if (req.user.role === 'sales_rep') {
      whereClause.ownerId = req.user.id;
    }

    const performance = await Deal.findAll({
      where: whereClause,
      attributes: [
        'ownerId',
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalWonAmount'],
        [sequelize.fn('COUNT', sequelize.col('Deal.id')), 'dealsWonCount']
      ],
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }
      ],
      group: ['ownerId', 'owner.id', 'owner.name', 'owner.email'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: performance
    });
  } catch (error) {
    next(error);
  }
};

// Reporte 3: Tasa de Conversión de Leads (Calificados vs Totales)
export const getLeadConversionReport = async (req, res, next) => {
  try {
    const whereClause = {};
    if (req.user.role === 'sales_rep') {
      whereClause.ownerId = req.user.id;
    }

    // Contamos leads agrupados por estado
    const statusCounts = await Lead.findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    let totalLeads = 0;
    let qualifiedLeads = 0;
    const details = {};

    statusCounts.forEach(item => {
      const status = item.getDataValue('status');
      const count = parseInt(item.getDataValue('count'), 10);
      totalLeads += count;
      details[status] = count;
      if (status === 'qualified') {
        qualifiedLeads = count;
      }
    });

    const conversionRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(2) : "0.00";

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        qualifiedLeads,
        conversionRatePercent: parseFloat(conversionRate),
        details
      }
    });
  } catch (error) {
    next(error);
  }
};
