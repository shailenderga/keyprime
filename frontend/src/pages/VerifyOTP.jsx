import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

const VerifyOTP = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const email = location.state?.email || '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        try {
            const res = await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp });
            setSuccess(res.data.message);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed');
        }
    };

    if (!email) {
        return (
            <div className="flex items-center justify-center min-h-[85vh]">
                <div className="text-center text-white">
                    <h2 className="text-2xl font-bold mb-4">No email found</h2>
                    <Link to="/register" className="text-indigo-400 hover:text-indigo-300">Go back to Register</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-[85vh] animate-fade-in relative z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 p-8 max-w-md w-full rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] animate-fade-in-up relative">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Verify Your Email</h2>
                    <p className="text-slate-400 font-medium text-sm">
                        We have sent a 6-digit OTP to <br/><span className="text-white font-semibold">{email}</span>
                    </p>
                </div>
                
                {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2"><svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</div>}
                
                {success ? (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-6 rounded-xl text-center space-y-4">
                        <svg className="w-12 h-12 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <div>
                            <h3 className="text-lg font-bold text-green-300 mb-1">Email Verified!</h3>
                            <p className="text-sm font-medium">{success}</p>
                            <p className="text-xs text-green-500/70 mt-3">Redirecting to login...</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">6-Digit OTP</label>
                            <input 
                                type="text" 
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600"
                                placeholder="------"
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={otp.length !== 6}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 group"
                        >
                            Verify Account
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default VerifyOTP;
