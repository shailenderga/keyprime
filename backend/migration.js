import poolPromise from './db.js';

async function run() {
    try {
        const pool = await poolPromise;
        await pool.query('ALTER TABLE tickets ADD COLUMN customer_ticket_no INT DEFAULT NULL');
        
        // Update existing tickets to have a sequence number
        const [tickets] = await pool.query('SELECT id, customer_id FROM tickets ORDER BY created_at ASC');
        const counts = {};
        for (const t of tickets) {
            counts[t.customer_id] = (counts[t.customer_id] || 0) + 1;
            await pool.query('UPDATE tickets SET customer_ticket_no = ? WHERE id = ?', [counts[t.customer_id], t.id]);
        }
        
        console.log('Database updated successfully!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
