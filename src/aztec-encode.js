// ════════════════════════════════════════════════════════════════════════
// aztec-encode.js — Aztec Code ECC200 generation
// Based on ISO 24778 / etiket reference
// ════════════════════════════════════════════════════════════════════════

  // ── Mode Encodings ──
  static _AZ_UPPER = 0;
  static _AZ_LOWER = 1;
  static _AZ_MIXED = 2;
  static _AZ_PUNCT = 3;
  static _AZ_DIGIT = 4;
  static _AZ_BINARY = 5;

  static _az_encodeData(bytes) {
    let bits = [];
    function pushBits(val, len) {
      for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    }
    let i = 0;
    while (i < bytes.length) {
      let run = bytes.length - i;
      if (run > 2078) run = 2078;
      
      let first = run <= 62 ? Math.min(run, 31) : run;

      pushBits(31, 5); // Shift to Binary
      if (run > 62) {
        pushBits(0, 5);
        pushBits(run - 31, 11);
      } else {
        pushBits(first, 5);
      }
      for (let j = 0; j < first; j++) {
        pushBits(bytes[i + j], 8);
      }
      
      if (first < run) {
        pushBits(31, 5);
        pushBits(run - first, 5);
        for (let j = first; j < run; j++) {
          pushBits(bytes[i + j], 8);
        }
      }
      i += run;
    }
    return bits;
  }

  // ── Bit Stuffing ──
  static _az_stuffBits(bits, wordSize) {
    let result = [];
    let n = bits.length;
    let mask = (1 << wordSize) - 2;
    for (let i = 0; i < n; i += wordSize) {
      let word = 0;
      for (let j = 0; j < wordSize; j++) {
        if (i + j >= n || bits[i + j]) word |= 1 << (wordSize - 1 - j);
      }
      if ((word & mask) === mask) {
        czQR._az_pushBitsFromValue(result, word & mask, wordSize);
        i--;
      } else if ((word & mask) === 0) {
        czQR._az_pushBitsFromValue(result, word | 1, wordSize);
        i--;
      } else {
        czQR._az_pushBitsFromValue(result, word, wordSize);
      }
    }
    return result;
  }

  static _az_pushBitsFromValue(result, value, wordSize) {
    for (let b = wordSize - 1; b >= 0; b--) result.push((value >> b) & 1);
  }

  // ── Reed-Solomon ──
  static _az_rs(data, ecCount, wordSize) {
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
    
    let gen = [1];
    for (let i = 1; i <= ecCount; i++) {
      let root = exp[i];
      let newGen = Array(gen.length + 1).fill(0);
      for (let j = 0; j < gen.length; j++) {
        newGen[j] ^= gen[j];
        if (gen[j] !== 0 && root !== 0) {
          newGen[j + 1] ^= exp[(log[gen[j]] + log[root]) % (limit - 1)];
        }
      }
      gen = newGen;
    }
    
    let dividend = [...data, ...Array(ecCount).fill(0)];
    for (let i = 0; i < data.length; i++) {
      if (dividend[i] !== 0) {
        let coeff = dividend[i];
        for (let j = 0; j < gen.length; j++) {
          if (coeff !== 0 && gen[j] !== 0) {
            dividend[i + j] ^= exp[(log[coeff] + log[gen[j]]) % (limit - 1)];
          }
        }
      }
    }
    
    return dividend.slice(data.length);
  }

  static _az_getTotalBitCapacity(layers, compact) {
    return ((compact ? 88 : 112) + 16 * layers) * layers;
  }
  static _az_getWordSize(layers) {
    if (layers <= 2) return 6;
    if (layers <= 8) return 8;
    if (layers <= 22) return 10;
    return 12;
  }
  static _az_getBaseMatrixSize(layers, compact) {
    return compact ? 11 + layers * 4 : 14 + layers * 4;
  }
  static _az_getModuleCount(layers, compact) {
    let base = czQR._az_getBaseMatrixSize(layers, compact);
    return compact ? base : base + 1 + 2 * Math.floor((Math.floor(base / 2) - 1) / 15);
  }

  static aztec(data, options = {}) {
    let text = String(data);
    let bytes = [];
    for (let i = 0; i < text.length; i++) {
      let code = text.codePointAt(i);
      if (code > 255) throw new Error("Aztec encoder currently only supports ISO-8859-1");
      bytes.push(code);
    }
    
    let dataBits = czQR._az_encodeData(bytes);
    
    let ecPercent = options.ecPercent || 33;
    let eccBits = Math.floor(dataBits.length * ecPercent / 100) + 11;
    let totalSizeBits = dataBits.length + eccBits;
    
    let isCompact = false;
    let symLayers = 0;
    let wordSize = 0;
    let totalBitsInLayer = 0;
    let stuffedBits = null;

    if (options.layers !== undefined) {
      symLayers = options.layers;
      isCompact = options.compact !== undefined ? options.compact : symLayers <= 4;
      totalBitsInLayer = czQR._az_getTotalBitCapacity(symLayers, isCompact);
      wordSize = czQR._az_getWordSize(symLayers);
      stuffedBits = czQR._az_stuffBits(dataBits, wordSize);
    } else {
      for (let i = 0; i <= 32; i++) {
        let compact = i <= 3;
        let layers = compact ? i + 1 : i;
        
        // Exclude if options.compact says otherwise
        if (compact && options.compact === false) continue;
        if (!compact && options.compact === true) continue;

        let curBitCap = czQR._az_getTotalBitCapacity(layers, compact);
        if (totalSizeBits > curBitCap) continue;
        
        let curWordSize = czQR._az_getWordSize(layers);
        let tryStuffed = czQR._az_stuffBits(dataBits, curWordSize);
        
        let usableBits = curBitCap - (curBitCap % curWordSize);
        if (compact && tryStuffed.length > curWordSize * 64) continue;
        
        if (tryStuffed.length + eccBits <= usableBits) {
          symLayers = layers;
          isCompact = compact;
          wordSize = curWordSize;
          totalBitsInLayer = curBitCap;
          stuffedBits = tryStuffed;
          break;
        }
      }
    }
    if (!symLayers) throw new Error("Data too large for Aztec Code");

    let messageSizeInWords = Math.floor(stuffedBits.length / wordSize);
    let totalWords = Math.floor(totalBitsInLayer / wordSize);
    
    let messageWords = Array(totalWords).fill(0);
    for (let i = 0; i < messageSizeInWords; i++) {
      let val = 0;
      for (let j = 0; j < wordSize; j++) {
        val |= (stuffedBits[i * wordSize + j] ? 1 : 0) << (wordSize - j - 1);
      }
      messageWords[i] = val;
    }
    
    let ecCount = totalWords - messageSizeInWords;
    let ec = czQR._az_rs(messageWords.slice(0, messageSizeInWords), ecCount, wordSize);
    for (let i = 0; i < ecCount; i++) messageWords[messageSizeInWords + i] = ec[i];
    
    let startPad = totalBitsInLayer % wordSize;
    let messageBits = [];
    for (let i = 0; i < startPad; i++) messageBits.push(0);
    for (let cw of messageWords) {
      for (let b = wordSize - 1; b >= 0; b--) messageBits.push((cw >> b) & 1);
    }
    
    let baseMatrixSize = czQR._az_getBaseMatrixSize(symLayers, isCompact);
    let matrixSize = czQR._az_getModuleCount(symLayers, isCompact);
    let matrix = Array(matrixSize).fill(0).map(() => Array(matrixSize).fill(0));
    
    let alignmentMap = Array(baseMatrixSize).fill(0);
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
    
    let rowOffset = 0;
    for (let i = 0; i < symLayers; i++) {
      let rowSize = (symLayers - i) * 4 + (isCompact ? 9 : 12);
      for (let j = 0; j < rowSize; j++) {
        let columnOffset = j * 2;
        for (let k = 0; k < 2; k++) {
          if (messageBits[rowOffset + columnOffset + k]) {
            matrix[alignmentMap[i * 2 + j]][alignmentMap[i * 2 + k]] = 1;
          }
          if (messageBits[rowOffset + rowSize * 2 + columnOffset + k]) {
            matrix[alignmentMap[baseMatrixSize - 1 - i * 2 - k]][alignmentMap[i * 2 + j]] = 1;
          }
          if (messageBits[rowOffset + rowSize * 4 + columnOffset + k]) {
            matrix[alignmentMap[baseMatrixSize - 1 - i * 2 - j]][alignmentMap[baseMatrixSize - 1 - i * 2 - k]] = 1;
          }
          if (messageBits[rowOffset + rowSize * 6 + columnOffset + k]) {
            matrix[alignmentMap[i * 2 + k]][alignmentMap[baseMatrixSize - 1 - i * 2 - j]] = 1;
          }
        }
      }
      rowOffset += rowSize * 8;
    }
    
    let modeMsgBits = [];
    if (isCompact) {
      let val = ((symLayers - 1) << 6) | (messageSizeInWords - 1);
      let cw0 = (val >> 4) & 0x0f;
      let cw1 = val & 0x0f;
      let m_ec = czQR._az_rs([cw0, cw1], 5, 4);
      for (let cw of [cw0, cw1, ...m_ec]) {
        for (let b = 3; b >= 0; b--) modeMsgBits.push((cw >> b) & 1);
      }
    } else {
      let val = ((symLayers - 1) << 11) | (messageSizeInWords - 1);
      let cw0 = (val >> 12) & 0x0f;
      let cw1 = (val >> 8) & 0x0f;
      let cw2 = (val >> 4) & 0x0f;
      let cw3 = val & 0x0f;
      let m_ec = czQR._az_rs([cw0, cw1, cw2, cw3], 6, 4);
      for (let cw of [cw0, cw1, cw2, cw3, ...m_ec]) {
        for (let b = 3; b >= 0; b--) modeMsgBits.push((cw >> b) & 1);
      }
    }
    
    let center = Math.floor(matrixSize / 2);
    if (isCompact) {
      for (let i = 0; i < 7; i++) {
        let offset = center - 3 + i;
        if (modeMsgBits[i]) matrix[center - 5][offset] = 1;
        if (modeMsgBits[i + 7]) matrix[offset][center + 5] = 1;
        if (modeMsgBits[20 - i]) matrix[center + 5][offset] = 1;
        if (modeMsgBits[27 - i]) matrix[offset][center - 5] = 1;
      }
    } else {
      for (let i = 0; i < 10; i++) {
        let offset = center - 5 + i + Math.floor(i / 5);
        if (modeMsgBits[i]) matrix[center - 7][offset] = 1;
        if (modeMsgBits[i + 10]) matrix[offset][center + 7] = 1;
        if (modeMsgBits[29 - i]) matrix[center + 7][offset] = 1;
        if (modeMsgBits[39 - i]) matrix[offset][center - 7] = 1;
      }
    }
    
    let radius = isCompact ? 5 : 7;
    for (let i = 0; i < radius; i += 2) {
      for (let j = center - i; j <= center + i; j++) {
        matrix[center - i][j] = 1;
        matrix[center + i][j] = 1;
        matrix[j][center - i] = 1;
        matrix[j][center + i] = 1;
      }
    }
    matrix[center - radius][center - radius] = 1;
    matrix[center - radius][center - radius + 1] = 1;
    matrix[center - radius + 1][center - radius] = 1;
    matrix[center - radius][center + radius] = 1;
    matrix[center - radius + 1][center + radius] = 1;
    matrix[center + radius - 1][center + radius] = 1;
    
    if (!isCompact) {
      let centerParity = center & 1;
      for (let i = 0, j = 0; i < Math.floor(baseMatrixSize / 2) - 1; i += 15, j += 16) {
        for (let k = centerParity; k < matrixSize; k += 2) {
          matrix[center - j][k] = 1;
          matrix[center + j][k] = 1;
          matrix[k][center - j] = 1;
          matrix[k][center + j] = 1;
        }
      }
    }
    
    let size = options.size || 300;
    let fg = options.fg || '#000000';
    let bg = options.bg || '#ffffff';
    let margin = options.margin != null ? options.margin : 1;
    let output = (options.output || 'svg').toLowerCase();
    
    if (output === 'matrix') return matrix;
    if (output === 'svg') return czQR._az_renderSVG(matrix, matrixSize, size, fg, bg, margin);
    let canvas = czQR._az_renderCanvas(matrix, matrixSize, size, fg, bg, margin);
    if (output === 'canvas') return canvas;
    if (output === 'png' || output === 'datauri') return canvas.toDataURL('image/png');
    return canvas;
  }

  static _az_renderSVG(matrix, modules, size, fg, bg, margin) {
    let sx = modules + margin * 2;
    let esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${sx} ${sx}" shape-rendering="crispEdges">`;
    if (bg !== 'transparent') svg += `<rect width="${sx}" height="${sx}" fill="${esc(bg)}"/>`;
    let d = '';
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (matrix[r][c]) d += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
    if (d) svg += `<path d="${d}" fill="${esc(fg)}"/>`;
    svg += '</svg>';
    return svg;
  }

  static _az_renderCanvas(matrix, modules, size, fg, bg, margin) {
    let sx = modules + margin * 2;
    let ms = size / sx;
    let canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    let ctx = canvas.getContext('2d');
    if (bg === 'transparent') ctx.clearRect(0, 0, size, size);
    else { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }
    ctx.fillStyle = fg;
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (matrix[r][c]) ctx.fillRect(Math.floor((c + margin) * ms), Math.floor((r + margin) * ms), Math.ceil(ms), Math.ceil(ms));
      }
    }
    return canvas;
  }
