import express from 'express';
import { r2Db } from '../services/r2DatabaseService.js';

const router = express.Router();

// GET aggregated stats strictly from Cloudflare R2 collections
router.get('/', async (req, res) => {
  try {
    const customers = await r2Db.getCustomers();
    const leads = await r2Db.getLeads();
    const agents = await r2Db.getAgents();

    const totalCustomersPool = customers.length;
    const totalLeadsAssigned = leads.length;
    const assignedCustomersCount = customers.filter(c => c.isAssigned).length;
    const unassignedCount = totalCustomersPool - assignedCustomersCount;

    const pendingCount = leads.filter(l => l.status === 'Pending').length;
    const connectedCount = leads.filter(l => l.status === 'Connected').length;
    const notConnectedCount = leads.filter(l => l.status === 'Not Connected').length;
    const interestedCount = leads.filter(l => l.status === 'Interested').length;
    const notInterestedCount = leads.filter(l => l.status === 'Not Interested').length;
    const notOnWhatsAppCount = leads.filter(l => l.status === 'Not on WhatsApp').length;

    const interestRate = totalLeadsAssigned > 0
      ? Math.round((interestedCount / totalLeadsAssigned) * 100)
      : 0;

    const contactRate = totalLeadsAssigned > 0
      ? Math.round(((totalLeadsAssigned - pendingCount) / totalLeadsAssigned) * 100)
      : 0;

    // Real Agent pipeline breakdown from Cloudflare R2
    const agentBreakdown = agents.map(agent => {
      const agentLeads = leads.filter(l => l.assignedAgent === agent.name);
      const total = agentLeads.length;
      const pending = agentLeads.filter(l => l.status === 'Pending').length;
      const connected = agentLeads.filter(l => l.status === 'Connected').length;
      const notConnected = agentLeads.filter(l => l.status === 'Not Connected').length;
      const interested = agentLeads.filter(l => l.status === 'Interested').length;
      const notInterested = agentLeads.filter(l => l.status === 'Not Interested').length;
      const notOnWhatsApp = agentLeads.filter(l => l.status === 'Not on WhatsApp').length;
      const conversionRate = total > 0 ? Math.round((interested / total) * 100) : 0;

      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        email: agent.email,
        phone: agent.phone,
        avatar: agent.avatar,
        totalLeads: total,
        pending,
        connected,
        notConnected,
        interested,
        notInterested,
        notOnWhatsApp,
        conversionRate
      };
    });

    res.json({
      success: true,
      source: 'cloudflare-r2',
      data: {
        totalCustomersPool,
        totalLeadsAssigned,
        unassignedCount,
        assignedCustomersCount,
        pendingCount,
        connectedCount,
        notConnectedCount,
        interestedCount,
        notInterestedCount,
        notOnWhatsAppCount,
        interestRate,
        contactRate,
        agentBreakdown
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
