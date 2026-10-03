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
            modes: decoded.modes, symbol: decoded.symbol, bounds: res.bounds,
            corners: res.corners || null
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

    // Compute corner-based expansion for rotated marker rendering
    // The 4 detected quadrilateral corners: TL, TR, BR, BL
    // Expand each corner outward by pad along the edge directions
    const cPad = Math.round(Math.min(leftLen / finalRows, botLen / finalCols) * 0.5);
    // Edge direction vectors (unnormalized)
    const topDx = trX - tlX, topDy = trY - tlY;
    const leftDx = blX - tlX, leftDy = blY - tlY;
    const topLen = Math.sqrt(topDx * topDx + topDy * topDy) || 1;
    const leftLenN = Math.sqrt(leftDx * leftDx + leftDy * leftDy) || 1;
    // Unit vectors along top edge and left edge
    const utx = topDx / topLen, uty = topDy / topLen;
    const ulx = leftDx / leftLenN, uly = leftDy / leftLenN;

    return {
      matrix,
      bounds: {
        x: Math.max(0, bMinX - pad),
        y: Math.max(0, bMinY - pad),
        w: bMaxX - bMinX + 1 + pad * 2,
        h: bMaxY - bMinY + 1 + pad * 2
      },
      corners: [
        { x: tlX - utx * cPad - ulx * cPad, y: tlY - uty * cPad - uly * cPad },  // TL (expanded)
        { x: trX + utx * cPad - ulx * cPad, y: trY + uty * cPad - uly * cPad },  // TR (expanded)
        { x: brX + utx * cPad + ulx * cPad, y: brY + uty * cPad + uly * cPad },  // BR (expanded)
        { x: blX - utx * cPad + ulx * cPad, y: blY - uty * cPad + uly * cPad },  // BL (expanded)
      ]
    };
  }

