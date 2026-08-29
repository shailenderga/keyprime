import { useState, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_URL } from '../config';
import { FiEye, FiEyeOff, FiCamera, FiUploadCloud } from 'react-icons/fi';

const ProfileModal = ({ isOpen, onClose }) => {
    const { user, updateUser, updateUserPhoto } = useContext(AuthContext);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [location, setLocation] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (user && isOpen) {
            setName(user.name || '');
            setEmail(user.email || '');
            setLocation(user.location || '');
            setPassword('');
            setShowPassword(false);
            setMessage('');
            setIsError(false);
        }
    }, [user, isOpen]);

    if (!isOpen) return null;

    const getPhotoUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        return `${API_URL}${url}`;
    };

    const handlePhotoSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setPhotoUploading(true);
        setMessage('');

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('user_id', user.id);

        try {
            const res = await axios.put(`${API_URL}/api/auth/profile-photo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            updateUserPhoto(res.data.profile_photo);
            if (res.data.user) {
                updateUser(res.data.user);
            }
            setMessage('Profile photo updated successfully!');
            setIsError(false);
        } catch (error) {
            console.error('Photo upload error:', error);
            setMessage(error.response?.data?.error || 'Failed to upload profile photo');
            setIsError(true);
        } finally {
            setPhotoUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            const res = await axios.put(`${API_URL}/api/auth/profile`, {
                user_id: user.id,
                name,
                email,
                location,
                password: password || undefined
            });
            setMessage('Profile updated successfully!');
            setIsError(false);
            
            if (res.data.user) {
                updateUser(res.data.user);
            } else {
                updateUser({ name, email, location });
            }
            
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

                        {/* Interactive Profile Photo Upload */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-700 group-hover:border-indigo-500 transition-all shadow-xl bg-slate-800 flex items-center justify-center">
                                    {user?.profile_photo ? (
                                        <img src={getPhotoUrl(user.profile_photo)} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-bold text-slate-300">
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="absolute inset-0 rounded-full bg-slate-950/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <FiCamera size={22} />
                                    <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Change</span>
                                </div>
                            </div>
                            
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={photoUploading}
                                className="mt-3 text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                            >
                                <FiUploadCloud size={14} />
                                {photoUploading ? 'Uploading Photo...' : 'Upload Profile Photo'}
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handlePhotoSelect} 
                                accept="image/*" 
                                className="hidden" 
                            />
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Full Name</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Email Address</label>
                                <input 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Location / City</label>
                                <input 
                                    type="text" 
                                    value={location} 
                                    onChange={(e) => setLocation(e.target.value)} 
                                    className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                    placeholder="Enter Location"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">New Password</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? 'text' : 'password'} 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        className="w-full bg-slate-800/60 border border-slate-700 text-slate-100 pl-4 pr-12 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
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
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 text-sm"
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
