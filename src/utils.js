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
