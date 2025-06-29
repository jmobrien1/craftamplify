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
  PieChart
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AnalyticsProps {
  wineryProfile: any;
}

export function Analytics({ wineryProfile }: AnalyticsProps) {
  const [metrics, setMetrics] = useState({
    totalViews: 0,
    totalClicks: 0,
    totalSignups: 0,
    engagementRate: 0
  });
  const [contentPerformance, setContentPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wineryProfile) {
      fetchAnalytics();
    }
  }, [wineryProfile]);

  const fetchAnalytics = async () => {
    try {
      // Fetch engagement metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('engagement_metrics')
        .select('*')
        .eq('winery_id', wineryProfile.id);

      if (metricsError) throw metricsError;

      // Calculate totals
      const totals = metricsData?.reduce((acc, metric) => ({
        totalViews: acc.totalViews + (metric.views || 0),
        totalClicks: acc.totalClicks + (metric.clicks || 0),
        totalSignups: acc.totalSignups + (metric.signups || 0)
      }), { totalViews: 0, totalClicks: 0, totalSignups: 0 }) || { totalViews: 0, totalClicks: 0, totalSignups: 0 };

      const engagementRate = totals.totalViews > 0 
        ? ((totals.totalClicks / totals.totalViews) * 100).toFixed(1)
        : 0;

      setMetrics({ ...totals, engagementRate: parseFloat(engagementRate) });

      // Fetch content performance
      const { data: contentData, error: contentError } = await supabase
        .from('content_calendar')
        .select(`
          id,
          title,
          content_type,
          status,
          created_at,
          engagement_metrics (
            views,
            clicks,
            signups
          )
        `)
        .eq('winery_id', wineryProfile.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(10);

      if (contentError) throw contentError;
      setContentPerformance(contentData || []);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: 'Total Views',
      value: metrics.totalViews.toLocaleString(),
      icon: Eye,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Total Clicks',
      value: metrics.totalClicks.toLocaleString(),
      icon: MousePointer,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'New Signups',
      value: metrics.totalSignups.toLocaleString(),
      icon: Users,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'Engagement Rate',
      value: `${metrics.engagementRate}%`,
      icon: TrendingUp,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Track your content performance and engagement metrics</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${metric.bgColor} rounded-xl p-6 border border-gray-200`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {metric.title}
                  </p>
                  <p className={`text-3xl font-bold ${metric.textColor}`}>
                    {metric.value}
                  </p>
                </div>
                <div className={`${metric.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Content Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Performance</h3>
        {contentPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Views</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Clicks</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Signups</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {contentPerformance.map((content: any) => (
                  <tr key={content.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 truncate max-w-xs">
                        {content.title}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {content.content_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {content.engagement_metrics?.[0]?.views || 0}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {content.engagement_metrics?.[0]?.clicks || 0}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {content.engagement_metrics?.[0]?.signups || 0}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-sm">
                      {new Date(content.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No published content to analyze yet</p>
            <p className="text-sm text-gray-400 mt-1">Start creating and publishing content to see analytics</p>
          </div>
        )}
      </motion.div>

      {/* Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights & Recommendations</h3>
        <div className="space-y-3">
          {metrics.engagementRate > 5 ? (
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Great engagement rate!</p>
                <p className="text-sm text-gray-600">Your content is resonating well with your audience.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Room for improvement</p>
                <p className="text-sm text-gray-600">Try using more engaging headlines and calls-to-action.</p>
              </div>
            </div>
          )}
          
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Consistency is key</p>
              <p className="text-sm text-gray-600">Regular posting helps build audience engagement over time.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}