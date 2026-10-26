# Vercel Deployment Guide for OmniFlow CRM (Powered by Cloudflare R2)

This CRM is completely shifted from MongoDB to **Cloudflare R2 Object Storage**. 
It is 100% serverless, zero egress cost, and ready for **1-Click deployment on Vercel**.

---

## 🔑 Step 1: Environment Variables for Vercel

When importing your project on Vercel (or under **Project Settings → Environment Variables**), add the following variables:

| Variable Name | Value | Description |
| :--- | :--- | :--- |
| `R2_ACCOUNT_ID` | `93dec59d0fcf17e39d0e60adbe5af4a5` | Your Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | `e514348cb8dbc69679c1f7a36f45a567` | Cloudflare R2 Access Key |
| `R2_SECRET_ACCESS_KEY` | `e9fed1bebedc12a1cf72f9fb624d96fe446ff044ce570e3e98f395d18633545f` | Cloudflare R2 Secret Key |
| `R2_BUCKET_NAME` | `musicapp` | Cloudflare R2 Bucket Name |
| `R2_DATA_PREFIX` | `leadspro/` | Key prefix for CRM data collections |

*(All your database collections `customers.json`, `leads.json`, `agents.json`, `admin.json`, and uploaded spreadsheets are synced directly inside your Cloudflare R2 bucket!)*

---

## 🚀 Method 1: Deploy via GitHub (Recommended)

1. **Commit and Push to your GitHub:**
   ```bash
   git add .
   git commit -m "Shift database and storage completely to Cloudflare R2"
   git push
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **"Add New..."** → **"Project"**.
   - Select your GitHub repository.
   - Expand the **Environment Variables** section and paste the R2 variables listed above.
   - Click **"Deploy"**!
   - In ~30 seconds, your CRM is live on your free Vercel domain (e.g. `leadspro.vercel.app`).

---

## 💻 Method 2: Deploy Directly via Terminal (Vercel CLI)

If you prefer to deploy directly from PowerShell without GitHub:

1. Open PowerShell in `leadspro` directory:
   ```bash
   cd "c:\Users\user\Desktop\Leads Software\leadspro"
   ```

2. Run:
   ```bash
   npx vercel
   ```
   Follow the prompts to connect your Vercel account.

3. Deploy to Production with environment variables:
   ```bash
   npx vercel --prod
   ```

---

## 🛠️ Architecture Highlights

- **Database Engine:** `server/services/r2DatabaseService.js` stores and queries collections in your Cloudflare R2 bucket.
- **Serverless API:** `api/index.js` handles all `/api/*` endpoints on Vercel serverless functions with zero cold-start delay.
- **Frontend SPA:** Built with React 19 + Vite + Tailwind CSS.
- **Zero Cost & High Reliability:** No MongoDB Atlas connection dropouts or IP whitelist issues.
