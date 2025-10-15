/**
 * Hybrid Identity Tracker for Fan Submissions
 * Device fingerprint + IP tracking (NO SUBMISSION LIMITS)
 * Used for moderation, leaderboard persistence, and anti-abuse only
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { MULTIVIEW_CONFIG as C } from './multiview-config.js';
import { recordIdentity, checkForAbusePatterns } from './identity-utils.js';

const db = new sqlite3.Database(path.join(C.root, 'Documents', 'ctc_grades.db'));

/**
 * Hybrid identity middleware
 * Records device+IP for tracking but DOES NOT enforce limits
 * Issues warnings for suspicious patterns but allows submission
 */
export async function hybridIdentityMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const deviceId = req.body.deviceId;
  
  // Validate deviceId exists
  if (!deviceId) {
    console.warn('⚠️  No deviceId provided - allowing submission but flagging');
    req.identityWarnings = req.identityWarnings || [];
    req.identityWarnings.push('No device fingerprint provided');
    // Still allow - don't block
    return next();
  }
  
  try {
    // Check for abuse patterns (warnings only, no blocking)
    const warnings = await checkForAbusePatterns(deviceId, ip);
    
    if (warnings.length > 0) {
      console.warn('⚠️  Abuse pattern warnings:', warnings);
      req.identityWarnings = warnings;
      // Log but don't block - unlimited submissions allowed
    }
    
    // Attach identity info to request
    req.deviceId = deviceId;
    req.userIp = ip;
    
    next();
  } catch (error) {
    console.error('Identity check error:', error);
    // Fail open - allow submission
    next();
  }
}

/**
 * Legacy compatibility - no-op middleware
 * Removed rate limiting, keeping function for backward compatibility
 */
export function rateLimitMiddleware(req, res, next) {
  // No limits enforced - pass through
  console.log('ℹ️  Rate limiting disabled (unlimited submissions enabled)');
  next();
}

// Legacy exports for backward compatibility
export async function countRecentSubmissions(ip) {
  return 0; // Always return 0 - no limits
}

export async function recordSubmission(ip, specimenId) {
  // No-op - legacy function
  console.log('ℹ️  Legacy recordSubmission called (no action taken)');
  return Promise.resolve();
}

export async function cleanupOldRecords() {
  // Clean up old fan_limits records instead
  return new Promise((resolve, reject) => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    
    db.run(`
      DELETE FROM fan_limits WHERE lastSubmission < ?
    `, [ninetyDaysAgo], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export default {
  hybridIdentityMiddleware,
  rateLimitMiddleware,
  countRecentSubmissions,
  recordSubmission,
  cleanupOldRecords
};

