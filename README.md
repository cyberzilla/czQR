# czQR — QR Code Generator & Reader

[![Support Development](https://img.shields.io/badge/Support%20Development-PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://www.paypal.com/paypalme/abudzakiyyah/7usd?country.x=USD)

> **Zero-dependency**, single-file QR Code **generator & reader** for JavaScript.  
> Supports **PNG, SVG, WEBP, HTML, ASCII** output — with **rounded modules**, **finder pattern styling**, **logo**, **label**, **transparent background**, and **built-in camera/image QR reader**.

---

## 📁 Project Structure

```
czQR/
├── czQR.js            # Source — full with comments (development)
├── dist/
│   └── czQR.min.js    # Minified — production ready (~56 KB)
├── docs/
│   ├── index.html     # Demo — QR Generator (GitHub Pages)
│   ├── reader.html    # Demo — QR Reader (GitHub Pages)
│   └── czQR.min.js    # Minified copy for demo
├── LICENSE
└── README.md
```

---

## Installation

### CDN (jsDelivr)

```html
<script src="https://cdn.jsdelivr.net/gh/cyberzilla/czQR/dist/czQR.min.js"></script>
```

### Local

```html
<!-- Development (full source, ~107 KB) -->
<script src="czQR.js"></script>

<!-- Production (minified, ~56 KB) -->
<script src="dist/czQR.min.js"></script>
```

### npm / download

Just copy `dist/czQR.min.js` into your project — no build tools required.

---

## Quick Start

### Generate QR Code

```html
<script src="dist/czQR.min.js"></script>
<script>
  const qr = new czQR('https://github.com/cyberzilla/czQR', 'H', 2);
  qr.size(400)
    .colors('#000000', '#ffffff')
    .moduleRadius(0.4);

  // Append to DOM
  document.body.appendChild(qr.render('canvas'));

  // Async rendering (required for logo)
  const canvas = await qr.renderAsync('canvas');

  // Download
  await qr.download('czqr.png', 'png');
</script>
```

### Read QR Code

```html
<script src="dist/czQR.min.js"></script>
<script>
  // From an image element
  const result = czQR.readFromImage(imgElement);
  console.log(result.data); // decoded text

  // From ImageData (canvas)
  const result2 = czQR.read(imageData);

  // From camera (live scanning)
  czQR.readFromCamera(videoElement, (result) => {
    console.log('Scanned:', result.data);
  });
</script>
```

---

## Constructor

```javascript
const qr = new czQR(data, ec = 'M', quietZone = 2, minVer = 1, maxVer = 40);
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `data` | *(required)* | Text, URL, or data to encode |
| `ec` | `'M'` | Error correction level |
| `quietZone` | `2` | Number of modules for quiet zone (border padding) |
| `minVer` | `1` | Minimum QR version (1 = 21×21 modules) |
| `maxVer` | `40` | Maximum QR version (40 = 177×177 modules) |

### Error Correction Levels

| Level | Recovery | Recommendation |
|-------|----------|----------------|
| `'L'` | ~7% | Maximum data capacity, no logo |
| `'M'` | ~15% | General balance |
| `'Q'` | ~25% | With text labels |
| `'H'` | ~30% | **Required for logo** — highest damage tolerance |

### Auto Mode Detection

Encoding mode is automatically selected based on data content:

| Mode | Efficiency | Pattern |
|------|-----------|---------| 
| **Numeric** | 3.3 bit/char | Digits `0-9` only |
| **Alphanumeric** | 5.5 bit/char | Digits, `A-Z` uppercase, `$%*+-./:` and space |
| **Byte** | 8 bit/char | All characters including UTF-8 |

---

## Static Constants

You can use string literals or static constants:

```javascript
// Both are equivalent:
new czQR('data', 'H');
new czQR('data', czQR.EC_H);
```

### Error Correction

| Constant | Value |
|----------|-------|
| `czQR.EC_L` | `'L'` |
| `czQR.EC_M` | `'M'` |
| `czQR.EC_Q` | `'Q'` |
| `czQR.EC_H` | `'H'` |

### Module Shapes

| Constant | Value |
|----------|-------|
| `czQR.SHAPE_SQUARE` | `'square'` |
| `czQR.SHAPE_DOT` | `'dot'` |
| `czQR.SHAPE_DIAMOND` | `'diamond'` |

### Output Formats

| Constant | Value |
|----------|-------|
| `czQR.FMT_CANVAS` | `'canvas'` |
| `czQR.FMT_PNG` | `'png'` |
| `czQR.FMT_SVG` | `'svg'` |
| `czQR.FMT_WEBP` | `'webp'` |
| `czQR.FMT_HTML` | `'html'` |
| `czQR.FMT_ASCII` | `'ascii'` |
| `czQR.FMT_DATAURI` | `'datauri'` |
| `czQR.FMT_BASE64` | `'base64'` |
| `czQR.FMT_IMGTAG` | `'imgtag'` |

### Encoding Modes (auto-detected)

| Constant | Value | Description |
|----------|-------|-------------|
| `czQR.MODE_NUMBER` | `1` | Numeric only |
| `czQR.MODE_ALPHA_NUM` | `2` | Alphanumeric |
| `czQR.MODE_8BIT_BYTE` | `4` | Byte / UTF-8 |
| `czQR.MODE_KANJI` | `8` | Kanji |

---

## Fluent API — Configuration

All setters support **method chaining** and return `this`.

### `size(size)`

```javascript
qr.size(600);    // Output 600×600 px
```

### `colors(foreground, background)`

```javascript
qr.colors('#1a1a2e', '#ffffff');       // Custom colors
qr.colors('#1a1a2e', 'transparent');   // Transparent background (PNG/Canvas)
```

### `moduleRadius(ratio)`

```javascript
qr.moduleRadius(0.0);    // Sharp corners (default)
qr.moduleRadius(0.25);   // Slightly rounded
qr.moduleRadius(0.5);    // Full circle
```

### `moduleShape(shape)`

```javascript
qr.moduleShape('square');    // Default — square
qr.moduleShape('dot');       // Separate circles with gap
qr.moduleShape('diamond');   // Diamond shape (45° rotation)
```

> **Note:** Finder patterns ("eyes") are not affected by shape — they use rounded rects via `finderStyle()`.

### `finderStyle(outerColor, innerColor, outerRadius, innerRadius)`

```javascript
qr.finderStyle('#e74c3c', '#3498db', 0.5, 0.5);
```

| Parameter | Description |
|-----------|-------------|
| `outerColor` | Outer frame color (null = follow foreground) |
| `innerColor` | Center dot color (null = follow foreground) |
| `outerRadius` | Frame radius (0.0–0.5) |
| `innerRadius` | Dot radius (0.0–0.5) |

### `logo(path, ratio, padding, radius)`

Embed a logo in the center of the QR code. Use EC Level `'H'`.

```javascript
qr.logo('logo.png', 0.25, 10, 20);
// ratio: 25% of QR size
// padding: 10px around logo
// radius: 20% rounded corners
```

> Logo rendering is async. Use `renderAsync()` or `download()`.  
> Logo alpha channel is preserved automatically.

### `label(text, size, color, fontFamily, strip)`

```javascript
qr.label('SCAN ME', 0.08, '#333', 'Arial, sans-serif', false);
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `text` | — | Label text |
| `size` | `0.1` | Font size ratio relative to QR size |
| `color` | `'#000'` | Text color |
| `fontFamily` | `'Inter, Arial, sans-serif'` | CSS font-family |
| `strip` | `false` | Full-width background strip |

> **Note:** Logo and label are **mutually exclusive**. Calling `logo()` automatically clears the label, and vice versa.

### `quality(quality)`

```javascript
qr.quality(80);   // WEBP quality 0-100 (default 85)
```

### `scalable(bool)`

```javascript
qr.scalable(true);   // SVG without width/height (responsive)
```

### `accessibility(title, desc)`

```javascript
qr.accessibility('QR Code', 'Link to GitHub');   // SVG <title> and <desc>
```

### `margin(margin)`

```javascript
qr.margin(3);   // ASCII art margin (default 2)
```

---

## Render Output

```javascript
qr.render(format);            // Synchronous — returns string/Canvas
await qr.renderAsync(format); // Async — required for logo on canvas
await qr.download(filename, format); // Download file via Blob
```

### Format Table

| Format | Return | Description |
|--------|--------|-------------|
| `'canvas'` | HTMLCanvasElement | DOM element |
| `'png'` | Data URI | Default bitmap |
| `'svg'` | SVG string | Vector, scalable |
| `'webp'` | Data URI | Smaller than PNG |
| `'html'` | HTML string | For email templates |
| `'ascii'` | ASCII string | For terminal/CLI |
| `'datauri'` | `data:image/...` | Inline base64 |
| `'base64'` | Base64 string | Without `data:` prefix |
| `'imgtag'` | `<img>` tag | Inline GIF/PNG |

---

## Reader API

### `czQR.read(imageData)`

Decode QR code from an `ImageData` object (e.g., from canvas).

```javascript
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const result = czQR.read(imageData);
if (result) console.log(result.data);
```

### `czQR.readFromImage(imgElement)`

Decode QR code from an `<img>` element or `Image` object.

```javascript
const img = document.getElementById('myImage');
const result = czQR.readFromImage(img);
if (result) console.log(result.data);
```

### `czQR.readFromCamera(videoElement, callback)`

Live camera scanning with continuous decode.

```javascript
czQR.readFromCamera(videoEl, (result) => {
  console.log('Decoded:', result.data);
});
```

### `czQR.readFromCanvas(canvasElement)`

Decode QR code directly from a `<canvas>` element.

```javascript
const result = czQR.readFromCanvas(myCanvas);
if (result) console.log(result.data);
```

### Reader Features

- **Multi-pass pipeline** — upscale, dilation, blur, multi-binarizer for styled QR codes
- **Styled QR support** — reads dot, diamond, rounded, and logo QR codes
- **Adaptive binarizer** — neighbor threshold propagation (HybridBinarizer)
- **Reed-Solomon error correction** — Sugiyama algorithm, corrects up to 30% damage (EC=H)
- **Perspective transform** — handles tilted/skewed QR codes from camera
- **Transparent background** — alpha compositing support

---

## Examples

### Simple QR

```javascript
const qr = new czQR('https://github.com/cyberzilla/czQR', 'M', 2);
document.body.appendChild(qr.size(400).render('canvas'));
```

### Rounded QR with Logo

```javascript
const qr = new czQR('https://github.com/cyberzilla/czQR', 'H', 2);
qr.size(600)
  .colors('#000', '#fff')
  .moduleRadius(0.4)
  .logo('logo.png', 0.25, 10, 30);

const canvas = await qr.renderAsync('canvas');
document.body.appendChild(canvas);
```

### Transparent Background

```javascript
const qr = new czQR('https://github.com/cyberzilla/czQR', 'M', 2);
qr.size(400).colors('#000', 'transparent');
const canvas = await qr.renderAsync('canvas');
```

### Finder Pattern Styling

```javascript
const qr = new czQR('https://github.com/cyberzilla/czQR', 'H', 2);
qr.size(600)
  .moduleRadius(0.4)
  .finderStyle('#e74c3c', '#3498db', 0.5, 0.5)
  .render('canvas');
```

### Dot / Diamond Shape

```javascript
const qr = new czQR('https://github.com/cyberzilla/czQR', 'H', 2);
qr.size(500)
  .moduleShape('dot')
  .finderStyle('#e74c3c', '#3498db', 0.5, 0.5);

document.body.appendChild(qr.render('canvas'));
```

### Label with Strip

```javascript
const qr = new czQR('https://github.com/cyberzilla/czQR', 'Q', 2);
qr.size(500)
  .moduleRadius(0.3)
  .label('SCAN ME', 0.08, '#333', 'Arial, sans-serif', true);

document.body.appendChild(qr.render('canvas'));
```

### Download

```javascript
const qr = new czQR('https://github.com/cyberzilla/czQR', 'H', 2);
qr.size(600).colors('#1a1a2e', '#fff');

await qr.download('czqr.png', 'png');
await qr.download('czqr.svg', 'svg');
await qr.download('czqr.webp', 'webp');
```

### Read from Image

```javascript
const img = new Image();
img.onload = () => {
  const result = czQR.readFromImage(img);
  if (result) {
    console.log('Decoded:', result.data);
    console.log('Version:', result.version);
    console.log('EC Level:', result.ecLevel);
  }
};
img.src = 'qrcode.png';
```

---

## Inspection Methods

```javascript
qr.isDark(row, col)      // Boolean — dark/light module
qr.getModuleCount()      // Number — total dimension (with quiet zone)
qr.getRawModuleCount()   // Number — dimension without quiet zone
qr.matrix()              // 2D boolean array
qr.info()                // Object — metadata (version, mode, utilization, etc.)
```

---

## Feature Matrix

| Feature | Support |
|---------|---------|
| PNG (Canvas) | ✅ |
| SVG | ✅ |
| WEBP (Canvas) | ✅ |
| HTML | ✅ |
| ASCII | ✅ |
| Transparent BG | ✅ |
| Module Shapes (square/dot/diamond) | ✅ |
| Module Radius | ✅ |
| Finder Styling | ✅ |
| Logo (raster + SVG) | ✅ (async) |
| Label + Strip | ✅ |
| SVG Scalable + Accessibility | ✅ |
| Data URI / Base64 | ✅ |
| Download (Blob) | ✅ |
| **QR Reader (image)** | ✅ |
| **QR Reader (camera)** | ✅ |
| **Styled QR Reader** | ✅ |
| **RS Error Correction** | ✅ (Sugiyama) |

---

## Demo

| Demo | Live | File |
|------|------|------|
| **Generator** | [cyberzilla.github.io/czQR](https://cyberzilla.github.io/czQR/) | `docs/index.html` |
| **Reader** | [cyberzilla.github.io/czQR/reader](https://cyberzilla.github.io/czQR/reader.html) | `docs/reader.html` |

> No server required — also works offline by opening the files directly in browser.

---

## Requirements

Modern browser with Canvas API (Chrome, Firefox, Safari, Edge).

---

## License

MIT
