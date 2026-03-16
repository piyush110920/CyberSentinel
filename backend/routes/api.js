const express = require('express');
const router = express.Router();
const axios = require('axios');
const nodemailer = require('nodemailer');
const Log = require('../models/Log');

// Set up transporter (using Mailtrap sandbox for testing)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
  port: process.env.SMTP_PORT || 2525,
  auth: {
    user: process.env.SMTP_USER || "5b9e6d54790aa9",
    pass: process.env.SMTP_PASS || "3272471ab898a7"
  }
});

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:5000';

// @route   POST /api/analyze
// @desc    Analyze network parameters via Python ML API and save log
router.post('/analyze', async (req, res) => {
  try {
    const payload = req.body;
    
    // Call Python ML API
    const response = await axios.post(`${PYTHON_API_URL}/predict`, payload);
    const result = response.data;
    
    // Determine AI Severity based on probability
    let aiSeverity = 'Low';
    if (result.threat_probability > 0.90) aiSeverity = 'Critical';
    else if (result.threat_probability > 0.75) aiSeverity = 'High';
    else if (result.threat_probability > 0.50) aiSeverity = 'Medium';

    // Construct Log entry
    const newLog = new Log({
      source_ip: payload.source_ip || 'Unknown',
      features: payload.features || payload,
      prediction: result.prediction,
      threat_probability: result.threat_probability,
      model1_probability: result.model1_probability,
      model2_probability: result.model2_probability,
      is_threat: result.is_threat,
      severity: result.is_threat ? aiSeverity : undefined,
      action_taken: (aiSeverity === 'High' || aiSeverity === 'Critical') ? 'Blocked & Alerted' : 'Logged',
      details: result.is_threat ? 'AI Model Detected Anomalous Payload' : 'Normal Traffic'
    });
    
    // Save to DB
    await newLog.save();
    
    // Emit event to React dashboard via Socket.io
    req.io.emit('new_threat_log', newLog);
    
    // Send email alert for High/Critical if it's genuinely analyzed
    if (result.is_threat && (aiSeverity === 'High' || aiSeverity === 'Critical')) {
      const mailOptions = {
        from: '"Cyber Sentinel Alert" <alerts@cybersentinel.local>',
        to: process.env.ALERT_EMAIL || 'cybersentinel.contact@gmail.com',
        subject: `🚨 Genuine ${aiSeverity} AI Threat Detected!`,
        text: `A genuine ${aiSeverity} severity threat was detected by the Machine Learning Pipeline!\n\nAI Probability: ${(result.threat_probability * 100).toFixed(2)}%\nSource IP: ${payload.source_ip}\nTime: ${newLog.timestamp.toISOString()}\nDetails: Model 1 Output (${result.model1_probability}), Model 2 Output (${result.model2_probability})`
      };
      
      transporter.sendMail(mailOptions).catch(err => console.error('AI Email send failed:', err));
    }
    
    res.json({ success: true, log: newLog });
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to analyze data.' });
  }
});

// @route   POST /api/simulate
// @desc    Receive simulated attack and create alert
router.post('/simulate', async (req, res) => {
  try {
    const { attack_type, source_ip, severity, description } = req.body;
    
    // Construct Log entry for simulation
    const simulatedProb = severity === 'Critical' ? 0.99 : severity === 'High' ? 0.90 : severity === 'Medium' ? 0.75 : 0.60;
    const newLog = new Log({
      source_ip: source_ip || 'Unknown',
      features: { simulated: true },
      prediction: 1, // simulated threat
      threat_probability: simulatedProb,
      model1_probability: simulatedProb, // Mirror exact probability to simulators to maintain visuals
      model2_probability: simulatedProb, 
      is_threat: true,
      details: 'Simulated Attack',
      attack_type,
      severity,
      action_taken: severity === 'High' || severity === 'Critical' ? 'Blocked & Alerted' : 'Logged',
      description
    });
    
    // Save to DB
    await newLog.save();
    
    // Emit event to React dashboard via Socket.io
    req.io.emit('new_threat_log', newLog);
    
    // Send email alert for High/Critical
    if (severity === 'High' || severity === 'Critical') {
      const mailOptions = {
        from: '"Cyber Sentinel Alert" <alerts@cybersentinel.local>',
        to: process.env.ALERT_EMAIL || 'cybersentinel.contact@gmail.com',
        subject: `⚠️ ${severity} Severity Threat Detected: ${attack_type}`,
        text: `A ${severity} severity threat was detected!\n\nType: ${attack_type}\nSource IP: ${source_ip}\nTime: ${newLog.timestamp.toISOString()}\nDescription: ${description}`
      };
      
      transporter.sendMail(mailOptions).catch(err => console.error('Email send failed:', err));
    }
    
    res.json({ success: true, message: 'Threat event sent to IDS.', log: newLog });
  } catch (err) {
    console.error('Simulation error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to simulate attack.' });
  }
});

// @route   GET /api/logs
// @desc    Get recent logs for dashboard
router.get('/logs', async (req, res) => {
  try {
    // Fetch last 100 logs, sorted by newest first
    const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching logs:', err.message);
    res.status(500).json({ error: 'Server error fetching logs' });
  }
});

// @route   GET /api/stats
// @desc    Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalLogs = await Log.countDocuments();
    const threatLogs = await Log.countDocuments({ is_threat: true });
    
    // Calculate last 24 hours threats
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentThreats = await Log.countDocuments({ 
      is_threat: true, 
      timestamp: { $gte: yesterday } 
    });

    const highSeverity = await Log.countDocuments({ severity: { $in: ['High', 'Critical'] } });
    const mediumSeverity = await Log.countDocuments({ severity: 'Medium' });
    const lowSeverity = await Log.countDocuments({ 
      $or: [
        { severity: 'Low' },
        { severity: { $exists: false }, is_threat: true }
      ]
    });
    
    res.json({
      total_analyzed: totalLogs,
      total_threats: threatLogs,
      recent_threats: recentThreats,
      risk_level: recentThreats > 50 ? 'High' : (recentThreats > 10 ? 'Medium' : 'Low'),
      high_severity: highSeverity,
      medium_severity: mediumSeverity,
      low_severity: lowSeverity
    });
  } catch (err) {
    console.error('Error fetching stats:', err.message);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

module.exports = router;
