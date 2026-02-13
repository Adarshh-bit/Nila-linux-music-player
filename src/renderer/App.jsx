import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Intro from './components/Intro';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import Toast from './components/Toast';
import QueueOverlay from './components/QueueOverlay';
import Home from './views/Home';
import Search from './views/Search';
import Library from './views/Library';

const { ipcRenderer } = window.require('electron');

export default function App() {
    const [showIntro, setShowIntro] = useState(true);
    const [view, setView] = useState('home');
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [queue, setQueue] = useState([]);
    const [queueIndex, setQueueIndex] = useState(-1);
    const [currentSeconds, setCurrentSeconds] = useState(0);
    const [toast, setToast] = useState(null);
    const [showQueue, setShowQueue] = useState(false);
    const timerRef = useRef(null);
    const toastKeyRef = useRef(0);

    // --------- Toast ---------
    const showToast = useCallback((data) => {
        toastKeyRef.current += 1;
        setToast({ ...data, key: toastKeyRef.current });
    }, []);

    const dismissToast = useCallback(() => {
        setToast(null);
    }, []);

    // --------- Favorites ---------
    const loadFavorites = useCallback(() => {
        try {
            const favs = ipcRenderer.sendSync('get-favorites');
            setFavorites(favs || []);
        } catch (e) {
            console.error('Failed to load favorites', e);
        }
    }, []);

    const toggleFavorite = useCallback((song) => {
        if (!song) return;
        const newFavs = ipcRenderer.sendSync('toggle-favorite', song);
        setFavorites(newFavs || []);
    }, []);

    const isFavorite = useCallback(
        (song) => favorites.some((f) => f.title === song?.title),
        [favorites]
    );

    // --------- Timer ---------
    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCurrentSeconds((s) => s + 1);
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    }, []);

    const resetTimer = useCallback(() => {
        setCurrentSeconds(0);
    }, []);

    // --------- Playback ---------
    const playSong = useCallback(
        (song, newQueue, index) => {
            setCurrentSong(song);
            setQueue(newQueue || [song]);
            setQueueIndex(index ?? 0);
            resetTimer();
            ipcRenderer.send('play-song', song);
            showToast({
                type: 'playing',
                label: 'Now Playing',
                title: song.title,
                artist: song.artist,
                thumbnail: song.thumbnail,
            });
        },
        [resetTimer, showToast]
    );

    // --------- Add to Queue ---------
    const addToQueue = useCallback(
        (song) => {
            setQueue((prev) => [...prev, song]);
            showToast({
                type: 'queue',
                label: 'Added to Queue',
                title: song.title,
                artist: song.artist,
                thumbnail: song.thumbnail,
            });
        },
        [showToast]
    );

    const playNext = useCallback(() => {
        if (queue.length === 0) return;
        const nextIdx = queueIndex + 1;
        if (nextIdx >= queue.length) return;
        const nextSong = queue[nextIdx];
        setQueueIndex(nextIdx);
        setCurrentSong(nextSong);
        resetTimer();
        ipcRenderer.send('play-song', nextSong);
        showToast({
            type: 'playing',
            label: 'Now Playing',
            title: nextSong.title,
            artist: nextSong.artist,
            thumbnail: nextSong.thumbnail,
        });
    }, [queue, queueIndex, resetTimer, showToast]);

    const playPrev = useCallback(() => {
        if (queue.length === 0) return;
        if (currentSeconds > 3) {
            resetTimer();
            ipcRenderer.send('play-song', currentSong);
            return;
        }
        const prevIdx = queueIndex - 1;
        if (prevIdx < 0) {
            resetTimer();
            ipcRenderer.send('play-song', currentSong);
            return;
        }
        const prevSong = queue[prevIdx];
        setQueueIndex(prevIdx);
        setCurrentSong(prevSong);
        resetTimer();
        ipcRenderer.send('play-song', prevSong);
    }, [queue, queueIndex, currentSeconds, currentSong, resetTimer]);

    const togglePlayPause = useCallback(() => {
        if (!currentSong) return;
        ipcRenderer.send('toggle-pause');
    }, [currentSong]);

    // --------- Queue UI ---------
    const toggleQueue = useCallback(() => {
        setShowQueue((prev) => !prev);
    }, []);

    const playFromQueue = useCallback(
        (index) => {
            if (index < 0 || index >= queue.length) return;
            const song = queue[index];
            setQueueIndex(index);
            setCurrentSong(song);
            resetTimer();
            ipcRenderer.send('play-song', song);
            showToast({
                type: 'playing',
                label: 'Now Playing',
                title: song.title,
                artist: song.artist,
                thumbnail: song.thumbnail,
            });
        },
        [queue, resetTimer, showToast]
    );

    // --------- Floating Player ---------
    const openFloatingPlayer = useCallback(() => {
        ipcRenderer.send('open-floating-player');
    }, []);

    // --------- IPC Listeners ---------
    useEffect(() => {
        loadFavorites();

        const onUpdateSong = (_e, song) => {
            setCurrentSong(song);
        };

        const onUpdatePlayState = (_e, playing) => {
            setIsPlaying(playing);
            if (playing) {
                startTimer();
            } else {
                stopTimer();
            }
        };

        const onSongFinished = () => {
            setIsPlaying(false);
            stopTimer();
            resetTimer();
            // Auto-play next from queue
            setQueue((q) => {
                setQueueIndex((idx) => {
                    const nextIdx = idx + 1;
                    if (nextIdx < q.length) {
                        const nextSong = q[nextIdx];
                        setCurrentSong(nextSong);
                        resetTimer();
                        ipcRenderer.send('play-song', nextSong);
                        return nextIdx;
                    }
                    return idx;
                });
                return q;
            });
        };

        const onRemoteNext = () => {
            setQueue((q) => {
                setQueueIndex((idx) => {
                    const nextIdx = idx + 1;
                    if (nextIdx < q.length) {
                        const nextSong = q[nextIdx];
                        setCurrentSong(nextSong);
                        resetTimer();
                        ipcRenderer.send('play-song', nextSong);
                        return nextIdx;
                    }
                    return idx;
                });
                return q;
            });
        };

        const onRemotePrev = () => {
            setQueue((q) => {
                setQueueIndex((idx) => {
                    setCurrentSeconds((secs) => {
                        setCurrentSong((cs) => {
                            if (secs > 3 || idx <= 0) {
                                resetTimer();
                                ipcRenderer.send('play-song', cs);
                            } else {
                                const prevSong = q[idx - 1];
                                setCurrentSong(prevSong);
                                resetTimer();
                                ipcRenderer.send('play-song', prevSong);
                                return prevSong;
                            }
                            return cs;
                        });
                        return secs;
                    });
                    if (idx > 0) return idx - 1;
                    return idx;
                });
                return q;
            });
        };

        ipcRenderer.on('update-song', onUpdateSong);
        ipcRenderer.on('update-play-state', onUpdatePlayState);
        ipcRenderer.on('song-finished', onSongFinished);
        ipcRenderer.on('remote-play-next', onRemoteNext);
        ipcRenderer.on('remote-play-prev', onRemotePrev);

        return () => {
            ipcRenderer.removeListener('update-song', onUpdateSong);
            ipcRenderer.removeListener('update-play-state', onUpdatePlayState);
            ipcRenderer.removeListener('song-finished', onSongFinished);
            ipcRenderer.removeListener('remote-play-next', onRemoteNext);
            ipcRenderer.removeListener('remote-play-prev', onRemotePrev);
            stopTimer();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --------- Render ---------
    return (
        <>
            <AnimatePresence>
                {showIntro && <Intro onComplete={() => setShowIntro(false)} />}
            </AnimatePresence>

            <div className="app-layout">
                <Sidebar view={view} onNavigate={setView} />

                <main className="main-content">
                    <AnimatePresence mode="wait">
                        {view === 'home' && (
                            <motion.div
                                key="home"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Home playSong={playSong} addToQueue={addToQueue} />
                            </motion.div>
                        )}
                        {view === 'search' && (
                            <motion.div
                                key="search"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Search playSong={playSong} addToQueue={addToQueue} />
                            </motion.div>
                        )}
                        {view === 'library' && (
                            <motion.div
                                key="library"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Library
                                    favorites={favorites}
                                    loadFavorites={loadFavorites}
                                    playSong={playSong}
                                    addToQueue={addToQueue}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Queue Overlay  — slides inside main content area */}
                    <AnimatePresence>
                        {showQueue && (
                            <QueueOverlay
                                queue={queue}
                                queueIndex={queueIndex}
                                currentSong={currentSong}
                                onPlayFromQueue={playFromQueue}
                                onClose={toggleQueue}
                            />
                        )}
                    </AnimatePresence>
                </main>

                <PlayerBar
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    currentSeconds={currentSeconds}
                    onTogglePlayPause={togglePlayPause}
                    onNext={playNext}
                    onPrev={playPrev}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    onOpenFloatingPlayer={openFloatingPlayer}
                    onToggleQueue={toggleQueue}
                    showQueue={showQueue}
                />
            </div>

            {/* Bottom-right toast notification */}
            <Toast toast={toast} onDismiss={dismissToast} />
        </>
    );
}
