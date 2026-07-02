import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'crm_super_secret_key_12345',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
    }

    // Seguridad de Roles: Solo admins o managers pueden crear usuarios con roles admin o manager
    let finalRole = 'sales_rep';
    if (role && ['admin', 'manager'].includes(role)) {
      // Si hay un usuario logueado que hace la request y es admin o manager, se le permite el rol
      if (req.user && ['admin', 'manager'].includes(req.user.role)) {
        finalRole = role;
      } else {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para crear un usuario con privilegios elevados (admin o manager).'
        });
      }
    } else if (role === 'sales_rep') {
      finalRole = 'sales_rep';
    }

    const user = await User.create({
      name,
      email,
      password,
      role: finalRole
    });

    const token = generateToken(user.id);

    return res.status(201).json({
      success: true,
      token,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, proporcione un correo y contraseña'
      });
    }

    // Buscar usuario
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas (usuario no encontrado)'
      });
    }

    // Verificar contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas (contraseña incorrecta)'
      });
    }

    const token = generateToken(user.id);

    return res.status(200).json({
      success: true,
      token,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt']
    });

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
