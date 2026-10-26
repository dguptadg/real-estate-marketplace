# Real Estate Marketplace

A full-stack real estate website built with Django REST Framework and React. Users can list properties for sale or rent, browse other listings, and contact property owners through private messages.

I built this project to get hands-on experience with backend development, REST APIs, authentication, and connecting a Django backend to a React frontend.

## Features

- User registration, login, and profile updates using JWT authentication
- Create, edit, and archive property listings
- Upload and remove multiple property images
- Search, filter, and sort properties
- Private conversations between buyers and property owners
- Messages saved in the database, with new messages fetched through polling
- Access restrictions so users can only edit their own properties and read their own conversations

Property listings and images are available only to logged-in users.

## Tech Stack

**Backend:** Python, Django, Django REST Framework, Simple JWT

**Frontend:** React, Vite, Tailwind CSS

**Database:** SQLite for local development, with PostgreSQL configuration available

## Project Structure

```text
real-estate-marketplace/
├── backend/
│   ├── accounts/
│   ├── properties/
│   ├── messaging/
│   ├── config/
│   └── manage.py
├── frontend/
├── requirements.txt
└── README.md
```

## Running Locally

You will need Python 3.11 and Node.js installed.

### 1. Backend

From the project folder, activate your Python virtual environment. If you haven't created one yet:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a file named `.env` inside `backend/` with the following settings:

```env
DJANGO_SECRET_KEY=your-generated-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
```

Generate a secret key using:

```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Replace `your-generated-secret-key` with the generated value. Do not commit your `.env` file.

Start Django:

```powershell
cd backend
python manage.py migrate
python manage.py runserver
```

The API will run at `http://127.0.0.1:8000/`.

### 2. Frontend

In a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` in your browser.

## Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register/` | Register |
| POST | `/api/auth/login/` | Login |
| GET, PATCH | `/api/auth/profile/` | View or update profile |
| GET, POST | `/api/properties/` | Browse or create properties |
| GET, PATCH, DELETE | `/api/properties/<id>/` | View, update, or archive a property |
| POST | `/api/properties/<id>/images/` | Upload property images |
| GET, POST | `/api/conversations/` | List or start conversations |
| GET, POST | `/api/conversations/<id>/messages/` | Read or send messages |

Most endpoints require a JWT access token. Messages can also be fetched using `?after_id=<message_id>` to retrieve only newer messages.

## Project Status

The application works locally. Deployment is not included at this stage.
