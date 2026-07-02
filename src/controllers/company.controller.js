import { Company, User, Contact, Deal } from '../models/index.js';
import { Op } from 'sequelize';

export const getCompanies = async (req, res, next) => {
  try {
    const { industry, search, limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (industry) {
      whereClause.industry = industry;
    }

    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    // Regla de negocio: Si el rol es sales_rep, solo ve sus propias compañías asignadas.
    // Admins y Managers pueden ver todas.
    if (req.user.role === 'sales_rep') {
      whereClause.ownerId = req.user.id;
    }

    const { count, rows: companies } = await Company.findAndCountAll({
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
      data: companies
    });
  } catch (error) {
    next(error);
  }
};

export const getCompany = async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'name', 'email'] },
        { model: Contact, as: 'contacts' },
        { model: Deal, as: 'deals' }
      ]
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Compañía no encontrada'
      });
    }

    // Regla de negocio: El sales_rep solo accede a sus registros
    if (req.user.role === 'sales_rep' && company.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a esta compañía'
      });
    }

    return res.status(200).json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
};

export const createCompany = async (req, res, next) => {
  try {
    const { name, industry, website, phone, address, annualRevenue, employeesCount, ownerId } = req.body;

    // Por defecto, el owner es el usuario que crea, a menos que un admin/manager asigne otro
    let finalOwnerId = req.user.id;
    if (ownerId && ['admin', 'manager'].includes(req.user.role)) {
      finalOwnerId = ownerId;
    }

    const company = await Company.create({
      name,
      industry,
      website,
      phone,
      address,
      annualRevenue,
      employeesCount,
      ownerId: finalOwnerId
    });

    return res.status(201).json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Compañía no encontrada'
      });
    }

    // Control de acceso
    if (req.user.role === 'sales_rep' && company.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar esta compañía'
      });
    }

    const { name, industry, website, phone, address, annualRevenue, employeesCount, ownerId } = req.body;

    if (name) company.name = name;
    if (industry !== undefined) company.industry = industry;
    if (website !== undefined) company.website = website;
    if (phone !== undefined) company.phone = phone;
    if (address !== undefined) company.address = address;
    if (annualRevenue !== undefined) company.annualRevenue = annualRevenue;
    if (employeesCount !== undefined) company.employeesCount = employeesCount;

    // Cambiar de dueño solo permitido a admin/manager
    if (ownerId && ['admin', 'manager'].includes(req.user.role)) {
      company.ownerId = ownerId;
    }

    await company.save();

    return res.status(200).json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Compañía no encontrada'
      });
    }

    // Control de acceso: solo el owner, managers o admins pueden borrar
    if (req.user.role === 'sales_rep' && company.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar esta compañía'
      });
    }

    await company.destroy();

    return res.status(200).json({
      success: true,
      message: 'Compañía eliminada correctamente'
    });
  } catch (error) {
    next(error);
  }
};
