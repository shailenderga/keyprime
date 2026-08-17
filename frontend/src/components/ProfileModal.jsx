import { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const ProfileModal = ({ isOpen, onClose }) => {
    const { user } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [location, setLocation] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user && isOpen) {
            setEmail(user.email || '');
            setLocation(user.location || '');
            setPassword('');
            setShowPassword(false);
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

    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-fade-in p-4">
            <div className="min-h-full flex items-center justify-center">
                <div className="bg-slate-900 border border-slate-700/70 rounded-2xl w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in-up my-8 relative z-[10000]">
                    <div className="flex justify-between items-center px-6 py-5 border-b border-slate-700/50 bg-slate-800/50">
                        <h2 className="text-xl font-display font-bold text-white">Profile Settings</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700/60 font-bold">&times;</button>
                    </div>
                    <div className="p-6">
                        {message && (
                            <div className={`p-3.5 rounded-xl text-sm font-semibold mb-5 ${isError ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                {message}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Email Address</label>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Location / City</label>
                                <input 
                                    type="text" 
                                    value={location} 
                                    onChange={(e) => setLocation(e.target.value)} 
                                    className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                    placeholder="Enter Location"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">New Password</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? 'text' : 'password'} 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 pl-4 pr-12 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                        placeholder="Leave blank to keep current password"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1.5"
                                    >
                                        {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="pt-3">
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 text-sm"
                                >
                                    {isLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProfileModal;
