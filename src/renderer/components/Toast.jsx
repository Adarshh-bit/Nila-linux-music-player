import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, ListPlus } from 'lucide-react';

export default function Toast({ toast, onDismiss }) {
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => {
            onDismiss();
        }, 3000);
        return () => clearTimeout(timer);
    }, [toast, onDismiss]);

    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    className="toast-container"
                    initial={{ opacity: 0, y: 60, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                    <div className="toast-icon">
                        {toast.type === 'queue' ? (
                            <ListPlus size={18} />
                        ) : (
                            <Music size={18} />
                        )}
                    </div>
                    {toast.thumbnail && (
                        <img
                            className="toast-thumb"
                            src={toast.thumbnail}
                            alt=""
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    )}
                    <div className="toast-info">
                        <div className="toast-label">{toast.label || 'Now Playing'}</div>
                        <div className="toast-title">{toast.title}</div>
                        {toast.artist && (
                            <div className="toast-artist">{toast.artist}</div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
