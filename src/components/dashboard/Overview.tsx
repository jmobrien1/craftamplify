import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Users,
  Calendar,
  FileText,
  BarChart3,
  PieChart,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Zap,
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OverviewProps {
  wineryProfile: any;
  onSectionChange?: (section: string) => void;
}

export function Overview({ wineryProfile, onSectionChange }: OverviewProps) {
  const [stats, setStats] = useState({
    totalContent: 0,
    scheduledContent: 0,
    publishedThisMonth: 0,
    draftContent: 0,
    eventsDiscovered: 0,
    proactiveContent: 0
  });
  const [recentContent, setRecentContent] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wineryProfile) {
      fetchOverviewData();
    }
  }, [wineryProfile]);

  const fetchOverviewData = async () => {
    try {
      // Fetch content stats
      const { data: contentData, error: contentError } = await supabase
        .from('content_calendar')
        .select('status, created_at, research_brief_id')
        .eq('winery_id', wineryProfile.id);

      if (contentError) throw contentError;

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const stats = {
        totalContent: contentData?.length || 0,
        scheduledContent: contentData?.filter(item => item.status === 'scheduled').length || 0,
        publishedThisMonth: contentData?.filter(item => 
          item.status === 'published' && 
          new Date(item.created_at) >= startOfMonth
        ).length || 0,
        draftContent: contentData?.filter(item => item.status === 'draft').length || 0,
        eventsDiscovered: 0,
        proactiveContent: contentData?.filter(item => item.research_brief_id).length || 0
      };

      // Fetch events discovered
      const { count: eventsCount } = await supabase
        .from('research_briefs')
        .select('*', { count: 'exact', head: true })
        .eq('winery_id', wineryProfile.id)
        .not('local_event_name', 'is', null);

      stats.eventsDiscovered = eventsCount || 0;

      setStats(stats);

      // Fetch recent content
      const { data: recentData, error: recentError } = await supabase
        .from('content_calendar')
        .select(`
          id,
          title,
          content_type,
          status,
          created_at,
          research_brief_id
        `)
        .eq('winery_id', wineryProfile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;
      setRecentContent(recentData || []);

      // Fetch recent events
      const { data: eventsData, error: eventsError } = await supabase
        .from('research_briefs')
        .select('*')
        .eq('winery_id', wineryProfile.id)
        .not('local_event_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (eventsError) throw eventsError;
      setRecentEvents(eventsData || []);

    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    if (onSectionChange) {
      onSectionChange(action);
    }
  };

  const statCards = [
    {
      title: 'Total Content',
      value: stats.totalContent,
      icon: FileText,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Scheduled',
      value: stats.scheduledContent,
      icon: Clock,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700'
    },
    {
      title: 'Published This Month',
      value: stats.publishedThisMonth,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Events Discovered',
      value: stats.eventsDiscovered,
      icon: Zap,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-amber-100 text-amber-800';
      case 'ready_for_review':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white"
      >
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {wineryProfile?.owner_name || 'Craft Creator'}!
        </h1>
        <p className="text-amber-100">
          Your {wineryProfile?.winery_name || 'craft business'} content engine is ready to help you tell your story.
        </p>
        {stats.proactiveContent > 0 && (
          <div className="mt-3 flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm">
              {stats.proactiveContent} pieces of content were automatically created from discovered events!
            </span>
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${stat.bgColor} rounded-xl p-6 border border-gray-200`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className={`text-3xl font-bold ${stat.textColor}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Content & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Content</h3>
          {recentContent.length > 0 ? (
            <div className="space-y-4">
              {recentContent.map((content: any, index) => (
                <div key={content.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {content.title}
                      </h4>
                      {content.research_brief_id && (
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(content.created_at)} • {content.content_type}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(content.status)}`}>
                    {content.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No content created yet</p>
              <p className="text-sm text-gray-400 mt-1">Start by using the AI agents to generate content</p>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => handleQuickAction('ai-agents')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200 hover:from-amber-100 hover:to-orange-100 transition-colors"
            >
              <div className="flex items-center">
                <Sparkles className="h-5 w-5 text-amber-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">Generate New Content</span>
              </div>
              <span className="text-xs text-amber-600">AI Agents</span>
            </button>
            
            <button 
              onClick={() => handleQuickAction('event-engine')}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 hover:from-purple-100 hover:to-blue-100 transition-colors"
            >
              <div className="flex items-center">
                <Zap className="h-5 w-5 text-purple-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">Event Engine</span>
              </div>
              <span className="text-xs text-purple-600">Proactive</span>
            </button>
            
            <button 
              onClick={() => handleQuickAction('calendar')}
              className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">View Calendar</span>
              </div>
              <span className="text-xs text-blue-600">Schedule</span>
            </button>
            
            <button 
              onClick={() => handleQuickAction('analytics')}
              className="w-full flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">View Analytics</span>
              </div>
              <span className="text-xs text-green-600">Insights</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Discovered Events</h3>
          <div className="space-y-3">
            {recentEvents.slice(0, 3).map((event: any) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{event.local_event_name}</h4>
                  <p className="text-xs text-gray-600">{event.local_event_location}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-purple-600 font-medium">Auto-discovered</p>
                  <p className="text-xs text-gray-500">{formatDate(event.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}