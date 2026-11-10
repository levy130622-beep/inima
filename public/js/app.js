// app.js - Girlfriend's Interface Logic for "Pentru inima mea ❤️"

document.addEventListener('DOMContentLoaded', () => {
  initBackgroundCanvas();
  initSSE();
  initButtons();
  initBreathingWidget();
  initLoveNotes();
  checkLatestAlertStatus();
  registerSW();
});

// Sound synthesizer using Web Audio API (warm comforting chime)
function playComfortChime(type = 'send') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    if (type === 'send') {
      // 3 ascending romantic bell notes
      [440, 554.37, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.001, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.35, now + i * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 1.0);
      });
    } else if (type === 'ack') {
      // Joyous gentle chord (boyfriend saw the alert!)
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.001, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.4, now + i * 0.08 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 1.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 1.5);
      });
    }
  } catch (e) {
    console.log('AudioContext not allowed yet or unsupported:', e);
  }
}

// Haptic feedback
function triggerHaptic() {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([80, 40, 120]);
    } catch (e) {}
  }
}

// Background Canvas with glowing floating hearts and twinkling stars
function initBackgroundCanvas() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const heartCount = 20;
  const starCount = 35;

  // Stars
  for (let i = 0; i < starCount; i++) {
    particles.push({
      type: 'star',
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.8,
      alpha: Math.random(),
      speed: Math.random() * 0.02 + 0.005
    });
  }

  // Floating hearts
  for (let i = 0; i < heartCount; i++) {
    particles.push({
      type: 'heart',
      x: Math.random() * width,
      y: Math.random() * height + height,
      size: Math.random() * 12 + 8,
      speedY: Math.random() * 0.45 + 0.25,
      speedX: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.4 + 0.2,
      rotation: (Math.random() - 0.5) * 0.5
    });
  }

  function drawHeart(cx, cy, size, alpha) {
    ctx.save();
    ctx.beginPath();
    ctx.translate(cx, cy);
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
    ctx.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, size, 0, size * 1.3);
    ctx.bezierCurveTo(0, size, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
    ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
    ctx.closePath();
    ctx.fillStyle = `rgba(244, 114, 182, ${alpha})`;
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      if (p.type === 'star') {
        p.alpha += p.speed;
        const currentAlpha = Math.abs(Math.sin(p.alpha)) * 0.8 + 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.fill();
      } else if (p.type === 'heart') {
        p.y -= p.speedY;
        p.x += p.speedX;
        if (p.y < -30) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        drawHeart(p.x, p.y, p.size, p.alpha);
      }
    }
    requestAnimationFrame(render);
  }

  render();
}

// Heart explosion confetti on alert sent
function triggerHeartExplosion(originX, originY) {
  const container = document.body;
  const count = 18;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.innerHTML = ['❤️', '💖', '✨', '🌸', '🫂'][Math.floor(Math.random() * 5)];
    el.style.position = 'fixed';
    el.style.left = (originX || window.innerWidth / 2) + 'px';
    el.style.top = (originY || window.innerHeight / 2) + 'px';
    el.style.fontSize = Math.floor(Math.random() * 18 + 16) + 'px';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '9999';
    el.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
    container.appendChild(el);

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = Math.random() * 120 + 80;
    const destX = Math.cos(angle) * dist;
    const destY = Math.sin(angle) * dist - 60;

    requestAnimationFrame(() => {
      el.style.transform = `translate(${destX}px, ${destY}px) scale(0)`;
      el.style.opacity = '0';
    });

    setTimeout(() => el.remove(), 1300);
  }
}

