# Traffic Tracking System

A SaaS platform for tracking and managing traffic violations, with JWT authentication, a Flask/PostgreSQL backend, and a static HTML/Bootstrap frontend.

## Architecture

- **Frontend**: Static HTML/CSS/JS (Bootstrap 5) served from `frontend/` on port 5000
- **Backend**: Flask REST API in `backend/` running on port 8000
- **Database**: Replit PostgreSQL (via `DATABASE_URL` env var)
- **Proxy**: `server.py` serves frontend on port 5000 and proxies `/api/*` to backend on port 8000

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── __init__.py       # Flask app factory (CORS, blueprints)
│   │   ├── config.py         # Config (PostgreSQL, JWT, etc.)
│   │   ├── middleware.py     # JWT token_required decorator
│   │   ├── models.py         # SQLAlchemy models (User, Violation)
│   │   └── routes/
│   │       ├── auth.py       # /api/auth/register, /api/auth/login
│   │       └── traffic.py    # /api/traffic/violations (GET, POST)
│   ├── requirements.txt
│   └── run.py                # Entrypoint (port 8000)
├── frontend/
│   ├── index.html            # Landing page
│   ├── login.html            # Login page
│   ├── dashboard.html        # Violations dashboard
│   ├── css/style.css
│   └── js/
│       ├── auth.js           # Login form handler
│       ├── dashboard.js      # Violations table + logout
│       └── main.js           # Nav auth state
├── database/
│   └── schema.sql            # Reference SQL schema
├── server.py                 # Python proxy+static server (port 5000)
└── .env                      # Environment variables template
```

## Workflows

- **Start application** (`python server.py`) — Frontend proxy on port 5000 (webview)
- **Backend API** (`cd backend && python run.py`) — Flask API on port 8000 (console)

## Key Features

- JWT-based auth (register/login)
- Role-based access: `admin`, `officer`, `citizen`
- Violations CRUD (admin/officer can create; citizens see their own)
- Payment gateway placeholder (Razorpay — pending integration)
- Google Maps integration placeholder (pending)
- Firebase push notifications placeholder (pending)

## Database

- Replit-managed PostgreSQL
- Tables auto-created via SQLAlchemy `db.create_all()` on startup
- Models: `users`, `violations`

## Dependencies

- Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-CORS, PyJWT, psycopg2-binary, gunicorn
