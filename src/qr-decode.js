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

