const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

let mainWin;
let floatingWin = null;
let player = null;
let currentSongData = null;
let isPaused = false;
let playerGeneration = 0; // Track player instances to avoid race conditions

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
    backgroundColor: "#121212",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });
  mainWin.loadFile("index.html");
  // mainWin.webContents.openDevTools();
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

  floatingWin.loadFile("playing.html");

  floatingWin.on("closed", () => {
    floatingWin = null;
  });

  // Once ready, send current song data
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
// PLAYBACK ENGINE
// ===========================
function killPlayer() {
  if (player) {
    try {
      // If it was paused with SIGSTOP, resume first so SIGKILL works
      if (isPaused) {
        try { player.kill("SIGCONT"); } catch (e) { /* ignore */ }
      }
      if (!player.killed) {
        player.kill("SIGKILL");
      }
    } catch (e) {
      console.error("Error killing player:", e);
    }
    player = null;
  }
}

// Broadcast play state to all windows
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

  // Increment generation to invalidate any stale close events
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

  // Open floating player
  createFloatingPlayer();

  // 1. Get Stream URL
  const ytdlp = spawn("yt-dlp", ["-f", "bestaudio", "-g", query]);

  ytdlp.stdout.on("data", (data) => {
    const streamUrl = data.toString().trim();
    if (!streamUrl) return;

    // If a newer play request happened, ignore this stale one
    if (thisGeneration !== playerGeneration) return;

    console.log("STREAM URL FOUND, Spawning MPV...");

    // 2. Spawn MPV
    // FIX: Removed --input-file=- as it caused crashes on some systems
    player = spawn("mpv", [
      "--no-video",
      // "--no-terminal", // Keep terminal output for debugging if needed, or remove to silence
      streamUrl,
    ], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Now that mpv is actually running, broadcast playing state
    broadcastPlayState(true);

    player.on("close", (code) => {
      console.log(`Player ended with code ${code}`);
      // Only handle if this is still the active generation
      if (thisGeneration !== playerGeneration) return;
      player = null;
      broadcastPlayState(false);
      if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send("song-finished");
      if (floatingWin && !floatingWin.isDestroyed()) floatingWin.webContents.send("song-finished");
    });

    player.stderr.on("data", (data) => console.error("MPV Error:", data.toString()));
    player.on("error", (err) => console.error("MPV Spawn Error:", err));
  });

  ytdlp.stderr.on("data", (data) => console.error("yt-dlp:", data.toString()));
});

ipcMain.on("toggle-pause", () => {
  if (player && !player.killed) {
    try {
      // Send 'cycle pause' command to mpv via stdin
      if (player.stdin && !player.stdin.destroyed) {
        player.stdin.write("cycle pause\n");
      }
      isPaused = !isPaused;
      broadcastPlayState(!isPaused);
      console.log("Pause toggled. isPaused:", isPaused);
    } catch (e) {
      console.error("Pause error:", e);
    }
  } else {
    console.log("Cannot pause: No active player.");
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

// Relay prev/next from floating player to main window (queue lives there)
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

  // Each category has a very specific search query
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

  // Send results on a UNIQUE channel per category
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
