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
        const base = typeof API_BASE_URL !== 'undefined' ? String(API_BASE_URL).trim() : '';
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

    async function verifyPayment(payload) {
        const res = await fetch(getApiUrl('/api/verify-payment'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(function() { return {}; });
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Payment verification failed');
        }
        return data;
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
        if (m === 'manual') return Boolean(cfg.manualEnabled);
        return false;
    }

    function showPaymentOptions(containerId) {
        const cfg = (typeof PAYMENT !== 'undefined' && PAYMENT) ? PAYMENT : {};
        const scope = containerId ? document.getElementById(containerId) : document;
        if (!scope) return;
        scope.querySelectorAll('[data-payment-opt="flutterwave"]').forEach(function(el) {
            el.style.display = (cfg.flutterwaveEnabled && cfg.flutterwavePublicKey) ? '' : 'none';
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

            const selection = refreshSummary();
            if (!selection.pkg) {
                showError('Select a package.');
                return;
            }

            const customer = getCustomerInfo();
            if (!customer.name || !customer.email || !customer.phone) {
                showError('Please fill your name, email, and phone.');
                return;
            }

            const isPhysical = String(product.productType || '').toLowerCase() !== 'digital';
            if (isPhysical && !customer.address) {
                showError('Please enter your delivery address.');
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
                    showError('Please upload payment receipt.');
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
                        showError(error && error.message ? error.message : 'Manual order submission failed.');
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
                        showError('Payment window closed.');
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
            if (!manualInfo || typeof MANUAL_PAYMENT === 'undefined') return;
            manualInfo.innerHTML = MANUAL_PAYMENT.enabled ?
                ('<div style="border:1px solid var(--border);border-radius:14px;padding:14px;background:#fff;margin-top:10px;">' +
                    '<div style="font-weight:800;margin-bottom:6px;">Bank Details</div>' +
                    '<div style="display:grid;gap:4px;font-size:0.95rem;">' +
                    '<div><span style="color:var(--muted);">Bank:</span> ' + (MANUAL_PAYMENT.bankName || '') + '</div>' +
                    '<div><span style="color:var(--muted);">Account Name:</span> ' + (MANUAL_PAYMENT.accountName || '') + '</div>' +
                    '<div><span style="color:var(--muted);">Account Number:</span> ' + (MANUAL_PAYMENT.accountNumber || '') + '</div>' +
                    (MANUAL_PAYMENT.paymentDeadline ? '<div style="color:var(--muted);margin-top:6px;">' + MANUAL_PAYMENT.paymentDeadline + '</div>' : '') +
                    '</div></div>') : '';
        }
        function updateSelectedMethodCard() {
            var selected = document.querySelector('.payment-methods input[name="payment"]:checked');
            var val = selected ? String(selected.value).toLowerCase() : 'paystack';
            document.querySelectorAll('.payment-methods .payment-method').forEach(function(el) { el.classList.remove('selected'); });
            var card = selected && selected.closest ? selected.closest('.payment-method') : null;
            if (card) card.classList.add('selected');
            if (manualInfo) manualInfo.style.display = (val === 'manual') ? '' : 'none';
            if (manualReceiptGroup) manualReceiptGroup.style.display = (val === 'manual') ? '' : 'none';
        }
        document.querySelectorAll('.payment-methods input[name="payment"]').forEach(function(r) {
            r.addEventListener('change', updateSelectedMethodCard);
        });
        updateSelectedMethodCard();
        renderManualBankDetailsInline();

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
            var customer = getInlineCustomer();
            if (!customer.name || !customer.email || !customer.phone) {
                showInlineError('Please fill your name, email, and phone.');
                return;
            }
            var deliveryAddressRequired = true;
            try {
                if (typeof PRODUCT !== 'undefined' && PRODUCT && String(PRODUCT.productType || '').toLowerCase() === 'digital') deliveryAddressRequired = false;
                if (typeof window.PRODUCT !== 'undefined' && window.PRODUCT && String(window.PRODUCT.productType || '').toLowerCase() === 'digital') deliveryAddressRequired = false;
            } catch (err) {}
            if (deliveryAddressRequired && !customer.address) {
                showInlineError('Please enter your delivery address.');
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
                    showInlineError('Please upload payment receipt.');
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
                        showInlineError(error && error.message ? error.message : 'Manual order submission failed.');
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
                        showInlineError('Payment window closed.');
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
