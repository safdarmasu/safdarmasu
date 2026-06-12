/**
 * OPTISOFT Configuration Helper
 * Dynamically resolves the API base URL based on the client's current location.
 * This enables local network devices (tablets, mobiles) on the same Wi-Fi to load and save data.
 */
export const getApiUrl = (path = '') => {
  const hostname = window.location.hostname;

  // Local development (PC host)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:5000${path}`;
  }

  // Local network IP address (e.g., mobile phone accessing computer's server via Wi-Fi)
  const isIpAddress = /^[0-9.]+$/.test(hostname);
  if (isIpAddress) {
    return `http://${hostname}:5000${path}`;
  }

  // Cloud deployment (Vercel client)
  // For cloud deployments, if there's a deployed backend server, use it.
  // Otherwise, default to standard localhost or fall back to current host if combined.
  return `http://localhost:5000${path}`;
};
