# AU Campaign CRM — Enterprise Calling & Sales Pipeline

An enterprise-grade, high-velocity telemarketing and sales pipeline CRM engineered for commercial outreach campaigns across Australia.

Designed with inspiration from **Attio** (CRM ergonomics & relationship modeling), **Linear** (minimalist navigation & information hierarchy), and **Stripe** (clarity in data presentation and tabular metrics).

---

## Key Features

- **Australian Timezone Intelligence**: Live state-by-state clock badges (NSW, VIC, QLD, SA, WA) with automatic after-hours warnings to prevent compliance violations.
- **Auto Dialer & Customizable Calling Campaigns**: Configurable lead queue filterable by disposition status (e.g. call only *No Answer* and *New* leads) with auto-countdown and pitch battlecards.
- **1-Click Call Dispositions**: Fast-action outcomes (`Book Appointment`, `Interested`, `Callback`, `No Answer`, `Wrong Number`, `Not Interested`) with automatic audit history and follow-up date scheduling.
- **Integrated Sales Appointments Pipeline**: First-class appointment scheduling with stand requirements, quote references, rep assignment, and multi-stage deal tracking.
- **Strict Role Boundaries**:
  - **Agents**: Call leads, update telephone numbers, add secondary contacts, schedule follow-ups, and book appointments.
  - **Administrators**: Full company directory control (add/edit/delete companies), team agent roster management, CSV export, and system audit logs.
- **Pacer & Daily Goals**: Visual progress tracking against daily call quotas.
- **Dual Mode (Local / Cloud Sync)**: Fully functional offline with browser `localStorage` or connected to a Google Apps Script backend for multi-agent real-time team synchronization.

---

## Project Structure

```
au-campaign-crm/
├── index.html                   # Main application entry point
├── serve.js                     # Local zero-dependency HTTP server
├── css/
│   ├── variables.css            # Attio/Linear/Stripe design tokens & themes
│   ├── base.css                 # Reset, typography (Inter), base styles
│   ├── layout.css               # Linear sidebar & top breadcrumbs bar
│   ├── components.css           # Stripe-style tables, badges, cards, modals
│   ├── dialer.css               # Telemarketing dialer & 1-click disposition grid
│   └── main.css                 # CSS manifest
└── js/
    ├── app.js                   # Application controller & action event dispatch
    ├── config.js                # App configuration, statuses, and SVG icons
    ├── router.js                # View routing & application layout shell
    ├── state.js                 # Unified state store & active sessions
    ├── components/
    │   ├── autodialer-setup.js  # Status selector modal for Auto Dialer
    │   ├── battlecard.js        # Pitch script & objection battlecard
    │   ├── history.js           # Interactive call history timeline
    │   ├── modals.js            # Lead log, company edit, and appointment modals
    │   ├── pacer.js             # Daily call goal progress bar
    │   └── toast.js             # Overdue callback notifications
    ├── services/
    │   ├── auth.js              # Session manager & role permission guards
    │   └── sync.js              # Differential cloud sync protocol & audit logging
    ├── utils/
    │   ├── csv.js               # CSV importer/exporter
    │   ├── dates.js             # Australian timezone dates & business hours logic
    │   └── dom.js               # DOM selectors & string escapers
    └── views/
        ├── dashboard.js         # Operations dashboard & KPI metrics
        ├── queue.js             # Call queue teleprompter
        ├── autodialer.js        # Continuous auto-dialer view
        ├── followups.js         # Scheduled callbacks list
        ├── events.js            # Campaigns & exhibitions directory
        ├── companies.js         # Exhibitors directory table
        ├── appointments.js      # Sales appointments pipeline
        ├── agents.js            # Team management (Admin only)
        └── reports.js           # System audit trail & issue reporting
```

---

## Quick Start

### 1. Run Locally
You can run the application with any static HTTP server or with the included `serve.js`:

```bash
# Using Node.js
node serve.js
```
Then open your browser at:
`http://localhost:8088/au-campaign-crm/index.html`

### 2. Demo Accounts
- **Administrator**: `admin@crm.au` / `admin123`
- **Call Center Agent**: `agent1@crm.au` / `agent123`

---

## Cloud Synchronization (Google Apps Script)

To connect multiple agents or sync live across devices:
1. Deploy a Google Apps Script web app backing a Google Sheet.
2. In `js/config.js`, paste your deployment URL into the `API` constant:
   ```javascript
   export const API = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
   ```
3. The CRM will automatically switch to cloud synchronization mode.
