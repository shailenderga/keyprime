import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';

const ProfileModal = ({ isOpen, onClose }) => {
    const { user } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [location, setLocation] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user && isOpen) {
            setEmail(user.email || '');
            setLocation(user.location || '');
            setPassword('');
            setMessage('');
            setIsError(false);
        }
    }, [user, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            await axios.put(`${API_URL}/api/auth/profile`, {
                user_id: user.id,
                email,
                location,
                password: password || undefined
            });
            setMessage('Profile updated successfully!');
            setIsError(false);
            
            const updatedUser = { ...user, email, location };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            setMessage(error.response?.data?.error || 'Failed to update profile');
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
                <div className="flex justify-between items-center p-40 border-b border-slate-700/50">
                    <h2 className="text-xl font-display font-bold text-white">Profile Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700">&times;</button>
                </div>
                <div className="p-10">
                    {message && (
                        <div className={`p-3 rounded-xl text-sm font-semibold mb-5 ${isError ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {message}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Email Address</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Location / City</label>
                            <input 
                                type="text" 
                                value={location} 
                                onChange={(e) => setLocation(e.target.value)} 
                                className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                                placeholder="Enter Location"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">New Password</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                                placeholder="Leave blank to keep current password"
                            />
                        </div>
                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
