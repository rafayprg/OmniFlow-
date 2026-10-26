import express from 'express';
import { r2Db } from '../services/r2DatabaseService.js';

const router = express.Router();

// GET all agents strictly from Cloudflare R2
router.get('/', async (req, res) => {
  try {
    const agents = await r2Db.getAgents();
    res.json({
      success: true,
      count: agents.length,
      data: agents,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create new agent strictly to Cloudflare R2
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const newAgent = await r2Db.addAgent(req.body);
    res.status(201).json({ success: true, data: newAgent, source: 'cloudflare-r2' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update agent PIN strictly in Cloudflare R2
router.put('/:id/pin', async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    if (!pin || !String(pin).trim()) {
      return res.status(400).json({ success: false, error: 'PIN is required' });
    }

    const updated = await r2Db.updateAgentPin(id, pin);

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Agent not found in Cloudflare R2' });
    }

    res.json({
      success: true,
      message: `PIN updated to ${pin} in Cloudflare R2`,
      data: updated,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update agent profile strictly in Cloudflare R2
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agents = await r2Db.getAgents();
    const existingAgent = agents.find(a => Number(a.id) === Number(id));

    if (!existingAgent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const oldName = existingAgent.name;
    const updated = await r2Db.updateAgent(id, req.body);
    const newName = updated.name;

    // If agent name changed, update linked Customers and Leads
    if (oldName !== newName) {
      const customers = await r2Db.getCustomers();
      for (const cust of customers) {
        if (cust.assignedTo === oldName) {
          await r2Db.updateCustomer(cust.id, { assignedTo: newName });
        }
      }
      const leads = await r2Db.getLeads();
      for (const lead of leads) {
        if (lead.assignedAgent === oldName) {
          lead.assignedAgent = newName;
          await r2Db.updateLeadStatus(lead.id, lead.status, lead.notes);
        }
      }
    }

    res.json({ success: true, data: updated, source: 'cloudflare-r2' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE agent strictly in Cloudflare R2 (returns assigned customers to pool)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agents = await r2Db.getAgents();
    const targetAgent = agents.find(a => Number(a.id) === Number(id));

    if (!targetAgent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const agentName = targetAgent.name;

    // Delete agent from R2
    await r2Db.deleteAgent(id);

    // Unassign customers and remove pipeline leads
    const customers = await r2Db.getCustomers();
    for (const cust of customers) {
      if (cust.assignedTo === agentName) {
        await r2Db.updateCustomer(cust.id, {
          isAssigned: false,
          assignedTo: null,
          assignedAt: null
        });
      }
    }

    const leads = await r2Db.getLeads();
    for (const lead of leads) {
      if (lead.assignedAgent === agentName) {
        await r2Db.deleteLead(lead.id);
      }
    }

    res.json({
      success: true,
      message: `Agent ${agentName} removed from Cloudflare R2. Assigned leads returned to unassigned pool.`,
      source: 'cloudflare-r2'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
