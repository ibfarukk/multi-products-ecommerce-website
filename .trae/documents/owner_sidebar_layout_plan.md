# Owner Dashboard Sidebar / Navbar Professional Layout Implementation Plan

## Repository Research

### Current Owner Dashboard Layout (owner.html)
The current dashboard uses a **single top row of 5 horizontal nav tabs** (`div.owner-nav-tabs` buttons) under the login-authenticated main content area:
1. **Overview** (`data-nav-tab="overview"`) → stats cards (total revenue, orders, sales, failed, abandoned) + quick-action buttons
2. **Orders & Lookup** (`data-nav-tab="orders"`) → payment reference search form + result panel
3. **Products** (`data-nav-tab="products"`) → mode dropdown, Add product button, product cards grid, and product editor overlay
4. **Site Selector** (`data-nav-tab="site-selector"`) → store template preset buttons + textarea direct editor for site_selector.js
5. **Settings** (`data-nav-tab="settings"`) → hidden-by-design 3-sub-tab row (affiliate/multi/single config-mode tabs; actual switching only via Store Mode gate) then renders ALL ~27 config sections as one long scrollable page in `#owner-config-sections`

Inside the Settings tab, `renderConfig()` (`js/owner.js:L398-L414`) iterates `Object.keys(configValues).sort()` and stacks ~27 sections vertically under each other inside `owner-config-section` `<section>` elements with plain `<h3>` titles: Business details, API connection, Brand colors, Product details, Product type, Product images, Product videos, Features, Specifications, Packages and pricing, Delivery text, Guarantee, Why choose us, Testimonials, FAQ, WhatsApp numbers, Payment settings, Manual payment, Social links, Logo, Navigation, Footer links, SEO, Analytics, Sales popup, Promotion, Social proof gallery, Company, Trust badges, Contact, About product, Hero trust items, Sticky CTA, Store content, Products, Affiliate products, Active website mode.

This means admin users **must blindly scroll through ~5,000+ vertical px** of form fields without knowing where each section ends, losing track of Save (only at very bottom).

### Current Nav Logic
`setActiveNavTab(tabId)` in js/owner.js:L912 adds/removes `.active` on `.owner-nav-tab` buttons, then shows/hides `.owner-nav-panel` by id `nav-panel-${tabId}`. `switchActiveProductsMode`, quick action buttons (`nav-goto-*` in Overview), and Store Mode gate all call `setActiveNavTab` to surface the right panel.

### Constraints Preserved Through Rewrite
- `configLabels` (L71-L81) is the authoritative label set; sidebar sub-buttons should use these exact titles for Settings mode, derived from whatever keys exist in `configValues` at runtime (no hard-coding)
- `collectConfig()` + `saveConfig()` rely on inputs with `data-config-path`; adding surrounding layout must **never re-generate, mutate, remove, or re-number those inputs after render**
- Single-product mode (Products tab) hides Add-product button; Affiliate mode now shows it (js/owner.js:L1867-L1937). Don't break those guards.
- Login gate + mode gate: `#owner-login-screen`, `#owner-main`, mode gate overlay must remain the outer 2 screens before the sidebar layout renders.

## Files and Modules

- `owner.html`:
  - Wrap the authenticated dashboard area in a 2-column (desktop) / drawer (mobile) flex layout shell
  - Replace the single-row top nav tabs with a responsive Sidebar `<nav class="owner-sidebar">` plus a mobile `<header class="owner-topbar">` hamburger toggle + `<aside class="owner-sidebar-overlay">`
  - Keep each nav panel HTML exactly where it is today (Overview / Orders / Products / Site Selector / Settings) under `.owner-nav-panel` — **do not move panel DOM**, just wrap.
  - Within Settings tab only: add a sticky Sub-nav rail (in-page, non-sidebar) that hosts one button per rendered `.owner-config-section` plus an inline "Save / Reload / status" action bar at the top of Settings content.
