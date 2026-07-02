import { Lead, Company, Contact, Deal, User, Activity, Task, sequelize } from '../models/index.js';
import { Op } from 'sequelize';

export const getLeads = async (req, res, next) => {
  try {
    const { status, source, search, limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (status) whereClause.status = status;
    if (source) whereClause.source = source;

    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { companyName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (req.user.role === 'sales_rep') {
      whereClause.ownerId = req.user.id;
    }

    const { count, rows: leads } = await Lead.findAndCountAll({
      where: whereClause,
      include: [
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
      data: leads
    });
  } catch (error) {
    next(error);
  }
};

export const getLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
        { model: Activity, as: 'activities' },
        { model: Task, as: 'tasks' }
      ]
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }

    if (req.user.role === 'sales_rep' && lead.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a este lead'
      });
    }

    return res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

export const createLead = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, companyName, status, source, notes, ownerId } = req.body;

    let finalOwnerId = req.user.id;
    if (ownerId && ['admin', 'manager'].includes(req.user.role)) {
      finalOwnerId = ownerId;
    }

    const lead = await Lead.create({
      firstName,
      lastName,
      email,
      phone,
      companyName,
      status,
      source,
      notes,
      ownerId: finalOwnerId
    });

    return res.status(201).json({
      success: true,
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByPk(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }

    if (req.user.role === 'sales_rep' && lead.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este lead'
      });
    }

    const { firstName, lastName, email, phone, companyName, status, source, notes, ownerId } = req.body;

    if (firstName) lead.firstName = firstName;
    if (lastName) lead.lastName = lastName;
    if (email !== undefined) lead.email = email;
    if (phone !== undefined) lead.phone = phone;
    if (companyName !== undefined) lead.companyName = companyName;
    if (status) lead.status = status;
    if (source) lead.source = source;
    if (notes !== undefined) lead.notes = notes;

    if (ownerId && ['admin', 'manager'].includes(req.user.role)) {
      lead.ownerId = ownerId;
    }

    await lead.save();

    return res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByPk(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }

    if (req.user.role === 'sales_rep' && lead.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este lead'
      });
    }

    await lead.destroy();

    return res.status(200).json({
      success: true,
      message: 'Lead eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Conversión de Lead a Contacto y Compañía (e inicio de Negocio opcional)
export const convertLead = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const lead = await Lead.findByPk(req.params.id);

    if (!lead) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Lead no encontrado'
      });
    }

    if (req.user.role === 'sales_rep' && lead.ownerId !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para convertir este lead'
      });
    }

    if (lead.status === 'qualified') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Este lead ya ha sido calificado y convertido previamente.'
      });
    }

    const { createDeal, dealName, dealAmount, dealExpectedCloseDate } = req.body;

    // 1. Crear Compañía
    const companyName = lead.companyName || `${lead.lastName} Household`;
    const company = await Company.create({
      name: companyName,
      ownerId: lead.ownerId,
      phone: lead.phone
    }, { transaction });

    // 2. Crear Contacto asociado a la Compañía
    const contact = await Contact.create({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      companyId: company.id,
      ownerId: lead.ownerId
    }, { transaction });

    // 3. Crear Deal si se requiere
    let deal = null;
    if (createDeal) {
      deal = await Deal.create({
        name: dealName || `Negocio con ${companyName}`,
        amount: dealAmount || 0.00,
        stage: 'qualification',
        expectedCloseDate: dealExpectedCloseDate || null,
        companyId: company.id,
        contactId: contact.id,
        ownerId: lead.ownerId
      }, { transaction });
    }

    // 4. Mudar actividades y tareas del Lead al nuevo Contacto y/o Compañía
    await Activity.update(
      { contactId: contact.id, leadId: null, dealId: deal ? deal.id : null },
      { where: { leadId: lead.id }, transaction }
    );

    await Task.update(
      { contactId: contact.id, leadId: null, dealId: deal ? deal.id : null },
      { where: { leadId: lead.id }, transaction }
    );

    // 5. Marcar Lead como calificado (Qualified)
    lead.status = 'qualified';
    await lead.save({ transaction });

    // Crear una actividad de registro del proceso de conversión
    await Activity.create({
      type: 'note',
      title: 'Lead Convertido',
      description: `Lead convertido en contacto y compañía. Compañía ID: ${company.id}, Contacto ID: ${contact.id}.${deal ? ` Negocio ID: ${deal.id}` : ''}`,
      contactId: contact.id,
      userId: req.user.id
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Lead calificado y convertido con éxito',
      data: {
        company,
        contact,
        deal
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
