
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/blood_vault', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Schemas (same as before)
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  permissions: [String],
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const donorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: { type: String, required: true },
  bloodType: { type: String, required: true },
  dateOfBirth: Date,
  phone: String,
  address: String,
  lastDonationDate: Date,
  totalDonations: { type: Number, default: 0 },
  isEligible: { type: Boolean, default: true },
  medicalHistory: String,
  createdAt: { type: Date, default: Date.now }
});

const recipientSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  bloodType: { type: String, required: true },
  phone: String,
  hospital: String,
  urgencyLevel: { type: Number, min: 1, max: 10 },
  condition: String,
  requiredUnits: Number,
  hemoglobinLevel: Number,
  systolicBP: Number,
  diastolicBP: Number,
  heartRate: Number,
  age: Number,
  admissionDate: Date,
  predictedPriority: Number,
  riskScore: Number,
  survivalProbability: Number,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const bloodSchema = new mongoose.Schema({
  bloodType: { type: String, required: true },
  component: { type: String, required: true },
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  collectionDate: { type: Date, default: Date.now },
  expiryDate: Date,
  status: { type: String, default: 'available' },
  bagNumber: { type: String, unique: true },
  volume: Number,
  testResults: {
    hiv: Boolean,
    hepatitisB: Boolean,
    hepatitisC: Boolean,
    syphilis: Boolean
  }
});

const inventorySchema = new mongoose.Schema({
  bloodType: { type: String, required: true },
  component: { type: String, required: true },
  totalUnits: { type: Number, default: 0 },
  availableUnits: { type: Number, default: 0 },
  reservedUnits: { type: Number, default: 0 },
  minThreshold: { type: Number, default: 10 },
  lastUpdated: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipient' },
  bloodType: { type: String, required: true },
  component: String,
  unitsRequested: Number,
  urgency: String,
  status: { type: String, default: 'pending' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  bloodUnits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Blood' }],
  createdAt: { type: Date, default: Date.now },
  fulfilledAt: Date
});

const employeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fullName: { type: String, required: true },
  employeeId: { type: String, unique: true },
  department: String,
  position: String,
  phone: String,
  hireDate: Date,
  isActive: { type: Boolean, default: true }
});

