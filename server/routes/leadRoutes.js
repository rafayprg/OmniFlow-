import express from 'express';
import { r2Db } from '../services/r2DatabaseService.js';

const router = express.Router();

// GET all leads strictly from Cloudflare R2
router.get('/', async (req, res) => {
  try {
    const leads = await r2Db.getLeads();
    res.json({
      success: true,
      count: leads.length,
      data: leads,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create new lead directly in Cloudflare R2
router.post('/', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Lead / Company name is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const newLead = await r2Db.addLead(req.body);
    res.status(201).json({
      success: true,
      message: 'Lead created successfully in Cloudflare R2',
      data: newLead,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update lead status strictly in Cloudflare R2
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['Pending', 'Connected', 'Not Connected', 'Interested', 'Not Interested', 'Not on WhatsApp'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status: ${status}` });
    }

    const updated = await r2Db.updateLeadStatus(id, status, notes);

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Lead not found in Cloudflare R2' });
    }

    res.json({
      success: true,
      message: 'Status updated in Cloudflare R2',
      data: updated,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE single lead strictly from Cloudflare R2
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await r2Db.deleteLead(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({
      success: true,
      message: `Lead ${id} deleted from Cloudflare R2`,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE all leads strictly from Cloudflare R2
router.delete('/', async (req, res) => {
  try {
    await r2Db.clearAllLeads();
    res.json({
      success: true,
      message: 'All leads deleted from Cloudflare R2',
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update single lead category
router.put('/:id/category', async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;
    const updated = await r2Db.updateLeadCategory(id, category);

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Lead not found in Cloudflare R2' });
    }

    res.json({
      success: true,
      message: 'Category updated in Cloudflare R2',
      data: updated,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
