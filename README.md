# 🛠️ SupportDesk - Full-Stack IT Support & Ticket Management System

SupportDesk is a modern, enterprise-grade multi-role IT Support & Ticket Management System built with **React (Vite)**, **Express.js (Node.js)**, **MySQL (Aiven Cloud / Local MySQL)**, and **Tailwind CSS**.

---

## ✨ Features & User Roles

### 👑 Admin Dashboard
- **Overview Analytics**: Real-time stats on tickets, admins, engineers, and ticket status breakdowns.
- **Ticket Management**: View active and historical tickets, search by customer/salesman name, filter by date range, and assign engineers dynamically.
- **User Management**: Add, approve, decline, deactivate, or delete Engineers, Sales Executives, and Customers.
- **Approval Queue**: Dedicated approvals tab to review new customer sign-ups with detailed user modals.
- **System Email Settings**: Configure Gmail SMTP and 16-digit Google App Password for automated OTPs and email notifications.

### 🛠️ Engineer Dashboard
- **Assigned Tickets**: View and manage tickets assigned specifically to the logged-in engineer.
- **Status Workflows**: Update ticket status (`open` ➔ `pending` ➔ `solve_requested` ➔ `closed`).
- **Interactive Updates**: Post comments and communicate directly on ticket threads.

### 💼 Sales Executive Dashboard
- **Raise Tickets on Behalf of Customers**: Auto-creates or links customer profiles using phone numbers.
- **Ticket Tracking**: Monitor raised ticket statuses and customer resolution progress.

### 👤 Customer Dashboard
- **Ticket Submission**: Raise tickets with multiple screenshot file attachments.
- **Engineer Transparency**: View assigned support engineer details (name, photo, phone number).
- **Feedback & Rating**: Rate engineer support experience upon ticket closure (1-5 stars with feedback text).

### 🔑 Authentication & Security
- **Google OAuth 2.0 Integration**: Single Sign-On with dedicated profile completion modal for new users.
- **Email OTP Verification**: 6-digit OTP verification for new customer registrations.
- **Forgot Password Workflow**: 3-step OTP-based password reset directly from the login page.
- **JWT Authentication**: Secure token-based session handling.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router DOM, React Icons, Axios, `@react-oauth/google`.
- **Backend**: Node.js, Express.js, `mysql2/promise` (with SSL support), JWT, Bcrypt, Multer (File Uploads), Nodemailer.
- **Database**: Cloud MySQL (Aiven Cloud MySQL / TiDB / CleverCloud / Local MySQL).
- **Hosting / Deployment**: Vercel (Serverless Functions & Vite SPA Deployment).

---

## 🚀 Local Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Git](https://git-scm.com/)
- MySQL Server (Local MySQL or Cloud Database like Aiven)

### 1. Clone the Repository
```bash
git clone https://github.com/shailenderga/keyprime.git
cd keyprime
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:
```env
PORT=5000
DB_HOST=mysql-e38187b-keyprime-e0a5.k.aivencloud.com
DB_USER=avnadmin
DB_PASSWORD=your_aiven_db_password
DB_NAME=defaultdb
DB_PORT=20690
JWT_SECRET=supersecretjwtkey
```

Start the Backend development server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend/` folder:
```env
VITE_API_URL=http://localhost:5000
```

Start the Frontend development server:
```bash
npm run dev
```

---

## 🌐 Complete Deployment Guide (Vercel + Aiven MySQL)

### Step 1: Configure Aiven Cloud MySQL
1. Log in to [Aiven Console](https://console.aiven.io).
2. Select your **MySQL Service** ➔ Go to the **Overview** tab.
3. Scroll down to **IP Allowlist** ➔ Click **Add IP address** ➔ Enter `0.0.0.0/0` (Allows incoming Vercel connections) ➔ Click **Save**.
4. Copy your connection parameters under **Connection Information**:
   - **Host**: `mysql-e38187b-keyprime-e0a5.k.aivencloud.com`
   - **User**: `avnadmin`
   - **Password**: *(Click eye icon to reveal and copy)*
   - **Port**: `20690`
   - **Database**: `defaultdb`

---

### Step 2: Deploy Backend to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** ➔ **Project**.
3. Import your GitHub repository: `shailenderga/keyprime`.
4. On the **Configure Project** page:
   - **Root Directory**: Click *Edit* ➔ Select the `backend` folder.
5. Expand **Environment Variables** and add the following 6 keys:

| Environment Variable | Value |
|----------------------|-------|
| `DB_HOST` | `mysql-e38187b-keyprime-e0a5.k.aivencloud.com` |
| `DB_USER` | `avnadmin` |
| `DB_PASSWORD` | *Your Aiven Database Password* |
| `DB_NAME` | `defaultdb` |
| `DB_PORT` | `20690` |
| `JWT_SECRET` | `supersecretjwtkey` |

6. Click **Deploy**.
7. Once deployed, copy your active Backend URL (e.g., `https://helpdesk-pi-eight.vercel.app`).

---

### Step 3: Deploy Frontend to Vercel
1. Return to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** ➔ **Project**.
3. Import the same GitHub repository (`shailenderga/keyprime`).
4. On the **Configure Project** page:
   - **Root Directory**: Click *Edit* ➔ Select the `frontend` folder.
   - **Framework Preset**: `Vite` (Default).
5. Expand **Environment Variables** and add 1 key:

| Environment Variable | Value |
|----------------------|-------|
| `VITE_API_URL` | `https://helpdesk-pi-eight.vercel.app` *(Your Deployed Backend URL)* |

6. Click **Deploy**.
7. Once deployed, open your live application (e.g., `https://keyprimehelpdesk.vercel.app`).

---

## 🔑 Default Admin Account

Upon initial database startup, a default administrator account is automatically created:

- **Email**: `admin@support.com`
- **Password**: `admin123`

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
