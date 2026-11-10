const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const db = require('./db');
const pushService = require('./push-service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust reverse proxy (e.g. ngrok, caddy, nginx, cloudflare)
app.set('trust proxy', 1);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Server-Sent Events (SSE) clients pool
const sseClients = new Set();

function broadcastSSE(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(payload);
    } catch (e) {
      console.warn('Error writing SSE to client:', e.message);
    }
  }
}

// SSE keep-alive interval
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.res.write(': keepalive\n\n');
    } catch (e) {
      // ignore
    }
  }
}, 25000);

// SSE endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const clientInfo = {
    id: Date.now() + Math.random(),
    res,
    role: req.query.role || 'guest'
  };
  sseClients.add(clientInfo);

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ connected: true, clientsCount: sseClients.size })}\n\n`);

  req.on('close', () => {
    sseClients.delete(clientInfo);
  });
});

// Middleware for PIN authentication on protected endpoints
function requireAuth(req, res, next) {
  const settings = db.getSettings();
  const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');

  if (token && token === settings.pin) {
    return next();
  }
  return res.status(401).json({ error: 'Neautorizat. Te rugăm să introduci codul PIN corect.' });
}

// --- Public Endpoints ---

// Get VAPID Public Key for client push subscription
app.get('/api/push/public-key', async (req, res) => {
  try {
    const publicKey = await pushService.getPublicKey();
    res.json({ publicKey });
  } catch (err) {
    res.status(500).json({ error: 'Eroare obținere cheie publică' });
  }
});

// Register a push subscription
app.post('/api/push/subscribe', async (req, res) => {
  try {
    const { subscription, role, deviceName } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Abonament push invalid' });
    }

    const userAgent = req.headers['user-agent'] || '';
    const saved = await db.saveSubscription({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      role: role || 'boyfriend_iphone',
      deviceName: deviceName || (userAgent.includes('iPhone') ? 'iPhone' : 'Dispozitiv'),
      userAgent
    });

    await db.addLog('info', `Abonament nou înregistrat: ${saved.deviceName} (${saved.role})`);
    res.json({ success: true, subscription: saved });
  } catch (err) {
    console.error('Error saving push subscription:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remove push subscription
app.post('/api/push/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint lipsă' });
    await db.removeSubscription(endpoint);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Girlfriend triggers alert
app.post('/api/alerts', async (req, res) => {
  try {
    const { type, note, customTitle, customMessage } = req.body;

    const alertTypes = {
      emergency: {
        title: '❤️ AM NEVOIE DE TINE!',
        message: 'Iubita ta te cheamă chiar acum. Are nevoie de tine!'
      },
      overthinking: {
        title: '🥺 AM OVERTHINKING',
        message: 'Gândurile o copleșesc. Are nevoie de vorbele tale calde și de liniște.'
      },
      sad: {
        title: '💔 SUNT TRISTĂ',
        message: 'Inima ei e tristă sau supărată. Fii alături de ea!'
      },
      hug: {
        title: '🫂 AM NEVOIE DE O ÎMBRĂȚIȘARE',
        message: 'Se simte vulnerabilă și vrea să o ții strâns în brațe.'
      },
      miss: {
        title: '❤️ MI-E DOR DE TINE',
        message: 'Îi este un dor nebun de tine și vrea să știe că ești cu gândul la ea.'
      },
      sleep: {
        title: '🌙 NU POT SĂ DORM',
        message: 'Nu poate adormi și se simte singură în noapte. Vorbește cu ea.'
      },
      sick: {
        title: '😔 NU MĂ SIMT BINE',
        message: 'Nu se simte bine fizic sau emoțional. Are nevoie de grija ta.'
      },
      talk: {
        title: '💌 VREAU SĂ VORBESC CU TINE',
        message: 'Are ceva pe suflet și vrea să discutați deschis, fără judecată.'
      }
    };

    const selectedType = alertTypes[type] || alertTypes.emergency;
    const title = customTitle || selectedType.title;
    const message = customMessage || selectedType.message;

    const alert = await db.addAlert({
      type: type || 'emergency',
      title,
      message,
      note: note || '',
      urgency: 'high',
      ip: req.ip
    });

    // 1. Send push notifications to all registered devices (boyfriend's iPhone)
    // Run asynchronously to return fast response to girlfriend
    pushService.sendAlertNotification(alert).catch(err => {
      console.error('Failed sending push notifications:', err);
    });

    // 2. Broadcast via SSE to open dashboards in real-time
    broadcastSSE('new_alert', alert);

    res.json({
      success: true,
      alert,
      replyMessage: 'Am primit semnalul tău, iubirea mea. Sunt aici. ❤️'
    });
  } catch (err) {
    console.error('Error creating alert:', err);
    res.status(500).json({ error: 'Eroare la trimiterea alertei' });
  }
});

// Girlfriend gets latest alert status
app.get('/api/alerts/latest', (req, res) => {
  const latest = db.getLatestAlert();
  res.json({ alert: latest });
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  const settings = db.getSettings();

  if (pin === settings.pin) {
    res.cookie('auth_token', pin, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
    });
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Cod PIN incorect' });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

app.get('/api/auth/check', (req, res) => {
  const settings = db.getSettings();
  const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
  res.json({ authenticated: token === settings.pin });
});

// --- Protected Dashboard Endpoints ---

// Get all alerts
app.get('/api/alerts', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  res.json({ alerts: db.getAlerts(limit) });
});

// Boyfriend acknowledges alert
app.post('/api/alerts/:id/ack', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { replyMessage } = req.body;
    const message = replyMessage || '❤️ Am văzut, sunt aici!';

    const updated = await db.acknowledgeAlert(id, message);
    if (!updated) {
      return res.status(404).json({ error: 'Alerta nu a fost găsită' });
    }

    // Broadcast acknowledgment live to girlfriend's page
    broadcastSSE('alert_acknowledged', updated);

    await db.addLog('info', `Alerta ${id} confirmată: "${message}"`);
    res.json({ success: true, alert: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete alert
app.delete('/api/alerts/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await db.deleteAlert(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Alerta nu a fost găsită' });
    broadcastSSE('alert_deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all alerts
app.delete('/api/alerts', requireAuth, async (req, res) => {
  try {
    await db.clearAllAlerts();
    broadcastSSE('alerts_cleared', {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subscriptions list
app.get('/api/subscriptions', requireAuth, (req, res) => {
  res.json({ subscriptions: db.getSubscriptions() });
});

// Delete subscription
app.delete('/api/subscriptions/:id', requireAuth, async (req, res) => {
  try {
    const subs = db.getSubscriptions();
    const target = subs.find(s => s.id === req.params.id);
    if (target) {
      await db.removeSubscription(target.endpoint);
      return res.json({ success: true });
    }
    res.status(404).json({ error: 'Abonament negăsit' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test push notification
app.post('/api/push/test', requireAuth, async (req, res) => {
  try {
    const { subscriptionId, customMessage } = req.body;
    const subs = db.getSubscriptions();

    if (subs.length === 0) {
      return res.status(400).json({
        error: 'Nu există niciun iPhone sau dispozitiv abonat la notificări push. Activează notificările pe iPhone mai întâi!'
      });
    }

    let targetSubs = subs;
    if (subscriptionId) {
      targetSubs = subs.filter(s => s.id === subscriptionId);
    }

    const results = [];
    for (const sub of targetSubs) {
      try {
        await pushService.sendTestPush(sub, customMessage);
        results.push({ id: sub.id, deviceName: sub.deviceName, status: 'success' });
      } catch (err) {
        results.push({ id: sub.id, deviceName: sub.deviceName, status: 'failed', error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings
app.get('/api/settings', requireAuth, (req, res) => {
  const settings = { ...db.getSettings() };
  // Don't leak private key
  if (settings.vapidKeys) {
    settings.vapidKeys = {
      publicKey: settings.vapidKeys.publicKey,
      configured: true
    };
  }
  res.json({ settings });
});

app.post('/api/settings', requireAuth, async (req, res) => {
  try {
    const { pin, girlfriendName, boyfriendName, boyfriendPhone, whatsappNumber, telegramBotToken, telegramChatId } = req.body;
    const updates = {};
    if (pin && pin.trim().length >= 4) updates.pin = pin.trim();
    if (girlfriendName) updates.girlfriendName = girlfriendName.trim();
    if (boyfriendName) updates.boyfriendName = boyfriendName.trim();
    if (boyfriendPhone !== undefined) updates.boyfriendPhone = boyfriendPhone.trim();
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber.trim();
    if (telegramBotToken !== undefined) updates.telegramBotToken = telegramBotToken.trim();
    if (telegramChatId !== undefined) updates.telegramChatId = telegramChatId.trim();

    const saved = await db.updateSettings(updates);
    res.json({ success: true, settings: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logs
app.get('/api/logs', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  res.json({ logs: db.getLogs(limit) });
});

// Public info for girlfriend (e.g. contact buttons if configured)
app.get('/api/info', (req, res) => {
  const settings = db.getSettings();
  res.json({
    girlfriendName: settings.girlfriendName,
    boyfriendName: settings.boyfriendName,
    hasPhone: Boolean(settings.boyfriendPhone),
    hasWhatsapp: Boolean(settings.whatsappNumber),
    boyfriendPhone: settings.boyfriendPhone,
    whatsappNumber: settings.whatsappNumber
  });
});

// Fallback to HTML files
app.use((req, res) => {
  if (req.path.startsWith('/dashboard')) {
    return res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  }
  if (req.path.startsWith('/guide') || req.path.startsWith('/ghid')) {
    return res.sendFile(path.join(__dirname, 'public', 'guide.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`❤️  PENTRU INIMA MEA - Server activ pe portul ${PORT}`);
  console.log(`📱 Pagina principală (pentru ea): http://localhost:${PORT}`);
  console.log(`🛡️  Panou Dashboard (pentru tine): http://localhost:${PORT}/dashboard.html`);
  console.log(`📖 Ghid configurare iPhone:        http://localhost:${PORT}/guide.html`);
  console.log(`🔑 PIN Dashboard implicit:       inima123`);
  console.log(`======================================================\n`);
});
