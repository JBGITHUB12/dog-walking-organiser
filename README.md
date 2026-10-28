# 🐾 Dog Walking Organiser & Security Hub

A complete **Mobile Phone App (PWA)** and web application equipped with a **Central Menu Hub**, **"What Does Today Look Like?" Live Agenda**, **"Go to Paper" Clipboard Printing**, **"Export to Excel" (.csv) Spreadsheets**, **Dog Incompatibility Rules**, **Admin-Controlled Registration**, **Photo Montage Studio** for WhatsApp & Instagram, and **Live Video Demonstrations (Desktop & Mobile App Mode)**.

---

## 🎬 Video Demonstrations (Desktop & Mobile App Mode)

* **Watch in App**: Launch the app and click the orange **"▶️ Watch Video Demo"** button on the Menu Hub to toggle between **Desktop Mode** and **Mobile Phone Mode** with 1 click.
* **📱 Mobile Phone App Mode Videos**:
  * [`dog_walker_mobile_demo.mp4`](dog_walker_mobile_demo.mp4) (MP4)
  * [`dog_walker_mobile_demo.webm`](dog_walker_mobile_demo.webm) (WebM)
* **🖥️ Desktop Mode Videos**:
  * [`dog_walker_app_demo.mp4`](dog_walker_app_demo.mp4) (MP4)
  * [`dog_walker_app_demo.webm`](dog_walker_app_demo.webm) (WebM)

---

## 🌟 Key Features

### 1. 🏠 Central Menu Hub & Dashboard
* **Quick Stats Hero**: Summary of today's walk status, weekly walk count, total cost billing, and active dog & walker profiles.
* **Quick Action Launchers**:
  * 📅 **Schedule Walks with Dogs**: Paste WhatsApp messages, parse schedules, detect dog compatibility conflicts, and sync to Google Calendar / `.ICS`.
  * 📸 **Post the Walk (Montage Studio)**: Create stylish photo collages (Grid, Polaroid, Instagram Story 9:16) with tags, captions, and 1-click sharing to WhatsApp & Instagram.
  * 🐶 **Add & Manage Dogs**: Setup dog breeds, solo walk settings, "Does NOT walk with" rival safety lists, and routine notes.
  * 👤 **Add Walker Contacts & Rates**: Manage walker WhatsApp numbers, Instagram handles, currency symbols, and custom rates.
  * 🖨️ **Go to Paper (Print Run-Sheet)**: High-contrast, printable physical run-sheets with checkboxes for clipboards.
  * 📊 **Export All to Excel (.csv)**: 1-click export of complete schedule, dog directory, rates, and financial totals into an Excel-ready spreadsheet.

### 2. ☀️ "What Does Today Look Like?" (Live Daily Agenda)
* Shows today's walk time, duration, active dog, walker, and pack companions.
* Interactive Live Status Toggles: `⏳ Scheduled` ➔ `🐾 On Walk / In Progress` ➔ `✅ Completed / Walk Done`.
* Emergency & Lockbox Routine instructions visible at a glance.
* 1-Click **"Create Montage for Today's Walk"** button to jump straight into snapping and sharing walk photos.

### 3. 🖨️ "Go to Paper" (Printable Clipboard Run-Sheets)
* Formatted with clean high-contrast black-and-white `@media print` styling for standard A4 and Letter paper.
* Includes physical check-off boxes (`☐`), dog emergency notes, lockbox codes, walker phone numbers, and signature line for walkers carrying physical clipboards.

### 4. 📊 "Export All to Excel Spreadsheet" (.csv)
* Generates a multi-section `.csv` file with UTF-8 BOM encoding for seamless opening in Microsoft Excel, Google Sheets, or Apple Numbers.

### 5. 🛡️ Admin-Controlled Registration & Security
* **Public Self-Registration Disabled**: Only an authenticated Administrator can register new user/walker accounts.
* **Cryptographic Security**: PBKDF2 with SHA-256 (100,000 iterations + 16-byte random salt).
* **DOM XSS Sanitization**: Strict HTML escaping on all inputs.
* **Brute Force Lockout**: 5 failed login attempts locks access for 60 seconds.

---

## 🔑 Pre-Configured Test Accounts

| Role | Username | Default Password | Permissions |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin` | `admin123` | Full Access (Register Users, Edit Rates, Safety Rules) |
| **🐾 Walker** | `sarah` | `walker123` | Walker Access (Schedule, Today's Agenda, Montages) |

---

## 🚀 How to Launch

1. Double-click [`start_app.bat`](start_app.bat) or open [`index.html`](index.html).
2. Sign in with `admin` / `admin123`.
