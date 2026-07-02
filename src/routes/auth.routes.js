import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

// Middleware de autenticación opcional para permitir registro público (por defecto sales_rep) 
// y registro autenticado si un administrador desea crear usuarios con roles elevados.
const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
};

router.post('/register', optionalProtect, register);
router.post('/login', login);
router.get('/me', protect, getMe);

export default router;
