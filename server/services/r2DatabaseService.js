import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, R2_BUCKET, R2_PREFIX } from '../config/r2.js';

// Default Admin Profile
const DEFAULT_ADMIN = {
  username: 'sales@techdeva.net',
  email: 'sales@techdeva.net',
  password: 'Techdeva@12',
  name: 'Sales Administrator',
  role: 'System Administrator',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  updatedAt: new Date().toISOString()
};

class R2DatabaseService {
  constructor() {
    // In-memory fallback cache only for offline / error recovery
    this.cache = {
      customers: [],
      leads: [],
      agents: [],
      admin: DEFAULT_ADMIN
    };
  }

  async init() {
    // Quick probe to ensure bucket is reachable
    const client = getR2Client();
    return Boolean(client);
  }

  // Always fetch fresh real-time data from Cloudflare R2
  async loadCollection(name, defaultData = []) {
    const client = getR2Client();
    const r2Key = `${R2_PREFIX}${name}.json`;

    if (!client) {
      return this.cache[name] || defaultData;
    }

    try {
      const cmd = new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key
      });
      const res = await client.send(cmd);
      const str = await res.Body.transformToString();
      const parsed = JSON.parse(str);
      this.cache[name] = parsed;
      return parsed;
    } catch (err) {
      // If file doesn't exist yet in R2, create it with defaultData
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        console.log(`ℹ️ [R2] Initializing fresh collection: ${r2Key}`);
        await this.saveToR2(name, defaultData);
        this.cache[name] = defaultData;
        return defaultData;
      }
      console.warn(`[R2] Warning fetching ${r2Key}:`, err.message);
      // Return cached copy if available, NEVER wipe out with empty data on temporary network error
      return this.cache[name] !== undefined ? this.cache[name] : defaultData;
    }
  }

  // Save collection directly and reliably to Cloudflare R2
  async saveToR2(name, data) {
    const client = getR2Client();
    const r2Key = `${R2_PREFIX}${name}.json`;
    const jsonStr = JSON.stringify(data, null, 2);

    this.cache[name] = data;

    if (!client) return data;

    try {
      await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: jsonStr,
        ContentType: 'application/json'
      }));
      return data;
    } catch (err) {
      console.error(`❌ Failed to sync ${r2Key} to Cloudflare R2:`, err.message);
      throw err;
    }
  }

  // --- RAW FILE UPLOAD (EXCEL SPREADSHEETS / ATTACHMENTS TO R2) ---
  async uploadFile(fileName, fileBuffer, contentType = 'application/octet-stream') {
    const client = getR2Client();
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Key = `${R2_PREFIX}uploads/${timestamp}_${safeName}`;

    if (client) {
      await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: fileBuffer,
        ContentType: contentType
      }));
    }

    return {
      r2Key,
      fileName,
      bucket: R2_BUCKET,
      uploadedAt: new Date().toISOString()
    };
  }

  // --- CUSTOMERS CRUD ---
  async getCustomers() {
    return await this.loadCollection('customers', []);
  }

  async addCustomer(customerData) {
    const customers = await this.getCustomers();
    const today = new Date().toISOString().split('T')[0];
    const count = customers.length;
    const id = customerData.id || `CUST-${1001 + count}`;

    const newCustomer = {
      id,
      name: customerData.name ? customerData.name.trim() : 'Unnamed Account',
      phone: customerData.phone ? customerData.phone.trim() : '0300-0000000',
      email: customerData.email ? customerData.email.trim() : '',
      source: customerData.source || 'Direct Entry',
      category: customerData.category ? customerData.category.trim() : 'General Business',
      city: customerData.city || 'Karachi',
      importedDate: customerData.importedDate || today,
      isAssigned: Boolean(customerData.isAssigned),
      assignedTo: customerData.assignedTo || null,
      assignedAt: customerData.assignedAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    customers.unshift(newCustomer);
    await this.saveToR2('customers', customers);
    return newCustomer;
  }

  async bulkAddCustomers(records) {
    const customers = await this.getCustomers();
    const today = new Date().toISOString().split('T')[0];
    let nextNum = 1001 + customers.length;

    const newItems = records.map(rec => ({
      id: rec.id || `CUST-${nextNum++}`,
      name: rec.name ? String(rec.name).trim() : 'Unnamed Corporate Account',
      phone: rec.phone ? String(rec.phone).trim() : '0300-0000000',
      email: rec.email ? String(rec.email).trim() : '',
      source: rec.source || 'Excel File Upload',
      category: rec.category ? String(rec.category).trim() : 'General Business',
      city: rec.city ? String(rec.city).trim() : 'Karachi',
      importedDate: rec.importedDate || today,
      isAssigned: Boolean(rec.isAssigned),
      assignedTo: rec.assignedTo || null,
      assignedAt: rec.assignedAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    customers.unshift(...newItems);
    await this.saveToR2('customers', customers);
    return newItems;
  }

  async updateCustomer(id, updateFields) {
    const customers = await this.getCustomers();
    const idx = customers.findIndex(c => c.id === id);
    if (idx === -1) return null;

    customers[idx] = {
      ...customers[idx],
      ...updateFields,
      updatedAt: new Date().toISOString()
    };

    await this.saveToR2('customers', customers);
    return customers[idx];
  }

  async assignCustomersToAgent(customerIds, agentName) {
    const [customers, leads] = await Promise.all([
      this.getCustomers(),
      this.getLeads()
    ]);

    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const assignedTimestamp = `${formattedDate} ${formattedTime}`;

    const updatedCustomers = [];
    const leadsToCreate = [];
    let leadNum = 1001 + leads.length;

    for (const cust of customers) {
      if (customerIds.includes(cust.id)) {
        cust.isAssigned = true;
        cust.assignedTo = agentName;
        cust.assignedAt = assignedTimestamp;
        cust.updatedAt = now.toISOString();
        updatedCustomers.push(cust);

        leadsToCreate.push({
          id: `LEAD-${leadNum++}`,
          customerId: cust.id,
          name: cust.name,
          phone: cust.phone,
          email: cust.email,
          source: cust.source || 'Customer Assignment',
          category: cust.category || 'General Business',
          assignedAgent: agentName,
          status: 'Pending',
          notes: `Assigned on ${assignedTimestamp}`,
          assignedDate: formattedDate,
          lastContactDate: null,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      }
    }

    leads.unshift(...leadsToCreate);

    await Promise.all([
      this.saveToR2('customers', customers),
      this.saveToR2('leads', leads)
    ]);

    return {
      updatedCount: updatedCustomers.length,
      leadsCreated: leadsToCreate.length
    };
  }

  async deleteCustomer(id) {
    const customers = await this.getCustomers();
    const filtered = customers.filter(c => c.id !== id);
    if (filtered.length !== customers.length) {
      await this.saveToR2('customers', filtered);
      return true;
    }
    return false;
  }

  async clearAllCustomers() {
    await this.saveToR2('customers', []);
    return true;
  }

  // --- LEADS CRUD ---
  async getLeads() {
    return await this.loadCollection('leads', []);
  }

  async addLead(leadData) {
    const leads = await this.getLeads();
    const today = new Date().toISOString().split('T')[0];
    const nextNum = 1001 + leads.length;

    const name = leadData.name ? String(leadData.name).trim() : 'Unnamed Lead';
    const industry = leadData.industry ? String(leadData.industry).trim() : (leadData.category ? String(leadData.category).trim() : 'General Business');
    const category = leadData.category ? String(leadData.category).trim() : industry;

    const newLead = {
      id: leadData.id || `LEAD-${nextNum}`,
      customerId: leadData.customerId || `DIRECT-${Date.now()}`,
      
      // 1. Business Name
      name,
      contactPerson: leadData.contactPerson ? String(leadData.contactPerson).trim() : '',

      // 2. Contact
      phone: leadData.phone ? String(leadData.phone).trim() : '0300-0000000',
      email: leadData.email ? String(leadData.email).trim() : '',

      // 3. Address
      address: leadData.address ? String(leadData.address).trim() : '',
      city: leadData.city ? String(leadData.city).trim() : 'Karachi',
      state: leadData.state ? String(leadData.state).trim() : '',
      postalCode: leadData.postalCode ? String(leadData.postalCode).trim() : '',
      country: leadData.country ? String(leadData.country).trim() : '',

      // 4. Industry
      industry,
      category,

      // 5. Socials & 6. Website
      website: leadData.website ? String(leadData.website).trim() : '',
      instagram: leadData.instagram ? String(leadData.instagram).trim() : '',
      facebook: leadData.facebook ? String(leadData.facebook).trim() : '',
      linkedin: leadData.linkedin ? String(leadData.linkedin).trim() : '',
      tiktok: leadData.tiktok ? String(leadData.tiktok).trim() : '',
      youtube: leadData.youtube ? String(leadData.youtube).trim() : '',
      twitter: leadData.twitter ? String(leadData.twitter).trim() : '',
      socials: leadData.socials || {},

      // 7. Reviews
      rating: leadData.rating !== undefined && leadData.rating !== null && leadData.rating !== '' ? leadData.rating : null,
      reviewCount: leadData.reviewCount !== undefined && leadData.reviewCount !== null && leadData.reviewCount !== '' ? leadData.reviewCount : null,
      reviews: leadData.reviews ? String(leadData.reviews).trim() : '',

      // All remaining raw sheet details
      rawDetails: leadData.rawDetails || {},

      source: leadData.source || 'Manual Team Entry',
      assignedAgent: leadData.assignedAgent || 'Unassigned',
      status: leadData.status || 'Pending',
      notes: leadData.notes ? String(leadData.notes).trim() : 'Directly entered by team member.',
      assignedDate: leadData.assignedDate || today,
      lastContactDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    leads.unshift(newLead);
    await this.saveToR2('leads', leads);
    return newLead;
  }

  async bulkAddLeads(records) {
    const leads = await this.getLeads();
    const today = new Date().toISOString().split('T')[0];
    let nextNum = 1001 + leads.length;

    const newItems = records.map(rec => {
      const name = rec.name ? String(rec.name).trim() : 'Unnamed Business';
      const industry = rec.industry ? String(rec.industry).trim() : (rec.category ? String(rec.category).trim() : 'General Business');
      const category = rec.category ? String(rec.category).trim() : industry;

      return {
        id: rec.id || `LEAD-${nextNum++}`,
        customerId: rec.customerId || `RAW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        
        // 1. Business Name
        name,
        contactPerson: rec.contactPerson ? String(rec.contactPerson).trim() : '',

        // 2. Contact
        phone: rec.phone ? String(rec.phone).trim() : '0300-0000000',
        email: rec.email ? String(rec.email).trim() : '',

        // 3. Address
        address: rec.address ? String(rec.address).trim() : '',
        city: rec.city ? String(rec.city).trim() : 'Karachi',
        state: rec.state ? String(rec.state).trim() : '',
        postalCode: rec.postalCode ? String(rec.postalCode).trim() : '',
        country: rec.country ? String(rec.country).trim() : '',

        // 4. Industry
        industry,
        category,

        // 5. Socials & 6. Website
        website: rec.website ? String(rec.website).trim() : '',
        instagram: rec.instagram ? String(rec.instagram).trim() : '',
        facebook: rec.facebook ? String(rec.facebook).trim() : '',
        linkedin: rec.linkedin ? String(rec.linkedin).trim() : '',
        tiktok: rec.tiktok ? String(rec.tiktok).trim() : '',
        youtube: rec.youtube ? String(rec.youtube).trim() : '',
        twitter: rec.twitter ? String(rec.twitter).trim() : '',
        socials: rec.socials || {},

        // 7. Reviews
        rating: rec.rating !== undefined && rec.rating !== null && rec.rating !== '' ? rec.rating : null,
        reviewCount: rec.reviewCount !== undefined && rec.reviewCount !== null && rec.reviewCount !== '' ? rec.reviewCount : null,
        reviews: rec.reviews ? String(rec.reviews).trim() : '',

        // All other spreadsheet columns preserved
        rawDetails: rec.rawDetails || {},

        assignedAgent: rec.assignedAgent || 'Unassigned',
        status: rec.status || 'Pending',
        source: rec.source || 'Raw Sheet Upload',
        notes: rec.notes ? String(rec.notes).trim() : 'Imported from raw data upload.',
        assignedDate: rec.assignedDate || today,
        lastContactDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    leads.unshift(...newItems);
    await this.saveToR2('leads', leads);
    return newItems;
  }

  async updateLeadStatus(id, status, notes) {
    const leads = await this.getLeads();
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) return null;

    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    leads[idx] = {
      ...leads[idx],
      status,
      ...(status !== 'Pending' ? { lastContactDate: timestamp } : {}),
      ...(notes ? { notes } : {}),
      updatedAt: now.toISOString()
    };

    await this.saveToR2('leads', leads);
    return leads[idx];
  }

  async updateLeadCategory(id, category) {
    const leads = await this.getLeads();
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) return null;

    leads[idx].category = (category || 'General Business').trim();
    leads[idx].updatedAt = new Date().toISOString();

    await this.saveToR2('leads', leads);
    return leads[idx];
  }

  async updateLead(id, updateFields) {
    const leads = await this.getLeads();
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) return null;

    leads[idx] = {
      ...leads[idx],
      ...updateFields,
      updatedAt: new Date().toISOString()
    };

    await this.saveToR2('leads', leads);
    return leads[idx];
  }

  async deleteLead(id) {
    const leads = await this.getLeads();
    const filtered = leads.filter(l => l.id !== id);
    if (filtered.length !== leads.length) {
      await this.saveToR2('leads', filtered);
      return true;
    }
    return false;
  }

  async clearAllLeads() {
    await this.saveToR2('leads', []);
    return true;
  }

  // --- AGENTS CRUD ---
  async getAgents() {
    return await this.loadCollection('agents', []);
  }

  async addAgent(agentData) {
    const agents = await this.getAgents();
    const maxId = agents.reduce((max, a) => Math.max(max, Number(a.id) || 0), 0);
    const nextId = maxId + 1;

    const defaultAvatars = [
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80"
    ];

    const newAgent = {
      id: nextId,
      name: agentData.name.trim(),
      role: agentData.role ? agentData.role.trim() : 'Sales Representative',
      email: agentData.email ? agentData.email.trim() : '',
      phone: agentData.phone ? agentData.phone.trim() : '0300-1234567',
      avatar: agentData.avatar || defaultAvatars[nextId % defaultAvatars.length],
      color: agentData.color || 'blue',
      pin: agentData.pin ? String(agentData.pin).trim() : '1234',
      createdAt: new Date().toISOString()
    };

    agents.push(newAgent);
    await this.saveToR2('agents', agents);
    return newAgent;
  }

  async updateAgent(id, data) {
    const agents = await this.getAgents();
    const idx = agents.findIndex(a => Number(a.id) === Number(id));
    if (idx === -1) return null;

    agents[idx] = {
      ...agents[idx],
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.role ? { role: data.role.trim() } : {}),
      ...(data.email !== undefined ? { email: data.email.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
      ...(data.avatar ? { avatar: data.avatar } : {}),
      ...(data.pin ? { pin: String(data.pin).trim() } : {}),
      ...(data.color ? { color: data.color } : {})
    };

    await this.saveToR2('agents', agents);
    return agents[idx];
  }

  async updateAgentPin(id, pin) {
    const agents = await this.getAgents();
    const idx = agents.findIndex(a => Number(a.id) === Number(id));
    if (idx === -1) return null;

    agents[idx].pin = String(pin).trim();
    await this.saveToR2('agents', agents);
    return agents[idx];
  }

  async deleteAgent(id) {
    const agents = await this.getAgents();
    const filtered = agents.filter(a => Number(a.id) !== Number(id));
    if (filtered.length !== agents.length) {
      await this.saveToR2('agents', filtered);
      return true;
    }
    return false;
  }

  // --- ADMIN CREDENTIALS & PROFILE ---
  async getAdmin() {
    return await this.loadCollection('admin', DEFAULT_ADMIN);
  }

  async updateAdmin(updateData) {
    const current = await this.getAdmin();
    const updated = {
      ...current,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    await this.saveToR2('admin', updated);
    return updated;
  }

  // --- STATS COMPUTATION DIRECTLY FROM R2 DATA ---
  async getStats() {
    const [customers, leads, agents] = await Promise.all([
      this.getCustomers(),
      this.getLeads(),
      this.getAgents()
    ]);

    const totalCustomers = customers.length;
    const assignedCustomers = customers.filter(c => c.isAssigned).length;
    const unassignedCustomers = totalCustomers - assignedCustomers;

    const totalLeads = leads.length;
    const statusCounts = leads.reduce((acc, lead) => {
      const s = lead.status || 'Pending';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const agentStats = agents.map(agent => {
      const agentLeads = leads.filter(l => l.assignedAgent === agent.name);
      const converted = agentLeads.filter(l => l.status === 'Interested').length;
      return {
        id: agent.id,
        name: agent.name,
        totalLeads: agentLeads.length,
        convertedLeads: converted,
        pendingLeads: agentLeads.filter(l => l.status === 'Pending').length,
        conversionRate: agentLeads.length > 0 ? Math.round((converted / agentLeads.length) * 100) : 0
      };
    });

    return {
      customers: {
        total: totalCustomers,
        assigned: assignedCustomers,
        unassigned: unassignedCustomers
      },
      leads: {
        total: totalLeads,
        byStatus: statusCounts
      },
      agents: agentStats,
      storageEngine: 'Cloudflare R2 Object Storage',
      bucket: R2_BUCKET,
      dataPrefix: R2_PREFIX
    };
  }
}

export const r2Db = new R2DatabaseService();
export default r2Db;
