const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: Number, default: 0 },
  hardwareId: { type: String, required: true },
  ipAddress: { type: String, required: true },
  port: { type: Number, default: 8080 },
  qrCode: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Device', deviceSchema);