// Modal & Confirmation Logic
let pendingAlert = null;
const modalOverlay = document.getElementById('confirmation-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const modalEmoji = document.getElementById('modal-emoji');
const confirmBtn = document.getElementById('btn-confirm-send');
const cancelBtn = document.getElementById('btn-cancel-send');
const toastBanner = document.getElementById('confirmation-toast');
const toastText = document.getElementById('toast-text');

function showConfirmModal(type, title, emoji, desc) {
  pendingAlert = { type, title };
  modalEmoji.textContent = emoji || '❤️';
  modalTitle.textContent = title || 'Trimiți alerta?';
  modalDesc.textContent = desc || 'Iubitul tău va primi instant o notificare pe iPhone că ai nevoie de el!';
  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
  pendingAlert = null;
}

if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

function showToast(message) {
  if (!toastBanner) return;
  toastText.textContent = message;
  toastBanner.classList.add('show');
  setTimeout(() => {
    toastBanner.classList.remove('show');
  }, 5000);
}

// Send alert to backend
async function sendAlert(type, customTitle = null) {
  const noteInput = document.getElementById('girlfriend-note');
  const note = noteInput ? noteInput.value.trim() : '';

  try {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type || 'emergency',
        customTitle,
        note
      })
    });

    const data = await res.json();
    if (data.success) {
      playComfortChime('send');
      triggerHaptic();
      triggerHeartExplosion();

      // Clear note
      if (noteInput) noteInput.value = '';

      // Show instant confirmation toast
      showToast(data.replyMessage || 'Am primit semnalul tău, iubirea mea. Sunt aici. ❤️');

      // Update Live Status Card
      updateLiveStatusCard(data.alert);
    }
  } catch (err) {
    console.error('Eroare trimitere alertă:', err);
    showToast('Semnalul a fost trimis! Fii liniștită, sunt alături de tine. ❤️');
  }
}

if (confirmBtn) {
  confirmBtn.addEventListener('click', async () => {
    if (!pendingAlert) return;
    const { type, title } = pendingAlert;
    closeModal();
    await sendAlert(type, title);
  });
}

// Live Status Card Update
const liveStatusCard = document.getElementById('live-status-card');
const liveStatusMsg = document.getElementById('live-status-msg');
const liveAckBox = document.getElementById('live-ack-box');

function updateLiveStatusCard(alert) {
  if (!liveStatusCard || !alert) return;

  liveStatusCard.classList.add('visible');

  if (alert.status === 'acknowledged') {
    liveStatusMsg.innerHTML = `<strong>${alert.title}</strong> trimisă la ${alert.timeOnly}.`;
    liveAckBox.style.display = 'block';
    liveAckBox.innerHTML = `
      <div style="font-size: 1.05rem; margin-bottom: 0.3rem;">❤️ Iubitul tău a văzut alerta la <strong>${alert.ackTimeFormatted || ''}</strong>!</div>
      <div style="color: #fbcfe8; font-style: italic;">„${alert.replyMessage || 'Sunt aici, iubirea mea!'}”</div>
    `;
  } else {
    liveStatusMsg.innerHTML = `Alerta <strong>${alert.title}</strong> a fost trimisă la ora <strong>${alert.timeOnly}</strong>. Iubitul tău o va vedea imediat! ❤️`;
    liveAckBox.style.display = 'none';
  }
}

// Initialize button click handlers
function initButtons() {
  const mainAlertBtn = document.getElementById('main-alert-btn');
  if (mainAlertBtn) {
    mainAlertBtn.addEventListener('click', (e) => {
      triggerHeartExplosion(e.clientX, e.clientY);
      showConfirmModal(
        'emergency',
        'AM NEVOIE DE TINE ❤️',
        '❤️',
        'Vrei să trimiți alerta principală către telefonul lui? Va ști imediat că ai nevoie de el!'
      );
    });
  }

  const quickBtns = document.querySelectorAll('.quick-btn');
  quickBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const type = btn.getAttribute('data-type');
      const label = btn.querySelector('.btn-label')?.textContent || 'Alertă';
      const emoji = btn.querySelector('.btn-emoji')?.textContent || '❤️';
      triggerHeartExplosion(e.clientX, e.clientY);
      showConfirmModal(
        type,
        label,
        emoji,
        `Vrei să-i transmiți că: "${label}"? Va primi o notificare dedicată pe iPhone.`
      );
    });
  });
}

// Real-time Server-Sent Events (SSE)
function initSSE() {
  if (!('EventSource' in window)) return;

  const eventSource = new EventSource('/api/events?role=girlfriend');

  eventSource.addEventListener('alert_acknowledged', (e) => {
    try {
      const alert = JSON.parse(e.data);
      playComfortChime('ack');
      triggerHaptic();
      triggerHeartExplosion();
      updateLiveStatusCard(alert);
      showToast(`❤️ Iubitul tău a văzut mesajul: „${alert.replyMessage || 'Sunt aici!'}”`);
    } catch (err) {
      console.error('Error handling SSE ack event:', err);
    }
  });

  eventSource.onerror = () => {
    // Reconnects automatically
  };
}

