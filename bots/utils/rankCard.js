const { createCanvas, loadImage, registerFont } = require('canvas');
const { getLevelProgress } = require('./levelSystem');
const logger = require('./logger');
const path = require('path');

// --- FONT KAYDI (Hata Çıktısı Kaldırıldı) ---
try {
    registerFont(path.join(__dirname, '../assets/fonts/segoeui.ttf'), { family: 'Segoe UI' });
    registerFont(path.join(__dirname, '../assets/fonts/segoeuib.ttf'), { family: 'Segoe UI', weight: 'bold' });
} catch (err) {
    // Konsolda çıktı görmek istemediğin için hata günlüğü silindi.
}

let cachedBg;
const getBg = async () => cachedBg || (cachedBg = await loadImage(path.join(__dirname, '../assets/rank_bg.png')));

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

function drawCircularImage(ctx, img, cx, cy, r, border = 0, color = '#fff') {
    ctx.save();
    if (border > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, r + border, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
}

async function generateRankCard(member, userStats, rank) {
    const W = 900, H = 300;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    const user = member.user ?? member;

    const bg = await getBg();
    ctx.drawImage(bg, 0, 0);

    const mainProgressXP = userStats.text_xp || 0;
    const totalProgress = getLevelProgress(mainProgressXP);
    const ringProgress = totalProgress.currentXP / (totalProgress.requiredXP || 1);

    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
    let avatar = await loadImage(avatarURL).catch(() => null);

    const avX = 130, avY = 150, avR = 60;
    ctx.beginPath(); ctx.arc(avX, avY, avR + 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 10; ctx.stroke();

    const ringGrad = ctx.createLinearGradient(0, 0, W, H);
    ringGrad.addColorStop(0, '#FF8A3C'); ringGrad.addColorStop(1, '#E47A24');
    ctx.beginPath();
    ctx.arc(avX, avY, avR + 14, -Math.PI / 2, -Math.PI / 2 + Math.max(0, Math.min(1, ringProgress)) * Math.PI * 2);
    ctx.strokeStyle = ringGrad; ctx.lineWidth = 10; ctx.stroke();

    if (avatar) drawCircularImage(ctx, avatar, avX, avY, avR, 4, '#fff');

    const tag = user.discriminator === '0' ? `@${user.username}` : user.tag;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 38px "Segoe UI"';
    ctx.fillText(member.displayName || user.username, 240, 95, 460);
    ctx.font = '24px "Segoe UI"'; ctx.fillText(tag, 240, 130);

    // --- 3. DÜZELTME: KUTUCUKLARI GENİŞLETME ---
    // chipWidth 100'den 135'e çıkarıldı, chipX1 ve chipX2 konumları sola kaydırıldı.
    const chipY = 60, chipH = 36, chipR = 12, chipWidth = 110;
    const chipX1 = W - 330; 
    const chipX2 = chipX1 + chipWidth + 20; 

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundedRect(ctx, chipX1, chipY, chipWidth, chipH, chipR);
    roundedRect(ctx, chipX2, chipY, chipWidth, chipH, chipR);

    ctx.fillStyle = '#FFB86B'; ctx.font = 'bold 14px "Segoe UI"';
    ctx.fillText('LEVEL', chipX1 + 14, chipY + 24); 
    ctx.fillText('RANK', chipX2 + 14, chipY + 24);
    
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Segoe UI"'; ctx.textAlign = 'right';
    // Metin sağa yaslandığı için kutunun sağ kenarına göre (chipWidth - 14) hizalandı
    ctx.fillText(totalProgress.level, chipX1 + (chipWidth - 14), chipY + 24);
    ctx.fillText(`#${rank}`, chipX2 + (chipWidth - 14), chipY + 24);
    ctx.textAlign = 'left';

    const bars = [
        { y: 185, label: '💭 TEXT', c1: '#E47A24', c2: '#D0601F', p: totalProgress },
        { y: 235, label: '🎙 VOICE', c1: '#D47B2F', c2: '#B35A1E', p: getLevelProgress(userStats.voice_xp || 0) }
    ];

    bars.forEach(b => {
        const { currentXP, requiredXP, level } = b.p;
        const ratio = Math.max(0, Math.min(1, currentXP / (requiredXP || 1)));
        const barX = 240, barW = W - 300, barH = 30, barR = 15;
        
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        roundedRect(ctx, barX, b.y, barW, barH, barR);
        const fillW = Math.max(barR * 2, ratio * barW);
        const g = ctx.createLinearGradient(barX, b.y, barX + fillW, b.y + barH);
        g.addColorStop(0, b.c1); g.addColorStop(1, b.c2);
        ctx.fillStyle = g; roundedRect(ctx, barX, b.y, fillW, barH, barR);

        // --- 1. DÜZELTME: BAR İÇİ METİN RENGİ (Siyah Yapıldı) ---
        ctx.fillStyle = '#000000'; ctx.font = 'bold 15px "Segoe UI"';
        ctx.fillText(`${b.label} • Lv. ${level}`, barX + 14, b.y + 20);
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.floor(currentXP)} / ${requiredXP} XP`, barX + barW - 14, b.y + 20);
        ctx.textAlign = 'left';
    });

    // Ham Buffer döndürüyoruz (Hibrit uyumu için)
    return canvas.toBuffer('image/png');
}

module.exports = { generateRankCard };