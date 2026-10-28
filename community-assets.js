import { put, list } from '@vercel/blob';

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const CATEGORIES = new Set(['meme', 'cinematic', 'gaming', 'transition', 'ambient']);
const EFFECTS = new Set(['glitch', 'neon', 'shake', 'sparkle', 'flash', 'zoom']);
const AUDIO_MIMES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave',
  'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/webm', 'audio/flac',
  'audio/x-m4a', 'application/ogg', 'application/octet-stream'
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}
function clean(value, max = 70) {
  return String(value ?? '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max);
}
function publicAsset(record) {
  return {
    id: record.id, type: record.type, name: record.name, creator: record.creator,
    category: record.category, description: record.description, icon: record.icon,
    duration: record.duration, likes: 0, seed: record.seed || 1,
    effectStyle: record.effectStyle, createdAt: record.createdAt, community: true,
    fileUrl: record.type === 'audio' ? record.fileUrl : undefined
  };
}

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405);
  }
  try {
    if (request.method === 'GET') {
      const { blobs } = await list({ prefix: 'edityou-community/meta/' });
      const records = await Promise.all(blobs.map(async (blob) => {
        try {
          const response = await fetch(blob.url, { cache: 'no-store' });
          if (!response.ok) return null;
          return await response.json();
        } catch { return null; }
      }));
      const assets = records.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
        .map(publicAsset).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 300);
      return json({ ok: true, assets });
    }

    const form = await request.formData();
    let asset;
    try { asset = JSON.parse(String(form.get('asset') || '{}')); }
    catch { return json({ error: 'Metadados inválidos.' }, 400); }
    if (form.get('rightsConfirmed') !== 'true') {
      return json({ error: 'Confirme que você tem autorização para compartilhar este recurso.' }, 400);
    }
    if (!asset || !['audio', 'effect'].includes(asset.type)) return json({ error: 'Tipo de recurso inválido.' }, 400);
    const name = clean(asset.name, 70);
    if (!name) return json({ error: 'Informe um nome para o recurso.' }, 400);
    const creator = clean(asset.creator || 'Criador da comunidade', 35) || 'Criador da comunidade';
    const category = CATEGORIES.has(asset.category) ? asset.category : 'ambient';
    const description = clean(asset.description || '', 240);
    const effectStyle = EFFECTS.has(asset.effectStyle) ? asset.effectStyle : undefined;
    const id = crypto.randomUUID();
    let fileUrl;
    let mimeType = '';
    let extension = 'audio';

    if (asset.type === 'audio') {
      const file = form.get('file');
      if (!(file instanceof File) || file.size < 1) return json({ error: 'Envie um arquivo de áudio.' }, 400);
      if (file.size > MAX_AUDIO_BYTES) return json({ error: 'O áudio público precisa ter até 4 MB.' }, 413);
      mimeType = (file.type || 'application/octet-stream').toLowerCase();
      if (!AUDIO_MIMES.has(mimeType) || (!mimeType.startsWith('audio/') && mimeType !== 'application/ogg' && mimeType !== 'application/octet-stream')) {
        return json({ error: 'Formato de áudio não reconhecido pelo servidor.' }, 415);
      }
      extension = ({ 'audio/mpeg':'mp3', 'audio/mp3':'mp3', 'audio/wav':'wav', 'audio/x-wav':'wav', 'audio/ogg':'ogg', 'audio/mp4':'m4a', 'audio/aac':'aac', 'audio/webm':'webm', 'audio/flac':'flac' })[mimeType] || 'audio';
      const uploaded = await put(`edityou-community/audio/${id}.${extension}`, file, {
        access: 'public', addRandomSuffix: false, contentType: mimeType
      });
      fileUrl = uploaded.url;
    }

    const record = {
      id, type: asset.type, name, creator, category, description,
      icon: asset.type === 'audio' ? '🎧' : '✦',
      duration: clean(asset.duration || (asset.type === 'audio' ? 'ÁUDIO' : 'PRESET'), 16),
      seed: Math.max(1, Math.min(100000, Number(asset.seed) || 1)),
      effectStyle, createdAt: Date.now(), mimeType, fileUrl
    };
    await put(`edityou-community/meta/${id}.json`, JSON.stringify(record), {
      access: 'public', addRandomSuffix: false, contentType: 'application/json'
    });
    return json({ ok: true, asset: publicAsset(record) }, 201);
  } catch (error) {
    console.error('EditYou Vercel community API error:', error);
    return json({ error: 'Não foi possível acessar a biblioteca pública. Verifique se o Vercel Blob está conectado ao projeto.' }, 503);
  }
}
