# Manual Edge Function Deployment

The Figma Make integration is experiencing a 403 authentication error when deploying to Supabase. Here are alternative deployment methods:

## Option 1: Supabase Dashboard (Recommended)

1. Visit: https://supabase.com/dashboard/project/gbllxumuogsncoiaksum/functions

2. Click "New Function" or edit existing "make-server"

3. Copy ALL code from `/supabase/functions/server/index.tsx` and `/supabase/functions/server/kv_store.tsx`

4. Deploy the function

## Option 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref gbllxumuogsncoiaksum

# Deploy
cd supabase/functions
supabase functions deploy make-server --project-ref gbllxumuogsncoiaksum
```

## Option 3: REST API Direct Deploy

If you have a Supabase access token with Edge Functions permissions:

```bash
curl -X POST \
  'https://api.supabase.com/v1/projects/gbllxumuogsncoiaksum/functions/make-server/deploy' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  --data-binary @supabase/functions/server/index.tsx
```

## Troubleshooting the 403 Error

The 403 error means:
- Figma Make's Supabase integration token is invalid/expired
- The token lacks Edge Functions deployment permissions
- Try disconnecting and reconnecting Supabase in Figma Make

## Check if Function is Already Running

Your function might already be deployed! Test it:

```bash
curl https://gbllxumuogsncoiaksum.supabase.co/functions/v1/make-server-64775d98/health
```

If you get `{"status":"ok"}`, the function is working and you don't need to redeploy.
