import { Contact, Company, User, Activity, Task } from '../models/index.js';
import { Op } from 'sequelize';

export const getContacts = async (req, res, next) => {
  try {
    const { companyId, search, limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (companyId) {
      whereClause.companyId = companyId;
    }

    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Regla de negocio: Si es sales_rep, solo ve sus propios contactos
    if (req.user.role === 'sales_rep') {
      whereClause.ownerId = req.user.id;
    }

    const { count, rows: contacts } = await Contact.findAndCountAll({
      where: whereClause,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
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
      data: contacts
    });
  } catch (error) {
    next(error);
  }
};

export const getContact = async (req, res, next) => {
  try {
    const contact = await Contact.findByPk(req.params.id, {
      include: [
        { model: Company, as: 'company' },
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
        { model: Activity, as: 'activities' },
        { model: Task, as: 'tasks' }
      ]
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    // Regla de negocio: El sales_rep solo accede a sus propios registros
    if (req.user.role === 'sales_rep' && contact.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a este contacto'
      });
    }

    return res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    next(error);
  }
};

export const createContact = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, jobTitle, companyId, ownerId } = req.body;

    let finalOwnerId = req.user.id;
    if (ownerId && ['admin', 'manager'].includes(req.user.role)) {
      finalOwnerId = ownerId;
    }

    const contact = await Contact.create({
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      companyId,
      ownerId: finalOwnerId
    });

    return res.status(201).json({
      success: true,
      data: contact
    });
  } catch (error) {
    next(error);
  }
};

export const updateContact = async (req, res, next) => {
  try {
    const contact = await Contact.findByPk(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    // Control de acceso
    if (req.user.role === 'sales_rep' && contact.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este contacto'
      });
    }

    const { firstName, lastName, email, phone, jobTitle, companyId, ownerId } = req.body;

    if (firstName) contact.firstName = firstName;
    if (lastName) contact.lastName = lastName;
    if (email !== undefined) contact.email = email;
    if (phone !== undefined) contact.phone = phone;
    if (jobTitle !== undefined) contact.jobTitle = jobTitle;
    if (companyId !== undefined) contact.companyId = companyId;

    if (ownerId && ['admin', 'manager'].includes(req.user.role)) {
      contact.ownerId = ownerId;
    }

    await contact.save();

    return res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    next(error);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findByPk(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contacto no encontrado'
      });
    }

    // Control de acceso
    if (req.user.role === 'sales_rep' && contact.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este contacto'
      });
    }

    await contact.destroy();

    return res.status(200).json({
      success: true,
      message: 'Contacto eliminado correctamente'
    });
  } catch (error) {
    next(error);
  }
};
