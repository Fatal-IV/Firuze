const { createCanvas, loadImage } = require('canvas');
const path = require('path');

let cachedDailyBg;
const getDailyBg = async () => cachedDailyBg || (cachedDailyBg = await loadImage(path.join(__dirname, '../../assets/rank_bg.png')));

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

async function createDailyImage(user, member, gainedXP, newLevel, streak, t) {
    const W = 900, H = 300;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    const bg = await getDailyBg();
    ctx.drawImage(bg, 0, 0);

    // XP Oranı Hesaplama (Tiere göre)
    let maxPossible = 50;
    if (streak > 15 && streak <= 25) maxPossible = 100;
    else if (streak > 25) maxPossible = 150;
    const ratio = Math.max(0, Math.min(1, gainedXP / maxPossible));

    // 1. Avatar ve Hareketli Sarmal
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
    const avatar = await loadImage(avatarURL).catch(() => null);
    const avX = 130, avY = 150, avR = 60;

    // Arka sönük halka
    ctx.beginPath(); ctx.arc(avX, avY, avR + 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 12; ctx.stroke();

    // Dinamik sarmal (Kazanılan XP'ye göre dolan halka)
    ctx.beginPath();
    ctx.arc(avX, avY, avR + 14, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * ratio));
    ctx.strokeStyle = '#E47A24'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();

    if (avatar) {
        ctx.save();
        ctx.beginPath(); ctx.arc(avX, avY, avR, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(avatar, avX - avR, avY - avR, avR * 2, avR * 2);
        ctx.restore();
    }

    // 2. Kullanıcı Bilgileri
    const displayName = member?.displayName || user.username;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 38px "Segoe UI"';
    ctx.fillText(displayName, 240, 95, 400);

    // 3. Sağ Üst - Sadece Seviye Kutucuğu
    const chipW = 120, chipH = 40, chipX = W - chipW - 60, chipY = 60;
    roundedRect(ctx, chipX, chipY, chipW, chipH, 10, 'rgba(255,255,255,0.1)');
    
    ctx.fillStyle = '#E47A24'; ctx.font = 'bold 14px "Segoe UI"';
    ctx.fillText(t('commands:daily.levelLabel'), chipX + 12, chipY + 25);
    
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 22px "Segoe UI"'; ctx.textAlign = 'right';
    ctx.fillText(newLevel, chipX + chipW - 12, chipY + 27);
    ctx.textAlign = 'left';

    // 4. XP Barı ve Alt Metin
    const barX = 240, barW = W - barX - 60, barY = 200, barH = 25;
    roundedRect(ctx, barX, barY, barW, barH, 12, 'rgba(255,255,255,0.1)'); // Boş bar
    roundedRect(ctx, barX, barY, barW * ratio, barH, 12, '#E47A24'); // Dolu bar

    // Bar Altı Metni: Günlük Seri
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '18px "Segoe UI"';
    ctx.fillText(t('commands:daily.streakLabel', { days: streak }), barX, barY + 55);

    // Bar Sağ Alt: Kazanılan XP
    ctx.textAlign = 'right';
    ctx.fillText(t('commands:daily.gainedXp', { xp: gainedXP }), barX + barW, barY + 55);

    return canvas.toBuffer();
}

module.exports = { createDailyImage };