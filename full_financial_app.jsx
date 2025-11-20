# FULL FINANCIAL APP (React + Vite + Serverless API)
# SAME as the original one you liked
# Copy this EXACT structure

============================================================
📁 PROJECT STRUCTURE
============================================================

full-financial-app/
│ package.json
│ vite.config.js
│ index.html
│
├── api/
│     └── transactions.js
│
└── src/
      ├── main.jsx
      ├── App.jsx
      ├── styles.css
      └── pages/
            ├── Login.jsx
            └── Home.jsx

============================================================
FILE: package.json
============================================================
{
  "name": "financial-trans-app-demo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 5173",
    "start": "vite"
  },
  "dependencies": {
    "dayjs": "^1.11.9",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}

============================================================
FILE: vite.config.js
============================================================
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });

============================================================
FILE: index.html
============================================================
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Financial Trans Demo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

============================================================
FILE: src/main.jsx
============================================================
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
createRoot(document.getElementById('root')).render(<App />);

============================================================
FILE: src/App.jsx
============================================================
import React, { useEffect, useState } from 'react';
import Home from './pages/Home';
import Login from './pages/Login';

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fta_user')); }
    catch { return null; }
  });

  useEffect(() => {
    if (user) localStorage.setItem('fta_user', JSON.stringify(user));
    else localStorage.removeItem('fta_user');
  }, [user]);

  return user ? (
    <Home user={user} onLogout={() => setUser(null)} />
  ) : (
    <Login onLogin={u => setUser(u)} />
  );
}

============================================================
FILE: src/pages/Login.jsx
============================================================
import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name) return alert('Enter name');

    const user = {
      id: crypto.randomUUID(),
      name,
      balance: 1000,
      token: btoa(name)
    };

    onLogin(user);
  };

  return (
    <div className="card">
      <h2>Sign in (demo)</h2>
      <form onSubmit={submit}>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>PIN</label>
        <input value={pin} onChange={(e) => setPin(e.target.value)} />
        <button>Sign in</button>
      </form>
    </div>
  );
}

============================================================
FILE: src/pages/Home.jsx
============================================================
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';

export default function Home({ user, onLogout }) {
  const [balance, setBalance] = useState(user.balance || 0);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('fta_history_' + user.id) || '[]'));
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('fta_history_' + user.id, JSON.stringify(history));
  }, [history]);

  async function send() {
    const amt = Number(amount);
    if (!recipient || !amt || amt <= 0) return alert('Invalid');
    if (amt > balance) return alert('Insufficient funds');

    const tx = {
      id: crypto.randomUUID(),
      type: 'send',
      to: recipient,
      amount: amt,
      date: new Date().toISOString(),
      status: 'pending'
    };

    setHistory((prev) => [tx, ...prev]);
    setBalance((prev) => prev - amt);
    setLoading(true);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, tx })
      });
      const data = await res.json();

      setHistory((prev) => prev.map((h) => h.id === tx.id ? { ...h, status: data.status } : h));
    } catch (err) {
      setHistory((prev) => prev.map((h) => h.id === tx.id ? { ...h, status: 'failed' } : h));
      setBalance((prev) => prev + amt);
    }

    setLoading(false);
    setRecipient('');
    setAmount('');
  }

  return (
    <div className="container">
      <header>
        <h1>Welcome, {user.name}</h1>
        <div>
          <strong>Balance:</strong> ${balance.toFixed(2)}
          <button onClick={onLogout} className="secondary">Logout</button>
        </div>
      </header>

      <section className="card">
        <h3>Send Money</h3>
        <input placeholder="Recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button onClick={send} disabled={loading}>Send</button>
      </section>

      <section className="card">
        <h3>Transaction History</h3>
        {history.length === 0 ? (
          <p>No transactions yet.</p>
        ) : (
          <ul className="history">
            {history.map((tx) => (
              <li key={tx.id} className={tx.status}>
                <div>
                  <div><strong>{tx.type === 'send' ? 'Sent' : 'Received'}</strong> to {tx.to}</div>
                  <div className="muted">{dayjs(tx.date).format('MMM D, YYYY h:mm A')}</div>
                </div>
                <div>
                  <div>${Number(tx.amount).toFixed(2)}</div>
                  <div className="muted">{tx.status}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

============================================================
FILE: api/transactions.js
============================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { tx } = req.body;
    await new Promise(r => setTimeout(r, 1000)); // mock delay
    const status = Number(tx.amount) > 5000 ? 'failed' : 'completed';
    return res.json({ status });
  } catch (e) {
    return res.status(500).json({ error: 'server error' });
  }
}

============================================================
FILE: src/styles.css
============================================================
:root { --bg:#f3f4f6; --card:#ffffff; --accent:#0b69ff; }
body { font-family: Arial, sans-serif; background:var(--bg); margin:0; padding:20px; }
.container { max-width:900px; margin:auto; }
header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.card { background:white; padding:16px; border-radius:12px; margin-bottom:12px; box-shadow:0 4px 15px rgba(0,0,0,0.1);}
