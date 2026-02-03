module.exports = {
    handleStreak: (lastDaily, currentStreak) => {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;   // 24 Saat
        const twoDays = 48 * 60 * 60 * 1000;  // 48 Saat (Seri sıfırlanma sınırı)

        if (!lastDaily) return { newStreak: 1, canClaim: true };

        const diff = now - lastDaily;

        // 24 saat dolmadıysa claim kapalı
        if (diff < oneDay) {
            return { canClaim: false, nextAvailable: lastDaily + oneDay };
        }
        
        // 48 saatten fazla geçtiyse seri 1'e düşer, aksi halde (düzenli kullanımda) 1 artar
        const newStreak = diff > twoDays ? 1 : (Number(currentStreak) || 0) + 1;
        
        return { newStreak, canClaim: true };
    }
};