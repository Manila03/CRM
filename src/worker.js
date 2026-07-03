import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

function cleanEmojisAndEmoticons(text) {
  if (!text) return text;

  const cleaned = text.replace(/[^\p{L}\p{N}\s.,\-\/()°#''"']/gu, '');

  return cleaned.replace(/\s+/g, ' ').trim();
}

function cleanPhone(text) {
  if (!text) return text;
  return text.replace(/[^\d+\-\s]/g, '');
}

function generateOsmId(name, address) {
  const str = `${name}_${address || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function parseAddressTags(address) {
  const tags = [];
  if (!address) return tags;

  tags.push({ k: 'addr:full', v: address });

  const parts = address.split(',').map(p => p.trim());
  if (parts.length > 0) {
    const streetPart = parts[0];
    const match = streetPart.match(/^(.*?)\s+(\d+)$/);
    if (match) {
      tags.push({ k: 'addr:street', v: match[1].trim() });
      tags.push({ k: 'addr:housenumber', v: match[2].trim() });
    } else {
      tags.push({ k: 'addr:street', v: streetPart });
    }
  }

  if (parts.length > 1) {
    tags.push({ k: 'addr:city', v: parts[1] });
  }

  tags.push({ k: 'addr:country', v: 'AR' });

  return tags;
}

export async function ingestCompany(comp) {
  comp.phone = cleanPhone(comp.phone);
  comp.address = cleanEmojisAndEmoticons(comp.address);

  const sanitizedWebsite = comp.website && comp.website.trim() !== '' && comp.website.trim() !== 'S/D' ? comp.website.trim() : null;
  const sanitizedPhone = comp.phone && comp.phone.trim() !== '' && comp.phone.trim() !== 'S/D' ? comp.phone.trim() : null;

  if (!sanitizedWebsite && !sanitizedPhone) {
    return { ok: false, discarded: true, reason: 'missing_contact' };
  }

  const ownerId = 1;
  const annualRevenue = (Math.random() * 950000 + 50000).toFixed(2);
  const employeesCount = Math.floor(Math.random() * 80) + 3;
  const osmId = generateOsmId(comp.name, comp.address);

  const tags = [
    { k: 'name', v: comp.name },
    { k: 'name:es', v: comp.name },
    { k: 'amenity', v: comp.industry || 'Comercio' },
    { k: 'phone', v: sanitizedPhone || '' },
    { k: 'website', v: sanitizedWebsite || '' }
  ];

  tags.push(...parseAddressTags(comp.address));
  tags.push({ k: 'annual_revenue', v: String(annualRevenue) });
  tags.push({ k: 'employees_count', v: String(employeesCount) });
  tags.push({ k: 'crm_owner_id', v: String(ownerId) });
  if (comp.gmapsUrl) {
    tags.push({ k: 'gmaps_url', v: comp.gmapsUrl });
  }

  const apiPayload = {
    nodes: [
      {
        id: osmId,
        type: 'node',
        lat: (comp.lat !== undefined && comp.lat !== null) ? comp.lat : null,
        lon: (comp.lon !== undefined && comp.lon !== null) ? comp.lon : null,
        tags
      }
    ]
  };

  const ingestSecret = process.env.INGEST_SECRET;
  if (!ingestSecret) {
    console.warn('[Worker] ⚠ ADVERTENCIA: La variable INGEST_SECRET no está definida en el entorno.');
  }

  const response = await fetch('https://hayquehacerplatita.lovable.app/api/public/ingest/businesses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ingest-secret': ingestSecret || ''
    },
    body: JSON.stringify(apiPayload)
  });

  const resStatus = response.status;
  const resText = await response.text();

  if (response.ok) {
    return { ok: true, status: resStatus, response: resText };
  }

  return {
    ok: false,
    status: resStatus,
    response: resText,
    retryable: !(resStatus >= 400 && resStatus < 500)
  };
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  console.log('El worker ahora se ejecuta integrado en populate-db.js (sin RabbitMQ).');
  console.log('Ejecutá: npm run populate');
  process.exit(0);
}