- `js/owner.js`:
  - Add `configSectionRegistry[]` built at the end of `renderConfig()`: enumerates every created `<section class="owner-config-section">`, records its `{ key, id, title, el }`, and injects per-section buttons into the new in-page Sub-nav rail.
  - Add `scrollToConfigSection(key)`: smooth-scroll and highlight the target section for ~3 seconds.
  - Replace inline `.owner-nav-tabs` tab binding in `initConfig()` / `DOMContentLoaded` with new `initOwnerSidebar()` function that binds: Top-level nav items (Overview/Orders/Products/SiteSelector/Settings), mobile hamburger toggle, overlay close click, Escape key close, settings sub-nav clicks, and Save button visibility alongside settings actions.
  - Add `dirtyFormState` tracker: listens for `input / change` on Settings inputs, shows unsaved-changes indicator on Sub-nav Save button, `onbeforeunload` "are you sure you want to leave?" prompt, and nav confirm dialog if switching sections away from unsaved Settings.
  - Move settings footer (`owner-config-footer`) from end of Settings panel to **the sticky Settings Sub-nav action bar** at top. This way admin never has to scroll to Save.
- `css/main.css` or style block in owner.html (prefer inline, no new file): add CSS for `.owner-app-shell`, `.owner-topbar`, `.owner-sidebar`, `.owner-nav-item`, `.owner-settings-subnav`, `.is-open`, `.active`, highlight class for active config section, responsive media query `max-width: 900px` that switches sidebar to drawer.

## Implementation Steps (dependency-ordered)

1. **HTML shell refactor (owner.html)**
   - Insert a CSS block at the top of `owner.html` `<head>` styles with the new layout classes. No new CSS file to avoid cache issues (script has cache-bust policy).
   - Replace the old 5-button `.owner-nav-tabs` row with:
     - `.owner-app-shell` flex wrapper inside `.owner-main` authenticated area.
     - `.owner-topbar` visible only on mobile with brand text + hamburger `☰ Menu` button.
     - `.owner-sidebar` fixed/240px on desktop (sticky, always visible) with vertically stacked 5 top-level nav items (Overview, Orders & Lookup, Products, Site Selector, Settings) showing icons as UTF8 glyphs so no image assets are needed.
     - `.owner-sidebar-overlay` for mobile drawer dismiss.
     - `.owner-main-col` flex:1 column holding existing content panels header + `.owner-panel`
   - Inside Settings tab (`#nav-panel-settings`) only: add a `div.owner-settings-shell` containing:
     - Sticky `.owner-settings-subnav` action bar with: left column = sub-nav scrollable list of buttons (one per config section, rendered by JS); right column = Save button + Reload button + `#owner-config-status` status.
     - Then the existing `#owner-config-sections` render target (unchanged), then the old footer (hidden, buttons moved to sub-nav).

2. **CSS styles**
   - Sidebar: min-width 240px, white bg, shadow, padding, fixed height 100vh.
   - Sidebar nav item: 40px padding, border-radius, hover highlight, `.active` background primary/white text.
   - Mobile drawer: transform: translateX(-110%) default, `.is-open` translateX(0), transition .2s, overlay fade 0.5 bg black 50%.
   - Settings sub-nav: position: sticky; top: 0; z-index: 20; flex row with buttons on left / actions on right, wrap on narrow.
   - Sub-nav button: pill shape, hover + active background, highlight when target section is in viewport.
   - Section highlight: when sub-nav button clicked, target section pulses with bg color for 3 seconds via `.owner-section-highlight` rule.
   - Save button dirty indicator: orange badge/dot when unsaved.

