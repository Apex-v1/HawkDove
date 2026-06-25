# 🦅🕊️ Jesse Driscoll's HAWK / DOVE

A real-time game theory simulation for the classroom — built for UCSD.

Created and edited by Jesús E. Rojas Venzor based on notes from Jesse Driscoll.

---

## Three Interfaces

| URL | Who uses it | What it does |
|---|---|---|
| `/player` | Students (phones/laptops) | Submit Hawk or Dove, see round results |
| `/display` | Projector / shared screen | Live leaderboard, charts, pairings, voting, newsbox |
| `/admin` | Instructor only (password) | Control all game functions |

---

## How to Deploy (Vercel + GitHub)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial"
gh repo create hawk-dove --public --push
```

### 2. Set Up Upstash Redis

Without this, all data resets every ~1 minute when Vercel's serverless functions go idle.

1. Go to [upstash.com](https://upstash.com) → create a free account
2. Click **Create Database** → name it → choose a region → **Create**
3. On the database page, click the **REST** tab
4. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. Under **Environment Variables**, add:
   ```
   ADMIN_PASSWORD           = (your secret password)
   UPSTASH_REDIS_REST_URL   = (from Upstash REST tab)
   UPSTASH_REDIS_REST_TOKEN = (from Upstash REST tab)
   ```
3. Click **Deploy**

### 4. Share the URLs
- Students: `https://your-app.vercel.app/player`
- Admin panel: `https://your-app.vercel.app/admin`
- Projector: `https://your-app.vercel.app/display`

---

## Admin Panel — Full Guide

Log in at `/admin` using your `ADMIN_PASSWORD`.

---

### Roster Tab

**Uploading students:**
- Prepare a `.xlsx` spreadsheet with columns: `Name`, `Email`, `Tiebreaker`, `Points`
- Drag and drop the file onto the upload area, or click to browse
- Students are loaded instantly
- Re-uploading replaces the entire roster

**Adding students manually:**
- Click **+ Add** in the Add Student card
- Enter name, email, points, and tiebreaker
- Click **Add Student →**

**Deleting students:**
- Click **del** next to any student row
- Confirms before deleting
- Does not affect other students' votes or points

**Editing students inline:**
- Click any row to edit name, email, points, tiebreaker, or Hawk/Dove choice
- The **±** button lets you quickly add or subtract points — type a number and press Enter
- Click 💀 / — in the Elim column to toggle elimination

**% Coup column:**
- Shows the manual probability percentage from the Point Transfer Proposal PDF
- Click the button in the cell to enter edit mode, type the percentage, press Enter or ✓ to save
- Leave blank to show —
- For internal reference only — not shown to students

**Vote eligibility (Vote column):**
- ✓ green = student can vote (default)
- ✕ red = student is blocked from voting
- Click to toggle
- Ineligible students cannot submit a vote and are excluded from the eligible pool

**Sorting:**
- Click any column header to sort ascending/descending

**Protectorate / Staple pairs (Week 2):**
- Use the dropdowns to select Player A, Player B, and which is the Hawk
- Click 📌 Create Protectorate to staple them
- Set how many points Hawk returns — enter fixed pts or a % of what Hawk took
- Click ✕ to remove a protectorate

**Exporting:**
- Click **⬇ Export CSV** in the header to download current standings

---

### Round Controls

| Button | When it appears | What it does |
|---|---|---|
| ▶ Open Round | When no round is active | Lets students submit their choice |
| Close | While round is open | Closes submissions without computing |
| ⚡ Compute | While round is open | Calculates all pairings and deltas |
| 🔀 Re-randomize | After computing, before finalizing | Reshuffles all pairings with a new seed |
| ✕ Cancel Round | After computing, before finalizing | Discards pending round |
| ✓ Finalize & Push | After computing | Applies results to all student balances |

**Display Round override:**
- Type a number and click Set to control which round number shows on `/display`

---

### Round Review Tab

After clicking Compute:
- All pairings shown with players, choices, starting points, delta, and projected balance
- Click **Edit** on any row to manually adjust the delta before finalizing
- Click **🔀 Re-randomize** to reshuffle all pairings from scratch
- Click **✕ Cancel Round** to discard
- Click **✓ Finalize & Push Results** to apply all changes permanently

---

### History Tab

Read-only log of every finalized round. To correct past points, edit the student's current balance in the Roster tab.

---

### Insights Tab

Key stats, Hawk vs Dove split, points bar chart, and four auto-generated insight quotes based on live data.

---

### Voting Tab

Used to run a coalition vote (e.g. Accept/Coup) among students.

