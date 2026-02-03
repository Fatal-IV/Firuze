// generate_assets.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

function roundedRect(ctx, x, y, w, h, r, color) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (color) ctx.fillStyle = color;
    ctx.fill();
}

function drawBokeh(ctx, W, H) {
    const colors = ['#D47B2F', '#E89A45'];
    for (let i = 0; i < 14; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = 50 + Math.random() * 100;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(212,123,47,0.15)`);
        grad.addColorStop(1, `rgba(212,123,47,0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
}

function createBg(W, H, fileName) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0.0, '#2A1C26'); grad.addColorStop(0.45, 'rgba(253,93,168,0.70)'); grad.addColorStop(1.0, '#E89A45');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    drawBokeh(ctx, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundedRect(ctx, 40, 30, W - 80, H - 60, 25);
    fs.writeFileSync(path.join(assetsDir, fileName), canvas.toBuffer());
}

createBg(900, 300, 'rank_bg.png');
createBg(900, 380, 'top_bg.png');
createBg(900, 900, 'projection_bg.png');
console.log('✅ Projection arka planı oluşturuldu.');
console.log('✅ Arka planlar oluşturuldu.');