import React, { useEffect } from 'react';
import SongCard from '../components/SongCard';

export default function Library({ favorites, loadFavorites, playSong, addToQueue }) {
    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    return (
        <div>
            <h2 className="category-title">Your Liked Songs</h2>

            {favorites.length === 0 ? (
                <div className="empty-state">
                    No liked songs yet. Go heart some! ❤️
                </div>
            ) : (
                <div className="grid-container">
                    {favorites.map((song, idx) => (
                        <SongCard
                            key={song.id || idx}
                            song={song}
                            index={idx}
                            queue={favorites}
                            onPlay={playSong}
                            onAddToQueue={addToQueue}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

