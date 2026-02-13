import React, { useMemo } from 'react';
import { motion, Reorder } from 'framer-motion';
import { X, Music, Play, GripVertical } from 'lucide-react';

export default function QueueOverlay({ queue, queueIndex, currentSong, onPlayFromQueue, onReorderQueue, onClose }) {
    // Extract only the "up next" portion of the queue
    const upNextSongs = useMemo(() => {
        return queue.filter((_, i) => i > queueIndex);
    }, [queue, queueIndex]);

    // When Reorder fires, we get the new upNext order.
    // Reconstruct the full queue: keep played portion + current, append new order.
    const handleReorder = (newUpNext) => {
        const playedPortion = queue.slice(0, queueIndex + 1);
        onReorderQueue([...playedPortion, ...newUpNext]);
    };

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

            {/* Up Next — Reorderable */}
            <div className="queue-section queue-section-upnext">
                <div className="queue-section-label">Up Next</div>
                <div className="queue-list">
                    {upNextSongs.length === 0 && queue.length === 0 && (
                        <div className="queue-empty">
                            <Music size={20} />
                            <span>Queue is empty</span>
                        </div>
                    )}
                    {upNextSongs.length === 0 && queue.length > 0 && (
                        <div className="queue-empty">
                            <span>No more songs in queue</span>
                        </div>
                    )}
                    {upNextSongs.length > 0 && (
                        <Reorder.Group
                            axis="y"
                            values={upNextSongs}
                            onReorder={handleReorder}
                            className="queue-reorder-group"
                        >
                            {upNextSongs.map((song) => {
                                // Find actual index in original queue for playFromQueue
                                const actualIndex = queue.indexOf(song);
                                return (
                                    <Reorder.Item
                                        key={song.id || song.title + '-' + actualIndex}
                                        value={song}
                                        className="queue-item queue-item-draggable"
                                        whileDrag={{
                                            scale: 1.03,
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                            background: 'rgba(235, 94, 40, 0.1)',
                                            zIndex: 50,
                                        }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <div className="queue-drag-handle" title="Drag to reorder">
                                            <GripVertical size={14} />
                                        </div>
                                        <img className="queue-item-art" src={song.thumbnail} alt="" />
                                        <div className="queue-item-info" onClick={() => onPlayFromQueue(actualIndex)}>
                                            <div className="queue-item-title">{song.title}</div>
                                            <div className="queue-item-artist">{song.artist}</div>
                                        </div>
                                        <div className="queue-item-play" onClick={() => onPlayFromQueue(actualIndex)}>
                                            <Play size={14} />
                                        </div>
                                    </Reorder.Item>
                                );
                            })}
                        </Reorder.Group>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
