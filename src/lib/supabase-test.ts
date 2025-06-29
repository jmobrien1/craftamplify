import { supabase } from './supabase';

export interface ConnectionTestResult {
  component: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export async function testSupabaseConnection(): Promise<ConnectionTestResult[]> {
  const results: ConnectionTestResult[] = [];

  // Test 1: Basic Connection
  try {
    const { data, error } = await supabase.from('winery_profiles').select('count').limit(1);
    if (error) throw error;
    results.push({
      component: 'Database Connection',
      status: 'success',
      message: 'Successfully connected to Supabase'
    });
  } catch (error) {
    results.push({
      component: 'Database Connection',
      status: 'error',
      message: 'Failed to connect to Supabase',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: Check Required Tables
  const requiredTables = [
    'winery_profiles',
    'content_calendar', 
    'research_briefs',
    'engagement_metrics',
    'user_roles'
  ];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) throw error;
      results.push({
        component: `Table: ${table}`,
        status: 'success',
        message: `Table ${table} exists and accessible`
      });
    } catch (error) {
      results.push({
        component: `Table: ${table}`,
        status: 'error',
        message: `Table ${table} missing or inaccessible`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Test 3: Check Edge Functions
  const edgeFunctions = [
    'generate-content',
    'generate-research-brief',
    'generate-strategy',
    'publish-to-wordpress'
  ];

  for (const func of edgeFunctions) {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${func}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: true })
      });
      
      if (response.ok || response.status === 400) {
        // 400 is expected for test calls without proper data
        results.push({
          component: `Edge Function: ${func}`,
          status: 'success',
          message: `Function ${func} is deployed and responding`
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      results.push({
        component: `Edge Function: ${func}`,
        status: 'error',
        message: `Function ${func} not deployed or not responding`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Test 4: Environment Variables
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    const value = import.meta.env[envVar];
    if (value && value !== 'your_supabase_url_here' && value !== 'your_supabase_anon_key_here') {
      results.push({
        component: `Environment: ${envVar}`,
        status: 'success',
        message: `${envVar} is configured`
      });
    } else {
      results.push({
        component: `Environment: ${envVar}`,
        status: 'error',
        message: `${envVar} is missing or not configured`,
        details: 'Check your .env file'
      });
    }
  }

  // Test 5: Authentication
  try {
    const { data: { user } } = await supabase.auth.getUser();
    results.push({
      component: 'Authentication',
      status: user ? 'success' : 'warning',
      message: user ? 'User is authenticated' : 'No user currently authenticated (this is normal)'
    });
  } catch (error) {
    results.push({
      component: 'Authentication',
      status: 'error',
      message: 'Authentication system error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}