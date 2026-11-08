#!/usr/bin/env node
// Usage: node scripts/render.js content/<folder>/slides.json
// Renders each slide to <folder>/out/NN.png at 1080x1350 (Instagram 4:5).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const specPath = process.argv[2];
if (!specPath) { console.error('Usage: node scripts/render.js <slides.json>'); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const css = fs.readFileSync(path.join(__dirname, '..', 'templates', 'card.css'), 'utf8');
const outDir = path.join(path.dirname(specPath), 'out');
fs.mkdirSync(outDir, { recursive: true });

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// *text* -> accent highlight
const rich = s => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');

function slideHtml(s, i, total) {
  const handle = s.handle || spec.handle || '@vibepay2026';
  const foot = `<div class="brandmark">VibePay</div><div class="page">${i + 1} / ${total}</div>`;
  let cls = s.type, inner = '';
  switch (s.type) {
    case 'cover':
      inner = `${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}<h1>${rich(s.title)}</h1>${s.sub ? `<div class="sub">${rich(s.sub)}</div>` : ''}`;
      break;
    case 'point':
      cls = 'point';
      inner = `${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}<h2>${rich(s.title)}</h2><div class="stats">${(s.stats || []).map(x => `<div class="stat"><div class="big">${rich(x.big)}</div><div class="label">${rich(x.label)}</div></div>`).join('')}</div>`;
      break;
    case 'list':
      inner = `${s.num != null ? `<div class="num">${String(s.num).padStart(2, '0')}</div>` : ''}<h2>${rich(s.title)}</h2><ul>${(s.items || []).map(x => `<li><span>${rich(x)}</span></li>`).join('')}</ul>`;
      break;
    case 'cta':
      inner = `<h2>${rich(s.title)}</h2><div class="body">${rich(s.body)}</div><div class="handle">${esc(handle)}</div>`;
      break;
    default:
      cls = 'content';
      inner = `${s.num != null ? `<div class="num">${String(s.num).padStart(2, '0')}</div>` : ''}<h2>${rich(s.title)}</h2><div class="body">${rich(s.body)}</div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
<body class="${cls} ${spec.theme === 'light' ? 'light' : ''}">${inner}${foot}</body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  const total = spec.slides.length;
  const warnings = [];
  for (let i = 0; i < total; i++) {
    await page.setContent(slideHtml(spec.slides[i], i, total), { waitUntil: 'load' });
    const overflow = await page.evaluate(() => document.body.scrollHeight > 1350);
    if (overflow) warnings.push(`slide ${i + 1}: content overflows the card`);
    const file = path.join(outDir, `${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: file });
    // Instagram Graph API accepts JPEG only for image posts
    await page.screenshot({ path: file.replace(/\.png$/, '.jpg'), type: 'jpeg', quality: 92 });
    console.log('rendered', file);
  }
  await browser.close();
  if (warnings.length) { console.warn('WARN\n' + warnings.join('\n')); process.exitCode = 2; }
})();
