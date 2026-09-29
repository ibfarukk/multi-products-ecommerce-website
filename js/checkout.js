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
                        window.location.href = 'success.html?ref=' + encodeURIComponent(orderRef);
                    })
                    .catch(function(error) {
                        showError(error && error.message ? error.message : 'Manual order submission failed.');
                    })
                    .finally(function() {
                        setSubmitting(false);
                    });
                return;
            }

            if (typeof PAYMENT === 'undefined' || !PAYMENT || !PAYMENT.paystackEnabled) {
                showError('Online payment is disabled.');
                return;
            }

            if (!PAYMENT.paystackPublicKey) {
                showError('Paystack key not configured.');
                return;
            }

            setSubmitting(true);

            const handler = PaystackPop.setup({
                key: PAYMENT.paystackPublicKey,
                email: customer.email,
                amount: Math.round(Number(selection.totals.total || 0) * 100),
                currency: PAYMENT.currency || 'NGN',
                ref: orderRef,
                metadata: {
                    custom_fields: [
                        { display_name: 'Customer Name', variable_name: 'customer_name', value: customer.name },
                        { display_name: 'Phone', variable_name: 'customer_phone', value: customer.phone }
                    ]
                },
                callback: function(response) {
                    verifyPayment(Object.assign({}, payload, { reference: response.reference }))
                        .then(function() {
                            window.location.href = 'success.html?ref=' + encodeURIComponent(response.reference);
                        })
                        .catch(function(error) {
                            window.location.href = 'payment-failed.html?ref=' + encodeURIComponent(response.reference) + '&reason=' + encodeURIComponent(error && error.message ? error.message : 'Payment verification failed');
                        })
                        .finally(function() {
                            setSubmitting(false);
                        });
                },
                onClose: function() {
                    setSubmitting(false);
                    showError('Payment window closed.');
                }
            });

            handler.openIframe();
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
