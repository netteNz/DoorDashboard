# DoorDashboard

A full-stack web application for DoorDash drivers to track earnings, analyze performance metrics, and visualize delivery data.

![Demo](https://github.com/user-attachments/assets/a981b149-1c96-4958-8b6f-0df303e0bb22)


## Features

- **Earnings Dashboard**: Track your total earnings, active time, and dash time
- **Interactive Charts**: Visualize your earnings progress over time with smooth bell curve transitions
- **Delivery Analytics**: Break down earnings by restaurant, merchant type, and location
- **Weekly Summaries**: View consolidated stats for each week
- **Challenge Tracking**: Record and include bonus challenges in your total earnings
- **Session Management**: Add, view, and delete delivery sessions
- **Performance Metrics**: Calculate hourly rate, time efficiency, and earnings per delivery

## Technologies

### Frontend

- React with functional components and hooks
- ApexCharts for data visualization
- TailwindCSS for responsive styling
- React Window for virtualized lists
- Optimized with useMemo and React.memo

### Backend

- Flask (Python)
- JSON-based data storage
- RESTful API endpoints
- Data processing and aggregation

## Installation

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- npm or yarn

### Setup

1. Clone the repository

```bash
git clone https://github.com/yourusername/doordashboard.git
cd doordashboard
```

2. Install backend dependencies

```bash
cd server
pip install -r requirements.txt
```

3. Install frontend dependencies

```bash
cd ../client
npm install
```

## Development

1. Start the Flask backend server

```bash
cd server
python app.py
```
This will start the API server at http://localhost:5000

2. Start the React frontend development server

```bash
cd client
npm run dev
```

This will start the development server at http://localhost:5173

## Usage

### Adding a New Session

1. Navigate to the "Add Session" tab
2. Enter the session details (date, time, deliveries, etc.)
3. Submit the form to save your session

### Managing Sessions

1. Go to the "Manage Sessions" tab
2. View all your recorded sessions
3. Delete sessions when needed

### Viewing Analytics

1. Check the main dashboard for summary cards and performance metrics
2. Use the time range selector to filter data by period
3. Explore the earnings chart to visualize your progress

## API Endpoints

### Session Management

- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Add a new session
- `DELETE /api/sessions/:id` - Delete a session

### Dashboard Data

- `GET /api/summary` - Get earnings summary statistics
- `GET /api/timeseries` - Get time-series data for charts
- `GET /api/weekly` - Get weekly aggregated statistics
- `GET /api/restaurants` - Get statistics grouped by restaurant
- `GET /api/locations` - Get delivery location statistics

### Utilities

- `GET /api/refresh-cache` - Force refresh of cached data

## Data Structure

The application uses a JSON structure for storing delivery sessions:

- **Note**: Rename the file inside the server/data/ dir from `doordash_sessions.example.json` to `doordash_sessions.json`

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

## Troubleshooting

- **Weekly data not updating**: Try clearing the cache using the `/api/refresh-cache` endpoint
- **Zero deliveries showing**: Check the session data format and ensure delivery objects have the required fields
- **Performance issues**: Use React DevTools to identify component re-rendering problems

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

---

## Roadmap

Future features planned:

- Multi-platform earnings tracking (UberEats, GrubHub integration)
- Expense tracking for mileage and gas
- Tax calculation helper
- Heat maps for profitable delivery areas
- Optimal scheduling recommendations
