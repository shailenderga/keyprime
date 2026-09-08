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

    const handleTicketClick = (ticket) => {
        setSelectedTicket(ticket);
        fetchUpdates(ticket.id);
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
        try {
            await axios.post(`${API_URL}/api/tickets/${ticketId}/rate`, {
                rating: ratingData.rating,
                feedback: ratingData.feedback
            });
            if (selectedTicket && selectedTicket.id === ticketId) {
                setSelectedTicket(prev => ({
                    ...prev,
                    engineer_rating: ratingData.rating,
                    engineer_feedback: ratingData.feedback
                }));
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

    return (
        <div className="animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            {fullScreenImage && <ImageModal url={fullScreenImage} onClose={() => setFullScreenImage(null)} />}
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white tracking-tight">My Tickets</h1>
                    <p className="text-slate-400 mt-1 font-medium">Manage support requests, view updates & communicate in real time</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                    {showForm ? 'Cancel Request' : '+ Raise Ticket'}
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

            {/* Split View: Tickets List on Left, Ticket Details & Reply Panel on Right */}
            <div className="flex flex-col lg:flex-row gap-8 relative">
                <div className={`w-full lg:w-5/12 space-y-4 ${selectedTicket ? 'hidden lg:block' : 'block'}`}>
                    {tickets.map((ticket, index) => (
                        <div 
                            key={ticket.id}
                            onClick={() => handleTicketClick(ticket)}
                            className={`bg-slate-800/60 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl cursor-pointer transition-all duration-300 animate-fade-in-up ${selectedTicket?.id === ticket.id ? 'ring-2 ring-indigo-500 bg-slate-800/90 shadow-[0_0_20px_rgba(79,70,229,0.15)]' : 'hover:bg-slate-800 hover:border-slate-600'}`}
                            style={{ animationDelay: `${index * 30}ms` }}
                        >
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <span className="font-mono text-slate-400 text-xs bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50">#{ticket.customer_ticket_no || ticket.id}</span>
                                <StatusBadge status={ticket.status} />
                                <span className="text-xs font-medium text-slate-500">{format(new Date(ticket.created_at), 'MMM dd, HH:mm')}</span>
                            </div>

                            <p className="text-slate-200 font-semibold text-sm line-clamp-2 mb-3">{ticket.description}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-700/40 text-xs">
                                {ticket.admin_name ? (
                                    <span className="font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">Raised By: Admin ({ticket.admin_name})</span>
                                ) : ticket.salesman_name ? (
                                    <span className="font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">Raised By: Sales Exec ({ticket.salesman_name})</span>
                                ) : (
                                    <span className="font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">Raised By: You (Direct)</span>
                                )}

                                {ticket.engineer_name && (
                                    <span className="text-slate-400 font-medium">Engineer: <strong className="text-slate-200">{ticket.engineer_name}</strong></span>
                                )}
                            </div>
                        </div>
                    ))}
                    {tickets.length === 0 && (
                        <div className="text-center text-slate-500 font-medium py-16 bg-slate-800/40 border border-slate-700/50 rounded-2xl animate-fade-in">
                            {activeTab === 'active' ? "No active tickets found. You're all caught up!" : "No ticket history found."}
                        </div>
                    )}
                </div>

                {/* Right Panel: Selected Ticket Details & Reply Box */}
                {selectedTicket ? (
                    <div className="w-full lg:w-7/12">
                        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-6 md:p-8 rounded-2xl sticky top-24 shadow-[0_8px_30px_rgb(0,0,0,0.2)] animate-fade-in relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 relative z-10">
                                <div>
                                    <h2 className="text-xl font-display font-bold text-white">Ticket #{selectedTicket.customer_ticket_no || selectedTicket.id}</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Created on {format(new Date(selectedTicket.created_at), 'MMMM dd, yyyy HH:mm')}</p>
                                </div>
                                <button onClick={() => setSelectedTicket(null)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">&times;</button>
                            </div>

                            <div className="flex items-center gap-3 mb-6 relative z-10 flex-wrap">
                                <StatusBadge status={selectedTicket.status} />
                                {selectedTicket.admin_name ? (
                                    <span className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-md">Raised By: Admin ({selectedTicket.admin_name})</span>
                                ) : selectedTicket.salesman_name ? (
                                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">Raised By: Sales Exec ({selectedTicket.salesman_name})</span>
                                ) : (
                                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">Raised By: Customer (Direct)</span>
                                )}
                            </div>

                            {/* Assigned Support Engineer Details */}
                            {selectedTicket.assigned_engineer_id && (
                                <div className="mb-6 bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border-2 border-indigo-500/50 shrink-0 flex items-center justify-center">
                                        {selectedTicket.engineer_photo ? (
                                            <img src={`${API_URL}${selectedTicket.engineer_photo}`} alt="Engineer" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-slate-400 font-bold">{selectedTicket.engineer_name?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-0.5">Assigned Support Engineer</p>
                                        <p className="text-sm font-semibold text-slate-200">{selectedTicket.engineer_name}</p>
                                        {selectedTicket.engineer_phone && (
                                            <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                {selectedTicket.engineer_phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Issue Description */}
                            <div className="mb-6 relative z-10">
                                <h3 className="font-semibold text-slate-300 mb-2 text-sm">Issue Description</h3>
                                <div className="bg-slate-900/40 border border-slate-700/40 p-5 rounded-xl">
                                    <p className="text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">{selectedTicket.description}</p>
                                </div>
                            </div>

                            {/* Screenshots */}
                            {selectedTicket.screenshot_url && (
                                <div className="mb-6 relative z-10">
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

                            {/* Action Buttons for Customer */}
                            <div className="mb-6 border-t border-slate-700/50 pt-6 relative z-10">
                                {selectedTicket.status === 'solve_requested' && (
                                    <div className="bg-slate-900/50 border border-purple-500/30 p-4 rounded-xl space-y-3">
                                        <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Engineer marked this ticket as Solved. Please verify:</p>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button onClick={() => handleAction(selectedTicket.id, 'closed')} className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm flex-1">Accept & Close</button>
                                            <button onClick={() => handleAction(selectedTicket.id, 'not_solved')} className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm flex-1">Not Solved</button>
                                        </div>
                                    </div>
                                )}
                                {selectedTicket.status === 'open' && activeTab === 'active' && (
                                    <button onClick={() => handleAction(selectedTicket.id, 'closed')} className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors border border-slate-600">
                                        Close Ticket
                                    </button>
                                )}
                                {selectedTicket.status === 'closed' && activeTab === 'active' && (
                                    <button onClick={() => handleArchive(selectedTicket.id)} className="w-full bg-slate-700/50 hover:bg-slate-600 border border-slate-600 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                        Archive Ticket
                                    </button>
                                )}
                            </div>

                            {/* Customer 5-Star Rating System */}
                            {selectedTicket.status === 'closed' && selectedTicket.assigned_engineer_id && !selectedTicket.engineer_rating && (
                                <div className="mb-6 bg-slate-900/60 border border-indigo-500/30 p-5 rounded-xl relative z-10">
                                    <p className="text-sm font-bold text-white mb-2">Rate your support experience</p>
                                    <div className="flex gap-2 mb-3">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button 
                                                key={star}
                                                onClick={() => setRatingData({ ...ratingData, ticketId: selectedTicket.id, rating: star })}
                                                className={`text-2xl transition-colors ${ratingData.ticketId === selectedTicket.id && ratingData.rating >= star ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-slate-600 hover:text-yellow-500/50'}`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                    {ratingData.ticketId === selectedTicket.id && ratingData.rating > 0 && (
                                        <div className="animate-fade-in-up space-y-3">
                                            <textarea 
                                                className="w-full bg-slate-900/70 border border-slate-700 text-slate-200 text-sm p-3 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-20 custom-scrollbar" 
                                                placeholder="Any feedback for the engineer? (Optional)"
                                                value={ratingData.feedback}
                                                onChange={(e) => setRatingData({ ...ratingData, feedback: e.target.value })}
                                            />
                                            <button 
                                                onClick={() => submitRating(selectedTicket.id)}
                                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                                            >
                                                Submit Rating
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {selectedTicket.engineer_rating && (
                                <div className="mb-6 bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl relative z-10">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Your Submitted Rating</p>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex text-yellow-400 text-lg">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={i < selectedTicket.engineer_rating ? '' : 'text-slate-700'}>★</span>
                                            ))}
                                        </div>
                                    </div>
                                    {selectedTicket.engineer_feedback && <p className="text-xs text-slate-300 italic">"{selectedTicket.engineer_feedback}"</p>}
                                </div>
                            )}

                            {/* Activity Timeline & Comment Discussion Section */}
                            <div className="border-t border-slate-700/50 pt-6 relative z-10">
                                <h3 className="font-semibold text-slate-200 mb-4 text-sm flex items-center justify-between">
                                    <span>Discussion & Activity Timeline</span>
                                    <span className="text-xs text-slate-400 font-normal">{updates.length} message{updates.length !== 1 ? 's' : ''}</span>
                                </h3>

                                {updates.length > 0 ? (
                                    <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2 custom-scrollbar relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px before:h-full before:w-px before:bg-slate-700">
                                        {updates.map(update => (
                                            <div key={update.id} className="relative flex items-start gap-4">
                                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-800 font-bold text-xs shrink-0 relative z-10 ${update.user_role === 'customer' ? 'bg-indigo-500/20 text-indigo-400' : update.user_role === 'engineer' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                    {update.user_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/50">
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
                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-3">
                                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Reply / Send Message to Support</label>
                                        <textarea 
                                            value={commentText} 
                                            onChange={(e) => setCommentText(e.target.value)}
                                            placeholder="Write your message here..."
                                            className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl h-24 resize-none focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none custom-scrollbar text-sm"
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
                ) : (
                    <div className="hidden lg:flex lg:w-7/12 items-center justify-center bg-slate-800/30 border border-slate-700/30 rounded-2xl p-12 text-center text-slate-500">
                        <div>
                            <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                            <p className="text-sm font-semibold">Select a ticket from the list to view details and discussion</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerDashboard;
