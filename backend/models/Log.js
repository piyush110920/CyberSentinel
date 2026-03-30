const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  source_ip: { type: String, default: 'Unknown' },
  features: { type: mongoose.Schema.Types.Mixed }, // Store the raw features sent to the model
  prediction: { type: Number, required: true },    // The combined class prediction
  threat_probability: { type: Number, required: true }, // The overall probability (max of both)
  model1_probability: { type: Number, default: 0 }, // CICIDS Probability
  model2_probability: { type: Number, default: 0 }, // 5G-NIDD Probability
  is_threat: { type: Boolean, required: true },    // Classification boolean
  details: { type: String },                       // Optional string tag
  attack_type: { type: String },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
  action_taken: { type: String },
  description: { type: String }
}, { collection: 'logs' });

module.exports = mongoose.model('Log', LogSchema);
