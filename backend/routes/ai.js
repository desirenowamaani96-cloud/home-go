const express = require('express');
const OpenAI = require('openai');
const Device = require('../models/Device');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const devices = await Device.find({ userId: req.userId });

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    if (openai) {
      const deviceList = devices.map(d => `${d.name} (${d.type}) is ${d.status ? 'ON' : 'OFF'}`).join(', ');
      const prompt = `You are HomeGo AI, a smart home assistant. User has these devices: ${deviceList}. If user asks to turn on/off a device, respond with JSON: {"action":"ON","device":"device name"} or {"action":"OFF","device":"device name"}. Otherwise respond naturally.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message }
        ]
      });

      const output = completion.choices[0].message.content;
      let parsed = null;

      try {
        parsed = JSON.parse(output);
      } catch {
        parsed = null;
      }

      if (parsed && parsed.device && (parsed.action === 'ON' || parsed.action === 'OFF')) {
        const target = devices.find(d => d.name.toLowerCase() === parsed.device.toLowerCase());
        if (target) {
          target.status = parsed.action === 'ON' ? 1 : 0;
          target.lastUpdated = new Date();
          await target.save();

          return res.json({
            response: `${target.name} has been turned ${parsed.action.toLowerCase()}.`,
            action: parsed.action,
            device: target.name
          });
        }
      }

      return res.json({ response: output });
    }

    const lower = message.toLowerCase();

    for (const device of devices) {
      if (lower.includes('turn on') && lower.includes(device.name.toLowerCase())) {
        device.status = 1;
        device.lastUpdated = new Date();
        await device.save();
        return res.json({ response: `${device.name} is now ON.`, action: 'ON', device: device.name });
      }

      if (lower.includes('turn off') && lower.includes(device.name.toLowerCase())) {
        device.status = 0;
        device.lastUpdated = new Date();
        await device.save();
        return res.json({ response: `${device.name} is now OFF.`, action: 'OFF', device: device.name });
      }
    }

    res.json({ response: 'I can help with your smart home devices. Try: turn on living room light.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;