import express from 'express';
import { r2Db } from '../services/r2DatabaseService.js';

const router = express.Router();

// GET all customers strictly from Cloudflare R2
router.get('/', async (req, res) => {
  try {
    const customers = await r2Db.getCustomers();
    res.json({
      success: true,
      count: customers.length,
      data: customers,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST single customer strictly to Cloudflare R2
router.post('/', async (req, res) => {
  try {
    const newCustomer = await r2Db.addCustomer(req.body);
    res.status(201).json({ success: true, data: newCustomer, source: 'cloudflare-r2' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST bulk upload (from Excel) strictly to Cloudflare R2
router.post('/bulk', async (req, res) => {
  try {
    const { records, fileBase64, fileName } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'Records array is required' });
    }

    // If raw file was sent, back it up to R2 uploads folder
    let uploadedFileMeta = null;
    if (fileBase64 && fileName) {
      try {
        const buffer = Buffer.from(fileBase64, 'base64');
        uploadedFileMeta = await r2Db.uploadFile(fileName, buffer);
      } catch (uploadErr) {
        console.warn('Could not store raw excel file in R2 uploads:', uploadErr.message);
      }
    }

    const inserted = await r2Db.bulkAddCustomers(records);
    res.status(201).json({
      success: true,
      count: inserted.length,
      data: inserted,
      fileUpload: uploadedFileMeta,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST assign customers to agent -> updates Customers and creates Leads in Cloudflare R2
router.post('/assign', async (req, res) => {
  try {
    const { customerIds, agentName } = req.body;
    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({ success: false, error: 'customerIds array is required' });
    }
    if (!agentName) {
      return res.status(400).json({ success: false, error: 'agentName is required' });
    }

    const result = await r2Db.assignCustomersToAgent(customerIds, agentName);

    res.json({
      success: true,
      message: `${customerIds.length} customer(s) assigned to ${agentName} in Cloudflare R2`,
      count: customerIds.length,
      result,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST unassign customers back to raw pool in Cloudflare R2
router.post('/unassign', async (req, res) => {
  try {
    const { customerIds } = req.body;
    if (!customerIds || !Array.isArray(customerIds)) {
      return res.status(400).json({ success: false, error: 'customerIds array required' });
    }

    const idSet = new Set(customerIds);
    for (const id of customerIds) {
      await r2Db.updateCustomer(id, {
        isAssigned: false,
        assignedTo: null,
        assignedAt: null
      });
    }

    // Delete linked leads
    const leads = await r2Db.getLeads();
    for (const lead of leads) {
      if (idSet.has(lead.customerId)) {
        await r2Db.deleteLead(lead.id);
      }
    }

    res.json({
      success: true,
      message: `${customerIds.length} customer(s) returned to pool in Cloudflare R2`,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE bulk customers (or delete all) strictly in Cloudflare R2
router.delete('/bulk', async (req, res) => {
  try {
    const { customerIds, all } = req.body;

    if (all) {
      await r2Db.clearAllCustomers();
      await r2Db.clearAllLeads();
      return res.json({
        success: true,
        message: 'All customers and linked leads deleted from Cloudflare R2',
        source: 'cloudflare-r2'
      });
    }

    if (Array.isArray(customerIds) && customerIds.length > 0) {
      const idSet = new Set(customerIds);
      for (const id of customerIds) {
        await r2Db.deleteCustomer(id);
      }
      const leads = await r2Db.getLeads();
      for (const lead of leads) {
        if (idSet.has(lead.customerId)) {
          await r2Db.deleteLead(lead.id);
        }
      }
      return res.json({
        success: true,
        message: 'Selected customers deleted from Cloudflare R2',
        source: 'cloudflare-r2'
      });
    }

    res.json({ success: true, source: 'cloudflare-r2' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE all customers and leads
router.delete('/all', async (req, res) => {
  try {
    await r2Db.clearAllCustomers();
    await r2Db.clearAllLeads();
    res.json({
      success: true,
      message: 'All customers and linked leads cleared from Cloudflare R2',
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE single customer strictly from Cloudflare R2
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await r2Db.deleteCustomer(id);
    const leads = await r2Db.getLeads();
    for (const lead of leads) {
      if (lead.customerId === id) {
        await r2Db.deleteLead(lead.id);
      }
    }
    res.json({
      success: true,
      message: `Customer ${id} and linked leads deleted from Cloudflare R2`,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update single customer category
router.put('/:id/category', async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;
    const newCategory = (category || 'General Business').trim();

    const updated = await r2Db.updateCustomer(id, { category: newCategory });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Customer not found in Cloudflare R2' });
    }

    // Also update any linked lead
    const leads = await r2Db.getLeads();
    for (const lead of leads) {
      if (lead.customerId === id) {
        await r2Db.updateLeadCategory(lead.id, newCategory);
      }
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
