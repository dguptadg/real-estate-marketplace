# Property Marketplace — Simple Frontend (Phase 6, Step 1)

A minimal React + Vite + Tailwind frontend for the existing Django REST API.

## Pages included

- `/register`: register a user through `POST /api/auth/register/`
- `/login`: get JWT tokens through `POST /api/auth/login/`
- `/`: protected home/dashboard, displays user profile
- `/profile`: get and update profile via `GET/PATCH /api/auth/profile/`
- Logout and protected route redirects

No property cards or chat yet. These will be added after this starter is verified.

## Set up (Windows PowerShell)

1. Stop the previous frontend server if it is running.
2. From `D:\real-estate-marketplace`, rename your existing frontend folder before extracting this package:

   ```powershell
   Rename-Item .\frontend frontend_old
   ```

   Skip this command if no `frontend` folder exists.
3. Extract the ZIP to `D:\real-estate-marketplace` so you have `D:\real-estate-marketplace\frontend\package.json`.
4. In a separate terminal, run the existing Django backend:

   ```powershell
   cd D:\real-estate-marketplace\backend
   python manage.py runserver
   ```

5. Run frontend:

   ```powershell
   cd D:\real-estate-marketplace\frontend
   npm install
   npm run dev
   ```

6. Open http://127.0.0.1:5173.

## Notes

- Needs Node.js 20.19+ or 22.12+ for Vite 7.
- Vite proxies `/api` to Django at `http://127.0.0.1:8000`; no backend URL edits are needed for local testing.
- Login expects `username` and `password` (Simple JWT default); change the login payload only if you customized the backend.
- Session tokens are stored in `sessionStorage` for this local MVP and refreshed via `/api/auth/refresh/`. Revisit production token security before deployment.
- Guests cannot view protected routes. Django continues to enforce access on its APIs.
- JWT session storage can be cleared by closing the tab/window or logging out.
- You can remove `frontend_old` only after you confirm the new frontend works.