// Models
const Role = mongoose.model('Role', roleSchema);
const User = mongoose.model('User', userSchema);
const Donor = mongoose.model('Donor', donorSchema);
const Recipient = mongoose.model('Recipient', recipientSchema);
const Blood = mongoose.model('Blood', bloodSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const Order = mongoose.model('Order', orderSchema);
const Employee = mongoose.model('Employee', employeeSchema);

// ========================================
// ENHANCED ML ALGORITHMS
// ========================================

// 1. Advanced Priority Prediction with Multiple Factors
function advancedPriorityPrediction(recipient) {
  let score = 0;
  let factors = [];
  
  // Urgency level (25% weight)
  const urgencyScore = (recipient.urgencyLevel || 5) * 2.5;
  score += urgencyScore;
  factors.push(`Urgency: ${urgencyScore.toFixed(1)}`);
  
  // Hemoglobin level (25% weight) - Critical factor
  if (recipient.hemoglobinLevel) {
    let hbScore = 0;
    if (recipient.hemoglobinLevel < 6) hbScore = 25;
    else if (recipient.hemoglobinLevel < 7) hbScore = 22;
    else if (recipient.hemoglobinLevel < 8) hbScore = 18;
    else if (recipient.hemoglobinLevel < 9) hbScore = 15;
    else if (recipient.hemoglobinLevel < 10) hbScore = 10;
    else if (recipient.hemoglobinLevel < 11) hbScore = 5;
    score += hbScore;
    factors.push(`Hemoglobin: ${hbScore.toFixed(1)}`);
  }
  
  // Blood Pressure Analysis (20% weight)
  let bpScore = 0;
  if (recipient.systolicBP && recipient.diastolicBP) {
    // Hypotension (critically low BP)
    if (recipient.systolicBP < 90 || recipient.diastolicBP < 60) bpScore = 20;
    else if (recipient.systolicBP < 100 || recipient.diastolicBP < 65) bpScore = 15;
    else if (recipient.systolicBP < 110) bpScore = 10;
    // Hypertension also concerning
    else if (recipient.systolicBP > 180 || recipient.diastolicBP > 120) bpScore = 15;
    score += bpScore;
    factors.push(`BP: ${bpScore.toFixed(1)}`);
  }
  
  // Heart Rate (15% weight)
  let hrScore = 0;
  if (recipient.heartRate) {
    if (recipient.heartRate > 120 || recipient.heartRate < 50) hrScore = 15;
    else if (recipient.heartRate > 110 || recipient.heartRate < 55) hrScore = 10;
    else if (recipient.heartRate > 100 || recipient.heartRate < 60) hrScore = 5;
    score += hrScore;
    factors.push(`HR: ${hrScore.toFixed(1)}`);
  }
  
  // Age Factor (10% weight) - Vulnerable populations
  let ageScore = 0;
  if (recipient.age) {
    if (recipient.age < 5) ageScore = 10; // Infants/toddlers
    else if (recipient.age < 12) ageScore = 8; // Children
    else if (recipient.age > 75) ageScore = 9; // Elderly
    else if (recipient.age > 65) ageScore = 7;
    else if (recipient.age < 18) ageScore = 5; // Teenagers
    score += ageScore;
    factors.push(`Age: ${ageScore.toFixed(1)}`);
  }
  
  // Time-based urgency (5% weight) - How long waiting
  if (recipient.createdAt) {
    const hoursWaiting = (Date.now() - new Date(recipient.createdAt)) / (1000 * 60 * 60);
    const timeScore = Math.min(5, hoursWaiting / 24 * 5);
    score += timeScore;
    factors.push(`Wait time: ${timeScore.toFixed(1)}`);
  }
  
  return {
    score: Math.min(100, Math.round(score)),
    factors
  };
}

// 2. Risk Stratification Model
function calculateRiskScore(recipient) {
  let risk = 0;
  
  // Critical hemoglobin
  if (recipient.hemoglobinLevel < 7) risk += 40;
  else if (recipient.hemoglobinLevel < 9) risk += 25;
  
  // Severe hypotension
  if (recipient.systolicBP < 90) risk += 30;
  
  // Tachycardia or bradycardia
  if (recipient.heartRate > 120 || recipient.heartRate < 50) risk += 20;
  
  // Age extremes
  if (recipient.age < 5 || recipient.age > 75) risk += 10;
  
  return Math.min(100, risk);
}

// 3. Survival Probability Prediction
function predictSurvivalProbability(recipient) {
  let baseProb = 95; // Start with 95% baseline
  
  // Reduce based on critical factors
  if (recipient.hemoglobinLevel < 6) baseProb -= 30;
  else if (recipient.hemoglobinLevel < 7) baseProb -= 20;
  else if (recipient.hemoglobinLevel < 8) baseProb -= 10;
  
  if (recipient.systolicBP < 80) baseProb -= 25;
  else if (recipient.systolicBP < 90) baseProb -= 15;
  
  if (recipient.heartRate > 130 || recipient.heartRate < 45) baseProb -= 20;
  else if (recipient.heartRate > 120 || recipient.heartRate < 50) baseProb -= 10;
  
  if (recipient.age > 80) baseProb -= 15;
  else if (recipient.age > 75) baseProb -= 10;
  else if (recipient.age < 5) baseProb -= 12;
  
  return Math.max(0, Math.min(100, baseProb));
}

// 4. Demand Forecasting Algorithm
function forecastDemand(historicalOrders, inventory) {
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const predictions = {};
  
  bloodTypes.forEach(type => {
    // Calculate average demand from recent orders
    const recentOrders = historicalOrders
      .filter(o => o.bloodType === type)
      .slice(-30); // Last 30 orders
    
    const avgDemand = recentOrders.length > 0 
      ? recentOrders.reduce((sum, o) => sum + (o.unitsRequested || 1), 0) / recentOrders.length 
      : 5;
    
    // Apply seasonal and trend adjustments
    const currentDay = new Date().getDay();
    const weekendMultiplier = (currentDay === 0 || currentDay === 6) ? 0.8 : 1.1;
    
    // Add random variation (±20%)
    const variation = 0.8 + Math.random() * 0.4;
    
    predictions[type] = Math.round(avgDemand * weekendMultiplier * variation * 7); // 7-day forecast
  });
  
  // Generate insight
  const highDemand = Object.entries(predictions)
    .filter(([_, demand]) => demand > 15)
    .map(([type]) => type);
  
  const insight = highDemand.length > 0
    ? `High demand predicted for ${highDemand.join(', ')}. Consider increasing stock levels.`
    : 'Demand levels appear normal. Monitor inventory closely.';
  
  return { predictions, insight };
}

// 5. Smart Donor Matching Algorithm
function matchDonorsToRecipient(recipient, donors) {
  const matches = [];
  
  // Blood type compatibility matrix
  const compatibility = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
  };
  
  donors.forEach(donor => {
    if (!donor.isEligible) return;
    
    // Check blood type compatibility
    const compatible = compatibility[donor.bloodType]?.includes(recipient.bloodType);
    if (!compatible) return;
    
    let matchScore = 0;
    const reasons = [];
    
    // Exact blood type match
    if (donor.bloodType === recipient.bloodType) {
      matchScore += 50;
      reasons.push('Exact blood type match');
    } else {
      matchScore += 30;
      reasons.push('Compatible blood type');
    }
    
    // Recent donation history
    if (donor.lastDonationDate) {
      const daysSinceLastDonation = (Date.now() - new Date(donor.lastDonationDate)) / (1000 * 60 * 60 * 24);
      if (daysSinceLastDonation > 56) { // 8 weeks minimum
        matchScore += 20;
        reasons.push('Eligible donation window');
      }
    } else {
      matchScore += 15;
      reasons.push('First-time donor');
    }
    
    // Donation history
    if (donor.totalDonations > 5) {
      matchScore += 15;
      reasons.push('Experienced donor');
    } else if (donor.totalDonations > 0) {
      matchScore += 10;
      reasons.push('Previous donor');
    }
    
    // Geographic proximity (simplified - would use actual location data)
    matchScore += 15;
    reasons.push('Available for contact');
    
    matches.push({
      donor,
      matchScore: Math.min(100, matchScore),
      reasons
    });
  });
  
  // Sort by match score
  return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
}

