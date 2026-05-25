# Technical Bulletins Feature

## Overview
The Technical Bulletins feature allows you to create, manage, and distribute professional technical bulletins to your wireline company customers. Each bulletin can be saved to the database and later retrieved for editing or PDF generation.

## Database Setup

### Required Table
Before using this feature, you need to create the `technical_bulletins` table in your Supabase database.

**Run this SQL in your Supabase SQL Editor:**
```sql
-- See the complete SQL migration in: /database-migrations/technical_bulletins.sql
```

The table includes:
- Basic bulletin information (number, title, date, severity)
- Affected products and parts (arrays)
- Distribution list (array)
- Content fields (summary, background, technical details)
- Recommended actions (array)
- Role types (array)  
- Problem and fix images with captions (JSONB)
- Timestamps for created_at and updated_at

## Features

### 1. Technical Bulletins List (`/technical-bulletins`)
- **View all bulletins** in a searchable, filterable list
- **Search** by bulletin number, title, or summary
- **Filter** by severity level (Critical, High, Medium, Low, Information)
- **Quick actions**: View, Edit, Generate PDF, or Delete
- **Create new bulletin** button

### 2. Create/Edit Bulletin (`/technical-bulletin/new` or `/technical-bulletin/:id/edit`)
- **Bulletin Details**:
  - Bulletin Number (e.g., "2024-001")
  - Date
  - Title/Subject
  - Severity Level (badge selection)
  - Affected Products (multi-select badges)
  - Affected Parts (dropdown multi-select from database)
  - Distribution List (comma-separated text)
  - Summary (required)
  - Background (optional)
  - Technical Details (required)
  - Recommended Actions (dynamic list)
  - Role Types (multi-select: Service Quality Rep, District Rep, Sales Rep, Executive Management)

- **Images**:
  - Problem/Failure Images (red-themed section)
  - Fix/Solution Images (green-themed section)
  - Each image can have an optional caption
  - Images are base64 encoded and stored in JSONB

- **Actions**:
  - **Save Bulletin**: Saves to database for later editing
  - **Generate PDF**: Creates and downloads a formatted PDF report
  - **Back to List**: Returns to bulletins list

### 3. PDF Generation
- Professional, branded technical bulletin PDFs
- Includes all bulletin details
- Problem images displayed with red theme
- Fix images displayed with green theme
- Optional image captions
- Severity-color-coded headers

## Navigation

The Technical Bulletins feature is accessible from:
- **Sidebar**: Customer section → "Tech Bulletins"
- **Direct URLs**:
  - List: `/technical-bulletins`
  - Create: `/technical-bulletin/new`
  - Edit: `/technical-bulletin/:id/edit`

## Workflow

### Creating a New Bulletin
1. Navigate to `/technical-bulletins`
2. Click "Create New Bulletin"
3. Fill in all required fields (marked with *)
4. Add optional images with captions
5. Click "Save Bulletin" to store in database
6. Click "Generate Technical Bulletin PDF" to create PDF

### Editing an Existing Bulletin
1. Navigate to `/technical-bulletins`
2. Click the Edit icon on any bulletin
3. Modify fields as needed
4. Click "Update Bulletin" to save changes
5. Generate new PDF if needed

### Generating PDFs
- Can generate PDFs from both the list view and edit view
- PDFs include all saved data
- Multiple PDFs can be generated from the same bulletin

## Technical Details

### Key Files
- `/src/app/pages/TechnicalBulletins.tsx` - List/management view
- `/src/app/pages/TechnicalBulletin.tsx` - Create/edit form
- `/src/app/lib/generateTechnicalBulletinPDF.ts` - PDF generation logic
- `/src/app/routes.tsx` - Routing configuration
- `/src/app/components/ui/sidebar.tsx` - Navigation

### Data Model
```typescript
interface TechnicalBulletin {
  id: string;
  bulletin_number: string;
  title: string;
  date: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Information';
  affected_products: string[];
  affected_parts: string[];
  distribution_list: string[];
  summary: string;
  background: string | null;
  technical_details: string;
  recommended_actions: string[];
  role_types: string[];
  problem_images: Array<{ url: string; caption: string }>;
  fix_images: Array<{ url: string; caption: string }>;
  created_at: string;
  updated_at: string;
}
```

### Affected Parts Source
Affected parts are dynamically loaded from the `lists` table's `failed_component` column, ensuring consistency with your existing incident data.

## Security

The `technical_bulletins` table includes Row Level Security (RLS) policies:
- Authenticated users can read all bulletins
- Authenticated users can create, update, and delete bulletins
- Adjust policies as needed for your specific requirements

## Future Enhancements

Potential improvements:
- Email distribution directly from the app
- Bulletin templates
- Version history
- Approval workflow
- Analytics on bulletin views/downloads
- Export to formats other than PDF (Word, HTML, etc.)
