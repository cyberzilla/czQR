const fs = require('fs');

const indexHtml = fs.readFileSync('docs/index.html', 'utf8');
const readerHtml = fs.readFileSync('docs/reader.html', 'utf8');

// 1. Rewrite index.html
let newIndex = indexHtml.replace(/<style>([\s\S]*?)<\/style>/, (match, css) => {
    return `<style>
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        ${css}
        .tabs { display: flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.03); border-radius: var(--r); margin-bottom: 24px; }
        .tab { flex: 1; padding: 12px; border: none; border-radius: 8px; background: none; color: var(--t2); font-weight: 600; cursor: pointer; transition: 0.2s; }
        .tab:hover { color: var(--t1); background: rgba(255,255,255,0.04); }
        .tab.active { background: rgba(139, 92, 246, 0.15); color: var(--p); box-shadow: 0 2px 8px rgba(139,92,246,0.15); }
        .panel { display: none; }
        .panel.active { display: block; }
    </style>`;
});

// Insert Tabs
newIndex = newIndex.replace('<div class="card anim ad1">', `
        <div class="tabs anim">
            <button class="tab active" onclick="switchMode('qr')">QR Code</button>
            <button class="tab" onclick="switchMode('barcode')">Barcode</button>
        </div>
        <div class="card anim ad1">
`);

// Wrap QR settings in a panel
newIndex = newIndex.replace('<div class="ct">', `<div id="qrSettings" class="panel active">\n<div class="ct">`);
newIndex = newIndex.replace('<button class="btn btn-p" id="genBtn" onclick="generate()">', `</div>\n
<div id="bcSettings" class="panel">
    <div class="ct"><div class="ico ico-p">|||</div> Barcode Settings</div>
    <div class="fg">
        <label class="fl">Format</label>
        <select class="fs" id="bcFormat">
            <option value="ean13">EAN-13</option>
            <option value="ean8">EAN-8</option>
            <option value="upca">UPC-A</option>
            <option value="code128" selected>Code 128</option>
            <option value="code39">Code 39</option>
            <option value="itf">ITF</option>
        </select>
    </div>
    <div class="fg">
        <label class="fl">Data</label>
        <textarea class="ft" id="bcData" placeholder="Enter barcode data...">123456789012</textarea>
    </div>
    <div class="r2">
        <div class="fg">
            <label class="fl">Module Width: <span id="bcw_v">2</span>px</label>
            <div class="rw"><input type="range" class="rs" id="bcWidth" min="1" max="4" value="2" step="1"><span class="rv" id="bcw_b">2</span></div>
        </div>
        <div class="fg">
            <label class="fl">Bar Height: <span id="bch_v">80</span>px</label>
            <div class="rw"><input type="range" class="rs" id="bcHeight" min="20" max="150" value="80" step="5"><span class="rv" id="bch_b">80</span></div>
        </div>
    </div>
    <div class="fg">
        <label class="fl">Margin: <span id="bcm_v">10</span>px</label>
        <div class="rw"><input type="range" class="rs" id="bcMargin" min="0" max="20" value="10" step="1"><span class="rv" id="bcm_b">10</span></div>
    </div>
    <div class="fg">
        <label class="tgl">
            <input type="checkbox" id="bcText" checked>
            <span class="tgl-sw"></span>
            Show Text Label
        </label>
    </div>
</div>\n<button class="btn btn-p" id="genBtn" onclick="generate()">`);

// Update JS in index.html
newIndex = newIndex.replace('// Store last QR for downloads', `
        let currentMode = 'qr';
        function switchMode(mode) {
            currentMode = mode;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab')[mode === 'qr' ? 0 : 1].classList.add('active');
            document.getElementById('qrSettings').classList.toggle('active', mode === 'qr');
            document.getElementById('bcSettings').classList.toggle('active', mode === 'barcode');
            generate();
        }

        // Barcode range sync
        [['bcWidth', 'bcw_v', 'bcw_b'], ['bcHeight', 'bch_v', 'bch_b'], ['bcMargin', 'bcm_v', 'bcm_b']].forEach(([id, a, b]) => {
            const el = $(id); if (!el) return;
            el.addEventListener('input', () => { if ($(a)) $(a).textContent = el.value; if ($(b)) $(b).textContent = el.value; });
        });

        let lastBC = null;
        // Store last QR for downloads`);

newIndex = newIndex.replace(/async function generate\(\) {[\s\S]*?try {/, `async function generate() {
            if (currentMode === 'barcode') { return generateBarcode(); }
            const text = v('text').trim();
            if (!text) { toast('Please enter content', true); return; }

            const btn = $('genBtn');
            btn.disabled = true;
            btn.innerHTML = '<div class="spin" style="display:inline-block;width:18px;height:18px;border-width:2px"></div> Generating…';

            $('placeholder').style.display = 'none';
            $('errMsg').style.display = 'none';
            $('qrResult').innerHTML = '';

            try {`);

newIndex = newIndex.replace(/async function downloadAs\(fmt\) {/, `
        async function generateBarcode() {
            const data = v('bcData').trim();
            if (!data) { toast('Please enter barcode data', true); return; }
            
            const btn = $('genBtn');
            btn.disabled = true;
            btn.innerHTML = '<div class="spin" style="display:inline-block;width:18px;height:18px;border-width:2px"></div> Generating…';

            $('placeholder').style.display = 'none';
            $('errMsg').style.display = 'none';
            
            try {
                const format = v('bcFormat');
                const options = {
                    moduleWidth: parseInt(v('bcWidth')),
                    height: parseInt(v('bcHeight')),
                    margin: parseInt(v('bcMargin')),
                    showText: $('bcText').checked
                };
                
                const svg = czQR.barcode(format, data, options);
                lastBC = { svg, format: 'svg', ext: 'svg' };
                
                const result = $('qrResult');
                result.innerHTML = svg;
                $('qrFrame').classList.remove('checker');
                $('dlGrid').style.display = 'grid';
                $('infoBar').style.display = 'none';
                
                toast('Barcode generated instantly! ⚡');
            } catch(e) {
                $('errMsg').style.display = 'block';
                $('errMsg').textContent = e.message;
                toast(e.message, true);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Generate Barcode';
            }
        }

        async function downloadAs(fmt) {
            if (currentMode === 'barcode') {
                if(!lastBC) return;
                const blob = new Blob([lastBC.svg], {type: 'image/svg+xml'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = \`barcode.\${lastBC.ext}\`;
                a.click();
                URL.revokeObjectURL(url);
                toast(\`Downloaded as SVG\`);
                return;
            }
`);

// 2. Rewrite reader.html
let newReader = readerHtml.replace(/<style>([\s\S]*?)<\/style>/, (match, css) => {
    return `<style>
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        ${css}
    </style>`;
});

// Update Multi-results layout
newReader = newReader.replace(/<div style="background:var\(--bg\);border:1px solid var\(--bd\);border-radius:10px;padding:12px;margin-bottom:8px">/g, 
    '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--bdr);border-radius:10px;padding:16px;margin-bottom:12px;text-align:left;box-shadow:0 4px 12px rgba(0,0,0,0.1);">');

fs.writeFileSync('docs/index.html', newIndex);
fs.writeFileSync('docs/reader.html', newReader);

console.log('Update complete.');
