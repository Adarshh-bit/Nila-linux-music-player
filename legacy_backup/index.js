const { ipcRenderer } = require("electron");

// ===========================
// STATE
// ===========================
let currentSong = null;
let isPlaying = false;
let timeInterval = null;
let currentSeconds = 0;
let favorites = [];

// Queue system
let currentQueue = [];
let currentQueueIndex = -1;

// Store fetched data so we can build queues from it
const categoryData = {}; // { "Malayalam": [song, ...], ... }
let searchResultsData = [];

// ===========================
// INITIALIZATION
// ===========================
function init() {
    loadFavorites();
    loadHomeData();
    setupEventListeners();

    // Listen for synced state from main process
    ipcRenderer.on("update-song", (event, song) => {
        currentSong = song;
        updatePlayerUI();
    });

    ipcRenderer.on("update-play-state", (event, playing) => {
        if (playing) {
            setIsPlaying(true);
            startTimer();
        } else {
            setIsPlaying(false);
            stopTimer();
        }
    });

    ipcRenderer.on("song-finished", () => {
        setIsPlaying(false);
        stopTimer();
        resetTimer();
        // Auto-play next song in queue
        playNext();
    });

    // Handle prev/next relayed from the floating player
    ipcRenderer.on("remote-play-next", () => {
        playNext();
    });

    ipcRenderer.on("remote-play-prev", () => {
        playPrev();
    });
}

function loadFavorites() {
    try {
        favorites = ipcRenderer.sendSync("get-favorites");
    } catch (e) {
        console.error("Failed to load favorites", e);
    }
}

// ===========================
// NAVIGATION
// ===========================
function switchView(viewName) {
    document.getElementById("view-home").style.display = "none";
    document.getElementById("view-search").style.display = "none";
    document.getElementById("view-library").style.display = "none";

    document
        .querySelectorAll(".nav-item")
        .forEach((el) => el.classList.remove("active"));

    if (viewName === "home") {
        document.getElementById("view-home").style.display = "block";
        document.getElementById("navHome").classList.add("active");
    } else if (viewName === "search") {
        document.getElementById("view-search").style.display = "block";
        document.getElementById("navSearch").classList.add("active");
        document.getElementById("searchInput").focus();
    } else if (viewName === "library") {
        document.getElementById("view-library").style.display = "block";
        document.getElementById("navLibrary").classList.add("active");
        renderLibrary();
    }
}

// ===========================
// DATA FETCHING & RENDERING
// ===========================
function loadHomeData() {
    const categories = [
        "Malayalam",
        "English",
        "Hindi",
        "Tamil",
        "Telugu",
        "Punjabi",
        "Pop",
        "K-Pop",
        "Chill",
        "Romantic",
        "Marathi",
    ];

    const homeView = document.getElementById("view-home");
    homeView.innerHTML = "";

    categories.forEach((cat) => {
        const safeCatId = cat.replace(/\s+/g, "").replace(/-/g, "");
        const section = document.createElement("div");
        section.className = "category-section";
        section.innerHTML = `
      <h2 class="category-title">${cat}</h2>
      <div class="card-row" id="row-${safeCatId}">
        <div class="loading-placeholder">Loading...</div>
      </div>
    `;
        homeView.appendChild(section);

        // Fetch data
        ipcRenderer.send("fetch-category", cat);

        // Listen on UNIQUE channel per category
        ipcRenderer.once(`category-results-${cat}`, (event, results) => {
            categoryData[cat] = results || [];
            renderCardRow(`row-${safeCatId}`, results, cat);
        });
    });
}

function renderCardRow(rowId, songs, queueSource) {
    const container = document.getElementById(rowId);
    if (!container) return;

    if (!songs || songs.length === 0) {
        container.innerHTML = `<div style="color: grey; padding: 20px;">No songs found.</div>`;
        return;
    }

    container.innerHTML = songs
        .map((song, index) => createCardHTML(song, index, queueSource))
        .join("");
}

function renderLibrary() {
    const container = document.getElementById("likedSongsList");
    loadFavorites();

    if (favorites.length === 0) {
        container.innerHTML = `<div style="color: grey; grid-column: 1/-1;">No liked songs yet. Go heart some!</div>`;
        return;
    }

    container.innerHTML = favorites
        .map((song, index) => createCardHTML(song, index, "__favorites__"))
        .join("");
}

