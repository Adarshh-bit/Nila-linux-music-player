import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Intro({ onComplete }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 3200);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            className="intro-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
            {/* Glow background */}
            <motion.div
                style={{
                    position: 'absolute',
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(235,94,40,0.15) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Logo */}
            <motion.div
                className="intro-logo"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
            >
                NILA
            </motion.div>

            {/* Tagline */}
            <motion.div
                className="intro-tagline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
            >
                your music, your vibe
            </motion.div>

            {/* EQ Bars */}
            <motion.div
                className="intro-bars"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.4 }}
            >
                <div className="intro-bar" />
                <div className="intro-bar" />
                <div className="intro-bar" />
                <div className="intro-bar" />
                <div className="intro-bar" />
            </motion.div>

            {/* Loading text */}
            <motion.div
                style={{
                    fontSize: 11,
                    color: '#555',
                    letterSpacing: 2,
                    marginTop: 24,
                    fontFamily: 'var(--font-heading)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ delay: 1.5, duration: 1.5, repeat: Infinity }}
            >
                LOADING...
            </motion.div>
        </motion.div>
    );
}
