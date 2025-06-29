# Craft Amplify Deployment & Testing Checklist

## Phase 1: Environment Setup

### 1.1 Supabase Project Setup
- [ ] Create new Supabase project
- [ ] Note down project URL and anon key
- [ ] Generate service role key
- [ ] Configure environment variables

### 1.2 Environment Variables (.env file)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_key_here
```

### 1.3 Database Migration
- [ ] Run all migration files in order
- [ ] Verify all tables are created
- [ ] Check RLS policies are active
- [ ] Verify indexes are created

## Phase 2: Edge Functions Deployment

### 2.1 Deploy Core Functions
- [ ] analyze-brand-voice
- [ ] generate-content
- [ ] scan-local-events
- [ ] ingest-raw-events

### 2.2 Deploy Agent Functions
- [ ] terroir-research
- [ ] vintage-strategist
- [ ] sommelier-writer
- [ ] cellar-master

### 2.3 Deploy Utility Functions
- [ ] test-wordpress

### 2.4 Configure Function Secrets
- [ ] SUPABASE_URL
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] OPENAI_API_KEY

## Phase 3: Frontend Deployment

### 3.1 Install Dependencies
```bash
npm install
```

### 3.2 Build and Test
```bash
npm run build
npm run preview
```

### 3.3 Deploy to Hosting
- [ ] Deploy to Netlify/Vercel
- [ ] Configure environment variables
- [ ] Test production build

## Phase 4: System Testing

### 4.1 Connection Tests
- [ ] Database connectivity
- [ ] Edge Functions availability
- [ ] OpenAI API access
- [ ] Authentication flow

### 4.2 Core Workflow Tests
- [ ] User registration/login
- [ ] Onboarding wizard
- [ ] Brand voice analysis
- [ ] Content generation
- [ ] Event engine
- [ ] WordPress integration

### 4.3 Performance Tests
- [ ] Page load times
- [ ] API response times
- [ ] Large content handling
- [ ] Concurrent user testing

## Phase 5: End-to-End Testing

### 5.1 Complete User Journey
- [ ] New user signup
- [ ] Complete onboarding
- [ ] Generate first content
- [ ] Schedule content
- [ ] View analytics

### 5.2 Edge Cases
- [ ] Invalid inputs
- [ ] Network failures
- [ ] API rate limits
- [ ] Large file uploads