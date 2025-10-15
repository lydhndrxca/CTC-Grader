/**
 * Server-Side Identity Management
 * Handles device fingerprint + IP hybrid tracking
 * No submission limits - tracking for moderation only
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { MULTIVIEW_CONFIG as C } from './multiview-config.js';

const db = new sqlite3.Database(path.join(C.root, 'Documents', 'ctc_grades.db'));

/**
 * Initialize fan_limits table
 */
export function initFanLimitsTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS fan_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deviceId TEXT NOT NULL,
        ip TEXT NOT NULL,
        lastSubmission TEXT NOT NULL,
        totalSubmissions INTEGER DEFAULT 1,
        UNIQUE(deviceId, ip)
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Record submission for tracking purposes (no limits enforced)
 */
export async function recordIdentity(deviceId, ip, specimenId) {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO fan_limits (deviceId, ip, lastSubmission, totalSubmissions)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(deviceId, ip) DO UPDATE SET
        lastSubmission = excluded.lastSubmission,
        totalSubmissions = totalSubmissions + 1
    `, [deviceId, ip, new Date().toISOString()], (err) => {
      if (err) reject(err);
      else {
        console.log(`✅ Identity recorded: ${deviceId.substring(0, 8)}... from ${ip}`);
        resolve();
      }
    });
  });
}

/**
 * Get submission stats for device+IP combo
 */
export async function getIdentityStats(deviceId, ip) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT totalSubmissions, lastSubmission
      FROM fan_limits
      WHERE deviceId = ? AND ip = ?
    `, [deviceId, ip], (err, row) => {
      if (err) reject(err);
      else resolve(row || { totalSubmissions: 0, lastSubmission: null });
    });
  });
}

/**
 * Check for suspicious activity patterns
 * Returns warnings but doesn't block
 */
export async function checkForAbusePatterns(deviceId, ip) {
  return new Promise(async (resolve) => {
    const warnings = [];
    
    try {
      // Check 1: Excessive submissions from same device in short time
      const recentCount = await new Promise((res, rej) => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        db.get(`
          SELECT COUNT(*) as count
          FROM specimens
          WHERE submissionType = 'VO' 
          AND dateGraded > ?
          AND (
            SELECT deviceId FROM fan_limits 
            WHERE fan_limits.deviceId = ? 
            LIMIT 1
          ) IS NOT NULL
        `, [oneHourAgo, deviceId], (err, row) => {
          if (err) res(0);
          else res(row.count || 0);
        });
      });
      
      if (recentCount > 10) {
        warnings.push({
          level: 'warning',
          message: `High submission rate: ${recentCount} in past hour from this device`
        });
      }
      
      // Check 2: Multiple devices from same IP (potential abuse)
      const devicesFromIP = await new Promise((res, rej) => {
        db.all(`
          SELECT DISTINCT deviceId
          FROM fan_limits
          WHERE ip = ?
          AND lastSubmission > datetime('now', '-24 hours')
        `, [ip], (err, rows) => {
          if (err) res([]);
          else res(rows);
        });
      });
      
      if (devicesFromIP.length > 5) {
        warnings.push({
          level: 'warning',
          message: `Multiple devices (${devicesFromIP.length}) from same IP in 24h`
        });
      }
      
    } catch (error) {
      console.error('Error checking abuse patterns:', error);
    }
    
    resolve(warnings);
  });
}

/**
 * Clean up old tracking data (> 90 days)
 */
export async function cleanupOldIdentityRecords() {
  return new Promise((resolve, reject) => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    
    db.run(`
      DELETE FROM fan_limits 
      WHERE lastSubmission < ?
    `, [ninetyDaysAgo], (err) => {
      if (err) reject(err);
      else {
        console.log('✅ Cleaned up old identity records');
        resolve();
      }
    });
  });
}

// Initialize table on module load
initFanLimitsTable().catch(err => {
  console.error('Failed to initialize fan_limits table:', err);
});

export default {
  recordIdentity,
  getIdentityStats,
  checkForAbusePatterns,
  cleanupOldIdentityRecords
};


