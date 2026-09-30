/**
 * czQR.js — Pure JavaScript QR Code & Barcode Generator & Reader
 * https://github.com/cyberzilla/czQR
 *
 * AUTO-GENERATED from src/ modules. Do not edit directly.
 * Run: node build.js
 *
 * @requires Browser with Canvas API
 */

/**
 * czQR.js — Pure JavaScript QR Code Generator & Reader
 * https://github.com/cyberzilla/czQR
 *
 * Supports Canvas (PNG/WEBP), SVG, HTML, ASCII, DataURI output.
 *
 * Usage:
 *   const qr = new czQR('Hello World', 'M', 2);
 *   qr.size(600)
 *     .colors('#1a1a2e', '#ffffff')
 *     .moduleShape('dot')
 *     .finderStyle('#e74c3c', null, 0.5)
 *     .render('canvas');       // returns HTMLCanvasElement
 *     .render('png');          // returns data:image/png;base64,...
 *     .render('svg');          // returns SVG string
 *
 * @requires Browser with Canvas API
 */

class czQR {
  static EC_L = 'L';
  static EC_M = 'M';
  static EC_Q = 'Q';
  static EC_H = 'H';

  static SHAPE_SQUARE = 'square';
  static SHAPE_DOT = 'dot';
  static SHAPE_DIAMOND = 'diamond';

  static FMT_PNG = 'png';
  static FMT_SVG = 'svg';
  static FMT_WEBP = 'webp';
  static FMT_HTML = 'html';
  static FMT_ASCII = 'ascii';
  static FMT_DATAURI = 'datauri';
  static FMT_BASE64 = 'base64';
  static FMT_CANVAS = 'canvas';
  static FMT_IMGTAG = 'imgtag';

  static MODE_NUMBER = 1;
  static MODE_ALPHA_NUM = 2;
  static MODE_8BIT_BYTE = 4;
  static MODE_KANJI = 8;

  static PATTERN000 = 0; static PATTERN001 = 1; static PATTERN010 = 2; static PATTERN011 = 3;
  static PATTERN100 = 4; static PATTERN101 = 5; static PATTERN110 = 6; static PATTERN111 = 7;

  static _EC_INTERNAL = { L: 1, M: 0, Q: 3, H: 2 };

