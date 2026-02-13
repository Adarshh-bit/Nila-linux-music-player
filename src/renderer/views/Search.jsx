import React, { useState, useEffect, useRef } from 'react';
import SongCard from '../components/SongCard';

const { ipcRenderer } = window.require('electron');

export default function Search({ playSong, addToQueue }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handler = (_e, data) => {
            setResults(data || []);
            setLoading(false);
        };
        ipcRenderer.on('search-results', handler);
        return () => ipcRenderer.removeListener('search-results', handler);
    }, []);

    const handleSearch = (e) => {
        if (e.key === 'Enter' && query.trim()) {
            setLoading(true);
            setResults(null);
            ipcRenderer.send('search-youtube', query.trim());
        }
    };

    return (
        <div>
            <div className="search-header">
                <input
                    ref={inputRef}
                    className="search-input"
                    type="text"
                    placeholder="What do you want to listen to?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleSearch}
                />
            </div>

            <h2 className="category-title">
                {loading ? 'Searching...' : results ? 'Search Results' : 'Search for something'}
            </h2>

            {loading && (
                <div className="loading-placeholder">
                    <div className="spinner">
                        <div className="dot" />
                        <div className="dot" />
                        <div className="dot" />
                    </div>
                    <span>Searching for "{query}"</span>
                </div>
            )}

            {results && !loading && (
                <div className="grid-container">
                    {results.length === 0 ? (
                        <div className="empty-state">No results found.</div>
                    ) : (
                        results.map((song, idx) => (
                            <SongCard
                                key={song.id || idx}
                                song={song}
                                index={idx}
                                queue={results}
                                onPlay={playSong}
                                onAddToQueue={addToQueue}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

