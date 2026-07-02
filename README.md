# CRM Backend (Node.js, Express, Sequelize, PostgreSQL & Docker)

Este es un backend robusto y completo para un sistema de **CRM (Customer Relationship Management)**, construido con las mejores prácticas de desarrollo web modernas. El proyecto está diseñado para funcionar de manera local con Docker Compose o conectarse a una base de datos PostgreSQL remota (como Supabase) en producción.

## 🚀 Características Clave

1. **Arquitectura MVC / Componentes**: Organización limpia en controladores, modelos, rutas y middlewares usando módulos de ECMAScript modernos (`import`/`export`).
2. **Seguridad Robusta**:
   - Protección de cabeceras HTTP mediante **Helmet.js**.
   - Habilitación de **CORS** para peticiones externas.
   - Encriptación de contraseñas con **Bcrypt.js** integrada en los ganchos (hooks) del modelo de Sequelize.
   - Autenticación mediante **JWT (JSON Web Tokens)** con tiempo de expiración configurable.
3. **Control de Acceso basado en Roles (RBAC)**:
   - Tres roles integrados: `admin`, `manager`, y `sales_rep`.
   - Lógica de privacidad: Los `sales_rep` solo pueden ver, crear y modificar sus propios leads, compañías, contactos, negocios y tareas asignadas. Los `admin` y `manager` pueden ver todo y reasignar registros.
4. **Módulos del CRM**:
   - **Users & Auth**: Registro, Login, verificación de perfil (/me).
   - **Companies**: Gestión de cuentas de empresas con campos de ingresos anuales, industria y cantidad de empleados.
   - **Contacts**: Personas asociadas a las empresas.
   - **Leads**: Gestión de prospectos con control de origen de lead (referral, website, etc.) y estado.
   - **Deals (Pipeline de Ventas)**: Control de oportunidades comerciales por etapas (Prospecting, Negotiation, etc.) con asignación de probabilidades automática y fecha estimada de cierre.
   - **Activities**: Registro de interacciones como llamadas telefónicas, correos electrónicos, reuniones y notas vinculadas a leads, contactos o negocios.
   - **Tasks**: Tareas y recordatorios de seguimiento con prioridad, fecha de vencimiento y estado.
5. **Conversión Transaccional de Leads (Premium)**:
   - Proceso atómico utilizando transacciones SQL (`sequelize.transaction`). Cuando un lead es calificado (Qualified), el sistema crea automáticamente su Compañía, el Contacto correspondiente y un Deal de venta opcional, migrando todo su historial de actividades y tareas sin perder integridad.
6. **Módulo de Reportes & Analíticas**:
   - Resumen del pipeline de ventas (Embudo de deals y monto total en dólares por etapa).
   - Rendimiento del equipo de ventas (ranking de representantes por monto facturado/ganado).
   - Tasa de conversión de leads (leads calificados vs leads totales).
7. **Documentación Interactiva (Swagger)**:
   - Toda la API está documentada usando la especificación **OpenAPI 3.0** y se sirve mediante **Swagger UI** para que puedas probarla directamente desde el navegador.

---

## 🛠️ Requisitos previos

- **Docker** y **Docker Compose** (recomendado para entorno de desarrollo local).
- **Node.js 18+** (si se desea correr localmente sin contenedores).

---

## ⚙️ Configuración e Instalación

### Opción A: Ejecución con Docker Compose (Recomendado)

Esta opción levantará tanto la base de datos PostgreSQL como la aplicación backend. Se ejecutará el script `init.sql` para pre-poblar la base de datos con datos semilla de forma automática.

1. Asegúrate de tener Docker abierto.
2. Levanta los contenedores ejecutando en tu terminal:
   ```bash
   docker-compose up -d --build
   ```
3. La base de datos estará corriendo en el puerto `5432` y el servidor Express en el puerto `5000`.

### Opción B: Ejecución Local (Node.js en tu máquina)

