# Professional Owner Dashboard + Products CRUD with R2 Delete Implementation Plan

## Repository Research

**Current dashboard architecture**
- Entry: `owner.html` loads `js/config.js` (defaults) + `js/owner.js` (login → stats → generic "Settings" panel with 3 per-template tabs: Affiliate / Multi / Single).
- Settings editor is **generic recursive tree**: `renderNode()` walks `configValues`, builds inputs for every primitive and "Add item / Remove item" for every array, regardless of semantic meaning. This means product arrays are rendered as ugly nested "Item N" cards without dedicated list, per-row Edit/Remove, or image gallery UX — exactly the user's complaint.
- Product data lives in **two different places depending on mode**:
  - `multipleproducts` mode: `PRODUCTS` array in `js/config2.js` (stored in KV `site-config-multipleproducts`, whitelisted in `handlePublicConfigAsset` safeNames).
  - `singleproduct` mode: `PRODUCT` (scalar), `PRODUCT_IMAGES` (array), `PACKAGES` (array) in `js/config.js` (stored in `site-config-singleproduct`).
- Settings persistence: PUT `/api/owner/config` {mode, config} → Worker does `OWNER_STATS.put('site-config-' + mode, JSON.stringify(config))` → on next page load Worker rewrites `js/config*.js` responses with Object.assign overlay (so both owner and customers see updated values on reload).
- Existing R2 upload: POST `/api/owner/upload` owner-auth multipart → `env.PRODUCT_IMAGES.put(objectKey, ...)` → returns `{ url: '/cdn/<folder>/<sanitized>-<ts>-<rand>.<ext>' }` served by GET `/cdn/*` (→ R2, fallback `productsimages/*` ASSETS).
- **Missing today**: No R2 DELETE endpoint; if owner changes/removes an image, the old object stays in R2 forever.

