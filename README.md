# DoorDashboard

A full-stack web application for DoorDash drivers to track earnings, analyze performance metrics, and visualize delivery data.

![Overview](https://github.com/user-attachments/assets/a981b149-1c96-4958-8b6f-0df303e0bb22)


## Features

- **Earnings Dashboard** with interactive charts and $50 challenge bonus tracking
- **Delivery Analytics** by restaurant, merchant type, and location
- **Performance Metrics** including hourly rates and time efficiency
- **Session Management** for adding and managing delivery data

## Tech Stack

- **Frontend**: React, ApexCharts, TailwindCSS
- **Backend**: Flask API with JWT authentication
- **Data**: JSON-based storage with aggregation services

## Quick Start

```bash
# Backend setup
cd server
pip install -r requirements.txt
python app.py  # Runs on http://localhost:5000

# Frontend setup
cd client
npm install
npm run dev    # Runs on http://localhost:5173
```

## Authentication

![Login](https://github.com/user-attachments/assets/b71c5205-75f7-4369-b8f3-cd9af30823e4)

The application implements JWT (JSON Web Tokens) for secure authentication:
- Protected routes require a valid access token
- Automatic token refresh mechanism
- Session persistence across page reloads

## TODO

- **Database Implementation**
  - Replace JSON file storage with MongoDB or PostgreSQL
  - Add data migration scripts from JSON to DB
  - Implement proper DB connection pooling and error handling

- **Deployment**
  - Configure CI/CD pipeline with GitHub Actions
  - Deploy backend API to a cloud provider (Replit, Azure, AWS) *replit for proof of concept; scale accordingly*
  - Set up frontend hosting
  - Implement environment-specific configuration

## API Endpoints

```
# Core data endpoints
GET /api/summary     # Earnings summary with metrics
GET /api/timeseries  # Time-series chart data
GET /api/restaurants # Restaurant statistics

# Authentication
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
```

## Data Structure

Sessions are stored in doordash_sessions.json:

```json
{
  "sessions": [
    {
      "date": "2025-05-15",
      "start_time": "18:00",
      "end_time": "20:00",
      "dash_time_minutes": 120,
      "active_time_minutes": 60,
      "deliveries": [
        {
          "restaurant": "McDonald's",
          "doordash_pay": 4.25,
          "tip": 1.75,
          "total": 6.0,
          "merchant_type": "Fast Food"
        }
      ],
      "earnings": 6.0
    },
    {
      "date": "2025-04-29",
      "challenge_bonus": 50.0,
      "note": "Weekly Challenge",
      "deliveries": []
    }
  ]
}
```

> **Note**: Rename `doordash_sessions.example.json` to `doordash_sessions.json` to get started.

## License

This project is licensed under the MIT License.
