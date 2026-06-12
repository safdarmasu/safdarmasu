# 🕶️ OPTISOFT - Optical Shop POS & Inventory Suite

OPTISOFT is a premium, fully-functional management software custom-built for optical retail shops. It streamlines customer profiles, keeps historical eye prescription records, processes split-deposit transactions, and manages inventory stock levels for frames and lenses with a zero-typing, tablet-optimized touchscreen user interface.

---

## ✨ Core Features

- **📊 Visual Dashboard**: Live analytics showing collected sales, outstanding customer balances, pending orders status, and low-stock inventory alerts.
- **👁️ Zero-Typing prescription Matrix**: Interactive scroll-wheels to input Right Eye (OD) and Left Eye (OS) Sphere (SPH), Cylinder (CYL), and Addition (ADD) measurements without triggering virtual keyboards.
- **💰 Two-Table Billing (Split Payment)**: Allows logging custom deposits, automatic calculations for remaining balances, and tracking installments via a dedicated Payment Log ledger ("Table B").
- **📦 Smart Inventory Control**:
  - Automatically handles stock deductions upon order checkouts.
  - **Inventory Disconnection**: Automatically generates missing lens entries and handles out-of-stock items if they are custom orders.
- **👤 Customer History Directory**: Clean cards searching database records of past customer prescriptions and order timelines.
- **📱 Responsive Bottom Navigation**: A mobile-first UI optimized for desktop monitors, iPads, and mobile screens.

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TailwindCSS (v4)
- **Backend API**: Express (Node.js) with CORS enabled
- **Database**: MariaDB / MySQL via XAMPP
- **ORM**: Prisma Client

---

## 🚀 How to Run Locally

### Prerequisites
1. **Node.js** (v18+)
2. **XAMPP / MariaDB** (Running MySQL on port `3306`)

### Step 1: Clone and Install
```bash
git clone https://github.com/safdarmasu/safdarmasu.git optisoft
cd optisoft
npm install
```

### Step 2: Set up the Database
Make sure your MySQL server is running (e.g., in XAMPP Control Panel) and you have a database named `dhrashti_db`. Then run:
```bash
npx prisma db push
npm run seed
```

### Step 3: Run the Servers
Open two terminal windows to run both the API backend and Vite client:
- **Terminal 1 (Backend)**:
  ```bash
  npm run server
  ```
- **Terminal 2 (Frontend)**:
  ```bash
  npm run dev
  ```

---

## 📱 Accessing on Other Devices (Wi-Fi Setup)

Because the database runs locally on the shop's PC, you can connect other devices (like smartphones or tablets) on the same Wi-Fi network:

1. Connect the phone/tablet to the **same Wi-Fi** network as the host PC.
2. Open the PC's local network URL on the device's browser:
   **`http://10.90.85.155:5173/`**
3. The frontend will automatically detect the host and connect to the Express API at `http://10.90.85.155:5000` to fetch and write data!

### 🔒 Windows Firewall Troubleshooting
If other devices fail to load the page, run this command in **PowerShell (as Administrator)** on the host PC to open the ports:
```powershell
New-NetFirewallRule -DisplayName "OPTISOFT Vite Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "OPTISOFT Node API Server" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```