function createCardHTML(song, index, queueSource) {
    const songJson = JSON.stringify(song).replace(/"/g, "&quot;");
    const sourceStr = (queueSource || "").replace(/"/g, "&quot;");
    return `
    <div class="song-card" onclick='playSongFromQueue(${songJson}, ${index}, "${sourceStr}")'>
      <div class="card-img" style="background-image: url('${song.thumbnail}')"></div>
      <div class="card-title">${song.title}</div>
      <div class="card-artist">${song.artist}</div>
    </div>
  `;
}

// ===========================
// QUEUE HELPERS
// ===========================
function getQueueForSource(source) {
    if (source === "__search__") return searchResultsData;
    if (source === "__favorites__") {
        loadFavorites();
        return favorites;
    }
    if (categoryData[source]) return categoryData[source];
    return [];
}

// ===========================
// PLAYBACK LOGIC
// ===========================
function playSongFromQueue(song, index, queueSource) {
    // Set queue context
    currentQueue = getQueueForSource(queueSource);
    currentQueueIndex = index;

    // Play the song
    currentSong = song;
    updatePlayerUI();
    setIsPlaying(true);
    resetTimer();
    startTimer();
    ipcRenderer.send("play-song", song);
}

// Legacy function for any direct calls
function playSongData(song) {
    currentQueue = [song];
    currentQueueIndex = 0;
    currentSong = song;
    updatePlayerUI();
    setIsPlaying(true);
    resetTimer();
    startTimer();
    ipcRenderer.send("play-song", song);
}

function playNext() {
    if (currentQueue.length === 0) return;
    const nextIndex = currentQueueIndex + 1;
    if (nextIndex >= currentQueue.length) {
        // Reached end of queue
        console.log("Queue finished.");
        return;
    }
    currentQueueIndex = nextIndex;
    const nextSong = currentQueue[currentQueueIndex];
    currentSong = nextSong;
    updatePlayerUI();
    setIsPlaying(true);
    resetTimer();
    startTimer();
    ipcRenderer.send("play-song", nextSong);
}

function playPrev() {
    if (currentQueue.length === 0) return;

    // If we are more than 3 seconds in, restart current song
    if (currentSeconds > 3) {
        resetTimer();
        startTimer();
        ipcRenderer.send("play-song", currentSong);
        return;
    }

    const prevIndex = currentQueueIndex - 1;
    if (prevIndex < 0) {
        // Already at start, restart current
        resetTimer();
        startTimer();
        ipcRenderer.send("play-song", currentSong);
        return;
    }
    currentQueueIndex = prevIndex;
    const prevSong = currentQueue[currentQueueIndex];
    currentSong = prevSong;
    updatePlayerUI();
    setIsPlaying(true);
    resetTimer();
    startTimer();
    ipcRenderer.send("play-song", prevSong);
}

function setIsPlaying(state) {
    isPlaying = state;
    const playIcon = document.getElementById("iconPlay");
    const pauseIcon = document.getElementById("iconPause");

    if (isPlaying) {
        playIcon.style.display = "none";
        pauseIcon.style.display = "block";
    } else {
        playIcon.style.display = "block";
        pauseIcon.style.display = "none";
    }
}

function togglePlayPause() {
    if (!currentSong) return;
    // Send signal to backend – the backend reply via update-play-state
    // will set the UI correctly, so we don't toggle locally here.
    ipcRenderer.send("toggle-pause");
}

function updatePlayerUI() {
    if (!currentSong) return;

    document.getElementById("playerTitle").textContent = currentSong.title;
    document.getElementById("playerArtist").textContent = currentSong.artist;
    document.getElementById("playerArt").style.backgroundImage = `url('${currentSong.thumbnail}')`;

    updateHeartBtn();
}

// ===========================
// FAVORITES LOGIC
// ===========================
function toggleLikeCurrent() {
    if (!currentSong) return;

    const newFavs = ipcRenderer.sendSync("toggle-favorite", currentSong);
    favorites = newFavs;
    updateHeartBtn();

    if (document.getElementById("view-library").style.display === "block") {
        renderLibrary();
    }
}

function updateHeartBtn() {
    const btn = document.getElementById("playerHeartBtn");
    if (!currentSong) {
        btn.classList.remove("active");
        return;
    }

    const isLiked = favorites.some((f) => f.title === currentSong.title);
    if (isLiked) btn.classList.add("active");
    else btn.classList.remove("active");
}

// ===========================
// SEARCH LOGIC
// ===========================
function handleSearch(e) {
    if (e.key === "Enter") {
        const query = e.target.value.trim();
        if (!query) return;

        const container = document.getElementById("searchResults");
        container.innerHTML = `
            <div class="search-loading">
                <div class="search-spinner">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <span>Searching for "${query}"</span>
            </div>`;

        ipcRenderer.send("search-youtube", query);
    }
}

ipcRenderer.on("search-results", (event, results) => {
    const container = document.getElementById("searchResults");
    searchResultsData = results || [];

    if (!results || results.length === 0) {
        container.innerHTML = `<div style="color: #b3b3b3; padding: 20px;">No results found.</div>`;
        return;
    }

    container.innerHTML = results
        .map((song, index) => createCardHTML(song, index, "__search__"))
        .join("");
});

// ===========================
// TIMER
// ===========================
function startTimer() {
    if (timeInterval) clearInterval(timeInterval);
    timeInterval = setInterval(() => {
        currentSeconds++;
        updateProgressBar();
    }, 1000);
}

function stopTimer() {
    if (timeInterval) clearInterval(timeInterval);
    timeInterval = null;
}

function resetTimer() {
    currentSeconds = 0;
    updateProgressBar();
}

function updateProgressBar() {
    const mins = Math.floor(currentSeconds / 60);
    const secs = currentSeconds % 60;
    document.getElementById("timeCurrent").textContent = `${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    if (currentSong && currentSong.duration) {
        const total =
            typeof currentSong.duration === "number" ? currentSong.duration : 180;
        const pct = (currentSeconds / total) * 100;
        document.getElementById("progressFill").style.width = `${Math.min(
            pct,
            100
        )}%`;
    }
}

// ===========================
// EVENT LISTENERS
// ===========================
function setupEventListeners() {
    document
        .getElementById("searchInput")
        .addEventListener("keypress", handleSearch);
}

// Run
init();
