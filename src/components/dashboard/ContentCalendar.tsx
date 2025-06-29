import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-US': enUS,
  },
});

interface ContentCalendarProps {
  wineryProfile: any;
}

export function ContentCalendar({ wineryProfile }: ContentCalendarProps) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    if (wineryProfile) {
      fetchCalendarEvents();
    }
  }, [wineryProfile]);

  const fetchCalendarEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('content_calendar')
        .select('*')
        .eq('winery_id', wineryProfile.id)
        .not('scheduled_date', 'is', null);

      if (error) throw error;

      const calendarEvents = data?.map(item => ({
        id: item.id,
        title: item.title,
        start: new Date(item.scheduled_date),
        end: new Date(item.scheduled_date),
        resource: item,
        allDay: true
      })) || [];

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event: any) => {
    const status = event.resource.status;
    let backgroundColor = '#6b7280'; // gray

    switch (status) {
      case 'scheduled':
        backgroundColor = '#f59e0b'; // amber
        break;
      case 'published':
        backgroundColor = '#10b981'; // green
        break;
      case 'ready_for_review':
        backgroundColor = '#3b82f6'; // blue
        break;
      default:
        backgroundColor = '#6b7280'; // gray
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
        <p className="text-gray-600">Schedule and manage your content publishing dates</p>
      </div>

      {/* Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <div style={{ height: '600px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            eventPropGetter={eventStyleGetter}
            onSelectEvent={(event) => setSelectedEvent(event)}
            views={['month', 'week', 'agenda']}
            defaultView="month"
            popup
            className="rbc-calendar"
          />
        </div>
      </motion.div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
            <span className="text-sm text-gray-700">Draft</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm text-gray-700">Ready for Review</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-amber-500 rounded mr-2"></div>
            <span className="text-sm text-gray-700">Scheduled</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-700">Published</span>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedEvent.title}
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Type:</span>
                <span className="ml-2 text-sm text-gray-900 capitalize">
                  {selectedEvent.resource.content_type.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Status:</span>
                <span className="ml-2 text-sm text-gray-900 capitalize">
                  {selectedEvent.resource.status.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Scheduled:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {format(selectedEvent.start, 'PPP')}
                </span>
              </div>
              {selectedEvent.resource.content && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Preview:</span>
                  <p className="mt-1 text-sm text-gray-700 line-clamp-3">
                    {selectedEvent.resource.content.replace(/<[^>]*>/g, '')}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}