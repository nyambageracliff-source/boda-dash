# Real Boda Rider KE — Standalone Offline PWA

This folder contains the complete, self-contained, single-file edition of **Real Boda Rider KE: The Streets of Kenya Boda Boda Simulator**.

It is fully optimized to run completely offline, with full PWA (Progressive Web App) support.

## 📁 What's Included

1. **`index.html`**: The entire game in a single file! Includes React, Tailwind CSS styling, a custom Web Audio Synthesizer, procedural 2D Canvas racing logic, high-score and upgrade persistence (`localStorage`), and touch/tilt/keyboard steering.
2. **`sw.js`**: The Service Worker that enables offline loading and PWA installation on mobile and desktop browsers.

---

## 🚀 How to Run Locally

You don't need any server to play! 
1. Simply double-click **`index.html`** to open it in any web browser (Chrome, Safari, Edge, Firefox).
2. To enable PWA installation and offline caching on your device, host it on a local server or a free secure hosting provider.

---

## 🌐 How to Host on the Web (Free & Fast)

You can publish this game online in seconds:

### Option A: GitHub Pages (Recommended)
1. Create a new repository on GitHub.
2. Upload both `index.html` and `sw.js` into the repository.
3. Go to **Settings > Pages**, choose the branch (e.g., `main`), and click **Save**.
4. GitHub will give you a secure `https://` link. Open it on your phone, click **Add to Home Screen**, and play it as an app!

### Option B: Netlify / Vercel
1. Simply drag-and-drop this `/standalone` folder onto [Netlify Drop](https://app.netlify.com/drop) or Vercel.
2. It will instantly deploy and provide an `https://` link.

---

## 🎮 Game Controls
- 📱 **On-Screen Buttons**: Best for landscape mobile play.
- 📱 **Phone Tilt (Gyro)**: Steer your Boda Boda by tilting your phone!
- ⌨️ **Keyboard**: Use `A` / `D` or `Left Arrow` / `Right Arrow` to steer. Use `W` or `Up Arrow` for gas, and `S` or `Down Arrow` to brake.
