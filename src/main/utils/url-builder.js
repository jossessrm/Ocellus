/**
 * Builds Inara.cz commodity market search URLs from human-readable parameters.
 *
 * Usage:
 *   import { buildUrl, findCommodity } from "./url-builder.js";
 *
 *   const { url, resolved, warnings } = buildUrl({
 *     items: "Gold",
 *     system: "Sol",
 *     mode: "buy",
 *     minLandingPad: "L"
 *   });
 */

// List of commodities IDs used by Inara.cz to generate GET url petitions
export const COMMODITY_IDS = {
  "Advanced Catalysers": 61,
  "Advanced Medicines": 166,
  "Agri-Medicines": 1,
  "Agronomic Treatment": 10268,
  "AI Relics": 89,
  Alexandrite: 10249,
  Algae: 15,
  Aluminium: 37,
  "Ancient Artefact": 121,
  "Ancient Key": 10240,
  "Animal Meat": 16,
  "Animal Monitors": 62,
  "Anomaly Particles": 10270,
  "Antimatter Containment Unit": 10167,
  "Antique Jewellery": 10209,
  Antiquities: 91,
  "Aquaponic Systems": 63,
  "Articulation Motors": 182,
  "Assault Plans": 169,
  "Atmospheric Processors": 87,
  "Auto-Fabricators": 65,
  "Basic Medicines": 33,
  "Battle Weapons": 88,
  Bauxite: 51,
  Beer: 10,
  Benitoite: 10247,
  Bertrandite: 52,
  Beryllium: 38,
  "Bioreducing Lichen": 66,
  Biowaste: 76,
  Bismuth: 106,
  "Black Box": 122,
  "Bone Fragments": 10456,
  "Bootleg Liquor": 95,
  Bromellite: 148,
  "Building Fabricators": 102,
  "Caustic Tissue Sample": 10439,
  "Ceramic Composites": 100,
  "Chemical Waste": 32,
  Clothing: 7,
  "CMM Composite": 140,
  Cobalt: 39,
  Coffee: 17,
  Coltan: 55,
  "Combat Stabilisers": 34,
  "Commercial Samples": 170,
  "Computer Components": 67,
  "Conductive Fabrics": 165,
  "Consumer Technology": 8,
  Copper: 40,
  "Coral Sap": 10451,
  "Crop Harvesters": 29,
  Cryolite: 110,
  "Cyst Specimen": 10459,
  "Damaged Escape Pod": 10215,
  "Data Core": 10166,
  "Diplomatic Bag": 171,
  "Domestic Appliances": 9,
  "Earth Relics": 10210,
  "Emergency Power Cells": 158,
  "Encrypted Correspondence": 172,
  "Encrypted Data Storage": 173,
  "Energy Grid Assembly": 149,
  "Evacuation Shelter": 99,
  "Exhaust Manifold": 159,
  "Experimental Chemicals": 123,
  Explosives: 3,
  Fish: 18,
  "Food Cartridges": 19,
  "Fossil Remnants": 10221,
  "Fruit and Vegetables": 20,
  Gallite: 56,
  Gallium: 41,
  "Gene Bank": 10211,
  "Geological Equipment": 103,
  "Geological Samples": 174,
  Gold: 42,
  Goslarite: 111,
  Grain: 21,
  Grandidierite: 10248,
  "Guardian Casket": 10153,
  "Guardian Orb": 10154,
  "Guardian Relic": 10155,
  "Guardian Tablet": 10156,
  "Guardian Totem": 10157,
  "Guardian Urn": 10158,
  "H.E. Suits": 68,
  Haematite: 10486,
  "Hafnium 178": 124,
  "Hardware Diagnostic Sensor": 155,
  "Heatsink Interlink": 151,
  "HN Shock Mount": 150,
  Hostages: 175,
  "Hydrogen Fuel": 4,
  "Hydrogen Peroxide": 138,
  "Imperial Slaves": 49,
  "Impure Spire Mineral": 10452,
  Indite: 57,
  Indium: 43,
  "Insulating Membrane": 141,
  "Ion Distributor": 160,
  Jadeite: 168,
  "Land Enrichment Systems": 71,
  Landmines: 118,
  Lanthanum: 107,
  "Large Survey Data Cache": 125,
  Leather: 73,
  Lepidolite: 58,
  "Liquid oxygen": 137,
  Liquor: 11,
  Lithium: 44,
  "Lithium Hydroxide": 147,
  "Low Temperature Diamonds": 144,
  "Magnetic Emitter Coil": 152,
  "Marine Equipment": 86,
  "Medical Diagnostic Equipment": 154,
  "Meta-Alloys": 101,
  "Methane Clathrate": 145,
  "Methanol Monohydrate Crystals": 146,
  "Micro-weave Cooling Hoses": 185,
  "Microbial Furnaces": 85,
  "Micro Controllers": 156,
  "Military Grade Fabrics": 157,
  "Military Intelligence": 126,
  "Military Plans": 127,
  "Mineral Extractors": 31,
  "Mineral Oil": 5,
  "Modular Terminals": 181,
  Moissanite: 116,
  "Mollusc Brain Tissue": 10256,
  "Mollusc Fluid": 10255,
  "Mollusc Membrane": 10252,
  "Mollusc Mycelium": 10253,
  "Mollusc Soft Tissue": 10254,
  "Mollusc Spores": 10251,
  Monazite: 10245,
  "Muon Imager": 119,
  Musgravite: 10246,
  "Mysterious Idol": 10219,
  Nanobreakers: 167,
  Narcotics: 12,
  "Natural Fabrics": 74,
  "Neofabric Insulation": 183,
  "Nerve Agents": 96,
  "Non-Lethal Weapons": 78,
  "Occupied Escape Pod": 129,
  "Onionhead Gamma Strain": 10435,
  "Organ Sample": 10458,
  Osmium: 72,
  Painite: 84,
  Palladium: 45,
  "Performance Enhancers": 35,
  "Personal Effects": 10159,
  "Personal Weapons": 79,
  Pesticides: 6,
  Platinum: 81,
  "Pod Core Tissue": 10259,
  "Pod Dead Tissue": 10257,
  "Pod Mesoglea": 10262,
  "Pod Outer Tissue": 10260,
  "Pod Shell Tissue": 10261,
  "Pod Surface Tissue": 10258,
  "Pod Tissue": 10263,
  "Political Prisoners": 177,
  Polymers: 26,
  "Power Converter": 153,
  "Power Generators": 83,
  "Power Transfer Bus": 161,
  Praseodymium: 143,
  "Precious Gems": 10165,
  "Progenitor Cells": 36,
  "Prohibited Research Materials": 10220,
  "Protective Membrane Scrap": 10449,
  "Prototype Tech": 130,
  Pyrophyllite: 112,
  "Radiation Baffle": 162,
  "Rare Artwork": 131,
  "Reactive Armour": 80,
  "Rebel Transmissions": 132,
  "Reinforced Mounting Plate": 163,
  "Resonating Separators": 69,
  Rhodplumsite: 10243,
  Robotics: 70,
  "Rockforth Fertiliser": 10264,
  Rutile: 59,
  Samarium: 142,
  "SAP 8 Core Container": 90,
  "Scientific Research": 178,
  "Scientific Samples": 179,
  Scrap: 77,
  "Semi-Refined Spire Mineral": 10453,
  Semiconductors: 28,
  Serendibite: 10244,
  Silver: 46,
  "Skimmer Components": 104,
  Slaves: 53,
  "Small Survey Data Cache": 10208,
  "Space Pioneer Relics": 10164,
  Steel: 10487,
  "Structural Regulators": 117,
  Superconductors: 27,
  "Surface Stabilisers": 97,
  "Survival Equipment": 164,
  "Synthetic Fabrics": 75,
  "Synthetic Meat": 23,
  "Synthetic Reagents": 98,
  Taaffeite: 120,
  "Tactical Data": 180,
  Tantalum: 47,
  Tea: 22,
  "Technical Blueprints": 133,
  "Telemetry Suite": 184,
  Thallium: 108,
  "Thargoid Basilisk Tissue Sample": 10236,
  "Thargoid Bio-storage Capsule": 10450,
  "Thargoid Biological Matter": 10160,
  "Thargoid Cyclops Tissue Sample": 10234,
  "Thargoid Glaive Tissue Sample": 10441,
  "Thargoid Heart": 10235,
  "Thargoid Hydra Tissue Sample": 10239,
  "Thargoid Link": 10161,
  "Thargoid Medusa Tissue Sample": 10237,
  "Thargoid Orthrus Tissue Sample": 10438,
  "Thargoid Probe": 186,
  "Thargoid Resin": 10162,
  "Thargoid Scout Tissue Sample": 10238,
  "Thargoid Scythe Tissue Sample": 10448,
  "Thargoid Sensor": 10226,
  "Thargoid Technology Samples": 10163,
  "Thermal Cooling Units": 105,
  Thorium: 109,
  "Time Capsule": 10212,
  "Titan Deep Tissue Sample": 10442,
  Titanium: 48,
  "Titan Drive Component": 10457,
  "Titan Maw Deep Tissue Sample": 10445,
  "Titan Maw Partial Tissue Sample": 10446,
  "Titan Maw Tissue Sample": 10447,
  "Titan Partial Tissue Sample": 10444,
  "Titan Tissue Sample": 10443,
  Tobacco: 13,
  "Toxic Waste": 54,
  "Trade Data": 134,
  "Trinkets of Hidden Fortune": 135,
  Tritium: 10269,
  "Unclassified Relic": 10437,
  "Unoccupied Escape Pod": 10440,
  "Unstable Data Core": 176,
  Uraninite: 60,
  Uranium: 50,
  "Void Opal": 10250,
  Water: 139,
  "Water Purifiers": 82,
  Wine: 14,
  "Wreckage Components": 10207,
};

