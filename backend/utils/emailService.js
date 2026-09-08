import nodemailer from 'nodemailer';
import poolPromise from '../db.js';

const getEmailSettings = async () => {
    try {
        const pool = await poolPromise;
        const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        
        // Fallback to environment variables if DB settings are missing
        if (!settings.smtp_email && process.env.SMTP_EMAIL) {
            settings.smtp_email = process.env.SMTP_EMAIL;
        }
        if (!settings.smtp_password && process.env.SMTP_PASSWORD) {
            settings.smtp_password = process.env.SMTP_PASSWORD;
        }
        if (!settings.admin_notification_email && process.env.ADMIN_NOTIFICATION_EMAIL) {
            settings.admin_notification_email = process.env.ADMIN_NOTIFICATION_EMAIL;
        }
        return settings;
    } catch (error) {
        console.error('Error fetching email settings:', error.message);
        return {
            smtp_email: process.env.SMTP_EMAIL,
            smtp_password: process.env.SMTP_PASSWORD,
            admin_notification_email: process.env.ADMIN_NOTIFICATION_EMAIL
        };
    }
};

const createTransporter = (settings) => {
    const email = settings.smtp_email;
    const password = settings.smtp_password ? settings.smtp_password.replace(/\s+/g, '') : '';

    if (!email || !password) {
        console.warn('⚠️ Cannot create SMTP Transporter: Email or Password missing in Admin Panel settings and .env.');
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: email.trim(),
            pass: password
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

export const sendAdminNotification = async (subject, htmlBody) => {
    const settings = await getEmailSettings();
    const adminEmail = settings.admin_notification_email || settings.smtp_email;
    const transporter = createTransporter(settings);

    if (!transporter || !adminEmail) {
        console.warn('⚠️ Cannot send Admin email: SMTP settings not configured in Admin Panel.');
        return { success: false, error: 'SMTP settings missing' };
    }

    try {
        await transporter.sendMail({
            from: `"SupportDesk System" <${settings.smtp_email}>`,
            to: adminEmail,
            subject: subject,
            html: htmlBody
        });
        console.log('✅ Admin notification email sent successfully.');
        return { success: true };
    } catch (error) {
        console.error('❌ Error sending admin email:', error.message);
        return { success: false, error: error.message };
    }
};

export const sendCustomerOTP = async (email, otp) => {
    const settings = await getEmailSettings();
    const transporter = createTransporter(settings);

    if (!transporter) {
        console.warn('⚠️ Cannot send OTP email: SMTP settings not configured in Admin Panel.');
        return { success: false, error: 'SMTP settings not configured in Admin Settings.' };
    }

    try {
        await transporter.sendMail({
            from: `"SupportDesk Verification" <${settings.smtp_email}>`,
            to: email,
            subject: 'Your SupportDesk OTP Code',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 25px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #0f172a; color: #f8fafc;">
                    <h2 style="color: #6366f1; font-size: 24px; margin-bottom: 8px;">SupportDesk Account Verification</h2>
                    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">Thank you for creating an account. Use the 6-digit OTP code below to verify your email address:</p>
                    <div style="background: #1e293b; padding: 16px 24px; border-radius: 12px; display: inline-block; border: 1px solid #334155; margin-bottom: 24px;">
                        <span style="color: #818cf8; font-size: 36px; font-weight: bold; letter-spacing: 8px;">${otp}</span>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">This OTP is valid for <strong>15 minutes</strong>. If you did not request this, please ignore this email.</p>
                </div>
            `
        });
        console.log(`✅ OTP email sent successfully to ${email}.`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error sending OTP email:', error.message);
        return { success: false, error: error.message };
    }
};

export const sendPasswordResetOTP = async (email, otp) => {
    const settings = await getEmailSettings();
    const transporter = createTransporter(settings);

    if (!transporter) {
        console.warn('⚠️ Cannot send password reset email: SMTP settings not configured.');
        return { success: false, error: 'SMTP settings missing' };
    }

    try {
        await transporter.sendMail({
            from: `"SupportDesk" <${settings.smtp_email}>`,
            to: email,
            subject: 'Password Reset OTP - SupportDesk',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #0f172a; color: #f8fafc;">
                    <h2 style="color: #6366f1;">Password Reset Request</h2>
                    <p style="color: #94a3b8;">We received a request to reset your password. Use the OTP below:</p>
                    <div style="background: #1e293b; padding: 16px 24px; border-radius: 12px; display: inline-block; border: 1px solid #334155; margin: 20px 0;">
                        <span style="color: #818cf8; font-size: 36px; font-weight: bold; letter-spacing: 8px;">${otp}</span>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px;">This OTP is valid for <strong>15 minutes</strong>.</p>
                </div>
            `
        });
        console.log(`✅ Password reset OTP sent to ${email}.`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error sending password reset email:', error.message);
        return { success: false, error: error.message };
    }
};
