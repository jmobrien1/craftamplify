import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Sidebar } from './Sidebar';
import { Overview } from './Overview';
import { ContentPipeline } from './ContentPipeline';
import { ContentCalendar } from './ContentCalendar';
import { AIAgents } from './AIAgents';
import { Analytics } from './Analytics';
import { Settings } from './Settings';
import { EventEngine } from './EventEngine';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type DashboardSection = 'overview' | 'pipeline' | 'calendar' | 'ai-agents' | 'analytics' | 'event-engine' | 'settings';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wineryProfile, setWineryProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkWineryProfile();
  }, [user]);

  const checkWineryProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('winery_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching winery profile:', error);
        return;
      }

      if (!data) {
        // No profile found, redirect to onboarding
        navigate('/onboarding');
        return;
      }

      setWineryProfile(data);
    } catch (error) {
      console.error('Error checking winery profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (section: DashboardSection) => {
    setActiveSection(section);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview wineryProfile={wineryProfile} onSectionChange={handleSectionChange} />;
      case 'pipeline':
        return <ContentPipeline wineryProfile={wineryProfile} />;
      case 'calendar':
        return <ContentCalendar wineryProfile={wineryProfile} />;
      case 'ai-agents':
        return <AIAgents wineryProfile={wineryProfile} />;
      case 'analytics':
        return <Analytics wineryProfile={wineryProfile} />;
      case 'event-engine':
        return <EventEngine wineryProfile={wineryProfile} />;
      case 'settings':
        return <Settings wineryProfile={wineryProfile} onProfileUpdate={setWineryProfile} />;
      default:
        return <Overview wineryProfile={wineryProfile} onSectionChange={handleSectionChange} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        wineryProfile={wineryProfile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="ml-2 lg:ml-0 text-xl font-semibold text-gray-900 capitalize">
                {activeSection.replace('-', ' ')}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 hidden sm:block">
                {user?.email}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 sm:p-6"
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}