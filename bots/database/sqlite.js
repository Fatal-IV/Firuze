const Database = require('better-sqlite3');
const { getLevelFromXP, getTotalXPForLevel } = require('../utils/levelSystem');

const db = new Database('db.sqlite');
db.pragma('journal_mode = WAL');

function setupDatabase() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS guilds (
      guild_id TEXT PRIMARY KEY,
      log_channel_id TEXT,
      cooldown INTEGER DEFAULT 60,
      spamWindow INTEGER DEFAULT 10,
      spamCount INTEGER DEFAULT 5,
      level_up_message TEXT,
      prefix TEXT DEFAULT '*'
    )
  `).run();
  try {
    db.prepare("ALTER TABLE users ADD COLUMN last_daily INTEGER DEFAULT 0").run();
  } catch (error) {
    // Sütun zaten varsa hata verir, işlem devam eder.
  }
  try {
    db.prepare("ALTER TABLE guilds ADD COLUMN level_up_message TEXT").run();
  } catch (error) {
    // Sütun zaten varsa yoksay
  }
  try { db.prepare("ALTER TABLE guilds ADD COLUMN prefix TEXT DEFAULT '*'").run(); } catch (e) {}
  try {
    db.prepare("ALTER TABLE users ADD COLUMN last_daily INTEGER DEFAULT 0").run();
    console.log("Veritabanına 'last_daily' sütunu başarıyla eklendi.");
  } catch (e) {
    // Sütun zaten varsa hata verecektir, görmezden gelebiliriz.
  }

  try {
    db.prepare("ALTER TABLE users ADD COLUMN daily_streak INTEGER DEFAULT 0").run();
    console.log("Veritabanına 'daily_streak' sütunu başarıyla eklendi.");
  } catch (e) {
      // Sütun zaten varsa hata verecektir, görmezden gelebiliriz.
  }
  try {
    db.prepare("ALTER TABLE users ADD COLUMN current_cooldown_messages INTEGER DEFAULT 0").run();
    db.prepare("ALTER TABLE users ADD COLUMN last_message_text TEXT DEFAULT ''").run();
  } catch (e) {
    // Sütunlar mevcutsa hata vermez, işleme devam eder.
}

  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT,
      guild_id TEXT,
      total_xp INTEGER DEFAULT 0,
      text_xp INTEGER DEFAULT 0,
      voice_xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      voice_level INTEGER DEFAULT 0,
      last_text_xp_gain INTEGER DEFAULT 0,
      last_daily INTEGER DEFAULT 0, -- Eklendi
      daily_streak INTEGER DEFAULT 0, -- Eklendi
      PRIMARY KEY (user_id, guild_id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS level_roles (
      role_id TEXT,
      guild_id TEXT,
      level INTEGER,
      PRIMARY KEY (role_id, guild_id)
    )
  `).run();
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS xp_history (
      user_id TEXT,
      guild_id TEXT,
      text_xp INTEGER DEFAULT 0,
      voice_xp INTEGER DEFAULT 0,
      timestamp INTEGER
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS xp_ignores (
      guild_id TEXT,
      target_id TEXT,
      type TEXT,
      PRIMARY KEY (guild_id, target_id)
    )
  `).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS guilds (
      guild_id TEXT PRIMARY KEY,
      log_channel_id TEXT,
      language TEXT DEFAULT 'en',
      prefix TEXT DEFAULT '*'
    )
`).run();

try { db.prepare("ALTER TABLE guilds ADD COLUMN xp_multiplier REAL DEFAULT 1.0").run(); } catch(e) {}
try { db.prepare("ALTER TABLE guilds ADD COLUMN boost_expires INTEGER DEFAULT 0").run(); } catch(e) {}
}
setupDatabase();

function setBoost(guildId, multiplier, durationMinutes) {
    const expiresAt = Date.now() + (durationMinutes * 60 * 1000);
    db.prepare("UPDATE guilds SET xp_multiplier = ?, boost_expires = ? WHERE guild_id = ?")
      .run(multiplier, expiresAt, guildId);
}

function updatePrefix(guildId, prefix) {
  return updatePrefixStmt.run(prefix, guildId);
}
function getDayStartTimestamp() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor(now.getTime() / 1000);
}

// --- GUILD FUNCTIONS ---

const getGuild = db.prepare("SELECT * FROM guilds WHERE guild_id = ?");

const updateGuild = db.prepare(`
    REPLACE INTO guilds (guild_id, log_channel_id, cooldown, spamWindow, spamCount, level_up_message) 
    VALUES (@guild_id, @log_channel_id, @cooldown, @spamWindow, @spamCount, @level_up_message)
`);

