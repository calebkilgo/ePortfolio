// build-icons.mjs — rasterise public/favicon.svg into the two bitmap icons
// browsers still ask for. Run again only if the mark changes.
//
//   node scripts/build-icons.mjs

import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const svg = await readFile('public/favicon.svg');

// Apple touch icon: 180 px, opaque, no rounding (the system applies its own mask).
await sharp(svg, { density: 600 }).resize(180, 180).png({ compressionLevel: 9 }).toFile('public/apple-touch-icon.png');

// favicon.ico holding a single 32 px PNG: a 6-byte header, one 16-byte directory entry, the image.
const png = await sharp(svg, { density: 300 }).resize(32, 32).png({ compressionLevel: 9 }).toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette size
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
await writeFile('public/favicon.ico', Buffer.concat([header, png]));
console.log('icons: public/favicon.ico, public/apple-touch-icon.png');
