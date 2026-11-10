// dashboard.js - Boyfriend's Monitoring & Response Dashboard

let currentAlerts = [];
let pendingAckAlertId = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initDashboardEvents();
  initSSE();
  initPushSubscriber();
});

// Sound synthesizer for incoming boyfriend alerts
function playIncomingAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    // Dramatic urgent double-ping alert
    [659.25, 880, 659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.18);
      gain.gain.setValueAtTime(0.001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.4, now + i * 0.18 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.4);
    });
  } catch (e) {
    console.log('AudioContext error:', e);
  }
}

// Check Authentication
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (data.authenticated) {
      showDashboardView();
      loadAlerts();
      loadSubscriptions();
      loadSettings();
      loadLogs();
    } else {
      showLoginView();
    }
  } catch (err) {
    showLoginView();
  }
}

function showLoginView() {
  document.getElementById('login-card').style.display = 'block';
  document.getElementById('dashboard-view').style.display = 'none';
}

function showDashboardView() {
  document.getElementById('login-card').style.display = 'none';
  document.getElementById('dashboard-view').style.display = 'block';
}

// Authentication Handlers
function initDashboardEvents() {
  const loginForm = document.getElementById('login-form');
  const pinInput = document.getElementById('pin-input');
  const loginError = document.getElementById('login-error');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';
      const pin = pinInput.value.trim();

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin })
        });
        const data = await res.json();
        if (data.success) {
          pinInput.value = '';
          showDashboardView();
          loadAlerts();
          loadSubscriptions();
          loadSettings();
          loadLogs();
        } else {
          loginError.textContent = data.error || 'PIN incorect';
          loginError.style.display = 'block';
        }
      } catch (err) {
        loginError.textContent = 'Eroare de conexiune la server';
        loginError.style.display = 'block';
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      showLoginView();
    });
  }

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.getAttribute('data-target'));
      if (target) target.classList.add('active');
    });
  });

  // Ack Modal submit
  const ackSubmitBtn = document.getElementById('btn-submit-ack');
  const ackCancelBtn = document.getElementById('btn-cancel-ack');
  const ackModal = document.getElementById('ack-modal');

  if (ackCancelBtn) {
    ackCancelBtn.addEventListener('click', () => {
      ackModal.classList.remove('active');
      pendingAckAlertId = null;
    });
  }

  if (ackSubmitBtn) {
    ackSubmitBtn.addEventListener('click', async () => {
      if (!pendingAckAlertId) return;
      const customReply = document.getElementById('ack-custom-reply').value.trim();
      const selectedPreset = document.querySelector('input[name="ack-preset"]:checked')?.value;
      const replyMessage = customReply || selectedPreset || '❤️ Am văzut, sunt aici!';

      await submitAcknowledgment(pendingAckAlertId, replyMessage);
      ackModal.classList.remove('active');
      pendingAckAlertId = null;
    });
  }

  // Clear all alerts
  const clearAlertsBtn = document.getElementById('btn-clear-alerts');
  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener('click', async () => {
      if (!confirm('Ești sigur că vrei să ștergi tot istoricul alertelor?')) return;
      await fetch('/api/alerts', { method: 'DELETE' });
      loadAlerts();
    });
  }

  // Save Settings
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        pin: document.getElementById('setting-pin').value,
        boyfriendPhone: document.getElementById('setting-phone').value,
        whatsappNumber: document.getElementById('setting-whatsapp').value,
        telegramBotToken: document.getElementById('setting-tg-token').value,
        telegramChatId: document.getElementById('setting-tg-chat').value
      };

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          alert('✅ Setările au fost salvate cu succes!');
        }
      } catch (e) {
        alert('Eroare la salvarea setărilor');
      }
    });
  }
}

// Load Alerts Feed
async function loadAlerts() {
  try {
    const res = await fetch('/api/alerts');
    if (res.status === 401) return showLoginView();
    const data = await res.json();
    currentAlerts = data.alerts || [];
    renderAlerts(currentAlerts);
  } catch (err) {
    console.error('Error loading alerts:', err);
  }
}

