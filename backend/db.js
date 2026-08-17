import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

let dbHost = (process.env.DB_HOST || 'localhost').trim().replace(/^https?:\/\//, '');
let dbPort = process.env.DB_PORT || 3306;

if (dbHost.includes(':')) {
    const parts = dbHost.split(':');
    dbHost = parts[0].trim();
    if (parts[1]) dbPort = parseInt(parts[1].trim(), 10);
}

const isCloud = dbHost.includes('aivencloud.com') || dbHost.includes('tidbcloud.com') || dbHost.includes('clever-cloud.com') || process.env.DB_SSL === 'true';
const sslConfig = isCloud ? { rejectUnauthorized: false } : undefined;

const pool = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'defaultdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: sslConfig
});

// Auto-run schema migrations asynchronously in background
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                store_name VARCHAR(255),
                profile_photo VARCHAR(255),
                role ENUM('admin', 'engineer', 'customer') DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                assigned_engineer_id INT,
                software_version VARCHAR(100),
                description TEXT NOT NULL,
                screenshot_url VARCHAR(255),
                status ENUM('open', 'pending', 'solve_requested', 'closed', 'not_solved') DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES users(id),
                FOREIGN KEY (assigned_engineer_id) REFERENCES users(id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_updates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id INT NOT NULL,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                update_type ENUM('status_change', 'comment') DEFAULT 'comment',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                admin_id INT NOT NULL,
                content_text TEXT,
                media_url VARCHAR(255),
                media_type ENUM('image','video','audio','text') DEFAULT 'text',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admin_id) REFERENCES users(id)
            )
        `);

        const [rows] = await pool.query('SELECT * FROM users WHERE role = ?', ['admin']);
        if (rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['System Admin', 'admin@support.com', hashedPassword, 'admin']
            );
        }

        try { await pool.query('ALTER TABLE users ADD COLUMN profile_photo VARCHAR(255)'); } catch (e) {}
        try { await pool.query('ALTER TABLE tickets MODIFY COLUMN screenshot_url TEXT'); } catch (e) {}
        try { await pool.query('ALTER TABLE tickets ADD COLUMN is_archived BOOLEAN DEFAULT FALSE'); } catch (e) {}
        try { await pool.query('ALTER TABLE users ADD COLUMN location VARCHAR(255)'); } catch (e) {}
        try { await pool.query('ALTER TABLE users MODIFY password VARCHAR(255) NULL'); } catch (e) {}
        try { await pool.query("ALTER TABLE users ADD COLUMN account_status ENUM('pending_verification', 'pending_approval', 'active', 'declined', 'inactive') DEFAULT 'active'"); } catch (e) {}
        try { await pool.query('ALTER TABLE users ADD COLUMN otp VARCHAR(6) NULL'); await pool.query('ALTER TABLE users ADD COLUMN otp_expiry DATETIME NULL'); } catch (e) {}
        try {
            await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'engineer', 'customer', 'salesman', 'sales_executive') DEFAULT 'customer'");
            await pool.query("UPDATE users SET role = 'sales_executive' WHERE role = 'salesman'");
            await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'engineer', 'customer', 'sales_executive') DEFAULT 'customer'");
        } catch (e) {}
        try {
            await pool.query('ALTER TABLE tickets ADD COLUMN raised_by_salesman_id INT NULL');
            await pool.query('ALTER TABLE tickets ADD CONSTRAINT fk_salesman FOREIGN KEY (raised_by_salesman_id) REFERENCES users(id)');
        } catch (e) {}
        try {
            await pool.query('ALTER TABLE tickets ADD COLUMN engineer_rating INT NULL');
            await pool.query('ALTER TABLE tickets ADD COLUMN engineer_feedback TEXT NULL');
        } catch (e) {}
        try {
            await pool.query('ALTER TABLE tickets ADD COLUMN customer_ticket_no INT DEFAULT 1');
        } catch (e) {}

        console.log("Database initialized successfully");
    } catch (err) {
        console.error("DB init error:", err.message);
    }
})();

export default pool;
