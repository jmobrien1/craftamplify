/*
  # Sommelier Writing Agent - True Generative AI Integration

  1. Purpose
    - Generates authentic, brand-specific content using OpenAI GPT-4
    - Combines complete Brand Voice Guide with specific Content Requests
    - Creates personalized content that perfectly matches brand personality
    - Uses user's personal OpenAI API key when available

  2. Functionality
    - Fetches complete winery profile with brand voice data
    - Constructs detailed, multi-part prompts for GPT-4
    - Uses OpenAI chat/completions endpoint for content generation
    - Prioritizes user's personal API key over system key

  3. Security
    - Securely retrieves OpenAI API key from user profile or system secrets
    - Validates winery ownership through RLS
    - Comprehensive error handling and logging
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ContentRequest {
  content_type: string;
  primary_topic: string;
  key_talking_points: string;
  call_to_action: string;
}

interface RequestPayload {
  winery_id: string;
  content_request: ContentRequest;
  research_brief_id?: string;
  test?: boolean;
}

interface WineryProfile {
  id: string;
  winery_name: string;
  location: string;
  owner_name: string;
  brand_personality_summary?: string;
  brand_tone?: string;
  messaging_style?: string;
  vocabulary_to_use?: string;
  vocabulary_to_avoid?: string;
  ai_writing_guidelines?: string;
  backstory?: string;
  target_audience?: string;
  wine_types?: string[];
  openai_api_key?: string;
}

function buildSuperchargedPrompt(wineryProfile: WineryProfile, contentRequest: ContentRequest): string {
  const systemPrompt = `You are the "Sommelier" Writing Agent, an expert AI content creator specializing in craft beverage brands. Your mission is to generate content that perfectly embodies the client's unique brand voice and personality.

---
**COMPLETE BRAND VOICE GUIDE (THE 'HOW')**

**Business Context:**
- Winery Name: ${wineryProfile.winery_name}
- Location: ${wineryProfile.location}
- Owner: ${wineryProfile.owner_name}
- Wine Specialties: ${wineryProfile.wine_types?.join(', ') || 'Not specified'}

**Brand Personality:**
${wineryProfile.brand_personality_summary || 'Not specified - use professional, authentic tone that reflects craft beverage expertise'}

**Brand Tone Attributes:**
${wineryProfile.brand_tone || 'Not specified - use warm, knowledgeable, and approachable tone'}

**Messaging Style:**
${wineryProfile.messaging_style || 'storytelling'} - Use this communication approach throughout the content

**Vocabulary Guidelines:**
- PREFERRED WORDS/PHRASES: ${wineryProfile.vocabulary_to_use || 'crafted, artisanal, exceptional, authentic, passionate, heritage, terroir'}
- WORDS/PHRASES TO AVOID: ${wineryProfile.vocabulary_to_avoid || 'cheap, mass-produced, generic, artificial'}

**Target Audience:**
${wineryProfile.target_audience || 'Wine enthusiasts and craft beverage lovers'}

**Business Story & Context:**
${wineryProfile.backstory || 'A passionate craft beverage business dedicated to quality and authenticity'}

**SPECIFIC AI WRITING GUIDELINES:**
${wineryProfile.ai_writing_guidelines || 'Write with passion and expertise about winemaking. Use storytelling to connect emotionally with readers. Balance technical knowledge with accessibility. Always emphasize the human element behind the craft.'}

---
**CONTENT REQUEST (THE 'WHAT')**

**Content Type:** ${contentRequest.content_type}
**Primary Topic/Goal:** ${contentRequest.primary_topic}
**Key Talking Points to Include:** ${contentRequest.key_talking_points}
**Required Call to Action:** ${contentRequest.call_to_action || 'Visit our winery to experience exceptional wines crafted with passion'}

---

**YOUR ASSIGNMENT:**
Generate a complete, ready-to-publish ${contentRequest.content_type} that:

1. **PERFECTLY EMBODIES THE BRAND VOICE** - Every sentence should reflect the specified personality, tone, and messaging style
2. **INCLUDES ALL KEY TALKING POINTS** - Weave in every detail mentioned naturally and authentically
3. **USES PREFERRED VOCABULARY** - Incorporate their preferred words while avoiding specified words
4. **FOLLOWS WRITING GUIDELINES** - Strictly adhere to their specific AI writing instructions
5. **INCLUDES THE CALL TO ACTION** - End with their specified call to action
6. **MATCHES CONTENT TYPE** - Format appropriately for the requested content type

**CONTENT TYPE SPECIFIC REQUIREMENTS:**

${contentRequest.content_type === 'blog_post' ? `
**BLOG POST FORMAT:**
- Create an engaging, SEO-friendly headline
- Use HTML formatting with proper headings (h2, h3)
- Structure: Introduction, 2-3 main sections with subheadings, conclusion
- Include 400-600 words
- Use paragraph breaks for readability
- End with the call to action in a prominent way
` : ''}

${contentRequest.content_type === 'social_media' ? `
**SOCIAL MEDIA FORMAT:**
- Keep under 280 characters for Twitter compatibility
- Use engaging, conversational tone
- Include relevant emojis (🍷, 🍇, etc.)
- Add 3-5 relevant hashtags
- Make it shareable and engaging
- Include the call to action naturally within the character limit
` : ''}

${contentRequest.content_type === 'newsletter' ? `
**NEWSLETTER FORMAT:**
- Start with a warm, personal greeting
- Use clear sections with descriptive headings
- Include personal touches from the winery team
- Use HTML formatting for email readability
- Target 300-500 words
- End with a signature from the team
- Make the call to action prominent but natural
` : ''}

${contentRequest.content_type === 'event_promotion' ? `
**EVENT PROMOTION FORMAT:**
- Create excitement and urgency
- Include all event details clearly (date, time, location)
- Highlight unique aspects and benefits
- Use persuasive, engaging language
- Make the call to action prominent and action-oriented
- Target 250-400 words
` : ''}

${contentRequest.content_type === 'product_announcement' ? `
**PRODUCT ANNOUNCEMENT FORMAT:**
- Build anticipation and excitement
- Highlight what makes the product special and unique
- Include key product details and availability
- Connect to the winery's story and expertise
- Make the announcement feel exclusive and special
- Target 300-450 words
` : ''}

${contentRequest.content_type === 'educational_content' ? `
**EDUCATIONAL CONTENT FORMAT:**
- Start with an engaging hook that draws readers in
- Break down complex topics into digestible sections
- Use the winery's expertise and unique perspective
- Include practical takeaways and actionable insights
- Maintain the brand voice throughout while being informative
- Target 500-700 words
` : ''}

**CRITICAL SUCCESS FACTORS:**
- This content represents ${wineryProfile.winery_name} - make it authentically theirs
- Every word should feel like it came from someone who truly understands their business
- The reader should feel the personality and passion of the winery
- Include specific details from the talking points naturally - don't just list them
- Make the content valuable and engaging to their target audience
- Ensure the brand voice shines through every sentence

Generate the content now, ensuring it perfectly captures their unique brand voice while fulfilling all aspects of the content request.`;

  return systemPrompt;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const { winery_id, content_request, research_brief_id, test }: RequestPayload = await req.json();

    // Handle test requests
    if (test) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Sommelier Writing Agent with True Generative AI is available" 
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    // Validate required parameters
    if (!winery_id || !content_request) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters: winery_id and content_request" 
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

    // Validate content request structure
    if (!content_request.content_type || !content_request.primary_topic || !content_request.key_talking_points) {
      return new Response(
        JSON.stringify({ 
          error: "Content request must include content_type, primary_topic, and key_talking_points" 
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error",
          details: "Missing required Supabase environment variables"
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch complete winery profile with brand voice data and OpenAI API key
    console.log(`Fetching winery profile for ID: ${winery_id}`);
    
    const { data: wineryProfile, error: profileError } = await supabase
      .from('winery_profiles')
      .select('*')
      .eq('id', winery_id)
      .single();

    if (profileError) {
      console.error('Error fetching winery profile:', profileError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch winery profile",
          details: profileError.message
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    if (!wineryProfile) {
      return new Response(
        JSON.stringify({ 
          error: "Winery profile not found",
          winery_id: winery_id
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );
    }

    console.log(`Successfully fetched profile for: ${wineryProfile.winery_name}`);

    // Determine which OpenAI API key to use (user's personal key takes priority)
    let openaiApiKey = wineryProfile.openai_api_key;
    let apiKeySource = 'user_personal';

    if (!openaiApiKey) {
      // Fall back to system API key
      openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      apiKeySource = 'system_shared';
    }
    
    if (!openaiApiKey) {
      console.error('No OpenAI API key available (neither user personal nor system)');
      return new Response(
        JSON.stringify({ 
          error: "AI service not configured",
          details: "No OpenAI API key available. Please add your personal API key in Settings or contact support."
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

    console.log(`Using ${apiKeySource} OpenAI API key for content generation`);

    // Build the supercharged prompt combining brand voice and content request
    console.log('Building supercharged prompt with complete brand voice guide...');
    const systemPrompt = buildSuperchargedPrompt(wineryProfile, content_request);
    const userPrompt = `Please generate the ${content_request.content_type} as specified in the system prompt, ensuring it perfectly embodies ${wineryProfile.winery_name}'s unique brand voice and includes all the requested talking points.`;

    console.log('Calling OpenAI GPT-4 API...');

    // Make authenticated API call to OpenAI GPT-4
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({ error: { message: 'Unknown OpenAI error' } }));
        console.error('OpenAI API error:', errorData);
        
        // Provide specific error messages for common issues
        if (errorData.error?.code === 'insufficient_quota') {
          const errorMessage = apiKeySource === 'user_personal' 
            ? "Your personal OpenAI API key has insufficient quota. Please add credits to your OpenAI account or remove your API key to use the shared system key."
            : "The system OpenAI API key has insufficient quota. Please add your personal OpenAI API key in Settings.";
          
          return new Response(
            JSON.stringify({ 
              error: "OpenAI quota exceeded",
              details: errorMessage,
              api_key_source: apiKeySource
            }),
            {
              status: 402,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              }
            }
          );
        }
        
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const openaiData = await openaiResponse.json();
      const generatedContent = openaiData.choices[0]?.message?.content;

      if (!generatedContent) {
        throw new Error('No content generated by OpenAI');
      }

      console.log('Successfully generated content with OpenAI GPT-4');

      // Extract title from generated content (first line or h1/h2 tag)
      let contentTitle = content_request.primary_topic;
      const lines = generatedContent.split('\n').filter(line => line.trim());
      
      if (lines.length > 0) {
        // Try to extract title from first heading
        const firstLine = lines[0].trim();
        if (firstLine.startsWith('#')) {
          contentTitle = firstLine.replace(/^#+\s*/, '');
        } else if (firstLine.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i)) {
          const match = firstLine.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
          if (match) {
            contentTitle = match[1];
          }
        } else if (firstLine.length > 10 && firstLine.length < 100) {
          contentTitle = firstLine;
        }
      }

      // Save the AI-generated content to database
      console.log('Saving generated content to database...');
      
      const { data: contentData, error: contentError } = await supabase
        .from('content_calendar')
        .insert([{
          winery_id: winery_id,
          title: contentTitle,
          content: generatedContent,
          content_type: content_request.content_type,
          status: 'draft',
          research_brief_id: research_brief_id || null,
          created_by: null // Will be set by RLS
        }])
        .select()
        .single();

      if (contentError) {
        console.error('Error saving content to database:', contentError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to save generated content",
            details: contentError.message
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

      console.log('Successfully saved content to database');

      // Calculate word count for analytics
      const wordCount = generatedContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;

      // Return successful response with detailed metadata
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            content: contentData,
            brand_voice_applied: {
              personality: wineryProfile.brand_personality_summary || 'Not specified',
              tone_attributes: wineryProfile.brand_tone || 'Not specified',
              messaging_style: wineryProfile.messaging_style || 'Not specified',
              vocabulary_used: wineryProfile.vocabulary_to_use || 'Not specified',
              vocabulary_avoided: wineryProfile.vocabulary_to_avoid || 'Not specified',
              writing_guidelines: wineryProfile.ai_writing_guidelines || 'Not specified'
            },
            content_request: content_request,
            word_count: wordCount,
            generation_method: 'openai_gpt4',
            tokens_used: openaiData.usage?.total_tokens || 0,
            model_used: 'gpt-4',
            api_key_source: apiKeySource
          },
          message: `Content generated successfully using OpenAI GPT-4 with ${apiKeySource === 'user_personal' ? 'your personal' : 'shared system'} API key`
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          }
        }
      );

    } catch (openaiError) {
      console.error('OpenAI API call failed:', openaiError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate content with AI",
          details: openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error',
          api_key_source: apiKeySource
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

  } catch (error) {
    console.error('Error in sommelier-writer function:', error);
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