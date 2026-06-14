const mongoose = require('mongoose');

const PageSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  html: { type: String },
  links: [String],
  depth: { type: Number, default: 0 },
  status: { type: String, enum: ['ok', 'error'], default: 'ok' },
  error: { type: String, default: '' },
  crawledAt: { type: Date, default: Date.now }
});

PageSchema.index({ title: 'text', content: 'text', url: 'text' });

module.exports = mongoose.models.Page || mongoose.model('Page', PageSchema);
