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
              LIGHTWEIGHT BFCACHE REVALIDATION
=========================================================
Chrome, Edge, Safari, Firefox keep responses in disk cache AND
restore pages from Back/Forward-Cache instantly (< 50ms). We
want that speed! This block only re-validates the page content
when (a) the page was restored from BFCache AND (b) the stored
content is more than 5 minutes old, so owner edits to product
settings are picked up without a forced reload on every click.
No timestamp ?__bust= query param is ever appended to the URL
so the user never waits for a needless full navigation reload.
=========================================================
*/
(function lightweightRevalidate() {
    try {
        var KEY = '__last_content_ts_v1';
        var now = Date.now();
        var isBackForward = false;
        try {
            if (window.performance && typeof window.performance.getEntriesByType === 'function') {
                var nav = window.performance.getEntriesByType('navigation')[0];
                if (nav && (nav.type === 'back_forward' || (nav.restoredCount != null && nav.restoredCount > 0))) {
                    isBackForward = true;
                }
            }
            if (!isBackForward && window.performance && performance.navigation && performance.navigation.type === 2) {
                isBackForward = true;
            }
        } catch (_p) { isBackForward = false; }
        // First paint / session init / normal navigation: write timestamp and do NOTHING (no reload, no bust).
        if (!isBackForward) {
            try { window.sessionStorage.setItem(KEY, String(now)); } catch (_s) {}
            // pageshow fires after BFCache restore on browsers that expose ev.persisted. If restored and stale → soft reload.
            window.addEventListener('pageshow', function(ev) {
                try {
                    if (!(ev && ev.persisted)) return;
                    var last = parseInt(String(window.sessionStorage.getItem(KEY) || '0'), 10) || 0;
                    if ((now - last) > (5 * 60 * 1000)) {
                        // Reload skipping local disk cache only when really stale (5+ min).
                        try { window.location.reload(); } catch (_r) {}
                    }
                } catch (_e) {}
            }, false);
            return;
        }
        // Back/forward restore: reload only if stale > 5 minutes else keep instant BFCache render.
        var lastSeen = parseInt(String((typeof window.sessionStorage !== 'undefined' && window.sessionStorage)
            ? (window.sessionStorage.getItem(KEY) || '0') : '0'), 10) || 0;
        if ((now - lastSeen) > (5 * 60 * 1000)) {
            try { window.sessionStorage.setItem(KEY, String(now)); } catch (_s) {}
            try { window.location.reload(); } catch (_r) {}
        }
    } catch (_e) {
        // Revalidation logic must never break the page render.
    }
})();
