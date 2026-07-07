# Change Summary

## What was added or changed

- Added a dedicated `seeder/` folder with:
  - `seedDatabase.js` to create the database and sync tables
  - `seedItems.js` to load product seed data
  - `seedAll.js` to run the seeding workflow
  - `rollback.js` to drop the database if needed
- Updated `package.json` with seeding scripts:
  - `npm run seed`
  - `npm run seed:db`
  - `npm run seed:items`
  - `npm run rollback`
- Fixed admin `View Orders` button behavior in `public/admin.html`.
- Added admin order status controls for `pending`, `delivered`, and `cancelled`.
- Added sale discount support:
  - per-book sale percentage in admin item creation/editing
  - sale badge and discounted price display in `public/index.html`
  - crossed-out original price for sale items
  - sale-aware cart totals in `public/cart.html`
- Preserved sale percentage in cart item data so checkout uses the discounted price.
- Made UI and checkout updates to correctly compute selected totals and payment validation.