function getGuildSettings(guildId) {
  let settings = getGuild.get(guildId);
  if (!settings) {
    // Varsayılan değerler
    settings = { 
        guild_id: guildId, 
        log_channel_id: null, 
        cooldown: 60, 
        spamWindow: 10, 
        spamCount: 5, 
        level_up_message: null 
    };
    updateGuild.run(settings);
  }
  return settings;
}

// --- DELETE FUNCTIONS (Setup Sıfırlama İçin) ---

const deleteGuildStmt = db.prepare("DELETE FROM guilds WHERE guild_id = ?");
const deleteGuildRolesStmt = db.prepare("DELETE FROM level_roles WHERE guild_id = ?");
const deleteGuildIgnoresStmt = db.prepare("DELETE FROM xp_ignores WHERE guild_id = ?");
const resetGuildUsers = db.prepare("DELETE FROM users WHERE guild_id = ?");
const resetGuildHistory = db.prepare("DELETE FROM xp_history WHERE guild_id = ?");
const updatePrefixStmt = db.prepare("UPDATE guilds SET prefix = ? WHERE guild_id = ?");

function deleteGuildData(guildId) {
    // Transaction kullanarak atomik işlem (Hepsi ya silinir ya silinmez)
    const deleteTransaction = db.transaction(() => {
        deleteGuildStmt.run(guildId);       // Ayarları sil
        resetGuildUsers.run(guildId);       // Kullanıcı XP'lerini sil
        resetGuildHistory.run(guildId);     // Geçmişi sil
        deleteGuildRolesStmt.run(guildId);  // Rol ödüllerini sil
        deleteGuildIgnoresStmt.run(guildId);// Yasaklı kanalları sil
    });
    
    deleteTransaction();
    console.log(`[DB] Sunucu verileri kalıcı olarak silindi: ${guildId}`);
}

// --- USER FUNCTIONS ---

const getUser = db.prepare("SELECT * FROM users WHERE user_id = ? AND guild_id = ?");
const createUser = db.prepare("INSERT INTO users (user_id, guild_id) VALUES (?, ?)");

function getUserStats(guildId, userId) {
  let user = getUser.get(userId, guildId);
  if (!user) {
    createUser.run(userId, guildId);
    user = getUser.get(userId, guildId);
  }
  return user;
}

// --- XP & HISTORY FUNCTIONS ---

const checkHistory = db.prepare("SELECT * FROM xp_history WHERE user_id = ? AND guild_id = ? AND timestamp = ?");
const insertHistory = db.prepare("INSERT INTO xp_history (user_id, guild_id, text_xp, voice_xp, timestamp) VALUES (?, ?, ?, ?, ?)");
const updateTextHistory = db.prepare("UPDATE xp_history SET text_xp = text_xp + ? WHERE user_id = ? AND guild_id = ? AND timestamp = ?");
const updateVoiceHistory = db.prepare("UPDATE xp_history SET voice_xp = voice_xp + ? WHERE user_id = ? AND guild_id = ? AND timestamp = ?");

const addXPStatement = db.prepare(`
  UPDATE users 
  SET 
    text_xp = text_xp + @xp, 
    total_xp = total_xp + @xp, 
    level = @newLevel,
    last_text_xp_gain = @now
  WHERE user_id = @userId AND guild_id = @guildId
`);

function addXP(guildId, userId, textXP) {
    const userStats = getUserStats(guildId, userId);
    const newTotalXP = userStats.total_xp + textXP;
    const newLevel = getLevelFromXP(newTotalXP);
    const oldLevel = userStats.level;
    const now = Date.now();

    addXPStatement.run({
        xp: textXP,
        newLevel: newLevel,
        now: now,
        userId: userId,
        guildId: guildId
    });
    
    const today = getDayStartTimestamp();
    const historyEntry = checkHistory.get(userId, guildId, today);

    if (historyEntry) {
        updateTextHistory.run(textXP, userId, guildId, today);
    } else {
        insertHistory.run(userId, guildId, textXP, 0, today);
    }

    return { oldLevel, newLevel };
}

// 2. Performanslı Toplu XP Ekleme (Transaction)
// Bunu addXP fonksiyonunun DIŞINA koymalısın.
function addBulkXP(guildId, userIds, amount) {
  // userIds'in sadece string (ID) dizisi olduğundan emin olunur
  const transaction = db.transaction((ids) => {
    for (const userId of ids) {
      const stats = getUserStats(guildId, userId);
      const newXP = stats.xp + amount;
      const newLevel = getLevelFromXP(newXP); // levelSystem.js'den gelen hesaplama

      db.prepare(`
        UPDATE users 
        SET xp = ?, level = ? 
        WHERE guild_id = ? AND user_id = ?
      `).run(newXP, newLevel, guildId, userId);
    }
  });

  transaction(userIds);
}

