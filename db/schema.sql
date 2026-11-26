-- PartsHub D1 catalog schema v1. Run only after creating and binding a D1 database.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS brands (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS parts (
 id INTEGER PRIMARY KEY,
 brand_id INTEGER NOT NULL REFERENCES brands(id),
 part_number TEXT NOT NULL,
 normalized_number TEXT NOT NULL,
 description TEXT NOT NULL,
 category TEXT NOT NULL,
 verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK(verification_status IN ('unverified','verified','rejected')),
 source_name TEXT,
 source_url TEXT,
 source_checked_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(brand_id, normalized_number)
);
CREATE INDEX IF NOT EXISTS idx_parts_number ON parts(normalized_number);
CREATE TABLE IF NOT EXISTS vehicles (
 id INTEGER PRIMARY KEY,
 year INTEGER NOT NULL CHECK(year BETWEEN 1955 AND 2100),
 make TEXT NOT NULL, model TEXT NOT NULL,
 trim TEXT NOT NULL DEFAULT '', engine TEXT NOT NULL DEFAULT '',
 UNIQUE(year,make,model,trim,engine)
);
CREATE TABLE IF NOT EXISTS fitments (
 part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
 vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
 verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK(verification_status IN ('unverified','verified','rejected')),
 source_name TEXT NOT NULL,
 source_url TEXT,
 source_checked_at TEXT,
 PRIMARY KEY(part_id,vehicle_id)
);
CREATE TABLE IF NOT EXISTS interchanges (
 part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
 related_part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
 verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK(verification_status IN ('unverified','verified','rejected')),
 source_name TEXT NOT NULL,
 source_url TEXT,
 PRIMARY KEY(part_id,related_part_id),
 CHECK(part_id <> related_part_id)
);
CREATE TABLE IF NOT EXISTS retailer_offers (
 id INTEGER PRIMARY KEY,
 part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
 retailer TEXT NOT NULL,
 price_cents INTEGER CHECK(price_cents >= 0),
 currency TEXT NOT NULL DEFAULT 'USD',
 product_url TEXT NOT NULL,
 availability TEXT NOT NULL DEFAULT 'unverified',
 observed_at TEXT NOT NULL,
 source_name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offers_part ON retailer_offers(part_id);
-- No seed fitments, interchanges or retailer offers: those require sourced verification.
