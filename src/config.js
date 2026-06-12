/**
 * OPTISOFT Configuration Helper
 * Dynamically resolves the API base URL based on the client's current location.
 * This enables local network devices (tablets, mobiles) on the same Wi-Fi to load and save data.
 */
export const getApiUrl = (path = '') => {
  const hostname = window.location.hostname;

  // Prioritize cloud backend if configured in environment variables (Vercel)
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}${path}`;
  }

  // Local development (PC host)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:5000${path}`;
  }

  // Local network IP address (e.g., mobile phone accessing computer's server via Wi-Fi)
  const isIpAddress = /^[0-9.]+$/.test(hostname);
  if (isIpAddress) {
    return `http://${hostname}:5000${path}`;
  }

  // Default fallback (local backend)
  return `http://localhost:5000${path}`;
};
