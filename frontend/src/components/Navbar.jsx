import { useContext, useRef, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import ProfileModal from './ProfileModal';

const Navbar = () => {
    const { user, logout, updateUserPhoto } = useContext(AuthContext);
    const [uploading, setUploading] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isProfileOpen, setProfileOpen] = useState(false);
    const fileInputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('user_id', user.id);

        setUploading(true);
        try {
            const res = await axios.put(`${API_URL}/api/auth/profile-photo`, formData);
            updateUserPhoto(res.data.profile_photo);
            setDropdownOpen(false);
        } catch (error) {
            console.error('Error uploading photo', error);
        }
        setUploading(false);
    };

    return (
        <nav className="max-w-7xl mx-auto mt-6 mb-10 px-4 sm:px-6 lg:px-8 sticky top-6 z-50 animate-fade-in-up">
            <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-2xl flex justify-between items-center h-16 px-6 relative">
                <div className="flex items-center">
                    <Link to="/" className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        <img src="/icon.webp" alt="Logo" className="h-10 w-auto object-contain" />
                        SupportDesk
                    </Link>
                </div>
                
                <div className="flex items-center" ref={dropdownRef}>
                    <div className="relative">
                        {/* Profile Photo Button */}
                        <button 
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all focus:outline-none ${dropdownOpen ? 'border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'border-slate-600 hover:border-slate-400'}`}
                        >
                            {user?.profile_photo ? (
                                <img src={`${API_URL}${user.profile_photo}`} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 mt-3 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-fade-in z-50">
                                <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-900/30">
                                    <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                                    <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mt-0.5 truncate">{user?.role}</p>
                                </div>
                                <div className="p-2 space-y-1">
                                    <Link 
                                        to={`/${user?.role}`} 
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white rounded-xl transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                        Dashboard
                                    </Link>
                                    
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white rounded-xl transition-colors text-left"
                                        disabled={uploading}
                                    >
                                        {uploading ? (
                                            <svg className="w-4 h-4 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        )}
                                        {uploading ? 'Uploading...' : 'Update Photo'}
                                    </button>
                                    
                                    <button 
                                        onClick={() => {
                                            setProfileOpen(true);
                                            setDropdownOpen(false);
                                        }}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white rounded-xl transition-colors text-left"
                                    >
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        Settings
                                    </button>
                                </div>
                                <div className="p-2 border-t border-slate-700/50">
                                    <button 
                                        onClick={logout} 
                                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors text-left"
                                    >
                                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <input type="file" className="hidden" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} />
                </div>
            </div>
            
            <ProfileModal isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} />
        </nav>
    );
};
export default Navbar;
