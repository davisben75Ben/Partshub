# PartsHub MVP

A zero-cost static prototype for a vehicle-first auto-parts comparison application.

## Run
Open `index.html` in any browser, or deploy the folder to Cloudflare Pages as static assets.

## Included
- Year/make/model selectors, ZIP field, keyword search
- Three sample part types and three illustrative retailers
- Side-by-side sample pricing, pickup/shipping, warranties, ratings, and rebates
- Responsive mobile design

## Important limitations
- All offers and ratings are **mock data**. No live pricing, retailer availability, actual reviews, verified rebates, fitment, or purchases.
- Do not treat estimated shipping or sample net cost as a real quote.
- In-app payments and multi-retailer cart require contracts/integrations and appropriate payment, tax, fulfillment, and refund handling.

## Next build steps
1. Implement a backend adapter interface for approved retailer APIs/feeds, with caching and attribution.
2. Add normalized fitment via licensed ACES/PIES data or authorized catalogs, including engine/trim.
3. Add geolocated inventory with store pickup time and shipping estimates from verified sources.
4. Add verified promo/rebate eligibility, expiration, stacking rules, and rebate claim instructions.
5. Add affiliate checkout links, then authorized in-app checkout where supported.
6. Add privacy policy, merchant disclosures, and accessibility and security testing.

## Vehicle selector update
Year and make changes now refresh the model dropdown using the free public NHTSA vPIC vehicle database. A limited built-in list is available when the API cannot be reached. These model lists do not verify part fitment. Internet access is required for full live model coverage.

## Supplier network prototype
Open `supplier.html` or use the supplier link on the main search page. Separate supplier and salvage-yard workflows, local logo upload, inventory entries, donor vehicles, removal, and JSON export. Data is saved only in the local browser; no authentication, backend, or public listing yet.

## Partner showcase
Open `showcase.html` for the partner-facing landing page. `index.html` is the consumer demo with a typeable year field (1955–2027), American-make restriction before 1980, sample comparisons, and retailer homepage links. `supplier.html` is the local-only supplier portal. No live integrations or public database.

## Vehicle wallpaper
On the customer search page, changing year/make/model looks for a Wikimedia Commons vehicle photo, displays a source/license link, and falls back to the normal background if no suitable photo is available. Search results are illustrative and not verified as exact vehicle photos. Visitors may upload their own local photo for the session (not transmitted to PartsHub). This uses a third-party API and requires an internet connection. Before production, confirm individual image licenses and attribution requirements.

Wallpaper update: a bundled vehicle illustration is always visible behind the interface. Wikimedia Commons images may replace it if an appropriate photo is found; uploaded vehicle photos work without external image search. The illustration is not a specific vehicle model.
