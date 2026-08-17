import express from 'express';
import poolPromise from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { smtp_email, smtp_password, admin_notification_email } = req.body;
        
        const updates = [
            { key: 'smtp_email', value: smtp_email },
            { key: 'smtp_password', value: smtp_password },
            { key: 'admin_notification_email', value: admin_notification_email }
        ];

        for (const update of updates) {
            if (update.value !== undefined) {
                await pool.query(
                    'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                    [update.key, update.value, update.value]
                );
            }
        }
        
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

export default router;
