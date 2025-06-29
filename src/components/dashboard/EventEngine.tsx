import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, ExternalLink, Sparkles, AlertCircle, CheckCircle, RefreshCw, Zap, Settings, Filter, Calendar as CalendarIcon, Database, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
  const [rawEventsCount, setRawEventsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [wineryProfile, setWineryProfile] = useState<any>(null);
  
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
      fetchRawEventsCount();
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
    } catch (err) {
      console.error('Error fetching research briefs:', err);
      setError('Failed to load research briefs');
    } finally {
      setLoading(false);
    }
  };

  const fetchRawEventsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('raw_events')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setRawEventsCount(count || 0);
    } catch (err) {
      console.error('Error fetching raw events count:', err);
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
        setSuccess(`Event scan completed! Found ${data.events_final || 0} relevant events and created ${data.briefs_created || 0} research briefs.`);
        await fetchResearchBriefs(); // Refresh the list
        await fetchRawEventsCount(); // Refresh raw events count
      } else {
        throw new Error(data?.error || 'Event scanning failed');
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
            Discover local events and create relevant content opportunities
          </p>
        </div>
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

      {/* Data Pipeline Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Data Pipeline Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Raw Events</p>
                <p className="text-2xl font-bold text-blue-900">{rawEventsCount}</p>
                <p className="text-xs text-blue-600">From Google Apps Script</p>
              </div>
              <Globe className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Research Briefs</p>
                <p className="text-2xl font-bold text-purple-900">{researchBriefs.length}</p>
                <p className="text-xs text-purple-600">AI-filtered opportunities</p>
              </div>
              <Sparkles className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">With Event URLs</p>
                <p className="text-2xl font-bold text-green-900">
                  {researchBriefs.filter(brief => getEventUrl(brief)).length}
                </p>
                <p className="text-xs text-green-600">Direct event links</p>
              </div>
              <ExternalLink className="h-8 w-8 text-green-500" />
            </div>
          </div>
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
            {error.includes('Network error') && (
              <div className="mt-2 text-xs text-red-600">
                <p>Troubleshooting steps:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Check your internet connection</li>
                  <li>Refresh the page and try again</li>
                  <li>Verify the Supabase project is running</li>
                  <li>Check if Edge Functions are deployed in your Supabase dashboard</li>
                </ol>
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

      {/* Google Apps Script Setup Notice */}
      {rawEventsCount === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
          <Globe className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-blue-800 font-medium">Google Apps Script Setup Required</h3>
            <p className="text-blue-700 text-sm mt-1">
              No raw event data found. Set up the Google Apps Script to automatically scrape RSS feeds and populate the Event Engine with real data.
            </p>
            <div className="mt-2">
              <a 
                href="/google-apps-script/README.md" 
                target="_blank"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
              >
                View Setup Instructions →
              </a>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found yet</h3>
            <p className="text-gray-600 mb-4">
              {rawEventsCount === 0 
                ? "Set up Google Apps Script to automatically discover events, then click 'Scan for Events'."
                : "Click 'Scan for Events' to discover local opportunities for content creation."
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export { EventEngine }