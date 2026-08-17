import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { API_URL } from '../config';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', phone: '', store_name: '', location: '', role: 'customer'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/api/auth/register`, formData);
            if (formData.role === 'customer') {
                navigate('/verify-otp', { state: { email: formData.email } });
            } else {
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[85vh] py-10 animate-fade-in relative z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 p-8 md:p-10 max-w-2xl w-full rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] animate-fade-in-up relative">
                <div className="text-center mb-10">
                    <img src="/icon.webp" alt="Logo" className="h-14 w-auto object-contain mx-auto mb-5" />
                    <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Create an Account</h2>
                    <p className="text-slate-400 font-medium">Join our support platform today</p>
                </div>
                
                {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2"><svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</div>}
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name</label>
                            <input type="text" name="name" onChange={handleChange} required 
                                   className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none" placeholder="Enter Your Name"/>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                            <input type="email" name="email" onChange={handleChange} required 
                                   className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none" placeholder="Enter Email"/>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Password</label>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} name="password" onChange={handleChange} required 
                                       className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none pr-12" placeholder="Enter Password"/>
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                                >
                                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                </button>
                            </div>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Phone Number</label>
                            <input type="text" name="phone" onChange={handleChange} 
                                   className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none" placeholder="Enter Phone"/>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Store Name</label>
                            <input type="text" name="store_name" onChange={handleChange} 
                                   className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none" placeholder=" Store Name"/>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Location / City</label>
                            <input type="text" name="location" onChange={handleChange} 
                                   className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none" placeholder=" Mumbai"/>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3.5 rounded-xl mt-6 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all transform hover:-translate-y-0.5">
                        Create Account
                    </button>
                </form>
                <div className="mt-8 text-center text-sm font-medium text-slate-400">
                    Already have an account? <Link to="/login" className="text-white hover:text-indigo-400 transition-colors ml-1">Sign in</Link>
                </div>
            </div>
        </div>
    );
};
export default Register;