Si prefieres ejecutar el servidor Node directamente en tu sistema:

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Asegúrate de tener una base de datos PostgreSQL activa y configura las credenciales en un archivo `.env` en la raíz del proyecto (puedes copiar el archivo `.env.example`):
   ```bash
   cp .env.example .env
   ```
3. Ejecuta las migraciones/sincronización y arranca el servidor:
   ```bash
   npm run dev
   ```

---

## 📖 Documentación de la API (Swagger UI)

Una vez que el servidor esté en ejecución, puedes explorar e interactuar de forma gráfica con todos los endpoints de la API (con autenticación, conversión de prospectos y reportes analíticos) desde tu navegador:

🔗 **URL de Swagger UI**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

> [!TIP]
> **Cómo probar endpoints protegidos en Swagger UI**:
> 1. Haz clic en el endpoint `POST /api/auth/login` y presiona *Try it out*.
> 2. Inicia sesión con el usuario semilla (ej: `admin@crm.com` y clave `admin123`) y copia el `token` devuelto en la respuesta.
> 3. Sube al inicio de la página y presiona el botón **Authorize** (botón de candado).
> 4. Pega el token copiado en el campo de texto y haz clic en **Authorize**. Ahora todas las llamadas que realices incluirán la cabecera `Authorization` correcta.

---

## 🧪 Pruebas de Integración y Funcionamiento

El proyecto incluye un script de prueba de extremo a extremo (`test-api.js`) que simula el comportamiento de un cliente consumiendo la API de manera automatizada.

Para correr el script de prueba:
1. Asegúrate de que el servidor esté corriendo en `http://localhost:5000` (ya sea por docker o localmente).
2. Ejecuta:
   ```bash
   node test-api.js
   ```
3. El script realizará de forma secuencial:
   - Verificación de salud de la API (`/health`).
   - Inicio de sesión con el administrador semilla.
   - Creación de una Compañía y su Contacto.
   - Creación de un Lead de prueba.
   - Conversión automática y atómica del Lead a Contacto + Compañía + Negocio en curso.
   - Creación de tareas.
   - Generación y consulta de los reportes analíticos del pipeline, conversión e ingresos.

---

## 📁 Estructura del Código

```
CRM/
├── docker-compose.yml       # Orquestación de contenedores (db, app)
├── Dockerfile               # Configuración del contenedor Node.js
├── init.sql                 # Definición de tablas iniciales e inserciones semilla
├── package.json             # Dependencias del proyecto
├── test-api.js              # Script de prueba e integración automatizada
├── src/
│   ├── app.js               # Express app, middlewares de seguridad (helmet, cors), enrutamiento
│   ├── server.js            # Punto de entrada con retry para la conexión a la base de datos
│   ├── config/
│   │   └── database.js      # Conexión Sequelize con soporte SSL para producción/Supabase
│   ├── middlewares/
│   │   ├── auth.js          # Protección de JWT y control de roles (RBAC)
│   │   └── errorHandler.js  # Formateador centralizado de excepciones (incluyendo validaciones de Sequelize)
│   ├── models/              # Definición de esquemas de Sequelize
│   │   ├── index.js         # Configuración global de relaciones
│   │   ├── User.js
│   │   ├── Company.js
│   │   ├── Contact.js
│   │   ├── Lead.js
│   │   ├── Deal.js
│   │   ├── Activity.js
│   │   └── Task.js
│   ├── controllers/         # Lógica de negocio (CRUDs, conversiones y reportes)
│   └── routes/              # Mapeo de rutas
```

---

## 🛡️ Credenciales Semilla (Seed Users)
Al levantar el proyecto, se habrán creado los siguientes usuarios con contraseñas por defecto para que puedas interactuar de inmediato:

| Nombre | Email | Contraseña | Rol |
|---|---|---|---|
| **Admin User** | `admin@crm.com` | `admin123` | `admin` |
| **Sales Manager** | `manager@crm.com` | `manager123` | `manager` |
| **Sales Rep 1** | `rep1@crm.com` | `sales123` | `sales_rep` |