const addVoiceXPStatement = db.prepare(`
  UPDATE users 
  SET voice_xp = voice_xp + @xp,
      voice_level = @newVoiceLevel
  WHERE user_id = @userId AND guild_id = @guildId
`);

function addVoiceXP(guildId, userId, voiceXP) {
  const userStats = getUserStats(guildId, userId);
  const currentVoiceXP = userStats.voice_xp || 0;
  const newTotalVoiceXP = currentVoiceXP + voiceXP;
  const newVoiceLevel = getLevelFromXP(newTotalVoiceXP);

  addVoiceXPStatement.run({
    xp: voiceXP,
    newVoiceLevel: newVoiceLevel,
    userId: userId,
    guildId: guildId
  });
  
  const today = getDayStartTimestamp();
  const historyEntry = checkHistory.get(userId, guildId, today);

  if (historyEntry) {
    updateVoiceHistory.run(voiceXP, userId, guildId, today);
  } else {
    insertHistory.run(userId, guildId, 0, voiceXP, today);
  }
}

const setLevelStatement = db.prepare(`
  UPDATE users 
  SET level = @newLevel, 
      text_xp = @newTextXP, 
      total_xp = @newTextXP 
  WHERE user_id = @userId AND guild_id = @guildId
`);

function setLevel(guildId, userId, newLevel) {
  const userStats = getUserStats(guildId, userId);
  const requiredXP = getTotalXPForLevel(newLevel);

  setLevelStatement.run({
    newLevel: newLevel,
    newTextXP: requiredXP,
    userId: userId,
    guildId: guildId
  });
  
  return { oldLevel: userStats.level };
}

function resetGuild(guildId) {
  resetGuildUsers.run(guildId);
  resetGuildHistory.run(guildId);
}

// --- LEADERBOARD & RANKS ---

function getLeaderboard(guildId, type = 'all', limit = 10) {
  limit = parseInt(limit) || 10;

  if (type === 'all') {
    const stmt = db.prepare(`
      SELECT user_id, total_xp, level 
      FROM users 
      WHERE guild_id = ? 
      ORDER BY total_xp DESC 
      LIMIT ?
    `);
    return stmt.all(guildId, limit);
  } else {
    // DÜZELTME: Zaman damgası artık Saniye cinsinden hesaplanıyor
    let timeThreshold;
    const now = Math.floor(Date.now() / 1000); // Şu anki zaman (Saniye)
    
    if (type === 'day') timeThreshold = now - (24 * 60 * 60); // 1 gün (saniye)
    else if (type === 'week') timeThreshold = now - (7 * 24 * 60 * 60); // 7 gün (saniye)
    else if (type === 'month') timeThreshold = now - (30 * 24 * 60 * 60); // 30 gün (saniye)
    else timeThreshold = 0; 

    const stmt = db.prepare(`
      SELECT 
        u.user_id, 
        u.level, 
        u.total_xp, 
        SUM(h.text_xp + h.voice_xp) as gained_xp
      FROM xp_history h
      INNER JOIN users u ON h.user_id = u.user_id AND h.guild_id = u.guild_id
      WHERE h.guild_id = ? AND h.timestamp > ?
      GROUP BY u.user_id
      ORDER BY gained_xp DESC
      LIMIT ?
    `);
    
    return stmt.all(guildId, timeThreshold, limit);
  }
}

// --- ROLES & IGNORES ---

const setRoleStmt = db.prepare("REPLACE INTO level_roles (role_id, guild_id, level) VALUES (?, ?, ?)");
const getRolesStmt = db.prepare("SELECT * FROM level_roles WHERE guild_id = ? AND level <= ?");

function setRoleReward(guildId, level, roleId) {
  setRoleStmt.run(roleId, guildId, level);
}

function getLevelRoles(guildId, level) {
  return getRolesStmt.all(guildId, level);
}

const getUserRankStmt = db.prepare(`
  SELECT COUNT(*) + 1 AS rank 
  FROM users 
  WHERE guild_id = ? AND text_xp > (SELECT text_xp FROM users WHERE user_id = ? AND guild_id = ?)
`);

function getUserRank(guildId, userId) {
  const result = getUserRankStmt.get(guildId, userId, guildId);
  return result ? result.rank : 1;
}

const addIgnoreStmt = db.prepare("REPLACE INTO xp_ignores (guild_id, target_id, type) VALUES (?, ?, ?)");
const removeIgnoreStmt = db.prepare("DELETE FROM xp_ignores WHERE guild_id = ? AND target_id = ?");
const getIgnoresStmt = db.prepare("SELECT * FROM xp_ignores WHERE guild_id = ?");

