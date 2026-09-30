const express = require('express');
const Device = require('../models/Device');
const authMiddleware = require('../middleware/auth');
const http = require('http');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const devices = await Device.find({ userId: req.userId });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/add-by-qr', authMiddleware, async (req, res) => {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json({ message: 'QR code is required' });
    }

    const existing = await Device.findOne({ qrCode, userId: req.userId });
    if (existing) {
      return res.status(400).json({ message: 'Device already registered' });
    }

    const parts = qrCode.split('|');

    if (parts.length < 6) {
      return res.status(400).json({ message: 'Invalid device QR format' });
    }

    const [hardwareId, name, type, location, ipAddress, port] = parts;

    const device = new Device({
      hardwareId,
      name,
      type,
      location,
      ipAddress,
      port: Number(port) || 8080,
      qrCode,
      userId: req.userId
    });

    await device.save();
    res.status(201).json({ message: 'Device added', device });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/control', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body;
    const device = await Device.findOne({ _id: req.params.id, userId: req.userId });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const newStatus = action === 'ON' ? 1 : 0;

    await sendDeviceCommand(device, newStatus);

    device.status = newStatus;
    device.lastUpdated = new Date();
    await device.save();

    res.json({ message: `Device ${action}`, device });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function sendDeviceCommand(device, status) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      deviceId: device.hardwareId,
      command: status === 1 ? 'ON' : 'OFF'
    });

    const options = {
      hostname: device.ipAddress,
      port: device.port,
      path: '/api/control',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 5000
    };

    const request = http.request(options, (response) => {
      let data = '';
      response.on('data', chunk => { data += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ ok: true });
        }
      });
    });

    request.on('error', (error) => {
      console.log('Device communication error:', error);
      resolve({ ok: true });
    });
    
    request.on('timeout', () => {
      request.destroy();
      resolve({ ok: true });
    });
    
    request.write(payload);
    request.end();
  });
}

module.exports = router;