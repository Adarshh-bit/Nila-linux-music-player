import React from 'react';
import { motion } from 'framer-motion';
import { X, Music, Play } from 'lucide-react';

export default function QueueOverlay({ queue, queueIndex, currentSong, onPlayFromQueue, onClose }) {
    return (
        <motion.div
            className="queue-overlay"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            <div className="queue-header">
                <h3 className="queue-heading">Queue</h3>
                <button className="queue-close-btn" onClick={onClose} title="Close Queue">
                    <X size={18} />
                </button>
            </div>

            {/* Now Playing */}
            {currentSong && (
                <div className="queue-section">
                    <div className="queue-section-label">Now Playing</div>
                    <div className="queue-item queue-item-active">
                        <img className="queue-item-art" src={currentSong.thumbnail} alt="" />
                        <div className="queue-item-info">
                            <div className="queue-item-title">{currentSong.title}</div>
                            <div className="queue-item-artist">{currentSong.artist}</div>
                        </div>
                        <div className="queue-item-eq">
                            <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
                        </div>
                    </div>
                </div>
            )}

            {/* Up Next */}
            <div className="queue-section">
                <div className="queue-section-label">Up Next</div>
                <div className="queue-list">
                    {queue.length === 0 && (
                        <div className="queue-empty">
                            <Music size={20} />
                            <span>Queue is empty</span>
                        </div>
                    )}
                    {queue.map((song, i) => {
                        if (i <= queueIndex) return null;
                        return (
                            <div
                                key={`${song.id || song.title}-${i}`}
                                className="queue-item"
                                onClick={() => onPlayFromQueue(i)}
                            >
                                <img className="queue-item-art" src={song.thumbnail} alt="" />
                                <div className="queue-item-info">
                                    <div className="queue-item-title">{song.title}</div>
                                    <div className="queue-item-artist">{song.artist}</div>
                                </div>
                                <div className="queue-item-play">
                                    <Play size={14} />
                                </div>
                            </div>
                        );
                    })}
                    {queue.filter((_, i) => i > queueIndex).length === 0 && queue.length > 0 && (
                        <div className="queue-empty">
                            <span>No more songs in queue</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
