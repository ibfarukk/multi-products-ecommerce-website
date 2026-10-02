(function() {
    'use strict';

    function $(id) {
        return document.getElementById(id);
    }

    function trackAffiliateClick(productId, affiliateUrl) {
        try {
            var body = JSON.stringify({ url: String(affiliateUrl || ''), ts: Date.now() });
            var endpoint = '/api/public/affiliate/' + encodeURIComponent(String(productId || '')) + '/click';
            if (typeof fetch === 'function') {
                try {
                    fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: body,
                        keepalive: true
                    }).catch(function() {});
                } catch (_e) {}
            }
            if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
                try {
                    var blob = new Blob([body], { type: 'application/json' });
                    navigator.sendBeacon(endpoint, blob);
                } catch (_e) {}
            }
        } catch (_e) {}
    }

    function formatMoney(amount) {
        const value = Number(amount || 0);
        return (BUSINESS.currency || '') + value.toLocaleString('en-NG');
    }

    function normalizeAffiliate() {
        if (typeof AFFILIATE_PRODUCTS !== 'undefined' && Array.isArray(AFFILIATE_PRODUCTS)) return AFFILIATE_PRODUCTS;
        if (Array.isArray(window.AFFILIATE_PRODUCTS)) return window.AFFILIATE_PRODUCTS;
        return [];
    }

    function getPriceText(product) {
        if (product && typeof product.price !== 'undefined' && product.price !== null) return formatMoney(product.price);
        return '';
    }

    function getSpecRows(product) {
        if (!product || !Array.isArray(product.specs)) return '';
        return product.specs.map(function(s) {
            if (!s) return '';
            return '<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 14px;border-bottom:1px dashed var(--border);">' +
                '<span style="color:var(--muted);font-size:13px;">' + String(s.label || '') + '</span>' +
                '<span style="font-weight:800;font-size:13px;text-align:right;">' + String(s.value || '') + '</span>' +
                '</div>';
        }).join('');
    }

    function initPageBranding() {
        const badge = $('affiliate-badge');
        const title = $('affiliate-title');
        const desc = $('affiliate-desc');

        if (badge) badge.textContent = String(BUSINESS.shortName || BUSINESS.name || 'AFFILIATE');
        if (title) title.textContent = (typeof STORE_CONTENT !== 'undefined' && STORE_CONTENT.bannerTitle) ? String(STORE_CONTENT.bannerTitle) : 'Recommended Products';
        if (desc) desc.textContent = (typeof STORE_CONTENT !== 'undefined' && STORE_CONTENT.bannerSubtitle) ? String(STORE_CONTENT.bannerSubtitle) : 'Explore products and visit the vendor website to purchase.';

        document.title = String(BUSINESS.shortName || BUSINESS.name || 'Affiliate');
    }

    function collectFilterOptions(products) {
        const seen = new Set();
        const options = [];
        products.forEach(function(p) {
            if (!p || !Array.isArray(p.specs)) return;
            for (let i = 0; i < p.specs.length; i++) {
                const s = p.specs[i];
                if (!s) continue;
                if (String(s.label || '').trim().toLowerCase() === 'category') {
                    const raw = String(s.value || '').trim();
                    if (!raw) continue;
                    const key = raw.toLowerCase();
                    if (seen.has(key)) continue;
                    seen.add(key);
                    options.push({ value: key, label: raw });
                    break;
                }
            }
        });
        return options.sort(function(a, b) { return a.label.localeCompare(b.label); });
    }

    function getProductCategory(product) {
        if (!product || !Array.isArray(product.specs)) return '';
        for (let i = 0; i < product.specs.length; i++) {
            const s = product.specs[i];
            if (s && String(s.label || '').trim().toLowerCase() === 'category') {
                return String(s.value || '').trim().toLowerCase();
            }
        }
        return '';
    }

    function productMatchesCategory(product, filter) {
        if (!filter) return true;
        return getProductCategory(product) === filter;
    }

    function productMatchesSearch(product, query) {
        if (!query) return true;
        const q = query.toLowerCase();
        const fields = [
            product.title || '',
            product.description || '',
            product.longDescription || '',
            product.id || ''
        ];
        if (Array.isArray(product.specs)) {
            product.specs.forEach(function(s) {
                if (s && s.label) fields.push(String(s.label));
                if (s && s.value) fields.push(String(s.value));
            });
        }
        return fields.some(function(v) {
            return String(v).toLowerCase().indexOf(q) !== -1;
        });
    }

    function showResultsInfo(infoId, count, total, query, filterLabel) {
        const el = $(infoId);
        if (!el) return;
        if (!query && !filterLabel) {
            el.classList.add('owner-hidden');
            return;
        }
        let label = 'Showing <strong>' + count + '</strong> of ' + total + ' product' + (total === 1 ? '' : 's');
        const parts = [];
        if (query) parts.push('matching &ldquo;' + query + '&rdquo;');
        if (filterLabel) parts.push('in <strong>' + filterLabel + '</strong>');
        if (parts.length) label += ' ' + parts.join(' and ');
        el.innerHTML = label + '.';
        el.classList.remove('owner-hidden');
    }

    function renderProducts(productsToRender) {
        const grid = $('affiliate-products-grid');
        const empty = $('affiliate-products-empty');
        if (!grid) return;

        const products = Array.isArray(productsToRender) ? productsToRender : normalizeAffiliate();

        if (!products.length) {
            grid.innerHTML = '';
            if (empty) empty.classList.remove('owner-hidden');
            return;
        }

        if (empty) empty.classList.add('owner-hidden');

        grid.innerHTML = products.map(function(product) {
            const href = 'affiliate-details.html?id=' + encodeURIComponent(String(product.id || ''));
            const priceText = getPriceText(product);
            const specsHtml = getSpecRows(product);
            const vendorButtonText = 'View Details';
            const pid = String(product.id || '');
            const affUrl = String(product.affiliateUrl || '').trim();
            const useVendorDirect = affUrl && affUrl.length > 0;
            const primaryHref = useVendorDirect ? affUrl : href;
            const primaryTarget = useVendorDirect ? 'target="_blank" rel="noopener noreferrer"' : '';
            const primaryDataAttr = useVendorDirect ? 'data-affiliate-direct-buy="1"' : '';
            return [
                '<div class="package-card" style="text-align:left;">',
                '<div style="border-radius:16px;overflow:hidden;background:var(--surface);margin-bottom:18px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;">',
                '<img src="' + String(product.image || 'productsimages/logo.jpg') + '" alt="' + String(product.title || product.id) + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy">',
                '</div>',
                '<a href="' + (useVendorDirect ? primaryHref : href) + '" ' + (useVendorDirect ? primaryTarget : '') + ' style="color:inherit;text-decoration:none;"><div class="package-title" style="margin:0;text-align:left;font-size:1.35rem;">' + String(product.title || product.id) + '</div></a>',
                '<div class="package-desc" style="margin-top:10px;margin-bottom:0;text-align:left;">' + String(product.description || '') + '</div>',
                (priceText ? ('<div style="margin-top:14px;font-weight:900;color:var(--primary);font-size:1.5rem;">' + priceText + '</div>') : ''),
                specsHtml,
                '<div style="margin-top:18px;display:grid;gap:10px;">',
                '<a class="btn btn-primary" href="' + primaryHref + '" ' + primaryTarget + ' ' + primaryDataAttr + ' data-affiliate-card-click="1" data-affiliate-id="' + pid.replace(/"/g, '&quot;') + '" data-affiliate-url="' + affUrl.replace(/"/g, '&quot;') + '" style="width:100%;display:inline-flex;justify-content:center;">' + vendorButtonText + '</a>',
                '</div>',
                '</div>'
            ].join('');
        }).join('');

        // Delegate click tracking on affiliate cards
        try {
            grid.querySelectorAll('[data-affiliate-card-click="1"]').forEach(function(el) {
                el.addEventListener('click', function(e) {
                    var id = el.getAttribute('data-affiliate-id') || '';
                    var url = el.getAttribute('data-affiliate-url') || '';
                    // If vendor direct buy, ensure POST survives new tab via keepalive
                    trackAffiliateClick(id, url);
                });
            });
        } catch (_e) {}
    }

    function initSearchAndFilter() {
        const allProducts = normalizeAffiliate();
        const totalCount = allProducts.length;

        const searchInput = $('affiliate-search');
        const filterSelect = $('affiliate-filter');

        if (filterSelect) {
            const options = collectFilterOptions(allProducts);
            options.forEach(function(opt) {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label;
                filterSelect.appendChild(o);
            });
        }

        let debounceTimer = null;
        function runFilter() {
            const query = searchInput ? String(searchInput.value || '').trim() : '';
            const filterValue = filterSelect ? String(filterSelect.value || '').trim() : '';
            const filterLabelEl = filterSelect && filterValue
                ? filterSelect.options[filterSelect.selectedIndex]
                : null;
            const filterLabel = filterLabelEl ? String(filterLabelEl.textContent || '').trim() : '';

            const filtered = allProducts.filter(function(p) {
                return productMatchesCategory(p, filterValue) && productMatchesSearch(p, query);
            });

            renderProducts(filtered);
            showResultsInfo('affiliate-results-info', filtered.length, totalCount, query, filterValue ? filterLabel : '');
        }

        if (searchInput) {
            searchInput.addEventListener('input', function() {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(runFilter, 180);
            });
        }
        if (filterSelect) {
            filterSelect.addEventListener('change', runFilter);
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        initPageBranding();
        renderProducts();
        initSearchAndFilter();
    });
})();
