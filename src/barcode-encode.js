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

