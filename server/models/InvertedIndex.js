const mongoose = require('mongoose');

const InvertedIndexSchema = new mongoose.Schema({
  term: { type: String, required: true, unique: true },
  urls: [{ type: String }],
  count: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.InvertedIndex || mongoose.model('InvertedIndex', InvertedIndexSchema);
