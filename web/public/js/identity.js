/**
 * Client-Side Device Identity System
 * Uses FingerprintJS for anonymous device identification
 * No cookies, no login required - privacy-focused
 */

/**
 * Get or generate device ID
 * Uses FingerprintJS if available, falls back to UUID
 */
async function getDeviceId() {
  // Check localStorage first
  let deviceId = localStorage.getItem('ctc_device_id');
  
  if (deviceId) {
    console.log('Using existing device ID:', deviceId.substring(0, 8) + '...');
    return deviceId;
  }
  
  try {
    // Try to use FingerprintJS CDN version
    if (typeof FingerprintJS !== 'undefined') {
      console.log('Generating device fingerprint with FingerprintJS...');
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      deviceId = result.visitorId;
      console.log('FingerprintJS device ID:', deviceId.substring(0, 8) + '...');
    } else {
      throw new Error('FingerprintJS not loaded');
    }
  } catch (error) {
    // Fallback to crypto.randomUUID()
    console.warn('FingerprintJS not available, using UUID fallback:', error.message);
    deviceId = crypto.randomUUID();
    console.log('Generated UUID:', deviceId);
  }
  
  // Store in localStorage for persistence
  localStorage.setItem('ctc_device_id', deviceId);
  return deviceId;
}

/**
 * Attach identity information to FormData
 * Adds deviceId to submission payload
 */
export async function attachIdentity(formData) {
  const deviceId = await getDeviceId();
  formData.append('deviceId', deviceId);
  console.log('✅ Device identity attached to submission');
  return formData;
}

/**
 * Get user tag from localStorage or generate new
 * 3-character handle (A-Z, 0-9)
 */
export function getUserTag() {
  let userTag = localStorage.getItem('ctc_user_tag');
  
  if (!userTag) {
    // Generate random 3-char tag
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    userTag = Array(3).fill(0)
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join('');
    
    console.log('Generated random user tag:', userTag);
  }
  
  return userTag;
}

/**
 * Set user tag and persist to localStorage
 */
export function setUserTag(tag) {
  const normalized = tag.toUpperCase().substring(0, 3).replace(/[^A-Z0-9]/g, '');
  
  if (normalized.length === 3) {
    localStorage.setItem('ctc_user_tag', normalized);
    console.log('User tag saved:', normalized);
    return normalized;
  } else {
    console.error('Invalid user tag format:', tag);
    return null;
  }
}

/**
 * Clear identity (for testing or privacy)
 */
export function clearIdentity() {
  localStorage.removeItem('ctc_device_id');
  localStorage.removeItem('ctc_user_tag');
  console.log('Identity cleared from localStorage');
}

/**
 * Get identity summary for display
 */
export async function getIdentitySummary() {
  const deviceId = await getDeviceId();
  const userTag = getUserTag();
  
  return {
    deviceId: deviceId.substring(0, 8) + '...',  // Truncated for privacy
    userTag,
    isNew: !localStorage.getItem('ctc_device_id')
  };
}

// Auto-initialize on page load
(async function init() {
  const summary = await getIdentitySummary();
  console.log('🔐 Identity System Initialized');
  console.log('   Device:', summary.deviceId);
  console.log('   Tag:', summary.userTag);
  console.log('   New user:', summary.isNew);
})();

// Export for use in other scripts
window.CTCIdentity = {
  getDeviceId,
  getUserTag,
  setUserTag,
  attachIdentity,
  clearIdentity,
  getIdentitySummary
};


