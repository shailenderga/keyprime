import express from 'express';
import poolPromise from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { sendAdminNotification } from '../utils/emailService.js';

const router = express.Router();

const UPLOADS_DIR = process.env.VERCEL ? os.tmpdir() : 'uploads';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.post('/', (req, res, next) => {
    upload.array('screenshots', 10)(req, res, (err) => {
        if (err) return res.status(400).json({ error: 'Upload error: ' + err.message });
        next();
    });
}, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { customer_id, software_version, description } = req.body;
        const screenshot_urls = (req.files && req.files.length > 0) 
            ? req.files.map(f => `/uploads/${f.filename}`).join(',') 
            : null;

        const [maxTicket] = await pool.query('SELECT MAX(customer_ticket_no) as max_no FROM tickets WHERE customer_id = ?', [customer_id]);
        const nextTicketNo = (maxTicket[0].max_no || 0) + 1;

        const [result] = await pool.query(
            'INSERT INTO tickets (customer_id, software_version, description, screenshot_url, customer_ticket_no) VALUES (?, ?, ?, ?, ?)',
            [customer_id, software_version, description, screenshot_urls, nextTicketNo]
        );
        
        // Notify admin
        sendAdminNotification(
            'New Ticket Raised',
            `<p>A new ticket (ID: #${result.insertId}) has been raised directly by a customer.</p>
             <p><strong>Description:</strong> ${description}</p>
             <p>Please log in to the Admin Dashboard to review and assign it.</p>`
        );

        res.status(201).json({ message: 'Ticket created', ticketId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.post('/salesman', (req, res, next) => {
    upload.array('screenshots', 10)(req, res, (err) => {
        if (err) return res.status(400).json({ error: 'Upload error: ' + err.message });
        next();
    });
}, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { name, phone, store_name, location, software_version, description, salesman_id } = req.body;
        const screenshot_urls = (req.files && req.files.length > 0) 
            ? req.files.map(f => `/uploads/${f.filename}`).join(',') 
            : null;

        // Check if customer exists by phone
        let [users] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
        let customer_id;

        if (users.length > 0) {
            customer_id = users[0].id;
        } else {
            const dummyEmail = `${phone}@support.local`;
            // default password hash for '123456' just in case
            const defaultPassword = '$2b$10$wM0P7L9wZtO1QZ.G0G4a.O6d9N.kK5X2p2eK6rL4l2G5yO1g6R1/O'; 
            
            const [result] = await pool.query(
                'INSERT INTO users (name, email, password, phone, store_name, location, role, account_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [name, dummyEmail, defaultPassword, phone, store_name, location, 'customer', 'active']
            );
            customer_id = result.insertId;
        }

        const [maxTicket] = await pool.query('SELECT MAX(customer_ticket_no) as max_no FROM tickets WHERE customer_id = ?', [customer_id]);
        const nextTicketNo = (maxTicket[0].max_no || 0) + 1;

        const [ticketResult] = await pool.query(
            'INSERT INTO tickets (customer_id, software_version, description, screenshot_url, raised_by_salesman_id, customer_ticket_no) VALUES (?, ?, ?, ?, ?, ?)',
            [customer_id, software_version, description, screenshot_urls, salesman_id, nextTicketNo]
        );
        
        // Notify admin
        sendAdminNotification(
            'New Ticket Raised by Salesman',
            `<p>A new ticket (ID: #${ticketResult.insertId}) has been raised by a salesman on behalf of a customer.</p>
             <ul>
                <li><strong>Customer Name:</strong> ${name}</li>
                <li><strong>Store Name:</strong> ${store_name}</li>
             </ul>
             <p><strong>Description:</strong> ${description}</p>
             <p>Please log in to the Admin Dashboard to review and assign it.</p>`
        );

        res.status(201).json({ message: 'Ticket created on behalf of customer', ticketId: ticketResult.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { from, to } = req.query;
        
        // Get ticket counts by status
        const [ticketStats] = await pool.query(`
            SELECT status, COUNT(*) as count 
            FROM tickets 
            GROUP BY status
        `);

        // Get user counts by role
        const [userStats] = await pool.query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role
        `);

        // Get engineer performance — use custom date range OR default last 30 days
        let dateCondition = `t.updated_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`;
        const params = [];
        if (from && to) {
            dateCondition = `DATE(t.updated_at) BETWEEN ? AND ?`;
            params.push(from, to);
        } else if (from) {
            dateCondition = `DATE(t.updated_at) >= ?`;
            params.push(from);
        } else if (to) {
            dateCondition = `DATE(t.updated_at) <= ?`;
            params.push(to);
        }

        const [engineerStats] = await pool.query(`
            SELECT u.id, u.name, COUNT(t.id) as resolved_count 
            FROM users u
            LEFT JOIN tickets t ON t.assigned_engineer_id = u.id 
                AND t.status = 'closed' 
                AND ${dateCondition}
            WHERE u.role = 'engineer'
            GROUP BY u.id, u.name
            ORDER BY resolved_count DESC
        `, params);

        res.json({ ticketStats, userStats, engineerStats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { userId, role, tab } = req.query;
        const isHistory = tab === 'history';

        let query = `
            SELECT t.*, 
                   c.name as customer_name, c.phone as customer_phone, c.store_name as store_name, c.location as customer_location,
                   e.name as engineer_name, e.phone as engineer_phone, e.profile_photo as engineer_photo,
                   s.name as salesman_name
            FROM tickets t
            JOIN users c ON t.customer_id = c.id
            LEFT JOIN users e ON t.assigned_engineer_id = e.id
            LEFT JOIN users s ON t.raised_by_salesman_id = s.id
            WHERE (t.is_archived = ? ${isHistory ? "OR t.status = 'closed'" : "AND t.status != 'closed'"})
        `;
        let params = [isHistory ? true : false];

        if (role === 'customer') {
            query += ' AND t.customer_id = ?';
            params.push(userId);
        } else if (role === 'engineer') {
            query += ' AND t.assigned_engineer_id = ?';
            params.push(userId);
        } else if (role === 'sales_executive') {
            query += ' AND t.raised_by_salesman_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY t.created_at DESC';

        const [tickets] = await pool.query(query, params);
        res.json(tickets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id/status', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const { status, message, user_id } = req.body;

        await pool.query('UPDATE tickets SET status = ? WHERE id = ?', [status, id]);

        if (message && user_id) {
            await pool.query(
                'INSERT INTO ticket_updates (ticket_id, user_id, message, update_type) VALUES (?, ?, ?, ?)',
                [id, user_id, message, 'status_change']
            );
        }

        res.json({ message: 'Ticket status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id/assign', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const { engineer_id } = req.body;

        await pool.query('UPDATE tickets SET assigned_engineer_id = ? WHERE id = ?', [engineer_id, id]);
        res.json({ message: 'Ticket assigned successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/rate', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const { rating, feedback } = req.body;

        await pool.query('UPDATE tickets SET engineer_rating = ?, engineer_feedback = ? WHERE id = ?', [rating, feedback, id]);
        res.json({ message: 'Rating submitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/:id/updates', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        const [updates] = await pool.query(`
            SELECT tu.*, u.name as user_name, u.role as user_role
            FROM ticket_updates tu
            JOIN users u ON tu.user_id = u.id
            WHERE tu.ticket_id = ?
            ORDER BY tu.created_at ASC
        `, [id]);
        
        res.json(updates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/comments', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const { user_id, message } = req.body;
        
        await pool.query(
            'INSERT INTO ticket_updates (ticket_id, user_id, message, update_type) VALUES (?, ?, ?, ?)',
            [id, user_id, message, 'comment']
        );
        
        // Also update ticket's updated_at timestamp if we had one (we don't strictly need to but it's good practice)
        // await pool.query('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
        
        res.json({ message: 'Comment added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/:id/archive', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        await pool.query('UPDATE tickets SET is_archived = TRUE WHERE id = ?', [id]);
        res.json({ message: 'Ticket archived successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
