const { createCanvas, loadImage } = require('canvas');

// Metni otomatik satırlara bölen yardımcı fonksiyon
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}

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
    const colors = ['#D47B2F', '#E89A45', '#FF8A3C'];
    for (let i = 0; i < 18; i++) {
        const x = Math.random() * W, y = Math.random() * H, r = 60 + Math.random() * 120;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const opacity = 0.15 + Math.random() * 0.25;
        const rgb = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${opacity})`);
        grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
}

async function drawCreditsCard(user, bot, message, color) {
    const W = 900, H = 450;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // === ARKA PLAN ===
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0.00, '#2A1C26'); grad.addColorStop(0.20, '#5A2E22');
    grad.addColorStop(0.45, 'rgba(253,93,168,0.70)'); grad.addColorStop(0.70, '#B35A1E');
    grad.addColorStop(1.00, '#E89A45');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    drawBokeh(ctx, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundedRect(ctx, 40, 30, W - 80, H - 60, 25);

    // === AVATAR ===
    const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }));
    ctx.save(); ctx.beginPath(); ctx.arc(130, 130, 70, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(avatar, 60, 60, 140, 140); ctx.restore();

    // === İSİMLER ===
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px "Segoe UI"';
    ctx.fillText(user.displayName, 220, 100);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '500 24px "Segoe UI"';
    ctx.fillText(`@${user.username}`, 220, 135);

    // === ÖZEL TEŞEKKÜR MESAJI (JSON'DAN GELEN) ===
    ctx.fillStyle = color || '#FFFFFF';
    ctx.font = 'italic 25px "Segoe UI"';
    wrapText(ctx, message, 220, 185, 620, 35);

    // === ALT KISIM (ORTALANMIŞ İKONLAR) ===
    const botAvatar = await loadImage(bot.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true }));
    const centerX = W / 2;
    const centerY = H - 80;

    ctx.save(); ctx.beginPath(); ctx.arc(centerX - 80, centerY, 30, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(avatar, centerX - 110, centerY - 30, 60, 60); ctx.restore();

    ctx.fillStyle = '#ff4d4d'; ctx.font = '36px "Segoe UI"'; ctx.textAlign = 'center';
    ctx.fillText('❤️', centerX, centerY + 12);

    ctx.save(); ctx.beginPath(); ctx.arc(centerX + 80, centerY, 30, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(botAvatar, centerX + 50, centerY - 30, 60, 60); ctx.restore();

    return canvas.toBuffer('image/png');
}

module.exports = { drawCreditsCard };