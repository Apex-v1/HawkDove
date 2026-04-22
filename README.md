# 🦅🕊️ Jesse Driscoll's HAWK / DOVE

A real-time game theory experiment for the classroom.

Created and edited by Jesús E. Rojas Venzor based on notes from Jesse Driscoll.

---

## Four Interfaces

| URL | Who uses it | What it does |
|---|---|---|
| `/player` | Students (phones/laptops) | Select their name, submit Hawk or Dove, see round results |
| `/display` | Projector / shared screen | Live leaderboard, charts, pairings, voting, newsbox |
| `/admin` | Instructor only (password) | Control rounds, manage roster, voting, newsbox, export data |
| `/register` | Students (optional) | Self-register name, email, number, and letter before the game |

---

## How to Deploy (Vercel + GitHub)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial"
gh repo create hawk-dove --public --push
```
Or manually create a repo on github.com and follow the push instructions.

### 2. Set Up Upstash Redis (required for data persistence)

Without this step, all game data resets every ~1 minute when Vercel's serverless functions go idle.

1. Go to [upstash.com](https://upstash.com) → create a free account
2. Click **Create Database** → give it a name (e.g. `HawkDove`) → choose a region → click **Create**
3. On your database page, click the **REST** tab
4. Copy the two values shown:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. You'll add these to Vercel in the next step

### 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Under **Environment Variables**, add all three:
   ```
   ADMIN_PASSWORD           = (your secret password)
   UPSTASH_REDIS_REST_URL   = (from Upstash REST tab)
   UPSTASH_REDIS_REST_TOKEN = (from Upstash REST tab)
   ```
   Make sure all three environments are checked: Production, Preview, Development.
4. Click **Deploy**

### 4. Verify persistence is working

After deploying, visit `https://your-app.vercel.app/api/debug` in your browser. You should see:
```json
{ "success": true, "ping": "ok" }
```
If you see an error, double-check your Upstash env vars in Vercel → Settings → Environment Variables.

### 5. Share the URLs
- Students: `https://your-app.vercel.app/player`
- Admin panel: `https://your-app.vercel.app/admin`
- Projector: `https://your-app.vercel.app/display`
- Registration (optional): `https://your-app.vercel.app/register`

---

## Admin Panel — Full Guide

Log in at `/admin` using your `ADMIN_PASSWORD`.

### Roster Tab

**Uploading students:**
- Prepare a `.xlsx` spreadsheet with these columns: `Name`, `Email`, `Tiebreaker`, `Points`
- Optional columns: `Round Type`, `Round Result`, `Round Pair`, `Letter`
- Drag and drop the file onto the upload area, or click to browse
- Students are loaded instantly — they can now find their name at `/player`
- Re-uploading replaces the entire roster, so always upload the latest points

**Adding students manually:**
- Click **+ Add Student** above the roster table
- Enter name (Last, First format), email, tiebreaker, and starting points
- Click **Add →** to insert them immediately

**Editing students inline:**
- Click any student row to edit name, email, points, tiebreaker, Hawk/Dove choice, or notes
- The **±** button lets you quickly add or subtract points — type a positive or negative number and press Enter
- Click the 💀 / — button in the Elim column to toggle elimination directly
- Click the **Note** column to add a private instructor note on any student
- Eliminated students are grayed out and excluded from pairings

**Column sorting:**
- Click any column header to sort ascending or descending (↑ / ↓)

**Protectorate / Staple pairs (Week 2):**
- Use the dropdowns to select Player A and Player B, then choose which one is the Hawk
- Click 📌 Create Protectorate to staple them
- Each stapled pair shows a "Hawk returns" input — enter fixed points or a percentage of what the Hawk took
- Click ✕ to remove a protectorate

**Exporting:**
- Click **⬇ Export CSV** in the header to download current standings
- Includes: Rank, Name, Email, Points, Tiebreaker, Letter, Choice, Vote, Stapled, Eliminated

### Round Controls

| Button | When it appears | What it does |
|---|---|---|
| ▶ Open Round | When no round is active | Lets students submit their choice |
| Close | While round is open | Closes submissions without computing |
| ⚡ Compute | While round is open | Calculates all pairings and deltas |
| 🔀 Re-randomize | After computing, before finalizing | Reshuffles all pairings with a new random seed |
| ✕ Cancel Round | After computing, before finalizing | Discards pending round, clears submissions |
| ✓ Finalize & Push | After computing | Applies results to all student balances permanently |

**Display Round override:**
- Type a number in "Display Round" and click Set to show a different round number on `/display` and `/player`

### Round Review Tab

After clicking Compute, you are taken to the Review tab:
- Every pairing shown with both players, choices, starting points, delta, and projected new balance
- Click **Edit** on any row to manually adjust the delta
- Click **🔀 Re-randomize** to reshuffle all pairings from scratch
- Click **✕ Cancel Round** to discard the pending round — the display page returns to showing the last finalized round's charts and factoids
- Click **✓ Finalize & Push Results** to apply all changes permanently

### History Tab

- Every finalized round recorded as a scrollable table
- Read-only log — to correct past points, edit the student's current balance in the Roster tab