function addIgnore(guildId, targetId, type) {
  addIgnoreStmt.run(guildId, targetId, type);
}

function removeIgnore(guildId, targetId) {
  removeIgnoreStmt.run(guildId, targetId);
}

function getIgnores(guildId) {
  return getIgnoresStmt.all(guildId);
}

function setDaily(guildId, userId, time, streak) {
    // daily_streak sütununa yeni seri değerini yazar
    db.prepare(`UPDATE users SET last_daily = ?, daily_streak = ? WHERE guild_id = ? AND user_id = ?`).run(time, streak, guildId, userId);
}

/**
 * Belirli bir kullanıcının son X günlük XP geçmişini getirir.
 */
function getDailyXPStats(guildId, userId) {
  const threshold = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
  return db.prepare(`
    SELECT 
      date(timestamp, 'unixepoch') as day,
      SUM(text_xp + voice_xp) as daily_total
    FROM xp_history 
    WHERE guild_id = ? AND user_id = ? AND timestamp > ?
    GROUP BY day
    ORDER BY day ASC
  `).all(guildId, userId, threshold);
}

const getAllRolesStmt = db.prepare("SELECT * FROM level_roles WHERE guild_id = ? ORDER BY level ASC");

function getAllLevelRoles(guildId) {
  return getAllRolesStmt.all(guildId);
}

function updateDaily(guildId, userId, streak, xpAmount) {
    const now = Date.now();
    
    // 1. Önce botun mevcut XP ekleme fonksiyonunu çağır (addXP zaten çalışıyor)
    this.addXP(guildId, userId, xpAmount);

    // 2. Ardından daily bilgilerini güncelle
    // Not: Eğer last_daily veya daily_streak sütunları yoksa hata verebilir, 
    // önceki adımda paylaştığım ALTER TABLE kodlarını çalıştırdığından emin ol.
    return db.prepare(`
        UPDATE users 
        SET last_daily = ?, 
            daily_streak = ? 
        WHERE guild_id = ? AND user_id = ?
    `).run(now, streak, guildId, userId);
}

function getUsersByLevel(guildId, level) {
  return db.prepare("SELECT user_id FROM users WHERE guild_id = ? AND level = ?").all(guildId, level);
}

function resetUserCooldownData(guildId, userId) {
    db.prepare("UPDATE users SET current_cooldown_messages = 0, last_message_text = '' WHERE guild_id = ? AND user_id = ?")
      .run(guildId, userId);
}

function updateUserXPWithCounter(guildId, userId, xp, level, counter, text, gainTime) {
    db.prepare(`
        UPDATE users 
        SET text_xp = ?, 
            level = ?, 
            current_cooldown_messages = ?, 
            last_message_text = ?, 
            last_text_xp_gain = ? 
        WHERE guild_id = ? AND user_id = ?
    `).run(xp, level, counter, text, gainTime, guildId, userId);
}

function resetGuildXP(guildId) {
    db.prepare(`
        UPDATE users 
        SET text_xp = 0, -- 'xp' yerine 'text_xp' olarak güncellendi
            level = 0, 
            current_cooldown_messages = 0, 
            last_message_text = '' 
        WHERE guild_id = ?
    `).run(guildId);
}

function applyBulkLevelBoost(guildId) {
    const { getXPForLevel } = require('../utils/levelSystem');
    const users = db.prepare("SELECT user_id, level FROM users WHERE guild_id = ? AND level <= 10").all(guildId);
    
    let count = 0;
    const stmt = db.prepare("UPDATE users SET text_xp = ?, level = ? WHERE guild_id = ? AND user_id = ?");
    
    const transaction = db.transaction((list) => {
        for (const u of list) {
            const newLvl = u.level + 2;
            const newXP = getXPForLevel(newLvl); // XP'yi de artırıyoruz ki seviye geri düşmesin
            stmt.run(newXP, newLvl, guildId, u.user_id);
            count++;
        }
    });
    
    transaction(users);
    return count;
}

module.exports = {
  getGuild: getGuildSettings,
  updateGuild: updateGuild.run.bind(updateGuild), 
  getUserStats,
  addXP,
  addBulkXP,
  resetUserCooldownData,
  updateUserXPWithCounter,
  applyBulkLevelBoost,
  addVoiceXP,
  setLevel,
  resetGuild,
  getAllLevelRoles,
  getUsersByLevel,
  resetGuildXP,
  deleteGuild: deleteGuildData, // Setup komutuyla uyumluluk için alias eklendi
  getLeaderboard,
  setRoleReward,
  getLevelRoles,
  getUserRank,
  addIgnore,
  removeIgnore,
  getIgnores,
  setDaily,
  getDailyXPStats,
  updatePrefix,
  updateDaily,
  setBoost
};