  static _PATTERN_POSITION_TABLE = [
    [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62],
    [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
    [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170],
  ];

  static _RS_BLOCK_TABLE = [
    [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
    [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
    [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
    [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
    [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
    [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
    [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
    [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
    [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
    [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
    [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],
    [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],
    [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],
    [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],
    [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12, 7, 37, 13],
    [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],
    [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],
    [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],
    [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],
    [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],
    [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],
    [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],
    [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],
    [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],
    [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],
    [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],
    [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],
    [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],
    [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],
    [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],
    [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],
    [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],
    [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],
    [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],
    [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],
    [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],
    [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],
    [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],
    [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],
    [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16],
  ];

  static _EXP_TABLE = null;
  static _LOG_TABLE = null;

  // ════════════════════════════════════════════════════════════════════════
  // utils.js — Shared: GF math, image rescaling, perspective transforms
  // ════════════════════════════════════════════════════════════════════════

  // ── GF(2^8) Math ──
  static _initMathTables() {
    if (czQR._EXP_TABLE !== null) return;
    czQR._EXP_TABLE = new Array(256).fill(0);
    czQR._LOG_TABLE = new Array(256).fill(0);
    for (let i = 0; i < 8; i++) czQR._EXP_TABLE[i] = 1 << i;
    for (let i = 8; i < 256; i++) czQR._EXP_TABLE[i] = czQR._EXP_TABLE[i - 4] ^ czQR._EXP_TABLE[i - 5] ^ czQR._EXP_TABLE[i - 6] ^ czQR._EXP_TABLE[i - 8];
    for (let i = 0; i < 255; i++) czQR._LOG_TABLE[czQR._EXP_TABLE[i]] = i;
  }

  static _glog(n) { if (n < 1) throw new Error(`glog(${n})`); return czQR._LOG_TABLE[n]; }
  static _gexp(n) { while (n < 0) n += 255; while (n >= 256) n -= 255; return czQR._EXP_TABLE[n]; }


  /** Downscale imgData to target pixel size using canvas anti-aliasing */
  static _rd_downscaleTo(imgData, targetSize) {
    try {
      const { width: w, height: h } = imgData;
      const scale = targetSize / Math.max(w, h);
      const nw = Math.max(21, Math.round(w * scale)), nh = Math.max(21, Math.round(h * scale));
      const srcC = document.createElement('canvas');
      srcC.width = w; srcC.height = h;
      srcC.getContext('2d').putImageData(imgData, 0, 0);
      const dstC = document.createElement('canvas');
      dstC.width = nw; dstC.height = nh;
      const ctx = dstC.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(srcC, 0, 0, nw, nh);
      return ctx.getImageData(0, 0, nw, nh);
    } catch (e) { return null; }
  }

  /** Rescale imgData by integer factor (nearest-neighbor for upscale, smooth for downscale) */
  static _rd_rescale(imgData, scale) {
    try {
      const { width: w, height: h } = imgData;
      const nw = Math.round(w * scale), nh = Math.round(h * scale);
      if (nw < 21 || nh < 21 || nw > 4000 || nh > 4000) return null;
      const srcC = document.createElement('canvas');
      srcC.width = w; srcC.height = h;
      srcC.getContext('2d').putImageData(imgData, 0, 0);
      const dstC = document.createElement('canvas');
      dstC.width = nw; dstC.height = nh;
      const ctx = dstC.getContext('2d');
      // Nearest-neighbor for upscale (preserves sharp module edges), smooth for downscale
      ctx.imageSmoothingEnabled = scale < 1;
      ctx.drawImage(srcC, 0, 0, nw, nh);
      return ctx.getImageData(0, 0, nw, nh);
    } catch (e) { return null; }
  }

  static readFromCanvas(canvas) { return czQR.read(canvas); }
  static readFromImage(img) { return czQR.read(img); }

  /** Rescale imgData by factor using smooth (bicubic) interpolation — better for rounded modules */
  static _rd_rescaleSmooth(imgData, scale) {
    try {
      const { width: w, height: h } = imgData;
      const nw = Math.round(w * scale), nh = Math.round(h * scale);
      if (nw < 21 || nh < 21 || nw > 4000 || nh > 4000) return null;
      const srcC = document.createElement('canvas');
      srcC.width = w; srcC.height = h;
      srcC.getContext('2d').putImageData(imgData, 0, 0);
      const dstC = document.createElement('canvas');
      dstC.width = nw; dstC.height = nh;
      const ctx = dstC.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(srcC, 0, 0, nw, nh);
      return ctx.getImageData(0, 0, nw, nh);
    } catch (e) { return null; }
  }

  /** Compute perspective transform (homography) from 4 source-destination point pairs.
   *  Returns a function(x,y) → {x,y} that maps source to destination coordinates.
   *  Point order: TL, TR, BR, BL. All matrices stored row-major. */
  static _rd_perspectiveTransform(s0, s1, s2, s3, d0, d1, d2, d3) {
    const qToS = czQR._rd_quadToSquare(s0.x, s0.y, s1.x, s1.y, s2.x, s2.y, s3.x, s3.y);
    const sToQ = czQR._rd_squareToQuad(d0.x, d0.y, d1.x, d1.y, d2.x, d2.y, d3.x, d3.y);
    const T = czQR._rd_mat3mul(sToQ, qToS);
    return (x, y) => {
      const d = T[6]*x + T[7]*y + T[8];
      return { x: (T[0]*x + T[1]*y + T[2]) / d, y: (T[3]*x + T[4]*y + T[5]) / d };
    };
  }

  /** Maps unit square → quadrilateral: (0,0)→p0, (1,0)→p1, (1,1)→p2, (0,1)→p3. Row-major 3x3. */
  static _rd_squareToQuad(x0,y0, x1,y1, x2,y2, x3,y3) {
    const dx3 = x0-x1+x2-x3, dy3 = y0-y1+y2-y3;
    if (Math.abs(dx3) < 1e-10 && Math.abs(dy3) < 1e-10) {
      return [x1-x0, x2-x1, x0, y1-y0, y2-y1, y0, 0, 0, 1];
    }
    const dx1=x1-x2, dy1=y1-y2, dx2=x3-x2, dy2=y3-y2;
    const det = dx1*dy2 - dx2*dy1;
    if (Math.abs(det) < 1e-10) return [1,0,0, 0,1,0, 0,0,1];
    const a13 = (dx3*dy2-dx2*dy3)/det, a23 = (dx1*dy3-dx3*dy1)/det;
    return [x1-x0+a13*x1, x3-x0+a23*x3, x0, y1-y0+a13*y1, y3-y0+a23*y3, y0, a13, a23, 1];
  }

  /** Inverse of squareToQuad — maps quadrilateral → unit square. Row-major adjugate. */
  static _rd_quadToSquare(x0,y0, x1,y1, x2,y2, x3,y3) {
    const m = czQR._rd_squareToQuad(x0,y0, x1,y1, x2,y2, x3,y3);
    return [
      m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
      m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
      m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3]
    ];
  }

  /** Row-major 3x3 matrix multiply: C = A × B */
  static _rd_mat3mul(a, b) {
    return [
      a[0]*b[0]+a[1]*b[3]+a[2]*b[6], a[0]*b[1]+a[1]*b[4]+a[2]*b[7], a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
      a[3]*b[0]+a[4]*b[3]+a[5]*b[6], a[3]*b[1]+a[4]*b[4]+a[5]*b[7], a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
      a[6]*b[0]+a[7]*b[3]+a[8]*b[6], a[6]*b[1]+a[7]*b[4]+a[8]*b[7], a[6]*b[2]+a[7]*b[5]+a[8]*b[8]
    ];
  }
  // ════════════════════════════════════════════════════════════════════════
  // qr-encode.js — QR Code generation, rendering, and encoding engine
  // ════════════════════════════════════════════════════════════════════════

  constructor(data, ec = 'M', quietZone = 2, minVer = 1, maxVer = 40) {
    czQR._initMathTables();
    this._ecLevelChar = ec;
    this._quiet = Math.max(0, quietZone);
    this._text = data;
    this._errorCorrectionLevel = czQR._EC_INTERNAL[ec];
    this._typeNumber = 0;
    this._modules = null;
    this._moduleCount = 0;
    this._dataCache = null;
    this._dataList = [];
    this._detectedMode = 'Byte';
    this._bestMaskPattern = 0;

    this._moduleRadius = 0;
    this._moduleShape = 'square';
    this._finderStyle = null;
    this._renderSize = 400;
    this._renderFg = '#000000';
    this._renderBg = '#ffffff';
    this._renderQuality = 0.85;
    this._renderScalable = false;
    this._renderTitle = null;
    this._renderDesc = null;
    this._renderMargin = 2;
    this._logoSrc = null;
    this._logoOptions = { ratio: 0.2, padding: 6, radius: 15 };
    this._labelText = null;
    this._labelOptions = { size: 0.1, color: '#000000', fontFamily: 'Inter, Arial, sans-serif', strip: false };

    minVer = Math.max(1, minVer);
    maxVer = Math.min(40, maxVer);
    let success = false;
    for (let ver = minVer; ver <= maxVer; ver++) {
      try {
        this._typeNumber = ver;
        this._dataList = [];
        this._dataCache = null;
        this._modules = null;
        this._moduleCount = 0;
        this._detectedMode = this._detectMode(data);
        this._addData(data, this._detectedMode);
        this._make();
        success = true;
        break;
      } catch (e) { /* try next version */ }
    }
    if (!success) throw new Error(`Data too long for QR versions ${minVer}-${maxVer} with EC level ${ec}.`);
  }

  // ── Fluent API ──
  size(s) { this._renderSize = Math.max(10, s); return this; }
  colors(fg, bg = '#ffffff') { this._renderFg = fg; this._renderBg = bg; return this; }
  moduleRadius(r) { this._moduleRadius = Math.max(0, Math.min(0.5, r)); return this; }
  moduleShape(s) { this._moduleShape = s; return this; }
  finderStyle(outerColor = null, innerColor = null, outerRadius = null, innerRadius = null) {
    this._finderStyle = {
      outerColor, innerColor,
      outerRadius: outerRadius !== null ? Math.max(0, Math.min(0.5, outerRadius)) : null,
      innerRadius: innerRadius !== null ? Math.max(0, Math.min(0.5, innerRadius)) : null,
    };
    return this;
  }
  logo(src, ratio = 0.2, padding = 6, radius = 15) {
    this._logoSrc = src;
    if (src !== null) { this._labelText = null; this._logoOptions = { ratio, padding, radius }; }
    return this;
  }
  label(text, size = 0.1, color = '#000000', fontFamily = 'Inter, Arial, sans-serif', strip = false) {
    this._labelText = text;
    if (text !== null) { this._logoSrc = null; this._labelOptions = { size, color, fontFamily, strip }; }
    return this;
  }
  quality(q) { this._renderQuality = Math.max(0, Math.min(1, q / 100)); return this; }
  scalable(s = true) { this._renderScalable = s; return this; }
  accessibility(title, desc = null) { this._renderTitle = title; this._renderDesc = desc; return this; }
  margin(m) { this._renderMargin = Math.max(0, m); return this; }

  // ── Public Accessors ──
  isDark(row, col) {
    row -= this._quiet; col -= this._quiet;
    if (row < 0 || row >= this._moduleCount || col < 0 || col >= this._moduleCount) return false;
    return !!this._modules[row][col];
  }
  getModuleCount() { return this._moduleCount + 2 * this._quiet; }
  getRawModuleCount() { return this._moduleCount; }
  matrix() {
    const total = this.getModuleCount(), m = [];
    for (let r = 0; r < total; r++) { m[r] = []; for (let c = 0; c < total; c++) m[r][c] = this.isDark(r, c); }
    return m;
  }
  info() {
    const rsBlocks = this._getRSBlocks(this._typeNumber, this._errorCorrectionLevel);
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
    const buffer = this._createBitBuffer();
    for (const data of this._dataList) {
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), this._getLengthInBits(data.getMode(), this._typeNumber));
      data.write(buffer);
    }
    const dataBitsUsed = buffer.getLengthInBits();
    return {
      version: this._typeNumber, ecLevel: this._ecLevelChar, mode: this._detectedMode,
      moduleCount: this.getModuleCount(), rawModuleCount: this.getRawModuleCount(),
      maskPattern: this._bestMaskPattern,
      dataCapacityBits: totalDataCount * 8, dataUsedBits: dataBitsUsed,
      utilization: Math.round(dataBitsUsed / (totalDataCount * 8) * 10000) / 10000,
    };
  }

  // ── Render ──
  render(format = 'canvas', filename = null) {
    const size = this._renderSize, fg = this._renderFg, bg = this._renderBg;
    switch (format) {
      case 'canvas': return this._toCanvas(size, fg, bg);
      case 'png': return this._toCanvas(size, fg, bg).toDataURL('image/png');
      case 'webp': return this._toCanvas(size, fg, bg).toDataURL('image/webp', this._renderQuality);
      case 'svg': return this._renderSVG(size, fg, bg);
      case 'html': return this._toHTML(size, fg, bg);
      case 'ascii': return this._toASCII(this._renderMargin);
      case 'datauri': return this._toCanvas(size, fg, bg).toDataURL('image/png');
      case 'base64': { const d = this._toCanvas(size, fg, bg).toDataURL('image/png'); return d.replace(/^data:image\/png;base64,/, ''); }
      case 'imgtag': {
        const uri = this._toCanvas(size, fg, bg).toDataURL('image/png');
        let tag = `<img src="${uri}" width="${size}" height="${size}"`;
        if (this._renderTitle) tag += ` alt="${this._escHtml(this._renderTitle)}"`;
        return tag + '/>';
      }
      default: throw new Error(`Unsupported format: '${format}'`);
    }
  }

  /**
   * Async render — required when using logo on Canvas/PNG/WEBP formats.
   * Returns a Promise that resolves with the same output as render().
   * For SVG/HTML/ASCII (non-bitmap), it resolves immediately.
   * @param {string} format - 'canvas', 'png', 'webp', 'svg', 'html', 'ascii', 'datauri', 'base64', 'imgtag'
   * @returns {Promise<HTMLCanvasElement|string>}
   */
  async renderAsync(format = 'canvas') {
    const size = this._renderSize, fg = this._renderFg, bg = this._renderBg;
    // Non-canvas formats don't need async
    if (['svg', 'html', 'ascii'].includes(format)) return this.render(format);

    const canvas = await this._toCanvasAsync(size, fg, bg);
    switch (format) {
      case 'canvas': return canvas;
      case 'png': return canvas.toDataURL('image/png');
      case 'webp': return canvas.toDataURL('image/webp', this._renderQuality);
      case 'datauri': return canvas.toDataURL('image/png');
      case 'base64': return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
      case 'imgtag': {
        const uri = canvas.toDataURL('image/png');
        let tag = `<img src="${uri}" width="${size}" height="${size}"`;
        if (this._renderTitle) tag += ` alt="${this._escHtml(this._renderTitle)}"`;
        return tag + '/>';
      }
      default: throw new Error(`Unsupported format: '${format}'`);
    }
  }

  async download(filename = 'czQR.png', format = 'png') {
    const mime = format === 'webp' ? 'image/webp' : 'image/png';
    if (format === 'svg') {
      const svg = this._renderSVG(this._renderSize, this._renderFg, this._renderBg);
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
      return;
    }
    const canvas = await this._toCanvasAsync(this._renderSize, this._renderFg, this._renderBg);
    canvas.toBlob(blob => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    }, mime, format === 'webp' ? this._renderQuality : undefined);
  }

  /** Load an image from URL/dataURI — returns Promise<HTMLImageElement> */
  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /** Async canvas renderer — draws logo if set */
  async _toCanvasAsync(size, fg, bg) {
    const canvas = this._toCanvas(size, fg, bg);
    if (!this._logoSrc) return canvas;

    // Load logo and draw onto canvas
    const img = await this._loadImage(this._logoSrc);
    const ctx = canvas.getContext('2d');
    const opts = this._logoOptions;
    const ratio = Math.max(0.05, Math.min(0.4, opts.ratio));
    const logoSz = Math.floor(size * ratio);
    const pad = opts.padding;
    const bgSize = logoSz + pad * 2;
    const bgX = Math.floor((size - bgSize) / 2);
    const bgY = Math.floor((size - bgSize) / 2);
    const logoX = bgX + pad;
    const logoY = bgY + pad;
    const rad = Math.min(opts.radius, Math.floor(logoSz / 2));

    // Draw background behind logo
    const logoBg = bg === 'transparent' ? '#ffffff' : bg;
    ctx.fillStyle = logoBg;
    if (rad > 0) {
      this._fillRoundedRect(ctx, bgX, bgY, bgSize, bgSize, Math.min(rad, Math.floor(bgSize / 2)));
    } else {
      ctx.fillRect(bgX, bgY, bgSize, bgSize);
    }

    // Clip logo with rounded corners
    if (rad > 0) {
      ctx.save();
      ctx.beginPath();
      const r = Math.min(rad, Math.floor(logoSz / 2));
      ctx.moveTo(logoX + r, logoY);
      ctx.arcTo(logoX + logoSz, logoY, logoX + logoSz, logoY + logoSz, r);
      ctx.arcTo(logoX + logoSz, logoY + logoSz, logoX, logoY + logoSz, r);
      ctx.arcTo(logoX, logoY + logoSz, logoX, logoY, r);
      ctx.arcTo(logoX, logoY, logoX + logoSz, logoY, r);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, logoX, logoY, logoSz, logoSz);
      ctx.restore();
    } else {
      ctx.drawImage(img, logoX, logoY, logoSz, logoSz);
    }

    return canvas;
  }

  // ── Canvas Renderer ──
  _toCanvas(size, fg, bg) {
    const total = this.getModuleCount();
    const scale = (this._moduleShape === 'dot' || this._moduleShape === 'diamond') ? 8 : 4;
    const rSize = size * scale;
    const rModuleSize = rSize / total;
    const rOffset = (rSize - rModuleSize * total) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = rSize; canvas.height = rSize;
    const ctx = canvas.getContext('2d');

    if (bg === 'transparent') {
      ctx.clearRect(0, 0, rSize, rSize);
    } else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, rSize, rSize);
    }

    this._drawModulesCanvas(ctx, total, rModuleSize, rOffset, fg, bg);

    if (this._labelText) {
      this._drawLabelCanvas(ctx, rSize, fg, bg, scale);
    }

    if (scale > 1) {
      const final = document.createElement('canvas');
      final.width = size; final.height = size;
      const fCtx = final.getContext('2d');
      fCtx.imageSmoothingEnabled = true;
      fCtx.imageSmoothingQuality = 'high';
      fCtx.drawImage(canvas, 0, 0, rSize, rSize, 0, 0, size, size);
      return final;
    }
    return canvas;
  }

  _drawModulesCanvas(ctx, total, ms, offset, fg, bg) {
    const hasFS = !!this._finderStyle;
    const shape = this._moduleShape;

    if (shape === 'square' && this._moduleRadius <= 0 && !hasFS) {
      ctx.fillStyle = fg;
      for (let r = 0; r < total; r++) for (let c = 0; c < total; c++) {
        if (this.isDark(r, c)) ctx.fillRect(offset + c * ms, offset + r * ms, ms, ms);
      }
      return;
    }

    if (shape === 'dot' || shape === 'diamond') {
      const dotR = ms * 0.40, half = ms / 2;
      ctx.fillStyle = fg;
      ctx.beginPath();
      for (let r = 0; r < total; r++) for (let c = 0; c < total; c++) {
        if (hasFS) {
          const rr = r - this._quiet, rc = c - this._quiet;
          if (rr >= 0 && rc >= 0 && this._getFinderRole(rr, rc) !== null) continue;
        }
        if (!this.isDark(r, c)) continue;
        const cx = offset + c * ms + half, cy = offset + r * ms + half;
        if (shape === 'dot') {
          ctx.moveTo(cx + dotR, cy);
          ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
        } else {
          ctx.moveTo(cx, cy - half); ctx.lineTo(cx + half, cy);
          ctx.lineTo(cx, cy + half); ctx.lineTo(cx - half, cy); ctx.closePath();
        }
      }
      ctx.fill();
      if (hasFS) this._drawFinderPatternsCanvas(ctx, ms, offset, fg, bg);
      return;
    }

    // Square with radius
    const rad = this._moduleRadius > 0 ? Math.max(1, Math.round(ms * this._moduleRadius)) : 0;
    for (let r = 0; r < total; r++) for (let c = 0; c < total; c++) {
      if (hasFS) {
        const rr = r - this._quiet, rc = c - this._quiet;
        if (rr >= 0 && rc >= 0 && this._getFinderRole(rr, rc) !== null) continue;
      }
      const x = offset + c * ms, y = offset + r * ms;
      const dark = this.isDark(r, c);
      if (dark) {
        if (rad <= 0) { ctx.fillStyle = fg; ctx.fillRect(x, y, ms, ms); }
        else {
          const dn = this.isDark(r - 1, c), ds = this.isDark(r + 1, c), dw = this.isDark(r, c - 1), de = this.isDark(r, c + 1);
          const nw = !dn && !dw, ne = !dn && !de, se = !ds && !de, sw = !ds && !dw;
          ctx.fillStyle = fg;
          this._roundRect(ctx, x, y, ms, ms, { tl: nw ? rad : 0, tr: ne ? rad : 0, br: se ? rad : 0, bl: sw ? rad : 0 });
          ctx.fill();
        }
      } else if (rad > 0) {
        const dn = this.isDark(r - 1, c), ds = this.isDark(r + 1, c), dw = this.isDark(r, c - 1), de = this.isDark(r, c + 1);
        const dnw = this.isDark(r - 1, c - 1), dne = this.isDark(r - 1, c + 1), dse = this.isDark(r + 1, c + 1), dsw = this.isDark(r + 1, c - 1);
        ctx.fillStyle = fg;
        if (dn && dw && dnw) this._fillInnerCorner(ctx, x, y, rad, 'nw');
        if (dn && de && dne) this._fillInnerCorner(ctx, x + ms, y, rad, 'ne');
        if (ds && de && dse) this._fillInnerCorner(ctx, x + ms, y + ms, rad, 'se');
        if (ds && dw && dsw) this._fillInnerCorner(ctx, x, y + ms, rad, 'sw');
      }
    }
    if (hasFS) this._drawFinderPatternsCanvas(ctx, ms, offset, fg, bg);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    if (r.tr) ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr); else ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - r.br);
    if (r.br) ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br); else ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + r.bl, y + h);
    if (r.bl) ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl); else ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r.tl);
    if (r.tl) ctx.arcTo(x, y, x + r.tl, y, r.tl); else ctx.lineTo(x, y);
    ctx.closePath();
  }

  _fillInnerCorner(ctx, cx, cy, rad, corner) {
    ctx.beginPath();
    switch (corner) {
      case 'nw': ctx.moveTo(cx, cy); ctx.lineTo(cx + rad, cy); ctx.arcTo(cx, cy, cx, cy + rad, rad); break;
      case 'ne': ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + rad); ctx.arcTo(cx, cy, cx - rad, cy, rad); break;
      case 'se': ctx.moveTo(cx, cy); ctx.lineTo(cx - rad, cy); ctx.arcTo(cx, cy, cx, cy - rad, rad); break;
      case 'sw': ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - rad); ctx.arcTo(cx, cy, cx + rad, cy, rad); break;
    }
    ctx.closePath(); ctx.fill();
  }

  _drawFinderPatternsCanvas(ctx, ms, offset, fg, bg) {
    let outerColor = fg, innerColor = fg;
    if (this._finderStyle.outerColor) outerColor = this._finderStyle.outerColor;
    if (this._finderStyle.innerColor) innerColor = this._finderStyle.innerColor;
    const outerRatio = this._finderStyle.outerRadius != null ? this._finderStyle.outerRadius : this._moduleRadius;
    const innerRatio = this._finderStyle.innerRadius != null ? this._finderStyle.innerRadius : this._moduleRadius;
    const outerRad = Math.round(7 * ms * outerRatio);
    const gapRad = Math.round(5 * ms * outerRatio);
    const innerRad = Math.round(3 * ms * innerRatio);
    const q = this._quiet, rawMC = this._moduleCount;
    const origins = [[q, q], [q, q + rawMC - 7], [q + rawMC - 7, q]];
    for (const [gr, gc] of origins) {
      const ox = offset + gc * ms, oy = offset + gr * ms;
      ctx.fillStyle = outerColor;
      this._fillRoundedRect(ctx, ox, oy, 7 * ms, 7 * ms, outerRad);
      ctx.fillStyle = bg === 'transparent' ? '#ffffff' : bg;
      this._fillRoundedRect(ctx, ox + ms, oy + ms, 5 * ms, 5 * ms, gapRad);
      ctx.fillStyle = innerColor;
      this._fillRoundedRect(ctx, ox + 2 * ms, oy + 2 * ms, 3 * ms, 3 * ms, innerRad);
    }
  }

  _fillRoundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (r <= 0) { ctx.fillRect(x, y, w, h); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath(); ctx.fill();
  }

  _drawLabelCanvas(ctx, rSize, fg, bg, scale) {
    const opts = this._labelOptions;
    const labelSize = Math.max(0.05, Math.min(0.3, opts.size));
    const fontSize = Math.round(rSize * labelSize);
    const padding = Math.round(fontSize * 0.4);
    ctx.font = `bold ${fontSize}px ${opts.fontFamily}`;
    const tm = ctx.measureText(this._labelText);
    const textW = Math.ceil(tm.width);
    const textH = fontSize;
    const textX = Math.round((rSize - textW) / 2);
    const textY = Math.round(rSize / 2 + fontSize * 0.35);
    let clearLeft = textX - padding, clearRight = textX + textW + padding;
    const clearTop = textY - textH - padding, clearBottom = textY + padding;
    if (opts.strip) { clearLeft = 0; clearRight = rSize; }
    ctx.fillStyle = bg === 'transparent' ? '#ffffff' : bg;
    ctx.fillRect(clearLeft, clearTop, clearRight - clearLeft, clearBottom - clearTop);
    ctx.fillStyle = opts.color;
    ctx.fillText(this._labelText, textX, textY);
  }

  _getFinderRole(row, col) {
    const mc = this._moduleCount;
    const origins = [[0, 0], [0, mc - 7], [mc - 7, 0]];
    for (const [or_, oc] of origins) {
      const lr = row - or_, lc = col - oc;
      if (lr >= 0 && lr <= 6 && lc >= 0 && lc <= 6) {
        return (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) ? 'inner' : 'outer';
      }
    }
    return null;
  }

  // ── SVG Renderer ──
  _renderSVG(size, fg, bg) {
    if (this._logoSrc) return this._toSVGWithLogo(size, fg, bg);
    if (this._labelText) return this._toSVGWithLabel(size, fg, bg);
    return this._toSVG(size, fg, bg, this._renderScalable, this._renderTitle, this._renderDesc);
  }

  _toSVG(size, fg, bg, scalable = false, title = null, desc = null) {
    const total = this.getModuleCount(), ms = size / total;
    let svg = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
    if (!scalable) svg += ` width="${size}px" height="${size}px"`;
    svg += ` viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMinYMin meet"`;
    const ariaIds = [];
    if (title) ariaIds.push('czQR-title');
    if (desc) ariaIds.push('czQR-description');
    if (ariaIds.length) svg += ` role="img" aria-labelledby="${ariaIds.join(' ')}"`;
    svg += '>';
    if (title) svg += `<title id="czQR-title">${this._escHtml(title)}</title>`;
    if (desc) svg += `<description id="czQR-description">${this._escHtml(desc)}</description>`;
    if (bg !== 'transparent') svg += `<rect width="100%" height="100%" fill="${this._escHtml(bg)}"/>`;
    svg += this._buildSVGModules(total, ms, 0, fg);
    svg += '</svg>';
    return svg;
  }

  _toSVGWithLabel(size, fg, bg) {
    const opts = this._labelOptions;
    const total = this.getModuleCount(), ms = size / total;
    const labelSize = Math.max(0.05, Math.min(0.3, opts.size));
    const fontSize = size * labelSize, padding = fontSize * 0.5;
    const estTextW = this._labelText.length * fontSize * 0.6;
    const boxW = opts.strip ? size : estTextW + padding * 2;
    const boxH = fontSize + padding * 2;
    const boxX = (size - boxW) / 2, boxY = (size - boxH) / 2;
    const textX = size / 2, textY = size / 2 + fontSize * 0.35;
    let svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg"`;
    if (!this._renderScalable) svg += ` width="${size}px" height="${size}px"`;
    svg += ` viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMinYMin meet"`;
    const ariaIds = [];
    if (this._renderTitle) ariaIds.push('czQR-title');
    if (this._renderDesc) ariaIds.push('czQR-description');
    if (ariaIds.length) svg += ` role="img" aria-labelledby="${ariaIds.join(' ')}"`;
    svg += `>`;
    if (this._renderTitle) svg += `<title id="czQR-title">${this._escHtml(this._renderTitle)}</title>`;
    if (this._renderDesc) svg += `<description id="czQR-description">${this._escHtml(this._renderDesc)}</description>`;
    if (bg !== 'transparent') svg += `<rect width="100%" height="100%" fill="${this._escHtml(bg)}"/>`;
    svg += this._buildSVGModules(total, ms, 0, fg);
    const labelBg = bg === 'transparent' ? 'white' : this._escHtml(bg);
    svg += `<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" fill="${labelBg}" rx="4" ry="4"/>`;
    svg += `<text x="${textX}" y="${textY}" font-family="${this._escHtml(opts.fontFamily)}" font-size="${fontSize}" font-weight="bold" fill="${this._escHtml(opts.color)}" text-anchor="middle">${this._escHtml(this._labelText)}</text>`;
    svg += '</svg>';
    return svg;
  }

  _toSVGWithLogo(size, fg, bg) {
    const opts = this._logoOptions;
    const total = this.getModuleCount(), ms = size / total;
    const ratio = Math.max(0.05, Math.min(0.4, opts.ratio));
    const logoSz = Math.floor(size * ratio);
    const logoBgSize = logoSz + opts.padding * 2;
    const logoBgX = (size - logoBgSize) / 2, logoBgY = (size - logoBgSize) / 2;
    const logoX = logoBgX + opts.padding, logoY = logoBgY + opts.padding;
    let svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`;
    if (!this._renderScalable) svg += ` width="${size}px" height="${size}px"`;
    svg += ` viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMinYMin meet"`;
    const ariaIds = [];
    if (this._renderTitle) ariaIds.push('czQR-title');
    if (this._renderDesc) ariaIds.push('czQR-description');
    if (ariaIds.length) svg += ` role="img" aria-labelledby="${ariaIds.join(' ')}"`;
    svg += `>`;
    if (this._renderTitle) svg += `<title id="czQR-title">${this._escHtml(this._renderTitle)}</title>`;
    if (this._renderDesc) svg += `<description id="czQR-description">${this._escHtml(this._renderDesc)}</description>`;
    if (bg !== 'transparent') svg += `<rect width="100%" height="100%" fill="${this._escHtml(bg)}"/>`;
    svg += this._buildSVGModules(total, ms, 0, fg);
    const logoBg = bg === 'transparent' ? 'white' : this._escHtml(bg);
    const bgRad = Math.min(opts.radius, Math.floor(logoBgSize / 2));
    svg += `<rect x="${logoBgX}" y="${logoBgY}" width="${logoBgSize}" height="${logoBgSize}" fill="${logoBg}" rx="${bgRad}" ry="${bgRad}"/>`;
    const clipRad = Math.min(opts.radius, Math.floor(logoSz / 2));
    if (opts.radius > 0) {
      svg += `<defs><clipPath id="logoClip"><rect x="${logoX}" y="${logoY}" width="${logoSz}" height="${logoSz}" rx="${clipRad}" ry="${clipRad}"/></clipPath></defs>`;
      svg += `<image x="${logoX}" y="${logoY}" width="${logoSz}" height="${logoSz}" href="${this._logoSrc}" preserveAspectRatio="xMidYMid meet" clip-path="url(#logoClip)"/>`;
    } else {
      svg += `<image x="${logoX}" y="${logoY}" width="${logoSz}" height="${logoSz}" href="${this._logoSrc}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    svg += '</svg>';
    return svg;
  }

  _buildSVGModules(total, ms, offset, foreground) {
    const fg = this._escHtml(foreground);
    const hasFS = !!this._finderStyle;
    const shape = this._moduleShape;
    const finderOuterFg = hasFS && this._finderStyle.outerColor ? this._escHtml(this._finderStyle.outerColor) : fg;
    const finderInnerFg = hasFS && this._finderStyle.innerColor ? this._escHtml(this._finderStyle.innerColor) : fg;
    const defaultRad = +(ms * this._moduleRadius).toFixed(4);

    if (shape === 'square' && this._moduleRadius <= 0 && !hasFS) {
      const r = +ms.toFixed(4);
      let d = '';
      for (let row = 0; row < total; row++) {
        const mr = +(row * ms + offset).toFixed(4);
        for (let col = 0; col < total; col++) {
          if (this.isDark(row, col)) {
            const mc = +(col * ms + offset).toFixed(4);
            d += `M${mc},${mr}l${r},0 0,${r} -${r},0 0,-${r}z `;
          }
        }
      }
      return `<path d="${d}" fill="${fg}"/>`;
    }

    if (shape === 'dot' || shape === 'diamond') {
      let d = '';
      const dotR = +(ms * 0.40).toFixed(4), halfMs = +(ms / 2).toFixed(4);
      for (let row = 0; row < total; row++) for (let col = 0; col < total; col++) {
        if (hasFS) {
          const rr = row - this._quiet, rc = col - this._quiet;
          if (rr >= 0 && rc >= 0 && this._getFinderRole(rr, rc) !== null) continue;
        }
        if (!this.isDark(row, col)) continue;
        const cx = +(col * ms + offset + halfMs).toFixed(4);
        const cy = +(row * ms + offset + halfMs).toFixed(4);
        if (shape === 'dot') {
          const d2 = +(dotR * 2).toFixed(4);
          d += `M${+(cx - dotR).toFixed(4)},${cy}a${dotR},${dotR} 0 1,0 ${d2},0a${dotR},${dotR} 0 1,0 -${d2},0Z `;
        } else {
          d += `M${cx},${+(cy - halfMs).toFixed(4)}L${+(cx + halfMs).toFixed(4)},${cy}L${cx},${+(cy + halfMs).toFixed(4)}L${+(cx - halfMs).toFixed(4)},${cy}Z `;
        }
      }
      let svg = '';
      if (d) svg += `<path d="${d}" fill="${fg}"/>`;
      if (hasFS) svg += this._buildSVGFinderRects(total, ms, offset, fg, finderOuterFg, finderInnerFg);
      return svg;
    }

    // Square with radius
    let d = '';
    const rad = defaultRad;
    for (let row = 0; row < total; row++) for (let col = 0; col < total; col++) {
      if (hasFS) {
        const rr = row - this._quiet, rc = col - this._quiet;
        if (rr >= 0 && rc >= 0 && this._getFinderRole(rr, rc) !== null) continue;
      }
      const l = +(col * ms + offset).toFixed(4), t = +(row * ms + offset).toFixed(4);
      const r = +(l + ms).toFixed(4), b = +(t + ms).toFixed(4);
      const dc = this.isDark(row, col);
      if (dc) {
        if (rad <= 0) {
          d += `M${l},${t}l${+ms.toFixed(4)},0 0,${+ms.toFixed(4)} -${+ms.toFixed(4)},0 0,-${+ms.toFixed(4)}z `;
        } else {
          const dn = this.isDark(row - 1, col), ds = this.isDark(row + 1, col), dw = this.isDark(row, col - 1), de = this.isDark(row, col + 1);
          const nw = !dn && !dw, ne = !dn && !de, se = !ds && !de, sw = !ds && !dw;
          d += nw ? `M${l + rad},${t}` : `M${l},${t}`;
          d += ne ? `L${r - rad},${t}A${rad},${rad} 0 0 1 ${r},${t + rad}` : `L${r},${t}`;
          d += se ? `L${r},${b - rad}A${rad},${rad} 0 0 1 ${r - rad},${b}` : `L${r},${b}`;
          d += sw ? `L${l + rad},${b}A${rad},${rad} 0 0 1 ${l},${b - rad}` : `L${l},${b}`;
          d += nw ? `L${l},${t + rad}A${rad},${rad} 0 0 1 ${l + rad},${t}` : `L${l},${t}`;
          d += 'Z ';
        }
      } else if (rad > 0) {
        const dn = this.isDark(row - 1, col), ds = this.isDark(row + 1, col), dw = this.isDark(row, col - 1), de = this.isDark(row, col + 1);
        const dnw = this.isDark(row - 1, col - 1), dne = this.isDark(row - 1, col + 1), dse = this.isDark(row + 1, col + 1), dsw = this.isDark(row + 1, col - 1);
        if (dn && dw && dnw) d += `M${l},${t}L${l + rad},${t}A${rad},${rad} 0 0 0 ${l},${t + rad}Z `;
        if (dn && de && dne) d += `M${r},${t}L${r},${t + rad}A${rad},${rad} 0 0 0 ${r - rad},${t}Z `;
        if (ds && de && dse) d += `M${r},${b}L${r - rad},${b}A${rad},${rad} 0 0 0 ${r},${b - rad}Z `;
        if (ds && dw && dsw) d += `M${l},${b}L${l},${b - rad}A${rad},${rad} 0 0 0 ${l + rad},${b}Z `;
      }
    }
    let svg = '';
    if (d) svg += `<path d="${d}" fill="${fg}"/>`;
    if (hasFS) svg += this._buildSVGFinderRects(total, ms, offset, fg, finderOuterFg, finderInnerFg);
    return svg;
  }

  _buildSVGFinderRects(total, ms, offset, fg, outerFg, innerFg) {
    const outerRatio = this._finderStyle.outerRadius != null ? this._finderStyle.outerRadius : this._moduleRadius;
    const innerRatio = this._finderStyle.innerRadius != null ? this._finderStyle.innerRadius : this._moduleRadius;
    const q = this._quiet, rawMC = this._moduleCount;
    const origins = [[q, q], [q, q + rawMC - 7], [q + rawMC - 7, q]];
    const outerRx = +(7 * ms * outerRatio).toFixed(4);
    const gapRx = +(5 * ms * outerRatio).toFixed(4);
    const innerRx = +(3 * ms * innerRatio).toFixed(4);
    const bgFill = this._escHtml(this._renderBg === 'transparent' ? '#ffffff' : this._renderBg);
    let svg = '';
    for (const [gr, gc] of origins) {
      const ox = +(gc * ms + offset).toFixed(4), oy = +(gr * ms + offset).toFixed(4);
      const outerW = +(7 * ms).toFixed(4), gapW = +(5 * ms).toFixed(4), innerW = +(3 * ms).toFixed(4);
      const gx = +(ox + ms).toFixed(4), gy = +(oy + ms).toFixed(4);
      const ix = +(ox + 2 * ms).toFixed(4), iy = +(oy + 2 * ms).toFixed(4);
      svg += `<rect x="${ox}" y="${oy}" width="${outerW}" height="${outerW}"`;
      if (outerRx > 0) svg += ` rx="${outerRx}" ry="${outerRx}"`;
      svg += ` fill="${outerFg}"/>`;
      svg += `<rect x="${gx}" y="${gy}" width="${gapW}" height="${gapW}"`;
      if (gapRx > 0) svg += ` rx="${gapRx}" ry="${gapRx}"`;
      svg += ` fill="${bgFill}"/>`;
      svg += `<rect x="${ix}" y="${iy}" width="${innerW}" height="${innerW}"`;
      if (innerRx > 0) svg += ` rx="${innerRx}" ry="${innerRx}"`;
      svg += ` fill="${innerFg}"/>`;
    }
    return svg;
  }

  // ── HTML Table Renderer ──
  _toHTML(size, fg, bg) {
    const total = this.getModuleCount(), ms = Math.floor(size / total);
    let html = '<table style="border-width:0;border-style:none;border-collapse:collapse;padding:0;margin:0;"><tbody>';
    for (let r = 0; r < total; r++) {
      html += '<tr>';
      for (let c = 0; c < total; c++) {
        const color = this.isDark(r, c) ? fg : bg;
        html += `<td style="border-width:0;border-style:none;border-collapse:collapse;padding:0;margin:0;width:${ms}px;height:${ms}px;background-color:${this._escHtml(color)};"/>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  // ── ASCII Renderer ──
  _toASCII(margin = 2) {
    const total = this.getModuleCount(), sz = total + margin * 2;
    const min = margin, max = sz - margin;
    const blocks = { '██': '█', '█ ': '▀', ' █': '▄', '  ': ' ' };
    const blocksLast = { '██': '▀', '█ ': '▀', ' █': ' ', '  ': ' ' };
    let ascii = '';
    for (let y = 0; y < sz; y += 2) {
      const r1 = y - min, r2 = y + 1 - min;
      for (let x = 0; x < sz; x++) {
        let p = '█';
        const cx = x - min;
        if (min <= x && x < max && min <= y && y < max && this.isDark(r1, cx)) p = ' ';
        if (min <= x && x < max && min <= (y + 1) && (y + 1) < max && this.isDark(r2, cx)) p += ' '; else p += '█';
        ascii += (margin < 1 && y + 1 >= max) ? blocksLast[p] : blocks[p];
      }
      ascii += '\n';
    }
    if (sz % 2 && margin > 0) return ascii.slice(0, ascii.length - sz - 1) + '▀'.repeat(sz);
    return ascii.trimEnd();
  }

  // ── QR Core: Mode Detection ──
  _detectMode(data) {
    if (/^\d+$/.test(data)) return 'Numeric';
    if (/^[0-9A-Z $%*+\-./:]+$/.test(data)) return 'Alphanumeric';
    return 'Byte';
  }

  _addData(data, mode) {
    switch (mode) {
      case 'Numeric': this._dataList.push(this._createQRNumber(data)); break;
      case 'Alphanumeric': this._dataList.push(this._createQRAlphaNum(data)); break;
      case 'Byte': this._dataList.push(this._createQR8BitByte(data)); break;
      default: throw new Error(`Unsupported mode: ${mode}`);
    }
    this._dataCache = null;
  }

  _createQR8BitByte(data) {
    const bytes = this._stringToUTF8Bytes(data);
    return {
      getMode: () => czQR.MODE_8BIT_BYTE,
      getLength: () => bytes.length,
      write: (buffer) => { for (let i = 0; i < bytes.length; i++) buffer.put(bytes[i], 8); },
    };
  }

  _createQRNumber(data) {
    return {
      getMode: () => czQR.MODE_NUMBER,
      getLength: () => data.length,
      write: (buffer) => {
        let i = 0;
        while (i + 2 < data.length) { buffer.put(parseInt(data.substring(i, i + 3), 10), 10); i += 3; }
        if (i < data.length) {
          const rem = data.length - i;
          if (rem === 1) buffer.put(parseInt(data.substring(i, i + 1), 10), 4);
          else if (rem === 2) buffer.put(parseInt(data.substring(i, i + 2), 10), 7);
        }
      },
    };
  }

  _createQRAlphaNum(data) {
    const getCode = (c) => {
      if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
      if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55;
      const map = { ' ': 36, '$': 37, '%': 38, '*': 39, '+': 40, '-': 41, '.': 42, '/': 43, ':': 44 };
      if (map[c] !== undefined) return map[c];
      throw new Error(`Illegal alphanumeric char: ${c}`);
    };
    return {
      getMode: () => czQR.MODE_ALPHA_NUM,
      getLength: () => data.length,
      write: (buffer) => {
        let i = 0;
        while (i + 1 < data.length) { buffer.put(getCode(data[i]) * 45 + getCode(data[i + 1]), 11); i += 2; }
        if (i < data.length) buffer.put(getCode(data[i]), 6);
      },
    };
  }

  _stringToUTF8Bytes(str) {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(str));
  }

  // ── QR Core: Make ──
  _make() {
    if (this._typeNumber < 1) {
      let tn = 1;
      for (; tn < 40; tn++) {
        const rsBlocks = this._getRSBlocks(tn, this._errorCorrectionLevel);
        const buffer = this._createBitBuffer();
        for (const data of this._dataList) {
          buffer.put(data.getMode(), 4);
          buffer.put(data.getLength(), this._getLengthInBits(data.getMode(), tn));
          data.write(buffer);
        }
        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
        if (buffer.getLengthInBits() <= totalDataCount * 8) break;
      }
      this._typeNumber = tn;
    }
    this._bestMaskPattern = this._getBestMaskPattern();
    this._makeImpl(false, this._bestMaskPattern);
  }

  _makeImpl(test, maskPattern) {
    this._moduleCount = this._typeNumber * 4 + 17;
    this._modules = [];
    for (let r = 0; r < this._moduleCount; r++) this._modules[r] = new Array(this._moduleCount).fill(null);
    this._setupPositionProbePattern(0, 0);
    this._setupPositionProbePattern(this._moduleCount - 7, 0);
    this._setupPositionProbePattern(0, this._moduleCount - 7);
    this._setupPositionAdjustPattern();
    this._setupTimingPattern();
    this._setupTypeInfo(test, maskPattern);
    if (this._typeNumber >= 7) this._setupTypeNumber(test);
    if (this._dataCache === null) this._dataCache = this._createData(this._typeNumber, this._errorCorrectionLevel, this._dataList);
    this._mapData(this._dataCache, maskPattern);
  }

  _setupPositionProbePattern(row, col) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this._moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this._moduleCount <= col + c) continue;
        this._modules[row + r][col + c] =
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4);
      }
    }
  }

  _getBestMaskPattern() {
    let minLost = 0, pattern = 0;
    for (let i = 0; i < 8; i++) {
      this._makeImpl(true, i);
      const lost = this._getLostPoint();
      if (i === 0 || minLost > lost) { minLost = lost; pattern = i; }
    }
    return pattern;
  }

  _setupTimingPattern() {
    for (let r = 8; r < this._moduleCount - 8; r++) { if (this._modules[r][6] !== null) continue; this._modules[r][6] = r % 2 === 0; }
    for (let c = 8; c < this._moduleCount - 8; c++) { if (this._modules[6][c] !== null) continue; this._modules[6][c] = c % 2 === 0; }
  }

  _setupPositionAdjustPattern() {
    const pos = czQR._PATTERN_POSITION_TABLE[this._typeNumber - 1];
    for (let i = 0; i < pos.length; i++) for (let j = 0; j < pos.length; j++) {
      const row = pos[i], col = pos[j];
      if (this._modules[row][col] !== null) continue;
      for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
        this._modules[row + r][col + c] = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
      }
    }
  }

  _setupTypeNumber(test) {
    const bits = this._getBCHTypeNumber(this._typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >>> i) & 1) === 1;
      this._modules[Math.floor(i / 3)][i % 3 + this._moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >>> i) & 1) === 1;
      this._modules[i % 3 + this._moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  _setupTypeInfo(test, maskPattern) {
    const data = (this._errorCorrectionLevel << 3) | maskPattern;
    const bits = this._getBCHTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >>> i) & 1) === 1;
      if (i < 6) this._modules[i][8] = mod;
      else if (i < 8) this._modules[i + 1][8] = mod;
      else this._modules[this._moduleCount - 15 + i][8] = mod;
    }
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >>> i) & 1) === 1;
      if (i < 8) this._modules[8][this._moduleCount - i - 1] = mod;
      else if (i < 9) this._modules[8][15 - i - 1 + 1] = mod;
      else this._modules[8][15 - i - 1] = mod;
    }
    this._modules[this._moduleCount - 8][8] = !test;
  }

  _mapData(data, maskPattern) {
    let inc = -1, row = this._moduleCount - 1, bitIndex = 7, byteIndex = 0;
    for (let col = this._moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this._modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            if (this._getMaskValue(maskPattern, row, col - c)) dark = !dark;
            this._modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
          }
        }
        row += inc;
        if (row < 0 || this._moduleCount <= row) { row -= inc; inc = -inc; break; }
      }
    }
  }

  // ── QR Core: Data Encoding ──
  _createData(typeNumber, ecLevel, dataList) {
    const PAD0 = 0xEC, PAD1 = 0x11;
    const rsBlocks = this._getRSBlocks(typeNumber, ecLevel);
    const buffer = this._createBitBuffer();
    for (const data of dataList) {
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), this._getLengthInBits(data.getMode(), typeNumber));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
    if (buffer.getLengthInBits() > totalDataCount * 8) throw new Error(`Code length overflow. (${buffer.getLengthInBits()}>${totalDataCount * 8})`);
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(PAD1, 8);
    }
    return this._createBytes(buffer, rsBlocks);
  }

  _createBytes(buffer, rsBlocks) {
    let offset = 0, maxDcCount = 0, maxEcCount = 0;
    const dcdata = [], ecdata = [];
    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount, ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = [];
      const bufData = buffer.getBuffer();
      for (let i = 0; i < dcCount; i++) dcdata[r][i] = 0xff & bufData[i + offset];
      offset += dcCount;
      const rsPoly = this._getErrorCorrectPolynomial(ecCount);
      const rawPoly = this._createPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = [];
      const ecLen = rsPoly.getLength() - 1;
      for (let i = 0; i < ecLen; i++) {
        const modIndex = i + modPoly.getLength() - ecLen;
        ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
    const data = new Array(totalCodeCount).fill(0);
    let index = 0;
    for (let i = 0; i < maxDcCount; i++) for (let r = 0; r < rsBlocks.length; r++) {
      if (i < dcdata[r].length) data[index++] = dcdata[r][i];
    }
    for (let i = 0; i < maxEcCount; i++) for (let r = 0; r < rsBlocks.length; r++) {
      if (i < ecdata[r].length) data[index++] = ecdata[r][i];
    }
    return data;
  }

  // ── RS Blocks ──
  _getRSBlocks(typeNumber, ecLevel) {
    const rsBlock = this._getRsBlockTable(typeNumber, ecLevel);
    if (!rsBlock) throw new Error(`Bad RS block @ typeNumber:${typeNumber}/ecLevel:${ecLevel}`);
    const length = rsBlock.length / 3, list = [];
    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3], totalCount = rsBlock[i * 3 + 1], dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j++) list.push({ totalCount, dataCount });
    }
    return list;
  }

  _getRsBlockTable(typeNumber, ecLevel) {
    switch (ecLevel) {
      case 1: return czQR._RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case 0: return czQR._RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case 3: return czQR._RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case 2: return czQR._RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default: return null;
    }
  }

  // ── Bit Buffer ──
  _createBitBuffer() {
    const buf = [], state = { length: 0 };
    return {
      getBuffer: () => buf,
      getAt: (index) => ((buf[Math.floor(index / 8)] >>> (7 - index % 8)) & 1) === 1,
      put: (num, length) => {
        for (let i = 0; i < length; i++) {
          const bit = ((num >>> (length - i - 1)) & 1) === 1;
          const bufIndex = Math.floor(state.length / 8);
          if (buf.length <= bufIndex) buf.push(0);
          if (bit) buf[bufIndex] |= (0x80 >>> (state.length % 8));
          state.length++;
        }
      },
      getLengthInBits: () => state.length,
      putBit: (bit) => {
        const bufIndex = Math.floor(state.length / 8);
        if (buf.length <= bufIndex) buf.push(0);
        if (bit) buf[bufIndex] |= (0x80 >>> (state.length % 8));
        state.length++;
      },
    };
  }

  // ── Polynomial ──
  _createPolynomial(num, shift) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    const coefficients = [];
    for (let i = 0; i < num.length - offset; i++) coefficients[i] = num[i + offset];
    for (let i = 0; i < shift; i++) coefficients.push(0);
    const self = {
      getAt: (index) => coefficients[index],
      getLength: () => coefficients.length,
      multiply: (e) => {
        const num2 = new Array(self.getLength() + e.getLength() - 1).fill(0);
        for (let i = 0; i < self.getLength(); i++) for (let j = 0; j < e.getLength(); j++) {
          num2[i + j] ^= czQR._gexp(czQR._glog(self.getAt(i)) + czQR._glog(e.getAt(j)));
        }
        return this._createPolynomial(num2, 0);
      },
      mod: (e) => {
        if (self.getLength() - e.getLength() < 0) return self;
        const ratio = czQR._glog(self.getAt(0)) - czQR._glog(e.getAt(0));
        const num2 = [];
        for (let i = 0; i < self.getLength(); i++) num2[i] = self.getAt(i);
        for (let i = 0; i < e.getLength(); i++) num2[i] ^= czQR._gexp(czQR._glog(e.getAt(i)) + ratio);
        return this._createPolynomial(num2, 0).mod(e);
      },
    };
    return self;
  }

  _getErrorCorrectPolynomial(ecLength) {
    let a = this._createPolynomial([1], 0);
    for (let i = 0; i < ecLength; i++) a = a.multiply(this._createPolynomial([1, czQR._gexp(i)], 0));
    return a;
  }


  // ── BCH ──
  static _getBCHDigit(data) { let d = 0; while (data !== 0) { d++; data >>>= 1; } return d; }

  _getBCHTypeInfo(data) {
    const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
    let d = data << 10;
    while (czQR._getBCHDigit(d) - czQR._getBCHDigit(G15) >= 0) d ^= (G15 << (czQR._getBCHDigit(d) - czQR._getBCHDigit(G15)));
    return ((data << 10) | d) ^ G15_MASK;
  }

  _getBCHTypeNumber(data) {
    const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    let d = data << 12;
    while (czQR._getBCHDigit(d) - czQR._getBCHDigit(G18) >= 0) d ^= (G18 << (czQR._getBCHDigit(d) - czQR._getBCHDigit(G18)));
    return (data << 12) | d;
  }

  // ── Mask ──
  _getMaskValue(maskPattern, i, j) {
    switch (maskPattern) {
      case 0: return (i + j) % 2 === 0;
      case 1: return i % 2 === 0;
      case 2: return j % 3 === 0;
      case 3: return (i + j) % 3 === 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5: return (i * j) % 2 + (i * j) % 3 === 0;
      case 6: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
      case 7: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
      default: throw new Error(`Bad maskPattern: ${maskPattern}`);
    }
  }

  // ── Penalty ──
  _getLostPoint() {
    const mc = this._moduleCount;
    let lp = 0;
    for (let row = 0; row < mc; row++) for (let col = 0; col < mc; col++) {
      let sameCount = 0; const dark = this._modules[row][col];
      for (let r = -1; r <= 1; r++) {
        if (row + r < 0 || mc <= row + r) continue;
        for (let c = -1; c <= 1; c++) {
          if (col + c < 0 || mc <= col + c) continue;
          if (r === 0 && c === 0) continue;
          if (dark === this._modules[row + r][col + c]) sameCount++;
        }
      }
      if (sameCount > 5) lp += 3 + sameCount - 5;
    }
    for (let row = 0; row < mc - 1; row++) for (let col = 0; col < mc - 1; col++) {
      let count = 0;
      if (this._modules[row][col]) count++;
      if (this._modules[row + 1][col]) count++;
      if (this._modules[row][col + 1]) count++;
      if (this._modules[row + 1][col + 1]) count++;
      if (count === 0 || count === 4) lp += 3;
    }
    // Rule 3: finder-like pattern with 4-module quiet zone on either side
    for (let row = 0; row < mc; row++) for (let col = 0; col < mc - 6; col++) {
      if (this._modules[row][col] && !this._modules[row][col + 1] && this._modules[row][col + 2] && this._modules[row][col + 3] && this._modules[row][col + 4] && !this._modules[row][col + 5] && this._modules[row][col + 6]) {
        // Check 4 light modules before (00001011101)
        if (col >= 4 && !this._modules[row][col - 1] && !this._modules[row][col - 2] && !this._modules[row][col - 3] && !this._modules[row][col - 4]) lp += 40;
        // Check 4 light modules after (10111010000)
        else if (col + 10 < mc && !this._modules[row][col + 7] && !this._modules[row][col + 8] && !this._modules[row][col + 9] && !this._modules[row][col + 10]) lp += 40;
      }
    }
    for (let col = 0; col < mc; col++) for (let row = 0; row < mc - 6; row++) {
      if (this._modules[row][col] && !this._modules[row + 1][col] && this._modules[row + 2][col] && this._modules[row + 3][col] && this._modules[row + 4][col] && !this._modules[row + 5][col] && this._modules[row + 6][col]) {
        // Check 4 light modules before (00001011101)
        if (row >= 4 && !this._modules[row - 1][col] && !this._modules[row - 2][col] && !this._modules[row - 3][col] && !this._modules[row - 4][col]) lp += 40;
        // Check 4 light modules after (10111010000)
        else if (row + 10 < mc && !this._modules[row + 7][col] && !this._modules[row + 8][col] && !this._modules[row + 9][col] && !this._modules[row + 10][col]) lp += 40;
      }
    }
    let darkCount = 0;
    for (let col = 0; col < mc; col++) for (let row = 0; row < mc; row++) { if (this._modules[row][col]) darkCount++; }
    const ratio = Math.abs(100 * darkCount / mc / mc - 50) / 5;
    lp += Math.floor(ratio * 10);
    return lp;
  }

  _getLengthInBits(mode, type) {
    if (type >= 1 && type < 10) {
      switch (mode) { case 1: return 10; case 2: return 9; case 4: return 8; case 8: return 8; }
    } else if (type < 27) {
      switch (mode) { case 1: return 12; case 2: return 11; case 4: return 16; case 8: return 10; }
    } else if (type < 41) {
      switch (mode) { case 1: return 14; case 2: return 13; case 4: return 16; case 8: return 12; }
    }
    throw new Error(`type: ${type}`);
  }

  // ── Helpers ──
  _escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ════════════════════════════════════════════════════════════════════════
  // qr-decode.js — QR Code reading and decoding pipeline
  // ════════════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // ── QR Code Reader ────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Read/decode a QR code from ImageData, Canvas, or Image element.
   * @param {ImageData|HTMLCanvasElement|HTMLImageElement} source
   * @returns {{ data: string, version: number, ecLevel: string, points: Array }} | null
   */
  static read(source) {
    let imgData;
    if (typeof ImageData !== 'undefined' && source instanceof ImageData) imgData = source;
    else if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement)
      imgData = source.getContext('2d').getImageData(0, 0, source.width, source.height);
    else if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
      const c = document.createElement('canvas');
      c.width = source.naturalWidth || source.width; c.height = source.naturalHeight || source.height;
      c.getContext('2d').drawImage(source, 0, 0);
      imgData = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    } else return null;

    czQR._initMathTables();

    // Pass 0: upscale small images (modules may be too few pixels for reliable detection)
    if (typeof document !== 'undefined') {
      const maxDim = Math.max(imgData.width, imgData.height);
      if (maxDim < 300) {
        for (const scale of [3, 2, 4]) {
          // Try both nearest-neighbor and smooth (bicubic) upscale
          const upNN = czQR._rd_rescale(imgData, scale);
          const upSmooth = czQR._rd_rescaleSmooth(imgData, scale);
          const upImages = [upNN, upSmooth].filter(x => x);
          for (const up of upImages) {
            const invScale = 1 / scale;
            let r = czQR._rd_tryDecode(up);
            if (r) {
              // Scale points back to original resolution
              if (r.points) r.points = r.points.map(p => ({ x: p.x * invScale, y: p.y * invScale, estModuleSize: (p.estModuleSize || 1) * invScale, n: p.n }));
              return r;
            }
            // Also try with dilation for rounded/styled modules at small size
            const upBm = czQR._rd_binarize(up, 0);
            for (const dilR of [2, 3, 4]) {
              try {
                const dilBm = czQR._rd_dilate(upBm, dilR);
                const fp = czQR._rd_findFinderPatterns(dilBm);
                if (!fp) continue;
                for (const skipAlign of [false, true]) {
                  const { version, transform } = czQR._rd_extractGrid(dilBm, fp, skipAlign);
                  if (!transform || version < 1 || version > 40) continue;
                  const mc = version * 4 + 17;
                  for (const areaR of [1, 0]) {
                    const grid = areaR > 0
                      ? czQR._rd_sampleGridArea(upBm, transform, mc, areaR)
                      : czQR._rd_sampleGrid(upBm, transform, mc);
                    const fmt = czQR._rd_readFormatInfo(grid, mc);
                    if (!fmt) continue;
                    let ver = version;
                    if (version >= 7) { const pv = czQR._rd_readVersionInfo(grid, mc); if (pv) ver = pv; }
                    czQR._rd_unmaskInPlace(grid, fmt.maskPattern, mc);
                    const bits = czQR._rd_readDataBits(grid, mc, ver);
                    const decoded = czQR._rd_decodePayload(bits, ver, fmt.ecLevel);
                    if (decoded !== null) {
                      // Scale finder pattern points back to original resolution
                      const scaledFp = fp.map(p => ({ x: p.x * invScale, y: p.y * invScale, estModuleSize: p.estModuleSize * invScale, n: p.n }));
                      return { data: decoded, version: ver, ecLevel: fmt.ecLevelChar, points: scaledFp, format: 'qr', type: '2d' };
                    }
                  }
                }
              } catch (e) { continue; }
            }
          }
        }
      }
    }

    // Pass 1: standard decode (square/rounded modules)
    let r = czQR._rd_tryDecode(imgData);
    if (r) return r;

    const origBm = czQR._rd_binarize(imgData, 0);

    // Pass 2: styled module decode (dot/diamond/star)
    // Three strategies: (A) dilation, (B) blur+binarize, (C) blur+dilate
    // Each uses area-based sampling for robustness
    {
      const sz = Math.min(imgData.width, imgData.height);
      const maxR = Math.max(8, Math.round(sz / 50));

      // Helper: attempt full decode pipeline from pattern-detection bitmap + sampling bitmap
      const tryDecode = (patBm, samBm) => {
        const fp = czQR._rd_findFinderPatterns(patBm);
        if (!fp) return null;
        // Try both with and without alignment refinement (styled modules can mislead alignment search)
        for (const skipAlign of [false, true]) {
          const { version, transform } = czQR._rd_extractGrid(patBm, fp, skipAlign);
          if (!transform || version < 1 || version > 40) continue;
          const mc = version * 4 + 17;
          // Try area sampling from samBm first, then single-pixel, then from patBm
          for (const bm of [samBm, patBm]) {
            for (const areaR of bm === samBm ? [1, 0, 2] : [1]) {
              const grid = areaR > 0
                ? czQR._rd_sampleGridArea(bm, transform, mc, areaR)
                : czQR._rd_sampleGrid(bm, transform, mc);
              const fmt = czQR._rd_readFormatInfo(grid, mc);
              if (!fmt) continue;
              let ver = version;
              if (version >= 7) { const pv = czQR._rd_readVersionInfo(grid, mc); if (pv) ver = pv; }
              czQR._rd_unmaskInPlace(grid, fmt.maskPattern, mc);
              const bits = czQR._rd_readDataBits(grid, mc, ver);
              const decoded = czQR._rd_decodePayload(bits, ver, fmt.ecLevel);
              if (decoded !== null) return { data: decoded, version: ver, ecLevel: fmt.ecLevelChar, points: fp, format: 'qr', type: '2d' };
            }
          }
        }
        return null;
      };

      // Strategy A: pure morphological dilation (closing gaps in binary image)
      const dilRadii = [2, 3, 4, 5, 6, 8, 10, 12, 16];
      for (const dilR of dilRadii) {
        if (dilR > maxR) break;
        try {
          const dilBm = czQR._rd_dilate(origBm, dilR);
          const res = tryDecode(dilBm, origBm);
          if (res) return res;
        } catch (e) { continue; }
      }

      // Strategy B: blur grayscale before binarization (softly merges adjacent modules)
      const blurRadii = [2, 3, 4, 6, 8];
      for (const blurR of blurRadii) {
        if (blurR > maxR) break;
        try {
          const blurBm = czQR._rd_binarize(imgData, blurR);
          const res = tryDecode(blurBm, origBm);
          if (res) return res;
        } catch (e) { continue; }
      }

      // Strategy C: blur + dilation combo (for tough cases like diamond modules)
      for (const blurR of [2, 4]) {
        for (const dilR of [2, 3, 5]) {
          if (blurR + dilR > maxR) continue;
          try {
            const blurBm = czQR._rd_binarize(imgData, blurR);
            const comboBm = czQR._rd_dilate(blurBm, dilR);
            const res = tryDecode(comboBm, origBm);
            if (res) return res;
          } catch (e) { continue; }
        }
      }
    }

    // Pass 3: hybrid — compute transform from downscaled (dots merged), sample from original
    if (typeof document !== 'undefined') {
      const sz = Math.max(imgData.width, imgData.height);
      const targets = [500, 400, 300, 250, 200, 160, 130, 100];
      for (const target of targets) {
        if (sz <= target * 1.2) continue;
        const ds = czQR._rd_downscaleTo(imgData, target);
        if (!ds) continue;
        // Find finders + alignment in downscaled image (dots merged into solid patterns)
        const dsBm = czQR._rd_binarize(ds, 0);
        // Try standard detection, then with dilation/blur if it fails
        const bmVariants = [dsBm];
        for (const dr of [2, 3, 5]) {
          try { bmVariants.push(czQR._rd_dilate(dsBm, dr)); } catch {}
        }
        // Also try blur-based binarization of downscaled
        for (const br of [2, 3]) {
          try { bmVariants.push(czQR._rd_binarize(ds, br)); } catch {}
        }
        for (const tryBm of bmVariants) {
          const fp = czQR._rd_findFinderPatterns(tryBm);
          if (!fp) continue;
          // Try with and without alignment refinement
          for (const skipAlign of [false, true]) {
            const { version, transform: dsTransform } = czQR._rd_extractGrid(tryBm, fp, skipAlign);
            if (!dsTransform || version < 1 || version > 40) continue;
            const mc = version * 4 + 17;
            // Scale transform coordinates back to original resolution
            const sx = imgData.width / ds.width, sy = imgData.height / ds.height;
            const origTransform = (gc, gr) => {
              const p = dsTransform(gc, gr);
              return { x: p.x * sx, y: p.y * sy };
            };
            // Try both area and single-pixel sampling from original
            for (const areaR of [1, 0, 2]) {
              const grid = areaR > 0
                ? czQR._rd_sampleGridArea(origBm, origTransform, mc, areaR)
                : czQR._rd_sampleGrid(origBm, origTransform, mc);
              const fmt = czQR._rd_readFormatInfo(grid, mc);
              if (!fmt) continue;
              let ver = version;
              if (version >= 7) { const pv = czQR._rd_readVersionInfo(grid, mc); if (pv) ver = pv; }
              czQR._rd_unmaskInPlace(grid, fmt.maskPattern, mc);
              const bits = czQR._rd_readDataBits(grid, mc, ver);
              const decoded = czQR._rd_decodePayload(bits, ver, fmt.ecLevel);
              if (decoded !== null) {
                // Scale finder pattern points back to original resolution
                const scaledFp = fp.map(p => ({ x: p.x * sx, y: p.y * sy, estModuleSize: p.estModuleSize * sx, n: p.n }));
                return { data: decoded, version: ver, ecLevel: fmt.ecLevelChar, points: scaledFp, format: 'qr', type: '2d' };
              }
            }
          }
        }
        // Fallback: also try full decode from downscaled only
        r = czQR._rd_tryDecode(ds);
        if (r) return r;
      }
    }
    // Fallback: try 1D barcode if QR decoding failed
    const bcResult = czQR._bc_scanImage(imgData);
    if (bcResult) return bcResult;
    return null;
  }

  /** @internal Full decode pipeline */
  static _rd_tryDecode(imgData) {
    try {
      // tryDecode
      const bm = czQR._rd_binarize(imgData, 0);
      const bmGlobal = czQR._rd_binarizeGlobal(imgData);
      // Each entry: [bitmap, imgDataForDirectSampling, label]
      const bitmaps = [[bm, imgData, 'adaptive']];
      if (bmGlobal) bitmaps.push([bmGlobal, imgData, 'global']);
      
      // Also try padded versions
      const pad = Math.max(12, Math.round(Math.min(imgData.width, imgData.height) * 0.1));
      const pw = imgData.width + pad * 2, ph = imgData.height + pad * 2;
      const padData = new ImageData(pw, ph);
      for (let i = 0; i < padData.data.length; i += 4) { padData.data[i] = padData.data[i+1] = padData.data[i+2] = 255; padData.data[i+3] = 255; }
      for (let y = 0; y < imgData.height; y++) for (let x = 0; x < imgData.width; x++) {
        const si = (y * imgData.width + x) * 4, di = ((y + pad) * pw + x + pad) * 4;
        padData.data[di] = imgData.data[si]; padData.data[di+1] = imgData.data[si+1];
        padData.data[di+2] = imgData.data[si+2]; padData.data[di+3] = imgData.data[si+3];
      }
      const bmPad = czQR._rd_binarize(padData, 0);
      const bmPadG = czQR._rd_binarizeGlobal(padData);
      bitmaps.push([bmPad, padData, 'pad-adaptive']);
      if (bmPadG) bitmaps.push([bmPadG, padData, 'pad-global']);
      
      for (const [curBm, curImgData, label] of bitmaps) {
      const fp = czQR._rd_findFinderPatterns(curBm);
      if (!fp) { continue; }
      const [tl, tr, bl] = fp;

      const ms = (tl.estModuleSize + tr.estModuleSize + bl.estModuleSize) / 3;
      const dtx = tr.x-tl.x, dty = tr.y-tl.y, dbx = bl.x-tl.x, dby = bl.y-tl.y;
      const distTR = Math.sqrt(dtx*dtx + dty*dty), distBL = Math.sqrt(dbx*dbx + dby*dby);
      const dim = Math.round((distTR + distBL) / 2 / ms) + 7;
      const baseVer = Math.round((dim - 17) / 4);


      const versionCandidates = [baseVer];
      for (const off of [1, -1, 2, -2]) {
        const v = baseVer + off;
        if (v >= 1 && v <= 40 && !versionCandidates.includes(v)) versionCandidates.push(v);
      }

      for (const ver of versionCandidates) {
        const mc = ver * 4 + 17;
        for (const skipAlign of [false, true]) {
          let brx = tr.x + bl.x - tl.x, bry = tr.y + bl.y - tl.y;
          let brModX = mc - 3.5, brModY = mc - 3.5;
          let alignFound = false;
          if (ver >= 2 && !skipAlign) {
            const ap = czQR._PATTERN_POSITION_TABLE[ver - 1];
            if (ap && ap.length >= 2) {
              const last = ap[ap.length - 1];
              const fx = (last - 3.5) / (mc - 7), fy = fx;
              const eax = tl.x + dtx*fx + dbx*fy, eay = tl.y + dty*fx + dby*fy;
              const sr = Math.ceil(ms * 4); let bestD = sr*sr+1, bestX = 0, bestY = 0, found = false;
              for (let dy = -sr; dy <= sr; dy++) for (let dx = -sr; dx <= sr; dx++) {
                const px = Math.floor(eax+dx), py = Math.floor(eay+dy);
                if (px >= 0 && px < curBm.width && py >= 0 && py < curBm.height && curBm.data[py*curBm.width+px]) {
                  const d = dx*dx+dy*dy; if (d < bestD) { bestD = d; bestX = px; bestY = py; found = true; }
                }
              }
              if (found) {
                brx = bestX; bry = bestY;
                brModX = mc - 6.5; brModY = mc - 6.5;
                alignFound = true;
              }
            }
          }
          const transform = czQR._rd_perspectiveTransform(
            {x: 3.5, y: 3.5}, {x: mc-3.5, y: 3.5},
            {x: brModX, y: brModY}, {x: 3.5, y: mc-3.5},
            tl, tr, {x: brx, y: bry}, bl
          );



          // Try binary sampling
          const grid = czQR._rd_sampleGrid(curBm, transform, mc);
          const fmt = czQR._rd_readFormatInfo(grid, mc);
          if (fmt) {
            let fv = ver;
            if (ver >= 7) { const pv = czQR._rd_readVersionInfo(grid, mc); if (pv) fv = pv; }
            const gCopy = grid.map(r => [...r]);
            czQR._rd_unmaskInPlace(gCopy, fmt.maskPattern, mc);
            const bits = czQR._rd_readDataBits(gCopy, mc, fv);
            const decoded = czQR._rd_decodePayload(bits, fv, fmt.ecLevel);
            if (decoded !== null) {
                      const pts = label.startsWith('pad-') ? fp.map(p => ({ x: p.x - pad, y: p.y - pad, estModuleSize: p.estModuleSize, n: p.n })) : fp;
                      return { data: decoded, version: fv, ecLevel: fmt.ecLevelChar, points: pts, format: 'qr', type: '2d' };
                    }
          }

          // Try direct grayscale sampling
          const grid2 = czQR._rd_sampleGridDirect(curImgData, transform, mc);
          if (grid2) {
            const fmt2 = czQR._rd_readFormatInfo(grid2, mc);
            if (fmt2) {
              let fv = ver;
              if (ver >= 7) { const pv = czQR._rd_readVersionInfo(grid2, mc); if (pv) fv = pv; }
              const gCopy2 = grid2.map(r => [...r]);
              czQR._rd_unmaskInPlace(gCopy2, fmt2.maskPattern, mc);
              const bits = czQR._rd_readDataBits(gCopy2, mc, fv);
              const decoded = czQR._rd_decodePayload(bits, fv, fmt2.ecLevel);
              if (decoded !== null) {
                      const pts = label.startsWith('pad-') ? fp.map(p => ({ x: p.x - pad, y: p.y - pad, estModuleSize: p.estModuleSize, n: p.n })) : fp;
                      return { data: decoded, version: fv, ecLevel: fmt2.ecLevelChar, points: pts, format: 'qr', type: '2d' };
                    }
            }
          }
        }
      }
      } // end bitmaps loop
      return null;
    } catch (e) { console.error('[tryDecode] error:', e); return null; }
  }



  /** Binarize using Otsu's global threshold — better for small images where adaptive threshold fails */
  static _rd_binarizeGlobal(imgData) {
    const { width: w, height: h, data: px } = imgData;
    // Compute luminance
    const lum = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4, a = px[o + 3];
      if (a === 0) { lum[i] = 255; }
      else if (a === 255) { lum[i] = (px[o] * 77 + px[o+1] * 150 + px[o+2] * 29) >> 8; }
      else { const ia = 255 - a; lum[i] = (((px[o]*a+255*ia)/255)*77 + ((px[o+1]*a+255*ia)/255)*150 + ((px[o+2]*a+255*ia)/255)*29) >> 8; }
    }
    // Otsu
    const hist = new Uint32Array(256);
    for (let i = 0; i < lum.length; i++) hist[lum[i]]++;
    let sumAll = 0;
    for (let i = 0; i < 256; i++) sumAll += i * hist[i];
    let wB = 0, sumB = 0, bestVar = -1, bestT = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (wB === 0) continue;
      const wF = lum.length - wB; if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sumAll - sumB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > bestVar) { bestVar = v; bestT = t; }
    }
    const data = new Uint8Array(w * h);
    for (let i = 0; i < lum.length; i++) data[i] = lum[i] <= bestT ? 1 : 0;
    return { width: w, height: h, data };
  }

  // ── Binarization (adaptive threshold, with optional pre-blur for shaped modules) ──
  static _rd_binarize(imgData, blurRadius = 0) {
    const { width: w, height: h, data: px } = imgData;
    let lum = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4, a = px[o + 3];
      if (a === 0) { lum[i] = 255; } // fully transparent → white
      else if (a === 255) { lum[i] = (px[o] * 77 + px[o+1] * 150 + px[o+2] * 29) >> 8; }
      else { // semi-transparent: blend against white background
        const ia = 255 - a;
        const r = (px[o]*a + 255*ia) / 255, g = (px[o+1]*a + 255*ia) / 255, b = (px[o+2]*a + 255*ia) / 255;
        lum[i] = (r * 77 + g * 150 + b * 29) >> 8;
      }
    }

    // Box blur to close gaps between dot/diamond modules
    if (blurRadius > 0) {
      const r = blurRadius, bl = new Uint8Array(w * h);
      // Horizontal pass
      const tmp = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        let sum = 0, cnt = 0;
        for (let x = 0; x < Math.min(r, w); x++) { sum += lum[y * w + x]; cnt++; }
        for (let x = 0; x < w; x++) {
          if (x + r < w) { sum += lum[y * w + x + r]; cnt++; }
          if (x - r - 1 >= 0) { sum -= lum[y * w + x - r - 1]; cnt--; }
          tmp[y * w + x] = sum / cnt;
        }
      }
      // Vertical pass
      for (let x = 0; x < w; x++) {
        let sum = 0, cnt = 0;
        for (let y = 0; y < Math.min(r, h); y++) { sum += tmp[y * w + x]; cnt++; }
        for (let y = 0; y < h; y++) {
          if (y + r < h) { sum += tmp[(y + r) * w + x]; cnt++; }
          if (y - r - 1 >= 0) { sum -= tmp[(y - r - 1) * w + x]; cnt--; }
          bl[y * w + x] = (sum / cnt) | 0;
        }
      }
      lum = bl;
    }

    const BS = Math.max(8, Math.min(32, (Math.min(w, h) / 8) | 0));
    const nbx = Math.ceil(w / BS), nby = Math.ceil(h / BS);
    const blackPoints = new Float32Array(nbx * nby);
    const contrast = new Uint8Array(nbx * nby); // 1 = good contrast, 0 = low
    for (let by = 0; by < nby; by++) for (let bx = 0; bx < nbx; bx++) {
      let sum = 0, cnt = 0, mn = 255, mx = 0;
      const y1 = Math.min(h, (by + 1) * BS), x1 = Math.min(w, (bx + 1) * BS);
      for (let y = by * BS; y < y1; y++) for (let x = bx * BS; x < x1; x++) {
        const v = lum[y * w + x]; sum += v; cnt++; if (v < mn) mn = v; if (v > mx) mx = v;
      }
      const idx = by * nbx + bx;
      if (mx - mn > 24) {
        // Good contrast: use average as threshold
        blackPoints[idx] = (sum / cnt) | 0;
        contrast[idx] = 1;
      } else {
        // Low contrast: will be filled by propagation
        blackPoints[idx] = (mn >> 1); // fallback
        contrast[idx] = 0;
      }
    }
    // Neighbor threshold propagation for low-contrast blocks (jsQR/ZXing style)
    // Forward pass: propagate from top-left
    for (let by = 0; by < nby; by++) for (let bx = 0; bx < nbx; bx++) {
      const idx = by * nbx + bx;
      if (contrast[idx]) continue;
      let sum = 0, cnt = 0;
      // Average from neighboring blocks that have good contrast or already propagated
      if (by > 0) { sum += blackPoints[(by-1) * nbx + bx]; cnt++; }
      if (bx > 0) { sum += blackPoints[by * nbx + bx - 1]; cnt++; }
      if (by > 0 && bx > 0) { sum += blackPoints[(by-1) * nbx + bx - 1]; cnt++; }
      if (cnt > 0) blackPoints[idx] = (sum / cnt) | 0;
    }
    // Backward pass: propagate from bottom-right
    for (let by = nby - 1; by >= 0; by--) for (let bx = nbx - 1; bx >= 0; bx--) {
      const idx = by * nbx + bx;
      if (contrast[idx]) continue;
      let sum = blackPoints[idx], cnt = 1;
      if (by < nby-1) { sum += blackPoints[(by+1) * nbx + bx]; cnt++; }
      if (bx < nbx-1) { sum += blackPoints[by * nbx + bx + 1]; cnt++; }
      if (by < nby-1 && bx < nbx-1) { sum += blackPoints[(by+1) * nbx + bx + 1]; cnt++; }
      blackPoints[idx] = (sum / cnt) | 0;
    }
    // Apply thresholds with 5×5 block neighborhood smoothing
    const bits = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const bx = Math.min(nbx - 1, (x / BS) | 0), by = Math.min(nby - 1, (y / BS) | 0);
      let sum = 0, cnt = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = Math.max(0, Math.min(nbx - 1, bx + dx));
        const ny = Math.max(0, Math.min(nby - 1, by + dy));
        sum += blackPoints[ny * nbx + nx]; cnt++;
      }
      const t = sum / cnt;
      bits[y * w + x] = lum[y * w + x] <= t ? 1 : 0;
    }
    return { width: w, height: h, data: bits };
  }

  // ── Binary Morphological Dilation (square kernel, separable prefix-sum) ──
  // Expands dark pixels by `radius` to close gaps between dot/diamond/star modules
  static _rd_dilate(bm, radius) {
    const { width: w, height: h, data } = bm;
    const r = radius;
    // Horizontal pass: dilate each row via prefix sums
    const tmp = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const base = y * w;
      const pfx = new Uint16Array(w + 1);
      for (let x = 0; x < w; x++) pfx[x + 1] = pfx[x] + data[base + x];
      for (let x = 0; x < w; x++) {
        const lo = Math.max(0, x - r), hi = Math.min(w - 1, x + r);
        tmp[base + x] = (pfx[hi + 1] - pfx[lo]) > 0 ? 1 : 0;
      }
    }
    // Vertical pass: dilate each column via prefix sums
    const out = new Uint8Array(w * h);
    for (let x = 0; x < w; x++) {
      const pfx = new Uint16Array(h + 1);
      for (let y = 0; y < h; y++) pfx[y + 1] = pfx[y] + tmp[y * w + x];
      for (let y = 0; y < h; y++) {
        const lo = Math.max(0, y - r), hi = Math.min(h - 1, y + r);
        out[y * w + x] = (pfx[hi + 1] - pfx[lo]) > 0 ? 1 : 0;
      }
    }
    return { width: w, height: h, data: out };
  }

  // ── Finder Pattern Detection (1:1:3:1:1 ratio scan) ──
  static _rd_findFinderPatterns(bm) {
    const { width: w, height: h, data } = bm;
    const centers = [];
    const ok = (s) => {
      let t = 0; for (let i = 0; i < 5; i++) { if (!s[i]) return false; t += s[i]; }
      if (t < 7) return false;
      const m = t / 7, v = m * 0.5;
      return Math.abs(m - s[0]) < v && Math.abs(m - s[1]) < v && Math.abs(3*m - s[2]) < 3*v && Math.abs(m - s[3]) < v && Math.abs(m - s[4]) < v;
    };
    const crossV = (cx, cy, maxC, origT) => {
      const s = [0,0,0,0,0]; let y = cy;
      while (y >= 0 && data[y*w+cx]) { s[2]++; y--; } if (y < 0) return NaN;
      while (y >= 0 && !data[y*w+cx] && s[1] <= maxC) { s[1]++; y--; } if (y < 0 || s[1] > maxC) return NaN;
      while (y >= 0 && data[y*w+cx] && s[0] <= maxC) { s[0]++; y--; } if (s[0] > maxC) return NaN;
      y = cy + 1;
      while (y < h && data[y*w+cx]) { s[2]++; y++; } if (y === h) return NaN;
      while (y < h && !data[y*w+cx] && s[3] <= maxC) { s[3]++; y++; } if (y === h || s[3] > maxC) return NaN;
      while (y < h && data[y*w+cx] && s[4] <= maxC) { s[4]++; y++; } if (s[4] > maxC) return NaN;
      if (!ok(s)) return NaN;
      const tot = s[0]+s[1]+s[2]+s[3]+s[4];
      if (5 * Math.abs(tot - origT) >= 2 * origT) return NaN;
      return cy + (s[3]+s[4]-s[1]-s[0]) / 2;
    };
    const add = (cx, cy, ms) => {
      for (const c of centers) {
        if (Math.abs(c.x-cx) < ms*3 && Math.abs(c.y-cy) < ms*3) {
          c.x = (c.x*c.n+cx)/(c.n+1); c.y = (c.y*c.n+cy)/(c.n+1);
          c.estModuleSize = (c.estModuleSize*c.n+ms)/(c.n+1); c.n++; return;
        }
      }
      centers.push({ x: cx, y: cy, estModuleSize: ms, n: 1 });
    };
    const sc = [0,0,0,0,0];
    for (let row = 3; row < h - 3; row++) {
      sc.fill(0); let st = 0;
      for (let col = 0; col < w; col++) {
        if (data[row*w+col]) { if (st%2===1) st++; sc[st]++; }
        else {
          if (st%2===0) {
            if (st===4) {
              if (ok(sc)) {
                const tot = sc[0]+sc[1]+sc[2]+sc[3]+sc[4];
                const cj = col - sc[4] - sc[3] - sc[2]/2;
                const ci = crossV(Math.floor(cj), row, sc[2], tot);
                if (!isNaN(ci)) add(cj, ci, tot/7);
              }
              sc[0]=sc[2]; sc[1]=sc[3]; sc[2]=sc[4]; sc[3]=1; sc[4]=0; st=3;
            } else { st++; sc[st]++; }
          } else { sc[st]++; }
        }
      }
    }
    if (centers.length < 3) return null;
    centers.sort((a,b) => b.n - a.n);
    const top3 = centers.slice(0, 3);
    const dSq = (a,b) => (a.x-b.x)**2 + (a.y-b.y)**2;
    const d01 = dSq(top3[0], top3[1]), d12 = dSq(top3[1], top3[2]), d02 = dSq(top3[0], top3[2]);
    let tl, tr, bl;
    if (d01 >= d12 && d01 >= d02) { tl = top3[2]; tr = top3[0]; bl = top3[1]; }
    else if (d12 >= d01 && d12 >= d02) { tl = top3[0]; tr = top3[1]; bl = top3[2]; }
    else { tl = top3[1]; tr = top3[0]; bl = top3[2]; }
    if ((tr.x-tl.x)*(bl.y-tl.y) - (tr.y-tl.y)*(bl.x-tl.x) < 0) { const t = tr; tr = bl; bl = t; }
    return [tl, tr, bl];
  }

  // ── Grid Extraction & Perspective Transform ──
  static _rd_extractGrid(bm, finders, skipAlignRefine = false) {
    const [tl, tr, bl] = finders;
    const ms = (tl.estModuleSize + tr.estModuleSize + bl.estModuleSize) / 3;
    const dtx = tr.x-tl.x, dty = tr.y-tl.y, dbx = bl.x-tl.x, dby = bl.y-tl.y;
    const distTR = Math.sqrt(dtx*dtx + dty*dty), distBL = Math.sqrt(dbx*dbx + dby*dby);
    const dim = Math.round((distTR + distBL) / 2 / ms) + 7;
    const version = Math.round((dim - 17) / 4);
    if (version < 1 || version > 40) return { version: 0, transform: null };
    const mc = version * 4 + 17;
    let brx = tr.x + bl.x - tl.x, bry = tr.y + bl.y - tl.y;
    let brModX = mc - 3.5, brModY = mc - 3.5;
    // Refine BR using alignment pattern if possible (v2+)
    if (version >= 2 && !skipAlignRefine) {
      const ap = czQR._PATTERN_POSITION_TABLE[version - 1];
      if (ap && ap.length >= 2) {
        const last = ap[ap.length - 1];
        const fx = (last - 3.5) / (mc - 7), fy = fx;
        const eax = tl.x + dtx*fx + dbx*fy, eay = tl.y + dty*fx + dby*fy;
        const sr = Math.ceil(ms * 4); let bestD = sr*sr+1, bestX = 0, bestY = 0, found = false;
        for (let dy = -sr; dy <= sr; dy++) for (let dx = -sr; dx <= sr; dx++) {
          const px = Math.floor(eax+dx), py = Math.floor(eay+dy);
          if (px >= 0 && px < bm.width && py >= 0 && py < bm.height && bm.data[py*bm.width+px]) {
            const d = dx*dx+dy*dy; if (d < bestD) { bestD = d; bestX = px; bestY = py; found = true; }
          }
        }
        if (found) {
          brx = bestX; bry = bestY;
          brModX = mc - 6.5; brModY = mc - 6.5;
        }
      }
    }
    const transform = czQR._rd_perspectiveTransform(
      {x: 3.5, y: 3.5}, {x: mc-3.5, y: 3.5}, {x: brModX, y: brModY}, {x: 3.5, y: mc-3.5},
      tl, tr, {x: brx, y: bry}, bl
    );
    return { version, transform };
  }

  static _rd_sampleGrid(bm, transform, size) {
    const grid = [];
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        const p = transform(c + 0.5, r + 0.5);
        const x = Math.round(p.x), y = Math.round(p.y);
        row.push((x >= 0 && x < bm.width && y >= 0 && y < bm.height) ? bm.data[y * bm.width + x] : 0);
      }
      grid.push(row);
    }
    return grid;
  }

  /** Area-based grid sampling with majority vote (robust for dot/diamond modules) */
  static _rd_sampleGridArea(bm, transform, size, sampleR) {
    const grid = [];
    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        const p = transform(c + 0.5, r + 0.5);
        const cx = Math.round(p.x), cy = Math.round(p.y);
        let dark = 0, total = 0;
        for (let dy = -sampleR; dy <= sampleR; dy++) {
          for (let dx = -sampleR; dx <= sampleR; dx++) {
            const x = cx + dx, y = cy + dy;
            if (x >= 0 && x < bm.width && y >= 0 && y < bm.height) {
              dark += bm.data[y * bm.width + x];
              total++;
            }
          }
        }
        row.push(total > 0 && dark > total / 2 ? 1 : 0);
      }
      grid.push(row);
    }
    return grid;
  }

  /** Direct RGBA area-sampling with Otsu threshold — bypasses adaptive binarization for small QR codes */
  static _rd_sampleGridDirect(imgData, transform, mc) {
    const { width: w, height: h, data: px } = imgData;
    const getLum = (ix, iy) => {
      if (ix < 0 || ix >= w || iy < 0 || iy >= h) return -1;
      const o = (iy * w + ix) * 4, a = px[o + 3];
      if (a === 0) return 255;
      if (a === 255) return (px[o] * 77 + px[o+1] * 150 + px[o+2] * 29) >> 8;
      const ia = 255 - a;
      return (((px[o]*a+255*ia)/255)*77 + ((px[o+1]*a+255*ia)/255)*150 + ((px[o+2]*a+255*ia)/255)*29) >> 8;
    };
    // Step 1: compute average luminance per module using 5x5 sub-pixel sampling grid
    // Sample points within each module cell: offsets from 0.1 to 0.9 in module space
    const offsets = [0.2, 0.35, 0.5, 0.65, 0.8];
    const lums = [];
    for (let r = 0; r < mc; r++) {
      const row = [];
      for (let c = 0; c < mc; c++) {
        let sum = 0, cnt = 0;
        for (const oy of offsets) {
          for (const ox of offsets) {
            const p = transform(c + ox, r + oy);
            const l = getLum(Math.round(p.x), Math.round(p.y));
            if (l >= 0) { sum += l; cnt++; }
          }
        }
        row.push(cnt > 0 ? Math.round(sum / cnt) : 128);
      }
      lums.push(row);
    }
    // Step 2: Otsu's threshold
    const hist = new Uint32Array(256);
    const total = mc * mc;
    for (let r = 0; r < mc; r++) for (let c = 0; c < mc; c++) hist[lums[r][c]]++;
    let sumAll = 0;
    for (let i = 0; i < 256; i++) sumAll += i * hist[i];
    let wB = 0, sumB = 0, bestVar = -1, bestT = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (wB === 0) continue;
      const wF = total - wB; if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sumAll - sumB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > bestVar) { bestVar = v; bestT = t; }
    }
    // Step 3: binarize with Otsu threshold, try offsets for robustness
    for (const off of [0, -10, 10, -20, 20, -30, 30]) {
      const thresh = Math.max(0, Math.min(255, bestT + off));
      const grid = [];
      for (let r = 0; r < mc; r++) {
        const row = [];
        for (let c = 0; c < mc; c++) row.push(lums[r][c] <= thresh ? 1 : 0);
        grid.push(row);
      }
      const fmt = czQR._rd_readFormatInfo(grid, mc);
      if (fmt) return grid;
    }
    const grid = [];
    for (let r = 0; r < mc; r++) {
      const row = [];
      for (let c = 0; c < mc; c++) row.push(lums[r][c] <= bestT ? 1 : 0);
      grid.push(row);
    }
    return grid;
  }

  // ── Format Information (BCH-15,5) ──
  static _rd_readFormatInfo(grid, mc) {
    // Primary copy (all from top-left area):
    //   bits 0-5: rows 0-5, col 8
    //   bit 6: row 7, col 8
    //   bit 7: row 8, col 8
    //   bit 8: row 8, col 7
    //   bits 9-14: row 8, cols 5..0
    let b1 = 0;
    for (let i = 0; i < 6; i++) b1 |= (grid[i][8] ? 1 : 0) << i;
    b1 |= (grid[7][8] ? 1 : 0) << 6;
    b1 |= (grid[8][8] ? 1 : 0) << 7;
    b1 |= (grid[8][7] ? 1 : 0) << 8;
    for (let i = 0; i < 6; i++) b1 |= (grid[8][5-i] ? 1 : 0) << (9+i);
    // Secondary copy (split between top-right and bottom-left):
    //   bits 0-7: row 8, cols mc-1..mc-8
    //   bits 8-14: rows mc-7..mc-1, col 8
    let b2 = 0;
    for (let i = 0; i < 8; i++) b2 |= (grid[8][mc-1-i] ? 1 : 0) << i;
    for (let i = 0; i < 7; i++) b2 |= (grid[mc-7+i][8] ? 1 : 0) << (8+i);

    const G15 = 0x537, MASK = 0x5412;
    const tryDecode = (recv) => {
      let best = 16, val = -1;
      for (let d = 0; d < 32; d++) {
        let r = d << 10; for (let i = 4; i >= 0; i--) if (r & (1<<(i+10))) r ^= G15 << i;
        const exp = ((d << 10) | r) ^ MASK;
        let x = recv ^ exp, dist = 0; while (x) { dist += x & 1; x >>>= 1; }
        if (dist < best) { best = dist; val = d; }
      }
      return { val, dist: best };
    };
    const r1 = tryDecode(b1), r2 = tryDecode(b2);
    const best = r1.dist <= r2.dist ? r1 : r2;
    if (best.dist > 3) return null;
    const ecBits = best.val >> 3, ecMap = { 0:'M', 1:'L', 2:'H', 3:'Q' };
    const ch = ecMap[ecBits] || 'M';
    return { ecLevel: czQR._EC_INTERNAL[ch], ecLevelChar: ch, maskPattern: best.val & 7 };
  }

  // ── Version Information (BCH-18,6, for v7+) ──
  static _rd_readVersionInfo(grid, mc) {
    let b1 = 0, bi = 0;
    for (let j = mc-11; j <= mc-9; j++) for (let i = 0; i <= 5; i++) b1 |= (grid[i][j] ? 1 : 0) << bi++;
    let b2 = 0; bi = 0;
    for (let i = mc-11; i <= mc-9; i++) for (let j = 0; j <= 5; j++) b2 |= (grid[i][j] ? 1 : 0) << bi++;
    const G18 = 0x1F25;
    const tryDecode = (recv) => {
      let best = 19, ver = -1;
      for (let v = 7; v <= 40; v++) {
        let r = v << 12; for (let i = 5; i >= 0; i--) if (r & (1<<(i+12))) r ^= G18 << i;
        const exp = (v << 12) | r;
        let x = recv ^ exp, dist = 0; while (x) { dist += x & 1; x >>>= 1; }
        if (dist < best) { best = dist; ver = v; }
      }
      return { ver, dist: best };
    };
    const r1 = tryDecode(b1), r2 = tryDecode(b2);
    const best = r1.dist <= r2.dist ? r1 : r2;
    return best.dist <= 3 ? best.ver : null;
  }

  // ── Unmask data modules in-place ──
  static _rd_unmaskInPlace(grid, mask, mc) {
    const fn = Array.from({ length: mc }, () => new Uint8Array(mc));
    const mark = (r0,c0,h,w) => { for (let r=Math.max(0,r0); r<Math.min(mc,r0+h); r++) for (let c=Math.max(0,c0); c<Math.min(mc,c0+w); c++) fn[r][c]=1; };
    mark(0,0,9,9); mark(0,mc-8,9,8); mark(mc-8,0,8,9);
    for (let i = 8; i < mc-8; i++) { fn[6][i]=1; fn[i][6]=1; }
    fn[mc-8][8] = 1;
    const ver = (mc-17)/4;
    if (ver >= 2) {
      const ap = czQR._PATTERN_POSITION_TABLE[ver-1];
      if (ap) for (let i=0; i<ap.length; i++) for (let j=0; j<ap.length; j++) {
        if ((i===0&&j===0)||(i===0&&j===ap.length-1)||(i===ap.length-1&&j===0)) continue;
        mark(ap[i]-2, ap[j]-2, 5, 5);
      }
    }
    if (ver >= 7) { mark(0,mc-11,6,3); mark(mc-11,0,3,6); }
    const getMask = (r,c) => {
      switch(mask) {
        case 0: return (r+c)%2===0; case 1: return r%2===0; case 2: return c%3===0;
        case 3: return (r+c)%3===0; case 4: return ((r>>1)+((c/3)|0))%2===0;
        case 5: return (r*c)%2+(r*c)%3===0; case 6: return ((r*c)%2+(r*c)%3)%2===0;
        case 7: return ((r*c)%3+(r+c)%2)%2===0; default: return false;
      }
    };
    for (let r=0; r<mc; r++) for (let c=0; c<mc; c++) { if (!fn[r][c] && getMask(r,c)) grid[r][c] ^= 1; }
  }

  // ── Read data bits in zigzag order ──
  static _rd_readDataBits(grid, mc, version) {
    const fn = Array.from({ length: mc }, () => new Uint8Array(mc));
    const mark = (r0,c0,h,w) => { for (let r=Math.max(0,r0); r<Math.min(mc,r0+h); r++) for (let c=Math.max(0,c0); c<Math.min(mc,c0+w); c++) fn[r][c]=1; };
    mark(0,0,9,9); mark(0,mc-8,9,8); mark(mc-8,0,8,9);
    for (let i=8; i<mc-8; i++) { fn[6][i]=1; fn[i][6]=1; }
    fn[mc-8][8] = 1;
    if (version >= 2) {
      const ap = czQR._PATTERN_POSITION_TABLE[version-1];
      if (ap) for (let i=0; i<ap.length; i++) for (let j=0; j<ap.length; j++) {
        if ((i===0&&j===0)||(i===0&&j===ap.length-1)||(i===ap.length-1&&j===0)) continue;
        mark(ap[i]-2, ap[j]-2, 5, 5);
      }
    }
    if (version >= 7) { mark(0,mc-11,6,3); mark(mc-11,0,3,6); }
    const bits = []; let up = true;
    for (let col=mc-1; col>0; col-=2) {
      if (col===6) col--;
      for (let i=0; i<mc; i++) {
        const row = up ? mc-1-i : i;
        for (let j=0; j<2; j++) { const c = col-j; if (c>=0 && !fn[row][c]) bits.push(grid[row][c] ? 1 : 0); }
      }
      up = !up;
    }
    return bits;
  }

  // ── Decode payload (de-interleave, RS correct, mode decode) ──
  static _rd_decodePayload(bits, version, ecLevelInt) {
    const rsBlocks = czQR._rd_getRSBlocks(version, ecLevelInt);
    if (!rsBlocks) return null;
    let totalCW = 0; for (const b of rsBlocks) totalCW += b.totalCount;
    const cw = new Uint8Array(Math.min(totalCW, Math.floor(bits.length / 8)));
    for (let i = 0; i < cw.length; i++) { let v = 0; for (let k = 0; k < 8; k++) v = (v<<1)|(bits[i*8+k]||0); cw[i] = v; }

    // De-interleave (reverse of _createBytes)
    const blocks = []; for (let i = 0; i < rsBlocks.length; i++) blocks.push(new Uint8Array(rsBlocks[i].totalCount));
    let idx = 0;
    const maxDc = Math.max(...rsBlocks.map(b => b.dataCount));
    for (let i = 0; i < maxDc; i++) for (let j = 0; j < rsBlocks.length; j++) {
      if (i < rsBlocks[j].dataCount && idx < cw.length) blocks[j][i] = cw[idx++];
    }
    const maxEc = Math.max(...rsBlocks.map(b => b.totalCount - b.dataCount));
    for (let i = 0; i < maxEc; i++) for (let j = 0; j < rsBlocks.length; j++) {
      const ei = rsBlocks[j].dataCount + i;
      if (ei < rsBlocks[j].totalCount && idx < cw.length) blocks[j][ei] = cw[idx++];
    }

    // RS error correction per block
    const dataBytes = [];
    for (let i = 0; i < blocks.length; i++) {
      const ecLen = rsBlocks[i].totalCount - rsBlocks[i].dataCount;
      const corrected = czQR._rd_rsDecode(blocks[i], ecLen);
      if (!corrected) return null;
      for (let j = 0; j < rsBlocks[i].dataCount; j++) dataBytes.push(corrected[j]);
    }
    return czQR._rd_decodeModes(new Uint8Array(dataBytes), version);
  }

  static _rd_decodeModes(data, version) {
    let pos = 0;
    const read = (n) => { if (pos+n > data.length*8) return -1; let v=0; for (let i=0;i<n;i++) { v=(v<<1)|((data[pos>>3]>>(7-(pos&7)))&1); pos++; } return v; };
    const ccBits = (mode) => {
      if (version < 10) return mode===1?10:mode===2?9:mode===4?8:mode===8?8:0;
      if (version < 27) return mode===1?12:mode===2?11:mode===4?16:mode===8?10:0;
      return mode===1?14:mode===2?13:mode===4?16:mode===8?12:0;
    };
    let result = '';
    while (pos + 4 <= data.length * 8) {
      const mode = read(4); if (mode <= 0) break;
      if (mode === 7) { // ECI — variable-length designator
        const b = read(8);
        if (b >= 0) {
          if ((b & 0x80) === 0) { /* 1-byte ECI (0xxxxxxx), already read */ }
          else if ((b & 0xC0) === 0x80) { read(8); }   // 2-byte ECI (10xxxxxx + 8 bits)
          else if ((b & 0xE0) === 0xC0) { read(16); }  // 3-byte ECI (110xxxxx + 16 bits)
        }
        continue;
      }
      const cb = ccBits(mode); if (!cb) break;
      let cnt = read(cb); if (cnt < 0) break;
      if (mode === 1) { // Numeric
        while (cnt >= 3) { const v=read(10); if (v<0) return result; result+=String(v).padStart(3,'0'); cnt-=3; }
        if (cnt===2) { const v=read(7); if (v<0) return result; result+=String(v).padStart(2,'0'); }
        else if (cnt===1) { const v=read(4); if (v<0) return result; result+=String(v); }
      } else if (mode === 2) { // Alphanumeric
        const CS='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
        while (cnt >= 2) { const v=read(11); if (v<0) return result; result+=CS[(v/45)|0]+CS[v%45]; cnt-=2; }
        if (cnt===1) { const v=read(6); if (v<0) return result; result+=CS[v]; }
      } else if (mode === 4) { // Byte
        const bytes=[]; for (let i=0;i<cnt;i++) { const v=read(8); if (v<0) break; bytes.push(v); }
        try { result += new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); }
        catch { bytes.forEach(b => { result += String.fromCharCode(b); }); }
      } else if (mode === 8) { // Kanji
        for (let i=0;i<cnt;i++) {
          let v=read(13); if (v<0) break;
          let code = ((v>>8)*0xC0)+(v&0xFF); code += code < 0x1F00 ? 0x8140 : 0xC140;
          try { result += new TextDecoder('shift-jis').decode(new Uint8Array([(code>>8)&0xFF, code&0xFF])); }
          catch { result += '?'; }
        }
      }
    }
    return result;
  }

  // ── RS Block Static Helper ──
  static _rd_getRSBlocks(ver, ecLevel) {
    let ti; switch(ecLevel) { case 1:ti=0;break; case 0:ti=1;break; case 3:ti=2;break; case 2:ti=3;break; default:return null; }
    const rs = czQR._RS_BLOCK_TABLE[(ver-1)*4+ti]; if (!rs) return null;
    const list = [];
    for (let i=0; i<rs.length/3; i++) for (let j=0; j<rs[i*3]; j++) list.push({ totalCount: rs[i*3+1], dataCount: rs[i*3+2] });
    return list;
  }

  // ── GF(256) Helpers ──
  static _rd_gfMul(a, b) { return (a===0||b===0) ? 0 : czQR._gexp(czQR._glog(a)+czQR._glog(b)); }
  static _rd_gfInv(a) { return a===0 ? 0 : czQR._gexp(255-czQR._glog(a)); }

  // ── Reed-Solomon Decoder (Sugiyama / Extended Euclidean Algorithm) ──
  // Same algorithm as jsQR — finds error locator & evaluator simultaneously
  static _rd_rsDecode(received, ecLen) {
    const n = received.length, gm = czQR._rd_gfMul, gi = czQR._rd_gfInv;
    // Compute syndromes S_i = R(α^i) for i=0..ecLen-1
    const S = []; let hasErr = false;
    for (let i = 0; i < ecLen; i++) {
      let s = 0; for (let j = 0; j < n; j++) s = received[j] ^ (s===0 ? 0 : czQR._gexp(czQR._glog(s)+i));
      S.push(s); if (s) hasErr = true;
    }
    if (!hasErr) return received;

    // Syndrome polynomial S(x) = S_0 + S_1*x + ... + S_{ecLen-1}*x^{ecLen-1}
    // Extended Euclidean: find gcd of x^ecLen and S(x)
    // Initialize: rLast = x^ecLen, r = S(x), tLast = 0, t = 1
    const t = ecLen >> 1; // max correctable errors

    // Polynomial representation: array of coefficients, index 0 = highest degree
    // rLast = x^ecLen = [1, 0, 0, ..., 0] (ecLen+1 terms)
    let rLast = new Array(ecLen + 1).fill(0); rLast[0] = 1;
    // r = S(x) — reverse S so index 0 = highest degree coefficient
    let r = new Array(ecLen).fill(0);
    for (let i = 0; i < ecLen; i++) r[ecLen - 1 - i] = S[i];
    // Remove leading zeros from r
    while (r.length > 1 && r[0] === 0) r = r.slice(1);

    let tLast = [0], tCur = [1];

    // Run Euclidean algorithm until degree of r < t
    while (r.length - 1 >= t) {
      let rLastLast = rLast, tLastLast = tLast;
      rLast = r; tLast = tCur;

      if (rLast[0] === 0) return null; // should not happen

      r = rLastLast.slice();
      const q = [];
      const dltInv = gi(rLast[0]);
      while (r.length >= rLast.length && r[0] !== 0) {
        const scale = gm(r[0], dltInv);
        q.push(scale);
        for (let i = 0; i < rLast.length; i++) r[i] ^= gm(rLast[i], scale);
        // Remove leading zeros
        while (r.length > 1 && r[0] === 0) r = r.slice(1);
      }
      // Pad q for alignment
      const degDiff = rLastLast.length - rLast.length;
      while (q.length < degDiff + 1) q.unshift(0);

      // t = tLastLast - q * tLast
      // Multiply q * tLast
      const qxT = new Array(q.length + tLast.length - 1).fill(0);
      for (let i = 0; i < q.length; i++) {
        if (q[i] === 0) continue;
        for (let j = 0; j < tLast.length; j++) {
          qxT[i + j] ^= gm(q[i], tLast[j]);
        }
      }
      // Subtract (XOR) from tLastLast
      tCur = new Array(Math.max(tLastLast.length, qxT.length)).fill(0);
      for (let i = 0; i < tLastLast.length; i++) tCur[tCur.length - tLastLast.length + i] ^= tLastLast[i];
      for (let i = 0; i < qxT.length; i++) tCur[tCur.length - qxT.length + i] ^= qxT[i];
      // Remove leading zeros
      while (tCur.length > 1 && tCur[0] === 0) tCur = tCur.slice(1);

      if (r.length - 1 >= rLast.length - 1) return null; // degree must decrease
    }

    // tCur = error locator polynomial σ(x), r = error evaluator polynomial ω(x)
    const sigma = tCur, omega = r;
    if (sigma.length === 0 || sigma[sigma.length - 1] === 0) return null;
    const numErrors = sigma.length - 1;
    if (numErrors > t) return null;

    // Normalize so σ(0) = 1 (i.e., constant term = 1)
    const sigmaZeroInv = gi(sigma[sigma.length - 1]);
    for (let i = 0; i < sigma.length; i++) sigma[i] = gm(sigma[i], sigmaZeroInv);
    for (let i = 0; i < omega.length; i++) omega[i] = gm(omega[i], sigmaZeroInv);

    // Find error positions by evaluating σ(α^{-i}) for i=0..n-1
    // σ(X_k^{-1}) = 0 where X_k = α^{n-1-e_k}, so roots are at α^{e_k-n+1}
    // Evaluating σ(α^{-i}): if zero, then α^{-i} = α^{e_k-n+1} → i = n-1-e_k
    const errPos = [];
    for (let i = 0; i < n; i++) {
      // Evaluate σ(α^{-i}): Horner's method with x = α^{255-i} = α^{-i}
      const alphaMinusI = (i === 0) ? 1 : czQR._gexp(255 - i);
      let val = sigma[0];
      for (let j = 1; j < sigma.length; j++) {
        val = gm(val, alphaMinusI) ^ sigma[j];
      }
      if (val === 0) errPos.push(n - 1 - i);
    }
    if (errPos.length !== numErrors) return null;

    // Forney algorithm for error magnitudes
    const out = new Uint8Array(received);
    for (let k = 0; k < errPos.length; k++) {
      const pos = errPos[k];
      const Xi = czQR._gexp((n - 1 - pos) % 255);
      const XiInv = gi(Xi);
      // Evaluate ω(XiInv): Horner's method
      let omVal = 0;
      for (let j = 0; j < omega.length; j++) {
        omVal = gm(omVal, XiInv) ^ omega[j];
      }
      // Evaluate σ'(XiInv) — formal derivative, only odd-degree terms survive in GF(2)
      // σ'(x) = σ_1 + σ_3*x^2 + σ_5*x^4 + ...
      // sigma[d-j] = σ_j, so σ_1 = sigma[d-1], σ_3 = sigma[d-3], etc.
      const d = sigma.length - 1;
      let sdVal = 0, xp = 1;
      for (let j = 1; j <= d; j += 2) {
        sdVal ^= gm(sigma[d - j], xp);
        xp = gm(xp, gm(XiInv, XiInv));
      }
      if (sdVal === 0) return null;
      const mag = gm(Xi, gm(omVal, gi(sdVal)));
      if (pos >= 0 && pos < n) out[pos] ^= mag;
    }
    return out;
  }

  // ════════════════════════════════════════════════════════════════════════
  // barcode-encode.js — 1D barcode generation
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Generate a 1D barcode.
   * @param {string} format - Barcode format: 'ean13','ean8','upca','code128','code39','itf'
   * @param {string} data - Data to encode
   * @param {Object} [options]
   * @param {number} [options.width=300] - Output width in pixels
   * @param {number} [options.height=100] - Output height in pixels  
   * @param {string} [options.lineColor='#000000'] - Bar color
   * @param {string} [options.background='#ffffff'] - Background color
   * @param {boolean} [options.showText=true] - Show human-readable text below bars
   * @param {number} [options.fontSize=14] - Text font size
   * @param {string} [options.fontFamily='monospace'] - Text font family
   * @param {number} [options.margin=10] - Quiet zone margin in pixels
   * @param {string} [options.output='svg'] - Output: 'svg'|'canvas'|'png'|'datauri'|'imgtag'
   * @returns {string|HTMLCanvasElement} - SVG string, data URI, or canvas element
   */
  static barcode(format, data, options = {}) {
    czQR._initMathTables();
    format = (format || '').toLowerCase();
    data = String(data);

    // Generate binary pattern (array of 0/1)
    let modules, text;
    switch (format) {
      case 'ean13': case czQR.BC_EAN13:
        ({ modules, text } = czQR._bc_encodeEAN13(data)); break;
      case 'ean8': case czQR.BC_EAN8:
        ({ modules, text } = czQR._bc_encodeEAN8(data)); break;
      case 'upca': case czQR.BC_UPCA:
        ({ modules, text } = czQR._bc_encodeUPCA(data)); break;
      case 'code128': case czQR.BC_CODE128:
        ({ modules, text } = czQR._bc_encodeCode128(data)); break;
      case 'code39': case czQR.BC_CODE39:
        ({ modules, text } = czQR._bc_encodeCode39(data)); break;
      case 'itf': case czQR.BC_ITF:
        ({ modules, text } = czQR._bc_encodeITF(data)); break;
      default:
        throw new Error(`Unsupported barcode format: ${format}`);
    }

    const output = (options.output || 'svg').toLowerCase();
    options._format = format;
    return czQR._bc_renderBarcode(modules, text, options, output);
  }

  // ── Shared: convert run-length table → module bits ──
  static _bc_runsToModules(runTable, startBit = 0) {
    return runTable.map(runs => {
      const m = [];
      for (let i = 0; i < runs.length; i++) {
        const bit = ((i % 2) === 0) ? startBit : (1 - startBit);
        for (let j = 0; j < runs[i]; j++) m.push(bit);
      }
      return m;
    });
  }

  // ── EAN-13 Encoding ──
  static _bc_encodeEAN13(data) {
    let digits = data.replace(/\D/g, '').split('').map(Number);
    if (digits.length === 12) digits.push(czQR._bc_calcEANCheck(digits));
    if (digits.length !== 13) throw new Error('EAN-13 requires exactly 12 or 13 digits');

    if (!czQR._EAN_L_MODS) {
      czQR._EAN_L_MODS = czQR._bc_runsToModules(czQR._EAN_L_TABLE);
      czQR._EAN_G_MODS = czQR._bc_runsToModules(czQR._EAN_G_TABLE);
      czQR._EAN_R_MODS = czQR._bc_runsToModules(czQR._EAN_R_TABLE, 1);
    }

    const parity = czQR._EAN_PARITY_TABLE[digits[0]];
    const m = [];
    m.push(1,0,1);
    for (let i = 0; i < 6; i++) {
      const table = parity[i] === 'L' ? czQR._EAN_L_MODS : czQR._EAN_G_MODS;
      m.push(...table[digits[i + 1]]);
    }
    m.push(0,1,0,1,0);
    for (let i = 0; i < 6; i++) m.push(...czQR._EAN_R_MODS[digits[i + 7]]);
    m.push(1,0,1);

    return { modules: m, text: digits.join('') };
  }

  // ── EAN-8 Encoding ──
  static _bc_encodeEAN8(data) {
    let digits = data.replace(/\D/g, '').split('').map(Number);
    if (digits.length === 7) digits.push(czQR._bc_calcEANCheck(digits));
    if (digits.length !== 8) throw new Error('EAN-8 requires exactly 7 or 8 digits');

    if (!czQR._EAN_L_MODS) {
      czQR._EAN_L_MODS = czQR._bc_runsToModules(czQR._EAN_L_TABLE);
      czQR._EAN_R_MODS = czQR._bc_runsToModules(czQR._EAN_R_TABLE, 1);
    }

    const m = [];
    m.push(1,0,1);
    for (let i = 0; i < 4; i++) m.push(...czQR._EAN_L_MODS[digits[i]]);
    m.push(0,1,0,1,0);
    for (let i = 0; i < 4; i++) m.push(...czQR._EAN_R_MODS[digits[i + 4]]);
    m.push(1,0,1);

    return { modules: m, text: digits.join('') };
  }

  // ── UPC-A Encoding (EAN-13 with leading 0) ──
  static _bc_encodeUPCA(data) {
    let digits = data.replace(/\D/g, '');
    if (digits.length < 11 || digits.length > 12) throw new Error('UPC-A requires exactly 11 or 12 digits');
    if (digits.length === 11) digits = '0' + digits;
    else if (digits.length === 12) digits = '0' + digits.substring(0, 11);
    else digits = '0' + digits;
    const result = czQR._bc_encodeEAN13(digits);
    result.text = data.replace(/\D/g, '').padStart(11, '0');
    if (result.text.length === 11) result.text += czQR._bc_calcEANCheck(('0' + result.text).split('').map(Number));
    return result;
  }

  // ── Code-128 Encoding ──
  static _bc_encodeCode128(data) {
    if (!data || data.length === 0) throw new Error('Code-128 requires at least 1 character');
    if (data.length > 80) throw new Error('Code-128 data too long (max 80 characters)');

    const allDigits = /^\d+$/.test(data) && data.length % 2 === 0;
    let startCode, values;

    if (allDigits && data.length >= 4) {
      startCode = 105;
      values = [startCode];
      for (let i = 0; i < data.length; i += 2) {
        values.push(parseInt(data.substring(i, i + 2), 10));
      }
    } else {
      startCode = 104;
      values = [startCode];
      for (let i = 0; i < data.length; i++) {
        const code = data.charCodeAt(i) - 32;
        if (code < 0 || code > 95) throw new Error(`Code-128 cannot encode character: '${data[i]}' (ASCII ${data.charCodeAt(i)}). Valid range: ASCII 32-127`);
        values.push(code);
      }
    }

    let checksum = values[0];
    for (let i = 1; i < values.length; i++) checksum += values[i] * i;
    checksum = checksum % 103;
    values.push(checksum);

    const m = [];
    for (const v of values) {
      const pattern = czQR._C128_PATTERNS[v];
      for (let i = 0; i < pattern.length; i++) {
        const barWidth = pattern[i];
        const isBar = (i % 2 === 0);
        for (let j = 0; j < barWidth; j++) m.push(isBar ? 1 : 0);
      }
    }
    const stop = [2,3,3,1,1,1,2];
    for (let i = 0; i < stop.length; i++) {
      const isBar = (i % 2 === 0);
      for (let j = 0; j < stop[i]; j++) m.push(isBar ? 1 : 0);
    }

    return { modules: m, text: data };
  }

  // ── Code-39 Encoding ──
  static _bc_encodeCode39(data) {
    if (!data || data.length === 0) throw new Error('Code-39 requires at least 1 character');
    if (data.length > 43) throw new Error('Code-39 data too long (max 43 characters)');
    data = data.toUpperCase();

    const charToBits = {};
    for (const [bits, ch] of Object.entries(czQR._C39_PATTERNS)) {
      charToBits[ch] = parseInt(bits);
    }

    // Validate all characters before encoding
    for (const ch of data) {
      if (charToBits[ch] === undefined) throw new Error(`Code-39 cannot encode: '${ch}'. Valid: A-Z, 0-9, - . $ / + % SPACE`);
    }

    const encodeChar = (pattern) => {
      const mods = [];
      for (let i = 0; i <= 8; i++) {
        const isWide = (pattern >> i) & 1;
        const isBar = (i % 2 === 0);
        const w = isWide ? 3 : 1;
        for (let j = 0; j < w; j++) mods.push(isBar ? 1 : 0);
      }
      return mods;
    };

    const chars = ['*', ...data.split(''), '*'];
    const m = [];
    for (let i = 0; i < chars.length; i++) {
      m.push(...encodeChar(charToBits[chars[i]]));
      if (i < chars.length - 1) m.push(0);
    }

    return { modules: m, text: data };
  }

  // ── ITF-14 Encoding (Interleaved 2 of 5, 14 digits standard) ──
  static _bc_encodeITF(data) {
    let digits = data.replace(/\D/g, '');
    if (digits.length > 14) throw new Error('ITF-14 supports max 14 digits');
    
    // Pad to 13 data digits + auto check digit
    digits = digits.padStart(13, '0');
    if (digits.length === 13) {
      digits += czQR._bc_calcITFCheck(digits);
    } else if (digits.length === 14) {
      // Verify existing check digit
      const expected = czQR._bc_calcITFCheck(digits.substring(0, 13));
      if (parseInt(digits[13]) !== expected) {
        // Replace with correct check digit
        digits = digits.substring(0, 13) + expected;
      }
    }

    const m = [];
    // Start: narrow black, narrow white, narrow black, narrow white
    m.push(1,0,1,0);

    for (let i = 0; i < digits.length; i += 2) {
      const d1 = parseInt(digits[i]);
      const d2 = parseInt(digits[i + 1]);
      const bars = czQR._ITF_PATTERNS[d1];
      const spaces = czQR._ITF_PATTERNS[d2];
      for (let j = 0; j < 5; j++) {
        const bw = bars[j] === 'W' ? 3 : 1;
        for (let k = 0; k < bw; k++) m.push(1); // bar
        const sw = spaces[j] === 'W' ? 3 : 1;
        for (let k = 0; k < sw; k++) m.push(0); // space
      }
    }

    // Stop: wide black, narrow white, narrow black
    m.push(1,1,1,0,1);

    return { modules: m, text: digits };
  }

  // ── ITF Mod-10 Check Digit ──
  static _bc_calcITFCheck(digits) {
    const d = digits.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < d.length; i++) {
      sum += d[i] * ((d.length - i) % 2 === 0 ? 1 : 3);
    }
    return (10 - (sum % 10)) % 10;
  }

  // ── EAN Check Digit Calculator ──
  static _bc_calcEANCheck(digits) {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * ((digits.length - i) % 2 === 0 ? 1 : 3);
    }
    return (10 - (sum % 10)) % 10;
  }

  // ── Barcode Renderer ──
  static _bc_renderBarcode(modules, text, options, output) {
    const w = options.width || 300;
    const h = options.height || 100;
    const fg = options.lineColor || '#000000';
    const bg = options.background || '#ffffff';
    const showText = options.showText !== false;
    const fontSize = options.fontSize || 14;
    const fontFamily = options.fontFamily || 'monospace';
    const margin = options.margin != null ? options.margin : 10;
    const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    const fmt = options._format || '';
    const isEAN13 = (fmt === 'ean13' || fmt === 'upca');
    const isEAN8 = (fmt === 'ean8');
    const isEAN = isEAN13 || isEAN8;

    const textH = showText ? fontSize + 4 : 0;
    const barArea = h - textH;
    const guardExt = isEAN ? Math.round(textH * 0.6) : 0;
    // Module width: default 2px (like JsBarcode), or fit to width
    const barW = options.moduleWidth || 2;
    const barcodeW = barW * modules.length;
    const autoW = options.width ? w : barcodeW + margin * 2;
    const offX = Math.floor((autoW - barcodeW) / 2); // center

    if (output === 'svg') {
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${autoW}" height="${h}" shape-rendering="crispEdges">`;
      svg += `<rect width="${autoW}" height="${h}" fill="${bg}"/>`;

      if (isEAN) {
        const nLeft = isEAN13 ? 42 : 28;
        const guardIndices = new Set();
        for (let i = 0; i < 3; i++) guardIndices.add(i);
        const cStart = 3 + nLeft;
        for (let i = 0; i < 5; i++) guardIndices.add(cStart + i);
        for (let i = modules.length - 3; i < modules.length; i++) guardIndices.add(i);

        for (let i = 0; i < modules.length; i++) {
          if (modules[i]) {
            const bh = guardIndices.has(i) ? barArea + guardExt : barArea;
            svg += `<rect x="${offX + i * barW}" y="0" width="${barW}" height="${bh}" fill="${fg}"/>`;
          }
        }

        if (showText) {
          const ty = h - 1;
          const ts = `font-family="${fontFamily}" font-size="${fontSize}" fill="${fg}"`;
          if (isEAN13) {
            svg += `<text x="${offX - 2}" y="${ty}" ${ts} text-anchor="end">${text[0]}</text>`;
            svg += `<text x="${offX + (3 + nLeft / 2) * barW}" y="${ty}" ${ts} text-anchor="middle">${esc(text.substring(1, 7))}</text>`;
            svg += `<text x="${offX + (3 + nLeft + 5 + nLeft / 2) * barW}" y="${ty}" ${ts} text-anchor="middle">${esc(text.substring(7, 13))}</text>`;
          } else {
            svg += `<text x="${offX + (3 + nLeft / 2) * barW}" y="${ty}" ${ts} text-anchor="middle">${esc(text.substring(0, 4))}</text>`;
            svg += `<text x="${offX + (3 + nLeft + 5 + nLeft / 2) * barW}" y="${ty}" ${ts} text-anchor="middle">${esc(text.substring(4, 8))}</text>`;
          }
        }
      } else {
        for (let i = 0; i < modules.length; i++) {
          if (modules[i]) {
            svg += `<rect x="${offX + i * barW}" y="0" width="${barW}" height="${barArea}" fill="${fg}"/>`;
          }
        }
        if (showText) {
          svg += `<text x="${autoW/2}" y="${h - 3}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" fill="${fg}">${esc(text)}</text>`;
        }
      }
      svg += '</svg>';
      return svg;
    }

    // Canvas-based rendering
    const canvas = document.createElement('canvas');
    canvas.width = autoW; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, autoW, h);
    ctx.fillStyle = fg;

    if (isEAN) {
      const nLeft = isEAN13 ? 42 : 28;
      const guardIndices = new Set();
      for (let i = 0; i < 3; i++) guardIndices.add(i);
      const cStart = 3 + nLeft;
      for (let i = 0; i < 5; i++) guardIndices.add(cStart + i);
      for (let i = modules.length - 3; i < modules.length; i++) guardIndices.add(i);

      for (let i = 0; i < modules.length; i++) {
        if (modules[i]) {
          const bh = guardIndices.has(i) ? barArea + guardExt : barArea;
          ctx.fillRect(offX + i * barW, 0, barW, bh);
        }
      }
      if (showText) {
        ctx.fillStyle = fg;
        ctx.font = `${fontSize}px ${fontFamily}`;
        const ty = h - 2;
        if (isEAN13) {
          ctx.textAlign = 'right';
          ctx.fillText(text[0], offX - 2, ty);
          ctx.textAlign = 'center';
          ctx.fillText(text.substring(1, 7), offX + (3 + nLeft / 2) * barW, ty);
          ctx.fillText(text.substring(7, 13), offX + (3 + nLeft + 5 + nLeft / 2) * barW, ty);
        } else {
          ctx.textAlign = 'center';
          ctx.fillText(text.substring(0, 4), offX + (3 + nLeft / 2) * barW, ty);
          ctx.fillText(text.substring(4, 8), offX + (3 + nLeft + 5 + nLeft / 2) * barW, ty);
        }
      }
    } else {
      for (let i = 0; i < modules.length; i++) {
        if (modules[i]) ctx.fillRect(offX + i * barW, 0, barW, barArea);
      }
      if (showText) {
        ctx.fillStyle = fg;
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(text, autoW / 2, h - 4);
      }
    }

    if (output === 'canvas') return canvas;
    if (output === 'png' || output === 'datauri') return canvas.toDataURL('image/png');
    if (output === 'imgtag') {
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      img.width = autoW; img.height = h;
      img.alt = text;
      return img;
    }
    return canvas;
  }

  // ════════════════════════════════════════════════════════════════════════
  // datamatrix-encode.js — Data Matrix ECC200 generation
  // Based on etiket reference (MIT) — rewritten for czQR
  // ════════════════════════════════════════════════════════════════════════

  // ── Symbol size table ──
  // [rows, cols, dataRegionRows, dataRegionCols, totalData, ecCW, blocks]
  static _DM_SIZES = [
    [10,10,8,8,3,5,1],[12,12,10,10,5,7,1],[14,14,12,12,8,10,1],
    [16,16,14,14,12,12,1],[18,18,16,16,18,14,1],[20,20,18,18,22,18,1],
    [22,22,20,20,30,20,1],[24,24,22,22,36,24,1],[26,26,24,24,44,28,1],
    [32,32,14,14,62,36,1],[36,36,16,16,86,42,1],[40,40,18,18,114,48,1],
    [44,44,20,20,144,56,1],[48,48,22,22,174,68,1],[52,52,24,24,204,84,2],
    [64,64,14,14,280,112,2],[72,72,16,16,368,144,4],[80,80,18,18,456,192,4],
    [88,88,20,20,576,224,4],[96,96,22,22,696,272,4],[104,104,24,24,816,336,6],
    [120,120,18,18,1050,408,6],[132,132,20,20,1304,496,8],[144,144,22,22,1558,620,10],
  ];

  // ── GF(256) tables (poly 301 = 0x12D) ──
  static _DM_EXP = null;
  static _DM_LOG = null;

  static _dm_initGF() {
    if (czQR._DM_EXP) return;
    const exp = new Uint8Array(512);
    const log = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      exp[i] = x;
      log[x] = i;
      x <<= 1;
      if (x >= 256) x ^= 0x12d;
    }
    for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
    czQR._DM_EXP = exp;
    czQR._DM_LOG = log;
  }

  // ── ASCII encoding ──
  static _dm_encodeASCII(text) {
    const cw = [];
    let i = 0;
    while (i < text.length) {
      const c = text.charCodeAt(i);
      if (c > 255) throw new Error(`Data Matrix: unsupported char U+${c.toString(16)}`);
      if (c >= 48 && c <= 57 && i + 1 < text.length) {
        const c2 = text.charCodeAt(i + 1);
        if (c2 >= 48 && c2 <= 57) {
          cw.push((c - 48) * 10 + (c2 - 48) + 130);
          i += 2;
          continue;
        }
      }
      if (c >= 128) { cw.push(235); cw.push(c - 127); }
      else cw.push(c + 1);
      i++;
    }
    return cw;
  }

  // ── Encoding values for C40/TEXT/X12 ──
  static _c40Value(ch) {
    if (ch === 32) return { set: 0, value: 3 };
    if (ch >= 48 && ch <= 57) return { set: 0, value: ch - 48 + 4 };
    if (ch >= 65 && ch <= 90) return { set: 0, value: ch - 65 + 14 };
    if (ch >= 0 && ch <= 31) return { set: 1, value: ch };
    if (ch >= 33 && ch <= 47) return { set: 2, value: ch - 33 };
    if (ch >= 58 && ch <= 64) return { set: 2, value: ch - 58 + 15 };
    if (ch >= 91 && ch <= 95) return { set: 2, value: ch - 91 + 22 };
    if (ch >= 96 && ch <= 127) return { set: 3, value: ch - 96 };
    return { set: -1, value: 0 };
  }

  static _textValue(ch) {
    if (ch === 32) return { set: 0, value: 3 };
    if (ch >= 48 && ch <= 57) return { set: 0, value: ch - 48 + 4 };
    if (ch >= 97 && ch <= 122) return { set: 0, value: ch - 97 + 14 };
    if (ch >= 0 && ch <= 31) return { set: 1, value: ch };
    if (ch >= 33 && ch <= 47) return { set: 2, value: ch - 33 };
    if (ch >= 58 && ch <= 64) return { set: 2, value: ch - 58 + 15 };
    if (ch >= 91 && ch <= 95) return { set: 2, value: ch - 91 + 22 };
    if (ch === 96) return { set: 3, value: 0 };
    if (ch >= 65 && ch <= 90) return { set: 3, value: ch - 65 + 1 };
    if (ch >= 123 && ch <= 127) return { set: 3, value: ch - 123 + 27 };
    return { set: -1, value: 0 };
  }

  static _x12Value(ch) {
    if (ch === 13) return { set: 0, value: 0 };
    if (ch === 42) return { set: 0, value: 1 };
    if (ch === 62) return { set: 0, value: 2 };
    if (ch === 32) return { set: 0, value: 3 };
    if (ch >= 48 && ch <= 57) return { set: 0, value: ch - 48 + 4 };
    if (ch >= 65 && ch <= 90) return { set: 0, value: ch - 65 + 14 };
    return { set: -1, value: 0 };
  }

  static _dm_triplet(a, b, c) {
    const v = a * 1600 + b * 40 + c + 1;
    return [Math.floor(v / 256), v % 256];
  }

  static _dm_encodeC40Text(text, latchCW, valueFn) {
    const values = [];
    const valueCharIndex = [];
    let fallbackFrom = text.length;

    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      const { set, value } = valueFn(ch);
      if (set === -1) {
        fallbackFrom = i;
        break;
      }
      if (set > 0) {
        values.push(set - 1);
        valueCharIndex.push(i);
        values.push(value);
        valueCharIndex.push(i);
      } else {
        values.push(value);
        valueCharIndex.push(i);
      }
    }

    const split = values.length - (values.length % 3);
    const head = [latchCW];
    for (let i = 0; i < split; i += 3) {
      head.push(...czQR._dm_triplet(values[i], values[i + 1], values[i + 2]));
    }
    const rest = values.slice(split);
    const asciiFrom = rest.length > 0 ? Math.min(valueCharIndex[split], fallbackFrom) : fallbackFrom;
    
    let shortest = head.slice();
    if (fallbackFrom >= text.length) {
      if (rest.length === 0) {
        // Fits exact
      } else if (rest.length === 2) {
        shortest.push(...czQR._dm_triplet(rest[0], rest[1], 0));
      } else if (asciiFrom === text.length - 1 && valueCharIndex[values.length - 2] !== asciiFrom) {
        shortest.push(...czQR._dm_encodeASCII(text.slice(asciiFrom)));
      } else {
        shortest.push(254);
        if (asciiFrom < text.length) shortest.push(...czQR._dm_encodeASCII(text.slice(asciiFrom)));
      }
    } else {
      shortest.push(254);
      if (asciiFrom < text.length) shortest.push(...czQR._dm_encodeASCII(text.slice(asciiFrom)));
    }
    return shortest;
  }

  static _dm_encodeC40(text) {
    return czQR._dm_encodeC40Text(text, 230, czQR._c40Value);
  }

  static _dm_encodeText(text) {
    return czQR._dm_encodeC40Text(text, 239, czQR._textValue);
  }

  static _dm_encodeX12(text) {
    if (text.length === 0 || text.length % 3 !== 0) return undefined;
    const values = [];
    for (let i = 0; i < text.length; i++) {
      const { set, value } = czQR._x12Value(text.charCodeAt(i));
      if (set === -1) return undefined;
      values.push(value);
    }
    const head = [238];
    for (let i = 0; i < values.length; i += 3) {
      head.push(...czQR._dm_triplet(values[i], values[i + 1], values[i + 2]));
    }
    head.push(254);
    return head;
  }

  static _dm_edifactQuads(values) {
    const codewords = [];
    for (let i = 0; i < values.length; i += 4) {
      const count = Math.min(4, values.length - i);
      const packed =
        ((values[i] || 0) << 18) |
        ((values[i + 1] || 0) << 12) |
        ((values[i + 2] || 0) << 6) |
        (values[i + 3] || 0);
      codewords.push((packed >> 16) & 0xff);
      if (count >= 2) codewords.push((packed >> 8) & 0xff);
      if (count >= 3) codewords.push(packed & 0xff);
    }
    return codewords;
  }

  static _dm_encodeEDIFACT(text) {
    if (text.length === 0) return undefined;
    const values = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 32 || code > 94) return undefined;
      values.push(code & 0x3f);
    }
    values.push(31); // unlatch
    return [240, ...czQR._dm_edifactQuads(values)];
  }

  static _dm_randomize255(value, position) {
    const pseudoRandom = ((149 * position) % 255) + 1;
    const result = value + pseudoRandom;
    return result <= 255 ? result : result - 256;
  }

  static _dm_encodeBase256(bytes, startPos = 1) {
    const data = Array.from(bytes);
    const codewords = [231];
    let position = startPos + 1;

    if (data.length < 250) {
      codewords.push(czQR._dm_randomize255(data.length, position++));
    } else {
      codewords.push(czQR._dm_randomize255(Math.floor(data.length / 250) + 249, position++));
      codewords.push(czQR._dm_randomize255(data.length % 250, position++));
    }

    for (const byte of data) {
      codewords.push(czQR._dm_randomize255(byte, position++));
    }

    return codewords;
  }

  static _dm_encodeECI(eci) {
    if (!Number.isInteger(eci) || eci < 0 || eci > 999999) {
      throw new Error("Data Matrix ECI assignment number must be 0-999999");
    }
    if (eci <= 126) return [241, eci + 1];
    if (eci <= 16382) {
      const value = eci - 127;
      return [241, Math.floor(value / 254) + 128, (value % 254) + 1];
    }
    const value = eci - 16383;
    return [
      241,
      Math.floor(value / 64516) + 192,
      (Math.floor(value / 254) % 254) + 1,
      (value % 254) + 1,
    ];
  }

  static _dm_optimizeEncoding(text) {
    const length = text.length;
    let hasNonLatin1 = false;
    for (let i = 0; i < length; i++) {
      if (text.codePointAt(i) > 0xff) {
        hasNonLatin1 = true; break;
      }
    }
    if (hasNonLatin1) {
      let encoder;
      if (typeof TextEncoder !== 'undefined') encoder = new TextEncoder();
      else if (typeof require !== 'undefined') encoder = new (require('util').TextEncoder)();
      if (encoder) {
        const bytes = encoder.encode(text);
        const eci = czQR._dm_encodeECI(26);
        return [...eci, ...czQR._dm_encodeBase256(bytes, eci.length + 1)];
      }
    }

    const MIXED_MODES = [
      { latch: 230, group: 3, emitted: 2 }, // C40
      { latch: 239, group: 3, emitted: 2 }, // Text
      { latch: 238, group: 3, emitted: 2 }, // X12
      { latch: 240, group: 4, emitted: 3 }, // EDIFACT
    ];
    const MIXED_STATES = 14;
    const MIXED_BASE = [1, 4, 7, 10];
    const UNREACHABLE = 1e9;

    function mixedState(mode, pending) { return MIXED_BASE[mode] + pending; }

    function mixedValues(mode, charCode) {
      if (mode === 2) {
        const { set, value } = czQR._x12Value(charCode);
        return set === -1 ? undefined : [value];
      }
      if (mode === 3) return charCode >= 32 && charCode <= 94 ? [charCode & 0x3f] : undefined;
      const { set, value } = mode === 0 ? czQR._c40Value(charCode) : czQR._textValue(charCode);
      if (set === -1) return undefined;
      return set > 0 ? [set - 1, value] : [value];
    }

    function asciiStep(txt, at) {
      const char = txt.charCodeAt(at);
      const next = at + 1 < txt.length ? txt.charCodeAt(at + 1) : -1;
      if (char >= 48 && char <= 57 && next >= 48 && next <= 57) return { cost: 1, advance: 2 };
      return { cost: char >= 128 ? 2 : 1, advance: 1 };
    }

    const cost = new Float64Array((length + 1) * MIXED_STATES).fill(UNREACHABLE);
    const from = new Int32Array((length + 1) * MIXED_STATES).fill(-1);
    cost[0] = 0;

    const relax = (at, state, total, advance, previous) => {
      const slot = at * MIXED_STATES + state;
      if (total >= cost[slot]) return;
      cost[slot] = total;
      from[slot] = (advance << 8) | previous;
    };

    for (let at = 0; at <= length; at++) {
      const base = at * MIXED_STATES;
      for (let round = 0; round < 2; round++) {
        const ascii = cost[base];
        for (let mode = 0; mode < MIXED_MODES.length; mode++) {
          if (ascii < UNREACHABLE) relax(at, mixedState(mode, 0), ascii + 1, 0, 0);
          const idle = cost[base + mixedState(mode, 0)];
          if (idle < UNREACHABLE) relax(at, 0, idle + 1, 0, mixedState(mode, 0));
        }
      }
      if (at === length) break;
      const charCode = text.charCodeAt(at);
      const ascii = cost[base];
      if (ascii < UNREACHABLE) {
        const { cost: step, advance } = asciiStep(text, at);
        relax(at + advance, 0, ascii + step, advance, 0);
      }
      for (let mode = 0; mode < MIXED_MODES.length; mode++) {
        const spec = MIXED_MODES[mode];
        const values = mixedValues(mode, charCode);
        if (!values) continue;
        for (let pending = 0; pending < spec.group; pending++) {
          const here = cost[base + mixedState(mode, pending)];
          if (here >= UNREACHABLE) continue;
          const held = pending + values.length;
          const total = here + Math.floor(held / spec.group) * spec.emitted;
          relax(at + 1, mixedState(mode, held % spec.group), total, 1, mixedState(mode, pending));
        }
      }
    }

    const build = (endState, terminate) => {
      if (cost[length * MIXED_STATES + endState] >= UNREACHABLE) return undefined;
      const route = new Array(length).fill(0);
      let at = length;
      let state = endState;
      while (from[at * MIXED_STATES + state] !== -1) {
        const packed = from[at * MIXED_STATES + state];
        const advance = packed >> 8;
        const previous = packed & 0xff;
        for (let i = at - advance; i < at; i++) route[i] = previous;
        at -= advance;
        state = previous;
      }

      const codewords = [];
      let head = 0;
      let edifact = false;
      let index = 0;
      while (index < length) {
        if (route[index] === 0) {
          const { advance } = asciiStep(text, index);
          codewords.push(...czQR._dm_encodeASCII(text.slice(index, index + advance)));
          index += advance;
          continue;
        }
        const mode = MIXED_BASE.findIndex(
          (start, i) => route[index] >= start && route[index] < start + MIXED_MODES[i].group
        );
        const spec = MIXED_MODES[mode];
        let end = index;
        while (
          end < length &&
          route[end] >= MIXED_BASE[mode] &&
          route[end] < MIXED_BASE[mode] + spec.group
        ) {
          end++;
        }

        const values = [];
        for (let i = index; i < end; i++) values.push(...mixedValues(mode, text.charCodeAt(i)));
        codewords.push(spec.latch);
        const last = end === length;
        if (spec.group === 3) {
          for (let i = 0; i < values.length; i += 3) {
            codewords.push(...czQR._dm_triplet(values[i], values[i + 1], values[i + 2]));
          }
          if (last) head = codewords.length;
          if (!last || terminate) codewords.push(254);
        } else {
          codewords.push(...czQR._dm_edifactQuads(values));
          if (last) { head = codewords.length; edifact = true; }
          if (!last || terminate) codewords.push(...czQR._dm_edifactQuads([31]));
        }
        index = end;
      }
      return { codewords, head, edifact };
    };

    const forms = [];
    const ascii = build(0, true);
    if (ascii) forms.push(ascii.codewords);
    for (let mode = 0; mode < MIXED_MODES.length; mode++) {
      const open = build(mixedState(mode, 0), false);
      if (open) forms.push(open.codewords);
    }
    if (forms.length === 0) return czQR._dm_encodeASCII(text);
    forms.sort((a, b) => a.length - b.length);
    return forms[0];
  }

  // ── Find smallest symbol ──
  static _dm_findSize(dataLen) {
    for (const s of czQR._DM_SIZES) {
      if (s[4] >= dataLen) return s;
    }
    return null;
  }

  // ── Pad data codewords ──
  static _dm_pad(cw, capacity) {
    if (cw.length < capacity) cw.push(129);
    while (cw.length < capacity) {
      const pos = cw.length + 1;
      const pr = ((149 * pos) % 253) + 1;
      let v = 129 + pr;
      if (v > 254) v -= 254;
      cw.push(v);
    }
  }

  // ── Reed-Solomon EC (roots a^1..a^n per ISO 16022) ──
  static _dm_rsEncode(data, ecCount) {
    const exp = czQR._DM_EXP, log = czQR._DM_LOG;
    const gen = new Array(ecCount + 1).fill(0);
    gen[0] = 1;
    for (let i = 1; i <= ecCount; i++) {
      for (let j = gen.length - 1; j >= 1; j--)
        gen[j] = gen[j - 1] ^ (gen[j] === 0 ? 0 : exp[(log[gen[j]] + i) % 255]);
      gen[0] = gen[0] === 0 ? 0 : exp[(log[gen[0]] + i) % 255];
    }
    const rem = new Array(ecCount).fill(0);
    for (const b of data) {
      const lead = b ^ rem[0];
      for (let j = 0; j < ecCount - 1; j++)
        rem[j] = rem[j + 1] ^ (lead === 0 ? 0 : exp[(log[lead] + log[gen[ecCount - 1 - j]]) % 255]);
      rem[ecCount - 1] = lead === 0 ? 0 : exp[(log[lead] + log[gen[0]]) % 255];
    }
    return rem;
  }

  // ── Interleaved EC ──
  static _dm_addEC(dataCW, ecTotal, blocks) {
    const ecPer = ecTotal / blocks;
    const result = new Array(ecTotal).fill(0);
    for (let b = 0; b < blocks; b++) {
      const block = [];
      for (let i = b; i < dataCW.length; i += blocks) block.push(dataCW[i]);
      const ec = czQR._dm_rsEncode(block, ecPer);
      for (let i = 0; i < ecPer; i++) result[i * blocks + b] = ec[i];
    }
    return [...dataCW, ...result];
  }

  // ── Placement map (ISO 16022 Annex M) ──
  static _dm_buildPlacementMap(nrow, ncol) {
    const total = nrow * ncol;
    const placed = new Int32Array(total).fill(-1);
    let bp = 0;

    function setMod(r, c, bp, bit) {
      if (r < 0) { r += nrow; c += 4 - ((nrow + 4) % 8); }
      if (c < 0) { c += ncol; r += 4 - ((ncol + 4) % 8); }
      if (r >= 0 && r < nrow && c >= 0 && c < ncol)
        placed[r * ncol + c] = bp + bit;
    }

    function utah(r, c, bp) {
      setMod(r-2,c-2,bp,0); setMod(r-2,c-1,bp,1);
      setMod(r-1,c-2,bp,2); setMod(r-1,c-1,bp,3); setMod(r-1,c,bp,4);
      setMod(r,c-2,bp,5);   setMod(r,c-1,bp,6);   setMod(r,c,bp,7);
      return bp + 8;
    }

    function corner1(bp) {
      setMod(nrow-1,0,bp,0); setMod(nrow-1,1,bp,1); setMod(nrow-1,2,bp,2);
      setMod(0,ncol-2,bp,3); setMod(0,ncol-1,bp,4);
      setMod(1,ncol-1,bp,5); setMod(2,ncol-1,bp,6); setMod(3,ncol-1,bp,7);
      return bp + 8;
    }
    function corner2(bp) {
      setMod(nrow-3,0,bp,0); setMod(nrow-2,0,bp,1); setMod(nrow-1,0,bp,2);
      setMod(0,ncol-4,bp,3); setMod(0,ncol-3,bp,4); setMod(0,ncol-2,bp,5);
      setMod(0,ncol-1,bp,6); setMod(1,ncol-1,bp,7);
      return bp + 8;
    }
    function corner3(bp) {
      setMod(nrow-3,0,bp,0); setMod(nrow-2,0,bp,1); setMod(nrow-1,0,bp,2);
      setMod(0,ncol-2,bp,3); setMod(0,ncol-1,bp,4);
      setMod(1,ncol-1,bp,5); setMod(2,ncol-1,bp,6); setMod(3,ncol-1,bp,7);
      return bp + 8;
    }
    function corner4(bp) {
      setMod(nrow-1,0,bp,0); setMod(nrow-1,ncol-1,bp,1);
      setMod(0,ncol-3,bp,2); setMod(0,ncol-2,bp,3); setMod(0,ncol-1,bp,4);
      setMod(1,ncol-3,bp,5); setMod(1,ncol-2,bp,6); setMod(1,ncol-1,bp,7);
      return bp + 8;
    }

    let row = 4, col = 0;
    while (row < nrow || col < ncol) {
      if (row === nrow && col === 0) bp = corner1(bp);
      if (row === nrow - 2 && col === 0 && ncol % 4 !== 0) bp = corner2(bp);
      if (row === nrow - 2 && col === 0 && ncol % 8 === 4) bp = corner3(bp);
      if (row === nrow + 4 && col === 2 && ncol % 8 === 0) bp = corner4(bp);
      // Sweep up-right
      while (row >= 0 && col < ncol) {
        if (row < nrow && col >= 0 && placed[row * ncol + col] === -1)
          bp = utah(row, col, bp);
        row -= 2; col += 2;
      }
      row += 1; col += 3;
      // Sweep down-left
      while (row < nrow && col >= 0) {
        if (row >= 0 && col < ncol && placed[row * ncol + col] === -1)
          bp = utah(row, col, bp);
        row += 2; col -= 2;
      }
      row += 3; col += 1;
    }
    // Fixed corner
    if (placed[(nrow - 1) * ncol + (ncol - 1)] === -1) {
      placed[(nrow - 1) * ncol + (ncol - 1)] = -2;
      placed[(nrow - 2) * ncol + (ncol - 2)] = -2;
    }
    return placed;
  }

  /**
   * Generate a Data Matrix ECC200 barcode.
   * @param {string} data - Data to encode
   * @param {Object} [options]
   * @param {number} [options.size=300] - Output pixel size
   * @param {string} [options.fg='#000000'] - Foreground color
   * @param {string} [options.bg='#ffffff'] - Background color
   * @param {number} [options.margin=1] - Quiet zone in modules
   * @param {string} [options.output='svg'] - 'svg'|'canvas'|'png'|'datauri'
   * @returns {string|HTMLCanvasElement}
   */
  static dataMatrix(data, options = {}) {
    czQR._dm_initGF();
    const text = String(data);
    const mode = (options.mode || 'auto').toLowerCase();
    let enc;
    if (mode === 'auto') {
      enc = czQR._dm_optimizeEncoding(text);
    } else if (mode === 'ascii') {
      enc = czQR._dm_encodeASCII(text);
    } else if (mode === 'c40') {
      enc = czQR._dm_encodeC40(text);
    } else if (mode === 'text') {
      enc = czQR._dm_encodeText(text);
    } else if (mode === 'x12') {
      enc = czQR._dm_encodeX12(text);
    } else if (mode === 'edifact') {
      enc = czQR._dm_encodeEDIFACT(text);
    } else if (mode === 'base256') {
      enc = czQR._dm_encodeBase256(text.split('').map(c => c.charCodeAt(0)));
    } else {
      enc = czQR._dm_optimizeEncoding(text);
    }
    const sym = czQR._dm_findSize(enc.length);
    if (!sym) throw new Error(`Data too long for Data Matrix (${enc.length} codewords)`);

    const [symR, symC, drR, drC, totalData, ecCW, blocks] = sym;
    const vRegs = symR / (drR + 2);
    const hRegs = symC / (drC + 2);
    const mapR = drR * vRegs;
    const mapC = drC * hRegs;

    // Pad & add EC
    czQR._dm_pad(enc, totalData);
    const allCW = czQR._dm_addEC(enc, ecCW, blocks);

    // Build placement map & fill mapping matrix
    const pmap = czQR._dm_buildPlacementMap(mapR, mapC);
    const mapping = Array.from({ length: mapR }, () => new Uint8Array(mapC));

    for (let r = 0; r < mapR; r++) {
      for (let c = 0; c < mapC; c++) {
        const bi = pmap[r * mapC + c];
        if (bi === -2) { mapping[r][c] = 1; continue; }
        if (bi >= 0) {
          const cwIdx = Math.floor(bi / 8);
          const bitOff = bi % 8;
          if (cwIdx < allCW.length)
            mapping[r][c] = (allCW[cwIdx] >> (7 - bitOff)) & 1;
        }
      }
    }

    // Build final matrix with finder patterns
    const matrix = Array.from({ length: symR }, () => new Uint8Array(symC));
    for (let vr = 0; vr < vRegs; vr++) {
      for (let hr = 0; hr < hRegs; hr++) {
        const sr = vr * (drR + 2);
        const sc = hr * (drC + 2);
        // Clock track: top alternating, right alternating
        for (let c = 0; c < drC + 2; c++) matrix[sr][sc + c] = (c % 2 === 0) ? 1 : 0;
        for (let r = 0; r < drR + 2; r++) matrix[sr + r][sc + drC + 1] = (r % 2 !== 0) ? 1 : 0;
        // L-shape finder: bottom solid, left solid (drawn after clock to override corners)
        for (let c = 0; c < drC + 2; c++) matrix[sr + drR + 1][sc + c] = 1;
        for (let r = 0; r < drR + 2; r++) matrix[sr + r][sc] = 1;
        // Data modules
        for (let dr = 0; dr < drR; dr++)
          for (let dc = 0; dc < drC; dc++)
            matrix[sr + 1 + dr][sc + 1 + dc] = mapping[vr * drR + dr][hr * drC + dc];
      }
    }

    // Render
    const size = options.size || 300;
    const fg = options.fg || '#000000';
    const bg = options.bg || '#ffffff';
    const margin = options.margin != null ? options.margin : 1;
    const output = (options.output || 'svg').toLowerCase();

    if (output === 'svg') return czQR._dm_renderSVG(matrix, symR, symC, size, fg, bg, margin);
    const canvas = czQR._dm_renderCanvas(matrix, symR, symC, size, fg, bg, margin);
    if (output === 'canvas') return canvas;
    if (output === 'png' || output === 'datauri') return canvas.toDataURL('image/png');
    return canvas;
  }

  // ── SVG renderer ──
  static _dm_renderSVG(matrix, rows, cols, size, fg, bg, margin) {
    const sx = cols + margin * 2;
    const sy = rows + margin * 2;
    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${sx} ${sy}" shape-rendering="crispEdges">`;
    if (bg !== 'transparent') svg += `<rect width="${sx}" height="${sy}" fill="${esc(bg)}"/>`;
    let d = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c]) d += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
    if (d) svg += `<path d="${d}" fill="${esc(fg)}"/>`;
    svg += '</svg>';
    return svg;
  }

  // ── Canvas renderer ──
  static _dm_renderCanvas(matrix, rows, cols, size, fg, bg, margin) {
    const sx = cols + margin * 2;
    const sy = rows + margin * 2;
    const ms = size / Math.max(sx, sy);
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (bg === 'transparent') ctx.clearRect(0, 0, size, size);
    else { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }
    ctx.fillStyle = fg;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (matrix[r][c])
          ctx.fillRect(Math.floor((c + margin) * ms), Math.floor((r + margin) * ms), Math.ceil(ms), Math.ceil(ms));
    return canvas;
  }

  // ════════════════════════════════════════════════════════════════════════
  // datamatrix-decode.js — Data Matrix ECC200 Decoder
  // ════════════════════════════════════════════════════════════════════════

  static decodeDataMatrix(matrix) {
    czQR._dm_initGF();
    const rows = matrix.length;
    if (rows === 0) return null;
    const cols = matrix[0].length;
    
    let symSize = null;
    for (const s of czQR._DM_SIZES) {
      if (s[0] === rows && s[1] === cols) { symSize = s; break; }
    }
    if (!symSize) throw new Error(`Unknown Data Matrix size: ${rows}x${cols}`);

    const [symR, symC, drR, drC, totalData, ecCW, blocks] = symSize;
    const vRegs = symR / (drR + 2);
    const hRegs = symC / (drC + 2);
    const mapR = drR * vRegs;
    const mapC = drC * hRegs;

    const mapping = Array.from({ length: mapR }, () => new Uint8Array(mapC));
    for (let vr = 0; vr < vRegs; vr++) {
      for (let hr = 0; hr < hRegs; hr++) {
        const sr = vr * (drR + 2);
        const sc = hr * (drC + 2);
        for (let dr = 0; dr < drR; dr++) {
          for (let dc = 0; dc < drC; dc++) {
            mapping[vr * drR + dr][hr * drC + dc] = matrix[sr + 1 + dr][sc + 1 + dc] ? 1 : 0;
          }
        }
      }
    }

    const pmap = czQR._dm_buildPlacementMap(mapR, mapC);
    const allCW = new Uint8Array(totalData + ecCW);
    
    for (let r = 0; r < mapR; r++) {
      for (let c = 0; c < mapC; c++) {
        const bi = pmap[r * mapC + c];
        if (bi >= 0) {
          const cwIdx = Math.floor(bi / 8);
          const bitOff = bi % 8;
          if (cwIdx < allCW.length) {
            allCW[cwIdx] |= (mapping[r][c] << (7 - bitOff));
          }
        }
      }
    }

    const dataCW = czQR._dm_rsDecodeInterleaved(allCW, totalData, ecCW, blocks);
    if (!dataCW) return null;

    // Strip padding: find actual data length
    // Padding starts with 129, followed by randomized pad values
    let dataLen = dataCW.length;
    for (let p = 0; p < dataCW.length; p++) {
      if (dataCW[p] === 129) {
        // Verify remaining are all padding
        let allPad = true;
        for (let q = p + 1; q < dataCW.length; q++) {
          const pos = q + 1;
          const pr = ((149 * pos) % 253) + 1;
          let expected = 129 + pr;
          if (expected > 254) expected -= 254;
          if (dataCW[q] !== expected) { allPad = false; break; }
        }
        if (allPad) { dataLen = p; break; }
      }
    }

    const result = czQR._dm_decodePayload(dataCW.slice(0, dataLen));
    return { data: result.text, modes: result.modes, symbol: symR + 'x' + symC };
  }

  static _dm_rsDecodeInterleaved(allCW, dataCWLen, ecCWLen, blocks) {
    const data = new Uint8Array(dataCWLen);
    const ecPerBlock = ecCWLen / blocks;
    const dataPerBlock = dataCWLen / blocks;
    
    for (let b = 0; b < blocks; b++) {
      const block = new Uint8Array(dataPerBlock + ecPerBlock);
      let idx = 0;
      for (let i = b; i < dataCWLen; i += blocks) block[idx++] = allCW[i];
      for (let i = b; i < ecCWLen; i += blocks) block[idx++] = allCW[dataCWLen + i];
      
      const corrected = czQR._dm_rsDecodeBlock(block, ecPerBlock);
      if (!corrected) return null;
      
      idx = 0;
      for (let i = b; i < dataCWLen; i += blocks) data[i] = corrected[idx++];
    }
    return data;
  }

  static _dm_rsDecodeBlock(block, ecCount) {
    const exp = czQR._DM_EXP, log = czQR._DM_LOG;
    const add = (a, b) => a ^ b;
    const mul = (a, b) => (a === 0 || b === 0) ? 0 : exp[(log[a] + log[b]) % 255];
    const inv = (a) => exp[255 - log[a]];
    
    const syn = new Uint8Array(ecCount);
    let hasError = false;
    for (let i = 0; i < ecCount; i++) {
      let s = 0;
      const root = exp[i + 1];
      for (let j = 0; j < block.length; j++) s = add(mul(s, root), block[j]);
      syn[i] = s;
      if (s !== 0) hasError = true;
    }
    
    if (!hasError) return block.slice(0, block.length - ecCount);
    
    let C = new Uint8Array(ecCount + 1); C[0] = 1;
    let B = new Uint8Array(ecCount + 1); B[0] = 1;
    let L = 0, m = 1;
    
    for (let k = 0; k < ecCount; k++) {
      let d = syn[k];
      for (let i = 1; i <= L; i++) d = add(d, mul(C[i], syn[k - i]));
      
      if (d === 0) {
        m++;
      } else {
        const T = new Uint8Array(ecCount + 1);
        for (let i = 0; i <= ecCount; i++) T[i] = C[i];
        for (let i = 0; i <= ecCount - m; i++) C[i + m] = add(C[i + m], mul(d, B[i]));
        if (2 * L <= k) {
          L = k + 1 - L;
          for (let i = 0; i <= ecCount; i++) B[i] = mul(T[i], inv(d));
          m = 1;
        } else {
          m++;
        }
      }
    }
    
    const errPoly = C.slice(0, L + 1);
    const errPos = [], errLoc = [];
    
    for (let i = 0; i < block.length; i++) {
      let sum = 0;
      const x = exp[(255 - (block.length - 1 - i) % 255) % 255];
      let xPower = 1;
      for (let j = 0; j <= L; j++) {
        sum = add(sum, mul(errPoly[j], xPower));
        xPower = mul(xPower, x);
      }
      if (sum === 0) {
        errPos.push(i);
        errLoc.push(exp[(block.length - 1 - i) % 255]);
      }
    }
    
    if (errPos.length !== L) return null;
    
    const omega = new Uint8Array(L);
    for (let i = 0; i < L; i++) {
      let s = 0;
      for (let j = 0; j <= i; j++) s = add(s, mul(errPoly[j], syn[i - j]));
      omega[i] = s;
    }
    
    const corrected = new Uint8Array(block);
    for (let i = 0; i < errPos.length; i++) {
      const xInv = exp[255 - log[errLoc[i]]];
      let num = 0, xPower = 1;
      for (let j = 0; j < L; j++) {
        num = add(num, mul(omega[j], xPower));
        xPower = mul(xPower, xInv);
      }
      let den = 0;
      for (let j = 1; j <= L; j += 2) {
        let p = 1;
        for (let k = 0; k < j - 1; k++) p = mul(p, xInv);
        den = add(den, mul(errPoly[j], p));
      }
      const mag = mul(errLoc[i], mul(num, inv(den)));
      corrected[errPos[i]] = add(corrected[errPos[i]], mag);
    }
    
    return corrected.slice(0, block.length - ecCount);
  }

  static _dm_decodePayload(dataCW) {
    let text = "";
    let mode = 0;
    let i = 0;
    const modes = new Set(['ASCII']);
    const MODE_NAMES = { 1: 'C40', 2: 'TEXT', 3: 'X12', 4: 'EDIFACT', 5: 'Base256' };
    
    const C2 = ["!","\"","#","$","%","&","'","(",")","*","+",",","-",".","/",":",";","<","=",">","?","@","[","\\","]","^","_"];
    const C3 = ["`",..."abcdefghijklmnopqrstuvwxyz".split(""),"{","|","}","~","\x7F"];
    const T3 = ["`",..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),"{","|","}","~","\x7F"];
    
    while (i < dataCW.length) {
      if (mode === 0) {
        const cw = dataCW[i++];
        if (cw >= 1 && cw <= 128) text += String.fromCharCode(cw - 1);
        else if (cw === 129) break;
        else if (cw >= 130 && cw <= 229) {
          const val = cw - 130;
          text += (val < 10 ? "0" : "") + val;
        } else if (cw === 230) { mode = 1; modes.add('C40'); }
        else if (cw === 231) { mode = 5; modes.add('Base256'); }
        else if (cw === 235) { if (i < dataCW.length) text += String.fromCharCode(dataCW[i++] - 1 + 128); }
        else if (cw === 238) { mode = 3; modes.add('X12'); }
        else if (cw === 239) { mode = 2; modes.add('TEXT'); }
        else if (cw === 240) { mode = 4; modes.add('EDIFACT'); }
        else if (cw === 241) i++;
      } else if (mode === 1 || mode === 2 || mode === 3) {
        let shift = 0;
        while (i < dataCW.length) {
          if (dataCW[i] === 254 || i === dataCW.length - 1) {
            if (dataCW[i] === 254) i++;
            mode = 0;
            break;
          }
          const val = (dataCW[i] * 256) + dataCW[i+1] - 1;
          const vals = [(val / 1600) | 0, ((val / 40) | 0) % 40, val % 40];
          i += 2;
          
          for (let j = 0; j < 3; j++) {
            const v = vals[j];
            if (mode === 1 || mode === 2) {
              if (shift === 0) {
                if (v <= 2) shift = v + 1;
                else if (v === 3) text += " ";
                else if (v <= 13) text += String.fromCharCode(v - 4 + 48);
                else if (v <= 39) text += String.fromCharCode(v - 14 + (mode === 1 ? 65 : 97));
              } else if (shift === 1) {
                text += String.fromCharCode(v); shift = 0;
              } else if (shift === 2) {
                if (v < 27) text += C2[v];
                shift = 0;
              } else if (shift === 3) {
                text += (mode === 1 ? C3 : T3)[v];
                shift = 0;
              }
            } else if (mode === 3) {
              if (v === 0) text += "\r";
              else if (v === 1) text += "*";
              else if (v === 2) text += ">";
              else if (v === 3) text += " ";
              else if (v <= 13) text += String.fromCharCode(v - 4 + 48);
              else if (v <= 39) text += String.fromCharCode(v - 14 + 65);
            }
          }
        }
      } else if (mode === 4) {
        while (i < dataCW.length) {
          if (dataCW[i] === 254) { mode = 0; i++; break; }
          let bits = 0;
          let count = 0;
          for (let k = 0; k < 3; k++) {
            if (i < dataCW.length) {
              bits = (bits << 8) | dataCW[i++];
              count++;
            } else {
              bits <<= 8;
            }
          }
          let chars = count === 3 ? 4 : (count === 2 ? 2 : 1);
          for (let b = 0; b < chars; b++) {
            let v = (bits >> (18 - b * 6)) & 0x3F;
            if (v === 0x1F) { mode = 0; break; }
            text += String.fromCharCode((v & 0x20) === 0 ? v + 64 : v);
          }
          if (mode === 0) break;
        }
      } else if (mode === 5) {
        let len = dataCW[i++];
        let pr = ((149 * i) % 255) + 1;
        let uLen = len - pr;
        if (uLen < 0) uLen += 256;
        if (uLen === 0) uLen = dataCW.length - i;
        else if (uLen > 249) {
          pr = ((149 * (i + 1)) % 255) + 1;
          let len2 = dataCW[i++] - pr;
          if (len2 < 0) len2 += 256;
          uLen = (uLen - 249) * 250 + len2;
        }
        for (let j = 0; j < uLen && i < dataCW.length; j++) {
          pr = ((149 * (i + 1)) % 255) + 1;
          let val = dataCW[i++] - pr;
          if (val < 0) val += 256;
          text += String.fromCharCode(val);
        }
        mode = 0;
      }
    }
    return { text, modes: [...modes] };
  }

  static readDataMatrix(imageData) {
    let bm;
    try { bm = czQR._rd_binarize(imageData, 0); } catch(e) { return null; }
    const { width: w, height: h, data } = bm;
    if (w < 12 || h < 12) return null;

    const get = (x, y) => (x >= 0 && x < w && y >= 0 && y < h) ? data[y * w + x] : 0;

    // Collect all solid horizontal dark runs (candidates for bottom finder edge)
    const candidates = [];
    for (let y = 0; y < h; y++) {
      let run = 0, sx = 0;
      for (let x = 0; x < w; x++) {
        if (data[y * w + x]) {
          if (run === 0) sx = x;
          run++;
        } else {
          if (run >= 8) candidates.push({ x1: sx, x2: x - 1, y, len: run });
          run = 0;
        }
      }
      if (run >= 8) candidates.push({ x1: sx, x2: w - 1, y, len: run });
    }

    // Sort by length descending — try longest runs first (more likely to be finder)
    candidates.sort((a, b) => b.len - a.len);

    // Try each candidate as the bottom edge of an L-finder
    const tried = new Set();
    for (const cand of candidates) {
      // Deduplicate similar candidates
      const key = Math.round(cand.x1 / 4) + ',' + Math.round(cand.y / 4);
      if (tried.has(key)) continue;
      tried.add(key);

      const res = czQR._dm_tryExtract(bm, cand.x1, cand.x2, cand.y, get);
      if (res) {
        try {
          const decoded = czQR.decodeDataMatrix(res.matrix);
          if (decoded && decoded.data) return {
            data: decoded.data, format: 'datamatrix', type: '2d',
            modes: decoded.modes, symbol: decoded.symbol, bounds: res.bounds
          };
        } catch(e) {}
      }
      if (tried.size > 200) break; // limit search
    }
    return null;
  }

  static _dm_tryExtract(bm, bx1, bx2, by, get) {
    const { width: w, height: h } = bm;

    // Find bottom-left corner: trace left to find start of solid bottom edge
    let blX = bx1, blY = by;
    while (blX > 0 && get(blX - 1, blY)) blX--;

    // Trace bottom solid edge to the right
    let brX = blX, brY = blY;
    while (brX < w - 1 && get(brX + 1, brY)) brX++;

    const botLen = brX - blX + 1;
    if (botLen < 8) return null;

    // Trace left solid edge upward from bottom-left corner
    let tlX = blX, tlY = blY;
    while (tlY > 0 && get(tlX, tlY - 1)) tlY--;

    const leftLen = blY - tlY + 1;
    if (leftLen < 8) return null;

    // Aspect ratio check: L edges should be roughly similar length
    const ratio = botLen / leftLen;
    if (ratio < 0.3 || ratio > 3.5) return null;

    // Estimate top-right corner (parallelogram assumption)
    const trX = tlX + (brX - blX);
    const trY = tlY + (brY - blY);
    if (trX < 0 || trX >= w || trY < 0 || trY >= h) return null;

    // Count transitions on top edge (clock track: alternating dark/light)
    let topTrans = 0;
    {
      const steps = Math.max(Math.abs(trX - tlX), Math.abs(trY - tlY));
      if (steps < 4) return null;
      let lastVal = -1;
      for (let i = 0; i <= steps; i++) {
        const x = Math.round(tlX + (trX - tlX) * i / steps);
        const y = Math.round(tlY + (trY - tlY) * i / steps);
        const v = get(x, y);
        if (lastVal !== -1 && v !== lastVal) topTrans++;
        lastVal = v;
      }
    }

    // Count transitions on right edge (clock track)
    let rightTrans = 0;
    {
      const steps = Math.max(Math.abs(trX - brX), Math.abs(trY - brY));
      if (steps < 4) return null;
      let lastVal = -1;
      for (let i = 0; i <= steps; i++) {
        const x = Math.round(brX + (trX - brX) * i / steps);
        const y = Math.round(brY + (trY - brY) * i / steps);
        const v = get(x, y);
        if (lastVal !== -1 && v !== lastVal) rightTrans++;
        lastVal = v;
      }
    }

    // Module count = transitions + 1, rounded to even (DM sizes are always even)
    let cols = 2 * Math.round((topTrans + 1) / 2);
    let rows = 2 * Math.round((rightTrans + 1) / 2);
    if (cols < 8 || rows < 8) return null;

    // Find best matching standard DM size
    let bestSize = null, bestDiff = 999;
    for (const s of czQR._DM_SIZES) {
      const diff = Math.abs(s[0] - rows) + Math.abs(s[1] - cols);
      if (diff < bestDiff) { bestDiff = diff; bestSize = s; }
    }
    if (!bestSize || bestDiff > 6) return null;

    const [finalRows, finalCols] = bestSize;

    // Sample modules using bilinear interpolation of the 4 corners
    const matrix = [];
    for (let r = 0; r < finalRows; r++) {
      const row = [];
      const vFrac = (r + 0.5) / finalRows;
      for (let c = 0; c < finalCols; c++) {
        const uFrac = (c + 0.5) / finalCols;
        // Bilinear mapping: top-left..top-right / bottom-left..bottom-right
        const topX = tlX + (trX - tlX) * uFrac;
        const topY = tlY + (trY - tlY) * uFrac;
        const botX2 = blX + (brX - blX) * uFrac;
        const botY2 = blY + (brY - blY) * uFrac;
        const px = Math.round(topX + (botX2 - topX) * vFrac);
        const py = Math.round(topY + (botY2 - topY) * vFrac);
        row.push(get(px, py) ? 1 : 0);
      }
      matrix.push(row);
    }

    // Validate finder pattern: bottom row should be all dark, left col should be all dark
    let badBot = 0, badLeft = 0;
    for (let c = 0; c < finalCols; c++) if (!matrix[finalRows - 1][c]) badBot++;
    for (let r = 0; r < finalRows; r++) if (!matrix[r][0]) badLeft++;
    if (badBot > finalCols * 0.2 || badLeft > finalRows * 0.2) return null;

    // Validate clock tracks: top row and right col should alternate
    let topAlt = 0;
    for (let c = 0; c < finalCols; c++) {
      if (matrix[0][c] === ((c % 2 === 0) ? 1 : 0)) topAlt++;
    }
    let rightAlt = 0;
    for (let r = 0; r < finalRows; r++) {
      if (matrix[r][finalCols - 1] === ((r % 2 !== 0) ? 1 : 0)) rightAlt++;
    }
    if (topAlt < finalCols * 0.6 || rightAlt < finalRows * 0.6) return null;

    // Compute tight bounds by scanning actual dark pixels near detected DM
    const margin = Math.round(Math.max(botLen, leftLen) * 0.1);
    const sx = Math.max(0, blX - margin);
    const sy = Math.max(0, tlY - margin);
    const ex = Math.min(bm.width - 1, brX + margin);
    const ey = Math.min(bm.height - 1, blY + margin);
    let bMinX = ex, bMinY = ey, bMaxX = sx, bMaxY = sy;
    for (let py = sy; py <= ey; py++) {
      for (let px = sx; px <= ex; px++) {
        if (get(px, py)) {
          if (px < bMinX) bMinX = px;
          if (px > bMaxX) bMaxX = px;
          if (py < bMinY) bMinY = py;
          if (py > bMaxY) bMaxY = py;
        }
      }
    }
    const pad = Math.round(Math.min(leftLen / finalRows, botLen / finalCols) * 0.1);

    return {
      matrix,
      bounds: {
        x: Math.max(0, bMinX - pad),
        y: Math.max(0, bMinY - pad),
        w: bMaxX - bMinX + 1 + pad * 2,
        h: bMaxY - bMinY + 1 + pad * 2
      }
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // barcode-decode.js — 1D barcode reading and decoding engine
  // ════════════════════════════════════════════════════════════════════════

  /** @internal Sample pixel luminance along a line at arbitrary angle */
  static _bc_getLumaLine(imgData, x0, y0, dx, dy) {
    const { width, height, data } = imgData;
    const luma = [];
    let x = x0, y = y0;
    while (x >= 0 && x < width && y >= 0 && y < height) {
      const px = Math.min(Math.round(x), width - 1), py = Math.min(Math.round(y), height - 1);
      const i = (py * width + px) * 4;
      luma.push((data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000);
      x += dx;
      y += dy;
    }
    return new Uint8Array(luma);
  }


  // ==============================================================================
  // 1D BARCODE ENGINE
  // ==============================================================================

  static readBarcode(source, options = {}) {
    let imgData;
    if (typeof ImageData !== 'undefined' && source instanceof ImageData) imgData = source;
    else if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement)
      imgData = source.getContext('2d').getImageData(0, 0, source.width, source.height);
    else if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
      const c = document.createElement('canvas');
      c.width = source.naturalWidth || source.width; c.height = source.naturalHeight || source.height;
      c.getContext('2d').drawImage(source, 0, 0);
      imgData = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    } else return null;

    const formats = options.formats || [
      czQR.BC_EAN13, czQR.BC_EAN8, czQR.BC_UPCA, czQR.BC_UPCE,
      czQR.BC_CODE128, czQR.BC_CODE39, czQR.BC_ITF, czQR.BC_CODABAR
    ];

    return czQR._bc_scanImage(imgData, formats);
  }

  static _bc_scanImage(imgData, formats) {
    if (!formats || !formats.length) formats = [czQR.BC_EAN13, czQR.BC_EAN8, czQR.BC_UPCA, czQR.BC_UPCE, czQR.BC_CODE128, czQR.BC_CODE39, czQR.BC_ITF, czQR.BC_CODABAR];
    const { width, height } = imgData;
    const yFractions = [0.2, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.8];

    for (const yFrac of yFractions) {
      const y = Math.floor(height * yFrac);
      const lumaRow = czQR._bc_getLumaRow(imgData, y);
      const binRow = czQR._bc_binarizeRow(lumaRow);
      
      const runs = czQR._bc_runLengthEncode(binRow);
      if (!runs || runs.length < 10) continue;

      // Calculate tight bounds from binRow
      const calcBounds = () => {
        let fb = -1, lb = -1;
        for (let i = 0; i < width; i++) { if (binRow[i]) { fb = i; break; } }
        for (let i = width - 1; i >= 0; i--) { if (binRow[i]) { lb = i; break; } }
        if (fb < 0 || lb <= fb) return { x: 0, y: Math.max(0, y - 30), w: width, h: 60 };
        const bw = lb - fb;
        const margin = Math.max(6, Math.floor(bw * 0.06));
        const bh = Math.max(30, Math.floor(bw * 0.35));
        return { x: Math.max(0, fb - margin), y: Math.max(0, y - Math.floor(bh / 2)), w: Math.min(width, bw + margin * 2), h: bh };
      };

      let result = czQR._bc_decodeScanline(runs, formats);
      if (result) {
        result.bounds = calcBounds();
        return result;
      }

      // Try reverse (right-to-left scan)
      const reversedRuns = [...runs].reverse();
      result = czQR._bc_decodeScanline(reversedRuns, formats);
      if (result) {
        result.bounds = calcBounds();
        return result;
      }
    }
    
    // Diagonal scanning could go here, but omitted for brevity in core 1D implementation unless requested
    return null;
  }

  static _bc_getLumaRow(imgData, y) {
    const w = imgData.width;
    const luma = new Uint8Array(w);
    const d = imgData.data;
    const offset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const i = offset + x * 4;
      luma[x] = (d[i] * 299 + d[i+1] * 587 + d[i+2] * 114) / 1000;
    }
    return luma;
  }

  static _bc_binarizeRow(lumaRow) {
    const w = lumaRow.length;
    const bin = new Uint8Array(w);
    const windowSize = Math.max(7, Math.floor(w / 40));
    
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      let min = 255, max = 0;
      const start = Math.max(0, x - windowSize);
      const end = Math.min(w - 1, x + windowSize);
      for (let i = start; i <= end; i++) {
        const v = lumaRow[i];
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
        count++;
      }
      const avg = sum / count;
      let threshold = avg;
      if (max - min < 24) threshold = max / 2; // Low contrast fallback
      
      bin[x] = lumaRow[x] <= threshold ? 1 : 0; // 1 = black, 0 = white
    }
    return bin;
  }

  static _bc_runLengthEncode(binRow) {
    const runs = [];
    let currentBit = binRow[0];
    let runLen = 1;
    for (let i = 1; i < binRow.length; i++) {
      if (binRow[i] === currentBit) {
        runLen++;
      } else {
        runs.push({ v: currentBit, len: runLen });
        currentBit = binRow[i];
        runLen = 1;
      }
    }
    runs.push({ v: currentBit, len: runLen });
    
    // Trim leading/trailing white space runs
    let leadingWhite = 0;
    if (runs.length > 0 && runs[0].v === 0) { leadingWhite = runs[0].len; runs.shift(); }
    if (runs.length > 0 && runs[runs.length - 1].v === 0) runs.pop();
    
    runs._leadingWhite = leadingWhite;
    return runs;
  }

  static _bc_patternMatch(widths, pattern, tolerance = 0.5) {
    if (widths.length !== pattern.length) return false;
    
    let sumWidths = 0;
    let sumPattern = 0;
    for (let i = 0; i < widths.length; i++) {
      sumWidths += widths[i];
      sumPattern += pattern[i];
    }
    if (sumWidths === 0) return false;
    
    const unit = sumWidths / sumPattern;
    const maxVariance = unit * tolerance;
    
    for (let i = 0; i < widths.length; i++) {
      const expected = pattern[i] * unit;
      if (Math.abs(widths[i] - expected) > maxVariance) return false;
    }
    return true;
  }

  static _bc_decodeScanline(runs, formats) {
    const decoders = [];
    if (formats.includes(czQR.BC_EAN13) || formats.includes(czQR.BC_UPCA)) decoders.push(czQR._bc_decodeEAN13);
    if (formats.includes(czQR.BC_EAN8)) decoders.push(czQR._bc_decodeEAN8);
    if (formats.includes(czQR.BC_CODE128)) decoders.push(czQR._bc_decodeCode128);
    if (formats.includes(czQR.BC_CODE39)) decoders.push(czQR._bc_decodeCode39);
    if (formats.includes(czQR.BC_ITF)) decoders.push(czQR._bc_decodeITF);
    for (const dec of decoders) {
      const r = dec(runs);
      if (r) {
        // Compute pixel positions from run indices
        if (typeof r.startRun === 'number' && typeof r.endRun === 'number') {
          let px = 0;
          for (let i = 0; i < Math.min(r.endRun + 1, runs.length); i++) {
            if (i === r.startRun) r.startPx = px;
            px += runs[i].len;
            if (i === r.endRun) r.endPx = px;
          }
        }
        return r;
      }
    }
    return null;
  }

  static _bc_decodeEAN13(runs) {
    for (let startIdx = 0; startIdx < runs.length - 58; startIdx++) {
      if (runs[startIdx].v !== 1) continue;
      
      const startGuard = [runs[startIdx].len, runs[startIdx+1].len, runs[startIdx+2].len];
      if (!czQR._bc_patternMatch(startGuard, [1,1,1], 0.7)) continue;
      
      let unit = (startGuard[0] + startGuard[1] + startGuard[2]) / 3;
      
      let leftDigits = [];
      let leftParities = [];
      let idx = startIdx + 3;
      let valid = true;
      
      for (let i = 0; i < 6; i++) {
        const charRuns = [runs[idx].len, runs[idx+1].len, runs[idx+2].len, runs[idx+3].len];
        idx += 4;
        let match = czQR._bc_matchEANChar(charRuns, true, unit);
        if (!match) { valid = false; break; }
        leftDigits.push(match.digit);
        leftParities.push(match.parity);
      }
      if (!valid) continue;
      
      const centerGuard = [runs[idx].len, runs[idx+1].len, runs[idx+2].len, runs[idx+3].len, runs[idx+4].len];
      if (!czQR._bc_patternMatch(centerGuard, [1,1,1,1,1], 0.7)) continue;
      idx += 5;
      
      let rightDigits = [];
      for (let i = 0; i < 6; i++) {
        const charRuns = [runs[idx].len, runs[idx+1].len, runs[idx+2].len, runs[idx+3].len];
        idx += 4;
        let match = czQR._bc_matchEANChar(charRuns, false, unit);
        if (!match) { valid = false; break; }
        rightDigits.push(match.digit);
      }
      if (!valid) continue;
      
      const endGuard = [runs[idx].len, runs[idx+1].len, runs[idx+2].len];
      if (!czQR._bc_patternMatch(endGuard, [1,1,1], 0.7)) continue;
      
      const parityPattern = leftParities.join('');
      let firstDigit = -1;
      for (let d = 0; d < 10; d++) {
        if (czQR._EAN_PARITY_TABLE[d] === parityPattern) {
          firstDigit = d;
          break;
        }
      }
      if (firstDigit === -1) continue;
      
      let digits = [firstDigit, ...leftDigits, ...rightDigits];
      if (czQR._bc_checkEANChecksum(digits)) {
        const data = digits.join('');
        const endRun = startIdx + 58;
        if (data.startsWith('0')) {
          return { data: data.substring(1), format: czQR.BC_UPCA, type: '1d', checksumValid: true, startRun: startIdx, endRun };
        }
        return { data: data, format: czQR.BC_EAN13, type: '1d', checksumValid: true, startRun: startIdx, endRun };
      }
    }
    return null;
  }
  
  static _bc_decodeEAN8(runs) {
    for (let startIdx = 0; startIdx < runs.length - 42; startIdx++) {
      if (runs[startIdx].v !== 1) continue;
      const startGuard = [runs[startIdx].len, runs[startIdx+1].len, runs[startIdx+2].len];
      if (!czQR._bc_patternMatch(startGuard, [1,1,1], 0.7)) continue;
      
      let unit = (startGuard[0] + startGuard[1] + startGuard[2]) / 3;
      let leftDigits = [];
      let idx = startIdx + 3;
      let valid = true;
      
      for (let i = 0; i < 4; i++) {
        const charRuns = [runs[idx].len, runs[idx+1].len, runs[idx+2].len, runs[idx+3].len];
        idx += 4;
        let match = czQR._bc_matchEANChar(charRuns, true, unit);
        if (!match || match.parity !== 'L') { valid = false; break; }
        leftDigits.push(match.digit);
      }
      if (!valid) continue;
      
      const centerGuard = [runs[idx].len, runs[idx+1].len, runs[idx+2].len, runs[idx+3].len, runs[idx+4].len];
      if (!czQR._bc_patternMatch(centerGuard, [1,1,1,1,1], 0.7)) continue;
      idx += 5;
      
      let rightDigits = [];
      for (let i = 0; i < 4; i++) {
        const charRuns = [runs[idx].len, runs[idx+1].len, runs[idx+2].len, runs[idx+3].len];
        idx += 4;
        let match = czQR._bc_matchEANChar(charRuns, false, unit);
        if (!match) { valid = false; break; }
        rightDigits.push(match.digit);
      }
      if (!valid) continue;
      
      const endGuard = [runs[idx].len, runs[idx+1].len, runs[idx+2].len];
      if (!czQR._bc_patternMatch(endGuard, [1,1,1], 0.7)) continue;
      
      let digits = [...leftDigits, ...rightDigits];
      if (czQR._bc_checkEANChecksum(digits)) {
        return { data: digits.join(''), format: czQR.BC_EAN8, type: '1d', checksumValid: true, startRun: startIdx, endRun: startIdx + 42 };
      }
    }
    return null;
  }

  static _bc_decodeUPCA(runs) { return czQR._bc_decodeEAN13(runs); }
  static _bc_decodeUPCE(runs) { return null; }

  static _bc_matchEANChar(widths, isLeft, unit) {
    let bestMatch = null;
    let bestDist = Infinity;
    
    const tables = isLeft ? 
      [{p: czQR._EAN_L_TABLE, par: 'L'}, {p: czQR._EAN_G_TABLE, par: 'G'}] : 
      [{p: czQR._EAN_R_TABLE, par: 'R'}];
      
    for (let t = 0; t < tables.length; t++) {
      const table = tables[t].p;
      const parity = tables[t].par;
      for (let d = 0; d < 10; d++) {
        const pattern = table[d];
        if (czQR._bc_patternMatch(widths, pattern, 0.7)) {
          let dist = 0;
          let sum = widths[0]+widths[1]+widths[2]+widths[3];
          for(let i=0; i<4; i++) dist += Math.abs(widths[i]/sum - pattern[i]/7);
          if (dist < bestDist) {
            bestDist = dist;
            bestMatch = { digit: d, parity: parity };
          }
        }
      }
    }
    return bestMatch;
  }

  static _bc_checkEANChecksum(digits) {
    let sum = 0;
    const len = digits.length;
    for (let i = len - 2; i >= 0; i--) {
      let weight = (len - 1 - i) % 2 === 1 ? 3 : 1;
      sum += digits[i] * weight;
    }
    let check = (10 - (sum % 10)) % 10;
    return check === digits[len - 1];
  }

  static _bc_decodeCode128(runs) {
    if (runs.length < 6 + 6 + 6 + 7) return null;
    
    for (let startIdx = 0; startIdx < runs.length - 24; startIdx++) {
      if (runs[startIdx].v !== 1) continue;
      
      const startRuns = [
        runs[startIdx].len, runs[startIdx+1].len, runs[startIdx+2].len,
        runs[startIdx+3].len, runs[startIdx+4].len, runs[startIdx+5].len
      ];
      
      let startCode = -1;
      let unit = 0;
      let sum = startRuns.reduce((a,b)=>a+b, 0);
      
      for (let i = 103; i <= 105; i++) {
        if (czQR._bc_patternMatch(startRuns, czQR._C128_PATTERNS[i], 0.6)) {
          startCode = i;
          unit = sum / 11;
          break;
        }
      }
      
      if (startCode === -1) continue;
      
      let idx = startIdx + 6;
      let values = [];
      let stopFound = false;
      
      while (idx + 5 < runs.length) {
        if (idx + 6 < runs.length) {
          const stopRuns = [
            runs[idx].len, runs[idx+1].len, runs[idx+2].len, runs[idx+3].len,
            runs[idx+4].len, runs[idx+5].len, runs[idx+6].len
          ];
          if (czQR._bc_patternMatch(stopRuns, czQR._C128_PATTERNS[106], 0.6)) {
            stopFound = true;
            break;
          }
        }
        
        const charRuns = [
          runs[idx].len, runs[idx+1].len, runs[idx+2].len,
          runs[idx+3].len, runs[idx+4].len, runs[idx+5].len
        ];
        
        let bestVal = -1;
        let bestDist = Infinity;
        let charSum = charRuns.reduce((a,b)=>a+b, 0);
        
        for (let i = 0; i <= 105; i++) {
          if (czQR._bc_patternMatch(charRuns, czQR._C128_PATTERNS[i], 0.6)) {
            let dist = 0;
            for(let j=0; j<6; j++) dist += Math.abs(charRuns[j]/charSum - czQR._C128_PATTERNS[i][j]/11);
            if (dist < bestDist) {
              bestDist = dist;
              bestVal = i;
            }
          }
        }
        
        if (bestVal === -1) break;
        values.push(bestVal);
        idx += 6;
      }
      
      if (!stopFound || values.length < 2) continue;
      
      const checksumVal = values.pop();
      let calculatedSum = startCode;
      for (let i = 0; i < values.length; i++) {
        calculatedSum += values[i] * (i + 1);
      }
      let isValid = (calculatedSum % 103) === checksumVal;
      if (!isValid) continue;
      
      let data = "";
      let currentSet = startCode === 103 ? 'A' : (startCode === 104 ? 'B' : 'C');
      let i = 0;
      
      while (i < values.length) {
        let v = values[i++];
        
        if (currentSet === 'C') {
          if (v < 100) {
            data += (v < 10 ? '0' + v : '' + v);
          } else if (v === 100) currentSet = 'B';
          else if (v === 101) currentSet = 'A';
          else if (v === 102) data += '[FNC1]';
        } else {
          if (v < 96) {
            if (currentSet === 'A') {
              if (v < 64) data += String.fromCharCode(v + 32);
              else data += String.fromCharCode(v - 64);
            } else {
              data += String.fromCharCode(v + 32);
            }
          } else if (v === 96) data += '[FNC3]';
          else if (v === 97) data += '[FNC2]';
          else if (v === 98) {
            // SHIFT: temporarily use the other set for next char
            if (i < values.length) {
              let nextV = values[i++];
              if (nextV < 96) {
                if (currentSet === 'A') {
                  // Shift to B for this char
                  data += String.fromCharCode(nextV + 32);
                } else {
                  // Shift to A for this char
                  if (nextV < 64) data += String.fromCharCode(nextV + 32);
                  else data += String.fromCharCode(nextV - 64);
                }
              }
            }
          }
          else if (v === 99) currentSet = 'C';
          else if (v === 100) currentSet = 'B';
          else if (v === 101) currentSet = 'A';
          else if (v === 102) data += '[FNC1]';
        }
      }
      
      let isGS1 = data.startsWith('[FNC1]');
      return { 
        data: isGS1 ? data.substring(6) : data, 
        format: isGS1 ? czQR.BC_GS1_128 : czQR.BC_CODE128, 
        type: '1d', 
        checksumValid: true,
        startRun: startIdx,
        endRun: idx + 6
      };
    }
    return null;
  }

  static _bc_decodeCode39(runs) {
    if (runs.length < 21) return null;
    
    for (let startIdx = 0; startIdx < runs.length - 18; startIdx++) {
      if (runs[startIdx].v !== 1) continue;
      
      // Try to decode starting from this position
      let idx = startIdx;
      let chars = [];
      let lastCharEnd = startIdx;
      
      while (idx + 8 < runs.length) {
        if (runs[idx].v !== 1) { idx++; continue; }
        
        const charRuns = [];
        for (let j = 0; j < 9; j++) charRuns.push(runs[idx + j].len);
        
        // Determine threshold between narrow and wide
        let sorted = [...charRuns].sort((a, b) => a - b);
        let threshold = (sorted[5] + sorted[6]) / 2;
        
        // Build 9-bit pattern
        let pattern = 0;
        for (let j = 0; j < 9; j++) {
          if (charRuns[j] > threshold) pattern |= (1 << j);
        }
        
        const ch = czQR._C39_PATTERNS[pattern];
        if (ch) {
          chars.push(ch);
          const charEndRun = idx + 8; // last run of this character
          idx += 9;
          // Skip the inter-character gap (1 narrow space)
          if (idx < runs.length && runs[idx].v === 0) idx++;
          // Track end of last decoded character
          lastCharEnd = charEndRun;
        } else {
          break;
        }
      }
      
      // Need at least * + 1 char + * 
      if (chars.length >= 3 && chars[0] === '*' && chars[chars.length - 1] === '*') {
        const data = chars.slice(1, -1).join('');
        if (data.length > 0 && !data.includes('*')) {
          return { data: data, format: czQR.BC_CODE39, type: '1d', checksumValid: true, startRun: startIdx, endRun: lastCharEnd };
        }
      }
    }
    return null;
  }

  static _bc_decodeITF(runs) {
    if (runs.length < 14) return null;
    
    for (let startIdx = 0; startIdx < runs.length - 10; startIdx++) {
      if (runs[startIdx].v !== 1) continue;
      
      // Quiet zone check: require a white space before the start pattern
      // that is at least 6x the average narrow bar width (ISO/IEC 16390)
      if (startIdx > 0) {
        const prevRun = runs[startIdx - 1];
        const startNarrow = (runs[startIdx].len + runs[startIdx+1].len + runs[startIdx+2].len + runs[startIdx+3].len) / 4;
        if (prevRun.v !== 0 || prevRun.len < startNarrow * 3) continue;
      }
      
      const startRuns = [runs[startIdx].len, runs[startIdx+1].len, runs[startIdx+2].len, runs[startIdx+3].len];
      if (!czQR._bc_patternMatch(startRuns, [1,1,1,1], 0.7)) continue;
      
      let idx = startIdx + 4;
      let digits = "";
      let valid = true;
      
      while (idx + 9 < runs.length) {
        const b = [runs[idx].len, runs[idx+2].len, runs[idx+4].len, runs[idx+6].len, runs[idx+8].len];
        const s = [runs[idx+1].len, runs[idx+3].len, runs[idx+5].len, runs[idx+7].len, runs[idx+9].len];
        
        const decodePair = (widths) => {
          let sorted = [...widths].sort((a,b)=>a-b);
          let threshold = (sorted[2] + sorted[3]) / 2;
          // Require clear wide/narrow distinction
          if (sorted[3] < sorted[1] * 1.8) return -1;
          let w = widths.map(x => x > threshold ? 'W' : 'n');
          for (let i = 0; i < 10; i++) {
            if (czQR._ITF_PATTERNS[i].join('') === w.join('')) return i;
          }
          return -1;
        };
        
        let d1 = decodePair(b);
        let d2 = decodePair(s);
        
        if (d1 === -1 || d2 === -1) break;
        
        digits += d1 + "" + d2;
        idx += 10;
      }
      
      // ITF always encodes even number of digits; ITF-14 is 14 digits
      // Minimum 6 digits to reduce false positives (most ITF uses 14+)
      if (digits.length >= 6 && digits.length % 2 === 0 && idx + 2 < runs.length) {
        const endRuns = [runs[idx].len, runs[idx+1].len, runs[idx+2].len];
        let sorted = [...endRuns].sort((a,b)=>a-b);
        let threshold = (sorted[1] + sorted[2]) / 2;
        if (endRuns[0] > threshold && endRuns[1] < threshold && endRuns[2] < threshold) {
          // Validate Mod-10 checksum (last digit is check digit)
          const digs = digits.split('').map(Number);
          let sum = 0;
          for (let i = 0; i < digs.length - 1; i++) {
            sum += digs[i] * ((digs.length - 1 - i) % 2 === 0 ? 1 : 3);
          }
          const checkValid = (10 - (sum % 10)) % 10 === digs[digs.length - 1];
          // Accept with or without valid checksum (generic ITF doesn't require check digit)
          return { data: digits, format: czQR.BC_ITF, type: '1d', checksumValid: checkValid, startRun: startIdx, endRun: idx + 2 };
        }
      }
    }
    return null;
  }

  static _bc_decodeCodabar(runs) { return null; }
  static _bc_parseGS1(data) { return data; }


  // ════════════════════════════════════════════════════════════════════════
  // readall.js — Multi-code reader orchestrator
  // ════════════════════════════════════════════════════════════════════════

  // ==============================================================================
  // MULTI-CODE READER
  // ==============================================================================

  /**
   * Read ALL codes (QR + barcodes) from an image. Returns an array of results.
   * @param {ImageData|HTMLCanvasElement|HTMLImageElement} source
   * @param {{ formats?: string[] }} [options]
   * @returns {Array<{ data: string, format: string, type: string }>}
   */
  static readAll(source) {
    let imgData;
    if (typeof ImageData !== 'undefined' && source instanceof ImageData) imgData = source;
    else if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement)
      imgData = source.getContext('2d').getImageData(0, 0, source.width, source.height);
    else if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
      const c = document.createElement('canvas');
      c.width = source.naturalWidth || source.width; c.height = source.naturalHeight || source.height;
      c.getContext('2d').drawImage(source, 0, 0);
      imgData = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    } else return [];

    const results = [];
    const addResult = (r) => {
      if (r && r.data) { results.push(r); return true; }
      return false;
    };

    // ═══ Step 1: Fast full-image read (~50ms) ═══
    let step1Data = null;
    try {
      const r = czQR.read(imgData);
      if (addResult(r)) step1Data = r.data;
    } catch (e) {}

    // ═══ Step 2: Quick probe for ADDITIONAL codes (~10-15ms) ═══
    let needsDeepQR = false;
    let needsDeepBarcode = false;
    const w = imgData.width, h = imgData.height;
    const earlyData = new Set();
    if (step1Data) earlyData.add(step1Data);

    // If Step 1 found a barcode (not QR), we know there might be more
    if (results.length > 0 && results[0].format !== 'qr') {
      needsDeepBarcode = true;
    }

    // 2a: Count QR finder pattern groups
    try {
      const bm = czQR._rd_binarize(imgData, 0);
      const groups = czQR._rd_findAllFinderGroups(bm);
      if (groups.length > 1) needsDeepQR = true;
    } catch (e) {}

    // 2b: Barcode segment probe — always runs (regardless of QR finder detection)
    if (!needsDeepBarcode) {
      const bcFmt = [czQR.BC_EAN13, czQR.BC_EAN8, czQR.BC_UPCA, czQR.BC_CODE128, czQR.BC_CODE39, czQR.BC_ITF];
      outer: for (const yFrac of [0.25, 0.5, 0.75]) {
        const y = Math.floor(h * yFrac);
        for (let seg = 0; seg < 3; seg++) {
          const xStart = Math.floor(w * seg / 3), xEnd = Math.floor(w * (seg + 1) / 3);
          const segW = xEnd - xStart;
          if (segW < 50) continue;
          const segLuma = new Uint8Array(segW);
          const d = imgData.data, off = y * w * 4;
          for (let x = 0; x < segW; x++) {
            const i = off + (xStart + x) * 4;
            segLuma[x] = (d[i] * 299 + d[i+1] * 587 + d[i+2] * 114) / 1000;
          }
          const binRow = czQR._bc_binarizeRow(segLuma);
          const runs = czQR._bc_runLengthEncode(binRow);
          if (runs && runs.length >= 10) {
            const r = czQR._bc_decodeScanline(runs, bcFmt);
            if (r && (r.format !== czQR.BC_ITF || r.checksumValid)) {
              if (addResult(r)) earlyData.add(r.data);
              needsDeepBarcode = true;
              break outer;
            }
          }
        }
      }
    }

    // 2c: Data Matrix probe
    try {
      const dmRes = czQR.readDataMatrix(imgData);
      if (dmRes && !earlyData.has(dmRes.data)) {
        if (addResult(dmRes)) earlyData.add(dmRes.data);
      }
      // Try sub-regions for Data Matrix
      const dmRegions = [
        [0, 0, Math.floor(w/2), h], [Math.floor(w/2), 0, w - Math.floor(w/2), h],
        [0, 0, w, Math.floor(h/2)], [0, Math.floor(h/2), w, h - Math.floor(h/2)]
      ];
      for (const [rx, ry, rw, rh] of dmRegions) {
        if (rw < 50 || rh < 50) continue;
        let sub = new ImageData(rw, rh);
        for (let y = 0; y < rh; y++) {
          const srcOff = ((ry + y) * w + rx) * 4;
          const dstOff = y * rw * 4;
          sub.data.set(imgData.data.subarray(srcOff, srcOff + rw * 4), dstOff);
        }
        const subRes = czQR.readDataMatrix(sub);
        if (subRes && !earlyData.has(subRes.data)) {
          if (subRes.bounds) {
            subRes.bounds.x += rx;
            subRes.bounds.y += ry;
          }
          if (addResult(subRes)) earlyData.add(subRes.data);
        }
      }
    } catch (e) {}

    // ═══ Step 3: Deep QR scan (only if multiple QR finder groups) ═══
    if (needsDeepQR) {
      const regions = [
        [0, 0, Math.floor(w/2), h], [Math.floor(w/2), 0, w - Math.floor(w/2), h],
        [0, 0, w, Math.floor(h/2)], [0, Math.floor(h/2), w, h - Math.floor(h/2)],
        [0, 0, Math.floor(w/2), Math.floor(h/2)],
        [Math.floor(w/2), 0, w - Math.floor(w/2), Math.floor(h/2)],
        [0, Math.floor(h/2), Math.floor(w/2), h - Math.floor(h/2)],
        [Math.floor(w/2), Math.floor(h/2), w - Math.floor(w/2), h - Math.floor(h/2)]
      ];
      // Track QR finder positions for dedup
      const qrCenters = [];
      // Add Step 1 QR if found
      for (const res of results) {
        if (res.format === 'qr' && res.points) {
          const p = res.points;
          qrCenters.push({ x: (p[0].x + p[1].x + p[2].x) / 3, y: (p[0].y + p[1].y + p[2].y) / 3, data: res.data });
        }
      }
      for (const [rx, ry, rw, rh] of regions) {
        if (rw < 50 || rh < 50) continue;
        try {
          let sub = new ImageData(rw, rh);
          for (let y = 0; y < rh; y++) {
            const srcOff = ((ry + y) * w + rx) * 4;
            const dstOff = y * rw * 4;
            sub.data.set(imgData.data.subarray(srcOff, srcOff + rw * 4), dstOff);
          }
          const r = czQR.read(sub);
          sub = null;
          if (r && r.format === 'qr') {
            // Offset points from sub-region to full-image coordinates
            if (r.points) {
              for (const p of r.points) { p.x += rx; p.y += ry; }
            }
            // Dedup: skip if same data or same position as existing QR
            const cx = r.points ? (r.points[0].x + r.points[1].x + r.points[2].x) / 3 : 0;
            const cy = r.points ? (r.points[0].y + r.points[1].y + r.points[2].y) / 3 : 0;
            const minDim = Math.min(w, h);
            let isDup = false;
            for (const qc of qrCenters) {
              // Same data = same QR from overlapping region
              if (qc.data === r.data) {
                isDup = true;
                // Update existing result's points with sub-region (often more accurate)
                if (r.points) {
                  const existing = results.find(x => x.data === r.data && x.format === 'qr');
                  if (existing) existing.points = r.points;
                  qc.x = cx; qc.y = cy;
                }
                break;
              }
              // Different data but same position
              const dist = Math.abs(qc.x - cx) + Math.abs(qc.y - cy);
              if (dist < minDim * 0.12) { isDup = true; break; }
            }
            if (!isDup) {
              addResult(r);
              qrCenters.push({ x: cx, y: cy, data: r.data });
            }
          }
        } catch (e) {}
      }
    }

    // ═══ Step 4: Deep barcode scan ═══
    if (needsDeepBarcode) {
      const bcResults = czQR._bc_scanImageAll(imgData);
      for (const bc of bcResults) {
        // Skip results already found in earlier steps (same physical barcode)
        // But update their bounds with the more accurate region-detected bounds
        if (earlyData.has(bc.data)) {
          earlyData.delete(bc.data);
          if (bc.bounds) {
            const existing = results.find(r => r.data === bc.data && r.format !== 'qr');
            if (existing) existing.bounds = bc.bounds;
          }
          continue;
        }
        addResult(bc);
      }
    }

    return results;
  }

  /** @internal Find all finder pattern groups (sets of 3) for multi-QR detection */
  static _rd_findAllFinderGroups(bm) {
    const { width: w, height: h, data } = bm;
    const centers = [];
    const ok = (s) => {
      let t = 0; for (let i = 0; i < 5; i++) { if (!s[i]) return false; t += s[i]; }
      if (t < 7) return false;
      const m = t / 7, v = m * 0.5;
      return Math.abs(m - s[0]) < v && Math.abs(m - s[1]) < v && Math.abs(3*m - s[2]) < 3*v && Math.abs(m - s[3]) < v && Math.abs(m - s[4]) < v;
    };
    const crossV = (cx, cy, maxC, origT) => {
      const s = [0,0,0,0,0]; let y = cy;
      while (y >= 0 && data[y*w+cx]) { s[2]++; y--; } if (y < 0) return NaN;
      while (y >= 0 && !data[y*w+cx] && s[1] <= maxC) { s[1]++; y--; } if (y < 0 || s[1] > maxC) return NaN;
      while (y >= 0 && data[y*w+cx] && s[0] <= maxC) { s[0]++; y--; } if (s[0] > maxC) return NaN;
      y = cy + 1;
      while (y < h && data[y*w+cx]) { s[2]++; y++; } if (y === h) return NaN;
      while (y < h && !data[y*w+cx] && s[3] <= maxC) { s[3]++; y++; } if (y === h || s[3] > maxC) return NaN;
      while (y < h && data[y*w+cx] && s[4] <= maxC) { s[4]++; y++; } if (s[4] > maxC) return NaN;
      if (!ok(s)) return NaN;
      const tot = s[0]+s[1]+s[2]+s[3]+s[4];
      if (5 * Math.abs(tot - origT) >= 2 * origT) return NaN;
      return cy + (s[3]+s[4]-s[1]-s[0]) / 2;
    };
    const add = (cx, cy, ms) => {
      for (const c of centers) {
        if (Math.abs(c.x-cx) < ms*3 && Math.abs(c.y-cy) < ms*3) {
          c.x = (c.x*c.n+cx)/(c.n+1); c.y = (c.y*c.n+cy)/(c.n+1);
          c.estModuleSize = (c.estModuleSize*c.n+ms)/(c.n+1); c.n++; return;
        }
      }
      centers.push({ x: cx, y: cy, estModuleSize: ms, n: 1 });
    };
    const sc = [0,0,0,0,0];
    for (let row = 3; row < h - 3; row++) {
      sc.fill(0); let st = 0;
      for (let col = 0; col < w; col++) {
        if (data[row*w+col]) { if (st%2===1) st++; sc[st]++; }
        else {
          if (st%2===0) {
            if (st===4) {
              if (ok(sc)) {
                const tot = sc[0]+sc[1]+sc[2]+sc[3]+sc[4];
                const cj = col - sc[4] - sc[3] - sc[2]/2;
                const ci = crossV(Math.floor(cj), row, sc[2], tot);
                if (!isNaN(ci)) add(cj, ci, tot/7);
              }
              sc[0]=sc[2]; sc[1]=sc[3]; sc[2]=sc[4]; sc[3]=1; sc[4]=0; st=3;
            } else { st++; sc[st]++; }
          } else { sc[st]++; }
        }
      }
    }
    if (centers.length < 3) return [];

    // Group centers into sets of 3 by compatible module sizes and spatial proximity
    centers.sort((a, b) => b.n - a.n);
    const groups = [];
    const used = new Set();

    for (let i = 0; i < centers.length - 2; i++) {
      if (used.has(i)) continue;
      for (let j = i + 1; j < centers.length - 1; j++) {
        if (used.has(j)) continue;
        // Check module size compatibility
        const msRatio1 = centers[i].estModuleSize / centers[j].estModuleSize;
        if (msRatio1 < 0.5 || msRatio1 > 2.0) continue;
        for (let k = j + 1; k < centers.length; k++) {
          if (used.has(k)) continue;
          const msRatio2 = centers[i].estModuleSize / centers[k].estModuleSize;
          if (msRatio2 < 0.5 || msRatio2 > 2.0) continue;
          const tri = [centers[i], centers[j], centers[k]];
          // Verify it forms a reasonable right-angle triangle
          const dSq = (a, b) => (a.x-b.x)**2 + (a.y-b.y)**2;
          const d01 = dSq(tri[0], tri[1]), d12 = dSq(tri[1], tri[2]), d02 = dSq(tri[0], tri[2]);
          const sides = [d01, d12, d02].sort((a, b) => a - b);
          // Two shorter sides should be ~equal, longest ~= sum of shorter two (right angle)
          if (sides[0] < 1) continue;
          const ratio = sides[1] / sides[0];
          if (ratio > 4.0) continue; // sides too different
          const hypCheck = Math.abs(sides[2] - sides[0] - sides[1]) / sides[2];
          if (hypCheck > 0.3) continue; // not a right angle
          // Assign TL, TR, BL
          let tl, tr, bl;
          if (d01 >= d12 && d01 >= d02) { tl = tri[2]; tr = tri[0]; bl = tri[1]; }
          else if (d12 >= d01 && d12 >= d02) { tl = tri[0]; tr = tri[1]; bl = tri[2]; }
          else { tl = tri[1]; tr = tri[0]; bl = tri[2]; }
          if ((tr.x-tl.x)*(bl.y-tl.y) - (tr.y-tl.y)*(bl.x-tl.x) < 0) { const t = tr; tr = bl; bl = t; }
          groups.push([tl, tr, bl]);
          used.add(i); used.add(j); used.add(k);
        }
        if (used.has(i)) break;
      }
    }
    return groups;
  }

  /** @internal Decode ALL QR codes from an image */
  static _rd_tryDecodeAll(imgData) {
    const results = [];
    const seen = new Set();
    try {
      const bm = czQR._rd_binarize(imgData, 0);
      const bmGlobal = czQR._rd_binarizeGlobal(imgData);
      const bitmaps = [[bm, imgData]];
      if (bmGlobal) bitmaps.push([bmGlobal, imgData]);

      for (const [curBm, curImgData] of bitmaps) {
        const groups = czQR._rd_findAllFinderGroups(curBm);
        for (const fp of groups) {
          const [tl, tr, bl] = fp;
          const ms = (tl.estModuleSize + tr.estModuleSize + bl.estModuleSize) / 3;
          const dtx = tr.x-tl.x, dty = tr.y-tl.y, dbx = bl.x-tl.x, dby = bl.y-tl.y;
          const distTR = Math.sqrt(dtx*dtx + dty*dty), distBL = Math.sqrt(dbx*dbx + dby*dby);
          const dim = Math.round((distTR + distBL) / 2 / ms) + 7;
          const baseVer = Math.round((dim - 17) / 4);
          const versionCandidates = [baseVer];
          for (const off of [1, -1, 2, -2]) {
            const v = baseVer + off;
            if (v >= 1 && v <= 40 && !versionCandidates.includes(v)) versionCandidates.push(v);
          }
          for (const ver of versionCandidates) {
            const mc = ver * 4 + 17;
            let brx = tr.x + bl.x - tl.x, bry = tr.y + bl.y - tl.y;
            let brModX = mc - 3.5, brModY = mc - 3.5;
            if (ver >= 2) {
              const ap = czQR._PATTERN_POSITION_TABLE[ver - 1];
              if (ap && ap.length >= 2) {
                const last = ap[ap.length - 1];
                const fx = (last - 3.5) / (mc - 7), fy = fx;
                const eax = tl.x + dtx*fx + dbx*fy, eay = tl.y + dty*fx + dby*fy;
                const sr = Math.ceil(ms * 4); let bestD = sr*sr+1, bestX = 0, bestY = 0, found = false;
                for (let dy = -sr; dy <= sr; dy++) for (let dx = -sr; dx <= sr; dx++) {
                  const px = Math.floor(eax+dx), py = Math.floor(eay+dy);
                  if (px >= 0 && px < curBm.width && py >= 0 && py < curBm.height && curBm.data[py*curBm.width+px]) {
                    const d = dx*dx+dy*dy; if (d < bestD) { bestD = d; bestX = px; bestY = py; found = true; }
                  }
                }
                if (found) { brx = bestX; bry = bestY; brModX = mc - 6.5; brModY = mc - 6.5; }
              }
            }
            const transform = czQR._rd_perspectiveTransform(
              {x: 3.5, y: 3.5}, {x: mc-3.5, y: 3.5},
              {x: brModX, y: brModY}, {x: 3.5, y: mc-3.5},
              tl, tr, {x: brx, y: bry}, bl
            );
            const grid = czQR._rd_sampleGrid(curBm, transform, mc);
            const fmt = czQR._rd_readFormatInfo(grid, mc);
            if (fmt) {
              let fv = ver;
              if (ver >= 7) { const pv = czQR._rd_readVersionInfo(grid, mc); if (pv) fv = pv; }
              const gCopy = grid.map(r => [...r]);
              czQR._rd_unmaskInPlace(gCopy, fmt.maskPattern, mc);
              const bits = czQR._rd_readDataBits(gCopy, mc, fv);
              const decoded = czQR._rd_decodePayload(bits, fv, fmt.ecLevel);
              if (decoded !== null && !seen.has(decoded)) {
                seen.add(decoded);
                results.push({ data: decoded, version: fv, ecLevel: fmt.ecLevelChar, points: fp, format: 'qr', type: '2d' });
                break; // found for this group, move to next group
              }
            }
          }
        }
      }
    } catch (e) { console.warn('[readAll QR]', e); }
    return results;
  }

  /** @internal Scan image for ALL barcodes (not just first match) */
  static _bc_scanImageAll(imgData, formats) {
    if (!formats || !formats.length) formats = [czQR.BC_EAN13, czQR.BC_EAN8, czQR.BC_UPCA, czQR.BC_UPCE, czQR.BC_CODE128, czQR.BC_CODE39, czQR.BC_ITF, czQR.BC_CODABAR];
    const { width, height, data } = imgData;
    const results = [];
    const foundAt = [];
    const DEDUP_DIST = 0.10;

    const addIfValid = (r, yFrac, bounds) => {
      if (!r) return;
      if (r.format === czQR.BC_ITF && !r.checksumValid) return;
      if (bounds) r.bounds = bounds;
      for (const f of foundAt) {
        if (f.data !== r.data) continue;
        if (f.bounds && bounds) {
          const xOverlap = Math.max(0, Math.min(f.bounds.x + f.bounds.w, bounds.x + bounds.w) - Math.max(f.bounds.x, bounds.x));
          const yOverlap = Math.max(0, Math.min(f.bounds.y + f.bounds.h, bounds.y + bounds.h) - Math.max(f.bounds.y, bounds.y));
          const minW = Math.min(f.bounds.w, bounds.w);
          const minH = Math.min(f.bounds.h, bounds.h);
          if (minW > 0 && minH > 0 && xOverlap > minW * 0.5 && yOverlap > 0) return;
        } else {
          if (Math.abs(f.y - yFrac) < DEDUP_DIST) return;
        }
      }
      results.push(r);
      foundAt.push({ data: r.data, y: yFrac, bounds });
    };

    const decodeLine = (scanY, x1, x2, yFrac, bounds) => {
      const w = x2 - x1;
      if (w < 50 || scanY < 0 || scanY >= height) return;
      const segLuma = new Uint8Array(w);
      for (let x = 0; x < w; x++) {
        const i = (scanY * width + x1 + x) * 4;
        segLuma[x] = (data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000;
      }

      // Find precise barcode bounds by scanning vertically from decode position
      const findBounds = (leftPx, rightPx) => {
        const bx1 = x1 + leftPx;
        const bx2 = x1 + rightPx;
        const bw = bx2 - bx1;
        // Sample 10 points across barcode width
        const samples = [];
        for (let i = 0; i < 10; i++) samples.push(Math.floor(bx1 + bw * (i + 0.5) / 10));

        const hasBarLine = (y) => {
          if (y < 0 || y >= height) return false;
          let dark = 0;
          for (const cx of samples) {
            if (cx >= 0 && cx < width) {
              const i = (y * width + cx) * 4;
              const luma = (data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000;
              if (luma < 128) dark++;
            }
          }
          return dark >= 2; // at least 20% of samples are dark bars
        };

        // Scan UP to find top edge (stop after 3 consecutive non-bar lines)
        let topY = scanY;
        let gapUp = 0;
        for (let y = scanY - 1; y >= Math.max(0, scanY - 200); y--) {
          if (!hasBarLine(y)) {
            gapUp++;
            if (gapUp >= 3) { topY = y + gapUp; break; }
          } else {
            gapUp = 0;
            topY = y;
          }
        }

        // Scan DOWN to find bottom edge (stop after 3 consecutive non-bar lines)
        let botY = scanY;
        let gapDown = 0;
        for (let y = scanY + 1; y < Math.min(height, scanY + 200); y++) {
          if (!hasBarLine(y)) {
            gapDown++;
            if (gapDown >= 3) { botY = y - gapDown; break; }
          } else {
            gapDown = 0;
            botY = y;
          }
        }

        const margin = Math.max(4, Math.floor(bw * 0.03));
        return {
          x: Math.max(0, bx1 - margin),
          y: Math.max(0, topY - margin),
          w: Math.min(width - Math.max(0, bx1 - margin), bw + margin * 2),
          h: (botY - topY) + margin * 2
        };
      };

      const tryDecode = (binRow) => {
        const runs = czQR._bc_runLengthEncode(binRow);
        if (!runs || runs.length < 10) return;
        const lw = runs._leadingWhite || 0;
        const r1 = czQR._bc_decodeScanline(runs, formats);
        if (r1) {
          const b = (typeof r1.startPx === 'number') ? findBounds(lw + r1.startPx, lw + r1.endPx) : findBounds(0, w);
          addIfValid(r1, yFrac, b);
        }
        const revRuns = [...runs].reverse();
        revRuns._leadingWhite = 0;
        const r2 = czQR._bc_decodeScanline(revRuns, formats);
        if (r2) {
          const totalPx = runs.reduce((s, r) => s + r.len, 0);
          const b = (typeof r2.startPx === 'number') ? findBounds(totalPx - r2.endPx, totalPx - r2.startPx) : findBounds(0, w);
          addIfValid(r2, yFrac, b);
        }
      };

      // Method 1: Adaptive threshold binarization
      const binAdaptive = czQR._bc_binarizeRow(segLuma);
      tryDecode(binAdaptive);

      // Method 2: Global threshold binarization (handles dark backgrounds better)
      let gMin = 255, gMax = 0;
      for (let i = 0; i < w; i++) {
        if (segLuma[i] < gMin) gMin = segLuma[i];
        if (segLuma[i] > gMax) gMax = segLuma[i];
      }
      if (gMax - gMin > 80) {
        for (const frac of [0.3, 0.45, 0.6]) {
          const gThresh = gMin + (gMax - gMin) * frac;
          const binGlobal = new Uint8Array(w);
          for (let i = 0; i < w; i++) binGlobal[i] = segLuma[i] <= gThresh ? 1 : 0;
          tryDecode(binGlobal);
        }
      }
    };

    // ═══ Phase 1: Detect barcode regions via vertical edge density ═══
    const BLOCK = Math.max(8, Math.min(32, Math.floor(Math.min(width, height) / 40)));
    const gridW = Math.ceil(width / BLOCK);
    const gridH = Math.ceil(height / BLOCK);
    const density = new Float32Array(gridW * gridH);

    for (let by = 0; by < gridH; by++) {
      const yStart = by * BLOCK, yEnd = Math.min(yStart + BLOCK, height);
      for (let bx = 0; bx < gridW; bx++) {
        const xStart = bx * BLOCK, xEnd = Math.min(xStart + BLOCK, width - 1);
        let sum = 0, count = 0;
        for (let y = yStart; y < yEnd; y++) {
          for (let x = xStart; x < xEnd; x++) {
            const i = (y * width + x) * 4;
            const j = i + 4;
            sum += Math.abs(
              (data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) -
              (data[j] * 299 + data[j+1] * 587 + data[j+2] * 114)
            );
            count++;
          }
        }
        density[by * gridW + bx] = count > 0 ? sum / count / 1000 : 0;
      }
    }

    // Adaptive threshold
    let total = 0;
    for (let i = 0; i < density.length; i++) total += density[i];
    const mean = total / density.length;
    const edgeThreshold = Math.max(mean * 1.8, 8);

    // ═══ Phase 2: Connected-component labeling → barcode regions ═══
    const visited = new Uint8Array(gridW * gridH);
    const regions = [];

    for (let by = 0; by < gridH; by++) {
      for (let bx = 0; bx < gridW; bx++) {
        const idx = by * gridW + bx;
        if (density[idx] < edgeThreshold || visited[idx]) continue;
        visited[idx] = 1;
        const queue = [[bx, by]];
        let minBX = bx, maxBX = bx, minBY = by, maxBY = by;
        let qi = 0;
        while (qi < queue.length) {
          const [cx, cy] = queue[qi++];
          if (cx < minBX) minBX = cx; if (cx > maxBX) maxBX = cx;
          if (cy < minBY) minBY = cy; if (cy > maxBY) maxBY = cy;
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
            const ni = ny * gridW + nx;
            if (visited[ni] || density[ni] < edgeThreshold) continue;
            visited[ni] = 1;
            queue.push([nx, ny]);
          }
        }
        const pad = 3;
        const px = Math.max(0, (minBX - pad) * BLOCK);
        const py = Math.max(0, (minBY - pad) * BLOCK);
        const pw = Math.min(width, (maxBX + 1 + pad) * BLOCK) - px;
        const ph = Math.min(height, (maxBY + 1 + pad) * BLOCK) - py;
        if (pw >= 30 && ph >= 10) {
          regions.push({ x: px, y: py, w: pw, h: ph });
        }
      }
    }

    // ═══ Phase 3: Decode each detected region ═══
    for (const reg of regions) {
      const yFrac = (reg.y + reg.h / 2) / height;
      const bounds = { x: reg.x, y: reg.y, w: reg.w, h: reg.h };
      for (const yOff of [0.2, 0.35, 0.5, 0.65, 0.8]) {
        const scanY = Math.floor(reg.y + reg.h * yOff);
        decodeLine(scanY, reg.x, reg.x + reg.w, yFrac, bounds);
        // For wide regions, also scan sub-sections to find middle barcodes
        if (reg.w > width * 0.35) {
          const third = Math.floor(reg.w / 3);
          const overlap = Math.floor(third * 0.15);
          decodeLine(scanY, reg.x, reg.x + third + overlap, yFrac, null);
          decodeLine(scanY, reg.x + third - overlap, reg.x + 2 * third + overlap, yFrac, null);
          decodeLine(scanY, reg.x + 2 * third - overlap, reg.x + reg.w, yFrac, null);
        }
      }
    }

    // ═══ Phase 4: Dense full-width + sub-section fallback ═══
    const third = Math.floor(width / 3);
    const half = Math.floor(width / 2);
    const ovr = Math.floor(third * 0.12);
    for (let yp = 5; yp <= 95; yp += 5) {
      const yFrac = yp / 100;
      const scanY = Math.floor(height * yFrac);
      decodeLine(scanY, 0, width, yFrac, null);
      // Halves
      decodeLine(scanY, 0, half + ovr, yFrac, null);
      decodeLine(scanY, half - ovr, width, yFrac, null);
      // Thirds
      decodeLine(scanY, 0, third + ovr, yFrac, null);
      decodeLine(scanY, third - ovr, 2 * third + ovr, yFrac, null);
      decodeLine(scanY, 2 * third - ovr, width, yFrac, null);
    }

    return results;
  }

  // ════════════════════════════════════════════════════════════════════════
  // markers.js — Detection marker rendering with customizable options
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Draw detection markers on a canvas context for scan results.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context to draw on
   * @param {Array} results - Array from readAll() or read()
   * @param {Object} [options] - Drawing options
   * @param {number} options.imgWidth - Original image width (for coordinate mapping)
   * @param {number} options.imgHeight - Original image height
   * @param {number} [options.canvasWidth] - Canvas width (defaults to ctx.canvas.width)
   * @param {number} [options.canvasHeight] - Canvas height (defaults to ctx.canvas.height)
   * @param {number} [options.offsetX=0] - X offset for object-fit calculations
   * @param {number} [options.offsetY=0] - Y offset for object-fit calculations
   * @param {number} [options.renderWidth] - Rendered width (defaults to canvasWidth)
   * @param {number} [options.renderHeight] - Rendered height (defaults to canvasHeight)
   * @param {string} [options.lineColor='#10b981'] - Stroke color
   * @param {number} [options.lineWidth=2] - Stroke width
   * @param {string} [options.fillColor='rgba(16,185,129,0.06)'] - Fill color
   * @param {number} [options.cornerLength] - Corner bracket length (auto-calculated if omitted)
   * @param {string} [options.markerStyle='corners'] - 'corners' | 'rect' | 'none'
   * @param {boolean} [options.showLabels=true] - Show format labels
   * @param {string} [options.labelFont='bold 10px monospace'] - Label font
   * @param {string} [options.labelBg='rgba(16,185,129,0.85)'] - Label background color
   * @param {string} [options.labelColor='#000'] - Label text color
   * @param {boolean} [options.showQRDots=true] - Show corner dots on QR markers
   * @param {number} [options.dotRadius=3] - QR corner dot radius
   * @param {boolean} [options.clearCanvas=true] - Clear canvas before drawing
   */
  static drawDetections(ctx, results, options = {}) {
    if (!ctx || !results || !results.length) return;

    const cw = options.canvasWidth || ctx.canvas.width;
    const ch = options.canvasHeight || ctx.canvas.height;
    const imgW = options.imgWidth || cw;
    const imgH = options.imgHeight || ch;
    const offX = options.offsetX || 0;
    const offY = options.offsetY || 0;
    const rW = options.renderWidth || cw;
    const rH = options.renderHeight || ch;

    const lineColor = options.lineColor || '#10b981';
    const lineWidth = options.lineWidth || 2;
    const fillColor = options.fillColor || 'rgba(16,185,129,0.06)';
    const markerStyle = options.markerStyle || 'corners';
    const showLabels = options.showLabels !== false;
    const labelFont = options.labelFont || 'bold 10px monospace';
    const labelBg = options.labelBg || 'rgba(16,185,129,0.85)';
    const labelColor = options.labelColor || '#000';
    const showQRDots = options.showQRDots !== false;
    const dotRadius = options.dotRadius || 3;

    if (options.clearCanvas !== false) ctx.clearRect(0, 0, cw, ch);

    const scaleX = rW / imgW;
    const scaleY = rH / imgH;
    const mx = (px) => offX + px * scaleX;
    const my = (py) => offY + py * scaleY;

    const drawCorners = (x, y, w, h) => {
      const L = options.cornerLength || Math.min(Math.max(8, Math.min(w, h) * 0.2), 24);
      ctx.beginPath();
      ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
      ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
      ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
      ctx.stroke();
    };

    const drawLabel = (text, x, y) => {
      if (!showLabels) return;
      ctx.font = labelFont;
      const tw = ctx.measureText(text).width;
      const pad = 3;
      ctx.fillStyle = labelBg;
      ctx.beginPath();
      ctx.roundRect(x, y - 12, tw + pad * 2, 14, 3);
      ctx.fill();
      ctx.fillStyle = labelColor;
      ctx.fillText(text, x + pad, y - 1);
    };

    for (const r of results) {
      if (r.format === 'qr' && r.points && r.points.length >= 3) {
        const pts = r.points.map(p => [mx(p.x), my(p.y)]);
        const br = [pts[1][0] + pts[2][0] - pts[0][0], pts[1][1] + pts[2][1] - pts[0][1]];

        // Module size in canvas pixels (average of 3 finders)
        const avgMs = (r.points[0].estModuleSize + r.points[1].estModuleSize + r.points[2].estModuleSize) / 3;
        const expandX = avgMs * 3.5 * scaleX;
        const expandY = avgMs * 3.5 * scaleY;

        // Compute bounding box from the 4 corners, expanded to QR outer edge
        const allX = [pts[0][0], pts[1][0], pts[2][0], br[0]];
        const allY = [pts[0][1], pts[1][1], pts[2][1], br[1]];
        const bx = Math.max(0, Math.min(...allX) - expandX);
        const by = Math.max(0, Math.min(...allY) - expandY);
        const bw = Math.min(cw - bx, Math.max(...allX) - bx + expandX);
        const bh = Math.min(ch - by, Math.max(...allY) - by + expandY);

        // Fill
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(br[0], br[1]);
        ctx.lineTo(pts[2][0], pts[2][1]);
        ctx.closePath();
        ctx.fill();

        // Corner brackets (same style as barcodes)
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = lineColor;
        drawCorners(bx, by, bw, bh);

        // 3 finder pattern dots (larger, prominent)
        if (showQRDots) {
          const dr = dotRadius * 1.5;
          ctx.fillStyle = lineColor;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(pts[i][0], pts[i][1], dr, 0, Math.PI * 2);
            ctx.fill();
            // White inner circle
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(pts[i][0], pts[i][1], dr * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = lineColor;
          }
        }

        drawLabel('QR', bx, by);

      } else if (r.bounds && markerStyle !== 'none') {
        const bx = mx(r.bounds.x), by = my(r.bounds.y);
        const bw = r.bounds.w * scaleX, bh = r.bounds.h * scaleY;

        // Fill
        ctx.fillStyle = fillColor;
        ctx.fillRect(bx, by, bw, bh);

        // Stroke
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = lineColor;
        if (markerStyle === 'rect') {
          ctx.strokeRect(bx, by, bw, bh);
        } else {
          drawCorners(bx, by, bw, bh);
        }

        // Label
        let labelText = (r.format || '').toUpperCase();
        if (r.format === 'datamatrix') labelText = 'DATA MATRIX';
        drawLabel(labelText, bx, by);
      }
    }
  }


}