const COMMODITY_INDEX = Object.fromEntries(Object.entries(COMMODITY_IDS).map(([k, v]) => [k.toLowerCase(), { name: k, id: v }]));

const MODE = { buy: 1, sell: 2 };
const ORDER_BY = { price: 1, supply: 2, demand: 2, distance: 3, update: 4 };
const LANDING_PAD = { any: 0, small: 1, medium: 2, large: 3 };
const SURFACE_STATIONS = { yes: 0, yes_no_odyssey: 2, no: 1 };
const FLEET_CARRIERS = { yes: 0, yes_updated: 2, no: 1 };
const STRONGHOLD_CARRIERS = { yes: 0, only_pledged: 2, no: 1 };
const PRICE_AGE_VALID = new Set([0, 1, 8, 16, 24, 48, 72, 168, 336, 720, 4320]);
const isValidPriceCond = (val) => val === -1 || (val >= 0 && val <= 99);

const POWER = {
  any: 0,
  none: -1,
  "aisling duval": 2,
  "archon delaine": 10,
  "arissa lavigny-duval": 4,
  "denton patreus": 1,
  "edmund mahon": 3,
  "felicia winters": 5,
  "jerome archer": 12,
  "li yong-rui": 7,
  "nakato kaine": 13,
  "pranav antal": 9,
  "yuri grom": 11,
  "zemina torval": 8,
};

