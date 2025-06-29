#!/bin/bash

# Craft Amplify Edge Functions Deployment Script
# This script deploys all Edge Functions to Supabase

echo "🚀 Deploying Craft Amplify Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "supabase login"
    exit 1
fi

echo "📋 Deploying Edge Functions..."

# Array of Edge Functions to deploy
functions=(
    "analyze-brand-voice"
    "generate-content"
    "scan-local-events"
    "ingest-raw-events"
    "terroir-research"
    "vintage-strategist"
    "sommelier-writer"
    "cellar-master"
    "test-wordpress"
)

# Deploy each function
for func in "${functions[@]}"; do
    echo "📤 Deploying $func..."
    if supabase functions deploy $func; then
        echo "✅ $func deployed successfully"
    else
        echo "❌ Failed to deploy $func"
        exit 1
    fi
done

echo ""
echo "🎉 All Edge Functions deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Configure function secrets in Supabase dashboard"
echo "2. Set environment variables:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - OPENAI_API_KEY"
echo "3. Run the test script to verify deployment"