czQR.BC_EAN13 = 'ean13';
czQR.BC_EAN8 = 'ean8';
czQR.BC_UPCA = 'upca';
czQR.BC_UPCE = 'upce';
czQR.BC_CODE128 = 'code128';
czQR.BC_CODE39 = 'code39';
czQR.BC_ITF = 'itf';
czQR.BC_CODABAR = 'codabar';
czQR.BC_GS1_128 = 'gs1-128';
czQR.BC_EAN14 = 'ean14';

czQR._EAN_L_TABLE = [
  [3,2,1,1], [2,2,2,1], [2,1,2,2], [1,4,1,1], [1,1,3,2],
  [1,2,3,1], [1,1,1,4], [1,3,1,2], [1,2,1,3], [3,1,1,2]
];

czQR._EAN_G_TABLE = [
  [1,1,2,3], [1,2,2,2], [2,2,1,2], [1,1,4,1], [2,3,1,1],
  [1,3,2,1], [4,1,1,1], [2,1,3,1], [3,1,2,1], [2,1,1,3]
];

czQR._EAN_R_TABLE = [
  [3,2,1,1], [2,2,2,1], [2,1,2,2], [1,4,1,1], [1,1,3,2],
  [1,2,3,1], [1,1,1,4], [1,3,1,2], [1,2,1,3], [3,1,1,2]
];

