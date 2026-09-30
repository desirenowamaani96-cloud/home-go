import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('homego-token') || '');
  const [user, setUser] = useState(null);
  const [devices, setDevices] = useState([]);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchDevices();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_URL}/devices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDevices(data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/login';
    const payload = authMode === 'signup'
      ? formData
      : { email: formData.email, password: formData.password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Authentication failed');
        setLoading(false);
        return;
      }

      localStorage.setItem('homego-token', data.token);
      setToken(data.token);
      setUser(data.user);
      setFormData({ username: '', email: '', password: '' });
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  const toggleDevice = async (deviceId, action) => {
    try {
      const res = await fetch(`${API_URL}/devices/${deviceId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      const data = await res.json();
      if (res.ok) {
        fetchDevices();
      } else {
        alert(data.message || 'Failed to control device');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startScanner = () => {
    setScannerOpen(true);

    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);

    scanner.render(async (decodedText, _result) => {
      scanner.clear();
      setScannerOpen(false);

      try {
        const res = await fetch(`${API_URL}/devices/add-by-qr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ qrCode: decodedText })
        });

        const data = await res.json();
        if (res.ok) {
          fetchDevices();
          alert('Device registered successfully!');
        } else {
          alert(data.message || 'QR code rejected');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }, (error) => {
      console.log('QR scan error', error);
    });
  };

  const sendAi = async () => {
    if (!chatInput.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: chatInput })
      });

      const data = await res.json();
      setAiMessage(data.response || 'No response');
      setChatInput('');
      fetchDevices();
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('homego-token');
    setToken('');
    setUser(null);
    setDevices([]);
  };

  if (!token || !user) {
    return (
      <div className="auth-page">
        <div className="auth-box">
          <h1>🏠 Home Go.</h1>
          <p>Smart home access with QR device registration</p>

          <div className="auth-toggle">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
              Sign In
            </button>
            <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth}>
            {authMode === 'signup' && (
              <input
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : authMode === 'signup' ? 'Create account' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <h2>🏠 Home Go.</h2>
          <small>Welcome, {user.username}</small>
        </div>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      <div className="actions-row">
        <button onClick={startScanner} className="btn-primary">📱 Scan QR Device</button>
      </div>

      {scannerOpen && (
        <div className="scanner-box">
          <div id="qr-reader"></div>
        </div>
      )}

      <div className="device-grid">
        {devices.length === 0 ? (
          <p className="no-devices">No devices registered yet. Scan a QR code to add one.</p>
        ) : (
          devices.map(device => (
            <div className="device-card" key={device._id}>
              <h3>{device.name}</h3>
              <p className="location">{device.location}</p>
              <p className={device.status === 1 ? 'status-on' : 'status-off'}>
                {device.status === 1 ? '🟢 ON' : '🔴 OFF'}
              </p>
              <button 
                onClick={() => toggleDevice(device._id, device.status === 1 ? 'OFF' : 'ON')}
                className={device.status === 1 ? 'btn-off' : 'btn-on'}
              >
                {device.status === 1 ? 'Turn OFF' : 'Turn ON'}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="ai-panel">
        <h3>🤖 HomeGo AI Assistant</h3>
        <p className="ai-hint">Ask me to control your devices with natural language</p>
        <div className="chat-box">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Example: Turn on the living room light"
          />
          <button onClick={sendAi} disabled={loading} className="btn-primary">
            {loading ? 'Thinking...' : 'Ask AI'}
          </button>
        </div>
        {aiMessage && <p className="ai-response">✨ {aiMessage}</p>}
      </div>
    </div>
  );
}

export default App;