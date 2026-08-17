import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { API_URL } from '../config';

const Login = () => {
    const { login, googleLogin } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    // Forgot password flow: 'none' | 'email' | 'otp' | 'newpass'
    const [forgotStep, setForgotStep] = useState('none');
    const [fpEmail, setFpEmail] = useState('');
    const [fpOtp, setFpOtp] = useState('');
    const [fpNewPass, setFpNewPass] = useState('');
    const [fpConfirmPass, setFpConfirmPass] = useState('');
    const [fpMsg, setFpMsg] = useState('');
    const [fpError, setFpError] = useState('');
    const [fpLoading, setFpLoading] = useState(false);
    const [showFpPass, setShowFpPass] = useState(false);

    // Google New User Details Modal
    const [showGoogleDetailsModal, setShowGoogleDetailsModal] = useState(false);
    const [googleCreds, setGoogleCreds] = useState(null);
    const [googleUserMeta, setGoogleUserMeta] = useState({ name: '', email: '' });
    const [googleForm, setGoogleForm] = useState({ phone: '', store_name: '', location: '' });
    const [googleSubmitLoading, setGoogleSubmitLoading] = useState(false);

    const handleGoogleDetailsSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setGoogleSubmitLoading(true);
        try {
            await googleLogin(googleCreds, googleForm);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit registration');
            if (err.response?.status === 403) {
                setShowGoogleDetailsModal(false);
                setFpMsg(err.response?.data?.error || 'Registration submitted! Pending admin approval.');
            }
        } finally {
            setGoogleSubmitLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    const handleForgotSendOtp = async (e) => {
        e.preventDefault();
        setFpError(''); setFpMsg(''); setFpLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/forgot-password`, { email: fpEmail });
            setFpMsg('Send Otp Your Email');
            setForgotStep('otp');
        } catch (err) {
            setFpError(err.response?.data?.error || 'Kuch galat hua. Dobara try karein.');
        } finally {
            setFpLoading(false);
        }
    };

    const handleForgotVerifyOtp = async (e) => {
        e.preventDefault();
        setFpError(''); setFpLoading(true);
        try {
            // Just move to next step — actual verification happens on submit
            setForgotStep('newpass');
        } catch (err) {
            setFpError(err.response?.data?.error || 'Invalid OTP.');
        } finally {
            setFpLoading(false);
        }
    };

    const handleForgotReset = async (e) => {
        e.preventDefault();
        setFpError(''); setFpLoading(true);
        if (fpNewPass !== fpConfirmPass) {
            setFpError('Passwords match nahi kar rahe!');
            setFpLoading(false);
            return;
        }
        if (fpNewPass.length < 6) {
            setFpError('Password kam se kam 6 characters ka hona chahiye.');
            setFpLoading(false);
            return;
        }
        try {
            const res = await axios.post(`${API_URL}/api/auth/reset-password`, {
                email: fpEmail,
                otp: fpOtp,
                newPassword: fpNewPass
            });
            setFpMsg(res.data.message);
            setForgotStep('none');
            setFpEmail(''); setFpOtp(''); setFpNewPass(''); setFpConfirmPass('');
        } catch (err) {
            setFpError(err.response?.data?.error || 'Password reset failed.');
        } finally {
            setFpLoading(false);
        }
    };

    const closeForgot = () => {
        setForgotStep('none');
        setFpEmail(''); setFpOtp(''); setFpNewPass(''); setFpConfirmPass('');
        setFpError(''); setFpMsg('');
    };

    return (
        <div className="flex items-center justify-center min-h-[85vh] animate-fade-in relative z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>

            {/* Forgot Password Modal */}
            {forgotStep !== 'none' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-800/95 border border-slate-700/50 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-fade-in-up">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-display font-bold text-white">
                                {forgotStep === 'email' && 'Password Reset'}
                                {forgotStep === 'otp' && 'Otp Verify'}
                                {forgotStep === 'newpass' && 'Set New Password'}
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">
                                {forgotStep === 'email' && 'Enter Your Email'}
                                {forgotStep === 'otp' && `Send Otp Your Email: ${fpEmail}`}
                                {forgotStep === 'newpass' && 'Set New Password'}
                            </p>
                        </div>

                        {fpError && (
                            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl mb-4 text-sm font-semibold">
                                {fpError}
                            </div>
                        )}
                        {fpMsg && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl mb-4 text-sm font-semibold">
                                {fpMsg}
                            </div>
                        )}

                        {/* Step 1: Email */}
                        {forgotStep === 'email' && (
                            <form onSubmit={handleForgotSendOtp} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                                    <input
                                        type="email" required
                                        value={fpEmail} onChange={(e) => setFpEmail(e.target.value)}
                                        placeholder="Apna email enter karein"
                                        className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                                    />
                                </div>
                                <button type="submit" disabled={fpLoading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                                    {fpLoading ? 'Sending...' : 'Send OTP'}
                                </button>
                            </form>
                        )}

                        {/* Step 2: OTP */}
                        {forgotStep === 'otp' && (
                            <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">6-Digit OTP</label>
                                    <input
                                        type="text" required maxLength={6}
                                        value={fpOtp} onChange={(e) => setFpOtp(e.target.value)}
                                        placeholder="OTP enter karein"
                                        className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-center text-lg tracking-widest font-bold"
                                    />
                                </div>
                                <button type="submit" disabled={fpLoading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                                    OTP Verify
                                </button>
                                <button type="button" onClick={() => setForgotStep('email')}
                                    className="w-full text-slate-400 hover:text-slate-200 text-sm transition-colors">
                                    ← Enter Your Email 
                                </button>
                            </form>
                        )}

                        {/* Step 3: New Password */}
                        {forgotStep === 'newpass' && (
                            <form onSubmit={handleForgotReset} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showFpPass ? 'text' : 'password'} required
                                            value={fpNewPass} onChange={(e) => setFpNewPass(e.target.value)}
                                            placeholder="New password"
                                            className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none pr-12"
                                        />
                                        <button type="button" onClick={() => setShowFpPass(!showFpPass)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                                            {showFpPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Password Confirm</label>
                                    <input
                                        type="password" required
                                        value={fpConfirmPass} onChange={(e) => setFpConfirmPass(e.target.value)}
                                        placeholder=" Enter YOur Password"
                                        className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                                    />
                                </div>
                                <button type="submit" disabled={fpLoading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                                    {fpLoading ? 'Saving...' : 'Password Reset Karein'}
                                </button>
                            </form>
                        )}

                        <button type="button" onClick={closeForgot}
                            className="w-full mt-4 text-slate-500 hover:text-slate-300 text-sm transition-colors">
                            Please Login
                        </button>
                    </div>
                </div>
            )}

            {/* Google New User Details Modal */}
            {showGoogleDetailsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-fade-in-up">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-400 font-bold text-xl">
                                {googleUserMeta.name?.charAt(0).toUpperCase()}
                            </div>
                            <h3 className="text-xl font-display font-bold text-white">Complete Your Details</h3>
                            <p className="text-sm text-slate-400 mt-1">Hello <span className="text-white font-semibold">{googleUserMeta.name}</span> ({googleUserMeta.email})! Please provide your information for Admin approval.</p>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl mb-4 text-sm font-semibold">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleGoogleDetailsSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone Number *</label>
                                <input
                                    type="text" required
                                    value={googleForm.phone} onChange={e => setGoogleForm({...googleForm, phone: e.target.value})}
                                    placeholder="Enter 10-digit phone number"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Store Name *</label>
                                <input
                                    type="text" required
                                    value={googleForm.store_name} onChange={e => setGoogleForm({...googleForm, store_name: e.target.value})}
                                    placeholder="Enter Store / Business Name"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Location / Address *</label>
                                <input
                                    type="text" required
                                    value={googleForm.location} onChange={e => setGoogleForm({...googleForm, location: e.target.value})}
                                    placeholder="Enter City / Location"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={googleSubmitLoading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3 rounded-xl mt-2 shadow-lg transition-all disabled:opacity-50"
                            >
                                {googleSubmitLoading ? 'Submitting...' : 'Submit for Approval'}
                            </button>
                        </form>

                        <button
                            type="button"
                            onClick={() => { setShowGoogleDetailsModal(false); setError(''); }}
                            className="w-full mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Login Form */}
            <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 p-10 max-w-md w-full rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] animate-fade-in-up relative">
                <div className="text-center mb-10">
                    <img src="/icon.webp" alt="Logo" className="h-16 w-auto object-contain mx-auto mb-6" />
                    <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
                    <p className="text-slate-400 font-medium">Sign in to your account</p>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2"><svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</div>}

                {fpMsg && forgotStep === 'none' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl mb-6 text-sm font-semibold">
                        ✅ {fpMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Email address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                               className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none" required placeholder="Enter Email"/>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="block text-sm font-semibold text-slate-300">Password</label>
                            <button type="button"
                                onClick={() => { setFpEmail(email); setForgotStep('email'); setFpError(''); setFpMsg(''); }}
                                className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                Forgot password?
                            </button>
                        </div>
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                                   className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none pr-12" required placeholder="Enter Password"/>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                            >
                                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-3.5 rounded-xl mt-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all transform hover:-translate-y-0.5">
                        Sign In
                    </button>
                </form>

                <div className="relative my-6 text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
                    <span className="relative bg-slate-800/90 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Or continue with</span>
                </div>

                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={async (credentialResponse) => {
                            try {
                                setError('');
                                const res = await googleLogin(credentialResponse);
                                if (res && res.isNewUser) {
                                    setGoogleCreds(credentialResponse);
                                    setGoogleUserMeta({ name: res.name, email: res.email });
                                    setShowGoogleDetailsModal(true);
                                }
                            } catch (err) {
                                setError(err.response?.data?.error || 'Google login failed');
                            }
                        }}
                        onError={() => {
                            setError('Google login failed. Please try again.');
                        }}
                        theme="filled_blue"
                        shape="pill"
                        size="large"
                    />
                </div>

                <div className="mt-8 text-center text-sm font-medium text-slate-400">
                    Don't have an account? <Link to="/register" className="text-white hover:text-indigo-400 transition-colors ml-1">Create one</Link>
                </div>
            </div>
        </div>
    );
};
export default Login;
