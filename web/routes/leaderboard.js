/**
 * Leaderboard Routes
 * Persistent tracking by deviceId with highest grade per user
 */

import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import { MULTIVIEW_CONFIG as C } from '../lib/multiview-config.js';

const router = express.Router();
const db = new sqlite3.Database(path.join(C.root, 'Documents', 'ctc_grades.db'));

/**
 * Update leaderboard for a user
 * Tracks highest grade achieved per deviceId
 */
export async function updateLeaderboard(deviceId, userTag, specimenId, grade, curvature) {
  return new Promise((resolve, reject) => {
    // Extract numeric grade from PSA format (e.g., "PSA 9.5 (Mint+)" -> 9.5)
    const gradeMatch = grade.match(/PSA\s+([\d.]+)/);
    const numericGrade = gradeMatch ? parseFloat(gradeMatch[1]) : 0;
    
    db.run(`
      INSERT INTO leaderboard (
        deviceId, userTag, highestGrade, bestSpecimenId, bestCurvature, 
        lastUpdated, totalSubmissions
      )
      VALUES (?, ?, ?, ?, ?, datetime('now'), 1)
      ON CONFLICT(deviceId) DO UPDATE SET
        userTag = excluded.userTag,
        highestGrade = MAX(highestGrade, excluded.highestGrade),
        bestSpecimenId = CASE 
          WHEN excluded.highestGrade > highestGrade THEN excluded.bestSpecimenId
          ELSE bestSpecimenId
        END,
        bestCurvature = CASE
          WHEN excluded.highestGrade > highestGrade THEN excluded.bestCurvature
          ELSE bestCurvature
        END,
        lastUpdated = datetime('now'),
        totalSubmissions = totalSubmissions + 1
    `, [deviceId, userTag, numericGrade, specimenId, curvature], (err) => {
      if (err) {
        console.error('Leaderboard update error:', err);
        reject(err);
      } else {
        console.log(`✅ Leaderboard updated: ${userTag} (${grade})`);
        resolve();
      }
    });
  });
}

/**
 * GET /api/leaderboard
 * Returns top 5 persistent entries by highest grade
 */
router.get('/', async (req, res) => {
  try {
    db.all(`
      SELECT 
        l.userTag,
        l.highestGrade,
        l.bestSpecimenId,
        l.bestCurvature,
        l.totalSubmissions,
        l.lastUpdated,
        s.urlFront
      FROM leaderboard l
      LEFT JOIN specimens s ON s.specimenId = l.bestSpecimenId
      ORDER BY l.highestGrade DESC, l.lastUpdated DESC
      LIMIT 5
    `, [], (err, rows) => {
      if (err) {
        console.error('Leaderboard query error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Format for display
      const leaderboard = rows.map(row => ({
        userTag: row.userTag,
        grade: `PSA ${row.highestGrade.toFixed(1)}`,
        specimenId: row.bestSpecimenId,
        curvature: row.bestCurvature,
        totalSubmissions: row.totalSubmissions,
        lastUpdated: row.lastUpdated,
        urlFront: row.urlFront || `/specimens/${row.bestSpecimenId}/${row.bestSpecimenId}_front.jpg`
      }));
      
      res.json({
        success: true,
        count: leaderboard.length,
        leaderboard,
        message: 'Persistent leaderboard - shows highest grade per user'
      });
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/leaderboard/user/:deviceId
 * Get leaderboard entry for specific user
 */
router.get('/user/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  
  db.get(`
    SELECT 
      userTag,
      highestGrade,
      bestSpecimenId,
      bestCurvature,
      totalSubmissions,
      lastUpdated
    FROM leaderboard
    WHERE deviceId = ?
  `, [deviceId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.json({ success: false, message: 'No entries found for this device' });
    }
    
    res.json({
      success: true,
      entry: {
        userTag: row.userTag,
        grade: `PSA ${row.highestGrade.toFixed(1)}`,
        bestSpecimen: row.bestSpecimenId,
        curvature: row.bestCurvature,
        totalSubmissions: row.totalSubmissions,
        lastUpdated: row.lastUpdated
      }
    });
  });
});

/**
 * GET /api/leaderboard/stats
 * Get overall leaderboard statistics
 */
router.get('/stats', (req, res) => {
  db.get(`
    SELECT 
      COUNT(*) as totalUsers,
      AVG(highestGrade) as avgGrade,
      MAX(highestGrade) as topGrade,
      SUM(totalSubmissions) as totalSubmissions
    FROM leaderboard
  `, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    res.json({
      success: true,
      stats: {
        totalUsers: row.totalUsers || 0,
        averageGrade: row.avgGrade ? row.avgGrade.toFixed(2) : 0,
        topGrade: row.topGrade ? row.topGrade.toFixed(1) : 0,
        totalSubmissions: row.totalSubmissions || 0
      }
    });
  });
});

export default router;

