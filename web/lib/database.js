import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { MULTIVIEW_CONFIG as C } from './multiview-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const dbPath = path.join(C.root, 'Documents', 'ctc_grades.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeTables();
  }
});

// Create tables if they don't exist
function initializeTables() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS specimens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      specimenId TEXT UNIQUE,
      frameworkVersion TEXT,
      frontPath TEXT,
      sidePath TEXT,
      grade TEXT,
      subgrades TEXT,
      notes TEXT,
      reportPath TEXT,
      dateGraded TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('Specimens table ready');
    }
  });
}

// Save specimen record to database
export function saveSpecimenRecord(data) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR REPLACE INTO specimens 
      (specimenId, frameworkVersion, frontPath, sidePath, grade, subgrades, notes, reportPath, dateGraded)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    
    const params = [
      data.specimenId,
      data.frameworkVersion,
      data.frontPath,
      data.sidePath,
      data.grade,
      JSON.stringify(data.subgrades),
      data.notes,
      data.reportPath
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Error saving specimen:', err.message);
        reject(err);
      } else {
        console.log(`Specimen ${data.specimenId} saved to database`);
        resolve({ id: this.lastID, ...data });
      }
    });
  });
}

// Get all specimens from database
export function getAllSpecimens() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM specimens ORDER BY dateGraded DESC';
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error fetching specimens:', err.message);
        reject(err);
      } else {
        // Parse subgrades JSON for each row
        const specimens = rows.map(row => ({
          ...row,
          subgrades: row.subgrades ? JSON.parse(row.subgrades) : {}
        }));
        resolve(specimens);
      }
    });
  });
}

// Get single specimen by ID
export function getSpecimenById(specimenId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM specimens WHERE specimenId = ?';
    
    db.get(sql, [specimenId], (err, row) => {
      if (err) {
        console.error('Error fetching specimen:', err.message);
        reject(err);
      } else if (row) {
        // Parse subgrades JSON
        row.subgrades = row.subgrades ? JSON.parse(row.subgrades) : {};
        resolve(row);
      } else {
        resolve(null);
      }
    });
  });
}

// Close database connection
export function closeDatabase() {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
      resolve();
    });
  });
}

export default db;
