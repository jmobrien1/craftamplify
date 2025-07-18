import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, ExternalLink, Sparkles, AlertCircle, CheckCircle, RefreshCw, Zap, Settings, Filter, Calendar as CalendarIcon, Database, Globe, Trash2, X, Play, Pause } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ResearchBrief {
  id: string;
  suggested_theme: string;
  key_points: string[];
  local_event_name: string | null;
  local_event_date: string | null;
  local_event_location: string | null;
  seasonal_context: string | null;
  created_at: string;
}

interface ContentRequest {
  content_type: string;
  primary_topic: string;
  key_talking_points: string;
  call_to_action: string;
}

export default function EventEngine() {
  const { user } = useAuth();
  const [researchBriefs, setResearchBriefs] = useState<ResearchBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [wineryProfile, setWineryProfile] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBrief, setDeletingBrief] = useState<ResearchBrief | null>(null);
  const [hasRecentBriefs, setHasRecentBriefs] = useState(false);
  const [automationStatus, setAutomationStatus] = useState<'unknown' | 'active' | 'inactive'>('unknown');
  
  // Enhanced state for better functionality
  const [dateRange, setDateRange] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    if (user) {
      fetchWineryProfile();
      fetchResearchBriefs();
      checkAutomationStatus();
    }
  }, [user]);

  const fetchWineryProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('winery_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setWineryProfile(data);
    } catch (err) {
      console.error('Error fetching winery profile:', err);
    }
  };

  const fetchResearchBriefs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('research_briefs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setResearchBriefs(data || []);
      
      // Check for recent briefs (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentBriefs = (data || []).filter(brief => 
        new Date(brief.created_at) > oneDayAgo
      );
      setHasRecentBriefs(recentBriefs.length > 0);
      
    } catch (err) {
      console.error('Error fetching research briefs:', err);
      setError('Failed to load research briefs');
    } finally {
      setLoading(false);
    }
  };

  const checkAutomationStatus = async () => {
    try {
      // Check for recent briefs to determine if automation is working
      const { data, error } = await supabase
        .from('research_briefs')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const lastBrief = new Date(data[0].created_at);
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        
        if (lastBrief > twoDaysAgo) {
          setAutomationStatus('active');
        } else {
          setAutomationStatus('inactive');
        }
      } else {
        setAutomationStatus('inactive');
      }
    } catch (err) {
      console.error('Error checking automation status:', err);
      setAutomationStatus('unknown');
    }
  };

  const handleScanEvents = async () => {
    if (!wineryProfile) {
      setError('Please complete your winery profile first');
      return;
    }

    try {
      setScanning(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-local-events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          manual_trigger: true,
          winery_id: wineryProfile.id,
          date_range: {
            start_date: new Date(dateRange.start_date).toISOString(),
            end_date: new Date(dateRange.end_date).toISOString()
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data?.success) {
        if (data.events_final > 0) {
          setSuccess(`Event scan completed! Found ${data.events_final || 0} relevant events and created ${data.briefs_created || 0} research briefs.`);
        } else {
          setSuccess(`Event scan completed! No new events found in the specified date range. Your Google Apps Script may need to run first to fetch fresh RSS data.`);
        }
        await fetchResearchBriefs(); // Refresh the list
        await checkAutomationStatus(); // Update automation status
      } else {
        // Handle the specific "no raw data" error with better guidance
        if (data?.message && (data.message.includes('No raw RSS data found') || data.message.includes('No raw data'))) {
          setError('Your Google Apps Script needs to run to provide fresh RSS data. Since you have a daily trigger set up, this should happen automatically at 6 AM each day.');
        } else {
          setError(data?.message || data?.error || 'Event scanning failed');
        }
      }
    } catch (err) {
      console.error('Error scanning events:', err);
      let errorMessage = 'Failed to scan events';
      
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error: Unable to connect to the Event Engine. Please check your internet connection and try again.';
        } else if (err.message.includes('HTTP 404')) {
          errorMessage = 'Event Engine not found. The scan-local-events function may not be deployed.';
        } else if (err.message.includes('HTTP 500')) {
          errorMessage = 'Server error in the Event Engine. Please try again in a few moments.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setScanning(false);
    }
  };

  const handleCreateContent = async (brief: ResearchBrief) => {
    if (!wineryProfile) {
      setError('Please complete your winery profile first');
      return;
    }

    try {
      setCreating(brief.id);
      setError(null);
      setSuccess(null);

      const contentRequest: ContentRequest = {
        content_type: 'blog_post',
        primary_topic: brief.suggested_theme,
        key_talking_points: brief.key_points.join('. '),
        call_to_action: brief.local_event_name ? 
          `Join us at ${brief.local_event_name} to experience our wines firsthand!` :
          'Visit our winery to discover exceptional wines crafted with passion.'
      };

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winery_id: wineryProfile.id,
          content_request: contentRequest,
          research_brief_id: brief.id
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data?.success) {
        setSuccess(`Content created successfully! "${data.data?.content?.title}" has been added to your content calendar.`);
      } else {
        throw new Error(data?.error || 'Content creation failed');
      }
    } catch (err) {
      console.error('Error creating content:', err);
      let errorMessage = 'Failed to create content';
      
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error: Unable to connect to the Content Generator. Please check your internet connection and try again.';
        } else if (err.message.includes('HTTP 404')) {
          errorMessage = 'Content Generator not found. The generate-content function may not be deployed.';
        } else if (err.message.includes('HTTP 500')) {
          errorMessage = 'Server error in the Content Generator. Please try again in a few moments.';
        } else if (err.message.includes('configuration error')) {
          errorMessage = 'Content Generator configuration error. Please contact support.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setCreating(null);
    }
  };

  const handleDeleteBrief = async () => {
    if (!deletingBrief) return;

    try {
      setDeleting(deletingBrief.id);
      
      const { error } = await supabase
        .from('research_briefs')
        .delete()
        .eq('id', deletingBrief.id);

      if (error) throw error;

      setResearchBriefs(prev => prev.filter(brief => brief.id !== deletingBrief.id));
      toast.success('Event opportunity deleted successfully');
      setShowDeleteModal(false);
      setDeletingBrief(null);
    } catch (error) {
      console.error('Error deleting research brief:', error);
      toast.error('Failed to delete event opportunity');
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAllEvents = async () => {
    if (!confirm('Are you sure you want to delete ALL event opportunities? This cannot be undone.')) {
      return;
    }

    try {
      setDeleting('all');
      
      const { error } = await supabase
        .from('research_briefs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      setResearchBriefs([]);
      toast.success('All event opportunities deleted successfully');
    } catch (error) {
      console.error('Error clearing all events:', error);
      toast.error('Failed to clear all events');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Date TBD';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getEventUrl = (brief: ResearchBrief) => {
    // Extract URL from key points if available
    const urlPoint = brief.key_points.find(point => 
      point.includes('http') || point.includes('Event URL:') || point.includes('Source:')
    );
    
    if (urlPoint) {
      const urlMatch = urlPoint.match(/https?:\/\/[^\s]+/);
      return urlMatch ? urlMatch[0] : null;
    }
    
    return null;
  };

  const getAutomationStatusIcon = () => {
    switch (automationStatus) {
      case 'active':
        return <Play className="h-5 w-5 text-green-500" />;
      case 'inactive':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-400" />;
    }
  };

  const getAutomationStatusText = () => {
    switch (automationStatus) {
      case 'active':
        return 'Active - Events discovered recently';
      case 'inactive':
        return 'Inactive - No recent events (may need manual trigger)';
      default:
        return 'Checking automation status...';
    }
  };

  const filteredAndSortedBriefs = researchBriefs
    .filter(brief => {
      if (filterType === 'all') return true;
      if (filterType === 'with_events') return brief.local_event_name;
      if (filterType === 'without_events') return !brief.local_event_name;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'event_date') {
        if (!a.local_event_date && !b.local_event_date) return 0;
        if (!a.local_event_date) return 1;
        if (!b.local_event_date) return -1;
        return new Date(a.local_event_date).getTime() - new Date(b.local_event_date).getTime();
      } else if (sortBy === 'name') {
        return a.suggested_theme.localeCompare(b.suggested_theme);
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">Loading event opportunities...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Zap className="h-7 w-7 text-purple-600 mr-2" />
            Event Engine
          </h1>
          <p className="text-gray-600 mt-1">
            Automated event discovery with Google Apps Script integration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {researchBriefs.length > 0 && (
            <button
              onClick={handleClearAllEvents}
              disabled={deleting === 'all'}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {deleting === 'all' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Events
                </>
              )}
            </button>
          )}
          <button
            onClick={handleScanEvents}
            disabled={scanning || !wineryProfile}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {scanning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Scanning Events...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Scan for Events
              </>
            )}
          </button>
        </div>
      </div>

      {/* Automation Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Google Apps Script Automation Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Events</p>
                <p className="text-2xl font-bold text-blue-900">{researchBriefs.length}</p>
                <p className="text-xs text-blue-600">Event opportunities</p>
              </div>
              <Sparkles className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">With URLs</p>
                <p className="text-2xl font-bold text-green-900">
                  {researchBriefs.filter(brief => getEventUrl(brief)).length}
                </p>
                <p className="text-xs text-green-600">Clickable links</p>
              </div>
              <ExternalLink className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Recent Activity</p>
                <p className="text-2xl font-bold text-purple-900">
                  {hasRecentBriefs ? '✓' : '○'}
                </p>
                <p className="text-xs text-purple-600">
                  {hasRecentBriefs ? 'Active today' : 'No recent activity'}
                </p>
              </div>
              <Globe className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className={`rounded-lg p-4 border ${
            automationStatus === 'active' ? 'bg-green-50 border-green-200' :
            automationStatus === 'inactive' ? 'bg-yellow-50 border-yellow-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  automationStatus === 'active' ? 'text-green-700' :
                  automationStatus === 'inactive' ? 'text-yellow-700' :
                  'text-gray-700'
                }`}>Automation</p>
                <p className={`text-lg font-bold ${
                  automationStatus === 'active' ? 'text-green-900' :
                  automationStatus === 'inactive' ? 'text-yellow-900' :
                  'text-gray-900'
                }`}>
                  {automationStatus === 'active' ? 'ON' : 
                   automationStatus === 'inactive' ? 'OFF' : '?'}
                </p>
                <p className={`text-xs ${
                  automationStatus === 'active' ? 'text-green-600' :
                  automationStatus === 'inactive' ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {automationStatus === 'active' ? 'Working' : 
                   automationStatus === 'inactive' ? 'Needs trigger' : 'Checking...'}
                </p>
              </div>
              {getAutomationStatusIcon()}
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            {getAutomationStatusIcon()}
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <span className="text-sm text-gray-600">{getAutomationStatusText()}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Your Google Apps Script is set to run daily at 6 AM. If no recent events are showing, 
            you can manually trigger it or wait for the next scheduled run.
          </p>
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              {Math.ceil((new Date(dateRange.end_date).getTime() - new Date(dateRange.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            {error.includes('Google Apps Script') && (
              <div className="mt-3 p-3 bg-red-100 rounded-lg">
                <p className="text-red-800 text-sm font-medium">Automated Solution:</p>
                <p className="text-red-700 text-sm mt-1">
                  Since you have a daily trigger set up, your Google Apps Script will automatically run at 6 AM each day. 
                  You can also manually run it in Google Apps Script if you need fresh data immediately.
                </p>
                <div className="mt-2">
                  <p className="text-red-600 text-xs">
                    💡 Your automation is working - just wait for the next scheduled run or trigger it manually
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-green-800 font-medium">Success</h3>
            <p className="text-green-700 text-sm mt-1">{success}</p>
          </div>
        </div>
      )}

      {!wineryProfile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
          <Settings className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-yellow-800 font-medium">Setup Required</h3>
            <p className="text-yellow-700 text-sm mt-1">
              Please complete your winery profile in Settings before using the Event Engine.
            </p>
          </div>
        </div>
      )}

      {/* Automation Guide */}
      {automationStatus === 'inactive' && researchBriefs.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Globe className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-blue-800 font-medium mb-2">Automated Event Discovery</h3>
              <p className="text-blue-700 text-sm mb-3">
                Your Event Engine is ready for automated operation! Since you've set up a daily trigger, 
                your Google Apps Script will automatically fetch fresh RSS data every morning at 6 AM.
              </p>
              <div className="bg-blue-100 rounded-lg p-4">
                <p className="text-blue-800 text-sm font-medium mb-2">How it works:</p>
                <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                  <li>Google Apps Script runs automatically at 6 AM daily</li>
                  <li>Fetches fresh RSS data from 5+ Virginia event sources</li>
                  <li>Sends clean data directly to your Event Engine</li>
                  <li>AI filters out competitor events automatically</li>
                  <li>Creates research briefs for relevant opportunities</li>
                  <li>You see real events with clickable URLs here!</li>
                </ol>
              </div>
              <div className="mt-3 flex items-center space-x-4">
                <div className="text-blue-600 text-xs">
                  ⏰ Next automatic run: Tomorrow at 6 AM
                </div>
                <div className="text-blue-600 text-xs">
                  🔧 Manual trigger: Run your Google Apps Script anytime
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      {researchBriefs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="h-4 w-4 inline mr-1" />
                Filter Events
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Opportunities ({researchBriefs.length})</option>
                <option value="with_events">With Specific Events ({researchBriefs.filter(b => b.local_event_name).length})</option>
                <option value="without_events">General Opportunities ({researchBriefs.filter(b => !b.local_event_name).length})</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="date">Discovery Date</option>
                <option value="event_date">Event Date</option>
                <option value="name">Event Name</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Research Briefs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Event Opportunities ({filteredAndSortedBriefs.length})
        </h2>
        
        {filteredAndSortedBriefs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {automationStatus === 'active' ? 'No events in current filter' : 'Waiting for automated event discovery'}
            </h3>
            <p className="text-gray-600 mb-4">
              {automationStatus === 'active' 
                ? "Try adjusting your filters or date range to see more events."
                : "Your Google Apps Script will automatically discover events at 6 AM daily. You can also run it manually for immediate results."
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAndSortedBriefs.map((brief) => {
              const eventUrl = getEventUrl(brief);
              
              return (
                <div key={brief.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {brief.suggested_theme}
                      </h3>
                      
                      {brief.local_event_name && (
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className="font-medium">{brief.local_event_name}</span>
                        </div>
                      )}
                      
                      {brief.local_event_date && (
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{formatDate(brief.local_event_date)}</span>
                        </div>
                      )}
                      
                      {brief.local_event_location && (
                        <div className="flex items-center text-sm text-gray-600 mb-3">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{brief.local_event_location}</span>
                        </div>
                      )}
                      
                      {brief.key_points && brief.key_points.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Points:</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {brief.key_points.slice(0, 3).map((point, index) => (
                              <li key={index} className="flex items-start">
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {point}
                              </li>
                            ))}
                            {brief.key_points.length > 3 && (
                              <li className="text-gray-500 italic">
                                +{brief.key_points.length - 3} more points...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      {brief.seasonal_context && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Context:</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {brief.seasonal_context}
                          </p>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500">
                        Discovered {formatDate(brief.created_at)}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex flex-col space-y-2">
                      <button
                        onClick={() => handleCreateContent(brief)}
                        disabled={creating === brief.id || !wineryProfile}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                      >
                        {creating === brief.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Create Content
                          </>
                        )}
                      </button>
                      
                      {eventUrl && (
                        <button
                          onClick={() => window.open(eventUrl, '_blank')}
                          className="text-purple-600 hover:text-purple-700 flex items-center text-sm border border-purple-200 px-3 py-2 rounded-lg hover:bg-purple-50"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Event
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          setDeletingBrief(brief);
                          setShowDeleteModal(true);
                        }}
                        disabled={deleting === brief.id}
                        className="text-red-600 hover:text-red-700 flex items-center text-sm border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50"
                      >
                        {deleting === brief.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingBrief && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Event Opportunity</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-700 mb-2">
                Are you sure you want to delete this event opportunity?
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900 text-sm">{deletingBrief.suggested_theme}</p>
                {deletingBrief.local_event_name && (
                  <p className="text-xs text-gray-600 mt-1">{deletingBrief.local_event_name}</p>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingBrief(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBrief}
                disabled={deleting === deletingBrief.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting === deletingBrief.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { EventEngine }