# Student Task Web App

SSE3308 – Web Application Development. A serverless task manager built with **React (Vite)**, **Firebase Authentication**, **Cloud Firestore** and **Supabase Edge Functions**. With the lecturer's approval, Supabase Edge Functions replace Firebase Cloud Functions, because Cloud Functions need the paid Blaze plan.

**Live demo:** https://student-task-system-lab.web.app

## How it works

| Part | Role |
|---|---|
| Firebase Authentication | Register / login / logout with email + password; gives each user a verified UID. |
| Cloud Firestore | Stores `tasks` documents (`uid`, `title`, `description`, `priority`, `dueDate`, `completed`, `createdAt`). Dashboard reads them live with `onSnapshot()`. |
| Supabase Edge Functions | `create-task`, `toggle-task`, `delete-task`. `create-task` validates title (1–100 chars), notes (≤ 500), priority (`low`/`medium`/`high`) and due date (`YYYY-MM-DD`). Each one verifies the caller's **Firebase ID token** (sent as `Authorization: Bearer …`), validates input, checks the task's `uid` matches the caller, then writes to Firestore with a Firebase service account. |
| Firestore Security Rules | Users can only **read** tasks where `uid == request.auth.uid`. All client writes are denied, so writes must go through the functions. |

Flow: React → Firebase Auth (sign in, get ID token) → Supabase Edge Function (verify token, check ownership, write) → Firestore → `onSnapshot` updates the React dashboard.

The service account bypasses Firestore Security Rules, like the Admin SDK in Cloud Functions. That is why every function does its own login and ownership checks.

## Project structure

```
src/firebase.js                       Firebase web config (auth, db)
src/api.js                            Calls the Edge Functions with the Firebase ID token
src/App.jsx                           Shows Loading / Login / Dashboard based on auth state
src/pages/Login.jsx                   Register + login form
src/pages/Dashboard.jsx               Task list, progress, filters, toggle/delete  (URL: /)
src/pages/NewTask.jsx                 New task form: title, notes, priority, due date (URL: /new)
src/components/Layout.jsx             Shared top bar (logo, user, logout)
supabase/functions/_shared/firebase.ts  Token verification, Firestore access, ownership check
supabase/functions/create-task/       Create task
supabase/functions/toggle-task/       Toggle completed
supabase/functions/delete-task/       Delete task
supabase/config.toml                  Turns off Supabase JWT check (we verify Firebase tokens instead)
firestore.rules                       Firestore Security Rules
```

## Setup

Requirements: Node.js LTS, Firebase CLI, a Firebase project (free Spark plan is fine) and a Supabase project (free plan).

1. **Firebase:** enable Authentication → Email/Password, create a Firestore database and register a web app. Put the web config in `src/firebase.js`.
2. **Service account key:** Firebase Console → Project settings → Service accounts → *Generate new private key*. Keep this file private and never commit it.
3. **Supabase:** create a project, then link and upload the key as a secret:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   # The key must be stored as ONE line of JSON (multi-line values get corrupted):
   npx supabase secrets set "FIREBASE_SERVICE_ACCOUNT=$(node -e "process.stdout.write(JSON.stringify(require('./path/to/service-account.json')))")"
   ```
   On Windows PowerShell, use `npx.cmd` instead of `npx` if scripts are blocked.
4. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co`.
5. `npm install`, then `npm run dev` and open http://localhost:5173.

## Deployment

```bash
firebase deploy --only firestore:rules
npx supabase functions deploy create-task --no-verify-jwt
npx supabase functions deploy toggle-task --no-verify-jwt
npx supabase functions deploy delete-task --no-verify-jwt
```

Host the frontend (free on the Spark plan):
```bash
npm run build
firebase deploy --only hosting
```

## Testing user isolation

1. Register Student A, add two tasks, toggle one, delete one.
2. Log out, register Student B. B's dashboard is empty: B cannot see A's tasks (Firestore rules).
3. If B calls `toggle-task`/`delete-task` with A's task ID, the function returns `not-found` because the task's `uid` does not match B's verified UID.
4. Calling a function with no token or a fake token returns `401 unauthenticated`.
