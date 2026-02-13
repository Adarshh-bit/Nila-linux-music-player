const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

let mainWin;
let floatingWin = null;
let player = null;
let currentSongData = null;
let isPaused = false;
let playerGeneration = 0;

// Detect if running in dev mode (Vite dev server)
const isDev = !app.isPackaged;

// ===========================
// DATA PERSISTENCE
// ===========================
const userDataPath = app.getPath("userData");
const favFilePath = path.join(userDataPath, "favorites.json");

function getFavorites() {
  try {
    if (!fs.existsSync(favFilePath)) return [];
    const data = fs.readFileSync(favFilePath, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading favorites:", e);
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    fs.writeFileSync(favFilePath, JSON.stringify(favorites, null, 2));
  } catch (e) {
    console.error("Error saving favorites:", e);
  }
}

// ===========================
// WINDOW MANAGEMENT
// ===========================
function createWindow() {
  mainWin = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Nila 2.0",
    backgroundColor: "#050505",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  if (isDev) {
    mainWin.loadURL("http://localhost:5173");
    // Uncomment to open DevTools in dev:
    // mainWin.webContents.openDevTools();
  } else {
    mainWin.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}

function createFloatingPlayer() {
  if (floatingWin) {
    floatingWin.focus();
    return;
  }

  floatingWin = new BrowserWindow({
    width: 380,
    height: 520,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    transparent: false,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  floatingWin.loadFile(path.join(__dirname, "src", "floating", "playing.html"));

  floatingWin.on("closed", () => {
    floatingWin = null;
  });

  floatingWin.webContents.on("did-finish-load", () => {
    if (currentSongData) {
      floatingWin.webContents.send("update-song", currentSongData);
      floatingWin.webContents.send("update-play-state", !isPaused);
    }
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  killPlayer();
  if (process.platform !== "darwin") app.quit();
});

// ===========================
// PLAYBACK ENGINE (FIXED)
// ===========================
function killPlayer() {
  if (player) {
    try {
      if (!player.killed) {
        player.kill("SIGTERM");
      }
    } catch (e) {
      console.error("Error killing player:", e);
    }
    player = null;
    isPaused = false;
  }
}

function broadcastPlayState(playing) {
  isPaused = !playing;
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send("update-play-state", playing);
  }
  if (floatingWin && !floatingWin.isDestroyed()) {
    floatingWin.webContents.send("update-play-state", playing);
  }
}

function broadcastSong(song) {
  currentSongData = song;
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send("update-song", song);
  }
  if (floatingWin && !floatingWin.isDestroyed()) {
    floatingWin.webContents.send("update-song", song);
  }
}

ipcMain.on("play-song", (event, songData) => {
  console.log("PLAY REQUEST:", songData && songData.title);
  killPlayer();
  isPaused = false;

  playerGeneration++;
  const thisGeneration = playerGeneration;

  let query = "";
  if (typeof songData === "string") {
    query = `ytsearch1:${songData}`;
  } else if (songData.url) {
    query = songData.url;
  } else if (songData.id) {
    query = `https://www.youtube.com/watch?v=${songData.id}`;
  } else {
    query = `ytsearch1:${songData.title} ${songData.artist}`;
  }

  broadcastSong(songData);
  createFloatingPlayer();

  // 1. Get stream URL via yt-dlp
  const ytdlp = spawn("yt-dlp", ["-f", "bestaudio", "-g", query]);

  ytdlp.stdout.on("data", (data) => {
    const streamUrl = data.toString().trim();
    if (!streamUrl) return;
    if (thisGeneration !== playerGeneration) return;

    console.log("STREAM URL FOUND, Spawning MPV...");

    // 2. Spawn MPV with stdin command mode (not terminal keypress mode)
    // --input-file=- tells MPV to read input commands from stdin
    player = spawn("mpv", [
      "--no-video",
      "--no-terminal",
      "--input-file=-",
      streamUrl,
    ], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    broadcastPlayState(true);

    player.on("close", (code) => {
      console.log(`Player ended with code ${code}`);
      if (thisGeneration !== playerGeneration) return;
      player = null;
      broadcastPlayState(false);
      if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send("song-finished");
      if (floatingWin && !floatingWin.isDestroyed()) floatingWin.webContents.send("song-finished");
    });

    player.stderr.on("data", (d) => console.error("MPV:", d.toString()));
    player.on("error", (err) => console.error("MPV Spawn Error:", err));
  });

  ytdlp.stderr.on("data", (d) => console.error("yt-dlp:", d.toString()));
});

// ===========================
// PLAY/PAUSE FIX
// ===========================
// Using MPV's stdin IPC: send the 'cycle pause' command via stdin pipe.
// This is MPV's proper terminal command for toggling pause state.
ipcMain.on("toggle-pause", () => {
  if (!player || player.killed) {
    console.log("Cannot pause: No active player.");
    return;
  }

  try {
    // Send MPV input command to toggle pause
    player.stdin.write("cycle pause\n");

    // Toggle our state tracking
    isPaused = !isPaused;
    broadcastPlayState(!isPaused);
    console.log(isPaused ? "⏸  Paused playback" : "▶  Resumed playback");
  } catch (e) {
    console.error("Pause/Resume error:", e);
  }
});

ipcMain.on("stop-song", () => {
  killPlayer();
  broadcastPlayState(false);
});

ipcMain.on("open-floating-player", () => {
  createFloatingPlayer();
});

ipcMain.on("close-floating-player", () => {
  if (floatingWin && !floatingWin.isDestroyed()) {
    floatingWin.close();
  }
});

ipcMain.on("play-next", () => {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send("remote-play-next");
  }
});

ipcMain.on("play-prev", () => {
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.webContents.send("remote-play-prev");
  }
});

// ===========================
// DATA FETCHING (LIVE)
// ===========================
function fetchYoutubeData(args, event, channelName) {
  const yt = spawn("yt-dlp", args);
  let buffer = "";

  yt.stdout.on("data", (data) => {
    buffer += data.toString();
  });

  yt.on("close", () => {
    try {
      const lines = buffer.trim().split("\n");
      const results = lines
        .map((line) => {
          try {
            const json = JSON.parse(line);
            return {
              id: json.id,
              title: json.title,
              artist: json.uploader || json.channel || "Unknown",
              duration: json.duration,
              thumbnail:
                json.thumbnail ||
                (json.thumbnails && json.thumbnails.length > 0
                  ? json.thumbnails[0].url
                  : ""),
              url:
                json.webpage_url ||
                `https://www.youtube.com/watch?v=${json.id}`,
            };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);

      event.sender.send(channelName, results);
    } catch (e) {
      console.error("Error parsing yt-dlp JSON:", e);
      event.sender.send(channelName, []);
    }
  });
}

ipcMain.on("search-youtube", (event, query) => {
  console.log("SEARCH:", query);
  fetchYoutubeData(
    ["ytsearch10:" + query, "--dump-json", "--no-playlist"],
    event,
    "search-results"
  );
});

ipcMain.on("fetch-category", (event, category) => {
  console.log("FETCH CATEGORY:", category);

  const queryMap = {
    Malayalam: "latest malayalam movie songs 2025 hits",
    English: "top english songs 2025 billboard hits",
    Hindi: "bollywood latest songs 2025 hits arijit",
    Tamil: "latest tamil movie songs 2025 hits anirudh",
    Telugu: "latest telugu songs 2025 tollywood hits",
    Punjabi: "latest punjabi songs 2025 ap dhillon diljit",
    Pop: "top pop songs 2025 global hits",
    "K-Pop": "kpop hits 2025 blackpink bts newjeans stray kids",
    Chill: "lofi hip hop chill beats to relax study",
    Romantic: "romantic love songs 2024 best ballads playlist",
    Marathi: "latest marathi songs 2025 hits ajay atul",
  };

  const query = queryMap[category] || category + " songs latest";

  fetchYoutubeData(
    [`ytsearch10:${query}`, "--dump-json", "--no-playlist"],
    event,
    `category-results-${category}`
  );
});

// ===========================
// FAVORITES HANDLERS
// ===========================
ipcMain.on("get-favorites", (event) => {
  event.returnValue = getFavorites();
});

ipcMain.on("toggle-favorite", (event, song) => {
  const favs = getFavorites();
  const index = favs.findIndex((f) => f.title === song.title);

  if (index >= 0) {
    favs.splice(index, 1);
  } else {
    favs.push(song);
  }

  saveFavorites(favs);
  event.returnValue = favs;
});
