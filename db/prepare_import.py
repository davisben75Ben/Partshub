#!/usr/bin/env python3
"""Validate PartsHub catalog CSV and generate a D1-compatible SQL import.
Usage: python3 db/prepare_import.py input.csv > db/import.sql
Expected columns: brand,part_number,description,category,verification_status,source_name,source_url
No vehicle fitment, interchange, prices, or inventory are inferred.
"""
import csv, re, sqlite3, sys
from pathlib import Path

COLUMNS = ["brand","part_number","description","category","verification_status","source_name","source_url"]
def norm(value): return re.sub(r"[^A-Z0-9]", "", value.upper())
def quote(value): return "'" + value.replace("'", "''") + "'"

def main():
    if len(sys.argv)!=2:
        raise SystemExit("Usage: python3 db/prepare_import.py input.csv > db/import.sql")
    with open(sys.argv[1], newline="", encoding="utf-8-sig") as stream:
        reader=csv.DictReader(stream)
        if reader.fieldnames is None or set(reader.fieldnames)!=set(COLUMNS):
            raise SystemExit("CSV must have exactly these columns: "+",".join(COLUMNS))
        records=list(reader)
    seen=set()
    statements=["BEGIN TRANSACTION;"]
    for number,row in enumerate(records,2):
        values={key:(row[key] or "").strip() for key in COLUMNS}
        if any(not values[k] for k in ("brand","part_number","description","category","source_name")):
            raise SystemExit(f"Row {number}: brand, part_number, description, category and source_name required")
        if values["verification_status"] not in ("unverified","verified"):
            raise SystemExit(f"Row {number}: verification_status must be unverified or verified")
        if values["verification_status"]=="verified" and not values["source_url"].startswith("https://"):
            raise SystemExit(f"Row {number}: verified records require an HTTPS source URL")
        key=norm(values["part_number"])
        if not key or len(key)>80: raise SystemExit(f"Row {number}: invalid part number")
        identity=(values["brand"].casefold(),key)
        if identity in seen: raise SystemExit(f"Row {number}: duplicate brand and part number")
        seen.add(identity)
        statements.append(f"INSERT OR IGNORE INTO brands(name) VALUES ({quote(values['brand'])});")
        statements.append("INSERT INTO parts(brand_id,part_number,normalized_number,description,category,verification_status,source_name,source_url) VALUES "
            f"((SELECT id FROM brands WHERE name={quote(values['brand'])}),"
            f"{quote(values['part_number'])},{quote(key)},{quote(values['description'])},"
            f"{quote(values['category'])},{quote(values['verification_status'])},"
            f"{quote(values['source_name'])},{quote(values['source_url'])});")
    statements.append("COMMIT;")
    print("\n".join(statements))
    print(f"Validated {len(records)} part records; no fitment or prices imported.",file=sys.stderr)
if __name__=="__main__": main()
