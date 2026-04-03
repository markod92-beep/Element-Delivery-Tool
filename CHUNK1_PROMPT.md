# Chunk 1: Database Schema + Seed Data + Auth

## Context

This is an internal delivery pricing calculator for Element Event Solutions, a $60M event rental company in Markham, Ontario. The app is deployed on Vercel with Supabase Postgres. The current codebase is a fresh Next.js 16 scaffold with Prisma 7.6 and a placeholder `Test` model.

The file `prisma/seed-data.json` contains all reference data extracted from the company's V6 Excel pricing tool: 518 FSA postal codes, 7 distance pricing bands, 38 key venues, 16 complexity surcharges, 52 furniture items, 24 config values, and 4 window discount rules.

## What to build

### Step 1: Replace the Prisma schema

Replace the current `prisma/schema.prisma` with the full schema below. Keep the existing generator and datasource config (prisma-client output to ../src/generated/prisma, postgresql provider). Delete the `Test` model.

**Tables needed:**

```
User
- id (cuid, PK)
- email (unique)
- name
- passwordHash
- role (default "user" — values: "user" or "admin")
- isActive (default true)
- createdAt, updatedAt, lastLogin (nullable)
- Relations: quotes[], auditLogs[]

FsaZone
- id (autoincrement, PK)
- fsa (unique, 3-char postal code prefix, e.g., "M5V")
- zone (location name, e.g., "Toronto", "Oakville")
- description (e.g., "Scarborough — Agincourt")
- distanceKm (Float)
- distanceBand (e.g., "Toronto", "0-25km", "50-75km")
- isActive (default true)
- regionId (nullable String — for future multi-province)

DistancePricing
- id (autoincrement, PK)
- band (unique, e.g., "0-25km", "Downtown Core")
- ltlRate (Float — less-than-truckload rate in $)
- ftlRate (Float — full-truckload rate in $)
- minOrder (Float — minimum order $ for this band)
- rateType (e.g., "Flat" or "Per KM")
- notes
- isActive (default true)
- regionId (nullable String)

Venue
- id (autoincrement, PK)
- name (unique)
- altName (nullable)
- associatedFSAs (comma-separated FSA codes)
- feeRate (Float — either a % or flat $)
- feeType ("% of Revenue" or "Flat Rate ($)")
- cfrMultiplier (Float, default 1.0 — difficulty multiplier for installation calc)
- kmFromWarehouse (Float)
- notes
- isActive (default true)
- regionId (nullable String)

Complexity
- id (autoincrement, PK)
- item (unique, e.g., "Shopping Mall", "Hotel Delivery")
- surcharge (Float, in $)
- category (assign based on surcharge: $100 items = "Access & Parking", $200 items = "Building & Elevator", $300 items = "Special Handling". Exceptions: "Non-Main Floor — House" is $100 but category "Building & Elevator"; "Non-Main Floor — Condo" and "Non-Main Floor — Commercial" are $200 and "Building & Elevator"; "Height Limitations for Trucks" is $200 and "Building & Elevator"; "Stair-Only Delivery" is $300 and "Building & Elevator")
- notes
- isActive (default true)
- sortOrder (Int — for display ordering)

CfrItem (Capacity/Fill Rate items — furniture for Installation Calculator)
- id (autoincrement, PK)
- name (unique)
- truckCapacity (Int — how many fit on one truck)
- setupTimeMin (Float — minutes per piece to set up)
- category (e.g., "Tables", "Seating", "Bars", "Sofas", etc.)
- isActive (default true)
- sortOrder (Int)

Config
- id (autoincrement, PK)
- key (unique String)
- value (String — store everything as string, parse in app)
- label (human-readable name)
- category (grouping: "Warehouse", "Distance", "Truck Density", "LTL/FTL", "Setup Rates", "Labour", "Elevator")
- isEditable (default true)
- regionId (nullable String)

WindowDiscount
- id (autoincrement, PK)
- direction ("Delivery" or "Pickup")
- startTime ("8AM-12PM" or "12PM Onwards")
- twoHr (Float — multiplier, e.g., -0.4 means 40% surcharge)
- fourHrAM (Float)
- fourHrPM (Float)
- eightHr (Float — e.g., 0.25 means 25% discount)
- isActive (default true)
- regionId (nullable String)

Quote
- id (cuid, PK)
- quoteNumber (auto-generated, unique, e.g., "EES-2026-0001")
- calculatorType ("delivery" or "installation")
- userId (FK to User)
- orderRef (nullable — customer's order # or reference)
- eventDate (nullable DateTime)
- fsa (the FSA entered)
- zoneName (resolved zone name)
- distanceKm (Float)
- productRevenue (Float, nullable)
- densityType (nullable — "Mostly Tableware", "Mixed Load", "Mostly Furniture")
- trucksCharged (Int)
- loadType ("LTL" or "FTL")
- baseDeliveryFee (Float)
- venueName (nullable)
- venueFee (Float, default 0)
- complexitySurcharges (JSON — array of {item, surcharge})
- totalComplexity (Float)
- elevatorType (nullable)
- elevatorFee (Float, default 0)
- deliveryWindow (nullable)
- deliveryWindowAdjustment (Float, default 0)
- pickupWindow (nullable)
- pickupWindowAdjustment (Float, default 0)
- setupChairs (Int, default 0)
- setupTables (Int, default 0)
- setupFurniture (Int, default 0)
- setupFee (Float, default 0)
- installationLabourCost (Float, default 0)
- installationItems (JSON, nullable — for installation calc)
- totalDeliveryCost (Float)
- notes (nullable text)
- status (default "draft" — values: "draft", "sent", "accepted", "expired")
- createdAt, updatedAt
- parentQuoteId (nullable String, FK to self — for future versioning)
- version (Int, default 1)
- customerId (nullable String — for future customer management)
- expiresAt (nullable DateTime)
- Relations: user, parentQuote?, childQuotes[]

AuditLog
- id (cuid, PK)
- userId (FK to User)
- action ("create", "update", "delete")
- tableName (which table was changed)
- recordId (which record)
- oldValue (JSON, nullable)
- newValue (JSON, nullable)
- createdAt
- Relations: user
```

