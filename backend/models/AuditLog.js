const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  time: { type: Date, default: Date.now },
  type: { type: String, required: true },
  message: { type: String, required: true },
  user: { type: String, default: 'SYSTEM' },
}, { collection: 'audit_logs' });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
