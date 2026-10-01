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
        const el = $('cart-checkout-error');
        if (!el) return;
        el.textContent = message || '';
        el.classList.toggle('owner-hidden', !message);
    }

    function formatMoney(amount) {
        const currency = (typeof BUSINESS !== 'undefined' && BUSINESS && BUSINESS.currency) ? BUSINESS.currency : '₦';
        const value = Number(amount || 0);
        return currency + value.toLocaleString('en-NG');
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

    function generateOrderRef() {
        const prefix = String((BUSINESS && BUSINESS.shortName) ? BUSINESS.shortName : 'ORDER').substring(0, 6).toUpperCase().replace(/\s+/g, '');
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return prefix + '-' + timestamp + random;
    }

    function normalizeProducts() {
        if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) return PRODUCTS;
        return [];
    }

    function findProduct(productId) {
        const id = String(productId || '').trim();
        return normalizeProducts().find(function(p) { return p.id === id; }) || null;
    }

    function findPackage(product, packageId) {
        if (!product || !Array.isArray(product.packages)) return null;
        const pid = String(packageId || '').trim();
        return product.packages.find(function(p) { return p.id === pid; }) || null;
    }

    function computeTotals(product, pkg, qty) {
        const quantity = Number(qty || 0) || 1;
        const base = Number(pkg && pkg.price ? pkg.price : 0) * quantity;
        const shippingPerUnit = Number(product && product.shippingFee ? product.shippingFee : 0);
        const shipping = shippingPerUnit * quantity;
        return { base: base, shipping: shipping, total: base + shipping };
    }

    function computeCartTotals(cart) {
        const rows = Array.isArray(cart) ? cart : [];
        let base = 0;
        let shipping = 0;
        let totalQty = 0;
        let hasPhysical = false;
        const lineItems = [];

        rows.forEach(function(row) {
            const product = findProduct(row.productId);
            const pkg = findPackage(product, row.packageId);
            if (!product || !pkg) return;
            const qty = Number(row.qty || 0) || 1;
            const totals = computeTotals(product, pkg, qty);
            base += totals.base;
            shipping += totals.shipping;
            totalQty += qty;
            if (String(product.productType || '').toLowerCase() !== 'digital') hasPhysical = true;
            lineItems.push({ product: product, pkg: pkg, qty: qty, totals: totals });
        });

        return { base: base, shipping: shipping, total: base + shipping, totalQty: totalQty, hasPhysical: hasPhysical, lines: lineItems };
    }

    function toggleManual(show) {
        const manualBox = $('cart-manual-details');
        if (manualBox) manualBox.classList.toggle('owner-hidden', !show);
    }

    function renderManualDetails() {
        if (typeof MANUAL_PAYMENT === 'undefined') return;
        const bank = $('cart-manual-bank');
        const name = $('cart-manual-account-name');
        const number = $('cart-manual-account-number');
        const deadline = $('cart-manual-deadline');

        if (bank) bank.textContent = MANUAL_PAYMENT.bankName || '';
        if (name) name.textContent = MANUAL_PAYMENT.accountName || '';
        if (number) number.textContent = MANUAL_PAYMENT.accountNumber || '';
        if (deadline) deadline.textContent = MANUAL_PAYMENT.paymentDeadline || '';
    }

    function getSelectedPaymentMethod(form) {
        const selectedRadio = form.querySelector('input[name="payment_method"]:checked');
        return selectedRadio ? String(selectedRadio.value || '').trim() : 'paystack';
    }

    function getCustomerInfo() {
        return {
            name: String(($('cart-name').value || '')).trim(),
            email: String(($('cart-email').value || '')).trim(),
            phone: String(($('cart-phone').value || '')).trim(),
            address: String(($('cart-address').value || '')).trim(),
            state: String(($('cart-state').value || '')).trim(),
            city: String(($('cart-city').value || '')).trim(),
            specialRequest: String(($('cart-special').value || '')).trim()
        };
    }

    function setAddressRequired(isRequired) {
        const addressGroup = $('cart-address-group');
        const locationRow = $('cart-location-row');
        const addressInput = $('cart-address');
        if (addressGroup) addressGroup.style.display = isRequired ? '' : 'none';
        if (locationRow) locationRow.style.display = isRequired ? '' : 'none';
        if (addressInput) addressInput.required = isRequired;
    }

    function setSubmitting(submitting) {
        const btn = $('cart-checkout-submit');
        if (!btn) return;
        btn.disabled = submitting;
        btn.textContent = submitting ? 'PROCESSING...' : 'PAY NOW';
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
        formData.append('order_ref', String(payload.order_ref || ''));
        formData.append('payment_method', 'manual');
        formData.append('currency', String(payload.currency || ''));
        formData.append('items', JSON.stringify(payload.items || []));
        formData.append('product', 'Cart order');
        formData.append('package_id', 'cart');
        formData.append('package_title', 'Cart');

        const customer = payload.customer || {};
        formData.append('customer_name', String(customer.name || ''));
        formData.append('customer_email', String(customer.email || ''));
        formData.append('customer_phone', String(customer.phone || ''));
        formData.append('customer_address', String(customer.address || ''));
        formData.append('customer_state', String(customer.state || ''));
        formData.append('customer_city', String(customer.city || ''));
        formData.append('customer_special_request', String(customer.specialRequest || ''));

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

    function isPaymentEnabledCart(method) {
        const cfg = (typeof PAYMENT !== 'undefined' && PAYMENT) ? PAYMENT : {};
        const m = String(method || '').toLowerCase();
        if (m === 'paystack') return Boolean(cfg.paystackEnabled) && Boolean(cfg.paystackPublicKey);
        if (m === 'flutterwave') return Boolean(cfg.flutterwaveEnabled) && Boolean(cfg.flutterwavePublicKey);
        if (m === 'manual') return Boolean(cfg.manualEnabled);
        return false;
    }

    function showPaymentOptionsCart(containerId) {
        const cfg = (typeof PAYMENT !== 'undefined' && PAYMENT) ? PAYMENT : {};
        const scope = containerId ? document.getElementById(containerId) : document;
        if (!scope) return;
        scope.querySelectorAll('[data-payment-opt="flutterwave"]').forEach(function(el) {
            el.style.display = (cfg.flutterwaveEnabled && cfg.flutterwavePublicKey) ? '' : 'none';
        });
    }

    async function openPaystackPaymentCart(payload, totalAmountKobo, customer) {
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

    async function openFlutterwavePaymentCart(payload, totalAmount, customer) {
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
                    customer_phone: customer.phone
                },
                customizations: {
                    title: (typeof BUSINESS !== 'undefined' && BUSINESS && BUSINESS.name) ? BUSINESS.name : 'Payment',
                    description: 'Cart Payment',
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

    async function executeOnlinePaymentCart(method, payload, totalAmount, customer) {
        const cfg = (typeof PAYMENT !== 'undefined' && PAYMENT) ? PAYMENT : {};
        if (method === 'paystack') {
            if (!cfg.paystackEnabled) throw new Error('Paystack is disabled.');
            if (!cfg.paystackPublicKey) throw new Error('Paystack key not configured.');
            if (typeof PaystackPop === 'undefined') throw new Error('Paystack SDK not loaded.');
            trackOrderAttemptCart({
                order_ref: payload.order_ref,
                amount: totalAmount,
                currency: cfg.currency || 'NGN',
                reason: 'paystack_started',
                customer: customer
            });
            const totalKobo = Math.round(Number(totalAmount || 0) * 100);
            return openPaystackPaymentCart(payload, totalKobo, customer);
        }
        if (method === 'flutterwave') {
            if (!cfg.flutterwaveEnabled) throw new Error('Flutterwave is disabled.');
            if (!cfg.flutterwavePublicKey) throw new Error('Flutterwave key not configured.');
            if (typeof FlutterwaveCheckout === 'undefined') throw new Error('Flutterwave SDK not loaded.');
            trackOrderAttemptCart({
                order_ref: payload.order_ref,
                amount: totalAmount,
                currency: cfg.currency || 'NGN',
                reason: 'flutterwave_started',
                customer: customer
            });
            return openFlutterwavePaymentCart(payload, totalAmount, customer);
        }
        throw new Error('Unknown online payment method: ' + method);
    }

    async function trackOrderAttemptCart(data) {
        try {
            await fetch(getApiUrl('/api/track-order-attempt'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (error) {}
    }

    function applyOnlineProviderToPayloadCart(raw) {
        if (raw && raw.provider && !raw.reference) {
            if (raw.provider === 'flutterwave') {
                if (raw.transaction_id) raw.reference = raw.transaction_id;
                else if (raw.tx_ref) raw.reference = raw.tx_ref;
            }
        }
        return raw;
    }

    function setText(id, value) {
        const el = $(id);
        if (el) el.textContent = value;
    }

    function setHtml(id, html) {
        const el = $(id);
        if (el) el.innerHTML = html;
    }

    function renderSummaryLinesHtml(cartTotals) {
        return cartTotals.lines.map(function(line) {
            return '<div style="border:1px solid var(--border);border-radius:14px;padding:12px;background:#fff;">' +
                '<div style="font-weight:900;margin-bottom:6px;">' + String(line.product.title || line.product.id) + '</div>' +
                '<div style="color:var(--muted);font-size:13px;line-height:1.6;">' +
                'Package: ' + String(line.pkg.title || line.pkg.id) + '<br>' +
                'Qty: ' + String(line.qty) + '<br>' +
                'Line total: ' + formatMoney(line.totals.total) +
                '</div>' +
                '</div>';
        }).join('');
    }

    function renderSummary(cartTotals) {
        const linesHtml = renderSummaryLinesHtml(cartTotals);
        const baseText = formatMoney(cartTotals.base);
        const shippingText = formatMoney(cartTotals.shipping);
        const totalText = formatMoney(cartTotals.total);

        setHtml('cart-summary-lines', linesHtml);
        setText('cart-summary-subtotal', baseText);
        setText('cart-summary-shipping', shippingText);
        setText('cart-summary-total', totalText);

        setHtml('m-cart-summary-lines', linesHtml);
        setText('m-cart-summary-subtotal', baseText);
        setText('m-cart-summary-shipping', shippingText);
        setText('m-cart-summary-total', totalText);
    }

    function initCheckout(cart, cartTotals) {
        const form = $('cart-checkout-form');
        if (!form) return;

        showPaymentOptionsCart('cart-payment-methods-container');
        setAddressRequired(cartTotals.hasPhysical);
        toggleManual(false);
        renderManualDetails();

        form.addEventListener('change', function(e) {
            if (e.target && e.target.name === 'payment_method') {
                toggleManual(getSelectedPaymentMethod(form) === 'manual');
            }
        });

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            showError('');

            if (!cart.length) {
                showError('Your cart is empty.');
                return;
            }

            const customer = getCustomerInfo();
            if (!customer.name || !customer.email || !customer.phone) {
                showError('Please fill your name, email, and phone.');
                return;
            }
            if (cartTotals.hasPhysical && !customer.address) {
                showError('Please enter your delivery address.');
                return;
            }

            const method = getSelectedPaymentMethod(form);
            const orderRef = generateOrderRef();
            const currency = (typeof PAYMENT !== 'undefined' && PAYMENT && PAYMENT.currency) ? PAYMENT.currency : (BUSINESS.currencyCode || 'NGN');

            const payload = {
                order_ref: orderRef,
                customer: customer,
                currency: currency,
                items: cart.map(function(row) {
                    return { productId: row.productId, packageId: row.packageId, qty: row.qty };
                }),
                subtotal: Number(cartTotals.base || 0),
                shipping_fee: Number(cartTotals.shipping || 0),
                amount: Number(cartTotals.total || 0)
            };

            if (method === 'manual') {
                const receiptInput = $('cart-receipt');
                const receipt = receiptInput && receiptInput.files && receiptInput.files[0] ? receiptInput.files[0] : null;
                if (typeof PAYMENT !== 'undefined' && PAYMENT && PAYMENT.manualReceiptRequired && !receipt) {
                    showError('Please upload payment receipt.');
                    return;
                }

                setSubmitting(true);
                submitManualOrder(payload, receipt)
                    .then(function() {
                        if (window.PMELAB_CART && typeof window.PMELAB_CART.clear === 'function') {
                            window.PMELAB_CART.clear();
                        }
                        const extras = [
                            'ref=' + encodeURIComponent(orderRef),
                            'manual=1',
                            'pkg=cart',
                            'pkg_title=' + encodeURIComponent('Cart')
                        ];
                        if (typeof cartTotals.total !== 'undefined') extras.push('amount=' + encodeURIComponent(String(cartTotals.total)));
                        if (typeof cartTotals.itemCount !== 'undefined') extras.push('qty=' + encodeURIComponent(String(cartTotals.itemCount || 1)));
                        if (payload.currency) extras.push('currency=' + encodeURIComponent(String(payload.currency)));
                        extras.push('product=' + encodeURIComponent('Cart order'));
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
            executeOnlinePaymentCart(method, payload, cartTotals.total, customer)
                .then(function(providerResponse) {
                    const verifyPayload = applyOnlineProviderToPayloadCart(Object.assign({}, payload, providerResponse || {}));
                    return verifyPayment(verifyPayload).then(function() {
                        if (window.PMELAB_CART && typeof window.PMELAB_CART.clear === 'function') {
                            window.PMELAB_CART.clear();
                        }
                        const ref = (providerResponse && (providerResponse.reference || providerResponse.tx_ref)) || payload.order_ref;
                        window.location.href = 'success.html?ref=' + encodeURIComponent(ref);
                    });
                })
                .catch(function(error) {
                    const message = error && error.message ? String(error.message) : 'Online payment failed.';
                    if (message === 'paystack_closed' || message === 'flutterwave_closed') {
                        trackOrderAttemptCart({
                            order_ref: payload.order_ref,
                            amount: cartTotals.total,
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

            if (mode !== 'multipleproducts') {
                window.location.replace(getHomeHref(mode));
                return;
            }

            if (!window.PMELAB_CART || typeof window.PMELAB_CART.load !== 'function') {
                showError('Cart is not available.');
                return;
            }

            const cart = window.PMELAB_CART.load();
            if (!cart.length) {
                showError('Your cart is empty.');
                return;
            }

            const cartTotals = computeCartTotals(cart);
            if (!cartTotals.lines.length) {
                showError('Some cart items are invalid. Please clear cart and add items again.');
                return;
            }

            renderSummary(cartTotals);
            initCheckout(cart, cartTotals);

            if (window.PMELAB_CART && typeof window.PMELAB_CART.init === 'function') {
                window.PMELAB_CART.init();
            }
        }).catch(function() {
            showError('Failed to load site configuration.');
        });
    });
})();

