# 🏠 Home Go. - Smart Home Control System

A complete smart home control application with QR code device registration, AI assistant, and hardware integration.

## Features

✨ **User Authentication**
- Sign up with username and email
- Secure login with JWT tokens
- Password encryption with bcryptjs

📱 **QR Code Registration**
- Scan device QR codes to register
- Automatic device detection and setup
- Support for multiple device types

🎮 **Device Control**
- Turn devices ON/OFF with a click
- Real-time device status updates
- Support for lights, fans, appliances, and more

🤖 **AI Assistant**
- Natural language device control
- "Turn on the living room light"
- OpenAI GPT integration (optional)

🔧 **Hardware Integration**
- REST API communication with IoT devices
- Support for ESP32 and Arduino
- Real-time device synchronization

## Architecture

```
Home Go.
├── Frontend (React + Vite)
│   ├── Authentication UI
│   ├── Device Dashboard
│   ├── QR Scanner
│   └── AI Chat Interface
├── Backend (Node.js + Express)
│   ├── Auth Routes
│   ├── Device Management
│   ├── AI Integration
│   └── Hardware Control
└── Database (MongoDB)
    ├── Users
    ├── Devices
    └── Conversations
```

## Environment Setup

### Backend

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/homego
JWT_SECRET=your_secret_key
OPENAI_API_KEY=sk-your-key
CORS_ORIGIN=http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
```

## QR Code Format

Device QR codes should contain:
```
hardwareId|deviceName|type|location|ipAddress|port
```

Example:
```
1234ABCD|Living Room Light|light|Living Room|192.168.1.50|8080
```

## Hardware Integration

Your IoT device should expose:
- **Endpoint:** `POST /api/control`
- **Payload:**
```json
{
  "deviceId": "1234ABCD",
  "command": "ON"
}
```

## Deployment

### Backend on Render
1. Create account at render.com
2. Connect GitHub repo
3. Set environment variables
4. Deploy main branch

### Frontend on Vercel
1. Create account at vercel.com
2. Connect GitHub repo
3. Set VITE_API_URL
4. Deploy

## Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Access at `http://localhost:3000`

## API Endpoints

### Auth
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user

### Devices
- `GET /api/devices` - List user devices
- `POST /api/devices/add-by-qr` - Register via QR
- `POST /api/devices/:id/control` - Control device

### AI
- `POST /api/ai/chat` - Chat with AI assistant

## License

MIT - Open source
