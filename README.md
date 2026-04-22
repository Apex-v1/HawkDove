# 🦅🕊️ Jesse Driscoll's HAWK / DOVE

A real-time game theory experiment for the classroom. 

Created and edited by Jesús E. Rojas Venzor based on notes from Jesse Driscoll.

---

## Three Interfaces

| URL | Who uses it | What it does |
|---|---|---|
| `/player` | Students (phones/laptops) | Select their name, submit Hawk or Dove, see round results |
| `/admin` | Instructor only (password) | Control rounds, manage roster, review pairings, export data |
| `/display` | Projector / shared screen | Live leaderboard, charts, pairings, insights |

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
   ADMIN_PASSWORD         = (your secret password)
   UPSTASH_REDIS_REST_URL = (from Upstash REST tab)
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

---

## Admin Panel — Full Guide

Log in at `/admin` using your `ADMIN_PASSWORD`.

### Roster Tab

**Uploading students:**
- Prepare a `.xlsx` spreadsheet with these columns: `Name`, `Email`, `Tiebreaker`, `Points`
- Optional columns: `Round Type`, `Round Result`, `Round Pair` (imported as round history)
- Drag and drop the file onto the upload area, or click to browse
- Students are loaded instantly — they can now find their name at `/player`
- Re-uploading replaces the entire roster, so always upload the latest points

**Editing students inline:**
- Click any student row to edit their name, email, points, tiebreaker, or Hawk/Dove choice
- To fix a student's choice after they've submitted, click their row → change the Choice dropdown → Save
- Click the 💀 / — button in the Elim column to toggle a student as eliminated without going into edit mode
- Eliminated students are grayed out, excluded from pairings, and hidden from active counts

**Protectorate / Staple pairs (Week 2):**
- Use the dropdowns to select Player A and Player B, then choose which one is the Hawk
- Click 📌 Create Protectorate to staple them
- Each stapled pair shows a "Hawk returns" input — enter the number of points the Hawk is transferring back to the Dove that round
- Click ✕ to remove a protectorate

**Exporting:**
- Click **⬇ Export CSV** in the header to download the current standings as a spreadsheet
- The CSV includes: Rank, Name, Email, Points, Tiebreaker, Choice, Stapled status, Eliminated status
- Use this to keep your external gradebook up to date after each round

### Round Controls

| Button | When it appears | What it does |
|---|---|---|
| ▶ Open Round | When no round is active | Lets students submit their choice |
| Close | While round is open | Closes submissions without computing |
| ⚡ Compute | While round is open | Calculates all pairings and deltas |
| 🔀 Re-randomize | After computing, before finalizing | Reshuffles all pairings with a new random seed |
| ✓ Finalize & Push | After computing | Applies results to all student balances |

**Display Round override:**
- The "Display Round:" field lets you show a different round number to students on the display screen
- Useful if you want to control what round number they see (e.g. to create confusion or for Week 2 continuity)
- Type a number and click Set

### Round Review Tab

After clicking Compute, you are taken to the Review tab before anything is finalized:
- Every pairing is shown in a table with both players, their choices, starting points, delta, and projected new balance
- Click **Edit** on any row to manually adjust the delta for either player
- Click **Save** to apply your manual override — the projected balances update immediately
- Click **🔀 Re-randomize** to throw out these pairings and generate a completely new random shuffle
- When you're satisfied, click **✓ Finalize & Push Results** — this applies all changes to student balances permanently

### History Tab

- Every finalized round is recorded here as a scrollable table
- Shows: pair type, both players, their choices, points before, delta, points after, and the calculation note
- This is a read-only log — to correct a mistake in past points, go to the Roster tab and manually edit the student's current balance

### Insights Tab

- Shows key stats: active players, total points in play, average points, richest/poorest player, rounds played
- Hawk vs Dove split bar for the current round
- Points bar chart for all players
- Four auto-generated insight quotes based on live data (e.g. "65% of doves hold fewer than 400 points")

---

## What Students Can See

At `/player`, students can see:
- Their own name and email
- Their current point balance
- Their choice for the current round (after submitting)
- Their result from the last round (who they were paired with, what type, their delta)
- The list of all active Protectorates (stapled pairs) — names and emails only
- Payoff rules for the current week

Students **cannot** see:
- Anyone else's point balance
- Tiebreaker numbers
- Admin controls or round history
- Who chose Hawk or Dove before results are revealed

---

## Ending the Game

The game ends when you decide — there is no automatic end condition. To eliminate a player:
1. Go to **Admin → Roster tab**
2. Click the 💀 / — button in the Elim column next to the student
3. They are immediately marked as eliminated: grayed out in the roster, excluded from future pairings, and shown a 💀 screen on their device

To reverse an elimination, click the 💀 button again to toggle them back to active.

The game is effectively over when all but one player reaches zero points, or when you choose to stop.

---

## What Is Editable

| What | Where | How |
|---|---|---|
| Student name | Roster tab | Click row → edit → Save |
| Student email | Roster tab | Click row → edit → Save |
| Student points | Roster tab | Click row → edit → Save |
| Tiebreaker number | Roster tab | Click row → edit → Save |
| Hawk/Dove choice | Roster tab | Click row → Choice dropdown → Save |
| Eliminated status | Roster tab | Click 💀/— button directly |
| Round deltas (before finalizing) | Round Review tab | Click Edit on any pairing row |
| Staple transfer amount | Roster tab → Protectorates | Enter amount in "Hawk returns" field |
| Display round number | Round controls bar | Type number → Set |
| Week (1 or 2) | Round controls bar | Click W1 or W2 |
| Admin password | Vercel Environment Variables | Update `ADMIN_PASSWORD` → Redeploy |

---

## Payoff Rules

**Week 1 & 2:**

| Matchup | Outcome |
|---|---|
| D vs D | Both gain +1–20 pts (random dice roll) |
| H vs D | Hawk takes 25% of Dove's points × 3; Dove keeps 75% |
| H vs H | Higher tiebreaker takes 100% of loser's points; coin flip if tied |

**Week 2 additions:**
- Players who were the Dove in an H+D pairing can choose to **staple** to that Hawk
- Stapled pairs are removed from the random pool each round
- Every round: Dove automatically pays 25% tax (×3 to Hawk)
- Hawk can voluntarily return any amount (set by instructor in admin panel)
- Game ends when all cards are stapled or all unstapled cards reach zero

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

## Architecture

- **Next.js 14** (App Router) deployed on Vercel
- **Upstash Redis** for persistent state across cold starts and redeploys
- Three client-facing routes: `/player`, `/admin`, `/display`
- State managed in `lib/store.ts` — all reads/writes go through Redis
- Admin authentication via HTTP-only cookie set at `/api/admin/auth`
- Student identity remembered by browser cookie (1 year expiry) — no login required
