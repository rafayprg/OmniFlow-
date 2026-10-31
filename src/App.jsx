import React, { useState } from 'react';
import { CrmProvider, useCrm } from './context/CrmContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CustomersModule } from './components/CustomersModule';
import { LeadsModule } from './components/LeadsModule';
import { DashboardModule } from './components/DashboardModule';
import { TeamModule } from './components/TeamModule';
import { BulkUploadModal } from './components/BulkUploadModal';
import { AddLeadModal } from './components/AddLeadModal';
import { JarvisAgentModal } from './components/JarvisAgentModal';
import { ToastContainer } from './components/ToastContainer';
import { LoginScreen } from './components/LoginScreen';
import { Analytics } from '@vercel/analytics/react';
import { LayoutDashboard, Database, PhoneForwarded, Users2, LogOut, Cpu, Sparkles } from 'lucide-react';

const MainLayout = () => {
  const { activeTab, setActiveTab, auth, logout, leads } = useCrm();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isJarvisOpen, setIsJarvisOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // If not logged in, render Login Portal
  if (!auth) {
    return (
      <>
        <LoginScreen />
        <ToastContainer />
      </>
    );
  }

  const handleOpenUpload = () => setIsUploadOpen(true);
  const handleCloseUpload = () => setIsUploadOpen(false);

  const handleUploadFinishGoToCustomers = () => {
    setIsUploadOpen(false);
    setActiveTab('customers');
  };

  const isAgent = auth.type === 'agent';
  const myLeadsCount = leads.filter(l => l.assignedAgent === auth?.name).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* 1. Left Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar 
        isMobileOpen={isMobileMenuOpen} 
        onCloseMobile={() => setIsMobileMenuOpen(false)} 
      />

      {/* 2. Flexible Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Top Header */}
        <Header 
          onOpenUpload={handleOpenUpload}
          onOpenAddLead={() => setIsAddLeadOpen(true)}
          onOpenJarvis={() => setIsJarvisOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />

        {/* Scrollable Main Workspace */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-20 md:pb-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardModule onOpenUpload={handleOpenUpload} />
            )}

            {/* Customers Module only for Admin */}
            {activeTab === 'customers' && (
              auth.type === 'admin' ? (
                <CustomersModule 
                  onOpenUpload={handleOpenUpload}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              ) : (
                <LeadsModule 
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onOpenAddLead={() => setIsAddLeadOpen(true)}
                />
              )
            )}

            {activeTab === 'leads' && (
              <LeadsModule 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenAddLead={() => setIsAddLeadOpen(true)}
                onOpenUpload={handleOpenUpload}
              />
            )}

            {/* Team Module only for Admin */}
            {activeTab === 'team' && (
              auth.type === 'admin' ? (
                <TeamModule />
              ) : (
                <LeadsModule 
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onOpenAddLead={() => setIsAddLeadOpen(true)}
                />
              )
            )}
          </div>
        </main>

        {/* 3. Mobile Bottom Navigation Bar (Visible only on phones & tablets) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Dashboard</span>
          </button>

          {!isAgent && (
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'customers' ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-medium">Customers</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('leads')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative cursor-pointer ${
              activeTab === 'leads' ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PhoneForwarded className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">{isAgent ? 'My Leads' : 'Leads'}</span>
            {isAgent && myLeadsCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
            )}
          </button>

          {!isAgent && (
            <button
              onClick={() => setActiveTab('team')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'team' ? 'text-blue-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users2 className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-medium">Team</span>
            </button>
          )}

          <button
            onClick={logout}
            className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Exit</span>
          </button>
        </nav>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isUploadOpen}
        onClose={handleCloseUpload}
        onFinishGoToCustomers={handleUploadFinishGoToCustomers}
        initialTarget={activeTab === 'leads' ? 'leads' : 'customers'}
      />

      {/* Add Lead Direct Entry Modal (Available for Team Members & Admin) */}
      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
      />

      {/* JARVIS Autonomous AI Lead Agent Modal */}
      <JarvisAgentModal
        isOpen={isJarvisOpen}
        onClose={() => setIsJarvisOpen(false)}
      />

      {/* Floating JARVIS AI Agent Button (Always visible on screen) */}
      <button
        onClick={() => setIsJarvisOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-8 z-40 group flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-950/90 hover:bg-slate-900 text-cyan-300 border border-cyan-400/50 rounded-full shadow-2xl shadow-cyan-500/25 backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-cyan-400/20"
        title="Open JARVIS AI Lead Agent"
      >
        <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400/60 shadow-inner">
          <Cpu className="w-4 h-4 text-cyan-400 group-hover:rotate-180 transition-transform duration-700" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-mono font-extrabold tracking-wider text-cyan-300 flex items-center gap-1">
            <span>JARVIS AI</span>
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </span>
          <span className="text-[9px] text-slate-400 font-sans -mt-0.5 hidden sm:inline">Auto Lead Agent</span>
        </div>
      </button>

      {/* Toast Alerts */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <CrmProvider>
      <MainLayout />
      <Analytics />
    </CrmProvider>
  );
}
