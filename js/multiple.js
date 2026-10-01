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

    // =========================================================
    // ESCAPE & HELPERS
    // =========================================================
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text != null ? String(text) : '';
        return div.innerHTML;
    }

    function slugifyFaqId(text) {
        return 'faq-' + String(text || '')
            .toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function getFirstWhatsapp() {
        if (typeof WHATSAPP_NUMBERS !== 'undefined' && Array.isArray(WHATSAPP_NUMBERS)) {
            var first = WHATSAPP_NUMBERS.find(function(n) { return n && n.enabled && n && n.number && String(n.number).trim().length; });
            if (first) return first;
            if (WHATSAPP_NUMBERS[0] && WHATSAPP_NUMBERS[0].number) return WHATSAPP_NUMBERS[0];
        }
        var fallback = { number: (BUSINESS && BUSINESS.phone) ? String(BUSINESS.phone).replace(/\D/g, '') : '', label: 'WhatsApp' };
        return fallback;
    }

    function buildWhatsappUrl(number, preText) {
        var raw = number || '';
        if (!raw) return '#';
        var digits = String(raw).replace(/\D/g, '');
        if (!digits) return '#';
        var base = 'https://wa.me/' + digits;
        if (preText) base += '?text=' + encodeURIComponent(preText);
        return base;
    }

    function getDefaultWhatsappText() {
        var brand = (BUSINESS && BUSINESS.shortName) ? BUSINESS.shortName : (BUSINESS && BUSINESS.name ? BUSINESS.name : 'the store');
        return 'Hi ' + brand + '! I would like to make an enquiry.';
    }

    // =========================================================
    // RENDER HEADER (NAVIGATION + LOGO)
    // =========================================================
    function renderHeader() {
        var logoContainer = $('multi-logo');
        var navContainer = $('multi-nav-desktop');
        var mobileNav = $('multi-mobile-nav');

        if (logoContainer && typeof LOGO !== 'undefined') {
            try {
                if (LOGO.type === 'image' && LOGO.image) {
                    logoContainer.innerHTML = '<img src="' + String(LOGO.image) + '" alt="' + escapeHtml(LOGO.alt || BUSINESS.name) + '" loading="eager">';
                } else if (LOGO.type === 'text' && LOGO.text) {
                    logoContainer.innerHTML = '<span class="logo-text" style="font-weight:900;font-size:1.4rem;letter-spacing:0.3px;">' + escapeHtml(LOGO.text) + '</span>';
                }
            } catch (_e) {}
        }

        if (navContainer && typeof NAVIGATION !== 'undefined' && Array.isArray(NAVIGATION)) {
            try {
                navContainer.innerHTML = '';
                NAVIGATION.forEach(function(item) {
                    if (!item) return;
                    var a = document.createElement('a');
                    a.href = String(item.href || '#');
                    a.className = 'nav-link';
                    a.textContent = String(item.label || '');
                    navContainer.appendChild(a);
                });
                // Cart CTA button
                var cta = document.createElement('a');
                cta.href = 'cart-checkout.html';
                cta.className = 'header-cta';
                cta.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> CART';
                navContainer.appendChild(cta);
            } catch (_e) {}
        }

        if (mobileNav && typeof NAVIGATION !== 'undefined' && Array.isArray(NAVIGATION)) {
            try {
                mobileNav.innerHTML = '';
                NAVIGATION.forEach(function(item) {
                    if (!item) return;
                    var a = document.createElement('a');
                    a.href = String(item.href || '#');
                    a.textContent = String(item.label || '');
                    mobileNav.appendChild(a);
                });
            } catch (_e) {}
        }
    }

    // =========================================================
    // RENDER FAQ
    // =========================================================
    function renderFAQ() {
        var container = document.querySelector('.faq-list');
        if (!container) return;
        if (typeof FAQ === 'undefined' || !Array.isArray(FAQ)) return;

        var enabledFAQ = FAQ.filter(function(f) { return f && f.enabled; });
        container.innerHTML = '';

        enabledFAQ.forEach(function(item) {
            var faqItem = document.createElement('div');
            faqItem.className = 'faq-item';
            faqItem.id = item.id || slugifyFaqId(item.question);
            faqItem.innerHTML =
                '<div class="faq-question" role="button" tabindex="0" aria-expanded="false">' +
                '<span>' + escapeHtml(item.question) + '</span>' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
                '</div>' +
                '<div class="faq-answer"><p>' + escapeHtml(item.answer) + '</p></div>';

            var question = faqItem.querySelector('.faq-question');
            question.addEventListener('click', function() {
                var isActive = faqItem.classList.contains('active');
                document.querySelectorAll('.faq-item').forEach(function(i) {
                    i.classList.remove('active');
                    var q = i.querySelector('.faq-question');
                    if (q) q.setAttribute('aria-expanded', 'false');
                });
                if (!isActive) {
                    faqItem.classList.add('active');
                    question.setAttribute('aria-expanded', 'true');
                }
            });
            question.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    question.click();
                }
            });
            container.appendChild(faqItem);
        });

        function openFaqFromHash() {
            var targetId = window.location.hash ? window.location.hash.substring(1) : '';
            if (!targetId) return;
            var targetItem = document.getElementById(targetId);
            if (!targetItem || !targetItem.classList.contains('faq-item')) return;
            var q = targetItem.querySelector('.faq-question');
            if (q) q.click();
        }
        openFaqFromHash();
        if (!window.__multiFaqHashBound) {
            window.addEventListener('hashchange', openFaqFromHash);
            window.__multiFaqHashBound = true;
        }
    }

    // =========================================================
    // RENDER FOOTER (BRAND + LINKS + SOCIAL + CONTACT + COPYRIGHT)
    // =========================================================
    function renderFooter() {
        var footerName = document.querySelector('.footer-brand-name');
        var footerDesc = document.querySelector('.footer-brand-desc');
        var quickLinks = document.querySelector('.footer-quick-links');
        var legalLinks = document.querySelector('.footer-legal-links');
        var socialContainer = document.querySelector('.footer-social');
        var copyright = document.querySelector('.footer-copyright');
        var footerPhone = $('footer-phone');
        var footerEmail = $('footer-email');
        var footerAddress = $('footer-address');
        var footerWaCta = document.querySelector('.footer-whatsapp-cta');
        var footerEmailCta = $('footer-email-cta');

        var bizName = (BUSINESS && BUSINESS.name) ? BUSINESS.name : '';

        if (footerName) footerName.textContent = bizName;
        if (footerDesc && bizName) footerDesc.textContent = bizName + ' is committed to providing quality products and excellent customer service.';

        // Footer contact info
        if (footerPhone && BUSINESS && BUSINESS.phone) {
            footerPhone.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:6px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/></svg>' + escapeHtml(String(BUSINESS.phone));
        }
        if (footerEmail && BUSINESS && BUSINESS.email) {
            footerEmail.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:6px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' + escapeHtml(String(BUSINESS.email));
            if (footerEmailCta) footerEmailCta.href = 'mailto:' + String(BUSINESS.email);
        }
        if (footerAddress && BUSINESS && BUSINESS.address) {
            footerAddress.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:6px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + escapeHtml(String(BUSINESS.address));
        }

        // Footer WhatsApp CTA
        if (footerWaCta) {
            var wa = getFirstWhatsapp();
            var waUrl = buildWhatsappUrl(wa.number, getDefaultWhatsappText());
            footerWaCta.href = waUrl;
            footerWaCta.target = '_blank';
            footerWaCta.rel = 'noopener noreferrer';
        }

        // Quick links
        if (quickLinks && typeof FOOTER_LINKS !== 'undefined' && FOOTER_LINKS.quickLinks && Array.isArray(FOOTER_LINKS.quickLinks)) {
            try {
                quickLinks.innerHTML = '';
                FOOTER_LINKS.quickLinks.forEach(function(link) {
                    if (!link || !link.label) return;
                    var a = document.createElement('a');
                    a.href = String(link.href || '#');
                    a.textContent = String(link.label);
                    quickLinks.appendChild(a);
                });
            } catch (_e) {}
        }

        // Legal links
        if (legalLinks && typeof FOOTER_LINKS !== 'undefined' && FOOTER_LINKS.legalLinks && Array.isArray(FOOTER_LINKS.legalLinks)) {
            try {
                legalLinks.innerHTML = '';
                FOOTER_LINKS.legalLinks.forEach(function(link) {
                    if (!link || !link.label) return;
                    var a = document.createElement('a');
                    a.href = String(link.href || '#');
                    a.textContent = String(link.label);
                    legalLinks.appendChild(a);
                });
            } catch (_e) {}
        }

        // Social icons
        if (socialContainer && typeof SOCIAL_LINKS !== 'undefined') {
            try {
                socialContainer.innerHTML = '';
                var socialMap = {
                    instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
                    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
                    tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>',
                    youtube: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.53c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>',
                    twitter: '<path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>'
                };
                Object.keys(SOCIAL_LINKS).forEach(function(key) {
                    var url = SOCIAL_LINKS[key];
                    if (!url) return;
                    var a = document.createElement('a');
                    a.href = String(url);
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.setAttribute('aria-label', String(key));
                    a.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (socialMap[key] || '') + '</svg>';
                    socialContainer.appendChild(a);
                });
            } catch (_e) {}
        }

        if (copyright) {
            copyright.innerHTML = '&copy; ' + new Date().getFullYear() + ' ' + escapeHtml(bizName) + '. All rights reserved.';
        }
    }

    // =========================================================
    // RENDER FLOATING WHATSAPP + SEO
    // =========================================================
    function renderFloatingWhatsappAndSeo() {
        var wa = getFirstWhatsapp();
        var waUrl = buildWhatsappUrl(wa.number, getDefaultWhatsappText());

        var floatingBtn = document.querySelector('#multi-floating-whatsapp a');
        if (floatingBtn) {
            floatingBtn.href = waUrl;
            floatingBtn.target = '_blank';
            floatingBtn.rel = 'noopener noreferrer';
        }

        // Browser title (SEO)
        if (typeof SEO !== 'undefined' && SEO && SEO.title) {
            try { document.title = String(SEO.title); } catch (_e) {}
        }
        if (typeof SEO !== 'undefined' && SEO && SEO.description) {
            try {
                var meta = document.querySelector('meta[name="description"]');
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.setAttribute('name', 'description');
                    document.head.appendChild(meta);
                }
                meta.setAttribute('content', String(SEO.description));
                var keywords = document.querySelector('meta[name="keywords"]');
                if (!keywords) {
                    keywords = document.createElement('meta');
                    keywords.setAttribute('name', 'keywords');
                    document.head.appendChild(keywords);
                }
                if (SEO.keywords) keywords.setAttribute('content', String(SEO.keywords));
                var ogTitle = document.querySelector('meta[property="og:title"]');
                if (!ogTitle) {
                    ogTitle = document.createElement('meta');
                    ogTitle.setAttribute('property', 'og:title');
                    document.head.appendChild(ogTitle);
                }
                ogTitle.setAttribute('content', String(SEO.title));
                var ogDesc = document.querySelector('meta[property="og:description"]');
                if (!ogDesc) {
                    ogDesc = document.createElement('meta');
                    ogDesc.setAttribute('property', 'og:description');
                    document.head.appendChild(ogDesc);
                }
                ogDesc.setAttribute('content', String(SEO.description));
                if (SEO.socialImage) {
                    var ogImg = document.querySelector('meta[property="og:image"]');
                    if (!ogImg) {
                        ogImg = document.createElement('meta');
                        ogImg.setAttribute('property', 'og:image');
                        document.head.appendChild(ogImg);
                    }
                    ogImg.setAttribute('content', String(SEO.socialImage));
                }
                if (SEO.canonicalUrl) {
                    var canonical = document.querySelector('link[rel="canonical"]');
                    if (!canonical) {
                        canonical = document.createElement('link');
                        canonical.setAttribute('rel', 'canonical');
                        document.head.appendChild(canonical);
                    }
                    canonical.setAttribute('href', String(SEO.canonicalUrl));
                }
            } catch (_e) {}
        }

        // Floating button hover effect
        if (floatingBtn) {
            floatingBtn.addEventListener('mouseenter', function() {
                floatingBtn.style.transform = 'scale(1.08)';
            });
            floatingBtn.addEventListener('mouseleave', function() {
                floatingBtn.style.transform = '';
            });
        }
    }

    // =========================================================
    // INIT ORDER
    // =========================================================
    document.addEventListener('DOMContentLoaded', function() {
        initPageBranding();
        try { renderHeader(); } catch (_e) {}
        renderProducts();
        initSearchAndFilter();
        try { renderFAQ(); } catch (_e) {}
        try { renderFooter(); } catch (_e) {}
        try { renderFloatingWhatsappAndSeo(); } catch (_e) {}
        if (window.PMELAB_CART && typeof window.PMELAB_CART.init === 'function') {
            window.PMELAB_CART.init();
        }
    });
})();
