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
import { ToastContainer } from './components/ToastContainer';
import { LoginScreen } from './components/LoginScreen';
import { LayoutDashboard, Database, PhoneForwarded, Users2, LogOut } from 'lucide-react';

const MainLayout = () => {
  const { activeTab, setActiveTab, auth, logout, leads } = useCrm();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
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

      {/* Bulk Upload Modal (Admin only) */}
      {auth.type === 'admin' && (
        <BulkUploadModal
          isOpen={isUploadOpen}
          onClose={handleCloseUpload}
          onFinishGoToCustomers={handleUploadFinishGoToCustomers}
        />
      )}

      {/* Add Lead Direct Entry Modal (Available for Team Members & Admin) */}
      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
      />

      {/* Toast Alerts */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <CrmProvider>
      <MainLayout />
    </CrmProvider>
  );
}
