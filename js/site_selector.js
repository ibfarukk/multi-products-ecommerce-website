/*
=========================================================
                WEBSITE MODE SELECTOR
=========================================================

HOW TO USE (Non-developer friendly):
1) Choose ONE mode below
2) Uncomment the line for the mode you want
3) Make sure the other two modes remain commented

Available modes:
- "singleproduct"    → One product checkout (current template)
- "multipleproducts" → Store with multiple products + cart + checkout
- "affiliate"        → Multiple products but no checkout (links out)
=========================================================
*/

const WEBSITE_TYPE_SELECT = "singleproduct";
//const WEBSITE_TYPE_SELECT = "multipleproducts";
//const WEBSITE_TYPE_SELECT = "affiliate";

/*
=========================================================
                BROWSER CACHE / BF-CACHE BUSTER
=========================================================
Problem: returning visitors see stale product pages because Chrome,
Edge, Safari and Firefox keep HTTP responses in disk cache and
serve them from back/forward cache even when the server has since
configured no-store headers. This block forces a network reload
once per session AND whenever the page is restored from BFCache.
Safe: no infinite reload loops — uses a sessionStorage flag and
a monotonic generation counter.
=========================================================
*/
(function cacheBuster() {
    try {
        var STORE_CACHE_GEN = 'store_cache_gen_v1';
        var gen = parseInt(String((typeof sessionStorage !== 'undefined' && sessionStorage) ? sessionStorage.getItem(STORE_CACHE_GEN) || '0' : '0'), 10) || 0;
        var hasReloaded = (typeof sessionStorage !== 'undefined' && sessionStorage) ? (sessionStorage.getItem('__cache_buster_reload_v1') === '1') : false;
        if (window.performance && typeof window.performance.getEntriesByType === 'function') {
            var nav = window.performance.getEntriesByType('navigation')[0];
            // BFCache restore (back/forward) OR same-doc history replace/reload via cached copy → force reload
            if (nav && (nav.type === 'back_forward' || (nav.restoredCount != null && nav.restoredCount > 0))) {
                if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('__cache_buster_reload_v1', '1');
                var sep = window.location.search ? '&' : '?';
                window.location.replace(window.location.pathname + window.location.search + sep + '__bust=' + Date.now() + window.location.hash);
                return;
            }
        }
        if (window.performance && performance.navigation && performance.navigation.type === 2) {
            if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('__cache_buster_reload_v1', '1');
            var sep = window.location.search ? '&' : '?';
            window.location.replace(window.location.pathname + window.location.search + sep + '__bust=' + Date.now() + window.location.hash);
            return;
        }
        // First page-load per tab session (or after a deploy-gen bump): ensure the very first load is fresh from network
        if (!hasReloaded && gen < 1) {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(STORE_CACHE_GEN, '1');
                sessionStorage.setItem('__cache_buster_reload_v1', '1');
            }
            // If the URL has NO __bust query → append timestamp once and hard-reload bypassing cache
            if (window.location.search.indexOf('__bust=') < 0) {
                var sep = window.location.search ? '&' : '?';
                var target = window.location.pathname + window.location.search + sep + '__bust=' + Date.now() + window.location.hash;
                if (window.location.replace) { window.location.replace(target); } else { window.location.href = target; }
                return;
            }
        }
        // pageshow fires after BFCache restore on browsers that expose it
        window.addEventListener('pageshow', function(ev) {
            try {
                if (ev && ev.persisted) {
                    var sep = window.location.search ? '&' : '?';
                    window.location.replace(window.location.pathname + window.location.search + sep + '__bust=' + Date.now() + window.location.hash);
                }
            } catch (_e) {}
        }, false);
    } catch (_e) {
        // Cache-buster failure must never break the site.
    }
})();
