const { Events } = require('discord.js');

module.exports = {
  name: Events.VoiceStateUpdate,
  
  async execute(oldState, newState, client) {
    // XP KAZANIM SİSTEMİ TAŞINDI:
    // Ses XP işlemleri artık 'utils/voiceManager.js' dosyası üzerinden
    // periyodik tarama (polling) yöntemiyle yönetilmektedir.
    // Bu sayede RAM kullanımı düşürülmüş, çift XP hatası önlenmiş
    // ve "kulaklık kapalı/açık" gibi kontroller merkezileştirilmiştir.

    // Bu dosya şu an bilerek boş bırakılmıştır. 
    // İleride buraya sadece "Loglama" (Kanal değiştirdi, çıktı vs.) eklenebilir.
  },
};