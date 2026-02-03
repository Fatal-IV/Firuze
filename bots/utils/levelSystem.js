// utils/levelSystem.js
const { 
  BASE_XP, 
  A_FACTOR, 
  B_FACTOR, 
  MIN_XP_PER_MESSAGE, 
  MAX_XP_PER_MESSAGE, 
  MIN_XP_PER_VOICE, 
  MAX_XP_PER_VOICE, 
  HIGH_XP_THRESHOLD_LEVEL, 
  MIN_XP_HIGH, 
  MAX_XP_HIGH 
} = require('../config'); 

// YENİ EKLEME: Ultra XP değerlerini içe aktar
const { ULTRA_XP_THRESHOLD_LEVEL, MIN_XP_ULTRA, MAX_XP_ULTRA } = require('../config');

/**
 * Belirli bir LEVEL'dan bir SONRAKİ level'a geçmek için gereken XP.
 */
function getXPForLevel(level) {
  return BASE_XP + (A_FACTOR * level) + (B_FACTOR * Math.pow(level, 2));
}

/**
 * Belirli bir LEVEL'a ulaşmak için gereken TOPLAM XP.
 */
function getTotalXPForLevel(level) {
  let totalXP = 0;
  for (let i = 0; i < level; i++) {
    totalXP += getXPForLevel(i);
  }
  return totalXP;
}

/**
 * Verilen kümülatif XP'ye göre LEVEL hesaplar.
 */
function getLevelFromXP(xp) {
  let level = 0;
  let cumulativeXP = 0;
  const MAX_LEVEL_CAP = 5000; 

  while (level < MAX_LEVEL_CAP) {
    const xpNeededForNextLevel = getXPForLevel(level);
    if (xp < cumulativeXP + xpNeededForNextLevel) {
      return level;
    }
    cumulativeXP += xpNeededForNextLevel;
    level++;
  }
  return level; 
}

/**
 * Level ilerleme durumunu hesaplar.
 */
function getLevelProgress(xp) {
  const level = getLevelFromXP(xp);
  const xpForCurrentLevel = getTotalXPForLevel(level); 
  const xpForNextLevel = getXPForLevel(level);
  const currentLevelXP = xp - xpForCurrentLevel;

  return {
    level,
    currentXP: currentLevelXP,
    requiredXP: xpForNextLevel
  };
}

function getRandomTextXP(level) {
  // YENİ EKLEME: 35+ Seviye Kontrolü (Öncelikli)
  if (level >= ULTRA_XP_THRESHOLD_LEVEL) {
    return Math.floor(Math.random() * (MAX_XP_ULTRA - MIN_XP_ULTRA + 1)) + MIN_XP_ULTRA;
  }

  // MEVCUT KODLAR (DOKUNULMADI)
  const baseRange = (level >= HIGH_XP_THRESHOLD_LEVEL)
    ? { min: MIN_XP_HIGH, max: MAX_XP_HIGH }
    : { min: MIN_XP_PER_MESSAGE, max: MAX_XP_PER_MESSAGE };
  return Math.floor(Math.random() * (baseRange.max - baseRange.min + 1)) + baseRange.min;
}

function getRandomVoiceXP(level) {
  // SES XP DOKUNULMADI (MEVCUT MANTIK KORUNDU)
  const baseRange = (level >= HIGH_XP_THRESHOLD_LEVEL)
    ? { min: MIN_XP_HIGH, max: MAX_XP_HIGH }
    : { min: MIN_XP_PER_VOICE, max: MAX_XP_PER_VOICE };
  return Math.floor(Math.random() * (baseRange.max - baseRange.min + 1)) + baseRange.min;
}

module.exports = {
  getXPForLevel,
  getTotalXPForLevel,
  getLevelFromXP,
  getLevelProgress,
  getRandomTextXP,
  getRandomVoiceXP
};