# staff-app-bot
A simple bot for staff application for a discord server


# Staff App Bot (Discord + Express + Prisma/Postgres)

## Overview
Minimal staff application system:
- Discord bot provides application link.
- Web form stores entries in Postgres via Prisma.
- Admins (role name configured in .env) can view/manage via bot (DM).
- Staff dashboard page available (protected by STAFF_API_KEY).

## Quick setup (local)
1. Copy `.env.example` -> `.env`, fill with your values.
2. Install:


3. Generate Prisma client:

4. Create/migrate DB (dev):

5. Start:

The command starts the web server and bot together.

6. Invite bot to your server:
- In Discord Developer Portal > OAuth2 > URL Generator:
  - Scopes: `bot`, `applications.commands`
  - Bot permissions: `Send Messages`, `Read Message History`, `Use Slash Commands`, `Send Messages in Threads` (basic)
- Or use invite URL:
  ```
  https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot%20applications.commands&permissions=274878145024
  ```
  Replace `YOUR_CLIENT_ID` with your app's client id.

7. Test:
- In server: `!apply` or `/apply` to get the link.
- Fill the form and submit.
- Admins (role named in `ADMIN_ROLE_NAME`) can use:
  - `!applications` — DM count
  - `!viewapps` — DM list (up to 50)
  - `!review <discordId>` — DM full details
  - `!setstatus <discordId> <accepted|rejected|pending>` — update status & notify applicant

## Deploy
- Push to GitHub, connect to Render or other host.
- On Render, set environment variables (use `render.yaml` or the UI).
- Make sure `DATABASE_URL` points to a Postgres instance (Neon, Supabase, Railway).

## Notes
- Dashboard page (`/submissions.html`) uses `STAFF_API_KEY` (paste it into page input).
- Admin checks are role-name based (change `ADMIN_ROLE_NAME` in `.env`).
- If an admin has DMs disabled, the bot will warn in channel.
