// utils/daily/xpCalculator.js
module.exports = {
    calculateXP: (streak) => {
        let min, max;
        if (streak <= 15) { min = 0; max = 50; }
        else if (streak <= 25) { min = 50; max = 100; }
        else { min = 100; max = 150; }
        
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};