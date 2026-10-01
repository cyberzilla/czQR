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

  static _az_charToValue(mode, ch) {
    if (mode === czQR._AZ_UPPER) {
      if (ch === 32) return 1;
      if (ch >= 65 && ch <= 90) return ch - 65 + 2;
    } else if (mode === czQR._AZ_LOWER) {
      if (ch === 32) return 1;
      if (ch >= 97 && ch <= 122) return ch - 97 + 2;
    } else if (mode === czQR._AZ_MIXED) {
      if (ch === 32) return 1;
      if (ch >= 1 && ch <= 13) return ch + 1;
      if (ch === 27) return 15; // ESC
      if (ch >= 28 && ch <= 31) return ch - 12; // FS, GS, RS, US
      if (ch === 64) return 20; // @
      if (ch === 92) return 21; // \
      if (ch === 94) return 22; // ^
      if (ch === 95) return 23; // _
      if (ch === 96) return 24; // `
      if (ch === 124) return 25; // |
      if (ch === 126) return 26; // ~
      if (ch === 127) return 27; // DEL
    } else if (mode === czQR._AZ_PUNCT) {
      if (ch === 13) return 1; // CR
      // punct pair handled elsewhere
      if (ch >= 33 && ch <= 47) return ch - 27; // !"#$%&'()*+,-./
      if (ch >= 58 && ch <= 63) return ch - 37; // :;<=>?
      if (ch === 91) return 27; // [
      if (ch === 93) return 28; // ]
      if (ch === 123) return 29; // {
      if (ch === 125) return 30; // }
    } else if (mode === czQR._AZ_DIGIT) {
      if (ch === 32) return 1;
      if (ch >= 48 && ch <= 57) return ch - 48 + 2;
      if (ch === 44) return 12;
      if (ch === 46) return 13;
    }
    return -1;
  }

  static _az_encodeBinary(bytes) {
    let bs = [];
    let i = 0;
    while (i < bytes.length) {
      let len = bytes.length - i;
      let run = len;
      if (run > 2078) run = 2078;
      // if 32..62, split into 31 + remainder
      if (run > 31 && run < 63) run = 31;
      
      // Upper to Binary Shift
      bs.push(31);
      
      if (run <= 31) {
        bs.push(run);
      } else {
        bs.push(0);
        bs.push((run - 31) >> 6); // top 5 bits
        bs.push((run - 31) & 0x3F); // bottom 6 bits (this violates uniform word size lightly, but in bits it's 11 bits)
        // Wait, binary length is 5 bits (if <= 31) or 5 bits (0) + 11 bits.
        // Actually, the easiest way to represent the bitstream is just an array of bits.
      }
      for (let j = 0; j < run; j++) {
        bs.push(bytes[i + j]); // raw byte, will need 8 bits
      }
      i += run;
    }
    return bs;
  }
  
  static _az_getLatch(fromMode, toMode) {
    if (fromMode === toMode) return [];
    if (fromMode === czQR._AZ_UPPER) {
      if (toMode === czQR._AZ_LOWER) return [28];
      if (toMode === czQR._AZ_MIXED) return [29];
      if (toMode === czQR._AZ_PUNCT) return [29, 30];
      if (toMode === czQR._AZ_DIGIT) return [30];
    } else if (fromMode === czQR._AZ_LOWER) {
      if (toMode === czQR._AZ_UPPER) return [29, 29];
      if (toMode === czQR._AZ_MIXED) return [29];
      if (toMode === czQR._AZ_PUNCT) return [29, 30];
      if (toMode === czQR._AZ_DIGIT) return [30];
    } else if (fromMode === czQR._AZ_MIXED) {
      if (toMode === czQR._AZ_UPPER) return [29];
      if (toMode === czQR._AZ_LOWER) return [28];
      if (toMode === czQR._AZ_PUNCT) return [30];
      if (toMode === czQR._AZ_DIGIT) return [28, 30];
    } else if (fromMode === czQR._AZ_PUNCT) {
      if (toMode === czQR._AZ_UPPER) return [31];
      if (toMode === czQR._AZ_LOWER) return [31, 28];
      if (toMode === czQR._AZ_MIXED) return [31, 29];
      if (toMode === czQR._AZ_DIGIT) return [31, 30];
    } else if (fromMode === czQR._AZ_DIGIT) {
      if (toMode === czQR._AZ_UPPER) return [14];
      if (toMode === czQR._AZ_LOWER) return [14, 28];
      if (toMode === czQR._AZ_MIXED) return [14, 29];
      if (toMode === czQR._AZ_PUNCT) return [14, 29, 30];
    }
    return null;
  }

  // Simplified encoder for now - just uses binary mode for everything to ensure correctness and bypass DP complexity
  static _az_encodeData(bytes) {
    let bits = [];
    
    // Convert a value to bits
    function pushBits(val, len) {
      for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    }
    
    let i = 0;
    while (i < bytes.length) {
      let run = bytes.length - i;
      if (run > 2078) run = 2078;
      if (run >= 32 && run <= 62) run = 31;
      
      pushBits(31, 5); // Shift to Binary
      if (run <= 31) {
        pushBits(run, 5);
      } else {
        pushBits(0, 5);
        pushBits(run - 31, 11);
      }
      
      for (let j = 0; j < run; j++) {
        pushBits(bytes[i + j], 8);
      }
      i += run;
    }
    return bits;
  }

  // ── Bit Stuffing ──
  static _az_stuffBits(bits, wordSize) {
    let stuffed = [];
    let currentWord = 0;
    let bitCount = 0;
    
    for (let i = 0; i < bits.length; i++) {
      currentWord = (currentWord << 1) | bits[i];
      bitCount++;
      
      if (bitCount === wordSize - 1) {
        if (currentWord === ((1 << (wordSize - 1)) - 1)) {
          // all 1s -> stuff 0
          stuffed.push(...Array(wordSize - 1).fill(1), 0);
          currentWord = 0;
          bitCount = 0;
        } else if (currentWord === 0) {
          // all 0s -> stuff 1
          stuffed.push(...Array(wordSize - 1).fill(0), 1);
          currentWord = 0;
          bitCount = 0;
        }
      } else if (bitCount === wordSize) {
        for (let j = wordSize - 1; j >= 0; j--) stuffed.push((currentWord >> j) & 1);
        currentWord = 0;
        bitCount = 0;
      }
    }
    
    // remainder
    if (bitCount > 0) {
      let pad = wordSize - bitCount;
      currentWord = (currentWord << pad) | ((1 << pad) - 1); // pad with 1s
      // check if it needs stuffing (all 1s)
      if (currentWord === ((1 << wordSize) - 1)) {
        currentWord = (currentWord & ~1); // turn last bit to 0
      }
      for (let j = wordSize - 1; j >= 0; j--) stuffed.push((currentWord >> j) & 1);
    }
    
    return stuffed;
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
    
    let gen = new Int32Array(ecCount + 1);
    gen[0] = 1;
    for (let i = 1; i <= ecCount; i++) {
      let next = new Int32Array(ecCount + 1);
      for (let j = 0; j <= i; j++) {
        let t1 = j === 0 ? 0 : gen[j - 1];
        let t2 = gen[j] === 0 ? 0 : exp[(log[gen[j]] + i) % (limit - 1)];
        next[j] = t1 ^ t2;
      }
      gen = next;
    }
    
    let rem = new Int32Array(ecCount);
    for (let i = 0; i < data.length; i++) {
      let lead = data[i] ^ rem[0];
      for (let j = 0; j < ecCount - 1; j++) {
        rem[j] = rem[j + 1] ^ (lead === 0 ? 0 : exp[(log[lead] + log[gen[ecCount - 1 - j]]) % (limit - 1)]);
      }
      rem[ecCount - 1] = lead === 0 ? 0 : exp[(log[lead] + log[gen[0]]) % (limit - 1)];
    }
    
    return Array.from(rem);
  }

  static aztec(data, options = {}) {
    let text = String(data);
    let bytes = [];
    for (let i = 0; i < text.length; i++) {
      let code = text.codePointAt(i);
      if (code > 255) throw new Error("Aztec encoder currently only supports ISO-8859-1");
      bytes.push(code);
    }
    
    let bits = czQR._az_encodeData(bytes);
    
    let compact = options.compact !== false;
    let ecPercent = options.ecPercent || 33;
    let layers = options.layers || 0;
    
    let isCompact = false;
    let symLayers = 0;
    let wordSize = 0;
    let totalWords = 0;
    let dataWords = 0;
    let ecWords = 0;
    let stuffed = [];
    let bitCapacity = 0;
    
    // Find symbol size
    for (let i = 1; i <= 32; i++) {
      let tryCompact = i <= 4 && compact;
      let curWordSize = i <= 2 ? 6 : i <= 8 ? 8 : i <= 22 ? 10 : 12;
      let curBitCap = ((tryCompact ? 88 : 112) + 16 * i) * i;
      let curTotal = Math.floor(curBitCap / curWordSize);
      
      let tryStuffed = czQR._az_stuffBits(bits, curWordSize);
      let curData = Math.ceil(tryStuffed.length / curWordSize);
      
      let requiredEC = Math.ceil(curTotal * ecPercent / 100) + 3;
      
      if (layers > 0 && i !== layers) continue;
      
      if (curData + requiredEC <= curTotal) {
        isCompact = tryCompact;
        symLayers = i;
        wordSize = curWordSize;
        totalWords = curTotal;
        dataWords = curData;
        ecWords = curTotal - curData;
        stuffed = tryStuffed;
        bitCapacity = curBitCap;
        break;
      }
    }
    if (!symLayers) throw new Error("Data too large for Aztec Code");
    
    // pad to full words
    while (stuffed.length < dataWords * wordSize) stuffed.push(1); // pad with 1s
    
    // words array
    let dw = [];
    for (let i = 0; i < dataWords; i++) {
      let val = 0;
      for (let j = 0; j < wordSize; j++) val = (val << 1) | stuffed[i * wordSize + j];
      dw.push(val);
    }
    
    let ecw = czQR._az_rs(dw, ecWords, wordSize);
    let allWords = [...dw, ...ecw];
    
    // Convert to bits with startPad
    let startPad = bitCapacity % wordSize;
    let allBits = [];
    for (let i = 0; i < startPad; i++) allBits.push(0);
    for (let w of allWords) {
      for (let i = wordSize - 1; i >= 0; i--) allBits.push((w >> i) & 1);
    }
    
    let base = isCompact ? 11 + symLayers * 4 : 14 + symLayers * 4;
    let modules = isCompact ? base : base + 1 + 2 * Math.floor((Math.floor(base / 2) - 1) / 15);
    
    let matrix = Array(modules).fill(0).map(() => Array(modules).fill(0));
    let center = Math.floor(modules / 2);
    
    // Bulls eye
    let radius = isCompact ? 5 : 7;
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        let dr = Math.abs(r - center);
        let dc = Math.abs(c - center);
        let dist = Math.max(dr, dc);
        if (dist <= radius) {
          if (dist % 2 === 0) matrix[r][c] = 1; // dark
        }
      }
    }
    matrix[center - radius][center - radius] = 1; // orientation
    matrix[center - radius + 1][center - radius] = 1;
    matrix[center - radius][center - radius + 1] = 1;
    matrix[center + radius][center - radius] = 1;
    matrix[center + radius][center + radius] = 1;
    matrix[center - radius][center + radius] = 1; // orientation marks
    
    if (!isCompact) {
      // reference grid
      for (let i = 0; i < modules; i++) {
        if ((i - center) % 16 === 0) {
          for (let j = 0; j < modules; j++) {
            if (j % 2 === 0) {
              matrix[i][j] = 1;
              matrix[j][i] = 1;
            }
          }
        }
      }
    }
    
    // Mode message
    let modeMsg = 0;
    if (isCompact) {
      modeMsg = ((symLayers - 1) << 6) | (dataWords - 1);
    } else {
      modeMsg = ((symLayers - 1) << 11) | (dataWords - 1);
    }
    
    let mmLen = isCompact ? 2 : 5;
    let modeWords = [modeMsg >> (isCompact ? 4 : 12), (modeMsg >> (isCompact ? 0 : 8)) & 15];
    if (!isCompact) modeWords.push((modeMsg >> 4) & 15, modeMsg & 15);
    let mmEC = czQR._az_rs(modeWords, isCompact ? 5 : 6, 4);
    let mmBits = [];
    for (let w of [...modeWords, ...mmEC]) {
      for (let i = 3; i >= 0; i--) mmBits.push((w >> i) & 1);
    }
    
    let mmRadius = isCompact ? 5 : 7;
    let mmIdx = 0;
    
    function setMM(r, c) {
      if (mmIdx < mmBits.length && mmBits[mmIdx++]) matrix[r][c] = 1;
    }
    
    let offsets = isCompact ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    // top
    for (let i of offsets) setMM(center - mmRadius, center - mmRadius + 2 + i);
    // right
    for (let i of offsets) setMM(center - mmRadius + 2 + i, center + mmRadius);
    // bottom
    for (let i of offsets) setMM(center + mmRadius, center + mmRadius - 2 - i);
    // left
    for (let i of offsets) setMM(center + mmRadius - 2 - i, center - mmRadius);
    
    // Data mapping
    let bitIdx = 0;
    let map = Array(modules).fill(0).map(() => Array(modules).fill(-1));
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        let dr = Math.abs(r - center);
        let dc = Math.abs(c - center);
        if (Math.max(dr, dc) <= mmRadius) map[r][c] = -2; // occupied
        if (!isCompact && ((r - center) % 16 === 0 || (c - center) % 16 === 0)) map[r][c] = -2;
      }
    }
    
    let layerRad = mmRadius;
    for (let layer = 1; layer <= symLayers; layer++) {
      layerRad += 2;
      let startIdx = bitIdx;
      let sideLen = layerRad * 2;
      let capacity = sideLen * 2 * 4; // 4 sides, 2 wide
      
      // We go layer by layer, top left to top right, etc.
      // Top side
      for (let i = 0; i < sideLen; i++) {
        if (bitIdx < allBits.length) {
          let r = center - layerRad;
          let c = center - layerRad + i;
          // alignment offset
          if (map[r]?.[c] === -1) { matrix[r][c] = allBits[bitIdx++]; map[r][c] = 1; }
          r = center - layerRad + 1;
          if (map[r]?.[c] === -1) { matrix[r][c] = allBits[bitIdx++]; map[r][c] = 1; }
        }
      }
      // Right side
      for (let i = 0; i < sideLen; i++) {
        if (bitIdx < allBits.length) {
          let r = center - layerRad + i;
          let c = center + layerRad;
          if (map[r]?.[c] === -1) { matrix[r][c] = allBits[bitIdx++]; map[r][c] = 1; }
          c = center + layerRad - 1;
          if (map[r]?.[c] === -1) { matrix[r][c] = allBits[bitIdx++]; map[r][c] = 1; }
        }
      }
      // Bottom side
      for (let i = 0; i < sideLen; i++) {
        if (bitIdx < allBits.length) {
          let r = center + layerRad;
          let c = center + layerRad - i;
          if (map[r]?.[c] === -1) { matrix[r][c] = allBits[bitIdx++]; map[r][c] = 1; }
          r = center + layerRad - 1;
          if (map[r]?.[c] === -1) { matrix[r][c] = allBits[bitIdx++]; map[r][c] = 1; }
        }
      }
      // Left side
      for (let i = 0; i < sideLen; i++) {
        if (bitIdx < allBits.length) {
          let r = center + layerRad - i;
          let c = center - layerRad;
          if (map[r]?.[c] === -1) { matrix[r][c] = allBits[bitIdx++]; map[r][c] = 1; }
          c = center - layerRad + 1;
          if (map[r]?.[c] === -1) { matrix[r][c] = allBits[bitIdx++]; map[r][c] = 1; }
        }
      }
    }
    
    let size = options.size || 300;
    let fg = options.fg || '#000000';
    let bg = options.bg || '#ffffff';
    let margin = options.margin != null ? options.margin : 1;
    let output = (options.output || 'svg').toLowerCase();
    
    if (output === 'matrix') return matrix;
    if (output === 'svg') return czQR._az_renderSVG(matrix, modules, size, fg, bg, margin);
    let canvas = czQR._az_renderCanvas(matrix, modules, size, fg, bg, margin);
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
