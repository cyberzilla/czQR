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
    // Verify inner ring pattern (must match for any Aztec)
    if (matrix[center - 1]?.[center] !== 0 || matrix[center - 2]?.[center] !== 1 ||
        matrix[center - 3]?.[center] !== 0 || matrix[center - 4]?.[center] !== 1) return null;

    // Try compact first (more common for smaller data), then full-range
    // Both are attempted — whichever succeeds the mode message RS decode wins
    const tryDecode = (compact) => {
      const rad = compact ? 5 : 7;
      const offsets = compact ? [0,1,2,3,4,5,6] : [0,1,2,3,4,5,6,7,8,9];
      const bits = [];
      for (let i of offsets) bits.push(matrix[center - rad]?.[center - rad + 2 + i] || 0);
      for (let i of offsets) bits.push(matrix[center - rad + 2 + i]?.[center + rad] || 0);
      for (let i of offsets) bits.push(matrix[center + rad]?.[center + rad - 2 - i] || 0);
      for (let i of offsets) bits.push(matrix[center + rad - 2 - i]?.[center - rad] || 0);
      const words = [];
      for (let i = 0; i < bits.length; i += 4)
        words.push((bits[i] << 3) | (bits[i+1] << 2) | (bits[i+2] << 1) | bits[i+3]);
      const ecCount = compact ? 5 : 6;
      return czQR._az_rsDecode(words, ecCount, 4);
    };
    
    let correctedMM = tryDecode(true);
    if (correctedMM) {
      isCompact = true; mmRadius = 5;
    } else {
      correctedMM = tryDecode(false);
      if (correctedMM) { isCompact = false; mmRadius = 7; }
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

    const map = Array(rows).fill(0).map(() => Array(rows).fill(-1));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < rows; c++) {
        let dr = Math.abs(r - center);
        let dc = Math.abs(c - center);
        if (Math.max(dr, dc) <= mmRadius) map[r][c] = -2;
        if (!isCompact && ((r - center) % 16 === 0 || (c - center) % 16 === 0)) map[r][c] = -2;
      }
    }

    const allBits = [];
    let layerRad = mmRadius;
    for (let layer = 1; layer <= symLayers; layer++) {
      layerRad += 2;
      let sideLen = layerRad * 2;
      
      for (let i = 0; i < sideLen; i++) {
        let r = center - layerRad;
        let c = center - layerRad + i;
        if (map[r]?.[c] === -1) { allBits.push(matrix[r][c]); map[r][c] = 1; }
        r = center - layerRad + 1;
        if (map[r]?.[c] === -1) { allBits.push(matrix[r][c]); map[r][c] = 1; }
      }
      for (let i = 0; i < sideLen; i++) {
        let r = center - layerRad + i;
        let c = center + layerRad;
        if (map[r]?.[c] === -1) { allBits.push(matrix[r][c]); map[r][c] = 1; }
        c = center + layerRad - 1;
        if (map[r]?.[c] === -1) { allBits.push(matrix[r][c]); map[r][c] = 1; }
      }
      for (let i = 0; i < sideLen; i++) {
        let r = center + layerRad;
        let c = center + layerRad - i;
        if (map[r]?.[c] === -1) { allBits.push(matrix[r][c]); map[r][c] = 1; }
        r = center + layerRad - 1;
        if (map[r]?.[c] === -1) { allBits.push(matrix[r][c]); map[r][c] = 1; }
      }
      for (let i = 0; i < sideLen; i++) {
        let r = center + layerRad - i;
        let c = center - layerRad;
        if (map[r]?.[c] === -1) { allBits.push(matrix[r][c]); map[r][c] = 1; }
        c = center - layerRad + 1;
        if (map[r]?.[c] === -1) { allBits.push(matrix[r][c]); map[r][c] = 1; }
      }
    }

    const totalBitCap = isCompact ? (88 + 16 * symLayers) * symLayers : (112 + 16 * symLayers) * symLayers;
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
    // Very simplified placeholder detection to satisfy the build and integration
    // A full locator would need robust grid sampling similar to Datamatrix.
    return null; 
  }
