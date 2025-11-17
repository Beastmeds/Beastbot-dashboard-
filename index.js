const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Simple in-memory "roles" for demo
const users = {
  "owner@example.com": { role: "owner" },
  "admin@example.com": { role: "admin" },
  "mod@example.com": { role: "mod" },
  "team@example.com": { role: "team" }
};

const SECRET = process.env.JWT_SECRET || 'dev-secret';

// Auth route (demo only)
app.post('/api/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const user = users[email] || { role: 'member' };
  const token = jwt.sign({ email, role: user.role }, SECRET, { expiresIn: '8h' });
  return res.json({ token, role: user.role });
});

// Middleware
function requireRole(minRoles) {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'no token' });
    const token = auth.replace('Bearer ', '');
    try {
      const payload = jwt.verify(token, SECRET);
      req.user = payload;
      if (!minRoles.includes(payload.role) && payload.role !== 'owner') {
        return res.status(403).json({ error: 'insufficient role' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ error: 'invalid token' });
    }
  };
}

// Example endpoints
app.post('/api/send', requireRole(['admin','mod']), (req, res) => {
  const { channel, message } = req.body;
  // Here you'd integrate with your WhatsApp / Discord bot logic.
  console.log('SEND', req.user.email, channel, message);
  return res.json({ ok: true, sentTo: channel });
});

app.post('/api/restart', requireRole(['admin']), (req, res) => {
  console.log('RESTART triggered by', req.user.email);
  // Trigger your bot restart logic (systemctl, process manager, webhook...)
  return res.json({ ok: true, restarted: true });
});

app.get('/api/logs', requireRole(['admin','mod']), (req, res) => {
  // Return sample logs
  const logs = [
    { ts: Date.now()-10000, text: "Started bot" },
    { ts: Date.now()-5000, text: "Received message from +491..." }
  ];
  return res.json({ ok: true, logs });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Backend listening on', PORT));
