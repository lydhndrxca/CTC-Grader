/**
 * Database Migration for Fan Submission System
 * Adds required columns and tables for v1.7 features
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { MULTIVIEW_CONFIG as C } from './multiview-config.js';

const dbPath = path.join(C.root, 'Documents', 'ctc_grades.db');
const db = new sqlite3.Database(dbPath);

/**
 * Run all migrations
 */
export async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Migration 1: Add new columns to specimens table
    await addSpecimenColumns();
    
    // Migration 2: Add imageHash column to specimens
    await addImageHashColumn();
    
    // Migration 3: Create leaderboard table (persistent by deviceId)
    await createLeaderboardTable();
    
    // Migration 4: Create fan_limits table (hybrid identity)
    await createFanLimitsTable();
    
    // Migration 5: Create image_hashes table
    await createImageHashesTable();
    
    // Migration 6: Update existing records
    await updateExistingRecords();
    
    console.log('✅ All migrations completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Add new columns to specimens table
 */
function addSpecimenColumns() {
  return new Promise((resolve, reject) => {
    // SQLite doesn't support multiple ADD COLUMN in one statement
    const migrations = [
      `ALTER TABLE specimens ADD COLUMN submissionType TEXT DEFAULT 'VO'`,
      `ALTER TABLE specimens ADD COLUMN userTag TEXT`,
      `ALTER TABLE specimens ADD COLUMN curvature REAL`,
      `ALTER TABLE specimens ADD COLUMN published INTEGER DEFAULT 1`,
      `ALTER TABLE specimens ADD COLUMN deviceId TEXT`
    ];
    
    let completed = 0;
    
    migrations.forEach((sql, index) => {
      db.run(sql, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error(`Error in migration ${index + 1}:`, err.message);
          // Don't reject on duplicate column - it means migration already ran
        }
        
        completed++;
        if (completed === migrations.length) {
          console.log('  ✅ Specimens table columns added');
          resolve();
        }
      });
    });
  });
}

/**
 * Add imageHash column to specimens table
 */
function addImageHashColumn() {
  return new Promise((resolve, reject) => {
    db.run(`
      ALTER TABLE specimens ADD COLUMN imageHash TEXT
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding imageHash column:', err.message);
      }
      console.log('  ✅ ImageHash column added to specimens');
      resolve();
    });
  });
}

/**
 * Create leaderboard table (persistent by deviceId)
 */
function createLeaderboardTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        deviceId TEXT PRIMARY KEY,
        userTag TEXT NOT NULL,
        highestGrade REAL NOT NULL,
        bestSpecimenId TEXT,
        bestCurvature REAL,
        lastUpdated TEXT NOT NULL,
        totalSubmissions INTEGER DEFAULT 1
      )
    `, (err) => {
      if (err) reject(err);
      else {
        console.log('  ✅ Leaderboard table created');
        resolve();
      }
    });
  });
}

/**
 * Create fan_limits table (hybrid identity tracking)
 */
function createFanLimitsTable() {
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
      else {
        console.log('  ✅ Fan limits table created');
        resolve();
      }
    });
  });
}

/**
 * Create image_hashes table
 */
function createImageHashesTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS image_hashes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        specimenId TEXT NOT NULL,
        imageHash TEXT NOT NULL,
        imageType TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `, (err) => {
      if (err) reject(err);
      else {
        console.log('  ✅ Image hashes table created');
        resolve();
      }
    });
  });
}

/**
 * Update existing records with default values
 */
function updateExistingRecords() {
  return new Promise((resolve, reject) => {
    // Set all existing specimens to VO type if NULL
    db.run(`
      UPDATE specimens 
      SET submissionType = 'VO' 
      WHERE submissionType IS NULL
    `, (err) => {
      if (err) {
        reject(err);
      } else {
        // Set all existing specimens to published
        db.run(`
          UPDATE specimens 
          SET published = 1 
          WHERE published IS NULL
        `, (err2) => {
          if (err2) reject(err2);
          else {
            console.log('  ✅ Existing records updated');
            resolve();
          }
        });
      }
    });
  });
}

/**
 * Rollback migrations (use with caution)
 */
export async function rollbackMigrations() {
  console.log('⚠️  Rolling back migrations...');
  
  return new Promise((resolve, reject) => {
    // Note: SQLite doesn't support DROP COLUMN
    // We can only drop tables
    const dropTables = [
      'DROP TABLE IF EXISTS leaderboard',
      'DROP TABLE IF EXISTS rate_limits',
      'DROP TABLE IF EXISTS image_hashes'
    ];
    
    let completed = 0;
    dropTables.forEach(sql => {
      db.run(sql, (err) => {
        if (err) console.error('Rollback error:', err);
        completed++;
        if (completed === dropTables.length) {
          console.log('✅ Rollback complete (new tables removed)');
          resolve();
        }
      });
    });
  });
}

/**
 * Check migration status
 */
export async function checkMigrationStatus() {
  return new Promise((resolve) => {
    const status = {
      specimensTable: false,
      leaderboardTable: false,
      rateLimitsTable: false,
      imageHashesTable: false
    };
    
    db.get(`SELECT submissionType, userTag, curvature, published FROM specimens LIMIT 1`, (err, row) => {
      status.specimensTable = !err;
      
      db.get(`SELECT * FROM leaderboard LIMIT 1`, (err2) => {
        status.leaderboardTable = !err2;
        
        db.get(`SELECT * FROM rate_limits LIMIT 1`, (err3) => {
          status.rateLimitsTable = !err3;
          
          db.get(`SELECT * FROM image_hashes LIMIT 1`, (err4) => {
            status.imageHashesTable = !err4;
            resolve(status);
          });
        });
      });
    });
  });
}

// Run migrations on module load (safe - CREATE IF NOT EXISTS)
runMigrations().catch(err => {
  console.error('❌ Failed to run migrations:', err);
});

export default { runMigrations, rollbackMigrations, checkMigrationStatus };