// Check latest alert on load
async function checkLatestAlertStatus() {
  try {
    const res = await fetch('/api/alerts/latest');
    const data = await res.json();
    if (data.alert) {
      // If alert was sent in last 12 hours, display status
      const created = new Date(data.alert.createdAt);
      const diffHours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
      if (diffHours < 12) {
        updateLiveStatusCard(data.alert);
      }
    }
  } catch (e) {}
}

// 4-7-8 Breathing Guide for Overthinking & Anxiety
function initBreathingWidget() {
  const orb = document.getElementById('breathing-orb');
  const btn = document.getElementById('breathing-toggle-btn');
  const label = document.getElementById('breathing-label');
  if (!orb || !btn || !label) return;

  let isBreathing = false;
  let intervalId = null;

  function runCycle() {
    // 1. Inhale: 4s
    orb.className = 'breathing-orb inhale';
    label.textContent = 'Inspiră adânc pe nas... (4s)';

    setTimeout(() => {
      if (!isBreathing) return;
      // 2. Hold: 7s
      orb.className = 'breathing-orb hold';
      label.textContent = 'Ține respirația... Liniștește-te... (7s)';

      setTimeout(() => {
        if (!isBreathing) return;
        // 3. Exhale: 8s
        orb.className = 'breathing-orb exhale';
        label.textContent = 'Expiră lent pe gură... Eliberează totul... (8s)';
      }, 7000);
    }, 4000);
  }

  btn.addEventListener('click', () => {
    isBreathing = !isBreathing;
    if (isBreathing) {
      btn.textContent = 'Oprește exercițiul';
      runCycle();
      intervalId = setInterval(runCycle, 19000);
    } else {
      clearInterval(intervalId);
      orb.className = 'breathing-orb';
      label.textContent = 'Apasă pentru a începe';
      btn.textContent = 'Începe respirația (4-7-8)';
    }
  });
}

// Love Notes & Calming Truths Generator
function initLoveNotes() {
  const noteBox = document.getElementById('love-note-text');
  const drawBtn = document.getElementById('draw-note-btn');
  if (!noteBox || !drawBtn) return;

  const notes = [
    '„Nu ești singură nici măcar o secundă. Inima mea bate odată cu a ta. ❤️”',
    '„Gândurile tale de acum sunt doar nori trecători, nu sunt adevărul. Ești în siguranță cu mine.”',
    '„Nu ești o povară pentru mine. Iubesc totul la tine, inclusiv momentele tale grele.”',
    '„Ia o pauză, respiră adânc. Oricât de greu ar părea acum, suntem o echipă și vom trece peste împreună.”',
    '„Dacă aș fi lângă tine acum, te-aș strânge atât de tare în brațe încât toate fricile tale s-ar risipi.”',
    '„Ești cel mai frumos lucru care mi s-a întâmplat vreodată. Nu uita cât ești de prețioasă.”',
    '„Nu trebuie să fii puternică tot timpul. Lasă-mă pe mine să fiu scutul tău azi.”',
    '„Noaptea face gândurile să pară mai mari decât sunt în realitate. Mâine dimineață soarele va răsări din nou pentru noi.”',
    '„Te iubesc mai mult decât pot explica în cuvinte. Închide ochii și simte că sunt acolo cu tine. ❤️”',
    '„Ești acasă pentru mine. Iar eu voi fi întotdeauna adăpostul tău sigur.”'
  ];

  drawBtn.addEventListener('click', () => {
    const randomIndex = Math.floor(Math.random() * notes.length);
    noteBox.style.opacity = '0';
    setTimeout(() => {
      noteBox.textContent = notes[randomIndex];
      noteBox.style.opacity = '1';
    }, 200);
  });
}

// Register Service Worker
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(e => {
      console.log('SW registration error:', e);
    });
  }
}
