import React from 'react';
import {
    Play, Pause, SkipBack, SkipForward, Heart, ListMusic,
} from 'lucide-react';

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function PlayerBar({
    currentSong,
    isPlaying,
    currentSeconds,
    onTogglePlayPause,
    onNext,
    onPrev,
    isFavorite,
    onToggleFavorite,
    onOpenFloatingPlayer,
    onToggleQueue,
    showQueue,
}) {
    const duration = currentSong?.duration || 180;
    const progressPct = currentSong ? Math.min((currentSeconds / duration) * 100, 100) : 0;

    return (
        <footer className="player-bar">
            {/* LEFT — Song Info (clickable to open floating player) */}
            <div
                className="player-left"
                onClick={() => currentSong && onOpenFloatingPlayer?.()}
                style={{ cursor: currentSong ? 'pointer' : 'default' }}
                title={currentSong ? 'Open Now Playing' : ''}
            >
                {currentSong?.thumbnail ? (
                    <img className="player-art" src={currentSong.thumbnail} alt="" />
                ) : (
                    <div className="player-art" />
                )}
                <div className="player-info">
                    <div className="player-title">{currentSong?.title || 'Select a song'}</div>
                    <div className="player-artist">{currentSong?.artist || '---'}</div>
                </div>
            </div>

            {/* CENTER — Controls */}
            <div className="player-center">
                <div className="player-controls">
                    <button className="control-btn" onClick={onPrev} title="Previous">
                        <SkipBack size={20} />
                    </button>

                    <button
                        className="play-pause-btn"
                        onClick={onTogglePlayPause}
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" style={{ marginLeft: 2 }} />}
                    </button>

                    <button className="control-btn" onClick={onNext} title="Next">
                        <SkipForward size={20} />
                    </button>
                </div>

                <div className="progress-container">
                    <span className="time-label">{formatTime(currentSeconds)}</span>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="time-label">{currentSong ? formatTime(duration) : '--:--'}</span>
                </div>
            </div>

            {/* RIGHT — Queue + Like */}
            <div className="player-right">
                <button
                    className={`control-btn queue-toggle-btn ${showQueue ? 'active' : ''}`}
                    onClick={onToggleQueue}
                    title="Queue"
                >
                    <ListMusic size={18} />
                </button>
                <button
                    className={`heart-btn ${currentSong && isFavorite(currentSong) ? 'active' : ''}`}
                    onClick={() => onToggleFavorite(currentSong)}
                    title="Like"
                >
                    <Heart size={18} fill={currentSong && isFavorite(currentSong) ? 'currentColor' : 'none'} />
                </button>
            </div>
        </footer>
    );
}
