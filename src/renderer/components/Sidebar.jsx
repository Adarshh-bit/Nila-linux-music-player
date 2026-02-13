import React from 'react';
import { Home, Search, Heart } from 'lucide-react';

const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Liked Songs', icon: Heart },
];

export default function Sidebar({ view, onNavigate }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                NILA
                <span>music player</span>
            </div>

            <nav className="nav-menu">
                {navItems.map((item) => (
                    <div
                        key={item.id}
                        className={`nav-item ${view === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                    >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                    </div>
                ))}
            </nav>
        </aside>
    );
}
