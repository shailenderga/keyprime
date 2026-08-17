import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import poolPromise from '../db.js';
import { sendCustomerOTP, sendAdminNotification, sendPasswordResetOTP } from '../utils/emailService.js';

const GOOGLE_CLIENT_ID = '99548312558-q4cq5pj46upvkkmtdlkp1pgfl1c3c0ua.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const router = express.Router();
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

const UPLOADS_DIR = process.env.VERCEL ? os.tmpdir() : 'uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, 'profile_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.put('/profile-photo', upload.single('photo'), async (req, res) => {
    try {
        const pool = await poolPromise;
        const { user_id } = req.body;
        if (!req.file || !user_id) return res.status(400).json({ error: 'File and user_id are required' });

        const photo_url = `/uploads/${req.file.filename}`;
        await pool.query('UPDATE users SET profile_photo = ? WHERE id = ?', [photo_url, user_id]);
        
        res.json({ message: 'Profile photo updated', profile_photo: photo_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

router.post('/register', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { name, email, password, phone, store_name, location, role } = req.body;
        
        const allowedRoles = ['engineer', 'sales_executive', 'customer'];
        const assignedRole = allowedRoles.includes(role) ? role : 'customer';
        
        // If Admin is creating, maybe we pass an 'isAdmin' flag? Or just check if role is not customer
        // Assuming Admin creates engineer/salesman, they are instantly active.
        // If Admin creates customer, we'll still send OTP unless we bypass it.
        // Let's allow passing account_status directly if needed, or default it.
        const accountStatus = req.body.account_status || (assignedRole === 'customer' ? 'pending_verification' : 'active');
        
        let otp = null;
        if (accountStatus === 'pending_verification') {
            otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
            // Send OTP email asynchronously
            sendCustomerOTP(email, otp);
            
            console.log(`\n=========================================`);
            console.log(`🔑 OTP for ${email}: ${otp}`);
            console.log(`=========================================\n`);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, phone, store_name, location, role, account_status, otp, otp_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
            [name, email, hashedPassword, phone, store_name, location, assignedRole, accountStatus, otp]
        );
        
        res.status(201).json({ message: 'User registered successfully', userId: result.insertId, email });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email is already registered' });
        }
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { email, otp } = req.body;
        
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const user = users[0];
        
        if (user.account_status !== 'pending_verification') {
            return res.status(400).json({ error: 'User is already verified or active' });
        }
        
        if (user.otp !== otp || new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }
        
        await pool.query(
            "UPDATE users SET account_status = 'pending_approval', otp = NULL, otp_expiry = NULL WHERE id = ?",
            [user.id]
        );
        
        // Notify admin about new approval request
        sendAdminNotification(
            'New User Approval Required',
            `<p>A new customer has verified their email and is waiting for approval.</p>
             <ul>
                <li><strong>Name:</strong> ${user.name}</li>
                <li><strong>Email:</strong> ${user.email}</li>
                <li><strong>Phone:</strong> ${user.phone || 'N/A'}</li>
                <li><strong>Store:</strong> ${user.store_name || 'N/A'}</li>
             </ul>
             <p>Please log in to the Admin Dashboard to approve or decline.</p>`
        );

        res.json({ message: 'Email verified successfully. Waiting for Admin approval.' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { email, password } = req.body;

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        if (user.account_status === 'pending_verification') {
            return res.status(403).json({ error: 'Please verify your email first', redirect: '/verify-otp', email: user.email });
        } else if (user.account_status === 'pending_approval') {
            return res.status(403).json({ error: 'Your account is pending admin approval.' });
        } else if (user.account_status === 'declined') {
            return res.status(403).json({ error: 'Your account has been declined by the admin.' });
        } else if (user.account_status === 'inactive') {
            return res.status(403).json({ error: 'Your account has been deactivated.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email, profile_photo: user.profile_photo, location: user.location } });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

router.post('/google', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { credential, phone, store_name, location } = req.body;

        if (!credential) {
            return res.status(400).json({ error: 'Google credential is required' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        let [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        let user;

        if (users.length === 0) {
            // New user registering via Google
            if (!phone || !store_name || !location) {
                return res.json({ isNewUser: true, email, name, picture });
            }

            const randomPass = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPass, 10);
            
            const [result] = await pool.query(
                'INSERT INTO users (name, email, password, phone, store_name, location, role, account_status, profile_photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [name, email, hashedPassword, phone, store_name, location, 'customer', 'pending_approval', picture || null]
            );
            
            sendAdminNotification(
                'New User Approval Required (via Google)',
                `<p>A new customer has registered via Google and is waiting for approval.</p>
                 <ul>
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Phone:</strong> ${phone}</li>
                    <li><strong>Store Name:</strong> ${store_name}</li>
                    <li><strong>Location:</strong> ${location}</li>
                 </ul>
                 <p>Please log in to the Admin Dashboard to approve or decline.</p>`
            );

            return res.status(403).json({ error: 'Your registration is submitted via Google and is waiting for Admin approval.' });
        } else {
            user = users[0];
            if (user.account_status === 'pending_verification') {
                if (!user.phone || !user.store_name || !user.location) {
                    if (!phone || !store_name || !location) {
                        return res.json({ isNewUser: true, email: user.email, name: user.name, picture: user.profile_photo || picture });
                    }
                    await pool.query("UPDATE users SET phone = ?, store_name = ?, location = ?, account_status = 'pending_approval' WHERE id = ?", [phone, store_name, location, user.id]);
                } else {
                    await pool.query("UPDATE users SET account_status = 'pending_approval' WHERE id = ?", [user.id]);
                }
                user.account_status = 'pending_approval';

                sendAdminNotification(
                    'New User Approval Required (via Google)',
                    `<p>A new customer has verified their account via Google and is waiting for approval.</p>
                     <ul>
                        <li><strong>Name:</strong> ${user.name}</li>
                        <li><strong>Email:</strong> ${user.email}</li>
                        <li><strong>Phone:</strong> ${phone || user.phone || 'N/A'}</li>
                        <li><strong>Store Name:</strong> ${store_name || user.store_name || 'N/A'}</li>
                        <li><strong>Location:</strong> ${location || user.location || 'N/A'}</li>
                     </ul>
                     <p>Please log in to the Admin Dashboard to approve or decline.</p>`
                );
                return res.status(403).json({ error: 'Your account is pending Admin approval.' });
            } else if (user.account_status === 'pending_approval') {
                return res.status(403).json({ error: 'Your account is pending Admin approval.' });
            } else if (user.account_status === 'declined') {
                return res.status(403).json({ error: 'Your account has been declined by the admin.' });
            } else if (user.account_status === 'inactive') {
                return res.status(403).json({ error: 'Your account has been deactivated.' });
            }
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name }, 
            process.env.JWT_SECRET || 'secret', 
            { expiresIn: '1d' }
        );

        res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email, profile_photo: user.profile_photo || picture, location: user.location, phone: user.phone, store_name: user.store_name } });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ error: 'Google login failed', details: error.message });
    }
});



router.get('/engineers', async (req, res) => {
    try {
        const pool = await poolPromise;
        const [engineers] = await pool.query('SELECT id, name, email FROM users WHERE role = "engineer" AND account_status = "active"');
        res.json(engineers);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const pool = await poolPromise;
        const [users] = await pool.query('SELECT id, name, email, phone, store_name, role, account_status, created_at, location FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/users/:id/status', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const { account_status } = req.body;
        await pool.query('UPDATE users SET account_status = ? WHERE id = ?', [account_status, id]);
        res.json({ message: 'User status updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        
        // First delete their ticket updates
        await pool.query('DELETE FROM ticket_updates WHERE user_id = ?', [id]);
        
        // If they are a customer, we must delete their tickets (and those tickets' updates)
        const [customerTickets] = await pool.query('SELECT id FROM tickets WHERE customer_id = ?', [id]);
        if (customerTickets.length > 0) {
            const ticketIds = customerTickets.map(t => t.id);
            await pool.query('DELETE FROM ticket_updates WHERE ticket_id IN (?)', [ticketIds]);
            await pool.query('DELETE FROM tickets WHERE customer_id = ?', [id]);
        }

        // Set salesman references to NULL
        await pool.query('UPDATE tickets SET raised_by_salesman_id = NULL WHERE raised_by_salesman_id = ?', [id]);

        // Set engineer references to NULL
        await pool.query('UPDATE tickets SET assigned_engineer_id = NULL WHERE assigned_engineer_id = ?', [id]);
        
        // Finally delete the user
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

router.put('/profile', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { user_id, name, email, phone, store_name, location, password } = req.body;
        
        if (!user_id || !email) {
            return res.status(400).json({ error: 'User ID and email are required' });
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                'UPDATE users SET name = COALESCE(?, name), email = ?, phone = COALESCE(?, phone), store_name = COALESCE(?, store_name), location = COALESCE(?, location), password = ? WHERE id = ?', 
                [name, email, phone, store_name, location, hashedPassword, user_id]
            );
        } else {
            await pool.query(
                'UPDATE users SET name = COALESCE(?, name), email = ?, phone = COALESCE(?, phone), store_name = COALESCE(?, store_name), location = COALESCE(?, location) WHERE id = ?', 
                [name, email, phone, store_name, location, user_id]
            );
        }

        const [updatedUsers] = await pool.query('SELECT id, name, role, email, profile_photo, location, phone, store_name FROM users WHERE id = ?', [user_id]);

        res.json({ message: 'Profile updated successfully', user: updatedUsers[0] });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already in use by another account' });
        }
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});


// Forgot Password - Step 1: Send OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { email } = req.body;

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'No account found with this email.' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.query(
            'UPDATE users SET otp = ?, otp_expiry = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE email = ?',
            [otp, email]
        );

        console.log(`\n=========================================`);
        console.log(`🔑 Password Reset OTP for ${email}: ${otp}`);
        console.log(`=========================================\n`);

        sendPasswordResetOTP(email, otp);

        res.json({ message: 'OTP sent to your email.' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Reset Password - Step 2: Verify OTP & Set New Password
router.post('/reset-password', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { email, otp, newPassword } = req.body;

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found.' });

        const user = users[0];
        if (user.otp !== otp || new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = ?, otp = NULL, otp_expiry = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.json({ message: 'Password reset successfully. Please login.' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

export default router;
