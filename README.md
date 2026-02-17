# Automani Cars

A production-ready website for a used car dealership, featuring a public inventory and a secure admin panel.

## Features
- **Public Site**: Home, Inventory (with filters), Car Details.
- **Admin Panel**: Login, Dashboard, Add/Edit/Delete Cars, Photo Upload.
- **Tech Stack**: Node.js, Express, SQLite, Vanilla HTML/CSS/JS.

## Local Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Server**:
    ```bash
    npm start
    ```
    Visit `http://localhost:3000`

3.  **Admin Login**:
    - URL: `http://localhost:3000/admin/login.html`
    - User: `admin`
    - Pass: `automani2024`

---

## Deployment Guide

### Option 1: Render (Recommended)
This is the easiest way to deploy a Node.js app like this one.

1.  **Push code to GitHub**.
2.  **Sign up for [Render.com](https://render.com)**.
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub repository.
5.  Render will auto-detect settings:
    - **Runtime**: Node
    - **Build Command**: `npm install`
    - **Start Command**: `npm start`
6.  Click **Create Web Service**.

**Important Note regarding Database:**
On the free tier of Render (and most cloud platforms), the file system is *ephemeral*. This means your `automani.db` (database) and uploaded photos will likely be **reset** every time the server restarts or redeploys.
To fix this for production, you would typically add a **Persistent Disk** (paid feature on Render) or switch to a cloud database (like Turso or Supabase) and cloud storage (like Cloudinary).

### Option 2: Netlify (Not recommended for this specific app)
Netlify is great for static sites, but this app uses a custom server and database file.

If you deploy this to Netlify:
1.  The server code must be converted to **Netlify Functions**.
2.  The **SQLite database file will NOT work** because Netlify functions effectively "start fresh" on every request.
3.  You would need to rewrite the backend to use a cloud database (like Neon or Turso) instead of a local file.

**Verdict**: Stick with **Render** or **Railway** for the simplest deployment experience with this codebase.
