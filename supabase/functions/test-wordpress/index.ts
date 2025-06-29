/*
  # Test WordPress Connection Edge Function

  1. Purpose
    - Tests WordPress REST API connectivity
    - Validates credentials and permissions

  2. Functionality
    - Attempts to authenticate with WordPress
    - Checks API accessibility
    - Returns connection status

  3. Security
    - Validates credentials securely
    - No credential storage
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface RequestPayload {
  wordpress_url: string;
  wordpress_username: string;
  wordpress_password: string;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const { wordpress_url, wordpress_username, wordpress_password }: RequestPayload = await req.json();

    // Validate required parameters
    if (!wordpress_url || !wordpress_username || !wordpress_password) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required WordPress credentials" 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    // Validate URL format
    let baseUrl: string;
    try {
      const url = new URL(wordpress_url);
      baseUrl = url.origin;
    } catch {
      return new Response(
        JSON.stringify({ 
          error: "Invalid WordPress URL format" 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    // Test WordPress REST API connection
    try {
      const credentials = btoa(`${wordpress_username}:${wordpress_password}`);
      const testUrl = `${baseUrl}/wp-json/wp/v2/users/me`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        return new Response(
          JSON.stringify({
            success: true,
            message: "WordPress connection successful",
            user: {
              id: userData.id,
              name: userData.name,
              roles: userData.roles
            }
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            }
          }
        );
      } else {
        const errorText = await response.text();
        return new Response(
          JSON.stringify({ 
            error: `WordPress authentication failed: ${response.status} ${response.statusText}`,
            details: errorText
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            }
          }
        );
      }
    } catch (fetchError) {
      return new Response(
        JSON.stringify({ 
          error: "Failed to connect to WordPress site",
          details: fetchError instanceof Error ? fetchError.message : 'Network error'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

  } catch (error) {
    console.error('Error in test-wordpress function:', error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        }
      }
    );
  }
});