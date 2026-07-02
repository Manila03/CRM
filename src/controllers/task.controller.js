import { Task, User } from '../models/index.js';

export const getTasks = async (req, res, next) => {
  try {
    const { status, priority, leadId, contactId, dealId, limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (leadId) whereClause.leadId = leadId;
    if (contactId) whereClause.contactId = contactId;
    if (dealId) whereClause.dealId = dealId;

    // Regla de negocio: Si es sales_rep, solo ve sus tareas asignadas
    if (req.user.role === 'sales_rep') {
      whereClause.assignedToId = req.user.id;
    }

    const { count, rows: tasks } = await Task.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'] }
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['dueDate', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    if (req.user.role === 'sales_rep' && task.assignedToId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para acceder a esta tarea'
      });
    }

    return res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, priority, status, assignedToId, leadId, contactId, dealId } = req.body;

    let finalAssignedToId = assignedToId || req.user.id;
    if (assignedToId && req.user.role === 'sales_rep' && assignedToId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Los representantes de ventas solo pueden asignarse tareas a sí mismos.'
      });
    }

    const task = await Task.create({
      title,
      description,
      dueDate,
      priority,
      status,
      assignedToId: finalAssignedToId,
      leadId: leadId || null,
      contactId: contactId || null,
      dealId: dealId || null
    });

    return res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    if (req.user.role === 'sales_rep' && task.assignedToId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar esta tarea'
      });
    }

    const { title, description, dueDate, priority, status, assignedToId, leadId, contactId, dealId } = req.body;

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (priority) task.priority = priority;
    if (status) task.status = status;
    if (leadId !== undefined) task.leadId = leadId;
    if (contactId !== undefined) task.contactId = contactId;
    if (dealId !== undefined) task.dealId = dealId;

    if (assignedToId !== undefined) {
      if (req.user.role === 'sales_rep' && assignedToId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No puedes reasignar esta tarea a otro usuario.'
        });
      }
      task.assignedToId = assignedToId;
    }

    await task.save();

    return res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }

    if (req.user.role === 'sales_rep' && task.assignedToId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar esta tarea'
      });
    }

    await task.destroy();

    return res.status(200).json({
      success: true,
      message: 'Tarea eliminada correctamente'
    });
  } catch (error) {
    next(error);
  }
};
