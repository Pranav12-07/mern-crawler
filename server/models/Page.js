const mongoose = require('mongoose');

const PageSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  html: { type: String },
  links: [String],
  crawledAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Page || mongoose.model('Page', PageSchema);
