import { useState, useEffect, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { format, isToday, isThisMonth, parseISO, startOfDay, endOfDay } from 'date-fns';
import ImageModal from '../components/ImageModal';
import { FiEye, FiEyeOff, FiSearch, FiX, FiPieChart, FiPlus, FiTrash2, FiCheckCircle, FiUploadCloud } from 'react-icons/fi';
import { API_URL } from '../config';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const [updates, setUpdates] = useState([]);
    const [showUserForm, setShowUserForm] = useState(false);
    const [userFormData, setUserFormData] = useState({ name: '', email: '', password: '', phone: '', store_name: '', location: '', role: 'engineer' });
    const [userMessage, setUserMessage] = useState('');
    const [showUserPassword, setShowUserPassword] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [allUsers, setAllUsers] = useState([]);
    // Filters & Search
    const [globalSearch, setGlobalSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    // User detail modal
    const [selectedUser, setSelectedUser] = useState(null);
    // Comments state
    const [commentText, setCommentText] = useState('');
    
    // Settings state
    const [settingsFormData, setSettingsFormData] = useState({ smtp_email: '', smtp_password: '', admin_notification_email: '' });
    const [settingsMessage, setSettingsMessage] = useState('');
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    // Stats state
    const [stats, setStats] = useState(null);
    // Engineer performance filter
    const [engFrom, setEngFrom] = useState('');
    const [engTo, setEngTo] = useState('');
    // Engineer ticket view filter
    const [engFilterId, setEngFilterId] = useState(null);
    const [engFilterName, setEngFilterName] = useState('');

    // Admin Raise Ticket Modal State
    const [showRaiseTicketModal, setShowRaiseTicketModal] = useState(false);
    const [raiseTicketFormData, setRaiseTicketFormData] = useState({
        name: '',
        phone: '',
        store_name: '',
        location: '',
        software_version: '',
        description: '',
        assigned_engineer_id: ''
    });
    const [raiseTicketScreenshots, setRaiseTicketScreenshots] = useState([]);
    const [raiseTicketLoading, setRaiseTicketLoading] = useState(false);
    const [raiseTicketMessage, setRaiseTicketMessage] = useState('');

    // Admin Rating State
    const [adminRating, setAdminRating] = useState(0);
    const [adminHoverRating, setAdminHoverRating] = useState(0);
    const [adminFeedback, setAdminFeedback] = useState('');
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [ratingSuccessMessage, setRatingSuccessMessage] = useState('');

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/settings`);
            setSettingsFormData(prev => ({ ...prev, ...res.data }));
        } catch (error) {
            console.error('Failed to fetch settings');
        }
    };

    const fetchData = async () => {
        try {
            const usersRes = await axios.get(`${API_URL}/api/auth/users`);
            setAllUsers(usersRes.data || []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
        try {
            const engineersRes = await axios.get(`${API_URL}/api/auth/engineers`);
            setEngineers(engineersRes.data || []);
        } catch (error) {
            console.error('Failed to fetch engineers:', error);
        }
    };

    const fetchTickets = async () => {
        if(activeTab === 'overview' || activeTab === 'settings') return;
        try {
            const res = await axios.get(`${API_URL}/api/tickets?role=admin&tab=${activeTab}`);
            setTickets(res.data || []);
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
        }
    };

    const fetchStats = async (from = '', to = '') => {
        try {
            const params = new URLSearchParams();
            if (from) params.append('from', from);
            if (to) params.append('to', to);
            const res = await axios.get(`${API_URL}/api/tickets/stats?${params.toString()}`);
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    useEffect(() => {
        fetchData();
        if (activeTab === 'settings') {
            fetchSettings();
        } else if (activeTab === 'overview') {
            fetchStats();
        } else {
            fetchTickets();
        }
    }, [activeTab]);

    // Unified client-side filtering
    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            // Status filter
            if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
            // Engineer filter (from performance table click)
            if (engFilterId && ticket.assigned_engineer_id !== engFilterId) return false;
            // Calendar date range filter
            if (dateFrom) {
                const ticketDate = new Date(ticket.created_at);
                const from = startOfDay(new Date(dateFrom));
                if (ticketDate < from) return false;
            }
            if (dateTo) {
                const ticketDate = new Date(ticket.created_at);
                const to = endOfDay(new Date(dateTo));
                if (ticketDate > to) return false;
            }
            // Global search: customer name OR salesman name
            if (globalSearch.trim()) {
                const q = globalSearch.toLowerCase();
                const matchCustomer = ticket.customer_name?.toLowerCase().includes(q);
                const matchSalesman = ticket.salesman_name?.toLowerCase().includes(q);
                if (!matchCustomer && !matchSalesman) return false;
            }
            return true;
        });
    }, [tickets, statusFilter, engFilterId, dateFrom, dateTo, globalSearch]);

    // Filtered customers for customers tab
    const filteredCustomers = useMemo(() => {
        return allUsers.filter(u => {
            if (u.role !== 'customer') return false;
            if (globalSearch.trim() && !u.name?.toLowerCase().includes(globalSearch.toLowerCase()) && !u.email?.toLowerCase().includes(globalSearch.toLowerCase())) return false;
            return true;
        });
    }, [allUsers, globalSearch]);

    const fetchUpdates = async (ticketId) => {
        const res = await axios.get(`${API_URL}/api/tickets/${ticketId}/updates`);
        setUpdates(res.data);
    };

    const handleTicketClick = (ticket) => {
        setSelectedTicket(ticket);
        fetchUpdates(ticket.id);
        setCommentText('');
        setAdminRating(ticket.engineer_rating || 0);
        setAdminFeedback(ticket.engineer_feedback || '');
        setRatingSuccessMessage('');
    };

    const handleSubmitAdminRating = async (ticketId) => {
        if (!adminRating) {
            alert('Please select a star rating (1 to 5)');
            return;
        }
        setRatingSubmitting(true);
        setRatingSuccessMessage('');
        try {
            await axios.post(`${API_URL}/api/tickets/${ticketId}/rate`, {
                rating: adminRating,
                feedback: adminFeedback
            });
            setRatingSuccessMessage('Rating submitted successfully!');
            if (selectedTicket && selectedTicket.id === ticketId) {
                setSelectedTicket(prev => ({
                    ...prev,
                    engineer_rating: adminRating,
                    engineer_feedback: adminFeedback
                }));
            }
            fetchTickets();
            setTimeout(() => setRatingSuccessMessage(''), 2000);
        } catch (error) {
            alert('Failed to submit rating');
        } finally {
            setRatingSubmitting(false);
        }
    };

    const handlePostComment = async () => {
        if (!commentText.trim() || !selectedTicket) return;
        try {
            await axios.post(`${API_URL}/api/tickets/${selectedTicket.id}/comments`, {
                user_id: user.id,
                message: commentText
            });
            setCommentText('');
            fetchUpdates(selectedTicket.id);
        } catch (error) {
            console.error('Failed to post comment', error);
        }
    };

    const handleAssign = async (ticketId, engineerId, e) => {
        e.stopPropagation();
        if (!engineerId) return;
        await axios.put(`${API_URL}/api/tickets/${ticketId}/assign`, { engineer_id: engineerId });
        fetchTickets();
    };

    const handleStatusChange = async (status) => {
        await axios.put(`${API_URL}/api/tickets/${selectedTicket.id}/status`, { status });
        setSelectedTicket(null);
        if (status === 'closed') {
            setActiveTab('history');
        } else {
            fetchTickets();
        }
    };

    const handleDeleteTicket = async (ticketId, e) => {
        if (e) e.stopPropagation();
        if (window.confirm('Are you sure you want to PERMANENTLY DELETE this ticket? This action cannot be undone.')) {
            try {
                await axios.delete(`${API_URL}/api/tickets/${ticketId}`);
                if (selectedTicket && selectedTicket.id === ticketId) {
                    setSelectedTicket(null);
                }
                fetchTickets();
            } catch (error) {
                alert('Failed to delete ticket: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    const handleUpdateStatus = async (ticketId, status, message) => {
        try {
            await axios.put(`${API_URL}/api/tickets/${ticketId}/status`, {
                status,
                message: message || `Status changed to ${status} by Admin`,
                user_id: user.id
            });
            if (selectedTicket && selectedTicket.id === ticketId) {
                setSelectedTicket(prev => prev ? { ...prev, status } : null);
            }
            fetchTickets();
        } catch (error) {
            alert('Failed to update ticket status');
        }
    };

    const handleAdminRaiseTicket = async (e) => {
        e.preventDefault();
        setRaiseTicketLoading(true);
        setRaiseTicketMessage('');

        const formData = new FormData();
        formData.append('admin_id', user.id);
        formData.append('name', raiseTicketFormData.name);
        formData.append('phone', raiseTicketFormData.phone);
        formData.append('store_name', raiseTicketFormData.store_name);
        formData.append('location', raiseTicketFormData.location);
        formData.append('software_version', raiseTicketFormData.software_version);
        formData.append('description', raiseTicketFormData.description);
        if (raiseTicketFormData.assigned_engineer_id) {
            formData.append('assigned_engineer_id', raiseTicketFormData.assigned_engineer_id);
        }
        for (let i = 0; i < raiseTicketScreenshots.length; i++) {
            formData.append('screenshots', raiseTicketScreenshots[i]);
        }

        try {
            await axios.post(`${API_URL}/api/tickets/admin`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setRaiseTicketMessage('Ticket raised successfully by Admin!');
            setRaiseTicketFormData({ name: '', phone: '', store_name: '', location: '', software_version: '', description: '', assigned_engineer_id: '' });
            setRaiseTicketScreenshots([]);
            fetchTickets();
            setTimeout(() => {
                setShowRaiseTicketModal(false);
                setRaiseTicketMessage('');
            }, 1500);
        } catch (error) {
            setRaiseTicketMessage(error.response?.data?.error || 'Failed to raise ticket');
        } finally {
            setRaiseTicketLoading(false);
        }
    };

    const handleArchive = async (id) => {
        if (window.confirm('Remove this ticket from the active dashboard?')) {
            await axios.put(`${API_URL}/api/tickets/${id}/archive`);
            if (selectedTicket && selectedTicket.id === id) {
                setSelectedTicket(null);
            }
            fetchTickets();
        }
    };

    const handleUserStatus = async (userId, status) => {
        await axios.put(`${API_URL}/api/auth/users/${userId}/status`, { account_status: status });
        fetchData();
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user? This cannot be undone.')) {
            try {
                await axios.delete(`${API_URL}/api/auth/users/${userId}`);
                fetchData();
            } catch (err) {
                alert('Failed to delete user: ' + (err.response?.data?.error || err.message));
            }
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/api/auth/register`, userFormData);
            setUserMessage('User created successfully!');
            setUserFormData({ name: '', email: '', password: '', phone: '', store_name: '', location: '', role: 'engineer' });
            fetchData(); 
            setTimeout(() => { setShowUserForm(false); setUserMessage(''); }, 2000);
        } catch (error) {
            setUserMessage(error.response?.data?.error || 'Failed to create user');
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/api/settings`, settingsFormData);
            setSettingsMessage('Settings saved successfully!');
            setTimeout(() => setSettingsMessage(''), 3000);
        } catch (error) {
            setSettingsMessage(error.response?.data?.details || error.response?.data?.error || 'Failed to save settings.');
            setTimeout(() => setSettingsMessage(''), 3000);
        }
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            'open': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'pending': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            'solve_requested': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            'closed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            'not_solved': 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        };
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${styles[status] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>{status.replace('_', ' ')}</span>;
    };

    return (
        <div className="animate-fade-in relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-slate-700">
                            <h2 className="text-xl font-display font-bold text-white capitalize">{selectedUser.role} Details</h2>
                            <button onClick={() => setSelectedUser(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><FiX /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                    {selectedUser.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-white">{selectedUser.name}</div>
                                    <div className="text-xs font-bold px-2 py-0.5 rounded border mt-1 w-fit bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider">{selectedUser.account_status?.replace(/_/g, ' ')}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Email', value: selectedUser.email },
                                    { label: 'Phone', value: selectedUser.phone || 'Not Provided' },
                                    { label: 'Store Name', value: selectedUser.store_name || 'N/A' },
                                    { label: 'Location / Address', value: selectedUser.location || 'N/A' },
                                    { label: 'Member Since', value: selectedUser.created_at ? format(new Date(selectedUser.created_at), 'dd MMM yyyy') : 'N/A' },
                                    { label: 'Role', value: selectedUser.role },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
                                        <div className="text-sm font-semibold text-slate-200 break-words">{value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 pt-0 flex gap-3">
                            {selectedUser.account_status === 'pending_approval' ? (
                                <>
                                    <button onClick={() => { handleUserStatus(selectedUser.id, 'active'); setSelectedUser(null); }} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">Approve</button>
                                    <button onClick={() => { handleUserStatus(selectedUser.id, 'declined'); setSelectedUser(null); }} className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">Decline</button>
                                </>
                            ) : selectedUser.account_status === 'active' ? (
                                <button onClick={() => { handleUserStatus(selectedUser.id, 'inactive'); setSelectedUser({...selectedUser, account_status: 'inactive'}); }} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">Deactivate</button>
                            ) : (
                                <button onClick={() => { handleUserStatus(selectedUser.id, 'active'); setSelectedUser({...selectedUser, account_status: 'active'}); }} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">Activate</button>
                            )}
                            <button onClick={() => { if(window.confirm(`Delete this ${selectedUser.role}?`)) { handleDeleteUser(selectedUser.id); setSelectedUser(null); } }} className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white tracking-tight">Admin Dashboard</h1>
                    <p className="text-slate-400 mt-1">Manage tickets, assign engineers, and raise tickets</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowRaiseTicketModal(true)} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] text-sm flex items-center gap-2"
                    >
                        <FiPlus size={16} /> Raise Ticket
                    </button>
                    <button 
                        onClick={() => setShowUserForm(!showUserForm)} 
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] text-sm"
                    >
                        {showUserForm ? 'Close Form' : '+ Add User'}
                    </button>
                </div>
            </div>

            {/* Global Search Bar */}
            <div className="relative mb-6">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder={activeTab === 'customers' ? 'Search customers by name or email...' : 'Search tickets by customer or sales executive name...'}
                    value={globalSearch}
                    onChange={e => setGlobalSearch(e.target.value)}
                    className="w-full bg-slate-800/60 backdrop-blur-md border border-slate-700 text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                />
                {globalSearch && (
                    <button onClick={() => setGlobalSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                        <FiX size={16} />
                    </button>
                )}
            </div>

            <div className="flex bg-slate-900/60 p-1.5 rounded-2xl w-full mb-8 border border-slate-700/50 overflow-x-auto whitespace-nowrap gap-1 custom-scrollbar">
                <button 
                    onClick={() => { setActiveTab('overview'); setSelectedTicket(null); }} 
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'} flex items-center gap-2`}
                >
                    <FiPieChart /> Overview
                </button>
                <button 
                    onClick={() => { setActiveTab('active'); setSelectedTicket(null); }} 
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${activeTab === 'active' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                    Active Tickets
                </button>
                <button 
                    onClick={() => { setActiveTab('history'); setSelectedTicket(null); }} 
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                    History
                </button>
                <button 
                    onClick={() => { setActiveTab('approvals'); setSelectedTicket(null); }} 
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${activeTab === 'approvals' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'} flex items-center gap-2`}
                >
                    Approvals {allUsers.filter(u => u.account_status === 'pending_approval' && u.role === 'customer').length > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{allUsers.filter(u => u.account_status === 'pending_approval' && u.role === 'customer').length}</span>}
                </button>
                <button 
                    onClick={() => { setActiveTab('engineers'); setSelectedTicket(null); }} 
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${activeTab === 'engineers' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                    Engineers
                </button>
                <button 
                    onClick={() => { setActiveTab('salesmen'); setSelectedTicket(null); }} 
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${activeTab === 'salesmen' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                    Sales Executives
                </button>
                <button 
                    onClick={() => { setActiveTab('customers'); setSelectedTicket(null); }} 
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${activeTab === 'customers' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                    Customers
                </button>
                <button 
                    onClick={() => { setActiveTab('settings'); setSelectedTicket(null); }} 
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'}`}
                >
                    Settings
                </button>
            </div>

            {showUserForm && (
                <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl mb-8 animate-fade-in-up relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-400"></div>
                    <h2 className="text-lg font-display font-bold mb-6 text-white">Create New User Profile</h2>
                    
                    {userMessage && <div className={`p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2 ${userMessage.includes('successfully') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>{userMessage}</div>}
                    
                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Role</label>
                            <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm">
                                <option value="engineer">Engineer</option>
                                <option value="sales_executive">Sales Executive</option>
                                <option value="customer">Customer</option>
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Full Name</label>
                            <input type="text" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm" required placeholder="Name" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Email</label>
                            <input type="email" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm" required placeholder="Email" />
                        </div>
                        <div className="md:col-span-1 relative">
                            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Password</label>
                            <input type={showUserPassword ? "text" : "password"} value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl pr-10 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm" required placeholder="Password" />
                            <button type="button" onClick={() => setShowUserPassword(!showUserPassword)} className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-200">
                                {showUserPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                        </div>
                        
                        {userFormData.role === 'customer' && (
                            <>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Phone</label>
                                    <input type="text" value={userFormData.phone} onChange={e => setUserFormData({...userFormData, phone: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm" placeholder="Phone Number" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Location / Address</label>
                                    <input type="text" value={userFormData.location} onChange={e => setUserFormData({...userFormData, location: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm" placeholder="Location" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Store Name</label>
                                    <input type="text" value={userFormData.store_name} onChange={e => setUserFormData({...userFormData, store_name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm" placeholder="Store Name" />
                                </div>
                            </>
                        )}
                        <div className="md:col-span-4 flex items-end justify-end mt-2">
                            <button type="submit" className="bg-white text-slate-900 hover:bg-slate-200 px-8 py-2.5 rounded-xl font-bold transition-all text-sm">Create {userFormData.role.charAt(0).toUpperCase() + userFormData.role.slice(1)}</button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'overview' && stats && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div 
                            className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 shadow-lg cursor-pointer hover:bg-slate-700 transition-colors"
                            onClick={() => { setActiveTab('active'); setStatusFilter('all'); setSelectedTicket(null); }}
                        >
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Tickets</h3>
                            <p className="text-3xl font-display font-bold text-white">
                                {stats?.ticketStats?.reduce((sum, item) => sum + Number(item.count), 0) || 0}
                            </p>
                        </div>
                        {stats?.userStats?.map((u) => {
                            const isClickable = u.role !== 'admin';
                            const handleClick = () => {
                                if (!isClickable) return;
                                if (u.role === 'sales_executive') setActiveTab('salesmen');
                                else if (u.role === 'engineer') setActiveTab('engineers');
                                else if (u.role === 'customer') setActiveTab('customers');
                                setSelectedTicket(null);
                            };
                            return (
                                <div 
                                    key={u.role} 
                                    className={`bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 shadow-lg ${isClickable ? 'cursor-pointer hover:bg-slate-700 transition-colors' : ''}`}
                                    onClick={handleClick}
                                >
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{u.role.replace('_', ' ')}s</h3>
                                    <p className="text-3xl font-display font-bold text-white">{u.count}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                        {stats?.ticketStats?.map((t) => {
                            const handleClick = () => {
                                if (t.status === 'closed') {
                                    setActiveTab('history');
                                } else {
                                    setActiveTab('active');
                                }
                                setStatusFilter(t.status);
                                setSelectedTicket(null);
                            };
                            return (
                                <div 
                                    key={t.status} 
                                    className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 shadow-lg cursor-pointer hover:bg-slate-700 transition-colors"
                                    onClick={handleClick}
                                >
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{t.status.replace('_', ' ')} Tickets</h3>
                                    <p className="text-3xl font-display font-bold text-white">{t.count}</p>
                                </div>
                            );
                        })}
                    </div>

                    {stats?.engineerStats && stats.engineerStats.length > 0 && (
                        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-xl mt-8 flex flex-col items-center text-center">
                            <div className="w-full flex flex-col items-center justify-center text-center mb-6 pb-6 border-b border-slate-700/50">
                                <h2 className="text-2xl font-display font-bold text-white tracking-tight">Engineer Performance</h2>
                                <p className="text-xs text-slate-400 mt-1 font-medium">
                                    {!engFrom && !engTo ? 'Showing stats for Last 30 Days (default)' : `Filtered Range: ${engFrom || 'Start'} to ${engTo || 'Today'}`}
                                </p>
                                
                                <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50 mt-4">
                                    <div className="flex items-center gap-2 px-2">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">From</span>
                                        <input
                                            type="date"
                                            value={engFrom}
                                            onChange={e => { setEngFrom(e.target.value); fetchStats(e.target.value, engTo); }}
                                            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-indigo-500 transition-colors min-w-[140px] text-center [color-scheme:dark]"
                                        />
                                    </div>
                                    
                                    <div className="flex items-center gap-2 px-2">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">To</span>
                                        <input
                                            type="date"
                                            value={engTo}
                                            onChange={e => { setEngTo(e.target.value); fetchStats(engFrom, e.target.value); }}
                                            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl outline-none focus:border-indigo-500 transition-colors min-w-[140px] text-center [color-scheme:dark]"
                                        />
                                    </div>
                                    
                                    {(engFrom || engTo) && (
                                        <button
                                            onClick={() => { setEngFrom(''); setEngTo(''); fetchStats('', ''); }}
                                            className="text-xs font-bold text-rose-400 hover:text-rose-300 px-3.5 py-2 border border-rose-500/30 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                                        >
                                            Clear Filter
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="w-full max-w-3xl overflow-x-auto rounded-2xl border border-slate-700/40 shadow-inner">
                                <table className="w-full divide-y divide-slate-700/50">
                                    <thead className="bg-slate-900/70">
                                        <tr>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Engineer Name</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Tickets Solved / Closed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30 bg-slate-900/20 text-center">
                                        {stats.engineerStats.map((eng) => (
                                            <tr key={eng.id} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-sm font-semibold text-slate-200">{eng.name}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => {
                                                            if (Number(eng.resolved_count) === 0) return;
                                                            setEngFilterId(eng.id);
                                                            setEngFilterName(eng.name);
                                                            setActiveTab('history');
                                                            setStatusFilter('closed');
                                                            setSelectedTicket(null);
                                                        }}
                                                        disabled={Number(eng.resolved_count) === 0}
                                                        className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-bold border transition-all
                                                            ${Number(eng.resolved_count) > 0
                                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer shadow-sm'
                                                                : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        {eng.resolved_count} {eng.resolved_count === 1 ? 'Ticket' : 'Tickets'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {(activeTab === 'active' || activeTab === 'history') && (
            <div className="flex flex-col lg:flex-row gap-6 relative">
                <div className={`flex-1 ${selectedTicket ? 'hidden lg:block lg:w-3/5 xl:w-2/3' : 'w-full'}`}>

                    {/* Filter Bar with Calendar Date Range */}
                    <div className="flex flex-wrap gap-3 mb-4 items-center">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-slate-900/60 border border-slate-700 text-slate-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                        >
                            <option value="all">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="pending">Pending</option>
                            <option value="solve_requested">Solve Requested</option>
                            <option value="closed">Closed</option>
                            <option value="not_solved">Not Solved</option>
                        </select>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">From</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                className="bg-slate-900/60 border border-slate-700 text-slate-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">To</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                className="bg-slate-900/60 border border-slate-700 text-slate-200 text-sm px-3 py-2.5 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        {(statusFilter !== 'all' || dateFrom || dateTo || globalSearch) && (
                            <button onClick={() => { setStatusFilter('all'); setDateFrom(''); setDateTo(''); setGlobalSearch(''); setEngFilterId(null); setEngFilterName(''); }} className="text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-2.5 border border-rose-500/20 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 transition-colors">
                                Clear All
                            </button>
                        )}
                        <span className="text-xs text-slate-500 font-semibold ml-auto">{filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}</span>
                    </div>

                    {engFilterId && (
                        <div className="flex items-center gap-3 mb-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-3">
                            <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                            <span className="text-sm text-indigo-300 font-semibold">Filter: <span className="text-white">{engFilterName}</span> ke closed tickets dikh rahe hain</span>
                            <button onClick={() => { setEngFilterId(null); setEngFilterName(''); setStatusFilter('all'); }}
                                className="ml-auto text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                                Remove Filter
                            </button>
                        </div>
                    )}

                    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-700/50">
                                <thead className="bg-slate-900/40">
                                    <tr>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Ticket</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer / Raised By</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date & Time</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Assignment</th>
                                        <th className="px-5 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    {filteredTickets.map((ticket, index) => (
                                        <tr key={ticket.id} onClick={() => handleTicketClick(ticket)} className={`hover:bg-slate-700/30 cursor-pointer transition-colors animate-fade-in-up ${selectedTicket?.id === ticket.id ? 'bg-indigo-500/5 border-l-2 border-l-indigo-500' : 'border-l-2 border-l-transparent'}`} style={{animationDelay: `${index * 30}ms`}}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-mono bg-slate-900/50 border border-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">#{ticket.customer_ticket_no || ticket.id}</span>
                                                </div>
                                                <div className="text-sm font-semibold text-slate-200 truncate max-w-[200px]">{ticket.description}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-sm font-semibold text-slate-200">{ticket.customer_name}</div>
                                                <div className="text-xs font-medium text-slate-400">{ticket.customer_phone || 'No phone'}</div>
                                                <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[150px]">{ticket.store_name}</div>
                                                {ticket.raised_by_engineer_name ? (
                                                    <div className="text-[10px] font-bold text-emerald-400 mt-1 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                                                        Raised By: Engineer ({ticket.raised_by_engineer_name})
                                                    </div>
                                                ) : ticket.admin_name ? (
                                                    <div className="text-[10px] font-bold text-purple-400 mt-1 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>
                                                        Raised By: Admin ({ticket.admin_name})
                                                    </div>
                                                ) : ticket.salesman_name ? (
                                                    <div className="text-[10px] font-bold text-amber-400 mt-1 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                                                        Raised By: Sales Exec ({ticket.salesman_name})
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] font-bold text-indigo-400 mt-1 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"></span>
                                                        Raised By: Customer (Direct)
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-slate-200">{format(new Date(ticket.created_at), 'dd MMM yyyy')}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{format(new Date(ticket.created_at), 'hh:mm a')}</div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <StatusBadge status={ticket.status} />
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <select 
                                                    value={ticket.assigned_engineer_id || ''} 
                                                    onChange={(e) => handleAssign(ticket.id, e.target.value, e)}
                                                    className="w-full max-w-[160px] bg-slate-900/50 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                                    disabled={ticket.status === 'closed'}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {engineers.map(eng => (
                                                        <option key={eng.id} value={eng.id}>{eng.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => handleDeleteTicket(ticket.id, e)}
                                                    title="Delete Ticket"
                                                    className="p-2 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors"
                                                >
                                                    <FiTrash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTickets.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                                <div className="text-center text-slate-500 font-medium py-8">
                                                    {tickets.length > 0 ? 'No tickets match your filters.' : activeTab === 'active' ? 'No active tickets found.' : 'No ticket history.'}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {selectedTicket && (
                    <div className="w-full lg:w-2/5 xl:w-1/3">
                        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl sticky top-24 max-h-[85vh] overflow-y-auto animate-fade-in custom-scrollbar shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-lg font-display font-bold text-white">Ticket Details</h2>
                                            <span className="text-xs font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-700">#{selectedTicket.customer_ticket_no || selectedTicket.id}</span>
                                        </div>
                                        <span className="text-xs font-medium text-slate-400">{format(new Date(selectedTicket.created_at), 'PPP')}</span>
                                    </div>
                                    <button onClick={() => setSelectedTicket(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">&times;</button>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/40">
                                        <div className="grid grid-cols-2 gap-y-3 text-xs">
                                            <div className="text-slate-500 font-bold uppercase tracking-wider">Customer</div>
                                            <div className="font-semibold text-slate-200 text-right">{selectedTicket.customer_name}</div>
                                            
                                            <div className="text-slate-500 font-bold uppercase tracking-wider">Phone</div>
                                            <div className="font-semibold text-slate-200 text-right">{selectedTicket.customer_phone || 'N/A'}</div>
                                            
                                            <div className="text-slate-500 font-bold uppercase tracking-wider">Store</div>
                                            <div className="font-semibold text-slate-200 text-right">{selectedTicket.store_name || 'N/A'}</div>
                                            
                                            <div className="text-slate-500 font-bold uppercase tracking-wider">Location</div>
                                            <div className="font-semibold text-slate-200 text-right">{selectedTicket.customer_location || 'N/A'}</div>

                                            <div className="text-slate-500 font-bold uppercase tracking-wider">Created At</div>
                                            <div className="font-semibold text-slate-200 text-right">{format(new Date(selectedTicket.created_at), 'MMM dd, yyyy h:mm a')}</div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h3 className="font-semibold text-slate-300 mb-2 text-sm">Description</h3>
                                        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/40">
                                            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                                        </div>
                                        {selectedTicket.screenshot_url && (
                                            <div className="mt-6">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attachments</h4>
                                                <div className="flex flex-wrap gap-3">
                                                    {selectedTicket.screenshot_url.split(',').map((url, i) => (
                                                        <img 
                                                            key={i}
                                                            src={`${API_URL}${url}`} 
                                                            alt={`Screenshot ${i+1}`} 
                                                            className="rounded-xl border border-slate-700/40 shadow-lg max-h-32 w-auto object-contain bg-slate-900/40 p-1 cursor-pointer hover:opacity-80 transition-opacity" 
                                                            onClick={() => setFullScreenImage(`${API_URL}${url}`)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {updates.length > 0 && (
                                        <div className="border-t border-slate-700 pt-6">
                                            <h3 className="font-semibold text-slate-300 mb-4 text-sm">Activity Timeline</h3>
                                            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-px before:bg-slate-700">
                                                {updates.map(update => (
                                                    <div key={update.id} className="relative flex items-start gap-4">
                                                        <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-800 bg-indigo-500/20 text-indigo-400 font-bold text-xs shrink-0 relative z-10">
                                                            {update.user_name.charAt(0)}
                                                        </div>
                                                        <div className="flex-1 bg-slate-900/40 p-3 rounded-xl border border-slate-700/40">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <div className="font-semibold text-slate-200 text-xs">{update.user_name}</div>
                                                                <div className="text-[9px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded uppercase">{update.user_role}</div>
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 font-medium mb-1.5">{format(new Date(update.created_at), 'MMM dd, HH:mm')}</div>
                                                            <p className="text-xs text-slate-300">{update.message}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedTicket.assigned_engineer_id && (
                                        <div className="border-t border-slate-700 pt-6 mt-6">
                                            <h3 className="font-semibold text-slate-300 mb-3 text-sm flex items-center justify-between">
                                                <span>Engineer Rating & Feedback</span>
                                                {selectedTicket.engineer_rating ? (
                                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Rated: {selectedTicket.engineer_rating}/5 ★</span>
                                                ) : (
                                                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Pending Rating</span>
                                                )}
                                            </h3>

                                            <div className="bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-slate-700/50 space-y-4">
                                                {ratingSuccessMessage && (
                                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
                                                        {ratingSuccessMessage}
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                                        Rate Engineer Performance ({selectedTicket.engineer_name || 'Assigned Engineer'})
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                                key={star}
                                                                type="button"
                                                                onClick={() => setAdminRating(star)}
                                                                onMouseEnter={() => setAdminHoverRating(star)}
                                                                onMouseLeave={() => setAdminHoverRating(0)}
                                                                className="text-2xl transition-transform transform hover:scale-125 focus:outline-none"
                                                            >
                                                                <span className={(adminHoverRating || adminRating) >= star ? 'text-yellow-400' : 'text-slate-600'}>
                                                                    ★
                                                                </span>
                                                            </button>
                                                        ))}
                                                        <span className="ml-2 text-xs font-bold text-slate-300">
                                                            {adminRating > 0 ? `${adminRating} / 5 Stars` : 'Select stars'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Feedback / Review Notes</label>
                                                    <textarea
                                                        value={adminFeedback}
                                                        onChange={(e) => setAdminFeedback(e.target.value)}
                                                        placeholder="Enter review or feedback for the engineer's work..."
                                                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 transition-colors h-20 resize-none"
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSubmitAdminRating(selectedTicket.id)}
                                                    disabled={ratingSubmitting}
                                                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {selectedTicket.engineer_rating ? 'Update Engineer Rating' : 'Submit Engineer Rating'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-8 border-t border-slate-700/50 relative z-10">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Admin Actions</h3>
                                    
                                    {activeTab === 'active' ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                {selectedTicket.status === 'solve_requested' && (
                                                    <button onClick={() => handleStatusChange('closed')} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-6 py-3 rounded-xl font-bold flex-1 transition-colors text-sm">
                                                        Approve & Close Ticket
                                                    </button>
                                                )}
                                                {selectedTicket.status !== 'closed' && (
                                                    <button onClick={() => handleStatusChange('closed')} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-3 rounded-xl font-bold flex-1 transition-colors text-sm border border-slate-600">
                                                        Force Close Ticket
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {/* Add Reply Box */}
                                            {selectedTicket.status !== 'closed' && (
                                                <div className="mt-4 border-t border-slate-700 pt-4">
                                                    <textarea 
                                                        value={commentText} 
                                                        onChange={(e) => setCommentText(e.target.value)}
                                                        placeholder="Write a reply..."
                                                        className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl h-20 resize-none focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none custom-scrollbar text-sm mb-3"
                                                    />
                                                    <button 
                                                        onClick={handlePostComment}
                                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-md text-sm"
                                                    >
                                                        Post Reply
                                                    </button>
                                                </div>
                                            )}
                                            {selectedTicket.status === 'closed' && (
                                                <button onClick={() => handleArchive(selectedTicket.id)} className="w-full bg-slate-700/50 hover:bg-slate-600 border border-slate-600 text-slate-200 font-semibold px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-4">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                                    Archive Ticket
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 italic bg-slate-900/30 p-4 rounded-xl border border-slate-700/30">Ticket is in history and cannot be modified.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            )}

            {activeTab === 'approvals' && (
                <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700/50">
                            <thead className="bg-slate-900/40">
                                <tr>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</th>
                                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {allUsers.filter(u => u.account_status === 'pending_approval' && u.role === 'customer').map((user) => (
                                    <tr key={user.id} onClick={() => setSelectedUser(user)} className="hover:bg-slate-700/30 cursor-pointer transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-200">{user.name}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-sm text-slate-300">{user.email}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-sm text-slate-300">{user.location || 'N/A'}</div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); handleUserStatus(user.id, 'active'); }} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg font-bold text-xs mr-2 transition-colors">Approve</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleUserStatus(user.id, 'declined'); }} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-lg font-bold text-xs transition-colors">Decline</button>
                                        </td>
                                    </tr>
                                ))}
                                {allUsers.filter(u => u.account_status === 'pending_approval' && u.role === 'customer').length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-medium">No pending approvals.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'engineers' && (
                <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700/50">
                            <thead className="bg-slate-900/40">
                                <tr>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Engineer</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {allUsers.filter(u => u.role === 'engineer').map((user) => (
                                    <tr key={user.id} onClick={() => setSelectedUser(user)} className="hover:bg-slate-700/30 transition-colors cursor-pointer">
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-200">{user.name}</div>
                                            <div className="text-xs text-slate-400">{user.email}</div>
                                            <div className="text-xs font-medium text-slate-500 mt-0.5">{user.phone || 'No phone'}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${user.account_status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                                {user.account_status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            {user.account_status === 'active' ? (
                                                <button onClick={() => handleUserStatus(user.id, 'inactive')} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-lg font-bold text-xs mr-2 transition-colors">Deactivate</button>
                                            ) : (
                                                <button onClick={() => handleUserStatus(user.id, 'active')} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg font-bold text-xs mr-2 transition-colors">Activate</button>
                                            )}
                                            <button onClick={() => { if(window.confirm('Delete?')) handleDeleteUser(user.id); }} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-lg font-bold text-xs transition-colors">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {allUsers.filter(u => u.role === 'engineer').length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-12 text-center text-slate-500 font-medium">No engineers found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            
            {activeTab === 'salesmen' && (
                <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700/50">
                            <thead className="bg-slate-900/40">
                                <tr>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Sales Executive</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {allUsers.filter(u => u.role === 'sales_executive').map((user) => (
                                    <tr key={user.id} onClick={() => setSelectedUser(user)} className="hover:bg-slate-700/30 transition-colors cursor-pointer">
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-200">{user.name}</div>
                                            <div className="text-xs text-slate-400">{user.email}</div>
                                            <div className="text-xs font-medium text-slate-500 mt-0.5">{user.phone || 'No phone'}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${user.account_status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                                {user.account_status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            {user.account_status === 'active' ? (
                                                <button onClick={() => handleUserStatus(user.id, 'inactive')} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-lg font-bold text-xs mr-2 transition-colors">Deactivate</button>
                                            ) : (
                                                <button onClick={() => handleUserStatus(user.id, 'active')} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg font-bold text-xs mr-2 transition-colors">Activate</button>
                                            )}
                                            <button onClick={() => { if(window.confirm('Delete?')) handleDeleteUser(user.id); }} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-lg font-bold text-xs transition-colors">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {allUsers.filter(u => u.role === 'sales_executive').length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-12 text-center text-slate-500 font-medium">No sales executives found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'customers' && (
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs text-slate-500 font-semibold">{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-700/50">
                                <thead className="bg-slate-900/40">
                                    <tr>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Location / Store</th>
                                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    {filteredCustomers.map((cust) => (
                                        <tr key={cust.id} onClick={() => setSelectedUser(cust)} className="hover:bg-slate-700/30 transition-colors cursor-pointer">
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-slate-200">{cust.name}</div>
                                                <div className="text-xs text-slate-400">{cust.email}</div>
                                                {cust.phone && <div className="text-xs text-slate-500">{cust.phone}</div>}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-sm text-slate-300">{cust.location || 'N/A'}</div>
                                                <div className="text-xs text-slate-500">{cust.store_name || 'N/A'}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cust.account_status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : cust.account_status?.includes('pending') ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                                    {cust.account_status?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                {cust.account_status === 'active' ? (
                                                    <button onClick={() => handleUserStatus(cust.id, 'inactive')} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-lg font-bold text-xs mr-2 transition-colors">Deactivate</button>
                                                ) : (
                                                    <button onClick={() => handleUserStatus(cust.id, 'active')} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg font-bold text-xs mr-2 transition-colors">Activate</button>
                                                )}
                                                <button onClick={() => { if(window.confirm('Delete?')) handleDeleteUser(cust.id); }} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-lg font-bold text-xs transition-colors">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredCustomers.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-medium">
                                                {globalSearch ? 'No customers match your search.' : 'No customers found.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'settings' && (
                <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 max-w-3xl mx-auto shadow-lg">
                    <h2 className="text-xl font-display font-bold text-white mb-2">Email Settings</h2>
                    <p className="text-sm text-slate-400 mb-6">Configure the Gmail account used by the system to send OTPs and Admin alerts. You must use a 16-digit Google App Password, not your regular password.</p>
                    
                    {settingsMessage && (
                        <div className={`p-4 rounded-xl mb-6 text-sm font-semibold border ${settingsMessage.includes('successfully') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            {settingsMessage}
                        </div>
                    )}
                    
                    <form onSubmit={handleSaveSettings} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">System Sender Gmail</label>
                            <input 
                                type="email" 
                                required
                                value={settingsFormData.smtp_email} 
                                onChange={e => setSettingsFormData({...settingsFormData, smtp_email: e.target.value})}
                                placeholder="e.g. support@gmail.com"
                                className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Google App Password (16-digits)</label>
                            <div className="relative">
                                <input 
                                    type={showSmtpPassword ? 'text' : 'password'} 
                                    required
                                    value={settingsFormData.smtp_password} 
                                    onChange={e => setSettingsFormData({...settingsFormData, smtp_password: e.target.value})}
                                    placeholder="xxxx xxxx xxxx xxxx"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-indigo-500 transition-colors"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowSmtpPassword(!showSmtpPassword)} 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                                >
                                    {showSmtpPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-700">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Notification Email</label>
                            <p className="text-xs text-slate-500 mb-3">The email address where all alerts (New Tickets, Approvals) will be sent. Can be the same as the sender above.</p>
                            <input 
                                type="email" 
                                required
                                value={settingsFormData.admin_notification_email} 
                                onChange={e => setSettingsFormData({...settingsFormData, admin_notification_email: e.target.value})}
                                placeholder="e.g. admin@gmail.com"
                                className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div className="pt-4">
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                                Save Email Settings
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showRaiseTicketModal && createPortal(
                <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-fade-in p-4">
                    <div className="min-h-full flex items-center justify-center">
                        <div className="bg-slate-900 border border-slate-700/70 rounded-2xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in-up my-8 relative z-[10000]">
                            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-700/50 bg-slate-800/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                                        <FiPlus size={18} />
                                    </div>
                                    <h2 className="text-xl font-display font-bold text-white">Raise Ticket (Admin)</h2>
                                </div>
                                <button onClick={() => setShowRaiseTicketModal(false)} className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700/60 font-bold">&times;</button>
                            </div>
                            
                            <form onSubmit={handleAdminRaiseTicket} className="p-6 space-y-4">
                                {raiseTicketMessage && (
                                    <div className={`p-3.5 rounded-xl text-sm font-semibold ${raiseTicketMessage.includes('successfully') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                        {raiseTicketMessage}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Customer Phone</label>
                                        <input 
                                            type="text"
                                            value={raiseTicketFormData.phone}
                                            onChange={e => setRaiseTicketFormData({...raiseTicketFormData, phone: e.target.value})}
                                            placeholder="10-digit Phone"
                                            className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Customer Name</label>
                                        <input 
                                            type="text"
                                            value={raiseTicketFormData.name}
                                            onChange={e => setRaiseTicketFormData({...raiseTicketFormData, name: e.target.value})}
                                            placeholder="Full Name"
                                            className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Store / Business Name</label>
                                        <input 
                                            type="text"
                                            value={raiseTicketFormData.store_name}
                                            onChange={e => setRaiseTicketFormData({...raiseTicketFormData, store_name: e.target.value})}
                                            placeholder="e.g. Metro Mart"
                                            className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Location / City</label>
                                        <input 
                                            type="text"
                                            value={raiseTicketFormData.location}
                                            onChange={e => setRaiseTicketFormData({...raiseTicketFormData, location: e.target.value})}
                                            placeholder="e.g. Mumbai"
                                            className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Software Version</label>
                                        <input 
                                            type="text"
                                            value={raiseTicketFormData.software_version}
                                            onChange={e => setRaiseTicketFormData({...raiseTicketFormData, software_version: e.target.value})}
                                            placeholder="e.g. v2.4.1"
                                            className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Assign Engineer (Optional)</label>
                                        <select
                                            value={raiseTicketFormData.assigned_engineer_id}
                                            onChange={e => setRaiseTicketFormData({...raiseTicketFormData, assigned_engineer_id: e.target.value})}
                                            className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                                        >
                                            <option value="">Unassigned (Assign later)</option>
                                            {engineers.map(eng => (
                                                <option key={eng.id} value={eng.id}>{eng.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Issue Description *</label>
                                    <textarea 
                                        required
                                        value={raiseTicketFormData.description}
                                        onChange={e => setRaiseTicketFormData({...raiseTicketFormData, description: e.target.value})}
                                        placeholder="Describe the issue in detail..."
                                        className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Attach Screenshots (Optional)</label>
                                    <input 
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={e => setRaiseTicketScreenshots(e.target.files)}
                                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
                                    />
                                </div>

                                <div className="pt-3 flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowRaiseTicketModal(false)}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={raiseTicketLoading}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
                                    >
                                        {raiseTicketLoading ? 'Raising Ticket...' : 'Submit Ticket'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {fullScreenImage && <ImageModal url={fullScreenImage} onClose={() => setFullScreenImage(null)} />}
        </div>
    );
};
export default AdminDashboard;
