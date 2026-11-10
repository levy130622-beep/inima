// push-client.js - Client-side push registration helper for iPhone & Web
class PushClient {
  constructor() {
    this.swRegistration = null;
    this.isSubscribed = false;
    this.vapidPublicKey = null;
  }

  // Convert base64 VAPID key to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Detect iOS and Standalone mode
  getDeviceEnvironment() {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;

    return {
      isIOS,
      isStandalone,
      hasServiceWorker,
      hasPushManager,
      hasNotification,
      supportsWebPush: hasServiceWorker && hasPushManager && hasNotification,
      // On iOS, Web Push is only supported if added to Home Screen (iOS 16.4+)
      canSubscribeIOS: isIOS ? (isStandalone && hasPushManager) : hasPushManager
    };
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Browserul tău nu suportă Service Workers.');
    }
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('✅ ServiceWorker înregistrat cu succes!');
      return this.swRegistration;
    } catch (err) {
      console.error('Eroare înregistrare Service Worker:', err);
      throw err;
    }
  }

  async fetchPublicKey() {
    if (this.vapidPublicKey) return this.vapidPublicKey;
    const res = await fetch('/api/push/public-key');
    if (!res.ok) throw new Error('Nu s-a putut obține cheia publică VAPID');
    const data = await res.json();
    this.vapidPublicKey = data.publicKey;
    return this.vapidPublicKey;
  }

  async checkExistingSubscription() {
    if (!this.swRegistration) {
      await this.registerServiceWorker();
    }
    const subscription = await this.swRegistration.pushManager.getSubscription();
    this.isSubscribed = !(subscription === null);
    return subscription;
  }

  async subscribe(role = 'boyfriend_iphone', customDeviceName = '') {
    const env = this.getDeviceEnvironment();

    if (env.isIOS && !env.isStandalone) {
      const err = new Error('Pe iPhone, notificările push funcționează doar după ce adaugi aplicația pe ecranul principal (Add to Home Screen).');
      err.code = 'IOS_NOT_STANDALONE';
      throw err;
    }

    if (!('Notification' in window)) {
      throw new Error('Notificările nu sunt suportate pe acest browser.');
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      const err = new Error('Permisiunea pentru notificări a fost refuzată.');
      err.code = 'PERMISSION_DENIED';
      throw err;
    }

    if (!this.swRegistration) {
      await this.registerServiceWorker();
    }

    // Get VAPID public key
    const publicKey = await this.fetchPublicKey();
    const applicationServerKey = this.urlBase64ToUint8Array(publicKey);

    // Subscribe with pushManager
    let subscription = await this.swRegistration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
    }

    // Device identification
    let deviceName = customDeviceName;
    if (!deviceName) {
      if (env.isIOS) {
        deviceName = 'iPhone-ul tău';
      } else if (/Android/.test(navigator.userAgent)) {
        deviceName = 'Telefon Android';
      } else if (/Macintosh/.test(navigator.userAgent)) {
        deviceName = 'MacBook';
      } else if (/Windows/.test(navigator.userAgent)) {
        deviceName = 'PC Windows';
      } else {
        deviceName = 'Dispozitiv Web';
      }
    }

    // Send subscription to server
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        role: role,
        deviceName: deviceName
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Eroare la salvarea abonamentului pe server');
    }

    this.isSubscribed = true;
    return subscription;
  }

  async unsubscribe() {
    if (!this.swRegistration) return;
    const subscription = await this.swRegistration.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      await subscription.unsubscribe();
      this.isSubscribed = false;
    }
  }
}

window.pushClient = new PushClient();
