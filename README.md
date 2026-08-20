# 🛠️ SupportDesk - Full-Stack IT Support & Ticket Management System

SupportDesk is a modern, enterprise-grade multi-role IT Support & Ticket Management System built with **React 18 (Vite)**, **Express.js (Node.js)**, **MySQL (Aiven Cloud / Local MySQL)**, and **Tailwind CSS**.

---

## 🔗 Live Application Links

- **🌐 Live Web App**: [https://keyprimehelpdesk.vercel.app](https://keyprimehelpdesk.vercel.app)
- **⚡ Backend API Server**: [https://helpdesk-pi-eight.vercel.app](https://helpdesk-pi-eight.vercel.app)
- **📦 GitHub Repository**: [https://github.com/shailenderga/keyprime](https://github.com/shailenderga/keyprime)

---

## ✨ Features & User Roles Breakdown

### ⚡ Real-Time Live Synchronization (3-Second Auto-Sync)
- **Instant Multi-Device Auto-Polling**: All dashboards (Admin, Engineer, Sales Executive, Customer) automatically poll updates every 3 seconds seamlessly.
- **Zero Manual Reloads Needed**: When Admin raises or assigns a ticket, or when an Engineer updates ticket status or posts a comment, changes instantly reflect across all logged-in devices.

---

### 👑 Admin Dashboard
- **Overview Analytics**: Real-time stats on tickets, users, role distributions, and center-aligned engineer performance metrics with dark-mode date range filters.
- **Admin Ticket Creation**: Dedicated `+ Raise Ticket` modal to create tickets for existing or new customers (auto-registered via phone) with engineer assignment.
- **Ticket Deletion & Status Management**: Permanently delete any unwanted/test ticket, or directly update ticket status (Solve & Close, Mark Pending, Reopen).
- **Engineer Rating & Review**: Interactive 5-Star Rating component + Feedback Textarea allowing Admin to review and rate assigned engineers directly.
- **User Management & Approvals**: Add, approve, decline, deactivate, or delete Engineers, Sales Executives, and Customers.
- **System Email Settings**: Configure Gmail SMTP and 16-digit Google App Password for automated OTPs and email notifications.

---

### 🛠️ Engineer Dashboard
- **Engineer Ticket Creation & Auto-Assignment**: `+ Raise Ticket` modal allowing Engineers to raise tickets directly, which are **automatically assigned to themselves** (`assigned_engineer_id = engineer_id`).
- **Assigned Workspace**: View active and historical tickets assigned specifically to the logged-in engineer.
- **Status Workflows**: Update ticket status (`open` ➔ `pending` ➔ `solve_requested` ➔ `closed`) with details about fixes.
- **Interactive Discussion Threads**: Post comments and communicate directly on ticket activity timelines.

---

### 💼 Sales Executive Dashboard
- **Raise Tickets on Behalf of Customers**: Auto-creates or links customer profiles using phone numbers and store details.
- **Progress Tracking**: Monitor ticket statuses, engineer assignments, and resolution updates in real-time.

---

### 👤 Customer Dashboard
- **Streamlined Ticket Submission**: Raise support tickets with multiple screenshot file attachments.
- **Engineer Transparency**: View assigned support engineer details (name, photo, phone number).
- **Feedback & Rating**: Rate engineer support experience upon ticket closure (1-5 stars with written feedback).

---

### 🏷️ Explicit Ticket Attribution ("Raised By")
Every ticket across all dashboards features clear visual badges indicating who initiated the ticket:
- 🟣 **`Raised By: Admin ([Name])`**
- 🟢 **`Raised By: Engineer ([Name]) (Self-Assigned)`**
- 🟠 **`Raised By: Sales Exec ([Name])`**
- 🔵 **`Raised By: Customer (Direct)`**

---

### 🔑 Authentication & Security
- **Google OAuth 2.0 Integration**: Single Sign-On with dedicated profile completion modal for new users.
- **Email OTP Verification**: 6-digit OTP verification for new customer registrations.
- **Forgot Password Workflow**: 3-step OTP-based password reset directly from the login page.
- **Password Eye Toggle**: Interactive password visibility toggle buttons (`FiEye` / `FiEyeOff`).
- **JWT Authentication**: Secure token-based session handling.

---

## 📊 Database Schema Overview

```sql
-- Users Table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  store_name VARCHAR(255) NULL,
  location VARCHAR(255) NULL,
  role ENUM('admin', 'engineer', 'sales_executive', 'customer') DEFAULT 'customer',
  account_status ENUM('pending', 'active', 'declined', 'deactivated') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets Table
CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  customer_ticket_no INT DEFAULT 1,
  software_version VARCHAR(100) NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT NULL,
  status ENUM('open', 'pending', 'solve_requested', 'closed', 'not_solved') DEFAULT 'open',
  assigned_engineer_id INT NULL,
  raised_by_salesman_id INT NULL,
  raised_by_admin_id INT NULL,
  raised_by_engineer_id INT NULL,
  engineer_rating INT NULL,
  engineer_feedback TEXT NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (assigned_engineer_id) REFERENCES users(id)
);

-- Ticket Updates (Activity Timeline) Table
CREATE TABLE ticket_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  status_change VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 📡 API Endpoint Directory

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new customer with OTP verification |
| `POST` | `/api/auth/login` | Authenticate user and return JWT token |
| `POST` | `/api/auth/google` | Google OAuth Single Sign-On |
| `POST` | `/api/auth/send-otp` | Send 6-digit email OTP for verification/reset |
| `POST` | `/api/auth/verify-otp` | Verify OTP for registration or password reset |
| `POST` | `/api/auth/reset-password` | Reset password using verified OTP |
| `GET` | `/api/auth/users` | Fetch all system users (Admin only) |
| `GET` | `/api/auth/engineers` | Fetch all active engineers |

### Tickets (`/api/tickets`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tickets` | Fetch tickets filtered by role, user ID, and tab |
| `GET` | `/api/tickets/stats` | Fetch aggregated ticket, user, and engineer performance stats |
| `POST` | `/api/tickets` | Create a new ticket (Customer) |
| `POST` | `/api/tickets/admin` | Create a new ticket (Admin) |
| `POST` | `/api/tickets/engineer` | Create a new ticket with self-assignment (Engineer) |
| `PUT` | `/api/tickets/:id/assign` | Assign an engineer to a ticket |
| `PUT` | `/api/tickets/:id/status` | Update ticket status (`open`, `pending`, `solve_requested`, `closed`) |
| `POST` | `/api/tickets/:id/comments` | Add a comment/reply to ticket timeline |
| `POST` | `/api/tickets/:id/rate` | Submit 1-5 star rating and feedback for engineer |
| `DELETE` | `/api/tickets/:id` | Permanently delete a ticket and its updates |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router DOM, React Icons, Axios, `@react-oauth/google`.
- **Backend**: Node.js, Express.js, `mysql2/promise` (with SSL support), JWT, Bcrypt, Multer (File Uploads), Nodemailer.
- **Database**: Cloud MySQL (Aiven Cloud MySQL / TiDB / Local MySQL).
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
DB_PASSWORD=YOUR_AIVEN_DB_PASSWORD
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
5. Expand **Environment Variables** and add the following keys:

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
