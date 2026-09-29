(function() {
    'use strict';

    function $(id) {
        return document.getElementById(id);
    }

    function formatMoney(amount) {
        const value = Number(amount || 0);
        return (BUSINESS.currency || '') + value.toLocaleString('en-NG');
    }

    function normalizeProducts() {
        if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) return PRODUCTS;
        if (Array.isArray(window.PRODUCTS)) return window.PRODUCTS;
        return [];
    }

    function getBestPackage(product) {
        const packages = product && Array.isArray(product.packages) ? product.packages.slice() : [];
        packages.sort(function(a, b) {
            return Number(a && a.price ? a.price : 0) - Number(b && b.price ? b.price : 0);
        });
        return packages.length ? packages[0] : null;
    }

    function initPageBranding() {
        const badge = $('multi-badge');
        const title = $('multi-title');
        const desc = $('multi-desc');

        if (badge) badge.textContent = String(BUSINESS.shortName || BUSINESS.name || 'STORE');
        if (title) title.textContent = (typeof STORE_CONTENT !== 'undefined' && STORE_CONTENT.bannerTitle) ? String(STORE_CONTENT.bannerTitle) : String(BUSINESS.shortName || 'Shop Products');
        if (desc) desc.textContent = (typeof STORE_CONTENT !== 'undefined' && STORE_CONTENT.bannerSubtitle) ? String(STORE_CONTENT.bannerSubtitle) : 'Choose a product, view details, add to cart, and checkout securely.';

        document.title = String(BUSINESS.shortName || BUSINESS.name || 'Store');
    }

    function collectFilterOptions(products) {
        const seen = new Set();
        const options = [];
        products.forEach(function(p) {
            const raw = String(p && p.productType ? p.productType : '').trim();
            if (!raw) return;
            const key = raw.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            const label = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
            options.push({ value: key, label: label });
        });
        return options.sort(function(a, b) { return a.label.localeCompare(b.label); });
    }

    function productMatchesType(product, filter) {
        if (!filter) return true;
        const type = String(product && product.productType ? product.productType : '').trim().toLowerCase();
        return type === filter;
    }

    function productMatchesSearch(product, query) {
        if (!query) return true;
        const q = query.toLowerCase();
        const fields = [
            product.title || '',
            product.shortTitle || '',
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
        const grid = $('multi-products-grid');
        const empty = $('multi-products-empty');
        if (!grid) return;

        const products = Array.isArray(productsToRender) ? productsToRender : normalizeProducts();

        if (!products.length) {
            grid.innerHTML = '';
            if (empty) empty.classList.remove('owner-hidden');
            return;
        }

        if (empty) empty.classList.add('owner-hidden');

        grid.innerHTML = products.map(function(product) {
            const href = 'product-details.html?id=' + encodeURIComponent(String(product.id || ''));
            const pkg = getBestPackage(product);
            const priceText = pkg ? formatMoney(pkg.price || 0) : '';
            return [
                '<div class="package-card" style="text-align:left;">',
                '<div style="border-radius:16px;overflow:hidden;background:var(--surface);margin-bottom:18px;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;">',
                '<img src="' + String(product.image || 'productsimages/logo.jpg') + '" alt="' + String(product.title || product.id) + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy">',
                '</div>',
                '<div class="package-title" style="margin:0;text-align:left;font-size:1.35rem;">' + String(product.title || product.id) + '</div>',
                '<div class="package-desc" style="margin-top:10px;margin-bottom:0;text-align:left;">' + String(product.description || '') + '</div>',
                '<div style="margin-top:14px;font-weight:900;color:var(--primary);font-size:1.5rem;">' + priceText + '</div>',
                '<div style="margin-top:18px;display:grid;gap:10px;">',
                '<button type="button" class="btn btn-outline" data-add-cart="' + String(product.id || '') + '" data-default-package="' + String(pkg && pkg.id ? pkg.id : '') + '" style="width:100%;">Add to Cart</button>',
                '<a class="btn btn-primary" href="' + href + '" style="width:100%;display:inline-flex;justify-content:center;">Buy Now</a>',
                '</div>',
                '</div>'
            ].join('');
        }).join('');

        grid.querySelectorAll('[data-add-cart]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const productId = String(btn.getAttribute('data-add-cart') || '').trim();
                const packageId = String(btn.getAttribute('data-default-package') || '').trim();
                if (!productId || !packageId) return;
                if (window.PMELAB_CART && typeof window.PMELAB_CART.addItem === 'function') {
                    window.PMELAB_CART.addItem(productId, packageId, 1);
                    if (typeof window.PMELAB_CART.open === 'function') {
                        window.PMELAB_CART.open();
                    }
                }
            });
        });
    }

    function initSearchAndFilter() {
        const allProducts = normalizeProducts();
        const totalCount = allProducts.length;

        const searchInput = $('multi-search');
        const filterSelect = $('multi-filter');

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
                return productMatchesType(p, filterValue) && productMatchesSearch(p, query);
            });

            renderProducts(filtered);
            showResultsInfo('multi-results-info', filtered.length, totalCount, query, filterValue ? filterLabel : '');
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
        if (window.PMELAB_CART && typeof window.PMELAB_CART.init === 'function') {
            window.PMELAB_CART.init();
        }
    });
})();
