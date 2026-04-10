# 🦅🕊️ Hawk/Dove — Social Redistribution Game

A real-time game theory experiment for the classroom.

---

## Three Interfaces

| URL | Who uses it | What it does |
|---|---|---|
| `/player` | Students (phones/laptops) | Join, submit Hawk or Dove, see results |
| `/admin` | Instructor only (password) | Control rounds, reveal results, manage Week 2 staples |
| `/display` | Projector / shared screen | Live leaderboard, pairings, results |

---

## How to Deploy (Vercel + GitHub)

### 1. Push to GitHub

```bash
# In the hawk-dove folder:
git init
git add .
git commit -m "initial"
gh repo create hawk-dove --public --push
# or manually create a repo on github.com and follow the push instructions
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Under **Environment Variables**, add:
   ```
   ADMIN_PASSWORD = (your secret password)
   ```
4. Click **Deploy**

That's it. Vercel auto-deploys on every push.

### 3. Share the URL

- Tell students: `https://your-app.vercel.app/player`
- Open your admin panel: `https://your-app.vercel.app/admin`
- Open projector tab: `https://your-app.vercel.app/display`

---

## Running a Game

### Before class
1. Open `/admin`, log in
2. Set **WEEK 1** or **WEEK 2**
3. Click **OPEN SESSION** — students can now join at `/player`

### Each round
1. ▶ **START ROUND** — students see the submission screen
2. Students pick Hawk or Dove and lock in
3. Watch the progress bar fill up
4. ⚡ **RESOLVE + REVEAL** — calculates results and pushes to all screens

### Week 2 specifics
- After a H/D pairing resolves, the Dove player is offered a **Staple** option on their phone
- They accept/decline; you see stapled pairs in the admin panel under 📌
- After each round, the admin panel shows a **transfer input** for each hawk in a stapled pair — you can record the amount the hawk chooses to send back
- Game ends when all unstapled cards reach zero or only one remains

### Broadcasting a message
Type in the **BROADCAST MESSAGE** box → it appears on the player lobby and display screens instantly.

---

## Local Development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture Notes

State is held **in-memory on the server** (a singleton). This means:
- **One Vercel instance only** — works fine for free tier (single serverless function instance in dev, or single region)
- State resets on redeploy or cold start
- For a permanent solution, swap `lib/store.ts` for [Vercel KV](https://vercel.com/docs/storage/vercel-kv) (Redis)

---

## Payoff Rules (built in)

**Week 1 & 2:**
| Matchup | Outcome |
|---|---|
| D vs D | Both gain +1–20 pts (random dice roll) |
| H vs D | Hawk takes 25% of Dove's points × 3 |
| H vs H | Higher card number takes 100% of loser's points; coin flip on tie |

**Week 2 additions:**
- After a H/D pair, Dove can choose to **staple** to that Hawk
- Stapled pairs: Dove pays 25% tax (×3 to Hawk) every round automatically
- Hawk can voluntarily return any amount (recorded by instructor)
- Game ends when all unstapled cards are at zero or only one unstapled remains
