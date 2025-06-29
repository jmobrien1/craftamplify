import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Sparkles } from 'lucide-react';

interface ContentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: ContentRequest) => void;
  loading?: boolean;
}

export interface ContentRequest {
  content_type: string;
  primary_topic: string;
  key_talking_points: string;
  call_to_action: string;
}

export function ContentRequestModal({ isOpen, onClose, onSubmit, loading }: ContentRequestModalProps) {
  const [formData, setFormData] = useState<ContentRequest>({
    content_type: 'blog_post',
    primary_topic: '',
    key_talking_points: '',
    call_to_action: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.primary_topic.trim() && formData.key_talking_points.trim()) {
      onSubmit(formData);
    }
  };

  const handleClose = () => {
    setFormData({
      content_type: 'blog_post',
      primary_topic: '',
      key_talking_points: '',
      call_to_action: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">New Content Request</h2>
              <p className="text-sm text-gray-600">Tell the AI exactly what content you need</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Type *
            </label>
            <select
              value={formData.content_type}
              onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            >
              <option value="blog_post">Blog Post</option>
              <option value="social_media">Social Media Post</option>
              <option value="newsletter">Newsletter</option>
              <option value="event_promotion">Event Promotion</option>
              <option value="product_announcement">Product Announcement</option>
              <option value="educational_content">Educational Content</option>
            </select>
          </div>

          {/* Primary Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Topic / Goal *
            </label>
            <input
              type="text"
              value={formData.primary_topic}
              onChange={(e) => setFormData(prev => ({ ...prev, primary_topic: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="e.g., Announce our summer music series"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              What is the main subject or goal of this content?
            </p>
          </div>

          {/* Key Talking Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Key Talking Points *
            </label>
            <textarea
              value={formData.key_talking_points}
              onChange={(e) => setFormData(prev => ({ ...prev, key_talking_points: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="e.g., Mention the band is 'The Foggy Bottom Boys'. Event is every Saturday in July. Tickets are $15 online. Features our new Rosé."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Include all important details, dates, prices, names, and specific information to mention
            </p>
          </div>

          {/* Call to Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call to Action
            </label>
            <input
              type="text"
              value={formData.call_to_action}
              onChange={(e) => setFormData(prev => ({ ...prev, call_to_action: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="e.g., Click the link to buy tickets now!"
            />
            <p className="text-xs text-gray-500 mt-1">
              What should the reader do next? (Optional)
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.primary_topic.trim() || !formData.key_talking_points.trim()}
              className="flex items-center px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Generating...' : 'Generate Content'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}