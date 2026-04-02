const mongoose = require('mongoose');

const FirewallRuleSchema = new mongoose.Schema({
  ip: { type: String, required: true },
  reason: { type: String, required: true },
  date: { type: Date, default: Date.now }
}, { collection: 'firewall_rules' });

module.exports = mongoose.model('FirewallRule', FirewallRuleSchema);
