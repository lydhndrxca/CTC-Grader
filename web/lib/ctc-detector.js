import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runPython(pythonBin, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonBin, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      const err = new Error(`Python exited with code ${code}: ${stderr}`);
      err.code = code;
      err.stderr = stderr;
      err.stdout = stdout;
      reject(err);
    });
  });
}

/**
 * CTC Detection using TensorFlow model (V1 - 80.7% accuracy, 96.3% recall)
 * Uses the trained model from ctc_detector/models/ctc_detector.h5
 */
export async function detectCTC(frontPath, sidePath) {
  try {
    const projectRoot = path.resolve(__dirname, '..', '..');
    const detectorDir = path.join(projectRoot, 'ctc_detector');
    const scriptPath = path.join(detectorDir, 'predict.py');
    const modelPath = path.join(detectorDir, 'models', 'ctc_detector.h5');
    const venvPython = path.join(detectorDir, 'venv', 'Scripts', 'python.exe');
    
    // Check if model exists
    if (!fs.existsSync(modelPath)) {
      console.warn('⚠️  CTC detector model not found, bypassing');
      return { isCTC: true, confidence: 1.0, reason: 'Detector model missing; bypassing' };
    }
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      console.warn('⚠️  CTC detector script not found, bypassing');
      return { isCTC: true, confidence: 1.0, reason: 'Detector script missing; bypassing' };
    }
    
    // Check if venv Python exists
    if (!fs.existsSync(venvPython)) {
      console.warn('⚠️  Python venv not found, bypassing TensorFlow detector');
      return { isCTC: true, confidence: 1.0, reason: 'Python venv missing; bypassing' };
    }
    
    console.log('🤖 Running TensorFlow CTC detector (V1 - 96.3% recall)...');
    
    // Run predict.py with venv Python
    const args = [scriptPath, frontPath, sidePath];
    const { stdout, stderr } = await runPython(venvPython, args, { cwd: detectorDir });
    
    // Log stderr (TensorFlow warnings are normal)
    if (stderr) {
      console.log('TensorFlow output:', stderr.substring(0, 200));
    }
    
    const text = stdout.trim();
    let parsed;
    
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON from output
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        parsed = JSON.parse(m[0]);
      } else {
        throw new Error('Could not parse detector output');
      }
    }
    
    if (!parsed || typeof parsed.confidence !== 'number') {
      throw new Error('Invalid detector response format');
    }
    
    console.log(`✅ TensorFlow detector result: ${parsed.isCTC ? 'CTC' : 'NOT CTC'} (${(parsed.confidence * 100).toFixed(1)}%)`);
    
    return parsed;
    
  } catch (e) {
    console.error('❌ TensorFlow detector error:', e.message);
    // Fail open - allow submission if detector fails
    return { 
      isCTC: true, 
      confidence: 1.0,
      reason: 'Detector bypassed - proceeding to GPT-4o classification' 
    };
  }
}

export default { detectCTC };