// 6. Inventory Optimization
function generateInventoryRecommendations(inventory, orders, recipients) {
  const recommendations = [];
  
  // Check low stock
  inventory.forEach(inv => {
    if (inv.availableUnits < inv.minThreshold) {
      recommendations.push({
        priority: 'high',
        title: `Critical: Low ${inv.bloodType} ${inv.component}`,
        description: `Only ${inv.availableUnits} units available (min: ${inv.minThreshold})`,
        action: `Initiate emergency procurement for ${inv.bloodType} ${inv.component}`
      });
    } else if (inv.availableUnits < inv.minThreshold * 1.5) {
      recommendations.push({
        priority: 'medium',
        title: `Warning: ${inv.bloodType} ${inv.component} below optimal`,
        description: `Current: ${inv.availableUnits} units, recommend: ${inv.minThreshold * 2}`,
        action: `Schedule donor drive for ${inv.bloodType}`
      });
    }
  });
  
  // Check pending orders
  const pendingOrders = orders.filter(o => o.status === 'pending');
  if (pendingOrders.length > 5) {
    recommendations.push({
      priority: 'high',
      title: `${pendingOrders.length} Pending Orders`,
      description: 'Multiple orders awaiting fulfillment',
      action: 'Review and prioritize based on recipient urgency'
    });
  }
  
  // Check critical recipients
  const criticalRecipients = recipients.filter(r => r.predictedPriority > 80);
  if (criticalRecipients.length > 0) {
    recommendations.push({
      priority: 'high',
      title: `${criticalRecipients.length} Critical Recipients`,
      description: 'High-priority cases require immediate attention',
      action: 'Ensure blood availability for critical cases'
    });
  }
  
  return recommendations;
}

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    const decoded = jwt.verify(token, 'your-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ========================================
// ROUTES
// ========================================

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, roleName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let role = await Role.findOne({ name: roleName });
    if (!role) {
      role = await Role.create({ name: roleName, permissions: [] });
    }
    
    const user = await User.create({
      email,
      password: hashedPassword,
      role: role._id
    });
    
    res.status(201).json({ message: 'User created', userId: user._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate('role');
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Donor Routes
app.get('/api/donors', authMiddleware, async (req, res) => {
  try {
    const donors = await Donor.find().populate('userId');
    res.json(donors);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/donors', authMiddleware, async (req, res) => {
  try {
    const donor = await Donor.create(req.body);
    res.status(201).json(donor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Enhanced Recipient Routes with Advanced ML
app.get('/api/recipients', authMiddleware, async (req, res) => {
  try {
    const recipients = await Recipient.find().sort({ predictedPriority: -1 });
    res.json(recipients);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/recipients', authMiddleware, async (req, res) => {
  try {
    const recipientData = req.body;
    
    // Apply advanced ML models
    const priorityResult = advancedPriorityPrediction(recipientData);
    recipientData.predictedPriority = priorityResult.score;
    recipientData.riskScore = calculateRiskScore(recipientData);
    recipientData.survivalProbability = predictSurvivalProbability(recipientData);
    
    const recipient = await Recipient.create(recipientData);
    
    // Return with ML insights
    res.status(201).json({
      ...recipient.toObject(),
      mlInsights: {
        priorityFactors: priorityResult.factors,
        riskLevel: recipientData.riskScore > 60 ? 'High' : recipientData.riskScore > 30 ? 'Medium' : 'Low'
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ML Insights Endpoint
app.get('/api/ml/insights', authMiddleware, async (req, res) => {
  try {
    const recipients = await Recipient.find();
    const inventory = await Inventory.find();
    const orders = await Order.find();
    
    const criticalRecipients = recipients.filter(r => r.predictedPriority > 80).length;
    const stockAlerts = inventory.filter(i => i.availableUnits < i.minThreshold).length;
    
    // Calculate optimization score
    const totalCapacity = inventory.reduce((sum, i) => sum + i.totalUnits, 0);
    const utilization = inventory.reduce((sum, i) => sum + (i.totalUnits - i.availableUnits), 0);
    const optimizationScore = totalCapacity > 0 ? Math.round((utilization / totalCapacity) * 100) : 0;
    
    const recommendations = generateInventoryRecommendations(inventory, orders, recipients);
    
    res.json({
      criticalRecipients,
      stockAlerts,
      optimizationScore,
      recommendations
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Demand Forecasting Endpoint
app.get('/api/ml/forecast', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().limit(100).sort({ createdAt: -1 });
    const inventory = await Inventory.find();
    
    const forecast = forecastDemand(orders, inventory);
    res.json(forecast);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Smart Donor Matching Endpoint
app.get('/api/ml/match-donors/:recipientId', authMiddleware, async (req, res) => {
  try {
    const recipient = await Recipient.findById(req.params.recipientId);
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
    
    const donors = await Donor.find();
    const matches = matchDonorsToRecipient(recipient, donors);
    
    res.json(matches);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Blood & Inventory Routes
app.get('/api/inventory', authMiddleware, async (req, res) => {
  try {
    const inventory = await Inventory.find();
    res.json(inventory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/blood', authMiddleware, async (req, res) => {
  try {
    const bloodData = req.body;
    
    // Auto-generate bag number if not provided
    if (!bloodData.bagNumber) {
      const count = await Blood.countDocuments();
      bloodData.bagNumber = `BG${Date.now()}-${count + 1}`;
    }
    
    // Set expiry date based on component type
    const expiryDays = {
      'Whole Blood': 35,
      'Plasma': 365,
      'Platelets': 5,
      'RBC': 42
    };
    bloodData.expiryDate = new Date(Date.now() + (expiryDays[bloodData.component] || 35) * 24 * 60 * 60 * 1000);
    
    const blood = await Blood.create(bloodData);
    
    // Update inventory
    let inv = await Inventory.findOne({ 
      bloodType: blood.bloodType, 
      component: blood.component 
    });
    
    if (inv) {
      inv.totalUnits += 1;
      inv.availableUnits += 1;
      inv.lastUpdated = new Date();
      await inv.save();
    } else {
      await Inventory.create({
        bloodType: blood.bloodType,
        component: blood.component,
        totalUnits: 1,
        availableUnits: 1
      });
    }
    
    res.status(201).json(blood);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Order Routes
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('recipientId')
      .populate('requestedBy')
      .populate('bloodUnits');
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orderData = req.body;
    
    // Check inventory availability
    const inv = await Inventory.findOne({
      bloodType: orderData.bloodType,
      component: orderData.component
    });
    
    if (!inv || inv.availableUnits < orderData.unitsRequested) {
      return res.status(400).json({ 
        error: `Insufficient inventory. Available: ${inv?.availableUnits || 0} units, Requested: ${orderData.unitsRequested} units` 
      });
    }
    
    const order = await Order.create(orderData);
    
    // Reserve the units in inventory
    inv.availableUnits -= orderData.unitsRequested;
    inv.reservedUnits += orderData.unitsRequested;
    inv.lastUpdated = new Date();
    await inv.save();
    
    // Populate the order with recipient details
    const populatedOrder = await Order.findById(order._id).populate('recipientId');
    
    res.status(201).json(populatedOrder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Fulfill an order
app.put('/api/orders/:id/fulfill', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    if (order.status === 'fulfilled') {
      return res.status(400).json({ error: 'Order already fulfilled' });
    }
    
    order.status = 'fulfilled';
    order.fulfilledAt = new Date();
    await order.save();
    
    // Update inventory - remove from reserved
    const inv = await Inventory.findOne({
      bloodType: order.bloodType,
      component: order.component
    });
    
    if (inv) {
      inv.reservedUnits -= order.unitsRequested;
      inv.totalUnits -= order.unitsRequested;
      inv.lastUpdated = new Date();
      await inv.save();
    }
    
    const populatedOrder = await Order.findById(order._id).populate('recipientId');
    res.json(populatedOrder);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Auto-fulfill orders based on priority
app.post('/api/orders/auto-fulfill', authMiddleware, async (req, res) => {
  try {
    // Get all pending orders with populated recipients
    const pendingOrders = await Order.find({ status: 'pending' }).populate('recipientId');
    
    if (pendingOrders.length === 0) {
      return res.json({ message: 'No pending orders', fulfilled: 0, skipped: 0 });
    }
    
    // Sort by recipient priority (highest first)
    const sortedOrders = pendingOrders.sort((a, b) => {
      const priorityA = a.recipientId?.predictedPriority || 0;
      const priorityB = b.recipientId?.predictedPriority || 0;
      return priorityB - priorityA;
    });
    
    let fulfilled = 0;
    let skipped = 0;
    
    // Process each order
    for (const order of sortedOrders) {
      // Check inventory availability
      const inv = await Inventory.findOne({
        bloodType: order.bloodType,
        component: order.component
      });
      
      if (!inv || inv.reservedUnits < order.unitsRequested) {
        skipped++;
        continue;
      }
      
      // Fulfill the order
      order.status = 'fulfilled';
      order.fulfilledAt = new Date();
      await order.save();
      
      // Update inventory
      inv.reservedUnits -= order.unitsRequested;
      inv.totalUnits -= order.unitsRequested;
      inv.lastUpdated = new Date();
      await inv.save();
      
      fulfilled++;
    }
    
    res.json({
      message: 'Auto-fulfill completed',
      fulfilled,
      skipped,
      total: pendingOrders.length
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Employee Routes
app.get('/api/employees', authMiddleware, async (req, res) => {
  try {
    const employees = await Employee.find().populate('userId');
    res.json(employees);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/employees', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Enhanced ML Server running on port ${PORT}`));