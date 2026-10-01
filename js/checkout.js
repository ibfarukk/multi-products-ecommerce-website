(function() {
    'use strict';

    function $(id) {
        return document.getElementById(id);
    }

    function getMode() {
        if (window.PMELAB_SITE && typeof window.PMELAB_SITE.getMode === 'function') {
            return window.PMELAB_SITE.getMode();
        }
        try {
            const raw = typeof WEBSITE_TYPE_SELECT !== 'undefined' ? String(WEBSITE_TYPE_SELECT) : 'singleproduct';
            return raw.trim().toLowerCase();
        } catch (error) {
            return 'singleproduct';
        }
    }

    function getHomeHref(mode) {
        if (mode === 'multipleproducts') return 'multiple.html';
        if (mode === 'affiliate') return 'affiliate.html';
        return 'index.html';
    }

    function updateProductsLinks(mode) {
        const href = getHomeHref(mode);
        document.querySelectorAll('[data-nav-products]').forEach(function(a) {
            a.setAttribute('href', href);
        });
    }

    function injectCssVariables() {
        if (typeof BRAND === 'undefined' || !BRAND) return;
        const root = document.documentElement;
        root.style.setProperty('--primary', BRAND.primaryColor);
        root.style.setProperty('--primary-dark', BRAND.primaryDark);
        root.style.setProperty('--primary-light', BRAND.primaryLight);
        root.style.setProperty('--background', BRAND.backgroundColor);
        root.style.setProperty('--surface', BRAND.lightBackground);
        root.style.setProperty('--text', BRAND.textColor);
        root.style.setProperty('--muted', BRAND.mutedTextColor);
        root.style.setProperty('--border', BRAND.borderColor);
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = String(text || '');
        return div.innerHTML;
    }

    var paymentModalInjected = false;
    var paymentModalAutoTimer = null;

    function ensurePaymentModalInjected() {
        if (paymentModalInjected) return;
        paymentModalInjected = true;

        var css = [
            '.pm-overlay{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity 220ms ease,visibility 220ms ease;padding:16px;}',
            '.pm-overlay.pm-open{opacity:1;visibility:visible;}',
            '.pm-dialog{width:100%;max-width:480px;background:#ffffff;border-radius:20px;box-shadow:0 30px 80px -20px rgba(15,23,42,0.35),0 10px 30px -10px rgba(15,23,42,0.2);transform:translateY(16px) scale(0.97);transition:transform 240ms cubic-bezier(0.16,1,0.3,1);overflow:hidden;border:1px solid rgba(15,23,42,0.06);}',
            '.pm-overlay.pm-open .pm-dialog{transform:translateY(0) scale(1);}',
            '.pm-header{position:relative;padding:22px 24px 10px;}',
            '.pm-close{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:10px;border:none;background:rgba(15,23,42,0.05);color:#0f172a;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 150ms ease,transform 100ms ease;}',
            '.pm-close:hover{background:rgba(15,23,42,0.1);}',
            '.pm-close:active{transform:scale(0.95);}',
            '.pm-icon-wrap{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;}',
            '.pm-icon-wrap svg{width:30px;height:30px;}',
            '.pm-severity-error .pm-icon-wrap{background:linear-gradient(135deg,#fee2e2 0%,#fecaca 100%);color:#dc2626;}',
            '.pm-severity-warning .pm-icon-wrap{background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);color:#b45309;}',
            '.pm-severity-info .pm-icon-wrap{background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%);color:#1d4ed8;}',
            '.pm-severity-label{font-size:0.72rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;}',
            '.pm-severity-error .pm-severity-label{color:#dc2626;}',
            '.pm-severity-warning .pm-severity-label{color:#b45309;}',
            '.pm-severity-info .pm-severity-label{color:#1d4ed8;}',
            '.pm-title{font-size:1.2rem;font-weight:700;color:#0f172a;line-height:1.35;margin:0 0 8px;}',
            '.pm-desc{font-size:0.92rem;color:#475569;line-height:1.55;margin:0;}',
            '.pm-body{padding:4px 24px 4px;}',
            '.pm-fields{margin-top:12px;padding:12px 14px;border-radius:12px;background:rgba(248,250,252,0.9);border:1px solid rgba(15,23,42,0.06);}',
            '.pm-fields:empty{display:none;}',
            '.pm-field-item{display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:0.86rem;color:#334155;}',
            '.pm-field-item + .pm-field-item{border-top:1px dashed rgba(15,23,42,0.07);}',
            '.pm-field-item svg{width:16px;height:16px;flex-shrink:0;margin-top:2px;}',
            '.pm-severity-error .pm-field-item svg{color:#dc2626;}',
            '.pm-severity-warning .pm-field-item svg{color:#b45309;}',
            '.pm-severity-info .pm-field-item svg{color:#1d4ed8;}',
            '.pm-footer{padding:18px 24px 22px;display:flex;gap:10px;flex-wrap:wrap;}',
            '.pm-footer .pm-btn-primary{flex:1 1 100%;padding:12px 18px;border-radius:12px;border:none;font-size:0.92rem;font-weight:600;cursor:pointer;transition:transform 100ms ease,box-shadow 150ms ease,filter 150ms ease;color:#fff;}',
            '.pm-footer .pm-btn-secondary{flex:1 1 48%;padding:11px 16px;border-radius:12px;border:1px solid rgba(15,23,42,0.1);background:#fff;font-size:0.9rem;font-weight:500;color:#0f172a;cursor:pointer;}',
            '.pm-severity-error .pm-btn-primary{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);box-shadow:0 8px 20px -8px rgba(220,38,38,0.5);}',
            '.pm-severity-warning .pm-btn-primary{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);box-shadow:0 8px 20px -8px rgba(217,119,6,0.5);}',
            '.pm-severity-info .pm-btn-primary{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);box-shadow:0 8px 20px -8px rgba(37,99,235,0.5);}',
            '.pm-footer button:hover{filter:brightness(1.04);}',
            '.pm-footer button:active{transform:scale(0.985);}',
            '@media (max-width:480px){.pm-dialog{border-radius:16px;}.pm-header{padding:20px 18px 8px;}.pm-body{padding:4px 18px 4px;}.pm-footer{padding:16px 18px 20px;}.pm-title{font-size:1.1rem;}}'
        ].join('');
        var styleEl = document.createElement('style');
        styleEl.setAttribute('data-payment-modal', '1');
        styleEl.textContent = css;
        (document.head || document.getElementsByTagName('head')[0]).appendChild(styleEl);

        var overlay = document.createElement('div');
        overlay.id = 'pm-modal-overlay';
        overlay.className = 'pm-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'pm-title');
        overlay.innerHTML = [
            '<div class="pm-dialog" id="pm-dialog">',
            '  <div class="pm-header">',
            '    <button type="button" class="pm-close" id="pm-close" aria-label="Close">',
            '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            '    </button>',
            '    <div class="pm-icon-wrap" id="pm-icon-wrap"></div>',
            '    <div class="pm-severity-label" id="pm-severity-label"></div>',
            '    <h3 class="pm-title" id="pm-title"></h3>',
            '    <p class="pm-desc" id="pm-desc"></p>',
            '  </div>',
            '  <div class="pm-body">',
            '    <div class="pm-fields" id="pm-fields"></div>',
            '  </div>',
            '  <div class="pm-footer" id="pm-footer"></div>',
            '</div>'
        ].join('');
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) hidePaymentError();
        });
        overlay.querySelector('#pm-close').addEventListener('click', function() {
            hidePaymentError();
        });
        document.addEventListener('keydown', function pmKeyHandler(e) {
            if (e.key === 'Escape' && overlay.classList.contains('pm-open')) hidePaymentError();
        });
    }

    function friendlyPaymentMessage(rawMsg, severity) {
        var msg = String(rawMsg || '').trim().toLowerCase();
        if (!msg) return severity === 'error' ? 'Something went wrong while processing your payment.' : 'Please review your details and try again.';
        if (msg.indexOf('sdk not loaded') >= 0 || msg.indexOf('paystack sdk') >= 0 || msg.indexOf('flutterwave sdk') >= 0) {
            return 'We could not load the payment provider. Please check your internet connection and refresh the page.';
        }
        if (msg.indexOf('is disabled') >= 0 || msg.indexOf('key not configured') >= 0) {
            return 'This payment method is currently unavailable. Please choose another option or try again later.';
        }
        if (msg.indexOf('paystack_closed') >= 0 || msg.indexOf('flutterwave_closed') >= 0 || msg.indexOf('payment window closed') >= 0) {
            return 'You closed the payment window before completing the transaction. No charge was made.';
        }
        if (msg.indexOf('receipt') >= 0 && msg.indexOf('upload') >= 0) {
            return 'Please upload your payment receipt before submitting.';
        }
        if (msg.indexOf('manual order') >= 0) {
            return 'We could not submit your payment details. Please confirm your internet connection and try again.';
        }
        if (msg.indexOf('verification') >= 0) {
            return 'We could not verify this payment at this time. Your transaction will be reviewed shortly by our team.';
        }
        if (msg.indexOf('unknown online') >= 0) {
            return 'The selected payment method is not recognized. Please choose another option.';
        }
        if (msg.indexOf('missing product') >= 0 || msg.indexOf('product not found') >= 0) {
            return 'We could not find the product you are trying to purchase. Please return to the store and try again.';
        }
        if (msg.indexOf('site configuration') >= 0) {
            return 'Store configuration is temporarily unavailable. Please refresh the page or try again in a few minutes.';
        }
        if (msg.indexOf('name') >= 0 && (msg.indexOf('email') >= 0 || msg.indexOf('phone') >= 0)) {
            return rawMsg || 'Please fill in your name, email address, and phone number.';
        }
        if (msg.indexOf('select a package') >= 0) {
            return rawMsg || 'Please choose a package before proceeding to payment.';
        }
        if (msg.indexOf('delivery address') >= 0) {
            return rawMsg || 'Please enter your delivery address for physical product shipping.';
        }
        return rawMsg;
    }

    function showPaymentError(options) {
        try {
            ensurePaymentModalInjected();
            var overlay = $('pm-modal-overlay');
            if (!overlay) return;

            if (paymentModalAutoTimer) {
                clearTimeout(paymentModalAutoTimer);
                paymentModalAutoTimer = null;
            }

            var opts = options || {};
            var severity = opts.severity === 'warning' || opts.severity === 'info' ? opts.severity : 'error';
            var title = String(opts.title || (severity === 'error' ? 'We couldn\u2019t complete your payment' : (severity === 'warning' ? 'Please review your details' : 'Heads up')));
            var description = friendlyPaymentMessage(opts.message || opts.description || '', severity);
            var fields = Array.isArray(opts.fields) ? opts.fields : [];
            var actions = Array.isArray(opts.actions) && opts.actions.length ? opts.actions : [
                { label: opts.ctaLabel || (severity === 'warning' ? 'Fix details' : (severity === 'info' ? 'Got it' : 'Try again')), primary: true }
            ];

            overlay.className = 'pm-overlay pm-severity-' + severity;
            // force reflow before adding pm-open
            void overlay.offsetWidth;
            overlay.classList.add('pm-open');

            var iconWrap = $('pm-icon-wrap');
            var svgs = {
                error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
                warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y1="17"/></svg>',
                info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            };
            if (iconWrap) iconWrap.innerHTML = svgs[severity] || svgs.error;

            var sevLabel = $('pm-severity-label');
            if (sevLabel) sevLabel.textContent = severity === 'error' ? 'Payment error' : (severity === 'warning' ? 'Action required' : 'Notice');
            var titleEl = $('pm-title');
            if (titleEl) titleEl.textContent = title;
            var descEl = $('pm-desc');
            if (descEl) descEl.textContent = description;

            var fieldsEl = $('pm-fields');
            if (fieldsEl) {
                fieldsEl.innerHTML = '';
                fields.forEach(function(fieldMsg) {
                    var item = document.createElement('div');
                    item.className = 'pm-field-item';
                    item.innerHTML = (svgs[severity] || svgs.error) + '<span>' + escapeHtml(String(fieldMsg || '')) + '</span>';
                    fieldsEl.appendChild(item);
                });
            }

            var footerEl = $('pm-footer');
            if (footerEl) {
                footerEl.innerHTML = '';
                actions.forEach(function(action, idx) {
                    if (!action || !action.label) return;
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = action.primary === false ? 'pm-btn-secondary' : 'pm-btn-primary';
                    btn.textContent = String(action.label);
                    btn.addEventListener('click', function() {
                        if (typeof action.onClick === 'function') {
                            try { action.onClick(); } catch (_e) {}
                        }
                        if (action.close !== false) hidePaymentError();
                    });
                    footerEl.appendChild(btn);
                });
            }

            document.body.style.overflow = 'hidden';

            if (severity !== 'error' && opts.autoDismiss !== false) {
                var ms = typeof opts.autoDismissMs === 'number' ? opts.autoDismissMs : 10000;
                paymentModalAutoTimer = setTimeout(hidePaymentError, ms);
            }
        } catch (_e) {}
    }

    function hidePaymentError() {
        try {
            var overlay = $('pm-modal-overlay');
            if (!overlay) return;
            overlay.classList.remove('pm-open');
            if (paymentModalAutoTimer) {
                clearTimeout(paymentModalAutoTimer);
                paymentModalAutoTimer = null;
            }
            setTimeout(function() {
                try { document.body.style.overflow = ''; } catch (_e) {}
            }, 260);
        } catch (_e) {}
    }

    if (typeof window !== 'undefined') {
        window.PMELAB_MODAL = {
            showPaymentError: showPaymentError,
            hidePaymentError: hidePaymentError
        };
    }

    function initMobileMenu() {
        const btn = document.querySelector('.mobile-menu-btn');
        const nav = document.querySelector('.mobile-nav');
        if (!btn || !nav) return;
        btn.addEventListener('click', function() {
            btn.classList.toggle('active');
            nav.classList.toggle('active');
            document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        });
        nav.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                btn.classList.remove('active');
                nav.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    function showError(message) {
        const el = $('checkout-error');
        if (!el) return;
        el.textContent = message || '';
        el.classList.toggle('owner-hidden', !message);
    }

    function getApiUrl(path) {
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        var base = '';
        if (typeof API_BASE_URL !== 'undefined') {
            base = String(API_BASE_URL == null ? '' : API_BASE_URL).trim();
            if (base === 'null' || base === 'undefined' || !base) base = '';
        }
        if (!base) return cleanPath;
        return base.replace(/\/+$/, '') + cleanPath;
    }

    function formatMoney(amount) {
        const currency = (typeof BUSINESS !== 'undefined' && BUSINESS && BUSINESS.currency) ? BUSINESS.currency : '₦';
        const value = Number(amount || 0);
        return currency + value.toLocaleString('en-NG');
    }

    function generateOrderRef() {
        const prefix = String((BUSINESS && BUSINESS.shortName) ? BUSINESS.shortName : 'ORDER').substring(0, 6).toUpperCase().replace(/\s+/g, '');
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return prefix + '-' + timestamp + random;
    }

    function getQueryParam(name) {
        const url = new URL(window.location.href);
        return url.searchParams.get(name);
    }

    function normalizeProducts() {
        if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) return PRODUCTS;
        return [];
    }

    function findProduct(id) {
        const pid = String(id || '').trim();
        return normalizeProducts().find(function(p) { return p.id === pid; }) || null;
    }

    function findPackage(product, packageId) {
        if (!product || !Array.isArray(product.packages)) return null;
        const pkgId = String(packageId || '').trim();
        return product.packages.find(function(p) { return p.id === pkgId; }) || null;
    }

    function computeTotals(product, pkg, qty) {
        const quantity = Number(qty || 0) || 1;
        const base = Number(pkg && pkg.price ? pkg.price : 0) * quantity;
        const shippingPerUnit = Number(product && product.shippingFee ? product.shippingFee : 0);
        const shipping = shippingPerUnit * quantity;
        return { base: base, shipping: shipping, total: base + shipping };
    }

    function toggleManual(show) {
        const manualBox = $('checkout-manual-details');
        if (manualBox) manualBox.classList.toggle('owner-hidden', !show);
        // Never allow HTML5 required on file inputs that can be hidden —
        // prevents "invalid form control is not focusable" when browser tries to validate
        syncReceiptRequiredState(show);
    }

    function syncReceiptRequiredState(manualActive) {
        try {
            var receiptRequired = !!(typeof PAYMENT !== 'undefined' && PAYMENT && PAYMENT.manualReceiptRequired);
            var inputs = document.querySelectorAll('input[type="file"][name="paymentReceipt"], #paymentReceipt, #checkout-receipt');
            inputs.forEach(function(inp) {
                // Strip HTML5 required attribute to avoid "not focusable" error when file input is in a hidden container
                inp.removeAttribute('required');
                if (inp.style && typeof inp.style.setProperty === 'function') {
                    inp.setAttribute('data-receipt-required', receiptRequired && manualActive ? '1' : '0');
                }
            });
            // Apply novalidate to any parent forms so HTML5 validation never runs
            // (we validate all fields in JS and show our own friendly modal)
            document.querySelectorAll('form').forEach(function(frm) {
                if (!frm.hasAttribute('novalidate')) frm.setAttribute('novalidate', 'novalidate');
            });
        } catch (_e) {}
    }

    function renderManualDetails() {
        if (typeof MANUAL_PAYMENT === 'undefined') return;
        const bank = $('checkout-manual-bank');
        const name = $('checkout-manual-account-name');
        const number = $('checkout-manual-account-number');
        const deadline = $('checkout-manual-deadline');

        if (bank) bank.textContent = MANUAL_PAYMENT.bankName || '';
        if (name) name.textContent = MANUAL_PAYMENT.accountName || '';
        if (number) number.textContent = MANUAL_PAYMENT.accountNumber || '';
        if (deadline) deadline.textContent = MANUAL_PAYMENT.paymentDeadline || '';
    }

    function getSelectedPaymentMethod(form) {
        const selectedRadio = form.querySelector('input[name="payment_method"]:checked');
        return selectedRadio ? String(selectedRadio.value || '').trim() : 'paystack';
    }

    function setSubmitting(submitting) {
        const btn = $('checkout-submit');
        if (!btn) return;
        btn.disabled = submitting;
        btn.textContent = submitting ? 'PROCESSING...' : 'PAY NOW';
    }

    function getCustomerInfo() {
        return {
            name: String(($('checkout-name').value || '')).trim(),
            email: String(($('checkout-email').value || '')).trim(),
            phone: String(($('checkout-phone').value || '')).trim(),
            address: String(($('checkout-address').value || '')).trim(),
            state: String(($('checkout-state').value || '')).trim(),
            city: String(($('checkout-city').value || '')).trim(),
            specialRequest: String(($('checkout-special').value || '')).trim()
        };
    }

    function setAddressRequired(isRequired) {
        const addressGroup = $('checkout-address-group');
        const locationRow = $('checkout-location-row');
        const addressInput = $('checkout-address');
        if (addressGroup) addressGroup.style.display = isRequired ? '' : 'none';
        if (locationRow) locationRow.style.display = isRequired ? '' : 'none';
        if (addressInput) addressInput.required = isRequired;
    }

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = value;
    }

    function updateSummary(product, pkg, qty, totals) {
        const productText = product ? String(product.title || product.id) : '—';
        const packageText = pkg ? String(pkg.title || pkg.id) : '—';
        const qtyText = String(qty || 1);
        const baseText = formatMoney(totals.base || 0);
        const shippingText = formatMoney(totals.shipping || 0);
        const totalText = formatMoney(totals.total || 0);

        setText('summary-product', productText);
        setText('summary-package', packageText);
        setText('summary-qty', qtyText);
        setText('summary-subtotal', baseText);
        setText('summary-shipping', shippingText);
        setText('summary-total', totalText);

        setText('m-summary-product', productText);
        setText('m-summary-package', packageText);
        setText('m-summary-qty', qtyText);
        setText('m-summary-subtotal', baseText);
        setText('m-summary-shipping', shippingText);
        setText('m-summary-total', totalText);
    }

    async function verifyPayment(payload, opts) {
        const maxRetries = 3;
        const backoffs = [900, 2200, 4500];
        const bannerId = (opts && opts.bannerId) ? String(opts.bannerId) : '';
        function setBanner(msg, color) {
            try {
                if (bannerId && typeof document !== 'undefined') {
                    const node = document.getElementById(bannerId);
                    if (node) {
                        node.textContent = msg || '';
                        node.style.color = (color === 'ok') ? '#065f46' : (color === 'warn') ? '#92400e' : '#b91c1c';
                        node.style.display = msg ? 'block' : 'none';
                    }
                }
            } catch (_e) {}
        }
        let lastErr = null;
        let lastData = {};
        for (let i = 0; i <= maxRetries; i++) {
            try {
                const res = await fetch(getApiUrl('/api/verify-payment'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json().catch(function() { return {}; });
                lastData = data || {};
                if (res.ok && data.success) return data;
                const txStatus = String((data && data.transaction_status) ? data.transaction_status : '').toLowerCase();
                const retryable = (res.status === 409 ||
                    res.status === 502 ||
                    (data && data.retryable === true) ||
                    ['pending','processing','ongoing','queued','unknown'].indexOf(txStatus) >= 0);
                if (retryable && i < maxRetries) {
                    const waitMs = backoffs[i] || 2500;
                    const msg = 'Attempt ' + (i + 2) + '/' + (maxRetries + 1) + ': confirming transaction is settling… retrying in ' + Math.round(waitMs/100)/10 + 's';
                    setBanner(msg, 'warn');
                    await new Promise(function(r){ setTimeout(r, waitMs); });
                    continue;
                }
                const e = new Error((data && data.error ? data.error : ('Payment verification failed (HTTP ' + res.status + ')')));
                e.verifyData = lastData;
                throw e;
            } catch (err) {
                lastErr = err;
                if (!err || err.verifyData) {} else { lastErr.verifyData = lastData; }
            }
        }
        lastErr = lastErr || new Error('Payment verification failed');
        lastErr.verifyData = Object.assign({}, lastData, lastErr && lastErr.verifyData ? lastErr.verifyData : {});
        throw lastErr;
    }

    async function submitManualOrder(payload, receiptFile) {
        const formData = new FormData();
        Object.keys(payload).forEach(function(key) {
            if (payload[key] === undefined || payload[key] === null) return;
            if (key === 'customer') {
                const customer = payload.customer || {};
                formData.append('customer_name', String(customer.name || ''));
                formData.append('customer_email', String(customer.email || ''));
                formData.append('customer_phone', String(customer.phone || ''));
                formData.append('customer_address', String(customer.address || ''));
                formData.append('customer_state', String(customer.state || ''));
                formData.append('customer_city', String(customer.city || ''));
                formData.append('customer_special_request', String(customer.specialRequest || ''));
                return;
            }
            formData.append(key, String(payload[key]));
        });
        if (receiptFile) {
            formData.append('payment_receipt', receiptFile, receiptFile.name);
        }

        const res = await fetch(getApiUrl('/api/manual-order'), {
            method: 'POST',
            body: formData
        });
        const data = await res.json().catch(function() { return {}; });
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Manual order submission failed');
        }
        return data;
    }

    function isPaymentEnabled(method) {
        const cfg = (typeof PAYMENT !== 'undefined' && PAYMENT) ? PAYMENT : {};
        const m = String(method || '').toLowerCase();
        if (m === 'paystack') return Boolean(cfg.paystackEnabled) && Boolean(cfg.paystackPublicKey);
        if (m === 'flutterwave') return Boolean(cfg.flutterwaveEnabled) && Boolean(cfg.flutterwavePublicKey);
        if (m === 'manual') {
            if (typeof MANUAL_PAYMENT !== 'undefined' && MANUAL_PAYMENT && typeof MANUAL_PAYMENT.enabled === 'boolean') return Boolean(MANUAL_PAYMENT.enabled);
            return Boolean(cfg.manualEnabled);
        }
        return false;
    }

    function showPaymentOptions(containerId) {
        const cfg = (typeof PAYMENT !== 'undefined' && PAYMENT) ? PAYMENT : {};
        const manualCfg = (typeof MANUAL_PAYMENT !== 'undefined' && MANUAL_PAYMENT) ? MANUAL_PAYMENT : null;
        const scope = containerId ? document.getElementById(containerId) : document;
        if (!scope) return;
        scope.querySelectorAll('[data-payment-opt="flutterwave"]').forEach(function(el) {
            el.style.display = (cfg.flutterwaveEnabled && cfg.flutterwavePublicKey) ? '' : 'none';
        });
        scope.querySelectorAll('[data-payment-opt="paystack"]').forEach(function(el) {
            el.style.display = (cfg.paystackEnabled && cfg.paystackPublicKey) ? '' : 'none';
        });
        scope.querySelectorAll('.payment-method[data-payment]').forEach(function(el) {
            var method = String(el.getAttribute('data-payment') || '').toLowerCase();
            if (!method) return;
            if (method === 'flutterwave' || method === 'paystack') return;
            if (method === 'manual') {
                var manualEnabled = true;
                if (manualCfg && typeof manualCfg.enabled === 'boolean') manualEnabled = Boolean(manualCfg.enabled);
                else if (typeof cfg.manualEnabled === 'boolean') manualEnabled = Boolean(cfg.manualEnabled);
                el.style.display = manualEnabled ? '' : 'none';
            }
        });
    }

    async function openPaystackPayment(payload, totalAmountKobo, customer) {
        if (typeof PaystackPop === 'undefined') {
            throw new Error('Paystack SDK not loaded.');
        }
        return new Promise(function(resolve, reject) {
            const handler = PaystackPop.setup({
                key: PAYMENT.paystackPublicKey,
                email: customer.email,
                amount: totalAmountKobo,
                currency: PAYMENT.currency || 'NGN',
                ref: payload.order_ref,
                metadata: {
                    custom_fields: [
                        { display_name: 'Customer Name', variable_name: 'customer_name', value: customer.name },
                        { display_name: 'Phone', variable_name: 'customer_phone', value: customer.phone }
                    ]
                },
                callback: function(response) { resolve({ reference: response.reference, provider: 'paystack' }); },
                onClose: function() { reject(new Error('paystack_closed')); }
            });
            handler.openIframe();
        });
    }

    async function openFlutterwavePayment(payload, totalAmount, customer) {
        if (typeof FlutterwaveCheckout === 'undefined') {
            throw new Error('Flutterwave SDK not loaded.');
        }
        return new Promise(function(resolve, reject) {
            var closedEarly = true;
            FlutterwaveCheckout({
                public_key: PAYMENT.flutterwavePublicKey,
                tx_ref: payload.order_ref,
                amount: Number(totalAmount || 0),
                currency: PAYMENT.currency || 'NGN',
                country: (typeof BUSINESS !== 'undefined' && BUSINESS && BUSINESS.country === 'Nigeria') ? 'NG' : (
                    typeof BUSINESS !== 'undefined' && BUSINESS && BUSINESS.country === 'Ghana' ? 'GH' :
                    (typeof BUSINESS !== 'undefined' && BUSINESS && BUSINESS.country === 'Kenya' ? 'KE' : 'NG')
                ),
                payment_options: 'card,banktransfer,ussd,mobilemoney',
                customer: {
                    email: customer.email,
                    name: customer.name,
                    phone_number: customer.phone
                },
                meta: {
                    customer_name: customer.name,
                    customer_phone: customer.phone,
                    package: payload.package_id,
                    quantity: payload.quantity
                },
                customizations: {
                    title: (typeof BUSINESS !== 'undefined' && BUSINESS && BUSINESS.name) ? BUSINESS.name : 'Payment',
                    description: payload.product || payload.package_title || 'Order Payment',
                    logo: (typeof BUSINESS !== 'undefined' && BUSINESS && BUSINESS.website) ? (BUSINESS.website.replace(/\/+$/, '') + '/productsimages/logo.jpg') : undefined
                },
                callback: function(response) {
                    closedEarly = false;
                    var id = response && response.transaction_id ? response.transaction_id : (response && response.data ? response.data.id : '');
                    var txRef = response && response.tx_ref ? response.tx_ref : (response && response.data ? response.data.tx_ref : payload.order_ref);
                    resolve({ transaction_id: id, tx_ref: txRef, provider: 'flutterwave' });
                },
                onclose: function() {
                    if (closedEarly) reject(new Error('flutterwave_closed'));
                }
            });
        });
    }

    async function executeOnlinePayment(method, payload, totalAmount, customer) {
        const cfg = (typeof PAYMENT !== 'undefined' && PAYMENT) ? PAYMENT : {};
        if (method === 'paystack') {
            if (!cfg.paystackEnabled) throw new Error('Paystack is disabled.');
            if (!cfg.paystackPublicKey) throw new Error('Paystack key not configured.');
            if (typeof PaystackPop === 'undefined') throw new Error('Paystack SDK not loaded.');
            trackOrderAttempt({
                order_ref: payload.order_ref,
                amount: totalAmount,
                currency: cfg.currency || 'NGN',
                reason: 'paystack_started',
                customer: customer
            });
            const totalKobo = Math.round(Number(totalAmount || 0) * 100);
            return openPaystackPayment(payload, totalKobo, customer);
        }
        if (method === 'flutterwave') {
            if (!cfg.flutterwaveEnabled) throw new Error('Flutterwave is disabled.');
            if (!cfg.flutterwavePublicKey) throw new Error('Flutterwave key not configured.');
            if (typeof FlutterwaveCheckout === 'undefined') throw new Error('Flutterwave SDK not loaded.');
            trackOrderAttempt({
                order_ref: payload.order_ref,
                amount: totalAmount,
                currency: cfg.currency || 'NGN',
                reason: 'flutterwave_started',
                customer: customer
            });
            return openFlutterwavePayment(payload, totalAmount, customer);
        }
        throw new Error('Unknown online payment method: ' + method);
    }

    async function trackOrderAttempt(data) {
        try {
            await fetch(getApiUrl('/api/track-order-attempt'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (error) {}
    }

    function applyOnlineProviderToPayload(raw) {
        if (raw && raw.provider && !raw.reference) {
            if (raw.provider === 'flutterwave') {
                if (raw.transaction_id) raw.reference = raw.transaction_id;
                else if (raw.tx_ref) raw.reference = raw.tx_ref;
            }
        }
        return raw;
    }

    function initCheckout(product) {
        const pkgSelect = $('checkout-package');
        const qtyInput = $('checkout-qty');
        const form = $('checkout-form');
        if (!pkgSelect || !qtyInput || !form) return;

        const packageFromUrl = getQueryParam('package');
        const qtyFromUrl = Number(getQueryParam('qty') || 1) || 1;

        const packages = Array.isArray(product.packages) ? product.packages : [];
        pkgSelect.innerHTML = packages.map(function(p) {
            return '<option value="' + String(p.id) + '">' + String(p.title || p.id) + ' — ' + formatMoney(p.price || 0) + '</option>';
        }).join('');

        if (packageFromUrl && packages.some(function(p) { return p.id === packageFromUrl; })) {
            pkgSelect.value = packageFromUrl;
        }

        qtyInput.value = String(qtyFromUrl > 0 ? Math.floor(qtyFromUrl) : 1);

        showPaymentOptions('checkout-payment-methods-container');
        syncReceiptRequiredState(false);

        function refreshSummary() {
            const pkg = findPackage(product, String(pkgSelect.value || ''));
            const qty = Number(qtyInput.value || 1) || 1;
            const totals = computeTotals(product, pkg, qty);
            updateSummary(product, pkg, qty, totals);
            const isPhysical = String(product.productType || '').toLowerCase() !== 'digital';
            setAddressRequired(isPhysical);
            return { pkg: pkg, qty: qty, totals: totals };
        }

        form.addEventListener('change', function(e) {
            if (e.target && e.target.name === 'payment_method') {
                toggleManual(getSelectedPaymentMethod(form) === 'manual');
            }
            refreshSummary();
        });

        qtyInput.addEventListener('change', refreshSummary);
        pkgSelect.addEventListener('change', refreshSummary);

        refreshSummary();
        toggleManual(false);
        renderManualDetails();

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            showError('');
            syncReceiptRequiredState(getSelectedPaymentMethod(form) === 'manual');

            const selection = refreshSummary();
            if (!selection.pkg) {
                var msgPkg = 'Select a package.';
                showError(msgPkg);
                showPaymentError({
                    severity: 'warning',
                    title: 'Choose a package first',
                    message: msgPkg,
                    fields: ['No package has been selected from the dropdown.'],
                    ctaLabel: 'Choose a package',
                    actions: [
                        { label: 'Choose a package', primary: true, onClick: function() { try { var s = document.getElementById('checkout-package'); if (s) { s.focus(); s.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } catch (_e) {} } },
                        { label: 'Close', primary: false }
                    ]
                });
                return;
            }

            const customer = getCustomerInfo();
            var custFields = [];
            if (!customer.name) custFields.push('Full name is required.');
            if (!customer.email) custFields.push('Email address is required.');
            if (!customer.phone) custFields.push('Phone number is required.');
            if (!customer.name || !customer.email || !customer.phone) {
                var msgCust = 'Please fill your name, email, and phone.';
                showError(msgCust);
                showPaymentError({
                    severity: 'warning',
                    title: 'Complete your contact details',
                    message: msgCust,
                    fields: custFields.length ? custFields : ['Name, email, and phone number must be provided.'],
                    ctaLabel: 'Fill details',
                    actions: [
                        { label: 'Fill details', primary: true, onClick: function() { try { var fn = document.getElementById('checkout-name'); if (fn) { fn.focus(); fn.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } catch (_e) {} } },
                        { label: 'Close', primary: false }
                    ]
                });
                return;
            }

            const isPhysical = String(product.productType || '').toLowerCase() !== 'digital';
            if (isPhysical && !customer.address) {
                var msgAddr = 'Please enter your delivery address.';
                showError(msgAddr);
                showPaymentError({
                    severity: 'warning',
                    title: 'Delivery address is required',
                    message: msgAddr,
                    fields: ['Shipping address is required for physical product delivery.'],
                    ctaLabel: 'Enter address',
                    actions: [
                        { label: 'Enter address', primary: true, onClick: function() { try { var adr = document.querySelector('#checkout-address, [name="customer_address"], textarea'); if (adr) { adr.focus(); adr.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } catch (_e) {} } },
                        { label: 'Close', primary: false }
                    ]
                });
                return;
            }

            const method = getSelectedPaymentMethod(form);
            const orderRef = generateOrderRef();

            const payload = {
                order_ref: orderRef,
                customer: customer,
                payment_method: method,
                currency: (typeof PAYMENT !== 'undefined' && PAYMENT && PAYMENT.currency) ? PAYMENT.currency : (BUSINESS.currencyCode || 'NGN'),
                product_id: String(product.id || ''),
                package_id: String(selection.pkg.id || ''),
                product: String(product.title || product.id || ''),
                package_title: String(selection.pkg.title || selection.pkg.id || ''),
                product_type: String(product.productType || 'physical'),
                quantity: Number(selection.qty || 1),
                subtotal: Number(selection.totals.base || 0),
                shipping_fee: Number(selection.totals.shipping || 0),
                amount: Number(selection.totals.total || 0)
            };

            if (method === 'manual') {
                const receiptInput = $('checkout-receipt');
                const receipt = receiptInput && receiptInput.files && receiptInput.files[0] ? receiptInput.files[0] : null;
                if (typeof PAYMENT !== 'undefined' && PAYMENT && PAYMENT.manualReceiptRequired && !receipt) {
                    var msgRec = 'Please upload payment receipt.';
                    showError(msgRec);
                    showPaymentError({
                        severity: 'warning',
                        title: 'Upload your payment receipt',
                        message: msgRec,
                        fields: ['A proof-of-payment receipt file is required for manual bank transfers.'],
                        ctaLabel: 'Upload receipt',
                        actions: [
                            { label: 'Upload receipt', primary: true, onClick: function() { try { if (receiptInput) { receiptInput.focus(); receiptInput.click(); receiptInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } catch (_e) {} } },
                            { label: 'Close', primary: false }
                        ]
                    });
                    return;
                }

                setSubmitting(true);
                submitManualOrder(payload, receipt)
                    .then(function() {
                        const extras = [
                            'ref=' + encodeURIComponent(orderRef),
                            'manual=1'
                        ];
                        if (selection && selection.pkg && selection.pkg.id) extras.push('pkg=' + encodeURIComponent(String(selection.pkg.id)));
                        if (selection && selection.pkg && selection.pkg.title) extras.push('pkg_title=' + encodeURIComponent(String(selection.pkg.title)));
                        if (selection && selection.totals && typeof selection.totals.total !== 'undefined') extras.push('amount=' + encodeURIComponent(String(selection.totals.total)));
                        if (selection && selection.totals && typeof selection.totals.itemCount !== 'undefined') extras.push('qty=' + encodeURIComponent(String(selection.totals.itemCount || 1)));
                        if (payload.currency) extras.push('currency=' + encodeURIComponent(String(payload.currency)));
                        if (product && (product.title || product.id)) extras.push('product=' + encodeURIComponent(String(product.title || product.id)));
                        window.location.href = 'success.html?' + extras.join('&');
                    })
                    .catch(function(error) {
                        var rawMsgMan = error && error.message ? error.message : 'Manual order submission failed.';
                        showError(rawMsgMan);
                        showPaymentError({
                            severity: 'error',
                            title: 'We couldn\u2019t submit your manual order',
                            message: rawMsgMan,
                            fields: ['Please check that your internet connection is stable and try again.', 'If the problem persists, contact support for assistance.'],
                            ctaLabel: 'Try again',
                            actions: [
                                { label: 'Try again', primary: true, onClick: function() { try { form.dispatchEvent(new Event('submit', { cancelable: true })); } catch (_e) {} } },
                                { label: 'Close', primary: false }
                            ]
                        });
                    })
                    .finally(function() {
                        setSubmitting(false);
                    });
                return;
            }

            setSubmitting(true);
            executeOnlinePayment(method, payload, selection.totals.total, customer)
                .then(function(providerResponse) {
                    const verifyPayload = applyOnlineProviderToPayload(Object.assign({}, payload, providerResponse || {}));
                    return verifyPayment(verifyPayload).then(function() {
                        const ref = (providerResponse && (providerResponse.reference || providerResponse.tx_ref)) || payload.order_ref;
                        window.location.href = 'success.html?ref=' + encodeURIComponent(ref);
                    });
                })
                .catch(function(error) {
                    const message = error && error.message ? String(error.message) : 'Online payment failed.';
                    if (message === 'paystack_closed' || message === 'flutterwave_closed') {
                        trackOrderAttempt({
                            order_ref: payload.order_ref,
                            amount: selection.totals.total,
                            currency: payload.currency,
                            reason: message,
                            customer: customer
                        });
                        setSubmitting(false);
                        var msgClose = 'Payment window closed.';
                        showError(msgClose);
                        showPaymentError({
                            severity: 'info',
                            title: 'Payment not completed',
                            message: msgClose,
                            fields: ['No charge was made to your account.', 'You can restart the checkout process whenever you are ready.'],
                            ctaLabel: 'Continue shopping'
                        });
                        return;
                    }
                    const ref = payload.order_ref;
                    window.location.href = 'payment-failed.html?ref=' + encodeURIComponent(ref) + '&reason=' + encodeURIComponent(message);
                })
                .finally(function() {
                    if (typeof setSubmitting === 'function') setSubmitting(false);
                });
        });
    }

    function initSingleProductInlineCheckout() {
        const form = document.getElementById('checkout-form');
        if (!form) return;
        if (form.id === 'checkout-form' && document.getElementById('checkout-package')) return;

        const paymentMethodsContainer = document.querySelector('.payment-methods');
        if (paymentMethodsContainer) {
            var methodCards = paymentMethodsContainer.querySelectorAll('.payment-method');
            methodCards.forEach(function(card) {
                card.addEventListener('click', function(e) {
                    if (e.target && e.target.tagName === 'INPUT') return;
                    var radio = card.querySelector('input[name="payment"]');
                    if (radio) {
                        radio.checked = true;
                        radio.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            });
        }

        showPaymentOptions();

        var manualInfo = document.querySelector('.manual-payment-info');
        var manualReceiptGroup = document.getElementById('manual-receipt-group');
        function renderManualBankDetailsInline() {
            if (!manualInfo || typeof MANUAL_PAYMENT === 'undefined' || MANUAL_PAYMENT === null) {
                if (manualInfo) manualInfo.innerHTML = '';
                return;
            }
            var isEnabled = MANUAL_PAYMENT.enabled !== false;
            if (typeof PAYMENT !== 'undefined' && PAYMENT && PAYMENT.manualEnabled === false) isEnabled = false;
            if (!isEnabled) {
                manualInfo.innerHTML = '';
                var manualMethod = manualInfo.parentNode ? manualInfo.parentNode.querySelector('.payment-method[data-payment="manual"]') : null;
                if (manualMethod) manualMethod.style.display = 'none';
                return;
            }
            var bank = String(MANUAL_PAYMENT.bankName || '').trim();
            var name = String(MANUAL_PAYMENT.accountName || '').trim();
            var number = String(MANUAL_PAYMENT.accountNumber || '').trim();
            var deadline = String(MANUAL_PAYMENT.paymentDeadline || '').trim();
            var instructions = String(MANUAL_PAYMENT.instructions || '').trim();

            var html = '';
            html += '<div style="margin-top: 12px; border: 1px solid #d1fae5; background: linear-gradient(180deg, #ecfdf5 0%, #f0fdf4 100%); border-radius: 14px; padding: 16px 18px; box-shadow: 0 2px 10px rgba(15, 118, 110, 0.06);">';
            html += '<div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">';
            html += '<div style="width:34px;height:34px;border-radius:10px;background:#0f766e;display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0;">';
            html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><line x1="2" y1="13" x2="22" y2="13"/></svg>';
            html += '</div>';
            html += '<div style="font-weight: 900; font-size: 0.95rem; letter-spacing: 0.01em; color: #065f46;">TRANSFER TO OUR BANK ACCOUNT</div>';
            html += '</div>';
            html += '<div style="display:grid; gap: 8px; padding: 12px 14px; background: #fff; border: 1px solid #a7f3d0; border-radius: 12px;">';
            if (bank) {
                html += '<div style="display:flex; gap: 6px; align-items: flex-start;">';
                html += '<span style="min-width: 118px; font-size: 0.82rem; color: #64748b; font-weight: 700; padding-top: 3px;">Bank Name</span>';
                html += '<span style="font-size: 0.96rem; font-weight: 900; color: #0f172a; letter-spacing: 0.005em;">' + escapeHtml(bank) + '</span>';
                html += '</div>';
            }
            if (name) {
                html += '<div style="display:flex; gap: 6px; align-items: flex-start;">';
                html += '<span style="min-width: 118px; font-size: 0.82rem; color: #64748b; font-weight: 700; padding-top: 3px;">Account Name</span>';
                html += '<span style="font-size: 0.96rem; font-weight: 900; color: #0f172a; letter-spacing: 0.005em;">' + escapeHtml(name) + '</span>';
                html += '</div>';
            }
            if (number) {
                html += '<div style="display:flex; gap: 6px; align-items: flex-start;">';
                html += '<span style="min-width: 118px; font-size: 0.82rem; color: #64748b; font-weight: 700; padding-top: 3px;">Account Number</span>';
                html += '<span style="font-size: 1.02rem; font-weight: 900; color: #0f766e; letter-spacing: 0.08em; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;">' + escapeHtml(number) + '</span>';
                html += '</div>';
            }
            html += '</div>';
            if (instructions) {
                html += '<div style="margin-top: 10px; padding: 8px 10px; background: rgba(15, 118, 110, 0.05); border-radius: 9px; color: #0f172a; font-size: 0.86rem; line-height: 1.5;">' + escapeHtml(instructions) + '</div>';
            }
            if (deadline) {
                html += '<div style="margin-top: 10px; display:flex; align-items:flex-start; gap: 8px;">';
                html += '<svg viewBox="0 0 24 24" width="16" height="16" style="margin-top:2px; flex-shrink:0; color: #0f766e;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
                html += '<span style="font-size: 0.82rem; color: #0f766e; font-weight: 800; line-height: 1.4;">' + escapeHtml(deadline) + '</span>';
                html += '</div>';
            }
            html += '</div>';
            manualInfo.innerHTML = html;
        }
        function ensureValidCheckedRadio() {
            var all = Array.from(document.querySelectorAll('.payment-methods input[name="payment"]'));
            var currentChecked = all.find(function(r) { return r.checked; });
            var cfgDefault = null;
            try {
                if (typeof PAYMENT !== 'undefined' && PAYMENT && typeof PAYMENT.defaultMethod === 'string') {
                    cfgDefault = String(PAYMENT.defaultMethod).toLowerCase().trim();
                }
            } catch (_p) {}
            function isUsable(r) {
                if (!r) return false;
                var card = r.closest ? r.closest('.payment-method') : null;
                if (card && window.getComputedStyle(card).display === 'none') return false;
                return isPaymentEnabled(r.value);
            }
            if (cfgDefault) {
                var def = all.find(function(r) { return String(r.value).toLowerCase() === cfgDefault; });
                if (isUsable(def)) currentChecked = def;
            }
            if (currentChecked && isUsable(currentChecked)) {
                if (currentChecked.checked !== true) currentChecked.checked = true;
                return currentChecked.value;
            }
            var fallback = all.find(function(r) { return isUsable(r); });
            if (!fallback) fallback = all[0];
            if (fallback) {
                fallback.checked = true;
                fallback.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return fallback ? fallback.value : null;
        }
        function updateSelectedMethodCard() {
            var selected = document.querySelector('.payment-methods input[name="payment"]:checked');
            var val = selected ? String(selected.value).toLowerCase() : 'paystack';
            document.querySelectorAll('.payment-methods .payment-method').forEach(function(el) { el.classList.remove('selected'); });
            var card = selected && selected.closest ? selected.closest('.payment-method') : null;
            if (card) card.classList.add('selected');
            if (manualInfo) {
                var hasDetails = manualInfo.innerHTML && manualInfo.innerHTML.trim().length > 0;
                var shouldShow = (val === 'manual') && hasDetails && isPaymentEnabled('manual');
                manualInfo.style.display = shouldShow ? 'block' : 'none';
            }
            if (manualReceiptGroup) {
                var receiptRequired = true;
                try {
                    if (typeof PAYMENT !== 'undefined' && PAYMENT && typeof PAYMENT.manualReceiptRequired === 'boolean') receiptRequired = PAYMENT.manualReceiptRequired;
                    if (typeof MANUAL_PAYMENT !== 'undefined' && MANUAL_PAYMENT && typeof MANUAL_PAYMENT.receiptRequired === 'boolean') receiptRequired = MANUAL_PAYMENT.receiptRequired;
                } catch (_r) {}
                manualReceiptGroup.style.display = (val === 'manual') ? '' : 'none';
                var reqSpan = manualReceiptGroup.querySelector('.required');
                if (reqSpan) reqSpan.style.display = receiptRequired ? '' : 'none';
                // Never use HTML5 required on a file input whose parent can be display:none.
                // This prevents Chrome's "An invalid form control is not focusable" error.
                // Our own JS submit validation handles the receipt check and shows a friendly modal.
                syncReceiptRequiredState((val === 'manual'));
            }
        }
        document.querySelectorAll('.payment-methods input[name="payment"]').forEach(function(r) {
            r.addEventListener('change', updateSelectedMethodCard);
        });
        updateSelectedMethodCard();
        renderManualBankDetailsInline();
        var chosen = ensureValidCheckedRadio();
        if (!chosen || chosen !== 'paystack') {
            document.querySelectorAll('.payment-methods input[name="payment"]').forEach(function(r) {
                if (r.value !== 'paystack') return;
                var card = r.closest ? r.closest('.payment-method') : null;
                if (card && window.getComputedStyle(card).display === 'none') {
                    if (r.checked) {
                        r.checked = false;
                        var nextEnabled = Array.from(document.querySelectorAll('.payment-methods input[name="payment"]')).find(function(x) {
                            var c = x.closest ? x.closest('.payment-method') : null;
                            return c && window.getComputedStyle(c).display !== 'none' && isPaymentEnabled(x.value);
                        });
                        if (nextEnabled) {
                            nextEnabled.checked = true;
                            nextEnabled.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                }
            });
        }
        updateSelectedMethodCard();

        function getInlineCustomer() {
            return {
                name: String((document.getElementById('fullName') || {}).value || '').trim(),
                email: String((document.getElementById('email') || {}).value || '').trim(),
                phone: String((document.getElementById('phone') || {}).value || '').trim(),
                address: String((document.getElementById('address') || {}).value || '').trim(),
                state: String((document.getElementById('state') || {}).value || '').trim(),
                city: String((document.getElementById('city') || {}).value || '').trim(),
                specialRequest: String((document.getElementById('specialRequest') || {}).value || '').trim()
            };
        }

        function getInlinePaymentMethod() {
            var selected = document.querySelector('.payment-methods input[name="payment"]:checked');
            return selected ? String(selected.value).toLowerCase() : 'paystack';
        }

        function getInlineCurrentTotals() {
            var pkgId = (document.querySelector('input[name="package"]') || {}).value || (Array.isArray(window.PACKAGES) && window.PACKAGES[0] ? window.PACKAGES[0].id : 'single');
            var pkg = Array.isArray(window.PACKAGES) ? window.PACKAGES.find(function(p) { return p.id === pkgId; }) : null;
            if (pkg) {
                return {
                    package_id: pkgId,
                    package_title: pkg.title || pkg.id,
                    product: (typeof PRODUCT !== 'undefined' && PRODUCT ? (PRODUCT.name || PRODUCT.shortName || '') : ''),
                    product_type: (typeof PRODUCT !== 'undefined' && PRODUCT ? (PRODUCT.productType || 'physical') : 'physical'),
                    product_id: (typeof PRODUCT !== 'undefined' && PRODUCT ? (PRODUCT.id || '') : ''),
                    quantity: pkg.quantity || 1,
                    subtotal: pkg.oldPrice || pkg.price || 0,
                    shipping_fee: (typeof PRODUCT !== 'undefined' && PRODUCT ? (PRODUCT.shippingFee || 0) : 0),
                    amount: pkg.price || 0
                };
            }
            var totalEl = document.querySelector('[data-summary="total"]');
            return {
                package_id: pkgId,
                package_title: '',
                product: '',
                product_type: 'physical',
                product_id: '',
                quantity: 1,
                subtotal: 0,
                shipping_fee: 0,
                amount: totalEl ? Number(String(totalEl.textContent || '').replace(/[^0-9.]/g, '')) || 0 : 0
            };
        }

        function setInlineSubmitting(submitting) {
            var btn = form.querySelector('button[type="submit"]');
            if (!btn) return;
            btn.disabled = submitting;
            btn.textContent = submitting ? 'PROCESSING...' : (btn.dataset.defaultLabel || btn.textContent);
            if (!btn.dataset.defaultLabel && !submitting) btn.dataset.defaultLabel = btn.innerHTML.replace(/<[^>]*>/g, '').trim();
            if (submitting) btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> PROCESSING...';
        }

        function showInlineError(message) {
            var existing = document.getElementById('inline-checkout-error');
            if (!message) { if (existing) existing.remove(); return; }
            if (!existing) {
                existing = document.createElement('div');
                existing.id = 'inline-checkout-error';
                existing.style.cssText = 'padding:14px;border:1px solid rgba(220,38,38,0.35);background:rgba(220,38,38,0.06);border-radius:16px;margin:0 auto 16px auto;max-width:560px;';
                var grid = document.querySelector('.checkout-grid');
                if (grid && grid.parentNode) grid.parentNode.insertBefore(existing, grid);
                else form.parentNode.insertBefore(existing, form);
            }
            existing.textContent = message;
        }

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            showInlineError('');
            // Strip HTML5 required from receipt input right before any validation runs
            syncReceiptRequiredState(getInlinePaymentMethod() === 'manual');
            var customer = getInlineCustomer();

            var inlineCustFields = [];
            if (!customer.name) inlineCustFields.push('Full name is required.');
            if (!customer.email) inlineCustFields.push('Email address is required.');
            if (!customer.phone) inlineCustFields.push('Phone number is required.');
            if (!customer.name || !customer.email || !customer.phone) {
                var inlineMsgCust = 'Please fill your name, email, and phone.';
                showInlineError(inlineMsgCust);
                showPaymentError({
                    severity: 'warning',
                    title: 'Complete your contact details',
                    message: inlineMsgCust,
                    fields: inlineCustFields.length ? inlineCustFields : ['Name, email, and phone number must be provided.'],
                    ctaLabel: 'Fill details',
                    actions: [
                        { label: 'Fill details', primary: true, onClick: function() { try { var fn = document.querySelector('[name="fullName"], [name="customer_name"], #fullName'); if (fn) { fn.focus(); fn.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } catch (_e) {} } },
                        { label: 'Close', primary: false }
                    ]
                });
                return;
            }
            var deliveryAddressRequired = true;
            try {
                if (typeof PRODUCT !== 'undefined' && PRODUCT && String(PRODUCT.productType || '').toLowerCase() === 'digital') deliveryAddressRequired = false;
                if (typeof window.PRODUCT !== 'undefined' && window.PRODUCT && String(window.PRODUCT.productType || '').toLowerCase() === 'digital') deliveryAddressRequired = false;
            } catch (err) {}
            if (deliveryAddressRequired && !customer.address) {
                var inlineMsgAddr = 'Please enter your delivery address.';
                showInlineError(inlineMsgAddr);
                showPaymentError({
                    severity: 'warning',
                    title: 'Delivery address is required',
                    message: inlineMsgAddr,
                    fields: ['Shipping address is required for physical product delivery.'],
                    ctaLabel: 'Enter address',
                    actions: [
                        { label: 'Enter address', primary: true, onClick: function() { try { var adr = document.querySelector('[name="address"], [name="customer_address"], #address, textarea'); if (adr) { adr.focus(); adr.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } catch (_e) {} } },
                        { label: 'Close', primary: false }
                    ]
                });
                return;
            }
            var method = getInlinePaymentMethod();
            var orderRef = generateOrderRef();
            var totals = getInlineCurrentTotals();
            var payload = Object.assign({}, totals, {
                order_ref: orderRef,
                customer: customer,
                payment_method: method,
                currency: (typeof PAYMENT !== 'undefined' && PAYMENT && PAYMENT.currency) ? PAYMENT.currency : (typeof BUSINESS !== 'undefined' && BUSINESS.currencyCode ? BUSINESS.currencyCode : 'NGN')
            });

            if (method === 'manual') {
                var receiptInput = document.getElementById('paymentReceipt');
                var receipt = receiptInput && receiptInput.files && receiptInput.files[0] ? receiptInput.files[0] : null;
                if (typeof PAYMENT !== 'undefined' && PAYMENT && PAYMENT.manualReceiptRequired && !receipt) {
                    var inlineMsgRec = 'Please upload payment receipt.';
                    showInlineError(inlineMsgRec);
                    showPaymentError({
                        severity: 'warning',
                        title: 'Upload your payment receipt',
                        message: inlineMsgRec,
                        fields: ['A proof-of-payment receipt file is required for manual bank transfers.'],
                        ctaLabel: 'Upload receipt',
                        actions: [
                            { label: 'Upload receipt', primary: true, onClick: function() { try { if (receiptInput) { receiptInput.focus(); receiptInput.click(); receiptInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } catch (_e) {} } },
                            { label: 'Close', primary: false }
                        ]
                    });
                    return;
                }
                setInlineSubmitting(true);
                submitManualOrder(payload, receipt)
                    .then(function() {
                        var extras = [
                            'ref=' + encodeURIComponent(orderRef),
                            'manual=1'
                        ];
                        if (totals && totals.package_id) extras.push('pkg=' + encodeURIComponent(String(totals.package_id)));
                        if (totals && totals.package_title) extras.push('pkg_title=' + encodeURIComponent(String(totals.package_title)));
                        if (totals && typeof totals.amount !== 'undefined') extras.push('amount=' + encodeURIComponent(String(totals.amount)));
                        if (totals && typeof totals.quantity !== 'undefined') extras.push('qty=' + encodeURIComponent(String(totals.quantity || 1)));
                        if (payload.currency) extras.push('currency=' + encodeURIComponent(String(payload.currency)));
                        if (totals && (totals.product || totals.product_title)) extras.push('product=' + encodeURIComponent(String(totals.product || totals.product_title || '')));
                        window.location.href = 'success.html?' + extras.join('&');
                    })
                    .catch(function(error) {
                        var inlineMsgMan = error && error.message ? error.message : 'Manual order submission failed.';
                        showInlineError(inlineMsgMan);
                        showPaymentError({
                            severity: 'error',
                            title: 'We couldn\u2019t submit your manual order',
                            message: inlineMsgMan,
                            fields: ['Please check that your internet connection is stable and try again.', 'If the problem persists, contact support for assistance.'],
                            ctaLabel: 'Try again',
                            actions: [
                                { label: 'Try again', primary: true, onClick: function() { try { form.dispatchEvent(new Event('submit', { cancelable: true })); } catch (_e) {} } },
                                { label: 'Close', primary: false }
                            ]
                        });
                    })
                    .finally(function() {
                        setInlineSubmitting(false);
                    });
                return;
            }

            setInlineSubmitting(true);
            executeOnlinePayment(method, payload, totals.amount, customer)
                .then(function(providerResponse) {
                    const verifyPayload = applyOnlineProviderToPayload(Object.assign({}, payload, providerResponse || {}));
                    return verifyPayment(verifyPayload).then(function() {
                        const ref = (providerResponse && (providerResponse.reference || providerResponse.tx_ref)) || payload.order_ref;
                        window.location.href = 'success.html?ref=' + encodeURIComponent(ref);
                    });
                })
                .catch(function(error) {
                    const message = error && error.message ? String(error.message) : 'Online payment failed.';
                    if (message === 'paystack_closed' || message === 'flutterwave_closed') {
                        trackOrderAttempt({
                            order_ref: payload.order_ref,
                            amount: totals.amount,
                            currency: payload.currency,
                            reason: message,
                            customer: customer
                        });
                        setInlineSubmitting(false);
                        var inlineMsgClose = 'Payment window closed.';
                        showInlineError(inlineMsgClose);
                        showPaymentError({
                            severity: 'info',
                            title: 'Payment not completed',
                            message: inlineMsgClose,
                            fields: ['No charge was made to your account.', 'You can restart the checkout process whenever you are ready.'],
                            ctaLabel: 'Continue shopping'
                        });
                        return;
                    }
                    const ref = payload.order_ref;
                    window.location.href = 'payment-failed.html?ref=' + encodeURIComponent(ref) + '&reason=' + encodeURIComponent(message);
                })
                .finally(function() {
                    setInlineSubmitting(false);
                });
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        initMobileMenu();
        showError('');

        const loader = window.PMELAB_SITE && typeof window.PMELAB_SITE.ensureConfigLoaded === 'function'
            ? window.PMELAB_SITE.ensureConfigLoaded()
            : Promise.resolve();

        loader.then(function() {
            injectCssVariables();
            // Sanitize receipt inputs: strip HTML5 required before any validation can run
            // so the browser never throws "invalid form control is not focusable"
            syncReceiptRequiredState(false);
            const mode = getMode();
            updateProductsLinks(mode);

            const isIndexPage = !document.getElementById('checkout-package');
            if (isIndexPage) {
                initSingleProductInlineCheckout();
                if (window.PMELAB_CART && typeof window.PMELAB_CART.init === 'function') {
                    window.PMELAB_CART.init();
                }
                return;
            }

            if (mode !== 'multipleproducts') {
                window.location.replace(getHomeHref(mode));
                return;
            }

            const id = getQueryParam('id');
            if (!id) {
                showError('Missing product id.');
                return;
            }

            const product = findProduct(id);
            if (!product) {
                showError('Product not found.');
                return;
            }

            const checkoutTitle = $('checkout-title');
            if (checkoutTitle) checkoutTitle.textContent = String(product.title || product.id || 'Checkout');

            initCheckout(product);

            if (window.PMELAB_CART && typeof window.PMELAB_CART.init === 'function') {
                window.PMELAB_CART.init();
            }
        }).catch(function() {
            showError('Failed to load site configuration.');
        });
    });
})();
