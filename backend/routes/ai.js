const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const Device = require('../models/Device');
const AIConversation = require('../models/AIConversation');
const { verifyToken } = require('../middleware/auth');
const http = require('http');

const router = express.Router();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Send message to AI Agent
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.userId;

    // Get user's devices
    const devices = await Device.find({ userId });
    const deviceList = devices.map(d => `${d.name} (${d.type}) - Currently ${d.status ? 'ON' : 'OFF'}`).join(', ');

    // Get or create conversation
    let conversation = await AIConversation.findOne({ userId });
    if (!conversation) {
      conversation = new AIConversation({ userId, messages: [] });
    }

    // Add user message to history
    conversation.messages.push({
      role: 'user',
      content: message
    });

    // Build system prompt
    const systemPrompt = `You are HomeGo AI Assistant, a smart home control assistant. 
    The user has the following devices: ${deviceList}
    
    When the user asks to control devices:
    1. Identify the device they want to control
    2. Determine the action (turn on/off)
    3. Provide a friendly response about what you're doing
    
    If you detect a control command, format it as: [CONTROL_ACTION: deviceName|action]
    For example: [CONTROL_ACTION: Living Room Light|ON]
    
    Always be helpful, friendly, and concise. Understand natural language commands like:
    - "Turn on the lights"
    - "Can you switch off the TV?"
    - "I need the bedroom fan running"
    - "Show me device status"`;

    // Call OpenAI API
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const aiMessage = response.data.choices[0].message.content;

    // Parse control actions from AI response
    const controlActions = [];
    const controlRegex = /\[CONTROL_ACTION: (.+?)\|(.+?)\]/g;
    let match;
    while ((match = controlRegex.exec(aiMessage)) !== null) {
      const [_, deviceName, action] = match;
      const device = devices.find(d => d.name.toLowerCase() === deviceName.toLowerCase());
      if (device) {
        controlActions.push({
          deviceId: device._id,
          action: action.toUpperCase()
        });
        // Execute device control
        await sendCommandToHardware(device, action.toUpperCase() === 'ON' ? 1 : 0);
      }
    }

    // Remove control action tags from response
    const cleanedMessage = aiMessage.replace(/\[CONTROL_ACTION: .+?\|.+?\]/g, '').trim();

    // Add AI response to history
    conversation.messages.push({
      role: 'assistant',
      content: cleanedMessage
    });

    if (controlActions.length > 0) {
      conversation.deviceActionsExecuted.push(...controlActions);
      // Update device status
      for (const action of controlActions) {
        const device = devices.find(d => d._id.toString() === action.deviceId.toString());
        if (device) {
          device.status = action.action === 'ON' ? 1 : 0;
          device.lastUpdated = new Date();
          await device.save();
        }
      }
    }

    await conversation.save();

    // Broadcast device updates via WebSocket
    const io = req.app.get('io');
    controlActions.forEach(action => {
      io.emit('device_updated', {
        deviceId: action.deviceId,
        status: action.action === 'ON' ? 1 : 0
      });
    });

    res.json({
      message: cleanedMessage,
      actions: controlActions,
      conversationId: conversation._id
    });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ message: 'AI service error', error: error.message });
  }
});

// Get conversation history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const conversation = await AIConversation.findOne({ userId: req.userId });
    res.json(conversation || { messages: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to send command to hardware
async function sendCommandToHardware(device, status) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      command: status === 1 ? 'ON' : 'OFF',
      deviceId: device.hardwareId
    });

    const options = {
      hostname: device.ipAddress,
      port: device.port,
      path: '/api/control',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

module.exports = router;
