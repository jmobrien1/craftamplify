import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Sparkles, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const steps = [
  { id: 1, title: 'Business Details', description: 'Tell us about your craft business' },
  { id: 2, title: 'Brand Voice', description: 'Define your unique voice and personality' },
  { id: 3, title: 'Messaging Style', description: 'How you communicate with customers' },
  { id: 4, title: 'Products & Audience', description: 'Your offerings and customers' },
  { id: 5, title: 'Content Goals', description: 'Set your publishing targets' },
  { id: 6, title: 'WordPress Integration', description: 'Connect your website (optional)' }
];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzingBrandVoice, setAnalyzingBrandVoice] = useState(false);
  const [brandGuideText, setBrandGuideText] = useState('');
  const [formData, setFormData] = useState({
    winery_name: '',
    owner_name: '',
    location: '',
    brand_personality_summary: '',
    brand_tone: '',
    messaging_style: '',
    vocabulary_to_use: '',
    vocabulary_to_avoid: '',
    ai_writing_guidelines: '',
    backstory: '',
    wine_types: [] as string[],
    target_audience: '',
    content_goals: 3,
    wordpress_url: '',
    wordpress_username: '',
    wordpress_password: ''
  });

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAnalyzeBrandVoice = async () => {
    if (!brandGuideText.trim()) {
      toast.error('Please paste your brand guide text first');
      return;
    }

    if (brandGuideText.trim().length < 50) {
      toast.error('Please provide a more detailed brand guide (at least 50 characters)');
      return;
    }

    setAnalyzingBrandVoice(true);
    
    try {
      const { data: analysis, error } = await supabase.functions.invoke('analyze-brand-voice', {
        body: { documentText: brandGuideText }
      });

      if (error) {
        throw error;
      }

      // Populate form fields with AI analysis
      setFormData(prev => ({
        ...prev,
        brand_personality_summary: analysis.brand_personality_summary || '',
        brand_tone: analysis.brand_tone || '',
        messaging_style: analysis.messaging_style || '',
        vocabulary_to_use: analysis.vocabulary_to_use || '',
        vocabulary_to_avoid: analysis.vocabulary_to_avoid || '',
        ai_writing_guidelines: analysis.ai_writing_guidelines || ''
      }));

      toast.success('✨ Analysis complete! Please review the fields below and make any adjustments.');
      
    } catch (error) {
      console.error('Error analyzing brand voice:', error);
      toast.error('Failed to analyze brand guide. Please try again or fill out the form manually.');
    } finally {
      setAnalyzingBrandVoice(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('winery_profiles')
        .insert([{
          user_id: user.id,
          ...formData
        }]);

      if (error) throw error;

      toast.success('Welcome to Craft Amplify!');
      navigate('/');
    } catch (error) {
      console.error('Error creating business profile:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.winery_name && formData.owner_name && formData.location;
      case 2:
        return formData.brand_personality_summary.length >= 50 && formData.brand_tone;
      case 3:
        return formData.messaging_style && formData.ai_writing_guidelines.length >= 100;
      case 4:
        return formData.wine_types.length > 0 && formData.target_audience && formData.backstory.length >= 50;
      case 5:
        return formData.content_goals >= 1;
      case 6:
        return true; // WordPress integration is optional
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                value={formData.winery_name}
                onChange={(e) => setFormData(prev => ({ ...prev, winery_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Enter your business name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Owner Name *
              </label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="e.g., Napa Valley, California"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* AI Brand Voice Analyzer */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">✨ AI Brand Voice Analyzer</h3>
                  <p className="text-sm text-gray-600">
                    Have an existing brand guide? Paste it below and let AI extract your brand voice automatically!
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Paste Your Brand Guide Document
                  </label>
                  <textarea
                    value={brandGuideText}
                    onChange={(e) => setBrandGuideText(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Paste your existing brand guide, style guide, or any document that describes your brand personality, tone, and voice. The AI will analyze it and automatically fill out the form fields below..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 50 characters required for analysis
                  </p>
                </div>
                
                <button
                  onClick={handleAnalyzeBrandVoice}
                  disabled={analyzingBrandVoice || !brandGuideText.trim()}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {analyzingBrandVoice ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Manual Form Fields */}
            <div className="space-y-4">
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Brand Voice Details</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Fill these out manually or use the AI analyzer above to auto-populate them.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Personality Summary * (minimum 50 characters)
                </label>
                <textarea
                  value={formData.brand_personality_summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand_personality_summary: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Describe your brand's personality. Are you sophisticated and elegant? Approachable and friendly? Traditional and heritage-focused? Modern and innovative?"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.brand_personality_summary.length}/50 characters minimum
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Tone *
                </label>
                <input
                  type="text"
                  value={formData.brand_tone}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand_tone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., Elegant, Sophisticated, Warm, Approachable, Authentic"
                />
                <p className="text-xs text-gray-500 mt-1">
                  List 3-5 key words that describe your brand's tone
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Messaging Style *
              </label>
              <select
                value={formData.messaging_style}
                onChange={(e) => setFormData(prev => ({ ...prev, messaging_style: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select your messaging style...</option>
                <option value="storytelling">Storytelling - Rich narratives and emotional connections</option>
                <option value="educational">Educational - Informative and knowledge-sharing</option>
                <option value="conversational">Conversational - Casual and friendly dialogue</option>
                <option value="formal">Formal - Professional and sophisticated</option>
                <option value="inspirational">Inspirational - Motivating and uplifting</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vocabulary to Use
              </label>
              <textarea
                value={formData.vocabulary_to_use}
                onChange={(e) => setFormData(prev => ({ ...prev, vocabulary_to_use: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="List words and phrases that represent your brand well (e.g., 'crafted', 'artisanal', 'heritage', 'terroir')"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vocabulary to Avoid
              </label>
              <textarea
                value={formData.vocabulary_to_avoid}
                onChange={(e) => setFormData(prev => ({ ...prev, vocabulary_to_avoid: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="List words and phrases to avoid (e.g., 'cheap', 'mass-produced', overly technical jargon)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Writing Guidelines * (minimum 100 characters)
              </label>
              <textarea
                value={formData.ai_writing_guidelines}
                onChange={(e) => setFormData(prev => ({ ...prev, ai_writing_guidelines: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Specific instructions for AI content generation. How should the AI write for your brand? What style, tone, and approach should it take?"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.ai_writing_guidelines.length}/100 characters minimum
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Business Story * (minimum 50 characters)
              </label>
              <textarea
                value={formData.backstory}
                onChange={(e) => setFormData(prev => ({ ...prev, backstory: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Tell us about your business history, philosophy, and what makes you unique..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.backstory.length}/50 characters minimum
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Types * (select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Wine', 'Beer', 'Spirits', 'Cider',
                  'Mead', 'Kombucha', 'Coffee', 'Tea',
                  'Artisan Foods', 'Craft Goods', 'Other'
                ].map((product) => (
                  <label key={product} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.wine_types.includes(product)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            wine_types: [...prev.wine_types, product]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            wine_types: prev.wine_types.filter(w => w !== product)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{product}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience *
              </label>
              <textarea
                value={formData.target_audience}
                onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Describe your ideal customers (age, interests, knowledge level, etc.)"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Publishing Goal
              </label>
              <p className="text-sm text-gray-600 mb-4">
                How many pieces of content would you like to publish per week?
              </p>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">1</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.content_goals}
                  onChange={(e) => setFormData(prev => ({ ...prev, content_goals: parseInt(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">10</span>
              </div>
              <div className="text-center mt-2">
                <span className="text-2xl font-bold text-amber-600">
                  {formData.content_goals}
                </span>
                <span className="text-sm text-gray-600 ml-1">
                  posts per week
                </span>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Optional:</strong> Connect your WordPress website to automatically publish content.
                You can skip this step and set it up later in Settings.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WordPress URL
              </label>
              <input
                type="url"
                value={formData.wordpress_url}
                onChange={(e) => setFormData(prev => ({ ...prev, wordpress_url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="https://yourbusiness.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.wordpress_username}
                onChange={(e) => setFormData(prev => ({ ...prev, wordpress_username: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Password
              </label>
              <input
                type="password"
                value={formData.wordpress_password}
                onChange={(e) => setFormData(prev => ({ ...prev, wordpress_password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Create an application password in WordPress Admin → Users → Profile
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : currentStep === step.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {steps[currentStep - 1].title}
            </h2>
            <p className="text-gray-600">
              {steps[currentStep - 1].description}
            </p>
          </div>
        </div>

        {/* Form Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          {renderStep()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </button>

            <span className="text-sm text-gray-500">
              Step {currentStep} of {steps.length}
            </span>

            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid(currentStep)}
                className="flex items-center px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading || !isStepValid(currentStep)}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
                <Check className="h-4 w-4 ml-1" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}