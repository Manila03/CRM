import { Deal, Company, Contact, User, Activity, Task } from '../models/index.js';
import { Op } from 'sequelize';

export const getDeals = async (req, res, next) => {
  try {
    const { stage, companyId, search, limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (stage) whereClause.stage = stage;
    if (companyId) whereClause.companyId = companyId;

    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    if (req.user.role === 'sales_rep') {
      whereClause.ownerId = req.user.id;
    }

    const { count, rows: deals } = await Deal.findAndCountAll({
      where: whereClause,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: Contact, as: 'contact', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] }
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
      data: deals
    });
  } catch (error) {
    next(error);
  }
};

export const getDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findByPk(req.params.id, {
      include: [
        { model: Company, as: 'company' },
        { model: Contact, as: 'contact' },
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
        { model: Activity, as: 'activities' },
        { model: Task, as: 'tasks' }
      ]
    });

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Negocio (Deal) no encontrado'
      });
    }

    if (req.user.role === 'sales_rep' && deal.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a este negocio'
      });
    }

    return res.status(200).json({
      success: true,
      data: deal
    });
  } catch (error) {
    next(error);
  }
};

export const createDeal = async (req, res, next) => {
  try {
    const { name, amount, stage, probability, expectedCloseDate, companyId, contactId, ownerId } = req.body;

    // Verificar que la compañía exista
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(400).json({
        success: false,
        message: 'La compañía especificada para el negocio no existe.'
      });
    }

    let finalOwnerId = req.user.id;
    if (ownerId && ['admin', 'manager'].includes(req.user.role)) {
      finalOwnerId = ownerId;
    }

    const deal = await Deal.create({
      name,
      amount,
      stage,
      probability,
      expectedCloseDate,
      companyId,
      contactId,
      ownerId: finalOwnerId
    });

    return res.status(201).json({
      success: true,
      data: deal
    });
  } catch (error) {
    next(error);
  }
};

export const updateDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findByPk(req.params.id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    if (req.user.role === 'sales_rep' && deal.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este negocio'
      });
    }

    const { name, amount, stage, probability, expectedCloseDate, companyId, contactId, ownerId } = req.body;

    if (companyId) {
      const company = await Company.findByPk(companyId);
      if (!company) {
        return res.status(400).json({
          success: false,
          message: 'La compañía especificada no existe.'
        });
      }
      deal.companyId = companyId;
    }

    if (name) deal.name = name;
    if (amount !== undefined) deal.amount = amount;
    if (stage) deal.stage = stage;
    if (probability !== undefined) deal.probability = probability;
    if (expectedCloseDate !== undefined) deal.expectedCloseDate = expectedCloseDate;
    if (contactId !== undefined) deal.contactId = contactId;

    if (ownerId && ['admin', 'manager'].includes(req.user.role)) {
      deal.ownerId = ownerId;
    }

    // Guardar (los hooks de Sequelize manejarán el recalculo de probabilidad si corresponde)
    await deal.save();

    return res.status(200).json({
      success: true,
      data: deal
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findByPk(req.params.id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: 'Negocio no encontrado'
      });
    }

    if (req.user.role === 'sales_rep' && deal.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este negocio'
      });
    }

    await deal.destroy();

    return res.status(200).json({
      success: true,
      message: 'Negocio eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};