### Insights Tab

- Key stats, Hawk vs Dove split, points bar chart for all players
- Four auto-generated insight quotes based on live data

### Voting Tab

Used to run a president/candidate vote among students.

**Setup:**
- **Game Title** — replaces "HAWK / DOVE" in headers on `/display` and `/player` (e.g. "Support / Fight"). Format: `OptionA / OptionB`. Leave blank to keep the default.
- **Candidate** — select a student from the roster; their name and points appear as a banner on the Vote tab
- **Candidate Title** — optional label shown under their name (e.g. "The Hawk", "Incumbent")
- **Option A / Option B** — the two vote choices (default: Support / Fight)
- **Voting Deadline** — countdown timer shown to students (format: YYYY-MM-DD HH:MM)

**Controls:**
- **▶ Show Vote Tab** — makes the Vote tab visible on `/display`
- **▶ Open Voting** — allows students to submit votes
- **Reveal Results** — makes results visible to students (until then only you can see them)
- **Clear Votes** — resets all votes

**Results panel** shows live vote counts and percentage split, visible only to you until revealed.

**Vote column in roster** shows S or F (orange/purple) tag for each student once they vote.

### Newsbox Tab

Post formatted messages to students that appear on `/display`.

- Use the **B / I / U / H** toolbar to bold, italicize, underline, or highlight text
- Live preview shows how the post will look before publishing
- Click **Post →** to publish instantly
- Click **▶ Show Newsbox Tab** to make the Newsbox tab visible on `/display`
- Click **✕** next to any post to delete it

---

## Registration (optional pre-game)

Students can self-register at `/register` before the game begins.

**Admin setup (Roster tab → Registration Settings):**
- Toggle registration open/closed
- Set tiebreaker min/max range
- Define letter options (comma-separated, e.g. `R,K` or `A,B,C`)
- Toggle whether letters are visible on the display page
- Share the link: `/register`

**Student registration form collects:** first name, last name, email, tiebreaker number, and letter.

Duplicate emails are blocked. To let a student re-register, delete them from the roster first (🗑 button).

---

## What Students Can See

At `/player`:
- Their own name, email, and current point balance
- Their choice for the current round (after submitting)
- Their result from the last round
- Active Protectorates (stapled pairs) — names and emails only
- Payoff rules for the current week
- Game title (if set)

Students **cannot** see:
- Anyone else's point balance
- Tiebreaker numbers
- Admin controls or round history
- Vote results until instructor reveals them
- Who chose Hawk or Dove before results are pushed

At `/display` (Vote tab):
- Candidate banner (name, title, current points)
- Email-based vote input — one vote per registered email
- Countdown timer to deadline
- Newsbox feed on the right

---

## Ending the Game

To eliminate a player, click 💀 / — in the Elim column. To reverse, click again.

The game ends when you decide. Clicking **Reset** in the admin header wipes all data including votes, newsbox posts, and the roster.

---

## What Is Editable

| What | Where | How |
|---|---|---|
| Student name / email | Roster tab | Click row → edit → Save |
| Student points | Roster tab | Click row → edit → Save, or use ± button |
| Tiebreaker | Roster tab | Click row → edit → Save |
| Hawk/Dove choice | Roster tab | Click row → Choice dropdown → Save |
| Student note | Roster tab | Click Note cell → edit → Save |
| Eliminated status | Roster tab | Click 💀/— directly |
| Round deltas | Round Review tab | Click Edit on any pairing row |
| Staple transfer amount | Roster tab → Protectorates | Enter pts or % in "Hawk returns" field |
| Display round number | Round controls bar | Type number → Set |
| Week (1 or 2) | Round controls bar | Click W1 or W2 |
| Game title | Admin → Voting tab | Type title → Set |
| Vote options / deadline / candidate | Admin → Voting tab | Edit fields → Save Voting Settings |
| Newsbox messages | Admin → Newsbox tab | Post / delete |
| Admin password | Vercel Environment Variables | Update `ADMIN_PASSWORD` → Redeploy |

---

## Payoff Rules

**Week 1 & 2:**

| Matchup | Outcome |
|---|---|
| D vs D | Each player gains a separate random +1–20 pts (independent dice rolls) |
| H vs D | Hawk takes 25% of Dove's points × 3; Dove keeps 75% |
| H vs H | Higher tiebreaker takes 100% of loser's points; coin flip if tied |

**Week 2 additions:**
- Players who were the Dove in an H+D pairing can choose to **staple** to that Hawk
- Stapled pairs are removed from the random pool each round
- Every round: Dove automatically pays 25% tax (×3 to Hawk)
- Hawk can voluntarily return any amount — set as fixed points or a percentage of what was taken
- Points can go negative

---

## Architecture

- **Next.js 14** (App Router) deployed on Vercel
- **Upstash Redis** for persistent state across cold starts and redeploys
- Client routes: `/player`, `/admin`, `/display`, `/register`
- State managed in `lib/store.ts` — all reads/writes go through Redis
- Admin authentication via HTTP-only cookie set at `/api/admin/auth`
- Student identity on `/player` remembered by browser cookie (1 year expiry)
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