3. **JS wiring (js/owner.js)**
   - Before existing event listeners, add `initOwnerSidebar()` call after DOMContentLoaded login success + applyModeGate show-main both complete.
   - `initOwnerSidebar`:
     - Binds 5 top-level nav items to `setActiveNavTab(tabId)`.
     - Closes mobile drawer after click, syncs `.active` on sidebar items.
     - Binds hamburger button + overlay click + Escape key to toggle mobile drawer.
     - Binds overview quick-action buttons (`nav-goto-*`) to continue working through `setActiveNavTab`.
   - Extend `renderConfig()` (L398-L414):
     - Before appending each section, compute an id `config-section-${key}` assign to `<section>`; inject a scroll-offset anchor.
     - After rendering all sections, build `configSectionRegistry = [{key,id,title,el}]`, call `renderSettingsSubNav(registry)` which empties sub-nav list, adds one button per entry, binds click to `scrollToConfigSection(key)`.
   - `scrollToConfigSection(key)`:
     - Uses registry to find section, computes `el.getBoundingClientRect().top + window.scrollY - 100` (sticky-subnav offset), `window.scrollTo({behavior:'smooth'})`.
     - Toggles `.active` on sub-nav buttons, adds `.owner-section-highlight` class on section for 3 seconds.
   - Dirty-form tracking:
     - `let configDirty = false;`, `let saveInProgress = false;`
     - `#owner-config-sections` addEventListener('input') → set `configDirty = true`, update Save button style.
     - `window.addEventListener('beforeunload')` → if dirty and not saving, return the prompt string.
     - Before `setActiveNavTab` away from settings if dirty: show native `confirm('You have unsaved changes in Settings. Leave anyway?')` to guard.
   - Save button action:
     - Clicking sub-nav Save triggers same `saveConfig()` path as old footer button, after success sets `configDirty = false`, updates Save button green.
   - `setActiveNavTab`: after showing target panel, if `tabId === 'settings'` → rebuild sub-nav registry (handle case where render hasn't run yet: wrap in `Promise.resolve().then(renderSettingsSubNavIfNeeded)`). If not settings → close sub-nav highlight.

4. **Safeguards for edge cases**
   - Single-product mode Products tab has no sub-sections; no-op (sub-nav only appears inside Settings tab).
   - Affiliate/multi mode swap → `loadConfig(newMode)` reruns `renderConfig()` → teardown and rebuild the registry & sub-nav buttons correctly for new template's key set.
   - Navigating directly to `/owner` without `#settings` hash → default first tab (Overview) as today. Hash-navigation option: `/owner#settings#SEO` scrolls directly into SEO section; add `window.addEventListener('hashchange')` + initial hash parse in initOwnerSidebar.

## Dependencies and Considerations

- **No new JS/image dependencies**: UTF8 icons (Overview = 🏠, Orders = 🧾, Products = 📦, Site Selector = 🌐, Settings = ⚙️) avoid bundling icon fonts.
- **Save button now top-of-Settings** — explicit user goal ("instead of scrolling to save").
- **config-values keys vary per template**: Affiliate has AFFILIATE_PRODUCTS, multi has PRODUCTS, single has PRODUCT/IMAGES/PACKAGES scalars. Sidebar Sub-nav is built dynamically from whatever `configValues` holds at render time, so no hard-coded key drift.
- **configLabels mapping used for human text** to preserve existing "Business details", "Manual payment" wording.
- **Future proof**: If a new top-level nav tab is added, just prepend a 6th button in the sidebar HTML; sub-nav buttons are auto-generated so no edits needed there.

## Validation
1. `node --check js/owner.js` exit 0
2. VS Code GetDiagnostics across owner.html + js/owner.js → 0 issues
3. Manual smoke after deploy:
   a. Desktop width → sidebar shows 5 items on first paint, click each swaps panel without reload
   b. Mobile width (< 900px) → hamburger shows, tapping opens sidebar drawer, tap overlay closes
   c. Overview → "Manage products" quick button still jumps to Products tab
   d. Settings tab → 20+ sub-nav buttons at top, click SEO scrolls page to SEO section, highlight briefly flashes
   e. Edit any value in BUSINESS then try clicking Products → confirm browser dialog prompts "leave with unsaved changes?"
   f. Save in Settings → click Save from top sticky bar (no scroll needed), dirty indicator turns off after success
   g. Change template mode in Store Mode dropdown → Settings sub-nav regenerates with correct new-mode section keys
   h. Press Escape on mobile drawer open → closes

## Risks
- **Risk 1: Sidebar CSS can accidentally break authenticated width or mode gate overlay.** → Mitigation: scope all new classes under `.owner-authenticated .owner-app-shell` selector, never touch `.owner-login-screen` or `.owner-mode-gate-overlay` classes.
- **Risk 2: Registry rebuild on mode-swap losing scroll.** → Mitigation: in loadConfig().then() after renderConfig() completes, call `renderSettingsSubNavIfNeeded().then(select first sub-nav default)`.
- **Risk 3: Sticky Save position hides first section heading on small screens.** → Mitigation: `scrollToConfigSection` uses offset 100px (sticky-bar height + 20px margin) so heading lands below the sticky bar.
- **Risk 4: beforeunload dialog appearing after successful save.** → Mitigation: `saveConfig()` success handler sets `configDirty = false` BEFORE redirect/scroll.
