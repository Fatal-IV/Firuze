module.exports = {
  // Orijinal Metin XP Formülü: baseXP + (a * level) + (b * level^2)
  BASE_XP: 250,
  A_FACTOR: 85,
  B_FACTOR: 45,

  // Metin XP
  MIN_XP_PER_MESSAGE: 10,
  MAX_XP_PER_MESSAGE: 25,

  // Ses XP
  MIN_XP_PER_VOICE: 15,
  MAX_XP_PER_VOICE: 35,
  VOICE_XP_INTERVAL_MINUTES: 2.5, // 2.5 dakika

  // Yüksek XP Aralığı
  // (Bu seviyeden sonra 10-25 aralığı 25-35'e yükselir)
  HIGH_XP_THRESHOLD_LEVEL: 20, 
  MIN_XP_HIGH: 25,
  MAX_XP_HIGH: 35,
  
  ULTRA_XP_THRESHOLD_LEVEL: 35,
  MIN_XP_ULTRA: 35,
  MAX_XP_ULTRA: 60,

  // Spam Filtresi (Bu, cooldown'dan ayrıdır)
  // 10 saniye içinde 5'ten fazla mesaj
  SPAM_WINDOW_SECONDS: 5,
  SPAM_MESSAGE_COUNT: 4,

  owner_id: '712202911958171748',
  OWNER_ID: '712202911958171748',
  GUILD_LOG_CHANNEL_ID: '1446230759114276914',
  prefix: '*'
};