const POWERPLAY_STATE = {
  unoccupied: 0,
  expansion: 1,
  contested: 2,
  exploited: 3,
  fortified: 4,
  stronghold: 5,
};

/**
 * Finds a commodity by name or partial match.
 * @param {string} query - The commodity name or partial name to search for.
 * @returns {Object|null} The commodity object if found, otherwise null.
 */
export function findCommodity(query) {
  const q = query.toLowerCase().trim();
  if (COMMODITY_INDEX[q]) return COMMODITY_INDEX[q];
  const partial = Object.entries(COMMODITY_INDEX).find(([k]) => k.includes(q) || q.includes(k));
  return partial ? partial[1] : null;
}

/**
 * Builds an Inara.cz commodity market search URL from human-readable parameters.
 * @param {Object} opts - The search options.
 * @param {string|string[]} [opts.items] - The commodity name(s) to search for.
 * @param {string} [opts.system="Sol"] - The reference star system.
 * @param {string} [opts.mode="buy"] - The market mode ('buy' or 'sell').
 * @param {number} [opts.maxSystemDistance=0] - Maximum jump distance in Light Years (Ly).
 * @param {string} [opts.minLandingPad="L"] - Minimum landing pad size.
 * @param {number} [opts.maxStationDistance=0] - Maximum distance from the arrival star in Light Seconds (Ls).
 * @param {string} [opts.orderBy="distance"] - The sorting metric for the results.
 * @param {number} [opts.maxPriceAge=0] - Maximum age of the market data in hours.
 * @param {number} [opts.priceCondition=0] - Market price filter.
 * @param {number} [opts.minSupply=0] - Minimum supply or demand.
 * @param {string} [opts.surfaceStations="no"] - Include planetary surface ports.
 * @param {string} [opts.fleetCarriers="no"] - Include player-owned Fleet Carriers in results.
 * @param {string} [opts.strongholdCarriers="no"] - Include stronghold carriers in results.
 * @param {string} [opts.power="any"] - Filter by Powerplay power name.
 * @param {string|string[]} [opts.powerplayState=[]] - Filter by Powerplay states.
 * @param {string} [opts.minorFaction=""] - Filter by a specific local minor faction name.
 * @returns {Object} An object containing the generated URL, resolved commodities, and warnings.
 */