### Step 2: Create the seed script

Create `prisma/seed.ts` that reads `prisma/seed-data.json` and populates all reference tables. The seed script should:

1. Clear existing data in correct order (respect foreign keys)
2. Insert all FSA zones (518 rows)
3. Insert distance pricing bands (7 rows)
4. Insert venues (38 rows)
5. Insert complexities (16 rows) — assign categories as described above
6. Insert CFR items (52 rows) with sortOrder matching array index
7. Insert config values (24 keys) with proper labels and categories
8. Insert window discounts (4 rows)
9. Create an initial admin user: email from env var `ADMIN_EMAIL` (default "admin@element.ca"), password from env var `ADMIN_PASSWORD` (default "changeme123"), name "Admin", role "admin". Hash the password with bcrypt.

Add seed command to package.json: `"prisma:seed": "npx tsx prisma/seed.ts"`

Also add to package.json under prisma config:
```json
"prisma": {
  "seed": "npx tsx prisma/seed.ts"
}
```

Install required deps: `bcryptjs`, `@types/bcryptjs`, `tsx`

### Step 3: Set up NextAuth

Install `next-auth@4` (v4, not v5 — more stable with this stack) and `@auth/prisma-adapter`.

IMPORTANT: Do NOT use @auth/prisma-adapter — it expects specific table names. Instead, use a custom credentials provider with manual Prisma queries.

Create auth configuration:
- Credentials provider (email + password)
- bcrypt password comparison
- JWT session strategy (not database sessions — simpler with Vercel)
- Session includes user id, role, and name
- Auth API route at `src/app/api/auth/[...nextauth]/route.ts`

Create a simple login page at `src/app/login/page.tsx`:
- Email and password fields
- Element brand styling (Teal #1C3B42 background, Off White #F7F3EC text/inputs, Mint Green #C0DEC7 accents)
- Error message display
- Redirect to / on success

Create auth middleware (`middleware.ts` at project root):
- Protect all routes except /login and /api/auth
- Redirect unauthenticated users to /login

Create a session provider wrapper component.

Replace the current home page (`src/app/page.tsx`) with a simple dashboard:
- Show "Welcome, [user name]" with a logout button
- Navigation links to /quote/delivery and /quote/installation (these pages don't exist yet — just show the links)
- Element brand styling

### Step 4: Environment variables

Add to `.env.example`:
```
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXTAUTH_SECRET="generate-a-secret-here"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@element.ca"
ADMIN_PASSWORD="changeme123"
```

### Step 5: Run migration and test

After all files are created:
1. Run `npx prisma migrate dev --name init` to create the database tables
2. Run the seed script to populate reference data
3. Run `npm run dev` and verify:
   - Login page renders
   - Can log in with admin credentials
   - Dashboard shows after login
   - Logout works

## Important constraints

- Keep the existing prisma.config.ts and src/lib/prisma.ts patterns for the Prisma client — they use @prisma/adapter-pg which is already configured for Supabase
- Use the existing Tailwind v4 setup (no tailwind.config.js — it uses the new CSS-based config in globals.css)
- All database operations use soft deletes (isActive = false) never hard deletes
- Every reference table has a nullable regionId field for future multi-province expansion — do NOT build any UI for this, just include the field
- The Quote model has nullable Phase 2 fields (parentQuoteId, version, customerId, expiresAt) — do NOT build UI for these yet
