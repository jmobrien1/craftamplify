import React, { useState, useEffect } from 'react';
import { testSupabaseConnection, ConnectionTestResult } from '../../lib/supabase-test';

export function ConnectionTest() {
  const [results, setResults] = useState<ConnectionTestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setLoading(true);
    try {
      const testResults = await testSupabaseConnection();
      setResults(testResults);
    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Supabase Connection Test
            </h1>
            <p className="text-gray-600">
              Verifying your Craft Amplify setup
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Running connection tests...</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{successCount}</div>
                  <div className="text-green-700">Passing</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                  <div className="text-red-700">Failing</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
                  <div className="text-yellow-700">Warnings</div>
                </div>
              </div>

              {/* Test Results */}
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getStatusIcon(result.status)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {result.component}
                          </h3>
                          <p className={`text-sm ${getStatusColor(result.status)}`}>
                            {result.message}
                          </p>
                          {result.details && (
                            <p className="text-xs text-gray-500 mt-1">
                              {result.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={runTests}
                  className="flex-1 bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Run Tests Again
                </button>
                <a
                  href="/"
                  className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors text-center"
                >
                  Back to App
                </a>
              </div>

              {/* Next Steps */}
              {errorCount > 0 && (
                <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="font-semibold text-red-800 mb-3">Next Steps:</h3>
                  <ul className="text-red-700 space-y-2 text-sm">
                    {results.filter(r => r.status === 'error').map((result, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>
                          Fix {result.component}: {result.details || result.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {errorCount === 0 && (
                <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="font-semibold text-green-800 mb-3">🎉 All Systems Ready!</h3>
                  <p className="text-green-700">
                    Your Craft Amplify platform is properly configured and ready to use.
                    You can now create your business account and start generating content!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}