czQR._EAN_PARITY_TABLE = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
];

czQR._C128_PATTERNS = [
  [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
  [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
  [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
  [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
  [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
  [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
  [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
  [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
  [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
  [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
  [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
  [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
  [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
  [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
  [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
  [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
  [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
  [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
  [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
  [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
  [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
  [2,1,1,2,3,2],[2,3,3,1,1,1,2]
];

czQR._C39_PATTERNS = {
  0x058:'0',0x109:'1',0x10C:'2',0x00D:'3',0x118:'4',0x019:'5',0x01C:'6',0x148:'7',
  0x049:'8',0x04C:'9',0x121:'A',0x124:'B',0x025:'C',0x130:'D',0x031:'E',0x034:'F',
  0x160:'G',0x061:'H',0x064:'I',0x070:'J',0x181:'K',0x184:'L',0x085:'M',0x190:'N',
  0x091:'O',0x094:'P',0x1C0:'Q',0x0C1:'R',0x0C4:'S',0x0D0:'T',0x103:'U',0x106:'V',
  0x007:'W',0x112:'X',0x013:'Y',0x016:'Z',0x142:'-',0x043:'.',0x046:' ',0x02A:'$',
  0x08A:'/',0x0A2:'+',0x0A8:'%',0x052:'*'
};

czQR._ITF_PATTERNS = [
  ['n','n','W','W','n'], ['W','n','n','n','W'], ['n','W','n','n','W'],
  ['W','W','n','n','n'], ['n','n','W','n','W'], ['W','n','W','n','n'],
  ['n','W','W','n','n'], ['n','n','n','W','W'], ['W','n','n','W','n'],
  ['n','W','n','W','n']
];

