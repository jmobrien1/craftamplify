import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Calendar, 
  FileText, 
  Home, 
  Settings, 
  Sparkles,
  X,
  Grape,
  Zap
} from 'lucide-react';
import { DashboardSection } from './Dashboard';

interface SidebarProps {
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  wineryProfile: any;
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { id: 'overview', name: 'Overview', icon: Home },
  { id: 'pipeline', name: 'Content Pipeline', icon: FileText },
  { id: 'calendar', name: 'Calendar', icon: Calendar },
  { id: 'ai-agents', name: 'AI Agents', icon: Sparkles },
  { id: 'event-engine', name: 'Event Engine', icon: Zap },
  { id: 'analytics', name: 'Analytics', icon: BarChart3 },
  { id: 'settings', name: 'Settings', icon: Settings },
] as const;

export function Sidebar({ activeSection, onSectionChange, wineryProfile, isOpen, onClose }: SidebarProps) {
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Grape className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {wineryProfile?.winery_name || 'Craft Amplify'}
            </h2>
            <p className="text-sm text-gray-500">Content Engine</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onSectionChange(item.id as DashboardSection);
                onClose();
              }}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
              {item.name}
              {item.id === 'event-engine' && (
                <span className="ml-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full">
                  NEW
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile section */}
      {wineryProfile && (
        <div className="p-4 border-t border-gray-200">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {wineryProfile.winery_name?.charAt(0) || 'C'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {wineryProfile.winery_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {wineryProfile.location}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200">
        {sidebarContent}
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}