// qr-generator.js
// Usage: node qr-generator.js REG2023001
// If APP_SECRET is set in env, it will output a signed JSON payload suitable for printing as QR.
const crypto = require('crypto');
const registration = process.argv[2];
if (!registration) {
  console.error('Usage: node qr-generator.js <registration>');
  process.exit(1);
}
const APP_SECRET = process.env.APP_SECRET || '';
if (!APP_SECRET) {
  // For simple prototype, just output the registration string
  console.log(registration);
  process.exit(0);
}

const issued_at = new Date().toISOString();
const data = `${registration}|${issued_at}`;
const sig = crypto.createHmac('sha256', APP_SECRET).update(data).digest('hex');
const payload = { registration, issued_at, sig };
console.log(JSON.stringify(payload));
