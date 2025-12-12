require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Attempt = require('./models/Attempt');

const app = express();
const JWT_SECRET = 'supersecret123';
const PORT = 5001;

app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
app.use(express.json());

// Log every request
app.use((req, res, next) => {
  console.log('→', req.method, req.url);
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('DB ERROR:', err));

// ==================== USER ROUTES ====================

// REGISTER
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email taken' });

    const user = await User.create({
      username: username || email.split('@')[0],
      email: email.toLowerCase(),
      password
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.status(201).json({
      user: { id: user._id.toString(), username: user.username, email: user.email },
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({
      user: { id: user._id.toString(), username: user.username, email: user.email },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET CURRENT USER
app.get('/api/users/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user._id.toString(), username: user.username, email: user.email });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// UPDATE PROFILE
app.put('/api/users/profile', async (req, res) => {
  console.log('PUT /api/users/profile HIT →', req.body);

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const updates = req.body;

    if (updates.email) {
      const existing = await User.findOne({
        email: updates.email.toLowerCase(),
        _id: { $ne: decoded.id }
      });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
    }

    const updated = await User.findByIdAndUpdate(
      decoded.id,
      {
        username: updates.username?.trim(),
        email: updates.email?.toLowerCase().trim()
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) return res.status(404).json({ message: 'User not found' });

    console.log('PROFILE UPDATED →', updated.username, updated.email);

    res.json({
      id: updated._id.toString(),
      username: updated.username,
      email: updated.email
    });
  } catch (err) {
    console.error('Update failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE ACCOUNT
app.delete('/api/users/profile', async (req, res) => {
  console.log('DELETE ACCOUNT REQUEST');

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('DELETING USER ID:', decoded.id);

    await User.findByIdAndDelete(decoded.id);
    await Attempt.deleteMany({ userId: decoded.id });

    console.log('USER + ALL ATTEMPTS DELETED FOREVER');

    res.json({ message: 'Account deleted permanently' });
  } catch (err) {
    console.error('Delete account failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== ATTEMPT ROUTES ====================

app.get('/api/attempts', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const attempts = await Attempt.find({ userId }).sort({ date: -1 });
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/attempts', async (req, res) => {
  try {
    const attempt = new Attempt(req.body);
    const saved = await attempt.save();
    console.log('Attempt saved:', saved._id);
    res.status(201).json(saved);
  } catch (err) {
    console.error('Save failed:', err);
    res.status(500).json({ message: 'Save failed' });
  }
});

app.delete('/api/attempts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('DELETE ATTEMPT:', id);

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const attempt = await Attempt.findById(id);

    if (!attempt) return res.status(404).json({ message: 'Not found' });
    if (attempt.userId !== decoded.id.toString()) return res.status(403).json({ message: 'Unauthorized' });

    await Attempt.findByIdAndDelete(id);
    console.log('ATTEMPT DELETED:', id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete attempt failed:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`\nBACKEND RUNNING ON http://localhost:${PORT}`);
  console.log(`ALL FEATURES WORKING:\n   • Register/Login\n   • Edit Profile\n   • Delete Account\n   • Save/Delete Attempts\n`);
});