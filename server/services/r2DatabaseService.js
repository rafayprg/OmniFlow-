import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getR2Client, R2_BUCKET, R2_PREFIX } from '../config/r2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DATA_DIR = path.resolve(__dirname, '../data');

// Ensure local backup directory exists
if (!fs.existsSync(LOCAL_DATA_DIR)) {
  fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
}

// Default Seed Data
const DEFAULT_ADMIN = {
  username: 'sales@techdeva.net',
  email: 'sales@techdeva.net',
  password: 'Techdeva@12',
  name: 'Sales Administrator',
  role: 'System Administrator',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  updatedAt: new Date().toISOString()
};

const DEFAULT_AGENTS = [
  {
    id: 1,
    name: 'Sarah Khan',
    role: 'Senior Sales Executive',
    email: 'sarah.khan@leadspro.com',
    phone: '0301-8273645',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    color: 'emerald',
    pin: '1234',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Hamza Tariq',
    role: 'Corporate Closer',
    email: 'hamza.tariq@leadspro.com',
    phone: '0322-9182734',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    color: 'blue',
    pin: '1234',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Ayesha Malik',
    role: 'Key Account Manager',
    email: 'ayesha.malik@leadspro.com',
    phone: '0333-7261524',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    color: 'amber',
    pin: '1234',
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    name: 'Bilal Ahmed',
    role: 'Client Representative',
    email: 'bilal.ahmed@leadspro.com',
    phone: '0345-6152431',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    color: 'violet',
    pin: '1234',
    createdAt: new Date().toISOString()
  }
];

class R2DatabaseService {
  constructor() {
    this.initialized = false;
    this.initPromise = null;
    this.memory = {
      customers: [],
      leads: [],
      agents: [],
      admin: null
    };
  }

  async init() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('⚡ Initializing R2 Database Engine...');
        await Promise.all([
          this.loadCollection('customers', []),
          this.loadCollection('leads', []),
          this.loadCollection('agents', DEFAULT_AGENTS),
          this.loadCollection('admin', DEFAULT_ADMIN)
        ]);
        this.initialized = true;
        console.log(`✅ R2 Database Ready: ${this.memory.customers.length} Customers, ${this.memory.leads.length} Leads, ${this.memory.agents.length} Agents loaded from Cloudflare R2.`);
      } catch (err) {
        console.error('⚠️ R2 Database init warning:', err.message);
        this.loadLocalFallbacks();
        this.initialized = true;
      }
    })();

    return this.initPromise;
  }

  // Load a collection from R2 or fallback to default
  async loadCollection(name, defaultData) {
    const client = getR2Client();
    const r2Key = `${R2_PREFIX}${name}.json`;

    if (client) {
      try {
        const cmd = new GetObjectCommand({
          Bucket: R2_BUCKET,
          Key: r2Key
        });
        const res = await client.send(cmd);
        const str = await res.Body.transformToString();
        const parsed = JSON.parse(str);
        this.memory[name] = parsed;
        this.saveLocalBackup(name, parsed);
        return parsed;
      } catch (err) {
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
          console.log(`ℹ️ [R2] Creating initial collection: ${r2Key}`);
          this.memory[name] = defaultData;
          await this.saveToR2(name, defaultData);
          this.saveLocalBackup(name, defaultData);
          return defaultData;
        }
        console.warn(`[R2] Could not fetch ${r2Key}, trying local fallback:`, err.message);
      }
    }

    // Local fallback
    const localFile = path.join(LOCAL_DATA_DIR, `${name}.json`);
    if (fs.existsSync(localFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(localFile, 'utf8'));
        this.memory[name] = data;
        return data;
      } catch (e) {
        console.error(`Error reading local ${name}.json:`, e);
      }
    }

    this.memory[name] = defaultData;
    this.saveLocalBackup(name, defaultData);
    return defaultData;
  }

  // Save collection to R2
  async saveToR2(name, data) {
    const client = getR2Client();
    const r2Key = `${R2_PREFIX}${name}.json`;
    const jsonStr = JSON.stringify(data, null, 2);

    this.saveLocalBackup(name, data);

    if (!client) return;

    try {
      await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: jsonStr,
        ContentType: 'application/json'
      }));
    } catch (err) {
      console.error(`❌ Failed to sync ${r2Key} to Cloudflare R2:`, err.message);
    }
  }

  saveLocalBackup(name, data) {
    try {
      const localFile = path.join(LOCAL_DATA_DIR, `${name}.json`);
      fs.writeFileSync(localFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      // Ignore in read-only environments
    }
  }

  loadLocalFallbacks() {
    for (const name of ['customers', 'leads', 'agents', 'admin']) {
      const localFile = path.join(LOCAL_DATA_DIR, `${name}.json`);
      if (fs.existsSync(localFile)) {
        try {
          this.memory[name] = JSON.parse(fs.readFileSync(localFile, 'utf8'));
        } catch {
          // Keep whatever is in memory
        }
      }
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
    await this.init();
    return [...this.memory.customers];
  }

  async addCustomer(customerData) {
    await this.init();
    const today = new Date().toISOString().split('T')[0];
    const count = this.memory.customers.length;
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

    this.memory.customers.unshift(newCustomer);
    await this.saveToR2('customers', this.memory.customers);
    return newCustomer;
  }

  async bulkAddCustomers(records) {
    await this.init();
    const today = new Date().toISOString().split('T')[0];
    let nextNum = 1001 + this.memory.customers.length;

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

    this.memory.customers.unshift(...newItems);
    await this.saveToR2('customers', this.memory.customers);
    return newItems;
  }

  async updateCustomer(id, updateFields) {
    await this.init();
    const idx = this.memory.customers.findIndex(c => c.id === id);
    if (idx === -1) return null;

    this.memory.customers[idx] = {
      ...this.memory.customers[idx],
      ...updateFields,
      updatedAt: new Date().toISOString()
    };

    await this.saveToR2('customers', this.memory.customers);
    return this.memory.customers[idx];
  }

  async assignCustomersToAgent(customerIds, agentName) {
    await this.init();
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const assignedTimestamp = `${formattedDate} ${formattedTime}`;

    // 1. Update Customers
    const updatedCustomers = [];
    const leadsToCreate = [];

    let leadNum = 1001 + this.memory.leads.length;

    for (const cust of this.memory.customers) {
      if (customerIds.includes(cust.id)) {
        cust.isAssigned = true;
        cust.assignedTo = agentName;
        cust.assignedAt = assignedTimestamp;
        cust.updatedAt = now.toISOString();
        updatedCustomers.push(cust);

        // Prepare corresponding lead
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

    // 2. Insert Leads
    this.memory.leads.unshift(...leadsToCreate);

    // Save both to R2
    await Promise.all([
      this.saveToR2('customers', this.memory.customers),
      this.saveToR2('leads', this.memory.leads)
    ]);

    return {
      updatedCount: updatedCustomers.length,
      leadsCreated: leadsToCreate.length
    };
  }

  async deleteCustomer(id) {
    await this.init();
    const prevCount = this.memory.customers.length;
    this.memory.customers = this.memory.customers.filter(c => c.id !== id);
    if (this.memory.customers.length !== prevCount) {
      await this.saveToR2('customers', this.memory.customers);
      return true;
    }
    return false;
  }

  async clearAllCustomers() {
    await this.init();
    this.memory.customers = [];
    await this.saveToR2('customers', this.memory.customers);
    return true;
  }

  // --- LEADS CRUD ---
  async getLeads() {
    await this.init();
    return [...this.memory.leads];
  }

  async updateLeadStatus(id, status, notes) {
    await this.init();
    const idx = this.memory.leads.findIndex(l => l.id === id);
    if (idx === -1) return null;

    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    this.memory.leads[idx] = {
      ...this.memory.leads[idx],
      status,
      ...(status !== 'Pending' ? { lastContactDate: timestamp } : {}),
      ...(notes ? { notes } : {}),
      updatedAt: now.toISOString()
    };

    await this.saveToR2('leads', this.memory.leads);
    return this.memory.leads[idx];
  }

  async updateLeadCategory(id, category) {
    await this.init();
    const idx = this.memory.leads.findIndex(l => l.id === id);
    if (idx === -1) return null;

    this.memory.leads[idx].category = (category || 'General Business').trim();
    this.memory.leads[idx].updatedAt = new Date().toISOString();

    await this.saveToR2('leads', this.memory.leads);
    return this.memory.leads[idx];
  }

  async deleteLead(id) {
    await this.init();
    const prevCount = this.memory.leads.length;
    this.memory.leads = this.memory.leads.filter(l => l.id !== id);
    if (this.memory.leads.length !== prevCount) {
      await this.saveToR2('leads', this.memory.leads);
      return true;
    }
    return false;
  }

  async clearAllLeads() {
    await this.init();
    this.memory.leads = [];
    await this.saveToR2('leads', this.memory.leads);
    return true;
  }

  // --- AGENTS CRUD ---
  async getAgents() {
    await this.init();
    return [...this.memory.agents];
  }

  async addAgent(agentData) {
    await this.init();
    const maxId = this.memory.agents.reduce((max, a) => Math.max(max, Number(a.id) || 0), 0);
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

    this.memory.agents.push(newAgent);
    await this.saveToR2('agents', this.memory.agents);
    return newAgent;
  }

  async updateAgent(id, data) {
    await this.init();
    const idx = this.memory.agents.findIndex(a => Number(a.id) === Number(id));
    if (idx === -1) return null;

    this.memory.agents[idx] = {
      ...this.memory.agents[idx],
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.role ? { role: data.role.trim() } : {}),
      ...(data.email !== undefined ? { email: data.email.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
      ...(data.avatar ? { avatar: data.avatar } : {}),
      ...(data.pin ? { pin: String(data.pin).trim() } : {}),
      ...(data.color ? { color: data.color } : {})
    };

    await this.saveToR2('agents', this.memory.agents);
    return this.memory.agents[idx];
  }

  async updateAgentPin(id, pin) {
    await this.init();
    const idx = this.memory.agents.findIndex(a => Number(a.id) === Number(id));
    if (idx === -1) return null;

    this.memory.agents[idx].pin = String(pin).trim();
    await this.saveToR2('agents', this.memory.agents);
    return this.memory.agents[idx];
  }

  async deleteAgent(id) {
    await this.init();
    const prevCount = this.memory.agents.length;
    this.memory.agents = this.memory.agents.filter(a => Number(a.id) !== Number(id));
    if (this.memory.agents.length !== prevCount) {
      await this.saveToR2('agents', this.memory.agents);
      return true;
    }
    return false;
  }

  // --- ADMIN CREDENTIALS & PROFILE ---
  async getAdmin() {
    await this.init();
    return this.memory.admin || DEFAULT_ADMIN;
  }

  async updateAdmin(updateData) {
    await this.init();
    const current = this.memory.admin || DEFAULT_ADMIN;
    this.memory.admin = {
      ...current,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    await this.saveToR2('admin', this.memory.admin);
    return this.memory.admin;
  }

  // --- STATS COMPUTATION DIRECTLY FROM R2 DATA ---
  async getStats() {
    await this.init();
    const customers = this.memory.customers;
    const leads = this.memory.leads;
    const agents = this.memory.agents;

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
