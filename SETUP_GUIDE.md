# LeadPro V2 — Complete Setup & Upgrade Guide

---

## WHAT'S NEW IN V2

| Module | What was added |
|---|---|
| Interaction Images | Attach photos to any meeting/site visit |
| Master List | Catalogue of materials, products, services with rates |
| Quotation Builder | Room-wise item tables, auto-fill from master list, version history |
| Quotation Approval | Employee → Owner review flow with per-item revision notes |
| Signoff Document | Generate + print client signoff with scope, T&C |
| Projects | Full project lifecycle after lead is WON |
| Design Approval | Upload designs per phase, mark Approved / Revision |
| Site Photos | Photo timeline attached to each project |
| Finance | Pay In/Out entries, Ledger per party, Monthly P&L |
| Fixed Costs | Rent, salaries, maintenance tracked separately |
| Database | Migrated from SQLite → PostgreSQL (Supabase) |
| Cloudinary | 4 separate accounts: Sales / Design / Site / Docs |

---

## STEP 1 — Create Free Supabase Database

1. Go to https://supabase.com and create a free account
2. Create a new project (free tier, choose region closest to India)
3. Wait ~2 minutes for project to provision
4. Go to: Project Settings → Database → Connection string
5. Select **URI** mode — copy the full string (starts with `postgresql://`)
6. It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`
7. Keep this — you'll need it in Step 3

---

## STEP 2 — Create 4 Cloudinary Accounts

Create 4 **separate** free Cloudinary accounts (use different email addresses or add +1, +2 to the same Gmail):

| Account | Purpose | Store in .env as |
|---|---|---|
| Account 1 | Lead attachments + Interaction images | CLOUDINARY_SALES_* |
| Account 2 | Design approval images | CLOUDINARY_DESIGN_* |
| Account 3 | Site progress photos | CLOUDINARY_SITE_* |
| Account 4 | Receipts + payment screenshots | CLOUDINARY_DOCS_* |

For each account, go to: Dashboard → copy **Cloud Name**, **API Key**, **API Secret**

---

## STEP 3 — Configure Environment Variables

In the `backend/` folder, copy `.env.example` to `.env`:

```
cp .env.example .env
```

Then open `.env` and fill in:
- `DATABASE_URL` — from Step 1
- All 4 Cloudinary sets — from Step 2
- `JWT_SECRET` — any long random string (e.g. type random characters)
- `FIRM_INITIALS` — e.g. `KK`
- `FIRM_NAME` — your firm name
- `PORT=5000`

In the `frontend/` folder, create `.env`:
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_FIRM_NAME=Your Firm Name
REACT_APP_FIRM_ADDRESS=Your address
REACT_APP_FIRM_PHONE=+91 XXXXXXXXXX
REACT_APP_FIRM_GST=GSTIN (optional)
```

---

## STEP 4 — Migrate Your Old Data (IMPORTANT — do this before anything else)

This step copies all your existing leads, interactions, reminders, and users from the old SQLite database into the new PostgreSQL database. Your old data is not deleted — this is a safe copy.

```bash
cd backend

# Install dependencies first
npm install

# Generate Prisma client
npx prisma generate

# Push schema to PostgreSQL (creates all tables)
npx prisma db push

# Now migrate old data
# Set SQLITE_PATH in .env to point to your old database file
# Example: SQLITE_PATH=../../leadpro_old/backend/prisma/dev.db

node prisma/migrate_from_sqlite.js
```

You will see output like:
```
🔄 Starting migration from SQLite → PostgreSQL...
👤 Migrating 5 users...
✅ Users done
📋 Migrating 48 leads...
✅ Leads done
💬 Migrating 134 interactions...
✅ Interactions done
📎 Migrating 12 attachments...
✅ Attachments done
🔔 Migrating 23 reminders...
✅ Reminders done
🎉 Migration complete!
```

---

## STEP 5 — Install & Start

### Backend
```bash
cd backend
npm install
npm run dev
```

You should see: `LeadPro server running on port 5000`

### Frontend (new terminal)
```bash
cd frontend
npm install
npm start
```

App opens at http://localhost:3000

---

## STEP 6 — LAN Access (For Your Team Over WiFi)

Employees connect to the same WiFi router as your laptop. They need your laptop's IP address.

**Find your laptop's IP:**
```bash
# Windows:
ipconfig
# Look for "IPv4 Address" under WiFi — e.g. 192.168.1.105

# Mac/Linux:
ifconfig | grep inet
```

**Update frontend/.env:**
```
REACT_APP_API_URL=http://192.168.1.105:5000/api
```
(Replace with your actual IP)

Then rebuild frontend:
```bash
cd frontend
npm run build
```

**Serve the build:**
```bash
npm install -g serve
serve -s build -l 3000
```

Employees can now open: `http://192.168.1.105:3000` in their browser.

> **Note:** Every time your laptop gets a new IP from the router, you need to update this. To fix permanently, set a static IP for your laptop in your router's DHCP settings.

---

## STEP 7 — Create Initial Admin User

After the migration, your existing users are already in the database.

If you need to set one user as CO_ADMIN (your brother):
1. Login as ADMIN
2. Go to Team page
3. Edit your brother's user → change role to CO_ADMIN

---

## USER ROLES

| Role | Can do |
|---|---|
| ADMIN | Everything + create users + assign CO_ADMIN |
| CO_ADMIN | Everything ADMIN can do (finance, approve quotations, manage projects) |
| EXECUTIVE | Leads, interactions, create quotations (cannot approve, cannot see Finance) |

---

## DAILY WORKFLOW

### For Executives:
1. Add leads → log interactions → attach photos
2. Create quotation from lead → submit for review
3. After rejection, edit → submit again

### For Owners (ADMIN / CO_ADMIN):
1. Review submitted quotations → approve or send back with notes
2. Send approved quotation to client → mark as sent
3. After client agrees → generate signoff document → print → get signed
4. Create project from WON lead
5. Track design phases → mark approved / revision
6. Log payment entries → view ledger per client/vendor
7. Monthly P&L in Finance tab

---

## CLOUDINARY FREE TIER LIMITS (per account)

- 25 credits/month (~25GB bandwidth or ~25,000 images)
- 25GB storage total
- With 4 accounts: ~100GB storage, ~100GB bandwidth/month

---

## BACKUP

Your data is in Supabase (PostgreSQL in the cloud). Supabase automatically backs up daily on the free tier.

To export manually:
```bash
cd backend
npx prisma db pull  # sync schema
# Or use Supabase Dashboard → Table Editor → Export CSV
```

---

## TROUBLESHOOTING

| Problem | Fix |
|---|---|
| `Cannot connect to database` | Check DATABASE_URL in .env — especially the password |
| `Image upload fails` | Check Cloudinary credentials in .env |
| `Employees can't connect` | Check your laptop's IP and update REACT_APP_API_URL |
| `Port 5000 already in use` | Change PORT in .env to 5001 |
| `Migration shows 0 records` | Check SQLITE_PATH points to the correct .db file |
