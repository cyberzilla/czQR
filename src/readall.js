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

      // Step 2d: Aztec
      const azRes = czQR.readAztec(imgData);
      if (azRes && !earlyData.has(azRes.data)) {
        if (addResult(azRes)) earlyData.add(azRes.data);
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

