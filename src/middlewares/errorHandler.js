export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let errors = [];

  // Capturar errores de validación de Sequelize
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'Error de validación de datos';
    errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Capturar errores de conversión de tipos de datos en la base de datos
  if (err.name === 'SequelizeDatabaseError' && err.message.includes('invalid input syntax')) {
    statusCode = 400;
    message = 'Sintaxis de entrada no válida para el tipo de datos esperado';
  }

  // Error de clave foránea en Sequelize (Foreign Key Constraint)
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Error de integridad referencial. El registro asociado no existe o está en uso.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