function renderAlerts(alerts) {
  const container = document.getElementById('alerts-container');
  const countBadge = document.getElementById('pending-count-badge');
  if (!container) return;

  const pendingCount = alerts.filter(a => a.status === 'pending').length;
  if (countBadge) {
    countBadge.textContent = pendingCount;
    countBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }

  if (alerts.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🌸</div>
        <p style="font-size: 1rem;">Nicio alertă înregistrată încă.</p>
        <p style="font-size: 0.85rem; margin-top: 0.3rem;">Când iubita ta apasă un buton, va apărea aici instant!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = alerts.map(alert => {
    const isPending = alert.status === 'pending';
    const typeEmojis = {
      emergency: '❤️',
      overthinking: '🥺',
      sad: '💔',
      hug: '🫂',
      miss: '❤️',
      sleep: '🌙',
      sick: '😔',
      talk: '💌'
    };
    const emoji = typeEmojis[alert.type] || '❤️';

    return `
      <div class="alert-card ${isPending ? 'pending' : 'acknowledged'}" id="card-${alert.id}">
        <div class="alert-card-header">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.4rem;">${emoji}</span>
            <div>
              <div class="alert-card-title">${escapeHtml(alert.title)}</div>
              <div class="alert-card-time">⏰ ${escapeHtml(alert.timestampFormatted)}</div>
            </div>
          </div>
          <span class="status-pill ${isPending ? 'pill-pending' : 'pill-ack'}">
            ${isPending ? '🔴 Necitită' : '🟢 Confirmată'}
          </span>
        </div>

        <div class="alert-card-message">
          ${escapeHtml(alert.message)}
        </div>

        ${alert.note ? `
          <div class="alert-card-note">
            <span style="font-weight: 600; color: var(--pink-pastel);">Mesaj de la ea:</span><br>
            „${escapeHtml(alert.note)}”
          </div>
        ` : ''}

        ${alert.status === 'acknowledged' ? `
          <div class="alert-reply-box">
            <span>❤️ Ai răspuns la <strong>${escapeHtml(alert.ackTimeFormatted || '')}</strong>:</span><br>
            „${escapeHtml(alert.replyMessage || 'Sunt aici!')}”
          </div>
        ` : `
          <div class="alert-card-actions">
            <button class="btn-ack-quick" onclick="openAckModal('${alert.id}')">
              ❤️ Am văzut, sunt aici!
            </button>
          </div>
        `}

        <div class="alert-card-footer">
          <button class="btn-delete-alert" onclick="deleteAlert('${alert.id}')" title="Șterge alertă">
            🗑️ Șterge
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Modal acknowledgment
window.openAckModal = function(alertId) {
  pendingAckAlertId = alertId;
  const modal = document.getElementById('ack-modal');
  document.getElementById('ack-custom-reply').value = '';
  modal.classList.add('active');
};

async function submitAcknowledgment(alertId, replyMessage) {
  try {
    const res = await fetch(`/api/alerts/${alertId}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyMessage })
    });
    const data = await res.json();
    if (data.success) {
      loadAlerts();
    }
  } catch (err) {
    alert('Eroare la trimiterea confirmării');
  }
}

window.deleteAlert = async function(alertId) {
  if (!confirm('Ștergi această alertă?')) return;
  try {
    const res = await fetch(`/api/alerts/${alertId}`, { method: 'DELETE' });
    if (res.ok) loadAlerts();
  } catch (e) {}
};

// Push Subscription Handler on iPhone
function initPushSubscriber() {
  const subscribeBtn = document.getElementById('btn-subscribe-push');
  const testPushBtn = document.getElementById('btn-test-push');
  const pushStatusText = document.getElementById('push-status-text');

  if (!subscribeBtn) return;

  const env = window.pushClient ? window.pushClient.getDeviceEnvironment() : {};

  // Check iOS requirements
  if (env.isIOS && !env.isStandalone) {
    if (pushStatusText) {
      pushStatusText.innerHTML = `
        <span style="color: #f59e0b;">⚠️ Atenție iPhone:</span> Pentru a primi notificări Push pe iOS, 
        trebuie să adaugi pagina pe ecranul principal folosind butonul <strong>Share ➔ Add to Home Screen</strong>.
      `;
    }
  }

  // Update button state if already subscribed
  if (window.pushClient) {
    window.pushClient.checkExistingSubscription().then(sub => {
      if (sub) {
        subscribeBtn.textContent = '✅ Notificări Push Active pe acest dispozitiv';
        subscribeBtn.style.background = '#059669';
        if (pushStatusText) {
          pushStatusText.textContent = 'Dispozitivul tău este conectat și va primi toate alertele push.';
        }
      }
    }).catch(() => {});
  }

  subscribeBtn.addEventListener('click', async () => {
    try {
      subscribeBtn.textContent = 'Se conectează...';
      const deviceName = prompt('Introdu un nume pentru acest iPhone / Dispozitiv:', 'iPhone-ul meu') || 'iPhone';
      await window.pushClient.subscribe('boyfriend_iphone', deviceName);
      subscribeBtn.textContent = '✅ Notificări Push Active!';
      subscribeBtn.style.background = '#059669';
      if (pushStatusText) {
        pushStatusText.textContent = 'Abonat cu succes! Fă un test mai jos.';
      }
      loadSubscriptions();
      alert('🎉 Felicitări! Acest iPhone a fost înregistrat cu succes pentru notificări push.');
    } catch (err) {
      subscribeBtn.textContent = '🔔 Activează Notificările Push';
      if (err.code === 'IOS_NOT_STANDALONE') {
        alert('📱 Pe iPhone, Apple impune instalarea pe ecranul principal (Safari -> Share -> Add to Home Screen) înainte de activarea notificărilor push!');
      } else if (err.code === 'PERMISSION_DENIED') {
        alert('⚠️ Permisiunea pentru notificări a fost blocată în browser. Te rugăm să o permiți din setările Safari.');
      } else {
        alert('Eroare activare push: ' + err.message);
      }
    }
  });

  if (testPushBtn) {
    testPushBtn.addEventListener('click', async () => {
      try {
        testPushBtn.textContent = 'Se trimite testul...';
        const res = await fetch('/api/push/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customMessage: '❤️ Test notificare push pe iPhone-ul tău!' })
        });
        const data = await res.json();
        testPushBtn.textContent = '🚀 Trimite Test Push';
        if (data.success) {
          alert('✅ Notificarea de test a fost trimisă către dispozitivele înregistrate!');
          loadLogs();
        } else {
          alert('Eroare la test: ' + (data.error || 'Necunoscut'));
        }
      } catch (err) {
        testPushBtn.textContent = '🚀 Trimite Test Push';
        alert('Eroare conexiune test push');
      }
    });
  }
}

