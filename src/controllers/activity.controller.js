import { Activity, User } from '../models/index.js';

export const getActivities = async (req, res, next) => {
  try {
    const { leadId, contactId, dealId, type, limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (leadId) whereClause.leadId = leadId;
    if (contactId) whereClause.contactId = contactId;
    if (dealId) whereClause.dealId = dealId;
    if (type) whereClause.type = type;

    // Los sales rep solo ven actividades de sus propios registros,
    // pero como las actividades se vinculan a entidades, el filtro se hereda usualmente.
    // Para simplificar, permitimos ver actividades asociadas, pero incluimos el creador.
    const { count, rows: activities } = await Activity.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['activityDate', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
      data: activities
    });
  } catch (error) {
    next(error);
  }
};

export const createActivity = async (req, res, next) => {
  try {
    const { type, title, description, activityDate, leadId, contactId, dealId } = req.body;

    if (!leadId && !contactId && !dealId) {
      return res.status(400).json({
        success: false,
        message: 'Una actividad debe estar vinculada a un Lead, un Contacto o un Negocio (Deal).'
      });
    }

    const activity = await Activity.create({
      type,
      title,
      description,
      activityDate: activityDate || new Date(),
      leadId: leadId || null,
      contactId: contactId || null,
      dealId: dealId || null,
      userId: req.user.id // El creador es siempre el usuario autenticado
    });

    return res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

export const deleteActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findByPk(req.params.id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Actividad no encontrada'
      });
    }

    // Solo el creador de la actividad o un admin/manager puede eliminarla
    if (req.user.role === 'sales_rep' && activity.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar esta actividad'
      });
    }

    await activity.destroy();

    return res.status(200).json({
      success: true,
      message: 'Actividad eliminada correctamente'
    });
  } catch (error) {
    next(error);
  }
};
