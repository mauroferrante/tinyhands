// Tell Bing (and every IndexNow partner) which URLs are new or changed.
// Usage:  node scripts/indexnow.mjs            -> submits every URL in sitemap.xml
//         node scripts/indexnow.mjs /guides/x/ -> submits just those paths
// The key is public by design: IndexNow verifies it by fetching /<key>.txt.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'tinyhandsplay.com';
const KEY  = 'c657eb6e6e9b4fe99e1f4b64068af7c6';

const args = process.argv.slice(2);
const urls = args.length
  ? args.map(p => 'https://' + HOST + p)
  : [...readFileSync(join(ROOT, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urls.length} URL(s)`);
if (res.status >= 400) { console.log(await res.text()); process.exitCode = 1; }
