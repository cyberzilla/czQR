/**
 * build.js — Concatenate src/ modules into czQR.js, then minify
 * Usage: node build.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'czQR.js');
const DIST = path.join(ROOT, 'dist', 'czQR.min.js');
const DOCS = path.join(ROOT, 'docs', 'czQR.min.js');

// Build order — each file is a fragment of the czQR class body
const MODULES = [
  'core.js',            // Class opening, constants, tables
  'utils.js',           // Shared helpers (GF math, rescale, perspective)
  'qr-encode.js',       // QR code generation
  'qr-decode.js',       // QR code reading
  'barcode-encode.js',  // Barcode generation (placeholder)
  'datamatrix-encode.js', // Data Matrix ECC200 generation
  'datamatrix-decode.js', // Data Matrix ECC200 decoding
  'aztec-encode.js',      // Aztec Code encoding
  'aztec-decode.js',      // Aztec Code decoding
  'barcode-decode.js',  // Barcode reading (decoders)
  'readall.js',         // readAll() orchestrator + scanImageAll
  'markers.js',         // drawDetections() API
  'closing.js',         // Class closing + barcode constants + lookup tables
];

// Header comment
const HEADER = `/**
 * czQR.js — Pure JavaScript QR Code & Barcode Generator & Reader
 * https://github.com/cyberzilla/czQR
 *
 * AUTO-GENERATED from src/ modules. Do not edit directly.
 * Run: node build.js
 *
 * @requires Browser with Canvas API
 */

`;

console.log('Building czQR.js from src/ modules...\n');

let output = HEADER;
let totalLines = 0;

for (const mod of MODULES) {
  const filePath = path.join(SRC, mod);
  if (!fs.existsSync(filePath)) {
    console.error(`  ERROR: ${mod} not found!`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  totalLines += lines;
  console.log(`  + ${mod.padEnd(22)} ${String(lines).padStart(5)} lines`);
  output += content;
  if (!content.endsWith('\n')) output += '\n';
}

fs.writeFileSync(OUT, output, 'utf8');
console.log(`\n  → czQR.js written (${totalLines} lines)\n`);

// Syntax check
console.log('  Checking syntax...');
try {
  execSync(`node --check "${OUT}"`, { stdio: 'pipe' });
  console.log('  ✓ Syntax OK\n');
} catch (e) {
  console.error('  ✗ Syntax error!');
  console.error(e.stderr?.toString() || e.message);
  process.exit(1);
}

// Minify with terser
console.log('  Minifying with terser...');
try {
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  execSync(`npx terser "${OUT}" -c -m --comments false -o "${DIST}"`, { stdio: 'pipe', cwd: ROOT });
  const minSize = fs.statSync(DIST).size;
  console.log(`  → dist/czQR.min.js (${(minSize/1024).toFixed(1)} KB)\n`);
} catch (e) {
  console.error('  ✗ Terser failed!');
  console.error(e.stderr?.toString() || e.message);
  process.exit(1);
}

// Copy to docs
fs.copyFileSync(DIST, DOCS);
console.log(`  → docs/czQR.min.js (copied)\n`);

console.log('Build complete! ✓');