**Setup:**
- **Game Title** — replaces "HAWK / DOVE" in all headers (format: `OptionA / OptionB`, e.g. `Accept / Coup`)
- **Candidate** — select a student; their name and points appear as a banner on the Vote tab
- **Candidate Title** — optional label shown under their name
- **Option A / Option B** — the two vote labels (e.g. Accept / Coup)
- **Voting Deadline** — format: `YYYY-MM-DD HH:MM` (24-hour). When the deadline passes, all students who have not voted are automatically counted as Option A (Accept)

**Controls:**
- **▶ Show Vote Tab** — makes the Vote tab visible on `/display`
- **▶ Open Voting** — allows students to submit votes
- **Reveal Results / Hide Results** — toggles result visibility on `/display`. Until revealed, only you can see counts
- **Clear Votes** — resets all votes
- **▶ Show Live Votes** — when enabled, the right panel of the Vote tab on `/display` switches from Newsbox to a real-time per-student vote feed
- **Red Screen Threshold** — set the number of Option B (Coup) votes that triggers a full-screen red alert on `/display`. Default: 10. The red screen persists until you click **Dismiss**

**Results panel** in the right column shows live vote counts and percentage split, visible only to you until revealed.

**Auto-accept at deadline:**
- When the deadline passes, students who have not voted are automatically counted as Option A
- They appear in the vote breakdown as "auto"
- No action required from you — this is display-side logic only

**Red Screen:**
- Triggers automatically on `/display` when the coup threshold is reached
- Full-screen pulsing red overlay with "COUP — THRESHOLD REACHED"
- Dismiss from Admin → Voting tab → **Dismiss** button

---

### Newsbox Tab

Post formatted messages to students that appear on `/display`.

- Use the **B / I / U / H** toolbar to bold, italicize, underline, or highlight text
- Live preview shows how the post will look
- Click **Post →** to publish instantly
- Click **▶ Show Newsbox Tab** to make the Newsbox tab visible on `/display`
- Click **✕** next to any post to delete it

---

## What Students Can See

At `/player`:
- Their own name, email, and current point balance
- Their choice for the current round (after submitting)
- Their result from the last round
- Active protectorates (names only)
- Payoff rules for the current week

Students **cannot** see:
- Anyone else's point balance
- Tiebreaker numbers or % Coup values
- Admin controls or round history
- Vote results until instructor reveals them
- Who chose Hawk or Dove before results are pushed

At `/display` (Vote tab, when open):
- Candidate banner (name, title, current points)
- Email-based vote input — one vote per registered email
- Countdown timer to deadline
- Live vote feed (if enabled by admin) or Newsbox on the right
- Final results (if revealed by admin)

---

## Payoff Rules

**Week 1 & 2:**

| Matchup | Outcome |
|---|---|
| D vs D | Each player gains an independent random +1–20 pts (separate dice rolls) |
| H vs D | Hawk takes 25% of Dove's points × 3; Dove loses 25% |
| H vs H | Higher tiebreaker takes 100% of loser's points; coin flip if tied |

**Week 2 additions:**
- Players stapled into Protectorates are removed from the random pool
- Every round: Dove automatically pays 25% tax (×3 to Hawk)
- Hawk can voluntarily return a fixed amount or percentage
- Points can go negative

---

## Architecture

- **Next.js 14** (App Router) deployed on Vercel
- **Upstash Redis** for persistent state across cold starts and redeploys
- All game state managed in `lib/store.ts`
- Admin authentication via HTTP-only cookie set at `/api/admin/auth`
- Student identity on `/player` remembered by browser cookie
- Votes stored server-side by email — one vote per registered email address

---

## Local Development

```bash
cp .env.example .env.local
# Add your Upstash credentials and ADMIN_PASSWORD to .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Quick Reference — What Is Editable

| What | Where | How |
|---|---|---|
| Student name / email | Roster tab | Click row → edit → Save |
| Student points | Roster tab | Click row or use ± button |
| Tiebreaker | Roster tab | Click row → edit → Save |
| Hawk/Dove choice | Roster tab | Click row → Choice dropdown → Save |
| Eliminated status | Roster tab | Click 💀/— directly |
| % Coup (manual) | Roster tab | Click cell → type % → Enter |
| Vote eligibility | Roster tab | Click ✓/✕ in Vote column |
| Round deltas | Round Review tab | Click Edit on any pairing row |
| Staple transfer amount | Roster tab → Protectorates | Enter pts or % |
| Display round number | Round controls bar | Type number → Set |
| Week (1 or 2) | Round controls bar | Click W1 or W2 |
| Game title | Admin → Voting tab | Type title → Set |
| Vote options / deadline / candidate | Admin → Voting tab | Edit fields → Save |
| Coup threshold | Admin → Voting tab | Enter number → Set |
| Live votes visibility | Admin → Voting tab | Toggle button |
| Newsbox messages | Admin → Newsbox tab | Post / delete |
| Admin password | Vercel → Environment Variables | Update `ADMIN_PASSWORD` → Redeploy |
