import { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import ImageModal from '../components/ImageModal';
import { API_URL } from '../config';

const CustomerDashboard = () => {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const selectedTicketRef = useRef(selectedTicket);

    useEffect(() => {
        selectedTicketRef.current = selectedTicket;
    }, [selectedTicket]);

    const [updates, setUpdates] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const [formData, setFormData] = useState({ description: '', screenshots: [] });
    const [activeTab, setActiveTab] = useState('active');
    const [ratingData, setRatingData] = useState({ ticketId: null, rating: 0, feedback: '' });

    const fetchUpdates = async (ticketId) => {
        if (!ticketId) return;
        try {
            const res = await axios.get(`${API_URL}/api/tickets/${ticketId}/updates`);
            setUpdates(res.data || []);
        } catch (error) {
            console.error('Failed to fetch updates:', error);
        }
    };

    const handleOpenModal = (ticket) => {
        setSelectedTicket(ticket);
        fetchUpdates(ticket.id);
    };

    const handleCloseModal = () => {
        setSelectedTicket(null);
        setUpdates([]);
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

    const submitRating = async (ticketId) => {
        const targetRating = ratingData.ticketId === ticketId ? ratingData.rating : 0;
        const targetFeedback = ratingData.ticketId === ticketId ? ratingData.feedback : '';

        if (!targetRating) {
            alert('Please select at least 1 star rating.');
            return;
        }

        try {
            await axios.post(`${API_URL}/api/tickets/${ticketId}/rate`, {
                rating: targetRating,
                feedback: targetFeedback
            });

            if (selectedTicket && selectedTicket.id === ticketId) {
                setSelectedTicket(prev => prev ? ({
                    ...prev,
                    engineer_rating: targetRating,
                    engineer_feedback: targetFeedback
                }) : null);
            }

            setRatingData({ ticketId: null, rating: 0, feedback: '' });
            fetchTickets();
            alert('Thank you for your feedback!');
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert('Failed to submit rating.');
        }
    };

    const fetchTickets = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/tickets?role=customer&userId=${user.id}&tab=${activeTab}`);
            const fetched = res.data || [];
            setTickets(fetched);
            if (selectedTicketRef.current) {
                const updatedSel = fetched.find(t => t.id === selectedTicketRef.current.id);
                if (updatedSel) setSelectedTicket(updatedSel);
            }
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
        }
    };

    useEffect(() => {
        fetchTickets();

        const pollInterval = setInterval(() => {
            fetchTickets();
            if (selectedTicketRef.current) {
                fetchUpdates(selectedTicketRef.current.id);
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [activeTab]);

    const handleFileChange = (e) => {
        setFormData({ ...formData, screenshots: Array.from(e.target.files) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = new FormData();
            data.append('customer_id', user.id);
            data.append('description', formData.description);
            if (formData.screenshots && formData.screenshots.length > 0) {
                formData.screenshots.forEach(file => {
                    data.append('screenshots', file);
                });
            }
            await axios.post(`${API_URL}/api/tickets`, data);
            setShowForm(false);
            setFormData({ description: '', screenshots: [] });
            fetchTickets();
        } catch (error) {
            console.error('Error submitting ticket:', error);
            alert('Failed to submit ticket: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleAction = async (id, status) => {
        await axios.put(`${API_URL}/api/tickets/${id}/status`, { 
            status,
            message: `Status changed to ${status} by Customer`,
            user_id: user.id
        });
        if (selectedTicket && selectedTicket.id === id) {
            setSelectedTicket(prev => prev ? { ...prev, status } : null);
        }
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

    const StatusBadge = ({ status }) => {
        const styles = {
            'open': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'pending': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            'solve_requested': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            'closed': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            'not_solved': 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        };
        return <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${styles[status] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>{status.replace('_', ' ')}</span>;
    };

    const StarRatingDisplay = ({ rating, feedback }) => (
        <div className="bg-slate-900/60 border border-amber-500/30 p-3.5 rounded-xl">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Your Submitted Rating</p>
            <div className="flex items-center gap-1.5 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-lg ${star <= rating ? 'text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]' : 'text-slate-700'}`}>
                        ★
                    </span>
                ))}
                <span className="text-xs font-bold text-slate-300 ml-1">({rating}/5)</span>
            </div>
            {feedback && <p className="text-xs text-slate-300 italic">"{feedback}"</p>}
        </div>
    );

    const StarRatingInput = ({ ticketId, onSubmitted }) => {
        const isCurrentTicket = ratingData.ticketId === ticketId;
        const currentRating = isCurrentTicket ? ratingData.rating : 0;
        const currentFeedback = isCurrentTicket ? ratingData.feedback : '';

        return (
            <div className="bg-slate-900/70 border border-indigo-500/30 p-4 rounded-xl space-y-3">
                <div>
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Rate Support Experience</p>
                    <p className="text-xs text-slate-400">How satisfied were you with the resolution?</p>
                </div>
                
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                            key={star}
                            type="button"
                            onClick={() => setRatingData({ ticketId, rating: star, feedback: currentFeedback })}
                            className={`text-2xl transition-all duration-150 transform hover:scale-125 ${currentRating >= star ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]' : 'text-slate-600 hover:text-yellow-500/50'}`}
                        >
                            ★
                        </button>
                    ))}
                </div>

                {currentRating > 0 && (
                    <div className="animate-fade-in space-y-2 pt-1">
                        <textarea 
                            className="w-full bg-slate-950/80 border border-slate-700 text-slate-200 text-xs p-3 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-16 custom-scrollbar" 
                            placeholder="Add your feedback for the engineer... (Optional)"
                            value={currentFeedback}
                            onChange={(e) => setRatingData({ ticketId, rating: currentRating, feedback: e.target.value })}
                        />
                        <button 
                            type="button"
                            onClick={() => {
                                submitRating(ticketId);
                                if (onSubmitted) onSubmitted();
                            }}
                            className="w-full bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold py-2 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        >
                            Submit Rating ★
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            {fullScreenImage && <ImageModal url={fullScreenImage} onClose={() => setFullScreenImage(null)} />}
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white tracking-tight">My Support Tickets</h1>
                    <p className="text-slate-400 mt-1 font-medium text-sm">View ticket updates, rate support engineers & chat in real time</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                    {showForm ? 'Cancel Request' : '+ Raise Ticket'}
                </button>
            </div>

            {/* Tab Navigation */}
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

            {/* Raise New Ticket Form */}
            {showForm && (
                <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl mb-10 animate-fade-in-up shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                    <h2 className="text-xl font-display font-bold mb-6 text-white">Raise a New Ticket</h2>
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Description *</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl h-32 resize-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none custom-scrollbar" required placeholder="Describe the issue you are facing..."></textarea>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Screenshots (Optional)</label>
                                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="w-full bg-slate-900/50 border border-slate-700 text-slate-400 px-4 py-3 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-700 file:text-white hover:file:bg-slate-600 transition-all" />
                            </div>
                        </div>
                        <button type="submit" className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-8 py-3 rounded-xl font-bold mt-4 shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all">Submit Ticket</button>
                    </form>
                </div>
            )}

            {/* Full-Width Tickets List (No Empty Placeholder Side Box) */}
            <div className="space-y-5">
                {tickets.map((ticket, index) => (
                    <div 
                        key={ticket.id}
                        className="bg-slate-800/70 backdrop-blur-md border border-slate-700/60 p-6 rounded-2xl transition-all duration-300 hover:border-slate-600 hover:shadow-xl animate-fade-in-up relative overflow-hidden"
                        style={{ animationDelay: `${index * 40}ms` }}
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/50 pb-4 mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                                    Ticket #{ticket.customer_ticket_no || ticket.id}
                                </span>
                                <StatusBadge status={ticket.status} />
                                <span className="text-xs font-medium text-slate-400">
                                    {format(new Date(ticket.created_at), 'MMMM dd, yyyy HH:mm')}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {ticket.admin_name ? (
                                    <span className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md">Raised By: Admin ({ticket.admin_name})</span>
                                ) : ticket.salesman_name ? (
                                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">Raised By: Sales Exec ({ticket.salesman_name})</span>
                                ) : (
                                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">Raised By: Direct Customer</span>
                                )}
                            </div>
                        </div>

                        {/* Ticket Description */}
                        <div className="mb-4">
                            <p className="text-slate-200 font-medium text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                        </div>

                        {/* Assigned Support Engineer Details (If Any) */}
                        {ticket.assigned_engineer_id && (
                            <div className="mb-4 bg-slate-900/50 border border-slate-700/50 p-3.5 rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-indigo-500/50 shrink-0 flex items-center justify-center">
                                    {ticket.engineer_photo ? (
                                        <img src={`${API_URL}${ticket.engineer_photo}`} alt="Engineer" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-slate-400 font-bold text-xs">{ticket.engineer_name?.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Assigned Engineer</p>
                                    <p className="text-xs font-semibold text-slate-200 truncate">{ticket.engineer_name}</p>
                                    {ticket.engineer_phone && (
                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                            <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            {ticket.engineer_phone}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Rating Section directly on Closed Ticket Cards */}
                        {ticket.status === 'closed' && (
                            <div className="mb-4">
                                {ticket.engineer_rating ? (
                                    <StarRatingDisplay rating={ticket.engineer_rating} feedback={ticket.engineer_feedback} />
                                ) : ticket.assigned_engineer_id ? (
                                    <StarRatingInput ticketId={ticket.id} />
                                ) : null}
                            </div>
                        )}

                        {/* Customer Quick Actions & Discussion Trigger */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-700/40">
                            <div className="flex items-center gap-2 flex-wrap">
                                {ticket.status === 'solve_requested' && (
                                    <>
                                        <button onClick={() => handleAction(ticket.id, 'closed')} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors">
                                            Accept & Close
                                        </button>
                                        <button onClick={() => handleAction(ticket.id, 'not_solved')} className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors">
                                            Not Solved
                                        </button>
                                    </>
                                )}
                                {ticket.status === 'open' && activeTab === 'active' && (
                                    <button onClick={() => handleAction(ticket.id, 'closed')} className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors border border-slate-600">
                                        Close Ticket
                                    </button>
                                )}
                                {ticket.status === 'closed' && activeTab === 'active' && (
                                    <button onClick={() => handleArchive(ticket.id)} className="bg-slate-700/50 hover:bg-slate-600 border border-slate-600 text-slate-300 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                        Archive
                                    </button>
                                )}
                            </div>

                            <button 
                                onClick={() => handleOpenModal(ticket)} 
                                className="bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 hover:border-indigo-500 text-indigo-300 hover:text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 ml-auto shadow-[0_0_12px_rgba(79,70,229,0.15)]"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                View Details & Discussion
                            </button>
                        </div>
                    </div>
                ))}

                {tickets.length === 0 && (
                    <div className="text-center text-slate-500 font-medium py-16 bg-slate-800/40 border border-slate-700/50 rounded-2xl animate-fade-in">
                        {activeTab === 'active' ? "No active tickets found. You're all caught up!" : "No ticket history found."}
                    </div>
                )}
            </div>

            {/* Ticket Detail & Discussion Modal Overlay */}
            {selectedTicket && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
                    <div 
                        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative custom-scrollbar animate-scale-up p-6 md:p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                        {/* Modal Header */}
                        <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4 relative z-10">
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h2 className="text-2xl font-display font-bold text-white">Ticket #{selectedTicket.customer_ticket_no || selectedTicket.id}</h2>
                                    <StatusBadge status={selectedTicket.status} />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Created on {format(new Date(selectedTicket.created_at), 'MMMM dd, yyyy HH:mm')}</p>
                            </div>
                            <button 
                                onClick={handleCloseModal} 
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 transition-all text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="space-y-6 relative z-10">
                            {/* Assigned Support Engineer */}
                            {selectedTicket.assigned_engineer_id && (
                                <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-900 border-2 border-indigo-500/50 shrink-0 flex items-center justify-center">
                                        {selectedTicket.engineer_photo ? (
                                            <img src={`${API_URL}${selectedTicket.engineer_photo}`} alt="Engineer" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-slate-300 font-bold">{selectedTicket.engineer_name?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-0.5">Assigned Support Engineer</p>
                                        <p className="text-sm font-semibold text-slate-100">{selectedTicket.engineer_name}</p>
                                        {selectedTicket.engineer_phone && (
                                            <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                {selectedTicket.engineer_phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Full Issue Description */}
                            <div>
                                <h3 className="font-bold text-slate-300 mb-2 text-xs uppercase tracking-wider">Issue Description</h3>
                                <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-xl">
                                    <p className="text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">{selectedTicket.description}</p>
                                </div>
                            </div>

                            {/* Attachments */}
                            {selectedTicket.screenshot_url && (
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Attachments</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedTicket.screenshot_url.split(',').map((url, i) => (
                                            <img 
                                                key={i}
                                                src={`${API_URL}${url}`} 
                                                alt={`Screenshot ${i+1}`} 
                                                className="rounded-xl border border-slate-700 shadow-lg max-h-36 w-auto object-contain bg-slate-950 p-1 cursor-pointer hover:opacity-80 transition-opacity" 
                                                onClick={() => setFullScreenImage(`${API_URL}${url}`)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rating Component in Modal */}
                            {selectedTicket.status === 'closed' && (
                                <div>
                                    {selectedTicket.engineer_rating ? (
                                        <StarRatingDisplay rating={selectedTicket.engineer_rating} feedback={selectedTicket.engineer_feedback} />
                                    ) : selectedTicket.assigned_engineer_id ? (
                                        <StarRatingInput ticketId={selectedTicket.id} />
                                    ) : null}
                                </div>
                            )}

                            {/* Discussion Timeline */}
                            <div className="border-t border-slate-800 pt-6">
                                <h3 className="font-semibold text-slate-200 mb-4 text-sm flex items-center justify-between">
                                    <span>Discussion & Activity Timeline</span>
                                    <span className="text-xs text-slate-400 font-normal">{updates.length} message{updates.length !== 1 ? 's' : ''}</span>
                                </h3>

                                {updates.length > 0 ? (
                                    <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2 custom-scrollbar relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-px before:bg-slate-800">
                                        {updates.map(update => (
                                            <div key={update.id} className="relative flex items-start gap-4">
                                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-900 font-bold text-xs shrink-0 relative z-10 ${update.user_role === 'customer' ? 'bg-indigo-500/20 text-indigo-400' : update.user_role === 'engineer' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                    {update.user_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="font-semibold text-slate-200 text-xs">{update.user_name}</div>
                                                        <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${update.user_role === 'customer' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : update.user_role === 'engineer' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                                            {update.user_role}
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-medium mb-1.5">{format(new Date(update.created_at), 'MMM dd, HH:mm')}</div>
                                                    <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{update.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 italic mb-6">No messages yet. Send a reply below to contact support.</p>
                                )}

                                {/* Customer Reply Box */}
                                {selectedTicket.status !== 'closed' && (
                                    <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Reply / Send Message to Support</label>
                                        <textarea 
                                            value={commentText} 
                                            onChange={(e) => setCommentText(e.target.value)}
                                            placeholder="Write your message here..."
                                            className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl h-24 resize-none focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none custom-scrollbar text-sm"
                                        />
                                        <button 
                                            onClick={handlePostComment}
                                            disabled={!commentText.trim()}
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                            Post Reply
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
