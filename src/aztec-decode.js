  // ════════════════════════════════════════════════════════════════════════
  // aztec-decode.js — Aztec Code Decoder
  // ════════════════════════════════════════════════════════════════════════

  static decodeAztec(matrix) {
    const rows = matrix.length;
    if (rows === 0) return null;
    const center = Math.floor(rows / 2);

    
    let isCompact = true;
    let mmRadius = 5;
    if (matrix[center]?.[center] !== 1) return null; // center must be dark
    if (matrix[center - 1]?.[center] !== 0 || matrix[center - 2]?.[center] !== 1 ||
        matrix[center - 3]?.[center] !== 0 || matrix[center - 4]?.[center] !== 1) return null;
        
    let isFull = (matrix[center - 5]?.[center - 5] === 0);

    const tryDecode = (compact) => {
      const rad = compact ? 5 : 7;
      const bits = [];
      if (compact) {
        for (let i = 0; i < 7; i++) {
          let offset = center - 3 + i;
          bits.push(matrix[center - 5]?.[offset] || 0);
        }
        for (let i = 0; i < 7; i++) {
          let offset = center - 3 + i;
          bits.push(matrix[offset]?.[center + 5] || 0);
        }
        for (let i = 0; i < 7; i++) {
          let offset = center - 3 + (6 - i);
          bits.push(matrix[center + 5]?.[offset] || 0);
        }
        for (let i = 0; i < 7; i++) {
          let offset = center - 3 + (6 - i);
          bits.push(matrix[offset]?.[center - 5] || 0);
        }
      } else {
        for (let i = 0; i < 10; i++) {
          let offset = center - 5 + i + Math.floor(i / 5);
          bits.push(matrix[center - 7]?.[offset] || 0);
        }
        for (let i = 0; i < 10; i++) {
          let offset = center - 5 + i + Math.floor(i / 5);
          bits.push(matrix[offset]?.[center + 7] || 0);
        }
        for (let i = 0; i < 10; i++) {
          let offset = center - 5 + (9 - i) + Math.floor((9 - i) / 5);
          bits.push(matrix[center + 7]?.[offset] || 0);
        }
        for (let i = 0; i < 10; i++) {
          let offset = center - 5 + (9 - i) + Math.floor((9 - i) / 5);
          bits.push(matrix[offset]?.[center - 7] || 0);
        }
      }
      const words = [];
      for (let i = 0; i < bits.length; i += 4)
        words.push((bits[i] << 3) | (bits[i+1] << 2) | (bits[i+2] << 1) | bits[i+3]);
      const ecCount = compact ? 5 : 6;
      return czQR._az_rsDecode(words, ecCount, 4);
    };

    let correctedMM = null;
    if (isFull) {
      correctedMM = tryDecode(false);
      if (correctedMM) { isCompact = false; mmRadius = 7; }
      else return null;
    } else {
      correctedMM = tryDecode(true);
      if (correctedMM) { isCompact = true; mmRadius = 5; }
      else return null;
    }
  

    const mmDataCount = isCompact ? 2 : 4;
    let modeMsg = 0;
    for (let i = 0; i < mmDataCount; i++) modeMsg = (modeMsg << 4) | correctedMM[i];

    let symLayers = 0;
    let dataWords = 0;
    if (isCompact) {
      symLayers = (modeMsg >> 6) + 1;
      dataWords = (modeMsg & 0x3F) + 1;
    } else {
      symLayers = (modeMsg >> 11) + 1;
      dataWords = (modeMsg & 0x7FF) + 1;
    }

    let wordSize = symLayers <= 2 ? 6 : symLayers <= 8 ? 8 : symLayers <= 22 ? 10 : 12;


    const baseMatrixSize = czQR._az_getBaseMatrixSize(symLayers, isCompact);
    const matrixSize = czQR._az_getModuleCount(symLayers, isCompact);

    const alignmentMap = Array(baseMatrixSize).fill(0);
    if (isCompact) {
      for (let i = 0; i < baseMatrixSize; i++) alignmentMap[i] = i;
    } else {
      let origCenter = Math.floor(baseMatrixSize / 2);
      let center = Math.floor(matrixSize / 2);
      for (let i = 0; i < origCenter; i++) {
        let newOffset = i + Math.floor(i / 15);
        alignmentMap[origCenter - i - 1] = center - newOffset - 1;
        alignmentMap[origCenter + i] = center + newOffset + 1;
      }
    }

    const totalBitCap = czQR._az_getTotalBitCapacity(symLayers, isCompact);
    const allBits = Array(totalBitCap).fill(0);
    let rowOffset = 0;

    for (let i = 0; i < symLayers; i++) {
      let rowSize = (symLayers - i) * 4 + (isCompact ? 9 : 12);
      for (let j = 0; j < rowSize; j++) {
        let columnOffset = j * 2;
        for (let k = 0; k < 2; k++) {
          allBits[rowOffset + columnOffset + k] = 
            matrix[alignmentMap[i * 2 + j]][alignmentMap[i * 2 + k]];
          
          allBits[rowOffset + rowSize * 2 + columnOffset + k] = 
            matrix[alignmentMap[baseMatrixSize - 1 - i * 2 - k]][alignmentMap[i * 2 + j]];
          
          allBits[rowOffset + rowSize * 4 + columnOffset + k] = 
            matrix[alignmentMap[baseMatrixSize - 1 - i * 2 - j]][alignmentMap[baseMatrixSize - 1 - i * 2 - k]];
          
          allBits[rowOffset + rowSize * 6 + columnOffset + k] = 
            matrix[alignmentMap[i * 2 + k]][alignmentMap[baseMatrixSize - 1 - i * 2 - j]];
        }
      }
      rowOffset += rowSize * 8;
    }
    const startPad = totalBitCap % wordSize;
    let allWords = [];
    for (let i = startPad; i + wordSize <= allBits.length; i += wordSize) {
      let w = 0;
      for (let j = 0; j < wordSize; j++) w = (w << 1) | allBits[i + j];
      allWords.push(w);
    }

    const totalWordCount = Math.floor(totalBitCap / wordSize);
    const ecWords = totalWordCount - dataWords;
    if (ecWords < 0) return null;
    const dataWordArr = allWords.slice(0, dataWords + ecWords);

    const correctedData = czQR._az_rsDecode(dataWordArr, ecWords, wordSize);
    if (!correctedData) return null;

    // Convert data codewords to bits
    let cwBits = [];
    for (let i = 0; i < dataWords; i++) {
      let w = correctedData[i];
      for (let j = wordSize - 1; j >= 0; j--) cwBits.push((w >> j) & 1);
    }

    // Remove bit stuffing (reverse of _az_stuffBits)
    const unstuffed = [];
    const mask = (1 << wordSize) - 2;
    for (let i = 0; i < cwBits.length; i += wordSize) {
      let word = 0;
      for (let j = 0; j < wordSize && i + j < cwBits.length; j++) {
        word |= cwBits[i + j] << (wordSize - 1 - j);
      }
      if ((word & mask) === mask) {
        // Top bits all 1, last bit was forced to 0 → output top (wordSize-1) bits
        for (let j = 0; j < wordSize - 1; j++) unstuffed.push((word >> (wordSize - 1 - j)) & 1);
      } else if ((word & mask) === 0) {
        // Top bits all 0, last bit was forced to 1 → output top (wordSize-1) bits
        for (let j = 0; j < wordSize - 1; j++) unstuffed.push((word >> (wordSize - 1 - j)) & 1);
      } else {
        // Normal word → output all bits
        for (let j = 0; j < wordSize; j++) unstuffed.push((word >> (wordSize - 1 - j)) & 1);
      }
    }

    try {
      const data = czQR._az_decodeModes(unstuffed);
      if (!data || data.length === 0) return null;
      return { data, layers: symLayers, compact: isCompact };
    } catch (e) {
      return null;
    }
  }

  static _az_decodeModes(bits) {
    let mode = czQR._AZ_UPPER;
    let shiftMode = null;
    let text = "";
    let i = 0;

    const readBits = (n) => {
      if (i + n > bits.length) return null;
      let val = 0;
      for (let j = 0; j < n; j++) val = (val << 1) | bits[i++];
      return val;
    };

    while (i < bits.length) {
      let curMode = shiftMode !== null ? shiftMode : mode;
      
      if (curMode === czQR._AZ_BINARY) {
        let len = readBits(5);
        if (len === null) break;
        if (len === 0) {
          len = readBits(11);
          if (len === null) break;
          len += 31;
        }
        for (let j = 0; j < len; j++) {
          let b = readBits(8);
          if (b === null) break;
          text += String.fromCharCode(b);
        }
        shiftMode = null;
        continue;
      }
      
      let bitsPerChar = curMode === czQR._AZ_DIGIT ? 4 : 5;
      let code = readBits(bitsPerChar);
      if (code === null) break;
      
      if (curMode === czQR._AZ_UPPER) {
        if (code === 0) shiftMode = czQR._AZ_PUNCT;
        else if (code === 1) text += " ";
        else if (code >= 2 && code <= 27) text += String.fromCharCode(code - 2 + 65);
        else if (code === 28) mode = czQR._AZ_LOWER;
        else if (code === 29) mode = czQR._AZ_MIXED;
        else if (code === 30) mode = czQR._AZ_DIGIT;
        else if (code === 31) shiftMode = czQR._AZ_BINARY;
      } else if (curMode === czQR._AZ_LOWER) {
        if (code === 0) shiftMode = czQR._AZ_PUNCT;
        else if (code === 1) text += " ";
        else if (code >= 2 && code <= 27) text += String.fromCharCode(code - 2 + 97);
        else if (code === 28) shiftMode = czQR._AZ_UPPER;
        else if (code === 29) mode = czQR._AZ_MIXED;
        else if (code === 30) mode = czQR._AZ_DIGIT;
        else if (code === 31) shiftMode = czQR._AZ_BINARY;
      } else if (curMode === czQR._AZ_MIXED) {
        if (code === 0) shiftMode = czQR._AZ_PUNCT;
        else if (code === 1) text += " ";
        else if (code >= 2 && code <= 14) text += String.fromCharCode(code - 1);
        else if (code === 15) text += "\x1b";
        else if (code >= 16 && code <= 19) text += String.fromCharCode(code + 12);
        else if (code >= 20 && code <= 27) {
          const mChars = ["@","\\","^","_","`","|","~","\x7f"];
          text += mChars[code - 20];
        }
        else if (code === 28) mode = czQR._AZ_LOWER;
        else if (code === 29) mode = czQR._AZ_UPPER;
        else if (code === 30) mode = czQR._AZ_PUNCT;
        else if (code === 31) shiftMode = czQR._AZ_BINARY;
      } else if (curMode === czQR._AZ_PUNCT) {
        if (code === 0) { 
          readBits(3); 
        } else if (code === 1) text += "\r";
        else if (code === 2) text += "\r\n";
        else if (code === 3) text += ". ";
        else if (code === 4) text += ", ";
        else if (code === 5) text += ": ";
        else if (code >= 6 && code <= 30) {
          const pChars = ["!","\"","#","$","%","&","'","(",")","*","+",",","-",".","/",":",";","<","=",">","?","[","]","{","}"];
          text += pChars[code - 6];
        }
        else if (code === 31) mode = czQR._AZ_UPPER;
      } else if (curMode === czQR._AZ_DIGIT) {
        if (code === 0) shiftMode = czQR._AZ_PUNCT;
        else if (code === 1) text += " ";
        else if (code >= 2 && code <= 11) text += String.fromCharCode(code - 2 + 48);
        else if (code === 12) text += ",";
        else if (code === 13) text += ".";
        else if (code === 14) mode = czQR._AZ_UPPER;
        else if (code === 15) shiftMode = czQR._AZ_UPPER;
      }
      
      if (shiftMode !== null && curMode === shiftMode) shiftMode = null;
    }
    
    return text;
  }

  static _az_rsDecode(block, ecCount, wordSize) {
    let poly = 0;
    if (wordSize === 4) poly = 0x13;
    else if (wordSize === 6) poly = 0x43;
    else if (wordSize === 8) poly = 0x12d;
    else if (wordSize === 10) poly = 0x409;
    else if (wordSize === 12) poly = 0x1069;
    
    let limit = 1 << wordSize;
    let exp = new Int32Array(limit * 2);
    let log = new Int32Array(limit);
    let x = 1;
    for (let i = 0; i < limit - 1; i++) {
      exp[i] = x;
      log[x] = i;
      x <<= 1;
      if (x >= limit) x ^= poly;
    }
    for (let i = limit - 1; i < limit * 2; i++) exp[i] = exp[i - (limit - 1)];

    const add = (a, b) => a ^ b;
    const mul = (a, b) => (a === 0 || b === 0) ? 0 : exp[(log[a] + log[b]) % (limit - 1)];
    const inv = (a) => exp[(limit - 1) - log[a]];
    
    const syn = new Int32Array(ecCount);
    let hasError = false;
    for (let i = 0; i < ecCount; i++) {
      let s = 0;
      const root = exp[i + 1];
      for (let j = 0; j < block.length; j++) s = add(mul(s, root), block[j]);
      syn[i] = s;
      if (s !== 0) hasError = true;
    }
    
    if (!hasError) return block.slice(0, block.length - ecCount);
    
    let C = new Int32Array(ecCount + 1); C[0] = 1;
    let B = new Int32Array(ecCount + 1); B[0] = 1;
    let L = 0, m = 1;
    
    for (let k = 0; k < ecCount; k++) {
      let d = syn[k];
      for (let i = 1; i <= L; i++) d = add(d, mul(C[i], syn[k - i]));
      
      if (d === 0) {
        m++;
      } else {
        const T = new Int32Array(ecCount + 1);
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
      const x_inv = exp[(limit - 1 - (block.length - 1 - i) % (limit - 1)) % (limit - 1)];
      let xPower = 1;
      for (let j = 0; j <= L; j++) {
        sum = add(sum, mul(errPoly[j], xPower));
        xPower = mul(xPower, x_inv);
      }
      if (sum === 0) {
        errPos.push(i);
        errLoc.push(exp[(block.length - 1 - i) % (limit - 1)]);
      }
    }
    
    if (errPos.length !== L) return null;
    
    const omega = new Int32Array(L);
    for (let i = 0; i < L; i++) {
      let s = 0;
      for (let j = 0; j <= i; j++) s = add(s, mul(errPoly[j], syn[i - j]));
      omega[i] = s;
    }
    
    const corrected = Array.from(block);
    for (let i = 0; i < errPos.length; i++) {
      const xInv = exp[(limit - 1) - log[errLoc[i]]];
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
      if (den === 0) return null;
      const mag = mul(errLoc[i], mul(num, inv(den)));
      corrected[errPos[i]] = add(corrected[errPos[i]], mag);
    }
    
    return corrected.slice(0, block.length - ecCount);
  }

  static readAztec(imageData) {
    let bm;
    try { bm = czQR._rd_binarize(imageData, 0); } catch(e) { return null; }
    const { width: w, height: h, data } = bm;
    if (w < 15 || h < 15) return null;

    const get = (x, y) => (x >= 0 && x < w && y >= 0 && y < h) ? data[y * w + x] : 0;

    // Scan for bull's eye center candidates
    // The center of Aztec is a dark pixel with alternating dark/light rings
    const step = Math.max(1, Math.floor(Math.min(w, h) / 80));
    let bestResult = null;

    for (let cy = 8; cy < h - 8; cy += step) {
      for (let cx = 8; cx < w - 8; cx += step) {
        if (!get(cx, cy)) continue; // center must be dark

        // Check for alternating rings outward (dark, light, dark, light, dark)
        // Measure ring widths in 4 directions
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        let valid = true;
        let totalModSize = 0;
        let ringCount = 0;

        for (const [dx, dy] of dirs) {
          let expected = 1; // start dark
          let rings = [];
          let runLen = 0;

          for (let dist = 0; dist <= Math.min(w, h) / 2; dist++) {
            const px = cx + dx * dist, py = cy + dy * dist;
            if (px < 0 || px >= w || py < 0 || py >= h) break;
            const v = get(px, py) ? 1 : 0;
            if (v === expected) {
              runLen++;
            } else {
              rings.push(runLen);
              runLen = 1;
              expected = v;
              if (rings.length >= 7) break;
            }
          }
          if (runLen > 0) rings.push(runLen);

          // Need at least 5 alternating rings for compact
          if (rings.length < 5) { valid = false; break; }

          // Ring[0] starts from center pixel so it's roughly half a module width
          // Use rings[1..3] (full-width light-dark-light) for module size estimation
          // These are the most reliable since they're inside the bull's eye
          let estMod;
          if (rings.length >= 4) {
            estMod = (rings[1] + rings[2] + rings[3]) / 3;
          } else {
            estMod = (rings[1] + rings[2]) / 2;
          }

          // ring[0] should be roughly 0.3-1.2x module size (half because we start from center)
          if (rings[0] < estMod * 0.2 || rings[0] > estMod * 1.5) { valid = false; break; }
          // rings 1-3 should be within reasonable range
          for (let r = 1; r < Math.min(4, rings.length); r++) {
            if (rings[r] < estMod * 0.3 || rings[r] > estMod * 2.5) { valid = false; break; }
          }
          if (!valid) break;

          totalModSize += estMod;
          ringCount++;
        }

        if (!valid || ringCount < 4) continue;

        const modSize = totalModSize / ringCount;
        if (modSize < 1.5) continue;

        // Refine center by scanning for the center of mass of the central dark square
        let sumX = 0, sumY = 0, cnt = 0;
        const scanR = Math.ceil(modSize * 1.2);
        for (let dy = -scanR; dy <= scanR; dy++) {
          for (let dx = -scanR; dx <= scanR; dx++) {
            if (get(cx + dx, cy + dy)) { sumX += cx + dx; sumY += cy + dy; cnt++; }
          }
        }
        if (cnt === 0) continue;
        const rcx = sumX / cnt, rcy = sumY / cnt;

        // Try to determine compact vs full by checking ring count
        // Compact: 5 rings (radius 5 modules), Full: 7 rings (radius 7 modules)
        let isCompact = true;
        // Check at radius ~6 modules — if still alternating, it's full-range
        const checkDist = Math.round(modSize * 5.5);
        let fullRings = 0;
        for (const [dx, dy] of dirs) {
          const px = Math.round(rcx + dx * checkDist), py = Math.round(rcy + dy * checkDist);
          // For full-range, there should be more alternating rings at distance 6+
          let r6 = 0, expected = get(Math.round(rcx + dx * Math.round(modSize * 5)), Math.round(rcy + dy * Math.round(modSize * 5))) ? 1 : 0;
          for (let d = Math.round(modSize * 5); d <= Math.round(modSize * 7.5); d++) {
            const x2 = Math.round(rcx + dx * d), y2 = Math.round(rcy + dy * d);
            if (x2 < 0 || x2 >= w || y2 < 0 || y2 >= h) break;
            const v = get(x2, y2) ? 1 : 0;
            if (v !== expected) { r6++; expected = v; }
          }
          if (r6 >= 2) fullRings++;
        }
        if (fullRings >= 3) isCompact = false;

        // Try both compact and full, see which one decodes
        for (const tryCompact of (isCompact ? [true, false] : [false, true])) {
          const result = czQR._az_trySampleAndDecode(bm, rcx, rcy, modSize, tryCompact);
          if (result) {
            if (!bestResult || result.data.length > bestResult.data.length) {
              bestResult = result;
            }
          }
        }

        if (bestResult) return bestResult;
      }
    }

    return bestResult;
  }

  static _az_trySampleAndDecode(bm, cx, cy, modSize, isCompact) {
    const { width: w, height: h, data } = bm;
    const get = (x, y) => (x >= 0 && x < w && y >= 0 && y < h) ? data[y * w + x] : 0;

    // Determine expected matrix size
    // Try multiple possible layer counts and see which one decodes
    const maxLayers = isCompact ? 4 : 32;
    const minLayers = 1;

    // Estimate layers from the apparent size of the symbol
    // Find the outermost dark module in each direction
    let maxRadius = 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      let lastDark = 0;
      for (let d = 0; d < Math.min(w, h) / 2; d++) {
        const px = Math.round(cx + dx * d), py = Math.round(cy + dy * d);
        if (px < 0 || px >= w || py < 0 || py >= h) break;
        if (get(px, py)) lastDark = d;
        else if (d > lastDark + modSize * 3) break;
      }
      if (lastDark > maxRadius) maxRadius = lastDark;
    }

    const estModules = Math.round(maxRadius * 2 / modSize) + 1;

    // Try a range of layer counts around the estimate
    for (let layers = minLayers; layers <= maxLayers; layers++) {
      const baseSize = isCompact ? 11 + layers * 4 : 14 + layers * 4;
      const matrixSize = isCompact ? baseSize : baseSize + 1 + 2 * Math.floor((Math.floor(baseSize / 2) - 1) / 15);

      // Check if estimated size is roughly compatible
      if (Math.abs(matrixSize - estModules) > matrixSize * 0.4 && layers > 2) continue;

      // Sample the grid
      const matrix = [];
      const halfSize = matrixSize / 2;

      for (let r = 0; r < matrixSize; r++) {
        const row = [];
        for (let c = 0; c < matrixSize; c++) {
          const px = Math.round(cx + (c - halfSize + 0.5) * modSize);
          const py = Math.round(cy + (r - halfSize + 0.5) * modSize);
          row.push(get(px, py) ? 1 : 0);
        }
        matrix.push(row);
      }

      // Try to decode
      try {
        const decoded = czQR.decodeAztec(matrix);
        if (decoded && decoded.data && decoded.data.length > 0) {
          // Compute tight bounds by scanning actual dark pixels (same as DataMatrix)
          const estR = halfSize * modSize;
          const scanMargin = Math.round(modSize * 2);
          const sx = Math.max(0, Math.round(cx - estR) - scanMargin);
          const sy = Math.max(0, Math.round(cy - estR) - scanMargin);
          const ex = Math.min(w - 1, Math.round(cx + estR) + scanMargin);
          const ey = Math.min(h - 1, Math.round(cy + estR) + scanMargin);
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
          const pad = Math.round(modSize * 0.3);
          const bullsEyeRadius = (isCompact ? 5 : 7) * modSize;

          // Corners for rotated marker rendering (TL, TR, BR, BL)
          // Aztec is scanned axis-aligned, so corners follow bounds
          const cPad = Math.round(modSize * 0.5);
          const cX1 = Math.max(0, bMinX - cPad);
          const cY1 = Math.max(0, bMinY - cPad);
          const cX2 = Math.min(w - 1, bMaxX + cPad);
          const cY2 = Math.min(h - 1, bMaxY + cPad);

          return {
            data: decoded.data,
            format: 'aztec',
            type: '2d',
            layers: decoded.layers,
            compact: decoded.compact,
            bullsEye: { x: cx, y: cy, radius: bullsEyeRadius },
            angle: 0,
            corners: [
              { x: cX1, y: cY1 },  // TL
              { x: cX2, y: cY1 },  // TR
              { x: cX2, y: cY2 },  // BR
              { x: cX1, y: cY2 },  // BL
            ],
            bounds: {
              x: Math.max(0, bMinX - pad),
              y: Math.max(0, bMinY - pad),
              w: bMaxX - bMinX + 1 + pad * 2,
              h: bMaxY - bMinY + 1 + pad * 2
            }
          };
        }
      } catch(e) {}
    }

    return null;
  }
