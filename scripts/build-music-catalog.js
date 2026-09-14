import fs from 'node:fs/promises';

const cloud = process.env.CLOUDINARY_CLOUD_NAME;
const key = process.env.CLOUDINARY_API_KEY;
const secret = process.env.CLOUDINARY_API_SECRET;
const tag = process.env.CLOUDINARY_TAG || 'zabat-added';
if (!cloud || !key || !secret) throw new Error('Missing Cloudinary GitHub secrets');

const auth = Buffer.from(`${key}:${secret}`).toString('base64');
let cursor = '';
const resources = [];
let page = 0;

do {
  page++;
  const u = new URL(`https://api.cloudinary.com/v1_1/${cloud}/resources/video/tags/${encodeURIComponent(tag)}`);
  u.searchParams.set('max_results', '500');
  u.searchParams.set('direction', 'asc');
  u.searchParams.set('fields', 'public_id,asset_id,version,format,secure_url,duration,display_name,created_at');
  if (cursor) u.searchParams.set('next_cursor', cursor);
  const res = await fetch(u, {headers: {Authorization: `Basic ${auth}`}});
  if (!res.ok) throw new Error(`Cloudinary HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  resources.push(...(data.resources || []));
  cursor = data.next_cursor || '';
  console.log(`page ${page}: ${resources.length} assets`);
} while (cursor);

resources.sort((a,b) => String(a.created_at||'').localeCompare(String(b.created_at||'')) || String(a.public_id||'').localeCompare(String(b.public_id||'')));
const seen = new Set();
const clean = resources.filter(r => {
  const k = r.asset_id || r.public_id || r.secure_url;
  if (!k || seen.has(k)) return false;
  seen.add(k);
  return true;
});
const out = {version: 1, generated_at: new Date().toISOString(), tag, count: clean.length, resources: clean};
await fs.writeFile('music-catalog.json', JSON.stringify(out, null, 2) + '\n');
console.log(`wrote music-catalog.json with ${clean.length} songs`);