// Subscriptions Table
async function loadSubscriptions() {
  const container = document.getElementById('subscriptions-list');
  if (!container) return;

  try {
    const res = await fetch('/api/subscriptions');
    const data = await res.json();
    const subs = data.subscriptions || [];

    if (subs.length === 0) {
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">
          Nu este înregistrat niciun dispozitiv iPhone momentan.<br>
          Apasă pe butonul de activare de mai sus de pe iPhone!
        </div>
      `;
      return;
    }

    container.innerHTML = subs.map(sub => `
      <div class="sub-item">
        <div style="flex: 1;">
          <div style="font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
            <span>📱 ${escapeHtml(sub.deviceName)}</span>
            <span style="font-size: 0.75rem; background: rgba(244,114,182,0.2); color: var(--pink-pastel); padding: 2px 8px; border-radius: 10px;">${escapeHtml(sub.role)}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 3px;">
            Endpoint: ${escapeHtml(sub.endpoint.substring(0, 40))}...
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            Adăugat: ${new Date(sub.createdAt).toLocaleString('ro-RO')} 
            ${sub.lastSuccess ? `• Ultimul push: ${new Date(sub.lastSuccess).toLocaleTimeString('ro-RO')}` : ''}
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn-sub-action" onclick="testSingleSub('${sub.id}')">Test</button>
          <button class="btn-sub-action btn-danger" onclick="deleteSub('${sub.id}')">Șterge</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading subscriptions:', err);
  }
}

window.testSingleSub = async function(id) {
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId: id })
    });
    const data = await res.json();
    if (data.success) {
      alert('Test trimis pe acest dispozitiv!');
    } else {
      alert('Eroare: ' + (data.error || 'Necunoscut'));
    }
  } catch (e) {
    alert('Eroare comunicare server');
  }
};

window.deleteSub = async function(id) {
  if (!confirm('Ștergi acest dispozitiv din lista de push?')) return;
  try {
    await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
    loadSubscriptions();
  } catch (e) {}
};

// Settings
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    const s = data.settings || {};

    if (document.getElementById('setting-pin')) document.getElementById('setting-pin').value = s.pin || 'inima123';
    if (document.getElementById('setting-phone')) document.getElementById('setting-phone').value = s.boyfriendPhone || '';
    if (document.getElementById('setting-whatsapp')) document.getElementById('setting-whatsapp').value = s.whatsappNumber || '';
    if (document.getElementById('setting-tg-token')) document.getElementById('setting-tg-token').value = s.telegramBotToken || '';
    if (document.getElementById('setting-tg-chat')) document.getElementById('setting-tg-chat').value = s.telegramChatId || '';
  } catch (err) {}
}

// Logs
async function loadLogs() {
  const container = document.getElementById('logs-container');
  if (!container) return;

  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    const logs = data.logs || [];

    if (logs.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); padding: 1rem;">Niciun log înregistrat.</div>';
      return;
    }

    container.innerHTML = logs.map(l => `
      <div class="log-row log-${l.level}">
        <span class="log-time">[${new Date(l.timestamp).toLocaleTimeString('ro-RO')}]</span>
        <span class="log-msg">${escapeHtml(l.message)}</span>
      </div>
    `).join('');
  } catch (err) {}
}

// Real-Time SSE
function initSSE() {
  if (!('EventSource' in window)) return;
  const es = new EventSource('/api/events?role=boyfriend');

  es.addEventListener('new_alert', (e) => {
    try {
      const alert = JSON.parse(e.data);
      playIncomingAlertSound();
      loadAlerts();
      loadLogs();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(alert.title, {
          body: alert.message + (alert.note ? `\n"${alert.note}"` : ''),
          icon: '/icons/icon-192.png'
        });
      }
    } catch (err) {}
  });

  es.addEventListener('alert_acknowledged', () => {
    loadAlerts();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
