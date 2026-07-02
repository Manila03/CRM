/**
 * Script de prueba de integración para la API del CRM.
 * Requiere que el servidor CRM esté ejecutándose en http://localhost:5000.
 * Corre con: node test-api.js
 */

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== INICIANDO PRUEBAS DE INTEGRACIÓN DEL CRM ===\n');

  let token = '';
  let adminUser = null;
  let companyId = null;
  let contactId = null;
  let leadId = null;

  // 1. Salud del sistema (Healthcheck)
  try {
    const healthRes = await fetch('http://localhost:5000/health');
    const healthData = await healthRes.json();
    console.log('✔ Salud del Servidor:', healthRes.status, healthData);
    if (!healthData.success) throw new Error('Servidor no saludable');
  } catch (error) {
    console.error('❌ Error conectando al servidor. Asegúrate de iniciar docker-compose up o npm start.', error.message);
    return;
  }

  // 2. Iniciar Sesión (Login de Admin sembrado en init.sql)
  try {
    console.log('\n--- Probando Autenticación (Login) ---');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@crm.com',
        password: 'admin123'
      })
    });
    const loginData = await loginRes.json();
    
    if (loginRes.ok && loginData.success) {
      token = loginData.token;
      adminUser = loginData.data;
      console.log('✔ Login Exitoso. Token recibido.');
      console.log('Usuario:', adminUser.name, '| Rol:', adminUser.role);
    } else {
      console.error('❌ Error de Login:', loginData);
      return;
    }
  } catch (error) {
    console.error('❌ Falló la petición de Login:', error);
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 3. Obtener Datos del Perfil (/auth/me)
  try {
    console.log('\n--- Probando Perfil (/auth/me) ---');
    const meRes = await fetch(`${API_URL}/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    console.log('✔ Perfil obtenido:', meData.success ? 'OK' : 'ERROR', meData.data?.name);
  } catch (error) {
    console.error('❌ Error obteniendo perfil:', error);
  }

  // 4. Listar Compañías
  try {
    console.log('\n--- Probando Obtención de Compañías (Listar) ---');
    const compRes = await fetch(`${API_URL}/companies`, { headers: authHeaders });
    const compData = await compRes.json();
    console.log(`✔ Compañías encontradas: ${compData.count}`);
    console.log('Compañías iniciales:', compData.data.map(c => c.name));
  } catch (error) {
    console.error('❌ Error listando compañías:', error);
  }

  // 5. Crear Compañía
  try {
    console.log('\n--- Probando Creación de Compañía ---');
    const createCompRes = await fetch(`${API_URL}/companies`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Stark Industries',
        industry: 'Defense & Tech',
        website: 'https://starkindustries.com',
        phone: '+1-555-3000',
        address: 'Malibu Cliffside 10880',
        annualRevenue: 500000000.00,
        employeesCount: 1500
      })
    });
    const createCompData = await createCompRes.json();
    if (createCompRes.ok && createCompData.success) {
      companyId = createCompData.data.id;
      console.log('✔ Compañía creada con éxito. ID:', companyId, '| Nombre:', createCompData.data.name);
    } else {
      console.error('❌ Error creando compañía:', createCompData);
    }
  } catch (error) {
    console.error('❌ Error en creación de compañía:', error);
  }

  // 6. Crear Contacto asociado a Stark Industries
  if (companyId) {
    try {
      console.log('\n--- Probando Creación de Contacto ---');
      const createContactRes = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          firstName: 'Pepper',
          lastName: 'Potts',
          email: 'pepper.potts@starkindustries.com',
          phone: '+1-555-3001',
          jobTitle: 'CEO',
          companyId: companyId
        })
      });
      const createContactData = await createContactRes.json();
      if (createContactRes.ok && createContactData.success) {
        contactId = createContactData.data.id;
        console.log('✔ Contacto creado con éxito. ID:', contactId, '| Nombre:', createContactData.data.firstName, createContactData.data.lastName);
      } else {
        console.error('❌ Error creando contacto:', createContactData);
      }
    } catch (error) {
      console.error('❌ Error en creación de contacto:', error);
    }
  }

  // 7. Crear un Lead
  try {
    console.log('\n--- Probando Creación de Lead ---');
    const createLeadRes = await fetch(`${API_URL}/leads`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        firstName: 'Peter',
        lastName: 'Parker',
        email: 'spidey@dailybugle.com',
        phone: '+1-555-8888',
        companyName: 'Parker Photography',
        source: 'website',
        notes: 'Interesado en soporte técnico para laboratorios escolares.'
      })
    });
    const createLeadData = await createLeadRes.json();
    if (createLeadRes.ok && createLeadData.success) {
      leadId = createLeadData.data.id;
      console.log('✔ Lead creado con éxito. ID:', leadId, '| Nombre:', createLeadData.data.firstName, createLeadData.data.lastName);
    } else {
      console.error('❌ Error creando Lead:', createLeadData);
    }
  } catch (error) {
    console.error('❌ Error creando Lead:', error);
  }

  // 8. Convertir el Lead (Proceso Transaccional Premium)
  if (leadId) {
    try {
      console.log('\n--- Probando Conversión del Lead (Lead -> Contacto + Compañía + Negocio) ---');
      const convertRes = await fetch(`${API_URL}/leads/${leadId}/convert`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          createDeal: true,
          dealName: 'Laboratories Tech Sponsorship',
          dealAmount: 25000.00,
          dealExpectedCloseDate: '2026-12-31'
        })
      });
      const convertData = await convertRes.json();
      if (convertRes.ok && convertData.success) {
        console.log('✔ Lead convertido con éxito!');
        console.log('  Nueva Compañía:', convertData.data.company.name, `(ID: ${convertData.data.company.id})`);
        console.log('  Nuevo Contacto:', convertData.data.contact.first_name || convertData.data.contact.firstName, `(ID: ${convertData.data.contact.id})`);
        console.log('  Nuevo Negocio:', convertData.data.deal.name, `(ID: ${convertData.data.deal.id}, Monto: $${convertData.data.deal.amount})`);
      } else {
        console.error('❌ Error al convertir lead:', convertData);
      }
    } catch (error) {
      console.error('❌ Error en transacción de conversión:', error);
    }
  }

  // 9. Crear Tarea de Seguimiento
  try {
    console.log('\n--- Probando Creación de Tarea ---');
    const createTaskRes = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Enviar Contrato Stark Industries',
        description: 'Pepper Potts espera el NDA inicial por correo.',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString() // 3 días
      })
    });
    const createTaskData = await createTaskRes.json();
    console.log('✔ Tarea creada:', createTaskData.success ? 'OK' : 'ERROR', createTaskData.data?.title);
  } catch (error) {
    console.error('❌ Error creando tarea:', error);
  }

  // 10. Probar Reportes y Analíticas
  try {
    console.log('\n--- Probando Generación de Reportes ---');
    const report1 = await fetch(`${API_URL}/reports/pipeline`, { headers: authHeaders });
    const r1Data = await report1.json();
    console.log('✔ Reporte Pipeline (Deals):', r1Data.success ? 'OK' : 'ERROR', `Fases analizadas: ${r1Data.data?.length}`);

    const report2 = await fetch(`${API_URL}/reports/leads`, { headers: authHeaders });
    const r2Data = await report2.json();
    console.log('✔ Reporte Leads (Conversión):', r2Data.success ? 'OK' : 'ERROR', `Tasa de conversión: ${r2Data.data?.conversionRatePercent}%`);

    const report3 = await fetch(`${API_URL}/reports/sales`, { headers: authHeaders });
    const r3Data = await report3.json();
    console.log('✔ Reporte Ventas por Vendedor:', r3Data.success ? 'OK' : 'ERROR', `Vendedores ganadores: ${r3Data.data?.length}`);
  } catch (error) {
    console.error('❌ Error generando reportes:', error);
  }

  console.log('\n=== PRUEBAS FINALIZADAS ===');
}

runTests();
