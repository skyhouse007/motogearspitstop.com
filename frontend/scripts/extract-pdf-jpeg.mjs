import fs from 'node:fs';
import path from 'node:path';

const pdfPath = process.argv[2];
const outPath = process.argv[3];

const buf = fs.readFileSync(pdfPath);
let pos = 0;
let found = null;

while (pos < buf.length) {
  const jfif = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff]), pos);
  if (jfif === -1) break;
  const end = buf.indexOf(Buffer.from([0xff, 0xd9]), jfif + 2);
  if (end === -1) break;
  const slice = buf.subarray(jfif, end + 2);
  if (slice.length > 10000) {
    found = slice;
    break;
  }
  pos = end + 2;
}

if (!found) {
  console.error('No suitable JPEG found in PDF');
  process.exit(1);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, found);
console.log('Wrote', outPath, found.length, 'bytes');