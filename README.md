# QR Attendance App (Prototype)

Students show their college ID QR (the QR contains their registration number). This prototype provides a simple server and a web-based camera scanner to mark attendance.

Features
- Accepts QR payloads that are either plain registration strings or signed JSON (if APP_SECRET is set).
- Stores attendance records in a local SQLite DB (attendance.db).
- Simple web scanner that uses the device camera (html5-qrcode).

Quick start

1. Clone the repo

   git clone https://github.com/roy29-p/qr-attendance-app.git
   cd qr-attendance-app

2. Install dependencies

   npm install

3. (Optional) Set APP_SECRET to enable signed QR verification

   export APP_SECRET="a_strong_secret_here"

4. Run the server

   npm start

   The server listens on port 3000 by default.

5. Open the web scanner

   Serve the web directory (or open web/index.html directly in Chrome):

   python3 -m http.server 8000
   # then open http://localhost:8000/web/index.html

   The scanner will ask for the server base URL and a device ID.

Generating QR codes

- If you don't set APP_SECRET, you can simply encode the registration number as the QR payload (e.g. "REG2023001").
- If you set APP_SECRET, use `node qr-generator.js REG2023001` to print a signed JSON payload to include in the QR.

Notes & next steps

- This is a prototype. For production, consider:
  - Enforcing signed QR payloads and rotating secrets
  - Device registration & API keys for kiosks
  - TLS (HTTPS) and authentication
  - Audit logs and anti-fraud measures (rate limiting, geofencing, duplicate detection)
  - Migrating SQLite -> Postgres for scale

How the scan flow works
- The camera decodes the QR and the browser posts the decoded text to /attendance/checkin.
- The server records registration, timestamp, device_id and raw QR payload.