export function buildUrl(opts = {}) {
  const {
    items,
    system = "Sol",
    mode = "buy",
    maxSystemDistance = 0,
    minLandingPad = "L",
    maxStationDistance = 0,
    orderBy = "distance",
    maxPriceAge = 0,
    priceCondition = 0,
    minSupply = 0,
    surfaceStations = "no",
    fleetCarriers = "no",
    strongholdCarriers = "no",
    power = "any",
    powerplayState = [],
    minorFaction = "",
  } = opts;

  const warnings = [];

  const itemList = Array.isArray(items) ? items : [items];
  const resolved = [];
  for (const name of itemList) {
    const found = findCommodity(name);
    found ? resolved.push(found) : warnings.push(`Not found: "${name}"`);
  }
  if (!resolved.length) return { url: null, resolved: [], warnings: [...warnings, "No valid items"] };

  const p = new URLSearchParams();
  p.set("formbrief", "1");
  p.set("pi1", MODE[mode] ?? 1);
  for (const item of resolved) p.append("pa1[]", item.id);
  p.set("ps1", system);
  p.set("pi10", ORDER_BY[orderBy.toLowerCase()] ?? 4);
  p.set("pi11", maxSystemDistance >= 0 ? maxSystemDistance : 0);
  p.set("pi3", LANDING_PAD[minLandingPad.toLowerCase()] ?? 0);
  p.set("pi9", maxStationDistance >= 0 ? maxStationDistance : 0);
  p.set("pi4", SURFACE_STATIONS[surfaceStations] ?? 0);
  p.set("pi8", FLEET_CARRIERS[fleetCarriers] ?? 0);
  p.set("pi13", STRONGHOLD_CARRIERS[strongholdCarriers] ?? 0);
  const validAge = [...PRICE_AGE_VALID].filter((a) => a <= (maxPriceAge || 0)).pop() || 0;
  p.set("pi5", validAge);
  p.set("pi12", isValidPriceCond(priceCondition) ? priceCondition : 0);
  p.set("pi7", minSupply >= 0 ? minSupply : 0);

  const powerVal = POWER[power.toLowerCase()] ?? 0;
  p.set("pi14", powerVal);

  const states = Array.isArray(powerplayState) ? powerplayState : [powerplayState];
  for (const s of states) {
    const id = POWERPLAY_STATE[s.toLowerCase()];
    if (id !== undefined) p.append("pa4[]", id);
  }

  if (minorFaction) p.set("ps3", minorFaction);

  const url = `https://inara.cz/elite/commodities/?${p.toString()}`.replace(/%5B%5D/g, "[]");

  return {
    url,
    resolved,
    warnings,
  };
}

if (process.argv[1]?.endsWith("url-builder.js")) {
  const [, , item = "Titanium", system = "Sol", mode = "buy", maxLy = "0"] = process.argv;
  const result = buildUrl({
    items: [item],
    system,
    mode,
    maxSystemDistance: +maxLy,
    priceCondition: +process.argv[6] || 0,
  });
  if (result.warnings.length) console.warn("⚠️ ", result.warnings.join(", "));
  console.log("📦 Resolved:", result.resolved.map((r) => `${r.name} (id=${r.id})`).join(", "));
  console.log("🔗 URL:", result.url);
}
