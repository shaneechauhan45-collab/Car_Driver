# Car Rental System (React + Express + MySQL + Razorpay)

## 1. Database
mysql -u root -p < schema.sql

## 2. Backend
cd backend && cp .env.example .env   # fill in DB password, JWT secret, Razorpay test keys
npm install && npm run dev            # runs on http://localhost:5000

## 3. Frontend
cd frontend && npm install && npm run dev   # runs on http://localhost:5173

## 4. Make yourself an admin
Sign up on the site, then run:
UPDATE users SET role='admin' WHERE email='you@example.com';
Log out and log in again so your token carries the admin role.
