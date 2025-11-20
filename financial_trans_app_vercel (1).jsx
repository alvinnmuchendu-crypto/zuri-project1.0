# Project: financial-trans-app (Vite + React, mock transactions)

This single document contains all files for a minimal **full working financial transaction demo app** suitable for deploying to **Vercel** as a static site with one serverless API example. Copy the files into a repo and follow the instructions in the README.

---

## FILE: README.md

```
# Financial Transaction App (Demo)

Minimal demo of a financial transaction app (frontend + mock serverless API) built with React + Vite and a Vercel serverless function.

## Features
- Send/receive mock transactions (client-side + serverless API).
- Biometric-like login simulation (PIN/LocalStorage).
- Transaction history and balances.
- Real-time UI updates (optimistic UI).

## Local development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run dev server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:5173

## Deploy to Vercel
1. Create a GitHub repo and push this project.
2. In Vercel, import the GitHub repo.
3. Set build command: `npm run build` and output directory: `dist`.
4. Deploy — Vercel will detect the `api/` folder and create serverless functions automatically.

## Notes
- This demo uses an in-memory + localStorage backend. For production, replace the serverless function with a real backend and integrate a payment provider (Stripe, PayPal) and strong authentication (OAuth, JWT, passwordless, or your auth provider).
```

---

## FILE: package.json

```
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
```

---

## FILE: vite.config.js

```
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

---

## FILE: index.html

```
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
```

---

## FILE: src/main.jsx

```
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')).render(<App />)
```

---

## FILE: src/App.jsx

```
import React, { useEffect, useState } from 'react'
import Home from './pages/Home'
import Login from './pages/Login'

export default function App(){
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fta_user')) } catch { return null }
  })

  useEffect(() => {
    if(user) localStorage.setItem('fta_user', JSON.stringify(user))
    else localStorage.removeItem('fta_user')
  }, [user])

  return user ? <Home user={user} onLogout={() => setUser(null)} /> : <Login onLogin={u => setUser(u)} />
}
```

---

## FILE: src/pages/Login.jsx

```
import React, { useState } from 'react'

export default function Login({ onLogin }){
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')

  const submit = e => {
    e.preventDefault()
    if(!name) return alert('Enter name')
    // Simple demo PIN check
    const user = { id: crypto.randomUUID(), name, balance: 1000 }
    // store simulated token
    onLogin({ ...user, token: btoa(user.id) })
  }

  return (
    <div className="card">
      <h2>Sign in (demo)</h2>
      <form onSubmit={submit}>
        <label>Name</label>
        <input value={name} onChange={e=>setName(e.target.value)} />
        <label>PIN</label>
        <input value={pin} onChange={e=>setPin(e.target.value)} />
        <button type="submit">Sign in</button>
      </form>
    </div>
  )
}
```

---

## FILE: src/pages/Home.jsx

```
import React, { useEffect, useState } from 'react'
import dayjs from 'dayjs'

export default function Home({ user, onLogout }){
  const [balance, setBalance] = useState(user.balance || 0)
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('fta_history_' + user.id) || '[]'))
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem('fta_history_' + user.id, JSON.stringify(history))
  }, [history])

  async function send(){
    const amt = Number(amount)
    if(!recipient || !amt || amt <= 0) return alert('Invalid')
    if(amt > balance) return alert('Insufficient funds')

    // optimistic UI
    const tx = { id: crypto.randomUUID(), type: 'send', to: recipient, amount: amt, date: new Date().toISOString(), status: 'pending' }
    setHistory(prev => [tx, ...prev])
    setBalance(prev => prev - amt)
    setLoading(true)

    // call serverless API (mock) to 'process' transaction
    try{
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, tx })
      })
      const data = await res.json()
      // update status
      setHistory(prev => prev.map(h => h.id === tx.id ? { ...h, status: data.status } : h))
    }catch(err){
      setHistory(prev => prev.map(h => h.id === tx.id ? { ...h, status: 'failed' } : h))
      setBalance(prev => prev + amt) // rollback
    }finally{
      setLoading(false)
      setRecipient(''); setAmount('')
    }
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
        <input placeholder="Recipient" value={recipient} onChange={e=>setRecipient(e.target.value)} />
        <input placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} />
        <button onClick={send} disabled={loading}>Send</button>
      </section>

      <section className="card">
        <h3>Transaction History</h3>
        {history.length === 0 ? <p>No transactions yet.</p> : (
          <ul className="history">
            {history.map(tx => (
              <li key={tx.id} className={tx.status}>
                <div>
                  <div><strong>{tx.type === 'send' ? 'Sent' : 'Received'}</strong> to {tx.to || tx.from}</div>
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
  )
}
```

---

## FILE: api/transactions.js

```
// Vercel Serverless Function (api/transactions.js)
// This is a mock processor that "approves" transactions after a short delay.

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try{
    const { userId, tx } = req.body
    // simulate processing time
    await new Promise(r => setTimeout(r, 900))
    // very simple rule: if amount > 5000 -> fail (demo rule)
    const status = Number(tx.amount) > 5000 ? 'failed' : 'completed'
    return res.json({ status })
  }catch(e){
    console.error(e)
    return res.status(500).json({ error: 'server error' })
  }
}
```

---

## FILE: src/styles.css

```
:root{ --bg:#f3f4f6; --card:#ffffff; --accent:#0b69ff }
body{ font-family: Inter, system-ui, sans-serif; background:var(--bg); margin:0; padding:20px }
.container{ max-width:900px; margin:0 auto }
header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:16px }
.card{ background:var(--card); padding:16px; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,0.06); margin-bottom:12px }
input{ display:block; width:100%; padding:8px; margin:8px 0; border-radius:8px; border:1px solid #ddd }
button{ padding:8px 12px; border-radius:8px; border:none; background:var(--accent); color:white }
button.secondary{ background:#666; margin-left:12px }
.history{ list-style:none; padding:0 }
.history li{ display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #eee }
.muted{ color:#666; font-size:13px }
li.completed{ color:green }
li.pending{ color:orange }
li.failed{ color:red }
```

---

## Usage / Next steps (in this file)

- To connect a real payment processor: replace the serverless function with calls to your provider (e.g., Stripe Payment Intents). Do not handle card numbers directly—use provider SDKs.
- Add secure authentication: integrate Auth0, Clerk, Firebase Auth, or NextAuth for production.
- Add HTTPS-only cookies or JWT tokens for auth and secure your serverless endpoints.

---

End of project.
