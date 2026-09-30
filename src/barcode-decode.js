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


