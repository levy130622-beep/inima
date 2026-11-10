# ❤️ Pentru inima mea - Aplicație Romantice & Alertare Instant

Aplicație web completă, romantică, privată și dedicată persoanei iubite. Permite iubitei tale să te alerteze instant când are momente de overthinking, tristețe, singurătate sau când are nevoie de tine la orice oră din noapte.

---

## 🌟 Funcționalități Principale

### 1. Pagina Principală (Pentru Ea)
- **Mesajul dedicat din suflet:**
  > *„Iubirea mea, vreau să știi că nu trebuie să treci singură prin momentele grele... Dacă ai nevoie de mine, chiar și la 3 dimineața, apasă butonul. Vreau să fiu acolo pentru tine. Te iubesc și vreau să avem grijă unul de celălalt. ❤️”*
- **Butonul Central Mare cu Pulsare:** `❤️ AM NEVOIE DE TINE`
  - Protecție împotriva atingerilor accidentale printr-o fereastră discretă de confirmare.
  - Efect vizual de confetti cu inimioare și explozie de dragoste.
  - Chime sonor cald și reconfortant (sintetizat prin Web Audio API, fără fișiere externe).
  - Feedback haptic (vibrație pe dispozitive compatibile).
  - Trimitere instantă a alertei către iPhone-ul tău.
- **Butoane Rapide cu tematică:**
  - 🥺 *Am overthinking.*
  - 💔 *Sunt tristă.*
  - 🫂 *Am nevoie de o îmbrățișare.*
  - ❤️ *Mi-e dor de tine.*
  - 🌙 *Nu pot să dorm.*
  - 😔 *Nu mă simt bine.*
  - 💌 *Vreau să vorbesc cu tine.*
- **Mesaj opțional:** Posibilitatea de a-ți scrie câteva rânduri suplimentare dacă dorește.
- **Card de Confirmare Live în Timp Real (SSE):**
  - Când apeși pe butonul de confirmare din panoul tău, ecranul ei se actualizează **LIVE**, redând un sunet dulce și afișând:
  > *„❤️ Iubitul tău a văzut alerta la [ora]! Mesaj de la el: «Sunt aici, iubirea mea! ❤️»”*
- **Exercițiu de Respirație Ghidat (4-7-8):** Sferă luminoasă pulsantă pentru calmarea anxietății și crizelor de overthinking.
- **Răvașe de Dragoste & Liniștire:** Buton interactiv care oferă gânduri sincere și alinare când se simte nesigură.

---

### 2. Sistemul de Alertare pentru iPhone (Apple Web Push)
- Implementare completă conform standardelor **Apple Web Push (iOS 16.4+)**:
  - Service Worker cu Push API (`sw.js`).
  - Chei criptografice VAPID generate automat și securizate.
  - Afișare pe ecranul blocat (Lock Screen), în Notification Center și sub formă de bannere persistente.
  - Badge pentru notificări necitite pe pictograma aplicației.
  - Buton direct de acțiune pe notificare: **„❤️ Am văzut, sunt aici!”** (îi poți răspunde direct de pe ecranul blocat al iPhone-ului!).
  - Notificări vizibile chiar dacă aplicația nu este deschisă.
  - Reîncercare automată în caz de erori temporare de rețea.
- **Canal Suplimentar Opțional:** Integrare cu **Telegram Bot** pentru siguranță de 100% ca iPhone-ul să sune chiar și dacă Apple Web Push este temporizat de economizorul de baterie.

---

### 3. Panoul Privat de Administrare (`/dashboard.html`)
- Protejat prin cod PIN securizat (implicit: `inima123`, configurabil din panou).
- **Alerte în timp real:**
  - Alertă sonoră automată când primești un semnal nou.
  - Tipul alertei, data și ora exactă (fus orar România).
  - Mesajul ei personalizat.
  - Buton de confirmare imediată: **„❤️ Am văzut, sunt aici!”** cu răspunsuri predefinite sau mesaj custom.
- **Gestionare Dispozitive:**
  - Listă cu toate dispozitivele iPhone înregistrate.
  - Buton de testare a notificărilor push pe iPhone.
  - Monitorizare stare abonamente și ștergere dispozitive vechi.
- **Jurnal de sistem & erori:** Istoric complet al trimiterilor push.

---

## 🚀 Pornire Rapidă Locală

1. Instalează dependențele (deja instalate în acest proiect):
   ```bash
   npm install
   ```

2. Pornește serverul:
   ```bash
   npm start
   ```

3. Deschide în browser:
   - Pagina ei: [http://localhost:3000](http://localhost:3000)
   - Panoul tău: [http://localhost:3000/dashboard.html](http://localhost:3000/dashboard.html) (PIN: `inima123`)
   - Ghid configurare iPhone: [http://localhost:3000/guide.html](http://localhost:3000/guide.html)

---

## 📱 Cum pui aplicația pe iPhone-ul tău și al ei (HTTPS)

Apple impune o conexiune securizată **HTTPS** pentru notificările push pe iPhone (cu excepția testelor locale).

### Opțiunea 1: Gratuit prin Cloudflare Tunnel (Fără configurare de router)
Dacă rulezi serverul pe laptop/PC și vrei un link HTTPS public gratuit imediat:
```bash
npx cloudflared tunnel --url http://localhost:3000
```
Vei primi un link HTTPS de forma `https://nume-aleator.trycloudflare.com` pe care îl trimiteți amândoi pe iPhone.

### Opțiunea 2: Deploy gratuit în Cloud (Recomandat pentru disponibilitate 24/7)
Poți urca codul pe un cont gratuit de:
- **Render.com** (Web Service -> `npm start`)
- **Railway.app**
- **Fly.io**

Ambele oferă HTTPS gratuit și funcționare non-stop la 3 dimineața.

---

## 📋 Ce trebuie să faci pe iPhone-ul tău:

1. Deschide link-ul în **Safari**.
2. Apasă butonul **Share** (pătratul cu săgeată în sus ⬆️) și selectează **„Adaugă pe ecranul principal” (Add to Home Screen)**.
3. Deschide aplicația de pe ecranul principal, intră în **Panou Admin (🔒)** (PIN: `inima123`).
4. Apasă butonul **„🔔 Activează Notificările Push pe acest iPhone”** și alege **Permite**.
5. În Configurări iPhone ➔ Notificări ➔ Inima Mea:
   - Asigură-te că sunt bifate *Ecran blocat*, *Bannere* și *Sunete*.
   - Setează stilul bannerului pe *Permanent*.
   - În modul Focus / Somn, adaugă aplicația ca excepție pentru a te trezi dacă apasă la 3 dimineața.

---

*Creat cu dragoste infinită pentru inima ta. ❤️*
