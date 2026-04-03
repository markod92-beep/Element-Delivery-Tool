import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import seedData from "./seed-data.json";

// Extract the real PostgreSQL URL from the prisma+postgres:// URL
function getRealDbUrl(): string {
  const url = process.env.DATABASE_URL || "";
  const match = url.match(/api_key=(.+)/);
  if (match) {
    try {
      const decoded = JSON.parse(Buffer.from(match[1], "base64").toString());
      return decoded.databaseUrl;
    } catch {
      // fall through
    }
  }
  // If it's already a normal postgres URL, use it directly
  return url;
}

const pool = new Pool({ connectionString: getRealDbUrl() });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function getComplexityCategory(item: string, surcharge: number): string {
  if (item === "Non-Main Floor — House") return "Building & Elevator";
  if (item === "Non-Main Floor — Condo") return "Building & Elevator";
  if (item === "Non-Main Floor — Commercial") return "Building & Elevator";
  if (item === "Height Limitations for Trucks") return "Building & Elevator";
  if (item === "Stair-Only Delivery") return "Building & Elevator";

  if (surcharge === 100) return "Access & Parking";
  if (surcharge === 200) return "Building & Elevator";
  if (surcharge === 300) return "Special Handling";
  return "Other";
}

const configMeta: Record<string, { label: string; category: string }> = {
  warehouseAddress: { label: "Warehouse Address", category: "Warehouse" },
  distanceBand1Max: { label: "Distance Band 1 Max (km)", category: "Distance" },
  distanceBand2Max: { label: "Distance Band 2 Max (km)", category: "Distance" },
  distanceBand3Max: { label: "Distance Band 3 Max (km)", category: "Distance" },
  distanceBand4Max: { label: "Distance Band 4 Max (km)", category: "Distance" },
  maxDeliveryRange: { label: "Max Delivery Range (km)", category: "Distance" },
  densityFlatware: { label: "Density — Mostly Tableware ($)", category: "Truck Density" },
  densityMixed: { label: "Density — Mixed Load ($)", category: "Truck Density" },
  densityFurniture: { label: "Density — Mostly Furniture ($)", category: "Truck Density" },
  ftlThreshold: { label: "FTL Threshold (%)", category: "LTL/FTL" },
  chairSetupRate: { label: "Chair Setup Rate ($)", category: "Setup Rates" },
  tableSetupRate: { label: "Table Setup Rate ($)", category: "Setup Rates" },
  furnitureSetupRate: { label: "Furniture Setup Rate ($)", category: "Setup Rates" },
  minSetupCharge: { label: "Minimum Setup Charge ($)", category: "Setup Rates" },
  labourRate: { label: "Labour Rate ($/hr)", category: "Labour" },
  fuelCostPerKm: { label: "Fuel Cost ($/km)", category: "Labour" },
  truckCostPerKm: { label: "Truck Cost ($/km)", category: "Labour" },
  truckRMPerKm: { label: "Truck R&M ($/km)", category: "Labour" },
  avgDrivingSpeed: { label: "Avg Driving Speed (km/h)", category: "Labour" },
  loadUnloadTime: { label: "Load/Unload Time (min)", category: "Labour" },
  avgInterStopDistance: { label: "Avg Inter-Stop Distance (km)", category: "Labour" },
  freightElevatorCost: { label: "Freight Elevator Cost ($)", category: "Elevator" },
  passengerElevatorCost: { label: "Passenger Elevator Cost ($)", category: "Elevator" },
  noElevatorCost: { label: "No Elevator Cost ($)", category: "Elevator" },
};

async function main() {
  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.windowDiscount.deleteMany();
  await prisma.config.deleteMany();
  await prisma.cfrItem.deleteMany();
  await prisma.complexity.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.distancePricing.deleteMany();
  await prisma.fsaZone.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding FSA zones...");
  for (const zone of seedData.fsaZones) {
    await prisma.fsaZone.create({ data: zone });
  }
  console.log(`  ${seedData.fsaZones.length} FSA zones inserted`);

  console.log("Seeding distance pricing...");
  for (const dp of seedData.distancePricing) {
    await prisma.distancePricing.create({
      data: {
        band: dp.band,
        ltlRate: dp.ltlRate,
        ftlRate: dp.ftlRate,
        minOrder: dp.minOrder,
        rateType: dp.rateType,
        notes: dp.notes || null,
      },
    });
  }
  console.log(`  ${seedData.distancePricing.length} distance pricing bands inserted`);

  console.log("Seeding venues...");
  for (const v of seedData.venues) {
    await prisma.venue.create({
      data: {
        name: v.name,
        altName: v.altName || null,
        associatedFSAs: v.associatedFSAs,
        feeRate: v.feeRate,
        feeType: v.feeType,
        cfrMultiplier: v.cfrMultiplier,
        kmFromWarehouse: v.kmFromWarehouse,
        notes: v.notes || null,
      },
    });
  }
  console.log(`  ${seedData.venues.length} venues inserted`);

  console.log("Seeding complexities...");
  for (let i = 0; i < seedData.complexities.length; i++) {
    const c = seedData.complexities[i];
    await prisma.complexity.create({
      data: {
        item: c.item,
        surcharge: c.surcharge,
        category: getComplexityCategory(c.item, c.surcharge),
        notes: c.notes || null,
        sortOrder: i,
      },
    });
  }
  console.log(`  ${seedData.complexities.length} complexities inserted`);

  console.log("Seeding CFR items...");
  for (let i = 0; i < seedData.cfrItems.length; i++) {
    const item = seedData.cfrItems[i];
    await prisma.cfrItem.create({
      data: {
        name: item.name,
        truckCapacity: item.truckCapacity,
        setupTimeMin: item.setupTimeMin,
        category: item.category,
        sortOrder: i,
      },
    });
  }
  console.log(`  ${seedData.cfrItems.length} CFR items inserted`);

  console.log("Seeding config...");
  const configData = seedData.config as Record<string, string | number>;
  const configEntries = Object.entries(configData);
  for (const [key, value] of configEntries) {
    const meta = configMeta[key] || { label: key, category: "Other" };
    await prisma.config.create({
      data: {
        key,
        value: String(value),
        label: meta.label,
        category: meta.category,
      },
    });
  }
  console.log(`  ${configEntries.length} config values inserted`);

  console.log("Seeding window discounts...");
  for (const wd of seedData.windowDiscounts) {
    await prisma.windowDiscount.create({
      data: {
        direction: wd.direction,
        startTime: wd.startTime,
        twoHr: wd.twoHr,
        fourHrAM: wd.fourHrAM,
        fourHrPM: wd.fourHrPM,
        eightHr: wd.eightHr,
      },
    });
  }
  console.log(`  ${seedData.windowDiscounts.length} window discounts inserted`);

  console.log("Creating admin user...");
  const email = process.env.ADMIN_EMAIL || "admin@element.ca";
  const password = process.env.ADMIN_PASSWORD || "changeme123";
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      name: "Admin",
      passwordHash,
      role: "admin",
    },
  });
  console.log(`  Admin user created: ${email}`);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
