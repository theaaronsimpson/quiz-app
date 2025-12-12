const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  quizId: {
    type: String,
    required: true
  },
  quizTitle: {
    type: String,
    required: true
  },
  score: {
    type: Number,       
    required: true
  },
  totalPoints: {
    type: Number,       
    required: true
  },
  percentage: {
    type: Number,       
    required: true
  },
  timeTaken: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Attempt', attemptSchema);