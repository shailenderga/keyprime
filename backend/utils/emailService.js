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
        return settings;
    } catch (error) {
        console.error('Error fetching email settings:', error.message);
        return {};
    }
};

const createTransporter = (settings) => {
    if (!settings.smtp_email || !settings.smtp_password) {
        return null;
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: settings.smtp_email,
            pass: settings.smtp_password
        }
    });
};

export const sendAdminNotification = async (subject, htmlBody) => {
    const settings = await getEmailSettings();
    const adminEmail = settings.admin_notification_email || settings.smtp_email;
    const transporter = createTransporter(settings);

    if (!transporter || !adminEmail) {
        console.warn('⚠️ Cannot send Admin email: SMTP settings not configured in Admin Panel.');
        return;
    }

    try {
        await transporter.sendMail({
            from: `"SupportDesk System" <${settings.smtp_email}>`,
            to: adminEmail,
            subject: subject,
            html: htmlBody
        });
        console.log('✅ Admin notification email sent successfully.');
    } catch (error) {
        console.error('❌ Error sending admin email:', error.message);
    }
};

export const sendCustomerOTP = async (email, otp) => {
    const settings = await getEmailSettings();
    const transporter = createTransporter(settings);

    if (!transporter) {
        console.warn('⚠️ Cannot send OTP email: SMTP settings not configured in Admin Panel.');
        return;
    }

    try {
        await transporter.sendMail({
            from: `"SupportDesk Verification" <${settings.smtp_email}>`,
            to: email,
            subject: 'Your SupportDesk OTP Code',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Welcome to SupportDesk!</h2>
                    <p>Your one-time password (OTP) for account verification is:</p>
                    <h1 style="color: #4f46e5; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                    <p>Please enter this code in the app to activate your account.</p>
                </div>
            `
        });
        console.log(`✅ OTP email sent successfully to ${email}.`);
    } catch (error) {
        console.error('❌ Error sending OTP email:', error.message);
    }
};

export const sendPasswordResetOTP = async (email, otp) => {
    const settings = await getEmailSettings();
    const transporter = createTransporter(settings);

    if (!transporter) {
        console.warn('⚠️ Cannot send password reset email: SMTP settings not configured.');
        return;
    }

    try {
        await transporter.sendMail({
            from: `"SupportDesk" <${settings.smtp_email}>`,
            to: email,
            subject: 'Password Reset OTP - SupportDesk',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #4f46e5;">Password Reset Request</h2>
                    <p style="color: #475569;">We received a request to reset your password. Use the OTP below:</p>
                    <h1 style="color: #4f46e5; font-size: 36px; letter-spacing: 8px; margin: 20px 0;">${otp}</h1>
                    <p style="color: #475569;">This OTP is valid for <strong>15 minutes</strong>.</p>
                    <p style="color: #94a3b8; font-size: 12px;">If you did not request this, please ignore this email.</p>
                </div>
            `
        });
        console.log(`✅ Password reset OTP sent to ${email}.`);
    } catch (error) {
        console.error('❌ Error sending password reset email:', error.message);
    }
};