**User intent mapped to concrete changes**
1. Keep the existing login + stats overview + reference lookup at top (don't break).
2. Split Site Configuration from a single confusing panel into **top-level dashboard tabs**: `Overview`, `Orders & Lookup`, `Products`, `Settings`.
3. `Products` tab shows a **card/table list of all products** (Multi = each PRODUCTS[] entry; Single = one synthetic product wrapping PRODUCT + PRODUCT_IMAGES + PACKAGES). Each row has thumbnail, title, ID, Edit button, Delete button.
4. Clicking Edit opens a **sectioned product editor** (not the generic tree): Info (id/title/description/longDescription/type/shipping), **Image Gallery** (thumbnails each with Remove button + Upload New Images button), Specifications table, Packages table with pricing.
5. Save button calls existing PUT `/api/owner/config` but also sends the set of **R2 keys that were removed** to a new endpoint so they get purged from the bucket.
6. Removed images → actually delete from `env.PRODUCT_IMAGES` R2 bucket. New/changed images → written via existing upload route and persisted in config so customers see `/cdn/...` URLs on next load.
7. Stop using local `productsimages/` as the source of truth: keep existing `/cdn/*` fallback for legacy/browsing, but the products editor should never suggest `productsimages/` paths.

## Files and Modules

- `worker/src/index.js`:
  - Add route `DELETE /api/owner/upload` (body `{ keys: ["/cdn/a/b.jpg", …] }` → strip `/cdn/` prefix → `env.PRODUCT_IMAGES.delete()` for each key).
  - In `handleOwnerConfigSave`, accept an optional `removedImageKeys: string[]` in the body (or keep save endpoint pure and use a dedicated delete endpoint — plan uses dedicated DELETE to avoid 2-in-1).
  - In `handleR2ImageServe`, keep the ASSETS fallback but add a small `console.warn` to help migrate; no breaking change.
- `owner.html`:
  - Add top-level dashboard tabs in the main panel (Overview / Orders / Products / Settings). Today there are only the 3 per-template tabs inside Settings.
  - Add containers `owner-products-view`, `product-editor-view`, and CSS for product cards, gallery tiles, modals/editor layout.
- `js/owner.js`:
  - Refactor `loadDashboard` + `setView` to switch tabs instead of just showing Settings.
  - Implement `renderProductsList(mode)` that reads `PRODUCTS` (multi) or synthesizes `[PRODUCT + PRODUCT_IMAGES + PACKAGES]` (single) from `configValues`, renders cards with thumbnails, Edit/Delete.
  - Implement `openProductEditor(productIdOrSingleFlag)` with sectioned form (Info, Images Gallery, Specs, Packages) that builds an edit transaction in memory.
  - Images Gallery: render existing URLs in a grid, each with Remove (collects removed key into a set). Upload button calls existing `uploadImageFile()` and appends URLs to the list.
  - Save product editor: (a) if images were removed → call DELETE `/api/owner/upload` with `/cdn/…` URLs to purge R2, (b) write updated product back into the appropriate array/scalar inside `configValues`, (c) PUT `/api/owner/config` as today.
  - Delete product: confirm dialog → collect all its image keys → delete from R2 → splice from array → PUT save.
  - Preserve existing Settings tab and its generic editor as a "Advanced / Raw Settings" fallback so no existing config keys are lost.

## Implementation Steps

1. **Backend: add R2 image delete route**
   - In `worker/src/index.js` router, add `DELETE /api/owner/upload` with owner auth.
   - Body schema: `{ keys: string[] }` — accept strings that look like `/cdn/<key>`, `cdn/<key>`, or raw `<key>`, normalize, batch call `env.PRODUCT_IMAGES.delete(key)`.
   - Return `{ success: true, deleted: [keys], failed: [{key, error}] }`. Ignore missing keys (R2 delete is idempotent).

2. **Backend: expose deleted config keys helper (optional hygiene)**
   - Keep `handleOwnerConfigSave` unchanged; we'll call DELETE from frontend before save.

3. **Frontend: restructure owner.html panels**
   - Keep login view unchanged.
   - Inside `#owner-dashboard-view`, after the stats cards, add a new tab bar above the main content panels.
   - Panel ids: `tab-overview` (existing reference lookup), `tab-orders` (same lookup + we can keep single panel), `tab-products` (product CRUD), `tab-settings` (the existing generic 3-tab Settings section).
   - Add styles: `.owner-nav-tabs`, `.owner-nav-tab.active`, product grid card, product gallery tile, remove-btn, editor-section with sticky Save.

4. **Frontend: add top-level tab switching in owner.js**
   - Add `activeNavTab` state. On click of Overview/Orders/Products/Settings swap panels. Login success → default to Overview.

5. **Frontend: Products list view**
   - `renderProductsList`:
     - Determine active mode via current configMode (sync with existing settings tab).
     - Multi-mode → `configValues.PRODUCTS`.
     - Single-mode → synthetic object `{__single:true, title:configValues.PRODUCT?.name, image:configValues.PRODUCT_IMAGES?.[0]?.file, images:configValues.PRODUCT_IMAGES, packages:configValues.PACKAGES}`.
   - Each card: thumbnail, title, id, Edit & Delete buttons; empty-state with "Add Product" only for Multi (single mode always has exactly one product).

6. **Frontend: Product Editor modal/pagelet**
   - `openProductEditor(product)`: open sectioned form inside `#product-editor-view`, swap visibility with list.
   - **Section 1 — Info**: id, title, shortTitle, description, longDescription, productType (physical/digital), shippingFee.
   - **Section 2 — Images Gallery**:
     - Grid of tiles (each with preview img + X-remove button); removing collects URL into `removedImages = new Set()`.
     - Upload button uses existing `uploadImageFile()` with configKey `PRODUCTS[<i>].images` or `PRODUCT_IMAGES[]`; appends returned `/cdn/…` URL to the in-memory list.
     - Primary image selection: mark one as cover (write to `image` field).
   - **Section 3 — Specifications**: editable rows (label/value) with Add/Remove.
   - **Section 4 — Packages**: editable rows (id/title/price) with Add/Remove.
   - Bottom bar: Discard → back to list; Save → submit.
   - **Save workflow**:
     1. If `removedImages.size > 0` → `DELETE /api/owner/upload { keys: [...removedImages] }`; ignore partial failure, log to UI.
     2. Write editor fields back:
        - Multi: `configValues.PRODUCTS[index] = updatedProduct`.
        - Single: split back across `configValues.PRODUCT`, `configValues.PRODUCT_IMAGES = images.map(f => ({enabled:true,file:f}))` (merge existing shape) and `configValues.PACKAGES = packages`.
     3. PUT `/api/owner/config` saveConfig() → show "Saved. Refresh storefront…".
     4. Re-render list.

7. **Frontend: Delete product**
   - Confirm dialog → gather image URLs: `product.image` + `product.images[]` (flatten; for single-mode treat `PRODUCT_IMAGES[]` entries `{file}` consistently).
   - DELETE R2 for all → remove product from array → save config → re-render list.
   - For single mode: disable Delete; only Edit is allowed.

8. **Frontend: preserve existing Settings advanced view**
   - Move today's `<div class="owner-panel owner-config">` into `#tab-settings`. The 3 sub-tabs (Affiliate / Multi / Single) remain fully functional. This avoids breaking keys that have no dedicated UI (BUSINESS, PAYMENT, LOGO, etc.).

9. **Storefront image rendering**
   - Already works: `/cdn/*` routes, `resolveAssetUrl`, existing `<img src="product.image">` — no code change needed. R2 URLs written into config are served immediately; R2-deleted URLs 404 (intended). Only cosmetic: single-template `PRODUCT_IMAGES` stores `{enabled, file}` in config.js; keep shape compatibility in the editor.

10. **Validation and cleanup**
   - `node --check` on worker + all touched JS files.
   - GetDiagnostics for lint issues.
   - Smoke-test flows: login → Products tab → upload new image, remove an old image, save → verify R2 delete called and R2 GET on new key succeeds.

## Dependencies and Considerations

- **Whitelist**: `PRODUCTS`, `PRODUCT_IMAGES`, `PACKAGES`, `PRODUCT` are already in the `safeNames` whitelist inside `handlePublicConfigAsset`. So owner-saved values already propagate to storefront JS rewrites for both single + multi. Nothing to add.
- **R2 binding lifecycle**: If `env.PRODUCT_IMAGES` is absent (user hasn't bound the bucket yet), DELETE route returns 503 gracefully with a helpful message; editor treats removals as "soft" (removed from config anyway) so user isn't blocked.
- **Shape normalization for PRODUCT_IMAGES**: existing single-template `PRODUCT_IMAGES` items are `{ enabled: true, file: "…" }`; multi-template `PRODUCTS[].images` are plain strings. Editor must read/write both shapes consistently.
- **Concurrency**: Editor edits are in-memory + single PUT. If a second owner edits simultaneously, last-write-wins (same as today). No lock files needed.
- **Large images**: existing 10MB size limit + XHR progress bar stays; no change.
- **Legacy `productsimages/` URLs in config values**: We leave them alone. The R2 GET `/cdn/*` route falls back to ASSETS. New uploads ALWAYS write `/cdn/…` URLs (current upload route already does). So customers migrate images gradually.

## Validation

After implementation, run:

- `node --check worker/src/index.js`
- `node --check js/owner.js`
- `node --check js/checkout.js js/cart_checkout.js js/product.js js/main.js js/config.js js/config2.js` (to ensure no regressions from the Flutterwave work).
- VS Code `GetDiagnostics` for LSP issues.
- Manual UI:
  1. Log into owner dashboard → confirm 4 nav tabs appear, Overview shows existing stats/lookup, Settings still renders generic sub-tabs.
  2. Products tab → card list for multipleproducts mode (or single synthetic product).
  3. Edit → upload a new image into gallery (uploads to `/cdn/PRODUCTS/<key>` per route). Remove an old image. Save.
  4. Devtools network tab → see `DELETE /api/owner/upload` fire with removed keys; see PUT `/api/owner/config` succeed.
  5. Reload index/multiple/cart storefronts → confirm new image renders and removed image is gone (browser cache bypass may be needed; images are immutable so new keys are fresh URLs anyway).

## Risks

- **Risk**: Accidental R2 key deletion of shared images used by multiple products.
  Handling: Editor UI warns before delete. Delete endpoint is called *only* for keys explicitly removed by the owner during this editor session; never for images present in config. The `DELETE` endpoint also supports batch partial-failure reporting so owner can retry.
- **Risk**: Single-product mode splitting `PRODUCT / PRODUCT_IMAGES / PACKAGES` introduces bugs if we miss any config key.
  Handling: Keep advanced generic Settings view fully functional as fallback; the product editor only handles the product subset and leaves other config keys untouched (saveConfig() still performs its normal collect).
- **Risk**: Existing `productsimages/` URLs in legacy configs — if owner removes them, editor will try to DELETE them via R2 DELETE which will silently no-op (good), but ASSETS fallback will also stop serving them (also intended, owner explicitly removed).
- **Risk**: Config size exceeds 500KB after adding many images (since we store URLs, not binary). Mitigation: each URL is ~60 chars; 500KB allows >8k image URLs, which is safe.
