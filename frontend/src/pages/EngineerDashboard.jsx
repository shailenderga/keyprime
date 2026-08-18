import { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import ImageModal from '../components/ImageModal';
import { API_URL } from '../config';
import { FiPlus } from 'react-icons/fi';

const EngineerDashboard = () => {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const [activeTab, setActiveTab] = useState('active');
    const [updates, setUpdates] = useState([]);
    const [commentText, setCommentText] = useState('');

    // Raise Ticket Modal State for Engineer
    const [showRaiseModal, setShowRaiseModal] = useState(false);
    const [raiseFormData, setRaiseFormData] = useState({ name: '', phone: '', store_name: '', location: '', software_version: '', description: '' });
    const [raiseScreenshots, setRaiseScreenshots] = useState([]);
    const [raiseLoading, setRaiseLoading] = useState(false);
    const [raiseMessage, setRaiseMessage] = useState('');

    const fetchTickets = async () => {
        const res = await axios.get(`${API_URL}/api/tickets?role=engineer&userId=${user.id}&tab=${activeTab}`);
        setTickets(res.data);
    };

    useEffect(() => {
        fetchTickets();
    }, [activeTab]);

    const handleEngineerRaiseTicket = async (e) => {
        e.preventDefault();
        setRaiseLoading(true);
        setRaiseMessage('');

        const formData = new FormData();
        formData.append('engineer_id', user.id);
        formData.append('name', raiseFormData.name);
        formData.append('phone', raiseFormData.phone);
        formData.append('store_name', raiseFormData.store_name);
        formData.append('location', raiseFormData.location);
        formData.append('software_version', raiseFormData.software_version);
        formData.append('description', raiseFormData.description);
        for (let i = 0; i < raiseScreenshots.length; i++) {
            formData.append('screenshots', raiseScreenshots[i]);
        }

        try {
            await axios.post(`${API_URL}/api/tickets/engineer`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setRaiseMessage('Ticket raised and assigned to you automatically!');
            setRaiseFormData({ name: '', phone: '', store_name: '', location: '', software_version: '', description: '' });
            setRaiseScreenshots([]);
            fetchTickets();
            setTimeout(() => {
                setShowRaiseModal(false);
                setRaiseMessage('');
            }, 1500);
        } catch (error) {
            setRaiseMessage(error.response?.data?.error || 'Failed to raise ticket');
        } finally {
            setRaiseLoading(false);
        }
    };

    const handleUpdateStatus = async (status) => {
        await axios.put(`${API_URL}/api/tickets/${selectedTicket.id}/status`, { 
            status, 
            message: statusMessage, 
            user_id: user.id 
        });
        setStatusMessage('');
        setSelectedTicket(null);
        if (status === 'closed') {
            setActiveTab('history');
        } else {
            fetchTickets();
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

    const fetchUpdates = async (ticketId) => {
        const res = await axios.get(`${API_URL}/api/tickets/${ticketId}/updates`);
        setUpdates(res.data);
    };

    const handleTicketClick = (ticket) => {
        setSelectedTicket(ticket);
        fetchUpdates(ticket.id);
        setCommentText('');
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
        <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white tracking-tight">Engineer Workspace</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage assigned tickets or raise tickets directly</p>
                </div>
                <button 
                    onClick={() => setShowRaiseModal(true)} 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] text-sm flex items-center gap-2"
                >
                    <FiPlus size={16} /> Raise Ticket
                </button>
            </div>

            <div className="flex bg-slate-900/50 p-1 rounded-xl w-fit mb-8 border border-slate-700/50">
                <button 
                    onClick={() => { setActiveTab('active'); setSelectedTicket(null); }} 
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Active Tickets
                </button>
                <button 
                    onClick={() => { setActiveTab('history'); setSelectedTicket(null); }} 
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    History
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 relative">
                <div className={`w-full md:w-1/3 lg:w-5/12 space-y-4 ${selectedTicket ? 'hidden md:block' : 'block'}`}>
                    {tickets.map((ticket, index) => (
                        <div key={ticket.id} 
                             onClick={() => handleTicketClick(ticket)}
                             className={`bg-slate-800/60 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl cursor-pointer transition-all duration-300 animate-fade-in-up ${selectedTicket?.id === ticket.id ? 'ring-1 ring-indigo-500 bg-slate-800/90 shadow-[0_0_20px_rgba(79,70,229,0.15)]' : 'hover:bg-slate-800 hover:border-slate-600'}`}
                             style={{animationDelay: `${index * 30}ms`}}>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="font-mono text-slate-400 text-xs bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50">#{ticket.customer_ticket_no || ticket.id}</span>
                                <StatusBadge status={ticket.status} />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-200 truncate mb-2">{ticket.description}</h3>
                            <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1"><svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> {ticket.customer_name}</div>
                            {ticket.raised_by_engineer_name ? (
                                <div className="text-[10px] font-bold text-emerald-400">Raised By: You ({ticket.raised_by_engineer_name}) (Self-Assigned)</div>
                            ) : ticket.admin_name ? (
                                <div className="text-[10px] font-bold text-purple-400">Raised By: Admin ({ticket.admin_name})</div>
                            ) : ticket.salesman_name ? (
                                <div className="text-[10px] font-bold text-amber-400">Raised By: Sales Exec ({ticket.salesman_name})</div>
                            ) : (
                                <div className="text-[10px] font-bold text-indigo-400">Raised By: Customer (Direct)</div>
                            )}
                        </div>
                    ))}
                    {tickets.length === 0 && <div className="text-center text-slate-500 font-medium py-12 bg-slate-800/20 border border-slate-700/30 rounded-2xl">{activeTab === 'active' ? 'No active tickets assigned to you.' : 'No ticket history.'}</div>}
                </div>

                {selectedTicket && (
                    <div className="w-full md:w-2/3 lg:w-7/12">
                        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-2xl sticky top-24 shadow-[0_8px_30px_rgb(0,0,0,0.2)] animate-fade-in relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                            
                            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 relative z-10">
                                <h2 className="text-xl font-display font-bold text-white">Ticket Details #{selectedTicket.customer_ticket_no || selectedTicket.id}</h2>
                                <button onClick={() => setSelectedTicket(null)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">&times;</button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                                <div className="col-span-2 bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Customer</p>
                                        <p className="font-semibold text-slate-200 text-sm">{selectedTicket.customer_name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Raised By</p>
                                        {selectedTicket.raised_by_engineer_name ? (
                                            <p className="text-xs font-bold text-emerald-400">Engineer ({selectedTicket.raised_by_engineer_name}) (Self)</p>
                                        ) : selectedTicket.admin_name ? (
                                            <p className="text-xs font-bold text-purple-400">Admin ({selectedTicket.admin_name})</p>
                                        ) : selectedTicket.salesman_name ? (
                                            <p className="text-xs font-bold text-amber-400">Sales Exec ({selectedTicket.salesman_name})</p>
                                        ) : (
                                            <p className="text-xs font-bold text-indigo-400">Customer (Direct)</p>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Phone</p>
                                    <p className="font-semibold text-slate-200 text-sm">{selectedTicket.customer_phone || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Store</p>
                                    <p className="font-semibold text-slate-200 text-sm">{selectedTicket.store_name || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Location</p>
                                    <p className="font-semibold text-slate-200 text-sm">{selectedTicket.customer_location || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Created At</p>
                                    <p className="font-semibold text-slate-200 text-sm">{format(new Date(selectedTicket.created_at), 'MMM dd, HH:mm')}</p>
                                </div>
                            </div>

                            <div className="mb-8 relative z-10">
                                <h3 className="font-semibold text-slate-300 mb-2 text-sm">Issue Description</h3>
                                <div className="bg-slate-900/30 border border-slate-700/30 p-5 rounded-xl">
                                    <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{selectedTicket.description}</p>
                                </div>
                                {selectedTicket.screenshot_url && (
                                    <div className="mt-6 relative z-10">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Attachments</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {selectedTicket.screenshot_url.split(',').map((url, i) => (
                                                <img 
                                                    key={i}
                                                    src={`${API_URL}${url}`} 
                                                    alt={`Screenshot ${i+1}`} 
                                                    className="rounded-xl border border-slate-700/50 shadow-lg max-h-32 w-auto object-contain bg-slate-900/50 p-1 cursor-pointer hover:opacity-80 transition-opacity" 
                                                    onClick={() => setFullScreenImage(`${API_URL}${url}`)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {updates.length > 0 && (
                                <div className="mb-8 border-t border-slate-700 pt-6 relative z-10">
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

                            {selectedTicket.engineer_rating && (
                                <div className="mb-8 border-t border-slate-700 pt-6 relative z-10">
                                    <h3 className="font-semibold text-slate-300 mb-4 text-sm">Customer Rating</h3>
                                    <div className="bg-slate-900/40 p-4 rounded-xl border border-yellow-500/20">
                                        <div className="flex text-yellow-400 text-lg mb-2">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={i < selectedTicket.engineer_rating ? '' : 'text-slate-700'}>★</span>
                                            ))}
                                        </div>
                                        {selectedTicket.engineer_feedback && <p className="text-sm text-slate-300 italic">"{selectedTicket.engineer_feedback}"</p>}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-5 border-t border-slate-700 pt-6 relative z-10">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Update Status</h3>
                                {activeTab === 'active' ? (
                                    <div className="space-y-4">
                                        {selectedTicket.status !== 'closed' && (
                                            <>
                                                <textarea 
                                                    value={statusMessage} 
                                                    onChange={(e) => setStatusMessage(e.target.value)} 
                                                    className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl h-24 resize-none focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none custom-scrollbar" 
                                                    placeholder="Add details about your fix or why it's pending (Status Change)..."
                                                ></textarea>
                                                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                                    <button 
                                                        onClick={() => handleUpdateStatus('solve_requested')} 
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold flex-1 shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all text-sm">
                                                        Request Closure (Solved)
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus('pending')} 
                                                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-3 rounded-xl font-semibold flex-1 transition-all text-sm border border-slate-600 hover:border-slate-500">
                                                        Mark as Pending
                                                    </button>
                                                </div>
                                                
                                                <div className="border-t border-slate-700 pt-6">
                                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Post a Reply</h3>
                                                    <textarea 
                                                        value={commentText} 
                                                        onChange={(e) => setCommentText(e.target.value)}
                                                        placeholder="Reply without changing status..."
                                                        className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl h-20 resize-none focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none custom-scrollbar text-sm mb-3"
                                                    />
                                                    <button 
                                                        onClick={handlePostComment}
                                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-md text-sm"
                                                    >
                                                        Post Reply
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                        {selectedTicket.status === 'closed' && (
                                            <button onClick={() => handleArchive(selectedTicket.id)} className="w-full bg-slate-700/50 hover:bg-slate-600 border border-slate-600 text-slate-200 font-semibold px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                                Archive Ticket
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-slate-500 italic bg-slate-900/30 p-4 rounded-xl border border-slate-700/30">Ticket is in history and cannot be updated.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {showRaiseModal && createPortal(
                <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-fade-in p-4">
                    <div className="min-h-full flex items-center justify-center">
                        <div className="bg-slate-900 border border-slate-700/70 rounded-2xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in-up my-8 relative z-[10000]">
                            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-700/50 bg-slate-800/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                                        <FiPlus size={18} />
                                    </div>
                                    <h2 className="text-xl font-display font-bold text-white">Raise Ticket (Auto-Assigned to You)</h2>
                                </div>
                                <button onClick={() => setShowRaiseModal(false)} className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700/60 font-bold">&times;</button>
                            </div>
                            
                            <form onSubmit={handleEngineerRaiseTicket} className="p-6 space-y-4">
                                {raiseMessage && (
                                    <div className={`p-3.5 rounded-xl text-sm font-semibold ${raiseMessage.includes('automatically') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                        {raiseMessage}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Customer Phone</label>
                                        <input 
                                            type="text"
                                            value={raiseFormData.phone}
                                            onChange={e => setRaiseFormData({...raiseFormData, phone: e.target.value})}
                                            placeholder="10-digit Phone"
                                            className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Customer Name</label>
                                        <input 
                                            type="text"
                                            value={raiseFormData.name}
                                            onChange={e => setRaiseFormData({...raiseFormData, name: e.target.value})}
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
                                            value={raiseFormData.store_name}
                                            onChange={e => setRaiseFormData({...raiseFormData, store_name: e.target.value})}
                                            placeholder="e.g. Metro Mart"
                                            className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Location / City</label>
                                        <input 
                                            type="text"
                                            value={raiseFormData.location}
                                            onChange={e => setRaiseFormData({...raiseFormData, location: e.target.value})}
                                            placeholder="e.g. Mumbai"
                                            className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Software Version</label>
                                    <input 
                                        type="text"
                                        value={raiseFormData.software_version}
                                        onChange={e => setRaiseFormData({...raiseFormData, software_version: e.target.value})}
                                        placeholder="e.g. v2.4.1"
                                        className="w-full bg-slate-800/60 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Issue Description *</label>
                                    <textarea 
                                        required
                                        value={raiseFormData.description}
                                        onChange={e => setRaiseFormData({...raiseFormData, description: e.target.value})}
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
                                        onChange={e => setRaiseScreenshots(e.target.files)}
                                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
                                    />
                                </div>

                                <div className="pt-3 flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowRaiseModal(false)}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={raiseLoading}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
                                    >
                                        {raiseLoading ? 'Raising Ticket...' : 'Submit & Auto-Assign'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <ImageModal imageUrl={fullScreenImage} onClose={() => setFullScreenImage(null)} />
        </div>
    );
};
export default EngineerDashboard;
