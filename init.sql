-- Creamos las tablas iniciales para el CRM

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'sales_rep', -- admin, manager, sales_rep
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Compañías
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    phone VARCHAR(50),
    address VARCHAR(255),
    annual_revenue NUMERIC(15, 2) DEFAULT 0.00,
    employees_count INT DEFAULT 0,
    owner_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Contactos
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    job_title VARCHAR(100),
    company_id INT REFERENCES companies(id) ON DELETE SET NULL,
    owner_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Leads
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company_name VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'new', -- new, contacted, qualified, unqualified, lost
    source VARCHAR(50) NOT NULL DEFAULT 'other', -- website, referral, cold_call, advertising, other
    notes TEXT,
    owner_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Negocios (Deals)
CREATE TABLE IF NOT EXISTS deals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    stage VARCHAR(50) NOT NULL DEFAULT 'prospecting', -- prospecting, qualification, proposal, negotiation, closed_won, closed_lost
    probability INT NOT NULL DEFAULT 10, -- porcentaje de éxito estimado
    expected_close_date DATE,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    contact_id INT REFERENCES contacts(id) ON DELETE SET NULL,
    owner_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Actividades (Interacciones)
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- call, email, meeting, note
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lead_id INT REFERENCES leads(id) ON DELETE CASCADE,
    contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id INT REFERENCES deals(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de Tareas
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority VARCHAR(50) NOT NULL DEFAULT 'medium', -- low, medium, high
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
    assigned_to_id INT REFERENCES users(id) ON DELETE SET NULL,
    lead_id INT REFERENCES leads(id) ON DELETE CASCADE,
    contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id INT REFERENCES deals(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejorar rendimiento de búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);

-- Datos Semilla (Seed Data)
-- Las contraseñas son "admin123", "manager123" y "sales123" encriptadas con bcrypt (cost 10)
-- admin123 -> $2a$10$nL4KX1fvUo.zz5Lpyr2Rk.ZdUcmJug.Gma9ZUVpu3QvJualUqHUqu
-- manager123 -> $2a$10$GftDhJeCL9F7CwAJN68RR.NdGF8..t2yHG57dp8f28nSws9dCtzOq
-- sales123 -> $2a$10$L/dK6t3S5gGaRvy7A5nFwO0ptz2Z1Rq1Q9TafhNy5nonDENV4xObO
INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES
('Admin User', 'admin@crm.com', '$2a$10$nL4KX1fvUo.zz5Lpyr2Rk.ZdUcmJug.Gma9ZUVpu3QvJualUqHUqu', 'admin', NOW(), NOW()),
('Sales Manager', 'manager@crm.com', '$2a$10$GftDhJeCL9F7CwAJN68RR.NdGF8..t2yHG57dp8f28nSws9dCtzOq', 'manager', NOW(), NOW()),
('Sales Rep 1', 'rep1@crm.com', '$2a$10$L/dK6t3S5gGaRvy7A5nFwO0ptz2Z1Rq1Q9TafhNy5nonDENV4xObO', 'sales_rep', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insertar Compañías de prueba
INSERT INTO companies (name, industry, website, phone, address, annual_revenue, employees_count, owner_id, created_at, updated_at) VALUES
('Acme Corporation', 'Technology', 'https://acme.com', '+1-555-0100', '123 Enterprise Way, Silicon Valley', 1500000.00, 120, 3, NOW(), NOW()),
('Globex Biotech', 'Healthcare', 'https://globexbio.com', '+1-555-0200', '456 Innovation Blvd, Boston', 3200000.00, 250, 3, NOW(), NOW()),
('Initech LLC', 'Finance', 'https://initech.com', '+1-555-0300', '789 Paper St, Austin', 450000.00, 45, 3, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insertar Contactos de prueba
INSERT INTO contacts (first_name, last_name, email, phone, job_title, company_id, owner_id, created_at, updated_at) VALUES
('John', 'Doe', 'john.doe@acme.com', '+1-555-0101', 'IT Director', 1, 3, NOW(), NOW()),
('Alice', 'Smith', 'alice.smith@globexbio.com', '+1-555-0202', 'VP of Procurement', 2, 3, NOW(), NOW()),
('Peter', 'Gibbons', 'peter.gibbons@initech.com', '+1-555-0303', 'Lead Developer', 3, 3, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insertar Leads de prueba
INSERT INTO leads (first_name, last_name, email, phone, company_name, status, source, notes, owner_id, created_at, updated_at) VALUES
('Bruce', 'Wayne', 'bwayne@wayneenterprises.com', '+1-555-0099', 'Wayne Enterprises', 'new', 'website', 'Interesado en software de seguridad corporativa.', 3, NOW(), NOW()),
('Clark', 'Kent', 'ckent@dailyplanet.com', '+1-555-0088', 'Daily Planet', 'contacted', 'referral', 'Necesita herramientas de colaboración para redactores.', 3, NOW(), NOW()),
('Diana', 'Prince', 'diana@themiscira.org', '+1-555-0077', 'Themyscira Museum', 'qualified', 'cold_call', 'Buscando digitalizar la base de datos de artefactos.', 2, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insertar Negocios (Deals) de prueba
INSERT INTO deals (name, amount, stage, probability, expected_close_date, company_id, contact_id, owner_id, created_at, updated_at) VALUES
('Acme Cloud Migration', 45000.00, 'proposal', 60, NOW() + INTERVAL '30 days', 1, 1, 3, NOW(), NOW()),
('Globex Equipment Upgrade', 120000.00, 'negotiation', 80, NOW() + INTERVAL '15 days', 2, 2, 3, NOW(), NOW()),
('Initech Audit Tooling', 15000.00, 'qualification', 30, NOW() + INTERVAL '60 days', 3, 3, 3, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insertar Tareas de prueba
INSERT INTO tasks (title, description, due_date, priority, status, assigned_to_id, lead_id, contact_id, deal_id, created_at, updated_at) VALUES
('Llamar a Bruce Wayne', 'Seguimiento tras su registro en el sitio web.', NOW() + INTERVAL '1 day', 'high', 'pending', 3, 1, NULL, NULL, NOW(), NOW()),
('Enviar propuesta a Acme', 'Enviar el PDF consolidado con los precios de migración.', NOW() + INTERVAL '2 days', 'medium', 'pending', 3, NULL, 1, 1, NOW(), NOW()),
('Reunión de negociación Globex', 'Reunión presencial/virtual para cerrar términos contractuales.', NOW() - INTERVAL '1 hour', 'high', 'in_progress', 3, NULL, 2, 2, NOW(), NOW())
ON CONFLICT DO NOTHING;
