import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  PenTool, 
  Target, 
  Send,
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Zap
} from 'lucide-react';
import { ContentRequestModal, ContentRequest } from './ContentRequestModal';

interface AIAgentsProps {
  wineryProfile: any;
}

const agents = [
  {
    id: 'terroir-research',
    name: 'Research Agent',
    description: 'Discovers local events, seasonal trends, and regional topics',
    icon: Search,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'vintage-strategist',
    name: 'Strategy Agent',
    description: 'Creates comprehensive content strategies and editorial calendars',
    icon: Target,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'sommelier-writer',
    name: 'Writing Agent',
    description: 'Generates engaging content with your unique brand voice',
    icon: PenTool,
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  {
    id: 'cellar-master',
    name: 'Publishing Agent',
    description: 'Automatically publishes content to your WordPress website',
    icon: Send,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
];

export function AIAgents({ wineryProfile }: AIAgentsProps) {
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>({});
  const [showContentRequest, setShowContentRequest] = useState(false);
  const [selectedAgentForRequest, setSelectedAgentForRequest] = useState<string | null>(null);

  const runAgent = async (agentId: string, contentRequest?: ContentRequest) => {
    setLoading(agentId);
    setActiveAgent(agentId);

    try {
      let endpoint = agentId;
      const requestBody: any = {
        winery_id: wineryProfile.id,
        winery_profile: wineryProfile
      };

      // Use the supercharged generate-content endpoint for content requests
      if (contentRequest && agentId === 'sommelier-writer') {
        endpoint = 'generate-content';
        requestBody.content_request = contentRequest;
        // Remove winery_profile since generate-content fetches it directly
        delete requestBody.winery_profile;
      } else if (contentRequest) {
        requestBody.content_request = contentRequest;
      }

      // Call the appropriate Supabase Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Parse the response body first
      const result = await response.json();

      if (!response.ok) {
        // Use the specific error message from the API response
        const errorMessage = result.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      setResults(prev => ({ ...prev, [agentId]: result }));
    } catch (error) {
      console.error(`Error running ${agentId}:`, error);
      setResults(prev => ({ 
        ...prev, 
        [agentId]: { 
          error: error instanceof Error ? error.message : 'Failed to run agent. Please check your configuration.' 
        } 
      }));
    } finally {
      setLoading(null);
    }
  };

  const handleContentRequest = (agentId: string) => {
    setSelectedAgentForRequest(agentId);
    setShowContentRequest(true);
  };

  const handleContentRequestSubmit = async (contentRequest: ContentRequest) => {
    if (selectedAgentForRequest) {
      await runAgent(selectedAgentForRequest, contentRequest);
      setShowContentRequest(false);
      setSelectedAgentForRequest(null);
    }
  };

  const getAgentStatus = (agentId: string) => {
    if (loading === agentId) return 'running';
    if (results[agentId]?.error) return 'error';
    if (results[agentId]) return 'success';
    return 'idle';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-5 w-5 text-amber-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Sparkles className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600">Intelligent assistants to automate your content creation workflow</p>
        </div>
        <button
          onClick={() => handleContentRequest('sommelier-writer')}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-colors shadow-lg"
        >
          <Zap className="h-4 w-4 mr-2" />
          Supercharged Content Request
        </button>
      </div>

      {/* Brand Voice Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Brand Voice Guide Status</h3>
              <p className="text-sm text-gray-600">
                {wineryProfile.brand_personality_summary && wineryProfile.ai_writing_guidelines ? 
                  'Complete - AI will generate highly personalized content' :
                  'Incomplete - Complete your brand voice in Settings for better results'
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              {[
                wineryProfile.brand_personality_summary,
                wineryProfile.brand_tone,
                wineryProfile.messaging_style,
                wineryProfile.ai_writing_guidelines
              ].filter(Boolean).length}/4 sections complete
            </div>
          </div>
        </div>
      </motion.div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const status = getAgentStatus(agent.id);
          
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${agent.bgColor} rounded-xl border ${agent.borderColor} p-6 hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${agent.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(status)}
                  {agent.id === 'sommelier-writer' && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                      SUPERCHARGED
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {agent.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {agent.description}
                {agent.id === 'sommelier-writer' && (
                  <span className="block mt-1 text-amber-700 font-medium">
                    ✨ Now uses your complete Brand Voice Guide for authentic content
                  </span>
                )}
              </p>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => runAgent(agent.id)}
                  disabled={loading === agent.id}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    loading === agent.id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {loading === agent.id ? 'Running...' : 'Quick Run'}
                </button>
                
                {agent.id === 'sommelier-writer' && (
                  <button
                    onClick={() => handleContentRequest(agent.id)}
                    disabled={loading === agent.id}
                    className="px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 transition-colors"
                    title="Create specific content request"
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Results */}
              {results[agent.id] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-white rounded-lg border border-gray-200"
                >
                  {results[agent.id].error ? (
                    <div className="text-red-600 text-sm">
                      <p className="font-medium">Error:</p>
                      <p>{results[agent.id].error}</p>
                      {results[agent.id].error.includes('WordPress configuration') && (
                        <p className="mt-2 text-blue-600">
                          <span className="font-medium">Tip:</span> Configure your WordPress settings in the Settings tab to use this agent.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-green-600 text-sm">
                      <p className="font-medium">Success!</p>
                      <p>Agent completed successfully. Check your content pipeline for results.</p>
                      {results[agent.id].data?.content && (
                        <div className="mt-2 text-gray-600">
                          <p>Created: "{results[agent.id].data.content.title}"</p>
                          {results[agent.id].data.word_count && (
                            <p>Word count: {results[agent.id].data.word_count}</p>
                          )}
                          {results[agent.id].data.generation_method === 'openai_gpt4' && (
                            <p className="text-amber-600 font-medium">✨ Generated with OpenAI GPT-4</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How the Supercharged System Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
              Brand Voice Guide (The "How")
            </h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Brand personality and tone attributes</p>
              <p>• Messaging style and communication approach</p>
              <p>• Preferred vocabulary and words to avoid</p>
              <p>• Specific AI writing guidelines</p>
              <p>• Business backstory and context</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-blue-500" />
              Content Request (The "What")
            </h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Specific content type and topic</p>
              <p>• Key talking points to include</p>
              <p>• Call-to-action requirements</p>
              <p>• Detailed assignment instructions</p>
              <p>• Target audience considerations</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
          <p className="text-sm text-gray-700">
            <strong>Result:</strong> The AI combines your Brand Voice Guide with your specific Content Request to create 
            incredibly detailed, personalized content that sounds authentically like your business every single time.
          </p>
        </div>
      </motion.div>

      {/* Content Request Modal */}
      <ContentRequestModal
        isOpen={showContentRequest}
        onClose={() => {
          setShowContentRequest(false);
          setSelectedAgentForRequest(null);
        }}
        onSubmit={handleContentRequestSubmit}
        loading={loading === selectedAgentForRequest}
      />
    </div>
  );
}