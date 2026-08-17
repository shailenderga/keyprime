import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import ImageModal from '../components/ImageModal';
import { API_URL } from '../config';

const SalesExecutiveDashboard = () => {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState(null);
    const [formData, setFormData] = useState({ 
        name: '', phone: '', store_name: '', location: '', 
        description: '', screenshots: [] 
    });
    const [activeTab, setActiveTab] = useState('active');

    const fetchTickets = async () => {
        const res = await axios.get(`${API_URL}/api/tickets?role=sales_executive&userId=${user.id}&tab=${activeTab}`);
        setTickets(res.data);
    };

    const fetchEngineers = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/auth/engineers`);
            setEngineers(res.data);
        } catch (error) {
            console.error('Failed to fetch engineers', error);
        }
    };

    useEffect(() => {
        fetchTickets();
        fetchEngineers();
    }, [activeTab]);

    const handleFileChange = (e) => {
        setFormData({ ...formData, screenshots: Array.from(e.target.files) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = new FormData();
            data.append('salesman_id', user.id);
            data.append('name', formData.name);
            data.append('phone', formData.phone);
            data.append('store_name', formData.store_name);
            data.append('location', formData.location);

            data.append('description', formData.description);
            if (formData.screenshots && formData.screenshots.length > 0) {
                formData.screenshots.forEach(file => {
                    data.append('screenshots', file);
                });
            }
            await axios.post(`${API_URL}/api/tickets/salesman`, data);
            setShowForm(false);
            setFormData({ name: '', phone: '', store_name: '', location: '', description: '', screenshots: [] });
            fetchTickets();
        } catch (error) {
            console.error('Error submitting ticket:', error);
            alert('Failed to submit ticket: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleAssign = async (ticketId, engineerId, e) => {
        e.stopPropagation();
        if (!engineerId) return;
        try {
            await axios.put(`${API_URL}/api/tickets/${ticketId}/assign`, { engineer_id: engineerId });
            fetchTickets();
        } catch (error) {
            console.error('Failed to assign ticket', error);
        }
    };

    const handleStatusChange = async (ticketId, status) => {
        try {
            await axios.put(`${API_URL}/api/tickets/${ticketId}/status`, { status, user_id: user.id });
            if (status === 'closed') {
                setActiveTab('history');
            } else {
                fetchTickets();
            }
        } catch (error) {
            console.error('Failed to update status', error);
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
        <div className="animate-fade-in max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            {fullScreenImage && <ImageModal imageUrl={fullScreenImage} onClose={() => setFullScreenImage(null)} />}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-10">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white tracking-tight">Sales Executive Workspace</h1>
                    <p className="text-slate-400 mt-1 font-medium">Raise tickets on behalf of customers, assign engineers, and close tickets</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm">
                    {showForm ? 'Cancel Form' : '+ Raise Ticket'}
                </button>
            </div>

            <div className="flex bg-slate-900/50 p-1 rounded-xl w-fit mb-8 border border-slate-700/50">
                <button 
                    onClick={() => setActiveTab('active')} 
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Active Tickets
                </button>
                <button 
                    onClick={() => setActiveTab('history')} 
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    History
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl mb-10 animate-fade-in-up shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                    <h2 className="text-xl font-display font-bold mb-6 text-white">Raise Ticket for Customer</h2>
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Customer Name</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none" required placeholder="Full Name" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Phone Number</label>
                                <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none" required placeholder="Phone" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Location / Address</label>
                                <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none" placeholder="Location" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Store Name</label>
                                <input type="text" value={formData.store_name} onChange={(e) => setFormData({...formData, store_name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none" placeholder="Store Name" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl h-32 resize-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none custom-scrollbar" required placeholder="Describe the issue..."></textarea>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Attachments (Images, PDF, TXT)</label>
                                <input type="file" multiple accept="image/*,.pdf,.txt" onChange={handleFileChange} className="w-full bg-slate-900/50 border border-slate-700 text-slate-400 px-4 py-3 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-700 file:text-white hover:file:bg-slate-600 transition-all" />
                            </div>
                        </div>
                        <button type="submit" className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-8 py-3 rounded-xl font-bold mt-4 shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all">Submit Ticket</button>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {tickets.map((ticket, index) => (
                    <div key={ticket.id} className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl flex flex-col md:flex-row justify-between gap-6 hover:bg-slate-800 transition-colors duration-300 animate-fade-in-up group" style={{animationDelay: `${index * 50}ms`}}>
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                                <span className="font-mono text-slate-400 text-sm bg-slate-900/50 px-2 py-1 rounded border border-slate-700/50">#{ticket.customer_ticket_no || ticket.id}</span>
                                <StatusBadge status={ticket.status} />
                                <span className="text-sm font-medium text-slate-500">{format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-200 mb-2">Customer: {ticket.customer_name}</h3>
                            <p className="text-xs text-slate-400 mb-4 font-semibold">{ticket.customer_phone} | {ticket.store_name} | {ticket.customer_location}</p>
                            <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed border-t border-slate-700 pt-4 mt-2"><strong>Issue:</strong> {ticket.description}</p>
                            {ticket.screenshot_url && (
                                <div className="mt-4 flex flex-wrap gap-3">
                                    {ticket.screenshot_url.split(',').map((url, i) => {
                                        const isPdf = url.toLowerCase().endsWith('.pdf');
                                        const isTxt = url.toLowerCase().endsWith('.txt');
                                        if (isPdf || isTxt) {
                                            return (
                                                <a key={i} href={`${API_URL}${url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-indigo-400 hover:bg-slate-800 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                    {isPdf ? 'View PDF' : 'View Text File'}
                                                </a>
                                            );
                                        }
                                        return (
                                            <img 
                                                key={i}
                                                src={`${API_URL}${url}`} 
                                                alt={`Attachment ${i+1}`} 
                                                className="h-24 w-auto rounded-lg border border-slate-700 shadow-lg object-cover cursor-pointer hover:opacity-80 transition-opacity bg-slate-900" 
                                                onClick={() => setFullScreenImage(`${API_URL}${url}`)}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                            
                            {/* Assign Engineer Dropdown */}
                            {ticket.status !== 'closed' && (
                                <div className="mt-6 border-t border-slate-700/50 pt-4 max-w-sm">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Assign Engineer</label>
                                    <select 
                                        className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none cursor-pointer"
                                        value={ticket.assigned_engineer_id || ''}
                                        onChange={(e) => handleAssign(ticket.id, e.target.value, e)}
                                    >
                                        <option value="">Unassigned</option>
                                        {engineers.map(eng => (
                                            <option key={eng.id} value={eng.id}>{eng.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {ticket.assigned_engineer_id && ticket.status === 'closed' && (
                                <div className="mt-6 bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border-2 border-indigo-500/50 shrink-0 flex items-center justify-center">
                                        {ticket.engineer_photo ? (
                                            <img src={`${API_URL}${ticket.engineer_photo}`} alt="Engineer" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-slate-400 font-bold">{ticket.engineer_name?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-0.5">Assigned Engineer</p>
                                        <p className="text-sm font-semibold text-slate-200">{ticket.engineer_name}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Close Ticket Action */}
                        {ticket.status !== 'closed' && activeTab === 'active' && (
                            <div className="flex flex-col gap-3 min-w-[180px] md:border-l border-slate-700 md:pl-6 pt-4 md:pt-0 justify-end">
                                <button onClick={() => handleStatusChange(ticket.id, 'closed')} className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm w-full h-10 mt-auto shadow-sm hover:shadow-md">Close Ticket</button>
                            </div>
                        )}
                    </div>
                ))}
                {tickets.length === 0 && <div className="text-center text-slate-500 font-medium py-16 bg-slate-800/40 border border-slate-700/50 rounded-2xl animate-fade-in">No tickets found.</div>}
            </div>
        </div>
    );
};
export default SalesExecutiveDashboard;
