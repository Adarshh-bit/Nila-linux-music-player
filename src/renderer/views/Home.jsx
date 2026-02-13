import React, { useEffect, useState, useRef } from 'react';
import SongCard from '../components/SongCard';

const { ipcRenderer } = window.require('electron');

const CATEGORIES = [
    'Malayalam', 'English', 'Hindi', 'Tamil', 'Telugu',
    'Punjabi', 'Pop', 'K-Pop', 'Chill', 'Romantic', 'Marathi',
];

export default function Home({ playSong, addToQueue }) {
    const [categoryData, setCategoryData] = useState({});
    const fetchedRef = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        CATEGORIES.forEach((cat) => {
            ipcRenderer.send('fetch-category', cat);

            ipcRenderer.once(`category-results-${cat}`, (_e, results) => {
                setCategoryData((prev) => ({ ...prev, [cat]: results || [] }));
            });
        });
    }, []);

    return (
        <div>
            {CATEGORIES.map((cat) => {
                const songs = categoryData[cat];
                return (
                    <div className="category-section" key={cat}>
                        <h2 className="category-title">{cat}</h2>
                        <div className="card-row">
                            {!songs ? (
                                <div className="loading-placeholder">
                                    <div className="spinner">
                                        <div className="dot" />
                                        <div className="dot" />
                                        <div className="dot" />
                                    </div>
                                    <span>Loading {cat}...</span>
                                </div>
                            ) : songs.length === 0 ? (
                                <div className="empty-state">No songs found.</div>
                            ) : (
                                songs.map((song, idx) => (
                                    <SongCard
                                        key={song.id || idx}
                                        song={song}
                                        index={idx}
                                        queue={songs}
                                        onPlay={playSong}
                                        onAddToQueue={addToQueue}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

