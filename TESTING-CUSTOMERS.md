# Testing Customers & Districts - New Database Integration

## Overview
The application has been updated to work directly with your Supabase database tables instead of the KV store.

## What's Changed

### Backend (`/supabase/functions/server/`)
- **New file**: `api-routes.tsx` - Contains all CRUD endpoints for your database tables
- **Updated**: `index.tsx` - Now imports and mounts the new API routes

### Frontend
- **New file**: `/src/app/pages/CustomersNew.tsx` - Complete rewrite using real database
- **Updated**: `/src/app/routes.tsx` - Now uses `CustomersNew` component

## API Endpoints Created

### Customers
- `GET /make-server-64775d98/customers` - Get all customers
- `POST /make-server-64775d98/customers` - Create a customer
- `PUT /make-server-64775d98/customers/:id` - Update a customer
- `DELETE /make-server-64775d98/customers/:id` - Delete a customer

### Districts
- `GET /make-server-64775d98/districts` - Get all districts (with customer names populated)
- `POST /make-server-64775d98/districts` - Create a district
- `PUT /make-server-64775d98/districts/:id` - Update a district
- `DELETE /make-server-64775d98/districts/:id` - Delete a district

## Testing Steps

### 1. Deploy Backend
Deploy your updated backend using your manual deployment process.

### 2. Test Customers Tab
1. Log in to your application
2. Navigate to "Customers" in the sidebar
3. You should see the "Customers" tab showing your existing customers from the `customers` table
4. **Test Create**: Click "Add Customer"
   - Enter a customer name
   - Optionally add a logo path
   - Click "Create"
   - Verify it appears in the table
5. **Test Edit**: Click the edit icon on a customer
   - Modify the name or logo
   - Click "Update"
   - Verify changes are saved
6. **Test Delete**: Click the delete icon
   - Confirm deletion
   - Verify customer is removed

### 3. Test Districts Tab
1. Click the "Districts" tab
2. You should see your existing districts with customer names displayed (not UUIDs!)
3. **Test Create**: Click "Add District"
   - Select a customer from dropdown
   - Enter district ID (e.g., "BWL_FAR")
   - Enter district name (e.g., "BWL-Farmington")
   - Enter address
   - Optionally add contact info
   - Click "Create"
   - Verify it appears with the customer name
4. **Test Edit**: Click edit on a district
   - Modify any fields
   - Click "Update"
   - Verify changes are saved
5. **Test Delete**: Click delete
   - Confirm deletion
   - Verify district is removed

### 4. Verify Data Integrity
1. Check that customer names appear correctly (not UUIDs)
2. Check that when you create a district, the customer name is automatically populated
3. Verify all your existing data from the database is showing correctly

## What to Look For

### ✅ Success Indicators
- Customer names display instead of UUIDs in districts table
- All CRUD operations work smoothly
- Toast notifications appear on success/error
- Data persists after refresh
- Existing data from your database loads correctly

### ❌ Potential Issues
- If you see errors, check browser console for details
- If data doesn't load, verify backend deployment was successful
- If foreign keys don't resolve, check that `row_id` values match between tables

## Next Steps After Testing

Once Customers & Districts are working:
1. I'll create the new Field Visits page (using `fieldvisits` table)
2. I'll create the new Incidents page (using `incidents` table with all fields)
3. I'll create the new Panels page (using `panels` table)
4. Update Dashboard to use real database queries
5. Update Reports to aggregate from real tables

## Database Schema Reference

### customers table
- `row_id` (primary key)
- `customer` (name)
- `customer_logo` (logo path)

### districts table
- `row_id` (primary key)
- `customer` (foreign key → customers.row_id)
- `customer_district_id` (district ID code)
- `customer_district` (district name)
- `customer_address`
- `district_contact`
- `customer_email`
- `customer_phone_number`
- `customer_name` (denormalized for quick access)
- `customer_logo` (denormalized for quick access)
