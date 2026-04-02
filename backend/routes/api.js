const express = require('express');
const router = express.Router();
const axios = require('axios');
const nodemailer = require('nodemailer');
const Log = require('../models/Log');
const AuditLog = require('../models/AuditLog');
const FirewallRule = require('../models/FirewallRule');
const os = require('os');
const mongoose = require('mongoose');

// Track actual API traffic for real throughput calculation
let totalApiRequests = 0;
router.use((req, res, next) => {
  totalApiRequests++;
  next();
});
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

// @route   GET /api/audit-logs
// @desc    Get system audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ time: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// @route   POST /api/audit-logs
// @desc    Create an audit log
router.post('/audit-logs', async (req, res) => {
  try {
    const audit = new AuditLog(req.body);
    await audit.save();
    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save audit log' });
  }
});

// @route   GET /api/firewall-rules
// @desc    Get persisted firewall rules
router.get('/firewall-rules', async (req, res) => {
  try {
    const rules = await FirewallRule.find().sort({ date: -1 });
    // Normalize _id to id for frontend
    res.json(rules.map(r => ({ id: r._id, ip: r.ip, reason: r.reason, date: r.date })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch firewall rules' });
  }
});

// @route   POST /api/firewall-rules
// @desc    Add a firewall rule
router.post('/firewall-rules', async (req, res) => {
  try {
    const rule = new FirewallRule(req.body);
    await rule.save();
    
    // Auto-log to Audit Log
    const audit = new AuditLog({
      id: `AL-${Math.floor(Math.random()*9000)+1000}`,
      type: 'FIREWALL_UPDATE',
      message: `Enforced BLOCK routing denial for IP address ${req.body.ip}. Reason: ${req.body.reason}`,
      user: 'admin@cybersentinel.local'
    });
    await audit.save();

    res.json({ id: rule._id, ip: rule.ip, reason: rule.reason, date: rule.date });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save firewall rule' });
  }
});

// @route   DELETE /api/firewall-rules/:id
// @desc    Remove a firewall rule
router.delete('/firewall-rules/:id', async (req, res) => {
  try {
    const rule = await FirewallRule.findByIdAndDelete(req.params.id);
    if (rule) {
      const audit = new AuditLog({
        id: `AL-${Math.floor(Math.random()*9000)+1000}`,
        type: 'FIREWALL_UPDATE',
        message: `Removed BLOCK routing denial for IP address ${rule.ip}.`,
        user: 'admin@cybersentinel.local'
      });
      await audit.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete firewall rule' });
  }
});

// Simulation Site Health Tracking State
let simulationSiteIsDown = false;
let isArtificiallyDown = false; // Kill switch flag

// @route   POST /api/health/toggle-sim-crash
// @desc    Artificially toggles the simulation site status for demonstration
router.post('/health/toggle-sim-crash', (req, res) => {
  isArtificiallyDown = !isArtificiallyDown;
  console.log(`Simulation Site Artificial Crash is now: ${isArtificiallyDown ? 'ACTIVE (Offline)' : 'INACTIVE (Online)'}`);
  res.json({ success: true, is_down: isArtificiallyDown });
});

// @route   GET /api/health/simulation
// @desc    Ping simulation site to check uptime
router.get('/health/simulation', async (req, res) => {
  try {
    if (isArtificiallyDown) {
      throw new Error('Artificial 404 Simulated Crash Triggered');
    }
    
    // Attempt to ping the Simulation site
    await axios.get('http://localhost:5174/');
    
    // If it succeeds and was previously down, reset the lock
    if (simulationSiteIsDown) {
      console.log('Simulation site recovered.');
      simulationSiteIsDown = false;
    }
    
    return res.json({ status: 'up' });
    
  } catch (err) {
    // Site is unreachable (down or 404)
    if (!simulationSiteIsDown) {
      // Send alert email since it just went down
      simulationSiteIsDown = true;
      console.log('Simulation site is DOWN! Sending alert...');
      
      const mailOptions = {
        from: '"Cyber Sentinel Alert" <alerts@cybersentinel.local>',
        to: process.env.ALERT_EMAIL || "cybersentinel.contact@gmail.com",
        subject: `🔥 CRITICAL: Simulation Site is Offline!`,
        text: `The Cyber Sentinel System Monitor has detected that the threat Simulation Interface (http://localhost:5174) is no longer responding.\n\nError: Connection Refused or 404 Not Found.\nPlease check the Node server immediately.`
      };
      
      transporter.sendMail(mailOptions).catch(e => console.error('Uptime Email send failed:', e));
    }
    
    return res.json({ status: 'down' });
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

// @route   GET /api/system-health
// @desc    Get real-time OS and database metrics
router.get('/system-health', async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpuLoad = os.loadavg(); 

    let dbStats = { dataSize: 0, storageSize: 0, objects: 0, connections: 1 };
    if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
       dbStats = await mongoose.connection.db.command({ dbStats: 1 });
       dbStats.connections = mongoose.connection.base.connections.length;
    }

    let mlLatency = 0;
    let mlStatus = 'OFFLINE';
    const start = Date.now();
    try {
       await axios.get(`${PYTHON_API_URL}/`, { timeout: 2000 });
       mlLatency = Date.now() - start;
       mlStatus = 'ONLINE';
    } catch(e) {
       if (e.response) {
         mlStatus = 'ONLINE';
         mlLatency = Date.now() - start;
       }
    }
    
    // Safety clamp: if localhost resolves too quickly, bump latency up
    if (mlStatus === 'ONLINE' && mlLatency < 1) mlLatency = 1;

    // True Average Throughput
    const uptime = process.uptime() || 1;
    const throughput = (totalApiRequests / uptime).toFixed(2);

    res.json({
       nodeUptime: uptime,
       apiThroughput: throughput,
       osTotalMem: totalMem,
       osUsedMem: usedMem,
       nodeUsedMem: memoryUsage.heapUsed,
       cpuLoad1m: cpuLoad[0] || os.cpus().reduce((acc, cpu) => acc + cpu.times.user, 0) / os.cpus().length,
       cpuCores: os.cpus().length,
       dbDataSize: dbStats.dataSize || 0, 
       dbStorageSize: dbStats.storageSize || 0,
       dbObjects: dbStats.objects || 0,
       dbConnections: dbStats.connections || 1,
       mlLatency,
       mlStatus
    });
  } catch (err) {
    console.error('Error fetching system health:', err.message);
    res.status(500).json({ error: 'Server error fetching health' });
  }
});

module.exports = router;
