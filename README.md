<p align="center">
  <img src="screenshot.png" alt="Nila Music Player" width="600"/>
</p>

<h1 align="center">🎵 Nila — Linux Music Player</h1>

<p align="center">
  <strong>A sleek, retro-inspired desktop music player for Linux — stream music directly from YouTube.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## ✨ Overview

**Nila** is a lightweight, Spotify-inspired desktop music player built with **Electron + React** for Linux. It streams music directly from YouTube using `yt-dlp` and `mpv`, wrapped in a beautiful dark-themed UI with retro orange accents and smooth animations.

No accounts. No ads. No subscriptions. Just music.

---

## 🎯 Features

- 🎬 **Intro Animation** — Animated splash screen with logo, equalizer bars, and loading effect
- 🔍 **YouTube Search** — Search and stream any song from YouTube instantly
- 🎶 **Multi-Genre Categories** — Browse curated categories: Malayalam, English, Hindi, Tamil, Telugu, Punjabi, Pop, K-Pop, Chill, Romantic, Marathi
- ❤️ **Liked Songs** — Save your favorite tracks locally for quick access
- 🎛️ **Floating Player** — A compact, always-on-top mini player with vinyl disc animation
- ▶️ **Queue System** — Automatic queue management with next/previous track support
- 🎨 **Retro Dark Theme** — Pure black background with `#eb5e28` orange accents and Space Mono typography
- ⏯️ **Reliable Play/Pause** — Process-level pause/resume using SIGSTOP/SIGCONT for rock-solid reliability
- 💾 **Persistent Favorites** — Your liked songs are saved across sessions
- 🌊 **Smooth Transitions** — Framer Motion powered view transitions and micro-animations

---

## 📸 Screenshots

### Main Window
<p align="center">
  <img src="screenshot.png" alt="Nila Main Window" width="700"/>
</p>

---

## 🚀 Installation

### Prerequisites

Make sure you have the following installed on your Linux system:

| Tool | Purpose | Install Command (Debian/Ubuntu) |
|---|---|---|
| **Node.js** (v18+) | Runtime | `sudo apt install nodejs npm` |
| **yt-dlp** | YouTube audio extraction | `sudo apt install yt-dlp` or `pip install yt-dlp` |
| **mpv** | Audio playback | `sudo apt install mpv` |

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Adarshh-bit/Nila-linux-music-player.git

# 2. Navigate to the project
cd Nila-linux-music-player

# 3. Install dependencies
npm install

# 4. Launch the app (starts Vite + Electron concurrently)
npm start
```

---

## 🎮 Usage

### Intro Screen
When you launch Nila, an animated intro plays with the NILA logo, glowing equalizer bars, and a "LOADING" effect before revealing the main interface.

### Home Screen
Browse through curated music categories. Click any song card to start streaming. Each card shows a play overlay on hover.

### Search
Navigate to the **Search** tab, type your query, and press **Enter**. Results appear as interactive cards in a responsive grid.

### Liked Songs
Click the ❤️ heart icon on the player bar to like/unlike a song. View all your liked songs in the **Liked Songs** tab.

### Floating Player
When a song starts playing, a compact floating player window opens with:
- Spinning vinyl disc animation
- Song info & progress bar
- Play/Pause, Next, Previous controls
- Always-on-top for multitasking

### Queue System
- Clicking a song in a category creates a queue from that category
- Use **Next/Previous** buttons to navigate through the queue
- Songs auto-advance when finished

---

## 🛠️ Tech Stack

| Technology | Role |
|---|---|
| **React 19** | UI framework |
| **Vite** | Build tool & dev server |
| **Electron** | Desktop app framework |
| **Framer Motion** | Animations & transitions |
| **Lucide React** | Icon library |
| **yt-dlp** | YouTube metadata & stream URL extraction |
| **mpv** | Audio playback engine |
| **Node.js** | Backend process management |

---

## 🏗️ Architecture

```
Nila-linux-music-player/
├── main.js                     # Electron main process — playback, IPC, windows
├── vite.config.js              # Vite build configuration
├── package.json                # Scripts & dependencies
├── src/
│   ├── renderer/               # React frontend
│   │   ├── index.html          # Entry HTML
│   │   ├── main.jsx            # React bootstrap
│   │   ├── App.jsx             # Root component (state, IPC, routing)
│   │   ├── components/
│   │   │   ├── Intro.jsx       # Animated splash screen
│   │   │   ├── Sidebar.jsx     # Navigation sidebar
│   │   │   ├── PlayerBar.jsx   # Bottom player controls
│   │   │   └── SongCard.jsx    # Reusable song card
│   │   ├── views/
│   │   │   ├── Home.jsx        # Category browsing
│   │   │   ├── Search.jsx      # YouTube search
│   │   │   └── Library.jsx     # Liked songs
│   │   └── styles/
│   │       └── global.css      # Design system & theme
│   └── floating/
│       └── playing.html        # Mini floating player
└── legacy_backup/              # Original vanilla JS files
```

### How It Works

```
┌────────────────┐     IPC      ┌──────────────┐
│  React App     │◄────────────►│   main.js    │
│  (Vite HMR)   │  (Electron)  │  (Main Proc) │
│  App.jsx       │              │              │
└────────────────┘              │  ┌─────────┐ │
                                │  │ yt-dlp  │ │  → Fetches stream URLs
┌────────────────┐     IPC      │  └─────────┘ │
│  Floating      │◄────────────►│  ┌─────────┐ │
│  Player (.html)│              │  │  mpv    │ │  → Plays audio
└────────────────┘              │  └─────────┘ │
                                └──────────────┘
```

1. **User** clicks a song in the React renderer
2. **App.jsx** sends IPC to the Electron main process
3. **yt-dlp** extracts the best audio stream URL
4. **mpv** spawns as a child process to play the stream
5. **Play state** is broadcast to both React app and floating player via IPC
6. **SIGSTOP/SIGCONT** handles reliable pause/resume on Linux

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Ideas for Contribution
- 🔊 Volume control slider
- 📋 Playlist management
- 🎵 Lyrics display
- 🌙 Light/dark mode toggle
- 📱 Responsive layout improvements
- 🔀 Shuffle & repeat modes

---

## 📄 License

This project is licensed under the **ISC License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ and 🎵 by <a href="https://github.com/Adarshh-bit">Adarsh</a>
</p>
