import React from 'react';
import { Play, ListPlus } from 'lucide-react';

export default function SongCard({ song, index, queue, onPlay, onAddToQueue }) {
    const handleClick = () => {
        onPlay(song, queue, index);
    };

    const handleAddToQueue = (e) => {
        e.stopPropagation();
        if (onAddToQueue) {
            onAddToQueue(song);
        }
    };

    return (
        <div className="song-card" onClick={handleClick}>
            <div className="card-img-wrapper">
                <img
                    className="card-img"
                    src={song.thumbnail || ''}
                    alt={song.title}
                    loading="lazy"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
                <div className="card-play-overlay">
                    <Play size={18} fill="white" />
                </div>
                {onAddToQueue && (
                    <button
                        className="card-queue-btn"
                        onClick={handleAddToQueue}
                        title="Add to Queue"
                    >
                        <ListPlus size={15} />
                    </button>
                )}
            </div>
            <div className="card-title" title={song.title}>{song.title}</div>
            <div className="card-artist" title={song.artist}>{song.artist || 'Unknown'}</div>
        </div>
    );
}
