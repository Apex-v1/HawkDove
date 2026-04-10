@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #07080b;
  --bg-card: #0c0f14;
  --bg-raised: #111620;
  --border: #1a2030;
  --border-hi: #253040;
  --hawk: #e03020;
  --hawk-bg: #2a0c08;
  --dove: #2a8fff;
  --dove-bg: #071830;
  --gold: #e8a020;
  --gold-bg: #1e1408;
  --green: #38c060;
  --green-bg: #081a10;
  --text: #d8e0ea;
  --text-dim: #5a6a80;
  --text-mid: #8a9ab0;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  background: var(--bg);
  color: var(--text);
  font-family: 'DM Mono', 'Fira Mono', 'Courier New', monospace;
  min-height: 100vh;
}

/* Subtle grid bg */
body {
  background-image:
    linear-gradient(rgba(26,32,48,0.5) 1px, transparent 1px),
    linear-gradient(90deg, rgba(26,32,48,0.5) 1px, transparent 1px);
  background-size: 48px 48px;
}

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 2px; }

.card { background: var(--bg-card); border: 1px solid var(--border); }
.card-raised { background: var(--bg-raised); border: 1px solid var(--border-hi); }

.btn {
  font-family: inherit; font-size: 12px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  cursor: pointer; border: 1px solid; padding: 10px 20px;
  transition: all 0.12s; background: transparent;
}
.btn-hawk { border-color: var(--hawk); color: var(--hawk); }
.btn-hawk:hover, .btn-hawk.active { background: var(--hawk); color: #fff; }
.btn-dove { border-color: var(--dove); color: var(--dove); }
.btn-dove:hover, .btn-dove.active { background: var(--dove); color: #fff; }
.btn-gold { border-color: var(--gold); color: var(--gold); }
.btn-gold:hover { background: var(--gold); color: #000; }
.btn-ghost { border-color: var(--border-hi); color: var(--text-mid); }
.btn-ghost:hover { border-color: var(--text-mid); color: var(--text); }
.btn-danger { border-color: var(--hawk-bg); color: var(--hawk); }
.btn-danger:hover { background: var(--hawk-bg); }
.btn:disabled { opacity: 0.3; cursor: default; }

.input {
  background: var(--bg); border: 1px solid var(--border-hi);
  color: var(--text); font-family: inherit; font-size: 13px;
  padding: 9px 12px; width: 100%; outline: none; transition: border-color 0.12s;
}
.input:focus { border-color: var(--dove); }
.input::placeholder { color: var(--text-dim); }

.label { font-size: 10px; letter-spacing: 0.2em; color: var(--text-dim); text-transform: uppercase; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.fade-in { animation: fadeIn 0.3s ease forwards; }

@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.pulse { animation: pulse 1.4s ease infinite; }

.tag {
  display: inline-block; font-size: 10px; font-weight: 700;
  letter-spacing: 0.12em; padding: 2px 7px; border: 1px solid;
}
.tag-hawk { border-color: var(--hawk-bg); color: var(--hawk); background: var(--hawk-bg); }
.tag-dove { border-color: var(--dove-bg); color: var(--dove); background: var(--dove-bg); }
.tag-gold { border-color: var(--gold-bg); color: var(--gold); background: var(--gold-bg); }
.tag-staple { border-color: #302008; color: #e8a020; background: #201408; }
.tag-dd { border-color: #083020; color: var(--green); background: var(--green-bg); }

@keyframes ticker { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }
