import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { LEAD_STATUS_CONFIG } from '../data/customerData';

export const DEFAULT_ADMIN = {
  email: 'sales@techdeva.net',
  username: 'sales@techdeva.net',
  name: 'Sales Administrator',
  role: 'System Administrator'
};

const CrmContext = createContext(null);

export const CrmProvider = ({ children }) => {
  // Configured Admin Profile (populated directly from Cloudflare R2)
  const [adminProfile, setAdminProfile] = useState(DEFAULT_ADMIN);

  // Authentication session (only auth token/session preserved in localStorage)
  const [auth, setAuth] = useState(() => {
    try {
      const cached = localStorage.getItem('leadspro_auth');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Strict Cloudflare R2 Database States (ZERO dummy/mock data, ZERO localStorage fallback)
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [agents, setAgents] = useState([]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState({
    connected: false,
    mode: 'connecting',
    message: 'Connecting to Cloudflare R2...'
  });

  // Persist only authentication session so refresh doesn't log the user out
  useEffect(() => {
    try {
      if (auth) {
        localStorage.setItem('leadspro_auth', JSON.stringify(auth));
      } else {
        localStorage.removeItem('leadspro_auth');
      }
    } catch (err) {
      console.warn('Auth session storage sync failed:', err);
    }
  }, [auth]);

  // Toast Notification Manager
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Strict Cloudflare R2 Fetcher: Pulls fresh, real-time records from Cloudflare R2 collections
  const syncWithBackend = useCallback(async (isManual = false) => {
    try {
      const [custRes, leadRes, agentRes, adminRes, healthRes] = await Promise.all([
        fetch('/api/customers?t=' + Date.now()).catch(() => null),
        fetch('/api/leads?t=' + Date.now()).catch(() => null),
        fetch('/api/agents?t=' + Date.now()).catch(() => null),
        fetch('/api/admin?t=' + Date.now()).catch(() => null),
        fetch('/api/health?t=' + Date.now()).catch(() => null)
      ]);

      let isConnected = false;

      // 1. Customers strictly from Cloudflare R2
      if (custRes && custRes.ok) {
        const cJson = await custRes.json();
        if (Array.isArray(cJson.data)) {
          setCustomers(cJson.data);
          isConnected = true;
        }
      }

      // 2. Leads strictly from Cloudflare R2
      if (leadRes && leadRes.ok) {
        const lJson = await leadRes.json();
        if (Array.isArray(lJson.data)) {
          setLeads(lJson.data);
          isConnected = true;
        }
      }

      // 3. Agents strictly from Cloudflare R2
      if (agentRes && agentRes.ok) {
        const aJson = await agentRes.json();
        if (Array.isArray(aJson.data)) {
          setAgents(aJson.data);
          isConnected = true;
        }
      }

      // 4. Admin Profile strictly from Cloudflare R2
      if (adminRes && adminRes.ok) {
        const adJson = await adminRes.json();
        if (adJson.data && (adJson.data.password || adJson.data.email)) {
          setAdminProfile(adJson.data);
        }
      }

      let healthInfo = null;
      if (healthRes && healthRes.ok) {
        healthInfo = await healthRes.json();
      }

      setDbStatus({
        connected: isConnected,
        mode: isConnected ? 'cloudflare-r2' : 'disconnected',
        message: isConnected 
          ? (healthInfo?.database || 'Cloudflare R2 Live Connected') 
          : 'Connecting to Cloudflare R2...'
      });

      setIsLoading(false);

      if (isManual) {
        addToast({
          title: 'Cloudflare R2 Synchronized',
          message: 'All records, pipeline leads, and team profiles fetched live from Cloudflare R2.',
          type: 'success'
        });
      }
    } catch (err) {
      console.warn('Cloudflare R2 sync error:', err);
      setDbStatus({
        connected: false,
        mode: 'error',
        message: 'Cloudflare R2 Connection Error: ' + err.message
      });
      setIsLoading(false);
    }
  }, [addToast]);

  // Live Auto-Sync: Poll Cloudflare R2 every 6 seconds + on window focus
  useEffect(() => {
    syncWithBackend();

    const interval = setInterval(() => {
      syncWithBackend();
    }, 6000);

    const handleFocus = () => {
      syncWithBackend();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncWithBackend]);

  // 1. BULK UPLOAD CUSTOMERS strictly to Cloudflare R2
  const bulkUploadCustomers = useCallback(async (newRecords, fileName = 'Imported_File.xlsx') => {
    try {
      const res = await fetch('/api/customers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: newRecords })
      });

      if (!res.ok) {
        throw new Error(`Failed to upload to Cloudflare R2 (Status: ${res.status})`);
      }

      const result = await res.json();
      const savedRecords = Array.isArray(result.data) ? result.data : [];

      // Update state with records saved to Cloudflare R2
      setCustomers(prev => [...savedRecords, ...prev]);

      addToast({
        title: 'Bulk Data Ingested',
        message: `Successfully saved ${savedRecords.length} records to Cloudflare R2 from "${fileName}".`,
        type: 'success'
      });

      return savedRecords;
    } catch (err) {
      console.error('Cloudflare R2 bulk upload error:', err);
      addToast({
        title: 'Upload Failed',
        message: 'Could not write to Cloudflare R2: ' + err.message,
        type: 'error'
      });
      return [];
    }
  }, [addToast]);

  // 2. ASSIGN CUSTOMERS TO AGENT strictly in Cloudflare R2
  const assignCustomersToAgent = useCallback(async (customerIds, agentName) => {
    if (!customerIds || customerIds.length === 0) {
      addToast({
        title: 'Selection Required',
        message: 'Please select at least one customer row to assign.',
        type: 'warning'
      });
      return false;
    }

    if (!agentName) {
      addToast({
        title: 'Agent Required',
        message: 'Please select an agent for assignment.',
        type: 'warning'
      });
      return false;
    }

    try {
      const res = await fetch('/api/customers/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds, agentName })
      });

      if (!res.ok) {
        throw new Error(`Failed to assign in Cloudflare R2 (Status: ${res.status})`);
      }

      // Re-fetch fresh state from Cloudflare R2
      await syncWithBackend();

      addToast({
        title: 'Workflow Assignment Complete',
        message: `${customerIds.length} customer(s) routed to ${agentName} in Cloudflare R2 pipeline.`,
        type: 'success'
      });

      return true;
    } catch (err) {
      console.error('Assignment error:', err);
      addToast({
        title: 'Assignment Failed',
        message: 'Cloudflare R2 update failed: ' + err.message,
        type: 'error'
      });
      return false;
    }
  }, [syncWithBackend, addToast]);

  // 3. STATUS TRACKING & UPDATING strictly in Cloudflare R2
  const updateLeadStatus = useCallback(async (leadId, newStatus, note = '') => {
    let leadName = '';

    setLeads(prevLeads => {
      return prevLeads.map(lead => {
        if (lead.id === leadId) {
          leadName = lead.name;
          const now = new Date();
          const timestamp = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          return {
            ...lead,
            status: newStatus,
            lastContactDate: newStatus !== 'Pending' ? timestamp : lead.lastContactDate,
            notes: note ? `${note} (Updated to ${newStatus})` : lead.notes
          };
        }
        return lead;
      });
    });

    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes: note })
      });

      if (!res.ok) {
        throw new Error(`Cloudflare R2 status update failed (Status: ${res.status})`);
      }

      addToast({
        title: 'Pipeline Status Updated',
        message: `"${leadName}" marked as "${newStatus}" in Cloudflare R2.`,
        type: newStatus === 'Interested' ? 'success' : newStatus === 'Not Interested' ? 'warning' : 'info'
      });
    } catch (err) {
      console.error('Lead status update error:', err);
      addToast({
        title: 'Update Error',
        message: 'Could not update Cloudflare R2: ' + err.message,
        type: 'error'
      });
    }
  }, [addToast]);

  // 3b. UPDATE LEAD CATEGORY strictly in Cloudflare R2
  const updateLeadCategory = useCallback(async (leadId, newCategory) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, category: newCategory } : l));
    try {
      const res = await fetch(`/api/leads/${leadId}/category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory })
      });
      if (!res.ok) throw new Error('Category update failed');
      addToast({
        title: 'Category Updated',
        message: `Lead updated to "${newCategory}".`,
        type: 'info'
      });
    } catch (err) {
      console.error('Lead category update error:', err);
    }
  }, [addToast]);

  // 3c. UPDATE CUSTOMER CATEGORY strictly in Cloudflare R2
  const updateCustomerCategory = useCallback(async (customerId, newCategory) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, category: newCategory } : c));
    setLeads(prev => prev.map(l => l.customerId === customerId ? { ...l, category: newCategory } : l));
    try {
      const res = await fetch(`/api/customers/${customerId}/category`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory })
      });
      if (!res.ok) throw new Error('Customer category update failed');
      addToast({
        title: 'Category Updated',
        message: `Customer updated to "${newCategory}".`,
        type: 'info'
      });
    } catch (err) {
      console.error('Customer category update error:', err);
    }
  }, [addToast]);

  // 4. ADD SINGLE CUSTOMER MANUALLY strictly to Cloudflare R2
  const addSingleCustomer = useCallback(async (customerData) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });

      if (!res.ok) {
        throw new Error(`Failed to save customer to Cloudflare R2 (Status: ${res.status})`);
      }

      const result = await res.json();
      const newCust = result.data;

      setCustomers(prev => [newCust, ...prev]);

      addToast({
        title: 'Customer Added',
        message: `"${newCust.name}" persisted to Cloudflare R2.`,
        type: 'success'
      });

      return newCust;
    } catch (err) {
      console.error('Add customer error:', err);
      addToast({
        title: 'Save Failed',
        message: 'Could not write to Cloudflare R2: ' + err.message,
        type: 'error'
      });
      return null;
    }
  }, [addToast]);

  // 5. DELETE CUSTOMERS strictly in Cloudflare R2
  const deleteCustomers = useCallback(async (customerIds) => {
    if (!customerIds || customerIds.length === 0) return;

    setCustomers(prev => prev.filter(c => !customerIds.includes(c.id)));
    setLeads(prev => prev.filter(l => !customerIds.includes(l.customerId)));

    try {
      const res = await fetch('/api/customers/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds })
      });

      if (!res.ok) {
        throw new Error(`Cloudflare R2 delete failed (Status: ${res.status})`);
      }

      addToast({
        title: 'Deleted Successfully',
        message: `Removed ${customerIds.length} customer record(s) from Cloudflare R2.`,
        type: 'warning'
      });
    } catch (err) {
      console.error('Delete customers error:', err);
      addToast({
        title: 'Delete Failed',
        message: 'Could not delete from Cloudflare R2: ' + err.message,
        type: 'error'
      });
    }
  }, [addToast]);

  // 5b. DELETE ALL CUSTOMERS & LEADS strictly in Cloudflare R2
  const deleteAllCustomers = useCallback(async () => {
    setCustomers([]);
    setLeads([]);

    try {
      const res = await fetch('/api/customers/all', {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error(`Cloudflare R2 clear failed (Status: ${res.status})`);
      }

      addToast({
        title: 'Database Wiped',
        message: 'All customer records and linked pipeline leads cleared from Cloudflare R2.',
        type: 'warning'
      });
    } catch (err) {
      console.error('Wipe error:', err);
      addToast({
        title: 'Wipe Failed',
        message: 'Could not wipe Cloudflare R2: ' + err.message,
        type: 'error'
      });
    }
  }, [addToast]);

  // 6. UNASSIGN CUSTOMERS strictly in Cloudflare R2
  const unassignCustomers = useCallback(async (customerIds) => {
    if (!customerIds || customerIds.length === 0) return;

    setCustomers(prev => prev.map(c => {
      if (customerIds.includes(c.id)) {
        return {
          ...c,
          isAssigned: false,
          assignedTo: null,
          assignedAt: null
        };
      }
      return c;
    }));

    setLeads(prev => prev.filter(l => !customerIds.includes(l.customerId)));

    try {
      const res = await fetch('/api/customers/unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds })
      });

      if (!res.ok) {
        throw new Error(`Cloudflare R2 unassign failed (Status: ${res.status})`);
      }

      addToast({
        title: 'Assignment Reverted',
        message: `${customerIds.length} customer(s) returned to Unassigned Pool in Cloudflare R2.`,
        type: 'info'
      });
    } catch (err) {
      console.error('Unassign error:', err);
      addToast({
        title: 'Unassign Failed',
        message: 'Cloudflare R2 update failed: ' + err.message,
        type: 'error'
      });
    }
  }, [addToast]);

  // 7. DELETE SINGLE LEAD strictly in Cloudflare R2
  const deleteLead = useCallback(async (leadId) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error(`Cloudflare R2 lead delete failed (Status: ${res.status})`);
      }

      addToast({
        title: 'Lead Removed',
        message: 'Lead removed from active pipeline in Cloudflare R2.',
        type: 'warning'
      });
    } catch (err) {
      console.error('Lead delete error:', err);
      addToast({
        title: 'Delete Failed',
        message: 'Could not delete from Cloudflare R2: ' + err.message,
        type: 'error'
      });
    }
  }, [addToast]);

  // 8. ADD NEW TEAM MEMBER strictly to Cloudflare R2
  const addAgent = useCallback(async (agentData) => {
    if (!agentData.name?.trim()) {
      addToast({
        title: 'Name Required',
        message: 'Please enter a name for the new team member.',
        type: 'warning'
      });
      return false;
    }

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData)
      });

      if (!res.ok) {
        throw new Error(`Failed to create agent in Cloudflare R2 (Status: ${res.status})`);
      }

      const result = await res.json();
      const newAgent = result.data;

      setAgents(prev => [...prev, newAgent]);

      addToast({
        title: 'Team Member Added',
        message: `${newAgent.name} (PIN: ${newAgent.pin}) persisted to Cloudflare R2.`,
        type: 'success'
      });

      return newAgent;
    } catch (err) {
      console.error('Add agent error:', err);
      addToast({
        title: 'Creation Failed',
        message: 'Could not write to Cloudflare R2: ' + err.message,
        type: 'error'
      });
      return null;
    }
  }, [addToast]);

  // 9. UPDATE TEAM MEMBER strictly in Cloudflare R2
  const updateAgent = useCallback(async (agentId, updatedData) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (!res.ok) {
        throw new Error(`Failed to update agent in Cloudflare R2 (Status: ${res.status})`);
      }

      // Re-fetch all to ensure relational updates (name changes in customer/leads) are fresh
      await syncWithBackend();

      addToast({
        title: 'Team Member Updated',
        message: 'Profile details saved to Cloudflare R2.',
        type: 'success'
      });
    } catch (err) {
      console.error('Update agent error:', err);
      addToast({
        title: 'Update Failed',
        message: 'Cloudflare R2 update failed: ' + err.message,
        type: 'error'
      });
    }
  }, [syncWithBackend, addToast]);

  // 9b. UPDATE AGENT PIN strictly in Cloudflare R2
  const updateAgentPin = useCallback(async (agentId, newPin) => {
    const pinStr = String(newPin).trim();
    if (!pinStr) {
      addToast({
        title: 'PIN Required',
        message: 'Please enter a valid PIN.',
        type: 'warning'
      });
      return false;
    }

    let agentName = '';
    setAgents(prev => prev.map(a => {
      if (String(a.id) === String(agentId)) {
        agentName = a.name;
        return { ...a, pin: pinStr };
      }
      return a;
    }));

    setAuth(prev => (prev?.id === agentId ? { ...prev, pin: pinStr } : prev));

    try {
      const res = await fetch(`/api/agents/${agentId}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinStr })
      });

      if (!res.ok) {
        throw new Error(`Failed to assign PIN in Cloudflare R2 (Status: ${res.status})`);
      }

      addToast({
        title: 'PIN Assigned',
        message: `New security PIN "${pinStr}" assigned to ${agentName} in Cloudflare R2.`,
        type: 'success'
      });
      return true;
    } catch (err) {
      console.error('PIN update error:', err);
      addToast({
        title: 'PIN Update Failed',
        message: 'Cloudflare R2 PIN update failed: ' + err.message,
        type: 'error'
      });
      return false;
    }
  }, [addToast]);

  // 10. REMOVE TEAM MEMBER strictly from Cloudflare R2
  const removeAgent = useCallback(async (agentId) => {
    const targetAgent = agents.find(a => a.id === agentId);
    if (!targetAgent) return;

    const agentName = targetAgent.name;

    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error(`Failed to delete agent from Cloudflare R2 (Status: ${res.status})`);
      }

      await syncWithBackend();

      addToast({
        title: 'Member Removed from Team',
        message: `${agentName} removed from Cloudflare R2. Assigned leads returned to unassigned pool.`,
        type: 'warning'
      });
    } catch (err) {
      console.error('Delete agent error:', err);
      addToast({
        title: 'Removal Failed',
        message: 'Could not delete from Cloudflare R2: ' + err.message,
        type: 'error'
      });
    }
  }, [agents, syncWithBackend, addToast]);

  // 11. UPDATE ADMIN PROFILE strictly in Cloudflare R2
  const updateAdminProfile = useCallback(async (updates) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        throw new Error(`Failed to update admin profile in Cloudflare R2 (Status: ${res.status})`);
      }

      const result = await res.json();
      const updatedAdmin = result.data;
      setAdminProfile(updatedAdmin);

      setAuth(prev => {
        if (prev?.type === 'admin') {
          return {
            ...prev,
            name: updatedAdmin.name || prev.name,
            email: updatedAdmin.email || prev.email
          };
        }
        return prev;
      });

      addToast({
        title: 'Admin Profile Updated',
        message: 'Administrator details saved in Cloudflare R2 database.',
        type: 'success'
      });
    } catch (err) {
      console.error('Admin profile error:', err);
      addToast({
        title: 'Profile Update Failed',
        message: 'Could not save to Cloudflare R2: ' + err.message,
        type: 'error'
      });
    }
  }, [addToast]);

  // 12. AUTHENTICATION (Admin Login, Agent PIN Login, Logout)
  const loginAdmin = useCallback(async (credentials) => {
    const enteredId = (credentials?.id || credentials?.email || '').trim().toLowerCase();
    const enteredPassword = (credentials?.password || '').trim();
    const enteredName = credentials?.name?.trim();

    if (!enteredId || !enteredPassword) {
      const msg = 'Please enter both your Admin email and password.';
      addToast({ title: 'Input Required', message: msg, type: 'warning' });
      return { success: false, message: msg };
    }

    // Authenticate securely against Cloudflare R2 backend
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: enteredId, password: enteredPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const adminUser = {
          type: 'admin',
          name: data.data?.name || enteredName || 'Sales Administrator',
          role: data.data?.role || 'System Administrator',
          email: data.data?.email || 'sales@techdeva.net',
          avatar: data.data?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        };
        setAuth(adminUser);
        setActiveTab('dashboard');
        addToast({
          title: 'Admin Access Granted',
          message: `Welcome, ${adminUser.name}!`,
          type: 'success'
        });
        return { success: true };
      } else {
        const msg = data.message || 'Invalid credentials. Access denied.';
        addToast({ title: 'Authentication Failed', message: msg, type: 'warning' });
        return { success: false, message: msg };
      }
    } catch {
      // Direct verification fallback
      if (
        (enteredId === 'sales@techdeva.net' || enteredId === 'sales') &&
        enteredPassword === 'Techdeva@12'
      ) {
        const adminUser = {
          type: 'admin',
          name: enteredName || 'Sales Administrator',
          role: 'System Administrator',
          email: 'sales@techdeva.net',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        };
        setAuth(adminUser);
        setActiveTab('dashboard');
        addToast({
          title: 'Admin Access Granted',
          message: `Welcome, ${adminUser.name}!`,
          type: 'success'
        });
        return { success: true };
      }
      const msg = 'Invalid credentials. Access denied.';
      addToast({ title: 'Authentication Failed', message: msg, type: 'warning' });
      return { success: false, message: msg };
    }
  }, [addToast]);

  const loginAgentPin = useCallback((agentId, enteredPin) => {
    const targetAgent = agents.find(a => String(a.id) === String(agentId));
    if (!targetAgent) {
      addToast({
        title: 'Member Not Found',
        message: 'Please select a valid team member profile.',
        type: 'warning'
      });
      return { success: false, message: 'Agent not found' };
    }

    const assignedPin = String(targetAgent.pin || '').trim();
    if (!assignedPin) {
      const msg = `No PIN has been assigned to ${targetAgent.name} yet. Please ask your Administrator to assign you a PIN.`;
      addToast({
        title: 'PIN Not Assigned',
        message: msg,
        type: 'warning'
      });
      return { success: false, message: msg };
    }

    if (String(enteredPin).trim() !== assignedPin) {
      const msg = `Incorrect PIN for ${targetAgent.name}. Please enter the exact security PIN assigned by your Administrator.`;
      addToast({
        title: 'Authentication Failed',
        message: msg,
        type: 'warning'
      });
      return { success: false, message: msg };
    }

    const agentUser = {
      type: 'agent',
      id: targetAgent.id,
      name: targetAgent.name,
      role: targetAgent.role,
      email: targetAgent.email,
      phone: targetAgent.phone,
      avatar: targetAgent.avatar,
      pin: assignedPin
    };

    setAuth(agentUser);
    setActiveTab('leads');
    addToast({
      title: 'Member Portal Unlocked',
      message: `Welcome, ${targetAgent.name}! Viewing your assigned pipeline.`,
      type: 'success'
    });
    return { success: true };
  }, [agents, addToast]);

  const logout = useCallback(() => {
    setAuth(null);
    addToast({
      title: 'Signed Out',
      message: 'You have been returned to the authentication portal.',
      type: 'info'
    });
  }, [addToast]);

  // 13. COMPUTED DASHBOARD & ANALYTICS METRICS (Directly from live Cloudflare R2 collections)
  const analytics = useMemo(() => {
    const totalCustomersPool = customers.length;
    const totalLeadsAssigned = leads.length;
    const unassignedCount = customers.filter(c => !c.isAssigned).length;
    const assignedCustomersCount = customers.filter(c => c.isAssigned).length;

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

    const statusPercentages = {
      Pending: totalLeadsAssigned > 0 ? Math.round((pendingCount / totalLeadsAssigned) * 100) : 0,
      Connected: totalLeadsAssigned > 0 ? Math.round((connectedCount / totalLeadsAssigned) * 100) : 0,
      'Not Connected': totalLeadsAssigned > 0 ? Math.round((notConnectedCount / totalLeadsAssigned) * 100) : 0,
      Interested: totalLeadsAssigned > 0 ? Math.round((interestedCount / totalLeadsAssigned) * 100) : 0,
      'Not Interested': totalLeadsAssigned > 0 ? Math.round((notInterestedCount / totalLeadsAssigned) * 100) : 0,
      'Not on WhatsApp': totalLeadsAssigned > 0 ? Math.round((notOnWhatsAppCount / totalLeadsAssigned) * 100) : 0,
    };

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
        ...agent,
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

    return {
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
      statusPercentages,
      agentBreakdown
    };
  }, [customers, leads, agents]);

  const value = {
    agents,
    customers,
    leads,
    activeTab,
    setActiveTab,
    toasts,
    addToast,
    removeToast,
    bulkUploadCustomers,
    assignCustomersToAgent,
    updateLeadStatus,
    updateLeadCategory,
    updateCustomerCategory,
    addSingleCustomer,
    deleteCustomers,
    deleteAllCustomers,
    unassignCustomers,
    deleteLead,
    addAgent,
    updateAgent,
    updateAgentPin,
    removeAgent,
    auth,
    adminProfile,
    updateAdminProfile,
    loginAdmin,
    loginAgentPin,
    logout,
    dbStatus,
    analytics,
    statusConfig: LEAD_STATUS_CONFIG,
    syncNow: () => syncWithBackend(true),
    isLoading,
    DEFAULT_ADMIN
  };

  return (
    <CrmContext.Provider value={value}>
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};
