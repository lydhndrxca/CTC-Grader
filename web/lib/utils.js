/**
 * Generate a unique certification ID
 * Format: MV-YYYYMMDD-XXXXXX (for MV) or VO-YYYYMMDD-XXXXXX (for VO)
 */
export function generateCertId(classification) {
  const prefix = classification === 'MV' ? 'MV' : 'VO';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  // Generate random 6-character hex string
  const random = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
  return `${prefix}-${date}-${random}`;
}

/**
 * Generate ISO date string
 */
export function generateISODate() {
  return new Date().toISOString();
}

/**
 * Validate admin key
 */
export function validateAdminKey(key) {
  const expectedKey = process.env.ADMIN_KEY || 'multiview_admin_2025';
  return key === expectedKey;
}

/**
 * Generate specimen metadata JSON
 */
export function generateMetadata(specimenId, classification, additionalData = {}) {
  return JSON.stringify({
    specimenId,
    classification,
    submittedAt: new Date().toISOString(),
    ...additionalData
  });
}

/**
 * Format measurements for display
 */
export function formatMeasurements(weight_g, height_mm, width_mm, depth_mm) {
  const parts = [];
  if (weight_g) parts.push(`Weight: ${weight_g}g`);
  if (height_mm) parts.push(`H: ${height_mm}mm`);
  if (width_mm) parts.push(`W: ${width_mm}mm`);
  if (depth_mm) parts.push(`D: ${depth_mm}mm`);
  return parts.join(' | ');
}

