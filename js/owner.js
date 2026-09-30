(function() {
    'use strict';

    const STORAGE_KEY = 'ownerDashboardAuth';

    function injectBrandVariables() {
        const root = document.documentElement;
        if (typeof BRAND === 'undefined') return;
        root.style.setProperty('--primary', BRAND.primaryColor);
        root.style.setProperty('--primary-dark', BRAND.primaryDark);
        root.style.setProperty('--primary-light', BRAND.primaryLight);
        root.style.setProperty('--background', BRAND.backgroundColor);
        root.style.setProperty('--surface', BRAND.lightBackground);
        root.style.setProperty('--text', BRAND.textColor);
        root.style.setProperty('--muted', BRAND.mutedTextColor);
        root.style.setProperty('--border', BRAND.borderColor);
    }

    function setView(isLoggedIn) {
        document.getElementById('owner-login-view').classList.toggle('owner-hidden', isLoggedIn);
        document.getElementById('owner-dashboard-view').classList.toggle('owner-hidden', !isLoggedIn);
    }

    function showError(id, message) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = message;
        el.classList.remove('owner-hidden');
    }

    function clearError(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = '';
        el.classList.add('owner-hidden');
    }

    function setAuthToken(token) {
        sessionStorage.setItem(STORAGE_KEY, token);
    }

    function getAuthToken() {
        return sessionStorage.getItem(STORAGE_KEY) || '';
    }

    function clearAuthToken() {
        sessionStorage.removeItem(STORAGE_KEY);
    }

    function getApiUrl(path) {
        var cleanPath = String(path || '').trim();
        cleanPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
        var base = '';
        if (typeof API_BASE_URL !== 'undefined') {
            base = String(API_BASE_URL || '').trim();
            if (base === 'null' || base === 'undefined' || base.toLowerCase() === 'null') base = '';
        }
        // No base -> resolve relative to the current origin (default Worker origin for pages.dev / workers.dev)
        if (!base) return cleanPath;
        // Strip trailing slash and any trailing query/hash noise from the base
        base = base.replace(/[?#].*$/, '').replace(/\/+$/, '');
        // If base is just a protocol + nothing, bail to relative
        if (!base || /^https?:\/?$/i.test(base)) return cleanPath;
        // Ensure absolute URL: if no scheme but starts with hostname, prepend https://
        if (!/^https?:\/\//i.test(base)) base = 'https://' + base;
        return base + cleanPath;
    }

    var configMode = 'affiliate';
    var configValues = {};
    var configLabels = {
        BUSINESS: 'Business details', API_BASE_URL: 'API connection', BRAND: 'Brand colors', PRODUCT: 'Product details',
        PRODUCT_TYPE: 'Product type', PRODUCT_IMAGES: 'Product images', PRODUCT_VIDEOS: 'Product videos', FEATURES: 'Features',
        SPECIFICATIONS: 'Specifications', PACKAGES: 'Packages and pricing', DELIVERY: 'Delivery text', GUARANTEE: 'Guarantee',
        WHY_CHOOSE: 'Why choose us', TESTIMONIALS: 'Testimonials', FAQ: 'FAQ', WHATSAPP_NUMBERS: 'WhatsApp numbers',
        PAYMENT: 'Payment settings', MANUAL_PAYMENT: 'Manual payment', SOCIAL_LINKS: 'Social links', LOGO: 'Logo', NAVIGATION: 'Navigation',
        FOOTER_LINKS: 'Footer links', SEO: 'SEO', ANALYTICS: 'Analytics', SALES_POPUP: 'Sales popup', PROMOTION: 'Promotion',
        SOCIAL_PROOF_GALLERY: 'Social proof gallery', COMPANY: 'Company', TRUST_BADGES: 'Trust badges', CONTACT: 'Contact',
        ABOUT_PRODUCT: 'About product', HERO_TRUST: 'Hero trust items', STICKY_CTA: 'Sticky CTA', STORE_CONTENT: 'Store content',
        PRODUCTS: 'Products', AFFILIATE_PRODUCTS: 'Affiliate products', WEBSITE_TYPE_SELECT: 'Active website mode'
    };

    function configTitle(key) {
        return configLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, function(letter) { return letter.toUpperCase(); });
    }

    async function fetchConfig(mode) {
        var response = await fetch(getApiUrl('/api/owner/config?mode=' + encodeURIComponent(mode)), {
            headers: { 'Authorization': 'Basic ' + getAuthToken() }
        });
        var data = await response.json().catch(function() { return {}; });
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load configuration');
        return data.config || {};
    }

    function pathParts(path) {
        return path.split('.').map(function(part) { return /^\d+$/.test(part) ? Number(part) : part; });
    }

    function getAtPath(root, path) {
        return pathParts(path).reduce(function(value, part) { return value === undefined || value === null ? undefined : value[part]; }, root);
    }

    function setAtPath(root, path, value) {
        var parts = pathParts(path);
        var target = root;
        parts.forEach(function(part, index) {
            if (index === parts.length - 1) target[part] = value;
            else target = target[part];
        });
    }

    function cloneValue(value) {
        if (value === undefined) return '';
        if (value === null) return null;
        if (Array.isArray(value)) return value.map(cloneValue);
        if (typeof value === 'object') {
            var copy = {};
            Object.keys(value).forEach(function(key) { copy[key] = cloneValue(value[key]); });
            return copy;
        }
        return value;
    }

    function emptyArrayItem(array) {
        var sample = array.length ? array[0] : '';
        if (Array.isArray(sample)) return [];
        if (sample && typeof sample === 'object') {
            var item = {};
            Object.keys(sample).forEach(function(key) {
                item[key] = typeof sample[key] === 'boolean' ? false : (Array.isArray(sample[key]) ? [] : '');
            });
            return item;
        }
        return '';
    }

    var IMAGE_FIELD_KEYWORDS = [
        'image', 'images', 'logo', 'socialimage', 'ogimage',
        'picture', 'pictures', 'photo', 'photos', 'thumbnail',
        'banner', 'cover', 'icon', 'avatar', 'file', 'gallery'
    ];

    function isImageFieldKey(key) {
        var k = String(key || '').toLowerCase().replace(/[_-]/g, '');
        if (!k) return false;
        for (var i = 0; i < IMAGE_FIELD_KEYWORDS.length; i++) {
            if (k.indexOf(IMAGE_FIELD_KEYWORDS[i]) >= 0) return true;
        }
        return false;
    }

    function pathLeafKey(path) {
        if (!path) return '';
        var parts = String(path).split('.');
        return parts[parts.length - 1] || '';
    }

    async function uploadImageFile(file, configKey, onProgress) {
        var form = new FormData();
        form.append('file', file);
        if (configKey) form.append('configKey', configKey);
        var token = getAuthToken();
        var xhr = new XMLHttpRequest();
        return new Promise(function(resolve, reject) {
            xhr.open('POST', getApiUrl('/api/owner/upload'), true);
            if (token) xhr.setRequestHeader('Authorization', 'Basic ' + token);
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable && onProgress) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };
            xhr.onload = function() {
                var data;
                try { data = JSON.parse(xhr.responseText || '{}'); }
                catch (e) { data = {}; }
                if (xhr.status >= 200 && xhr.status < 300 && data.success) {
                    resolve(data);
                } else {
                    reject(new Error(data.error || ('Upload failed (HTTP ' + xhr.status + ')')));
                }
            };
            xhr.onerror = function() { reject(new Error('Network error during upload')); };
            xhr.ontimeout = function() { reject(new Error('Upload timed out')); };
            xhr.timeout = 120000;
            xhr.send(form);
        });
    }

    function updateOwnerFieldStatus(field, statusEl, message, isError) {
        if (!statusEl) return;
        statusEl.textContent = message || '';
        statusEl.style.color = isError ? '#dc2626' : '#16a34a';
        statusEl.style.fontSize = '0.8rem';
        statusEl.style.marginTop = '4px';
    }

    function makeImagePreview(value) {
        var preview = document.createElement('div');
        preview.className = 'owner-image-preview';
        preview.style.marginTop = '8px';
        preview.style.display = 'none';
        preview.style.width = '100%';
        preview.style.maxWidth = '220px';
        preview.style.height = '140px';
        preview.style.borderRadius = '10px';
        preview.style.border = '1px solid var(--border)';
        preview.style.overflow = 'hidden';
        preview.style.background = '#f1f5f9';
        var img = document.createElement('img');
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        img.alt = 'Preview';
        var setPreviewSrc = function(src) {
            if (!src) { preview.style.display = 'none'; img.removeAttribute('src'); return; }
            img.src = src;
            preview.style.display = 'block';
        };
        img.onerror = function() { preview.style.display = 'none'; };
        preview.appendChild(img);
        if (value) setPreviewSrc(String(value));
        return { wrapper: preview, setSrc: setPreviewSrc };
    }

    function makeUploadControls(input, path) {
        var wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.flexDirection = 'column';
        wrap.style.gap = '6px';
        wrap.style.flex = '1 1 auto';

        var inputRow = document.createElement('div');
        inputRow.style.display = 'flex';
        inputRow.style.gap = '8px';
        inputRow.style.alignItems = 'center';
        inputRow.appendChild(input);

        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif,image/bmp';
        fileInput.style.display = 'none';

        var uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.className = 'btn btn-secondary owner-image-upload-btn';
        uploadBtn.textContent = 'Upload Image';
        uploadBtn.style.padding = '8px 12px';
        uploadBtn.style.flexShrink = '0';
        uploadBtn.style.whiteSpace = 'nowrap';

        var statusEl = document.createElement('div');
        statusEl.className = 'owner-image-status';

        var preview = makeImagePreview(input.value);

        uploadBtn.addEventListener('click', function() { fileInput.click(); });

        fileInput.addEventListener('change', async function() {
            var file = fileInput.files && fileInput.files[0];
            if (!file) return;
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Uploading...';
            updateOwnerFieldStatus(wrap, statusEl, '', false);
            try {
                var result = await uploadImageFile(file, path, function(percent) {
                    uploadBtn.textContent = 'Uploading ' + percent + '%';
                });
                if (result && result.url) {
                    input.value = String(result.url);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    preview.setSrc(String(result.url));
                    updateOwnerFieldStatus(wrap, statusEl, 'Uploaded successfully', false);
                    setTimeout(function() { updateOwnerFieldStatus(wrap, statusEl, '', false); }, 3000);
                }
            } catch (error) {
                updateOwnerFieldStatus(wrap, statusEl, error.message || 'Upload failed', true);
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload Image';
                fileInput.value = '';
            }
        });

        input.addEventListener('input', function() {
            preview.setSrc(input.value);
        });

        inputRow.appendChild(uploadBtn);
        inputRow.appendChild(fileInput);
        wrap.appendChild(inputRow);
        wrap.appendChild(statusEl);
        wrap.appendChild(preview.wrapper);
        return wrap;
    }

    function makeInput(label, value, path) {
        var field = document.createElement('label');
        field.className = 'owner-field' + (typeof value === 'boolean' ? ' owner-checkbox-field' : '');
        var text = document.createElement('span');
        text.textContent = label;
        var input;
        if (typeof value === 'boolean') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = value;
        } else if (typeof value === 'number') {
            input = document.createElement('input');
            input.type = 'number';
            input.value = value;
            input.step = 'any';
        } else if (String(value || '').length > 100 || String(value || '').indexOf('\n') >= 0) {
            input = document.createElement('textarea');
            input.value = value === null ? '' : String(value || '');
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.value = value === null ? '' : String(value || '');
        }
        input.dataset.configPath = path;
        input.dataset.configType = typeof value;
        field.appendChild(text);

        var isImage = !!(typeof value === 'string' && value !== '' &&
            /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp)(\?|#|$)/i.test(String(value).trim())) ||
            isImageFieldKey(label) || isImageFieldKey(pathLeafKey(path));

        if (typeof value !== 'boolean' && typeof value !== 'number' &&
            !(String(value || '').length > 100 || String(value || '').indexOf('\n') >= 0) && isImage) {
            field.appendChild(makeUploadControls(input, path));
        } else {
            field.appendChild(input);
        }
        return field;
    }

    function renderNode(value, path, label) {
        var wrapper = document.createElement('div');
        wrapper.className = 'owner-node';
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            if (label) {
                var heading = document.createElement('h4');
                heading.textContent = label;
                wrapper.appendChild(heading);
            }
            var grid = document.createElement('div');
            grid.className = 'owner-fields-grid';
            Object.keys(value).forEach(function(key) {
                var child = value[key];
                if (child && typeof child === 'object') wrapper.appendChild(renderNode(child, path + '.' + key, key));
                else grid.appendChild(makeInput(key, child, path + '.' + key));
            });
            if (grid.children.length) wrapper.appendChild(grid);
        } else if (Array.isArray(value)) {
            if (label) {
                var arrayHeading = document.createElement('h4');
                arrayHeading.textContent = label;
                wrapper.appendChild(arrayHeading);
            }
            value.forEach(function(item, index) {
                var card = document.createElement('div');
                card.className = 'owner-array-item';
                card.appendChild(renderNode(item, path + '.' + index, 'Item ' + (index + 1)));
                var remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'btn btn-secondary owner-remove-item';
                remove.textContent = 'Remove item';
                remove.dataset.removePath = path;
                remove.dataset.removeIndex = index;
                card.appendChild(remove);
                wrapper.appendChild(card);
            });
            var add = document.createElement('button');
            add.type = 'button';
            add.className = 'btn btn-secondary owner-add-item';
            add.textContent = 'Add item';
            add.dataset.addPath = path;
            wrapper.appendChild(add);
        } else {
            wrapper.appendChild(makeInput(label, value, path));
        }
        return wrapper;
    }

    function collectConfig() {
        var nextConfig = cloneValue(configValues);
        document.querySelectorAll('[data-config-path]').forEach(function(input) {
            var value;
            if (input.dataset.configType === 'boolean') value = input.checked;
            else if (input.dataset.configType === 'number') value = input.value === '' ? 0 : Number(input.value);
            else value = input.value;
            setAtPath(nextConfig, input.dataset.configPath, value);
        });
        return nextConfig;
    }

    function renderConfig() {
        var container = document.getElementById('owner-config-sections');
        if (!container) return;
        container.innerHTML = '';
        Object.keys(configValues).sort().forEach(function(key) {
            var section = document.createElement('section');
            section.className = 'owner-config-section';
            var title = document.createElement('h3');
            title.textContent = configTitle(key);
            var description = document.createElement('p');
            description.textContent = 'Edit the settings below. Lists can be expanded with Add item.';
            section.appendChild(title);
            section.appendChild(description);
            section.appendChild(renderNode(configValues[key], key, ''));
            container.appendChild(section);
        });
    }

    function setConfigStatus(message, isError) {
        var status = document.getElementById('owner-config-status');
        if (!status) return;
        status.textContent = message;
        status.style.color = isError ? '#dc2626' : '';
    }

    async function loadConfig(mode) {
        setConfigStatus('Loading settings...');
        try {
            configValues = await fetchConfig(mode);
            configMode = mode;
            if (mode === 'singleproduct' && !configValues.WEBSITE_TYPE_SELECT) configValues.WEBSITE_TYPE_SELECT = 'singleproduct';
            renderConfig();
            setConfigModeBanner(mode);
            setConfigStatus('');
        } catch (error) {
            setConfigStatus(error.message || 'Unable to load settings', true);
        }
    }

    async function saveConfig() {
        var nextConfig = collectConfig();
        if (configMode === 'singleproduct' && !nextConfig.WEBSITE_TYPE_SELECT) nextConfig.WEBSITE_TYPE_SELECT = 'singleproduct';
        setConfigStatus('Saving settings...');
        try {
            var response = await fetch(getApiUrl('/api/owner/config'), {
                method: 'PUT',
                headers: { 'Authorization': 'Basic ' + getAuthToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: configMode, config: nextConfig })
            });
            var data = await response.json().catch(function() { return {}; });
            if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save settings');
            configValues = nextConfig;
            renderConfig();
            setConfigStatus('Saved successfully. Refresh the storefront to see changes.');
        } catch (error) {
            setConfigStatus(error.message || 'Unable to save settings', true);
        }
    }

    function setConfigModeBanner(mode) {
        var el = document.getElementById('owner-config-mode-banner');
        if (!el || !mode) return;
        var label = mode === 'multipleproducts' ? 'Multiple Products' : (mode === 'singleproduct' ? 'Single Product' : 'Affiliate');
        el.textContent = 'Editing ' + label + ' template settings only. Change Store Mode above to manage another template.';
    }

    function initConfig() {
        // Per the mode-gate flow, Settings only shows the currently APPLIED store mode form.
        // The legacy 3 sub-tab buttons are hidden; prevent their click listeners from swapping.
        document.querySelectorAll('[data-config-mode]').forEach(function(button) {
            button.addEventListener('click', function(ev) {
                ev.preventDefault();
                // No-op: changing template mode is done exclusively via the header Store Mode dropdown.
                document.querySelectorAll('[data-config-mode]').forEach(function(tab) {
                    tab.classList.toggle('active', tab.dataset.configMode === configMode);
                });
            });
        });
        var save = document.getElementById('owner-config-save');
        var reset = document.getElementById('owner-config-reset');
        if (save) save.addEventListener('click', saveConfig);
        if (reset) reset.addEventListener('click', function() {
            loadConfig(configMode).then(function() { setConfigModeBanner(configMode); });
        });
        document.getElementById('owner-config-sections').addEventListener('click', function(event) {
            var addPath = event.target.dataset.addPath;
            var removePath = event.target.dataset.removePath;
            if (!addPath && !removePath) return;
            configValues = collectConfig();
            if (addPath) {
                var list = getAtPath(configValues, addPath);
                list.push(emptyArrayItem(list));
            } else {
                getAtPath(configValues, removePath).splice(Number(event.target.dataset.removeIndex), 1);
            }
            renderConfig();
        });
    }

    function setLoginFieldErrorState(hasError) {
        ['owner-username', 'owner-password'].forEach(function(id) {
            const input = document.getElementById(id);
            if (!input) return;
            input.classList.toggle('error', hasError);
            input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
        });
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('en-NG');
    }

    function formatMoney(value) {
        const currency = (typeof BUSINESS !== 'undefined' && BUSINESS.currency) ? BUSINESS.currency : '₦';
        return currency + formatNumber(value);
    }

    async function fetchStats(token) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(function() {
            controller.abort();
        }, 10000);

        const response = await fetch(getApiUrl('/api/owner/stats'), {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + token
            },
            signal: controller.signal
        }).finally(function() {
            window.clearTimeout(timeoutId);
        });

        const data = await response.json().catch(function() {
            return {};
        });
        if (!response.ok || !data.success) {
            if (response.status === 401) {
                throw new Error('Invalid username or password. Please try again.');
            }
            throw new Error(data.error || 'Unable to load dashboard stats');
        }

        return data.stats;
    }

    function renderStats(stats) {
        document.querySelectorAll('[data-stat]').forEach(function(el) {
            const key = el.getAttribute('data-stat');
            el.textContent = formatNumber(stats[key]);
        });

        document.querySelectorAll('[data-stat-money]').forEach(function(el) {
            const key = el.getAttribute('data-stat-money');
            el.textContent = formatMoney(stats[key]);
        });

        const lastUpdated = document.getElementById('owner-last-updated');
        if (lastUpdated) {
            lastUpdated.textContent = 'Last updated: ' + (stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'No data yet');
        }
    }

    function safeText(value) {
        return String(value === undefined || value === null ? '' : value);
    }

    function showLookupError(message) {
        showError('owner-lookup-error', message);
    }

    function clearLookupError() {
        clearError('owner-lookup-error');
    }

    function hideLookupResult() {
        const box = document.getElementById('owner-lookup-result');
        if (!box) return;
        box.classList.add('owner-hidden');
        box.innerHTML = '';
    }

    function renderLookupResult(record) {
        const box = document.getElementById('owner-lookup-result');
        if (!box) return;

        const customer = record && record.customer ? record.customer : {};
        const rowHtml = function(label, value) {
            if (value === undefined || value === null || value === '') return '';
            return '<div class="owner-lookup-row"><span>' + label + '</span><span>' + safeText(value) + '</span></div>';
        };

        const items = record && Array.isArray(record.items) ? record.items : [];
        const itemsHtml = items.length ? (
            '<h3 style="margin-top:16px;">Items</h3>' +
            items.map(function(item) {
                const title = safeText(item.productTitle || item.productId || '');
                const variant = safeText(item.packageTitle || item.packageId || '');
                const qty = safeText(item.qty || item.quantity || '');
                const total = item.lineTotal !== undefined ? (safeText(item.lineTotal) + ' ' + safeText(record.currency)) : '';
                return '<div class="owner-lookup-row"><span>' + title + (variant ? (' (' + variant + ')') : '') + '</span><span>' + (qty ? ('x' + qty + ' ') : '') + total + '</span></div>';
            }).join('')
        ) : '';

        box.innerHTML = [
            '<h3>Order Details</h3>',
            '<div class="owner-lookup-row"><span>Reference</span><span>' + safeText(record.reference) + '</span></div>',
            '<div class="owner-lookup-row"><span>Order Type</span><span>' + safeText(record.orderType) + '</span></div>',
            '<div class="owner-lookup-row"><span>Payment Status</span><span>' + safeText(record.paymentStatus) + '</span></div>',
            '<div class="owner-lookup-row"><span>Order Status</span><span>' + safeText(record.orderStatus) + '</span></div>',
            '<div class="owner-lookup-row"><span>Package</span><span>' + safeText(record.packageTitle || record.packageId) + '</span></div>',
            '<div class="owner-lookup-row"><span>Quantity</span><span>' + safeText(record.quantity) + '</span></div>',
            '<div class="owner-lookup-row"><span>Amount</span><span>' + safeText(record.amount) + ' ' + safeText(record.currency) + '</span></div>',
            rowHtml('Subtotal', record.subtotal !== undefined ? (safeText(record.subtotal) + ' ' + safeText(record.currency)) : ''),
            rowHtml('Shipping', record.shippingFee !== undefined ? (safeText(record.shippingFee) + ' ' + safeText(record.currency)) : ''),
            rowHtml('Verified At', record.verifiedAt),
            rowHtml('Created At', record.createdAt),
            itemsHtml,
            '<h3 style="margin-top:16px;">Customer</h3>',
            rowHtml('Name', customer.name),
            rowHtml('Email', customer.email),
            rowHtml('Phone', customer.phone),
            rowHtml('Address', [customer.address, customer.city, customer.state].filter(Boolean).join(', ')),
            rowHtml('Special Request', customer.specialRequest),
            (record.warnings && record.warnings.length ? ('<div style="margin-top:14px;color:#b45309;font-size:0.92rem;">Warnings: ' + safeText(record.warnings.join(', ')) + '</div>') : '')
        ].filter(Boolean).join('');

        box.classList.remove('owner-hidden');
    }

    async function fetchOrderByReference(token, reference) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(function() {
            controller.abort();
        }, 10000);

        const response = await fetch(getApiUrl('/api/owner/order?ref=' + encodeURIComponent(reference)), {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + token
            },
            signal: controller.signal
        }).finally(function() {
            window.clearTimeout(timeoutId);
        });

        const data = await response.json().catch(function() {
            return {};
        });

        if (!response.ok || !data.success) {
            if (response.status === 401) {
                throw new Error('Invalid username or password. Please log in again.');
            }
            throw new Error(data.error || 'Unable to load order details');
        }

        return data.record;
    }

    function setDashboardSubviews(mode /* 'gate' | 'main' */) {
        var gate = document.getElementById('owner-mode-gate');
        var main = document.getElementById('owner-main-view');
        if (gate) gate.classList.toggle('owner-hidden', mode !== 'gate');
        if (main) main.classList.toggle('owner-hidden', mode !== 'main');
    }

    function setModeGateCard(selected) {
        document.querySelectorAll('[data-mode-card]').forEach(function(card) {
            card.classList.toggle('active', card.dataset.modeCard === selected);
        });
        var sel = document.getElementById('owner-site-mode');
        if (sel) sel.value = selected;
        var pm = document.getElementById('owner-products-mode');
        if (pm) pm.value = selected;
    }

    function setModeGateStatus(message, isError) {
        var el = document.getElementById('owner-mode-gate-status');
        if (!el) return;
        el.textContent = message || '';
        el.style.color = isError ? '#dc2626' : '#475569';
    }

    async function loadModeGateOrDefault() {
        var detected = 'multipleproducts';
        try {
            var cfg = await fetchConfig('singleproduct');
            if (cfg && cfg.WEBSITE_TYPE_SELECT) {
                var v = String(cfg.WEBSITE_TYPE_SELECT).toLowerCase();
                if (v === 'singleproduct' || v === 'multipleproducts' || v === 'affiliate') detected = v;
            }
        } catch (e) {}
        activeProductsMode = detected;
        configMode = detected;
        setModeGateCard(detected);
        setSiteModeSelectValue(detected);
        configValues = await fetchConfig(detected);
        if (configMode === 'singleproduct' && !configValues.WEBSITE_TYPE_SELECT) configValues.WEBSITE_TYPE_SELECT = 'singleproduct';
        setConfigModeBanner(detected);
        renderConfig();
        if (typeof loadProductsManagement === 'function') try { loadProductsManagement(detected); } catch (_e) {}
        setDashboardSubviews('main');
    }

    async function applyModeGate(mode) {
        var target = String(mode || '').toLowerCase();
        if (target !== 'singleproduct' && target !== 'multipleproducts' && target !== 'affiliate') target = 'multipleproducts';
        setModeGateStatus('Applying ' + target + '...');
        try {
            // Persist (mirrored to all 3 KV buckets via worker handleOwnerConfigSave)
            var cfg;
            try { cfg = await fetchConfig(target); } catch (e) { cfg = {}; }
            cfg.WEBSITE_TYPE_SELECT = target;
            var res = await fetch(getApiUrl('/api/owner/config'), {
                method: 'PUT',
                headers: { 'Authorization': 'Basic ' + getAuthToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: target, config: cfg })
            });
            var data = await res.json().catch(function() { return {}; });
            if (!res.ok || !data.success) throw new Error(data.error || 'Unable to apply store mode');
            // Sync every UI selector
            activeProductsMode = target;
            configMode = target;
            setSiteModeSelectValue(target);
            setModeGateCard(target);
            document.querySelectorAll('[data-config-mode]').forEach(function(tab) {
                tab.classList.toggle('active', tab.dataset.configMode === target);
            });
            setSiteModeStatus('Applied ' + target + '. All views filtered to this mode.');
            setModeGateStatus('');
            // Load filtered content for the chosen mode
            configValues = await fetchConfig(target);
            activeProductsConfig = configValues;
            renderConfig();
            setConfigStatus('');
            if (activeNavTab === 'products') renderProductsList();
            // Refresh stats so dashboard is fresh
            try {
                var stats = await fetchStats(getAuthToken());
                renderStats(stats);
            } catch (e) {}
            setDashboardSubviews('main');
            return true;
        } catch (error) {
            setModeGateStatus(error.message || 'Unable to apply store mode', true);
            return false;
        }
    }

    function initModeGate() {
        document.querySelectorAll('[data-mode-card]').forEach(function(card) {
            card.addEventListener('click', function() {
                var mode = card.dataset.modeCard;
                activeProductsMode = mode;
                configMode = mode;
                setModeGateCard(mode);
                setModeGateStatus('Selected: ' + mode + '. Click Apply & continue.');
            });
        });
        var cancel = document.getElementById('owner-mode-gate-cancel');
        var apply = document.getElementById('owner-mode-gate-apply');
        if (cancel) cancel.addEventListener('click', function() { clearAuthToken(); setView(false); });
        if (apply) apply.addEventListener('click', function() { applyModeGate(activeProductsMode || 'multipleproducts'); });
        // Keep header Store Mode dropdown in sync with card
        var sel = document.getElementById('owner-site-mode');
        if (sel) sel.addEventListener('change', function() {
            var v = sel.value;
            activeProductsMode = v;
            configMode = v;
            setModeGateCard(v);
            setModeGateStatus('Selected: ' + v + '. Click Apply & continue.');
        });
        // Hide redundant Settings sub-tabs. Only show the selected mode form; enforce via initConfig too.
        var settingsTabsRow = document.querySelector('.owner-config .owner-tabs');
        if (settingsTabsRow) {
            settingsTabsRow.style.display = 'none';
            var banner = document.createElement('p');
            banner.className = 'owner-meta';
            banner.id = 'owner-config-mode-banner';
            banner.style.margin = '0 0 14px';
            banner.style.fontWeight = '600';
            banner.style.color = '#0f766e';
            settingsTabsRow.parentNode.insertBefore(banner, settingsTabsRow.nextSibling);
        }
    }

    async function loadDashboard() {
        clearError('owner-dashboard-error');
        var token = getAuthToken();
        if (!token) {
            setView(false);
            return;
        }

        try {
            setView(true);
            setLoginFieldErrorState(false);
            await loadModeGateOrDefault();
        } catch (error) {
            clearAuthToken();
            setView(false);
            setLoginFieldErrorState(true);
            showError('owner-login-error', error.name === 'AbortError'
                ? 'Dashboard request timed out. Please confirm OWNER_STATS is bound and try again.'
                : (error.message || 'Invalid username or password. Please try again.'));
        }
    }

    function initLookup() {
        const form = document.getElementById('owner-lookup-form');
        const input = document.getElementById('owner-lookup-ref');
        if (!form || !input) return;

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            clearLookupError();
            hideLookupResult();

            const token = getAuthToken();
            if (!token) {
                showLookupError('Please log in first.');
                return;
            }

            const reference = input.value.trim();
            if (!reference) {
                showLookupError('Enter a payment reference.');
                return;
            }

            try {
                const record = await fetchOrderByReference(token, reference);
                renderLookupResult(record);
            } catch (error) {
                if (String(error.message || '').toLowerCase().includes('log in')) {
                    clearAuthToken();
                    setView(false);
                }
                showLookupError(error.name === 'AbortError' ? 'Request timed out. Please try again.' : (error.message || 'Unable to load order details'));
            }
        });

        input.addEventListener('input', function() {
            clearLookupError();
        });
    }

    function initLogin() {
        const form = document.getElementById('owner-login-form');
        if (!form) return;

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            clearError('owner-login-error');
            setLoginFieldErrorState(false);

            const username = document.getElementById('owner-username').value.trim();
            const password = document.getElementById('owner-password').value;
            const token = btoa(username + ':' + password);

            try {
                const stats = await fetchStats(token);
                setAuthToken(token);
                renderStats(stats);
                setView(true);
                setLoginFieldErrorState(false);
                await loadModeGateOrDefault();
            } catch (error) {
                setLoginFieldErrorState(true);
                showError('owner-login-error', error.name === 'AbortError'
                    ? 'Dashboard request timed out. Please confirm OWNER_STATS is bound and try again.'
                    : (error.message || 'Invalid username or password. Please try again.'));
            }
        });

        ['owner-username', 'owner-password'].forEach(function(id) {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener('input', function() {
                clearError('owner-login-error');
                setLoginFieldErrorState(false);
            });
        });
    }

    function initActions() {
        const refreshBtn = document.getElementById('owner-refresh-btn');
        const logoutBtn = document.getElementById('owner-logout-btn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                loadDashboard();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                clearAuthToken();
                clearError('owner-dashboard-error');
                setView(false);
            });
        }
    }

    /* ===============================
       OWNER DASHBOARD NAV TABS
       =============================== */
    var activeNavTab = 'overview';
    var activeProductsMode = 'multipleproducts';
    var activeProductsConfig = {};
    var editorDraft = null; // { isSingle, draftProduct, removedImages: Set, images: [{url, id}], specs: [], packages: [], index }

    function switchNavTab(tabId) {
        activeNavTab = tabId;
        document.querySelectorAll('[data-nav-tab]').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.navTab === tabId);
        });
        document.querySelectorAll('.owner-nav-panel').forEach(function(panel) {
            var id = 'nav-panel-' + tabId;
            panel.classList.toggle('active', panel.id === id);
        });
        if (tabId === 'products') {
            ensureProductsModeLoaded(activeProductsMode).then(renderProductsList).catch(function(error) {
                setProductsStatus(error.message || 'Unable to load products configuration', true);
            });
        } else if (tabId === 'site-selector') {
            loadSiteSelectorEditor();
        }
    }

    function initNavTabs() {
        document.querySelectorAll('[data-nav-tab]').forEach(function(btn) {
            btn.addEventListener('click', function() { switchNavTab(btn.dataset.navTab); });
        });
        [
            ['nav-goto-orders', 'orders'],
            ['nav-goto-products', 'products'],
            ['nav-goto-site-selector', 'site-selector'],
            ['nav-goto-settings', 'settings'],
            ['nav-goto-settings-payments', 'settings', 'MANUAL_PAYMENT'],
            ['nav-goto-settings-business', 'settings', 'BUSINESS']
        ].forEach(function(pair) {
            var el = document.getElementById(pair[0]);
            if (!el) return;
            el.addEventListener('click', function() {
                switchNavTab(pair[1]);
                if (pair[2]) {
                    if (typeof showSingleConfigSection === 'function') showSingleConfigSection(pair[2]);
                    else if (typeof scrollToConfigSection === 'function') window.setTimeout(function() { scrollToConfigSection(pair[2]); }, 140);
                } else if (pair[1] === 'settings' && typeof showAllConfigSections === 'function') {
                    showAllConfigSections();
                }
            });
        });
    }

    function setProductsStatus(message, isError) {
        var subheader = document.getElementById('owner-products-subheader');
        if (!subheader) return;
        subheader.textContent = message ? String(message) : 'Edit product details, images, specifications and pricing.';
        subheader.style.color = isError ? '#dc2626' : '';
    }

    async function ensureProductsModeLoaded(mode) {
        if (!configValues || Object.keys(configValues).length === 0 || configMode !== mode) {
            configValues = await fetchConfig(mode);
            configMode = mode;
        }
        activeProductsConfig = configValues;
        activeProductsMode = mode;
    }

    function slugIdFromTitle(title) {
        var base = String(title || 'product').toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'product';
        return base + '-' + Math.random().toString(36).slice(2, 8);
    }

    function normalizeSingleProductImages(arr) {
        if (!Array.isArray(arr)) return [];
        return arr.map(function(item) {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') return String(item.file || item.url || item.src || '');
            return '';
        }).filter(function(s) { return !!s; });
    }

    function readProductsList(mode, values) {
        if (mode === 'multipleproducts') {
            var products = Array.isArray(values.PRODUCTS) ? values.PRODUCTS : [];
            return products.map(function(raw, index) {
                var p = raw && typeof raw === 'object' ? raw : {};
                var image = String(p.image || (Array.isArray(p.images) && p.images[0] ? p.images[0] : '') || '');
                return {
                    __kind: 'multi',
                    __index: index,
                    id: String(p.id || 'product-' + index),
                    title: String(p.title || p.shortTitle || 'Untitled'),
                    shortTitle: String(p.shortTitle || ''),
                    description: String(p.description || ''),
                    longDescription: String(p.longDescription || ''),
                    productType: String(p.productType || 'physical'),
                    shippingFee: Number(p.shippingFee || 0),
                    image: image,
                    images: Array.isArray(p.images) ? p.images.map(String) : (image ? [image] : []),
                    specs: Array.isArray(p.specs) ? p.specs.map(function(s) { return { label: String((s && s.label) || ''), value: String((s && s.value) || '') }; }) : [],
                    packages: Array.isArray(p.packages) ? p.packages.map(function(pkg) { return { id: String((pkg && pkg.id) || ''), title: String((pkg && pkg.title) || ''), price: Number((pkg && pkg.price) || 0) }; }) : [],
                    price: Number(p.price || ((Array.isArray(p.packages) && p.packages[0] && p.packages[0].price != null) ? Number(p.packages[0].price) : 0))
                };
            });
        }
        if (mode === 'affiliate') {
            var items = Array.isArray(values.AFFILIATE_PRODUCTS) ? values.AFFILIATE_PRODUCTS : [];
            return items.map(function(raw, index) {
                var p = raw && typeof raw === 'object' ? raw : {};
                var image = String(p.image || (Array.isArray(p.images) && p.images[0] ? p.images[0] : '') || '');
                return {
                    __kind: 'affiliate',
                    __index: index,
                    id: String(p.id || 'affiliate-product-' + index),
                    title: String(p.title || 'Untitled'),
                    shortTitle: '',
                    description: String(p.description || ''),
                    longDescription: String(p.longDescription || ''),
                    productType: 'affiliate',
                    shippingFee: 0,
                    image: image,
                    images: Array.isArray(p.images) ? p.images.map(String) : (image ? [image] : []),
                    specs: Array.isArray(p.specs) ? p.specs.map(function(s) { return { label: String((s && s.label) || ''), value: String((s && s.value) || '') }; }) : [],
                    packages: [],
                    price: Number(p.price || 0),
                    affiliateUrl: String(p.affiliateUrl || ''),
                    buttonText: String(p.buttonText || 'Buy on Vendor')
                };
            });
        }
        if (mode === 'singleproduct') {
            var prod = values.PRODUCT || {};
            var coverImage = (values.PRODUCT_IMAGES && values.PRODUCT_IMAGES[0]) ? (
                typeof values.PRODUCT_IMAGES[0] === 'string' ? values.PRODUCT_IMAGES[0] : (values.PRODUCT_IMAGES[0].file || '')
            ) : String(prod.coverImage || prod.image || '');
            return [{
                __kind: 'single',
                __index: 0,
                id: 'single-main-product',
                title: String(prod.name || prod.title || 'Single Product'),
                shortTitle: String(prod.shortName || ''),
                description: String(prod.headline || prod.description || ''),
                longDescription: String(prod.description || ''),
                productType: String(prod.productType || 'physical'),
                shippingFee: Number(prod.shippingFee || 0),
                image: coverImage,
                images: normalizeSingleProductImages(values.PRODUCT_IMAGES),
                specs: Array.isArray(values.SPECIFICATIONS) ? values.SPECIFICATIONS.map(function(s) { return { label: String((s && s.label) || ''), value: String((s && s.value) || '') }; }) : [],
                packages: Array.isArray(values.PACKAGES) ? values.PACKAGES.map(function(pkg, i) { return { id: String((pkg && pkg.id) || ('pkg-' + i)), title: String((pkg && pkg.title) || ''), price: Number((pkg && pkg.price) || 0), quantity: Number((pkg && pkg.quantity) || 1), oldPrice: Number((pkg && pkg.oldPrice) || 0) }; }) : []
            }];
        }
        return [];
    }

    function resolveAssetSrc(url) {
        if (!url) return '';
        var src = String(url);
        var isCdn = src.startsWith('/cdn/') || src.startsWith('cdn/');
        if (!isCdn) return src;
        var base = '';
        if (typeof API_BASE_URL !== 'undefined') {
            base = String(API_BASE_URL || '').trim();
            if (base === 'null' || base === 'undefined' || base.toLowerCase() === 'null') base = '';
        }
        if (!base) return (src.startsWith('/') ? '' : '/') + src;
        base = base.replace(/[?#].*$/, '').replace(/\/+$/, '');
        if (!/^https?:\/\//i.test(base)) base = 'https://' + base;
        return base + (src.startsWith('/') ? '' : '/') + src;
    }

    function formatCoverStyle(url) {
        if (!url) return '';
        var src = resolveAssetSrc(url);
        return 'background-image:url(\'' + String(src).replace(/'/g, '\\\'') + '\');';
    }

    function formatCurrency(amount) {
        var value = Number(amount || 0);
        try {
            if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
                return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
            }
        } catch (e) {}
        return '₦' + String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function truncateUrl(url) {
        try {
            var s = String(url || '').replace(/^https?:\/\//i, '');
            if (s.length <= 32) return s;
            return s.slice(0, 14) + '…' + s.slice(-14);
        } catch (e) { return String(url || '').slice(0, 32); }
    }

    function renderProductsList() {
        var productsView = document.getElementById('owner-products-view');
        var editorView = document.getElementById('owner-product-editor-view');
        var addBtn = document.getElementById('owner-add-product-btn');
        var modeSelect = document.getElementById('owner-products-mode');
        if (!productsView) return;

        if (modeSelect) modeSelect.value = activeProductsMode;
        if (editorView) editorView.classList.add('owner-hidden');
        productsView.classList.remove('owner-hidden');

        var products = readProductsList(activeProductsMode, activeProductsConfig);
        var isSingle = activeProductsMode === 'singleproduct';
        var isAffiliate = activeProductsMode === 'affiliate';

        if (addBtn) addBtn.style.display = isSingle ? 'none' : '';

        if (!products.length) {
            productsView.innerHTML = '<div class="owner-products-empty">No products yet. Click <strong>+ Add product</strong> to create your first one.</div>';
            setProductsStatus('');
            return;
        }

        setProductsStatus('');
        var grid = document.createElement('div');
        grid.className = 'owner-products-grid';
        products.forEach(function(product, index) {
            var card = document.createElement('div');
            card.className = 'owner-product-card';

            var thumb = document.createElement('div');
            thumb.className = 'owner-product-thumb';
            if (product.image) thumb.setAttribute('style', formatCoverStyle(product.image));
            else thumb.textContent = (product.title || '?').slice(0, 1).toUpperCase();

            var body = document.createElement('div');
            body.className = 'owner-product-body';
            var title = document.createElement('h4');
            title.className = 'owner-product-title';
            title.textContent = product.title;
            var pid = document.createElement('div');
            pid.className = 'owner-product-id';
            pid.textContent = product.id ? ('ID: ' + String(product.id)) : '';
            var meta = document.createElement('div');
            meta.className = 'owner-product-meta';
            if (isAffiliate) {
                if (product.price) {
                    var pricePill = document.createElement('span');
                    pricePill.className = 'primary';
                    pricePill.textContent = formatCurrency(product.price);
                    meta.appendChild(pricePill);
                }
                var imgPill = document.createElement('span');
                imgPill.textContent = (product.images ? product.images.length : 0) + ' image' + ((product.images && product.images.length !== 1) ? 's' : '');
                meta.appendChild(imgPill);
                var typePill = document.createElement('span');
                typePill.textContent = 'affiliate';
                meta.appendChild(typePill);
                if (product.affiliateUrl) {
                    var ur = document.createElement('span');
                    ur.textContent = truncateUrl(product.affiliateUrl);
                    ur.title = product.affiliateUrl;
                    meta.appendChild(ur);
                }
            } else {
                var pkgPill = document.createElement('span');
                pkgPill.className = 'primary';
                pkgPill.textContent = (product.packages ? product.packages.length : 0) + ' package' + ((product.packages && product.packages.length !== 1) ? 's' : '');
                meta.appendChild(pkgPill);
                var imgPill = document.createElement('span');
                imgPill.textContent = (product.images ? product.images.length : 0) + ' image' + ((product.images && product.images.length !== 1) ? 's' : '');
                meta.appendChild(imgPill);
                var typePill = document.createElement('span');
                typePill.textContent = String(product.productType || 'physical').toLowerCase();
                meta.appendChild(typePill);
            }

            body.appendChild(title);
            if (pid.textContent) body.appendChild(pid);
            body.appendChild(meta);

            var actions = document.createElement('div');
            actions.className = 'owner-product-actions';
            var editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'btn btn-primary';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', function() { openProductEditor(product, index); });
            var delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'btn btn-secondary';
            delBtn.textContent = isSingle ? 'View only' : 'Delete';
            if (isSingle) delBtn.disabled = true;
            if (!isSingle) delBtn.addEventListener('click', function() { deleteProduct(product, index); });
            actions.appendChild(editBtn);
            actions.appendChild(delBtn);

            card.appendChild(thumb);
            card.appendChild(body);
            card.appendChild(actions);
            grid.appendChild(card);
        });
        productsView.innerHTML = '';
        productsView.appendChild(grid);
    }

    async function deleteProduct(product, index) {
        if (activeProductsMode === 'singleproduct') return;
        var ok = window.confirm('Delete product "' + String(product.title || product.id) + '"? This will remove its images from storage and can\'t be undone.');
        if (!ok) return;
        var toRemove = Array.from(new Set([product.image].concat(product.images || []).filter(Boolean)));
        try {
            if (toRemove.length) {
                await fetch(getApiUrl('/api/owner/upload'), {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Basic ' + getAuthToken(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keys: toRemove })
                });
            }
        } catch (error) {
            console.warn('R2 delete partial failure:', error);
        }
        if (activeProductsMode === 'affiliate') {
            if (Array.isArray(configValues.AFFILIATE_PRODUCTS)) configValues.AFFILIATE_PRODUCTS.splice(index, 1);
        } else if (Array.isArray(configValues.PRODUCTS)) {
            configValues.PRODUCTS.splice(index, 1);
        }
        configMode = activeProductsMode;
        activeProductsConfig = configValues;
        try {
            await saveConfigRaw(configValues);
            renderProductsList();
            setProductsStatus('Product removed successfully.');
        } catch (error) {
            setProductsStatus(error.message || 'Unable to delete product', true);
        }
    }

    function setSiteModeStatus(message, isError) {
        var el = document.getElementById('owner-site-mode-status');
        if (!el) return;
        el.textContent = message || 'Last saved: --';
        el.style.color = isError ? '#dc2626' : '#475569';
    }

    function setSiteModeSelectValue(mode) {
        var el = document.getElementById('owner-site-mode');
        if (el && mode) el.value = mode;
    }

    async function syncSiteModeFromSingleConfig() {
        var cfg;
        try {
            cfg = await fetchConfig('singleproduct');
            if (cfg && cfg.WEBSITE_TYPE_SELECT) {
                activeProductsMode = String(cfg.WEBSITE_TYPE_SELECT);
                configMode = String(cfg.WEBSITE_TYPE_SELECT);
            }
        } catch (e) {
            cfg = null;
        }
        // If no KV value yet, fall back to site_selector.js baked-in default (via fetchConfig if available)
        if (!cfg || !cfg.WEBSITE_TYPE_SELECT) {
            var detected = (cfg && cfg.WEBSITE_TYPE_SELECT) || activeProductsMode || 'multipleproducts';
            activeProductsMode = detected;
            configMode = detected;
        }
        setSiteModeSelectValue(activeProductsMode);
        // Also sync Products tab toolbar dropdown and Settings sub-tabs
        var pm = document.getElementById('owner-products-mode');
        if (pm) pm.value = activeProductsMode;
        document.querySelectorAll('[data-config-mode]').forEach(function(tab) {
            tab.classList.toggle('active', tab.dataset.configMode === activeProductsMode);
        });
    }

    async function saveSiteMode() {
        var sel = document.getElementById('owner-site-mode');
        if (!sel) return;
        var target = String(sel.value || 'multipleproducts').toLowerCase();
        if (target !== 'singleproduct' && target !== 'multipleproducts' && target !== 'affiliate') target = 'multipleproducts';
        setSiteModeStatus('Applying ' + target + '...');
        var ok = await applyModeGate(target);
        if (!ok) {
            setSiteModeStatus('Unable to apply ' + target + '. Please try again.', true);
        }
    }

    function initSiteModeSelector() {
        var saveBtn = document.getElementById('owner-site-mode-save');
        var sel = document.getElementById('owner-site-mode');
        if (sel) {
            sel.addEventListener('change', function() { setSiteModeStatus('Unsaved changes. Click Apply.'); });
        }
        if (saveBtn) saveBtn.addEventListener('click', saveSiteMode);
    }

    var currentSiteSelectorContent = '';
    function setSiteSelectorStatus(message, isError) {
        var el = document.getElementById('site-selector-status');
        if (!el) return;
        el.textContent = message || '';
        el.style.color = isError ? '#dc2626' : '';
    }

    function setSiteSelectorSource(source) {
        var el = document.getElementById('site-selector-source');
        if (el) el.textContent = source === 'kv' ? 'Owner saved override (KV)' : (source === 'default' ? 'Built-in default' : 'Original assets file');
    }

    async function loadSiteSelectorEditor() {
        var ta = document.getElementById('site-selector-editor-textarea');
        var liveMode = document.getElementById('site-selector-live-mode');
        if (!ta) return;
        setSiteSelectorStatus('Loading site_selector.js...');
        try {
            var res = await fetch(getApiUrl('/api/owner/site-selector'), {
                method: 'GET',
                headers: { 'Authorization': 'Basic ' + getAuthToken() }
            });
            var data = await res.json().catch(function() { return {}; });
            if (!res.ok || !data.success) throw new Error(data.error || 'Unable to load site_selector.js');
            currentSiteSelectorContent = typeof data.content === 'string' ? data.content : '';
            ta.value = currentSiteSelectorContent;
            setSiteSelectorSource(data.source || 'assets');
            if (liveMode) liveMode.textContent = String(data.activeInFile || 'multipleproducts');
            setSiteSelectorStatus('');
        } catch (error) {
            setSiteSelectorStatus(error.message || 'Unable to load site_selector.js', true);
        }
    }

    async function saveSiteSelectorEditor() {
        var ta = document.getElementById('site-selector-editor-textarea');
        var liveMode = document.getElementById('site-selector-live-mode');
        if (!ta) return;
        setSiteSelectorStatus('Saving...');
        try {
            var res = await fetch(getApiUrl('/api/owner/site-selector'), {
                method: 'PUT',
                headers: {
                    'Authorization': 'Basic ' + getAuthToken(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: ta.value })
            });
            var data = await res.json().catch(function() { return {}; });
            if (!res.ok || !data.success) throw new Error(data.error || 'Unable to save site_selector.js');
            currentSiteSelectorContent = ta.value;
            setSiteSelectorSource('kv');
            if (liveMode) liveMode.textContent = String(data.activeInFile || 'multipleproducts');
            // Sync the header Store Mode + products/settings mode state to the newly saved value
            var chosen = String(data.activeInFile || '').toLowerCase();
            if (chosen && (chosen === 'singleproduct' || chosen === 'multipleproducts' || chosen === 'affiliate')) {
                setSiteModeSelectValue(chosen);
                activeProductsMode = chosen;
                configMode = chosen;
                var pm = document.getElementById('owner-products-mode');
                if (pm) pm.value = chosen;
                document.querySelectorAll('[data-config-mode]').forEach(function(tab) {
                    tab.classList.toggle('active', tab.dataset.configMode === chosen);
                });
                setConfigModeBanner(chosen);
                try {
                    var stats = await fetchStats(getAuthToken());
                    renderStats(stats);
                } catch (e) {}
            }
            setSiteSelectorStatus('Saved. Customers and server-side redirects will use this on the next page load.');
        } catch (error) {
            setSiteSelectorStatus(error.message || 'Unable to save site_selector.js', true);
        }
    }

    function applySiteSelectorPreset(mode) {
        var ta = document.getElementById('site-selector-editor-textarea');
        if (!ta) return;
        var label = mode === 'multipleproducts' ? 'Multiple Products' : (mode === 'singleproduct' ? 'Single Product' : 'Affiliate');
        var value = mode;
        var commentS = mode === 'singleproduct' ? '' : '//';
        var commentM = mode === 'multipleproducts' ? '' : '//';
        var commentA = mode === 'affiliate' ? '' : '//';
        var content = [
            '/*',
            '=========================================================',
            '                WEBSITE MODE SELECTOR',
            '=========================================================',
            '',
            'HOW TO USE:',
            '1) Choose ONE mode below',
            '2) Uncomment exactly ONE of the three lines (remove the leading //).',
            '3) Keep the other two lines commented with //',
            '4) Click SAVE — the Worker serves this to customers immediately.',
            '',
            'Modes:',
            '- "singleproduct"    → One focused landing page, inline checkout',
            '- "multipleproducts" → Store with multiple products + cart + checkout',
            '- "affiliate"        → Showcase multiple products but link out externally',
            '=========================================================',
            '',
            'Current applied preset: ' + label,
            '=========================================================',
            '*/',
            '',
            commentS + 'const WEBSITE_TYPE_SELECT = "singleproduct";',
            commentM + 'const WEBSITE_TYPE_SELECT = "multipleproducts";',
            commentA + 'const WEBSITE_TYPE_SELECT = "affiliate";',
            ''
        ].join('\n');
        ta.value = content;
        currentSiteSelectorContent = content;
        setSiteSelectorStatus('Preset applied: ' + label + '. Click Save to apply to storefront.');
    }

    function initSiteSelectorEditor() {
        var reload = document.getElementById('site-selector-reload-btn');
        var saveBtn = document.getElementById('site-selector-save-btn');
        var ta = document.getElementById('site-selector-editor-textarea');
        if (reload) reload.addEventListener('click', loadSiteSelectorEditor);
        if (saveBtn) saveBtn.addEventListener('click', saveSiteSelectorEditor);
        if (ta) ta.addEventListener('change', function() {
            setSiteSelectorStatus('Unsaved changes. Click Save to apply.');
        });
        document.querySelectorAll('[data-site-selector-preset]').forEach(function(btn) {
            btn.addEventListener('click', function() { applySiteSelectorPreset(btn.dataset.siteSelectorPreset); });
        });
        var modeDropdown = document.getElementById('site-selector-mode-dropdown');
        var modeApplyBtn = document.getElementById('site-selector-apply-mode');
        function syncModeDropdown() {
            if (!modeDropdown) return;
            var sel = document.getElementById('owner-site-mode');
            if (sel && sel.value) modeDropdown.value = sel.value;
        }
        syncModeDropdown();
        setInterval(syncModeDropdown, 1200);
        if (modeApplyBtn) {
            modeApplyBtn.addEventListener('click', async function() {
                if (!modeDropdown) return;
                var target = String(modeDropdown.value || 'multipleproducts');
                setSiteSelectorStatus('Applying ' + target + '...');
                try {
                    var ok = await applyModeGate(target);
                    if (ok) {
                        setSiteSelectorStatus('Applied ' + target + '. Dashboard filtered immediately.');
                        window.setTimeout(function() { setSiteSelectorStatus(''); }, 2800);
                    }
                } catch (err) {
                        setSiteSelectorStatus(err && err.message ? err.message : 'Failed to apply mode');
                    }
            });
        }
    }

    async function saveConfigRaw(values) {
        var payload = Object.assign({}, values);
        if (activeProductsMode === 'singleproduct' && !payload.WEBSITE_TYPE_SELECT) payload.WEBSITE_TYPE_SELECT = 'singleproduct';
        var response = await fetch(getApiUrl('/api/owner/config'), {
            method: 'PUT',
            headers: { 'Authorization': 'Basic ' + getAuthToken(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: activeProductsMode, config: payload })
        });
        var data = await response.json().catch(function() { return {}; });
        if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save settings');
        configValues = payload;
        activeProductsConfig = payload;
        return payload;
    }

    function collectImagesFromView() {
        var imgs = [];
        document.querySelectorAll('[data-product-image-url]').forEach(function(node) {
            var url = String(node.dataset.productImageUrl || '').trim();
            if (url) imgs.push(url);
        });
        return imgs;
    }

    function collectSpecsFromView() {
        var rows = [];
        var tbody = document.getElementById('editor-specs-body');
        if (!tbody) return rows;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            var labelInput = tr.querySelector('[data-spec-label]');
            var valueInput = tr.querySelector('[data-spec-value]');
            rows.push({
                label: labelInput ? String(labelInput.value || '').trim() : '',
                value: valueInput ? String(valueInput.value || '').trim() : ''
            });
        });
        return rows.filter(function(r) { return r.label || r.value; });
    }

    function collectPackagesFromView() {
        var rows = [];
        var tbody = document.getElementById('editor-packages-body');
        if (!tbody) return rows;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            var idInput = tr.querySelector('[data-pkg-id]');
            var titleInput = tr.querySelector('[data-pkg-title]');
            var priceInput = tr.querySelector('[data-pkg-price]');
            rows.push({
                id: idInput ? String(idInput.value || '').trim() : '',
                title: titleInput ? String(titleInput.value || '').trim() : '',
                price: priceInput ? (priceInput.value === '' ? 0 : Number(priceInput.value)) : 0
            });
        });
        return rows.filter(function(r) { return r.title || r.id || r.price; });
    }

    async function deleteR2Keys(keys) {
        if (!keys || !keys.length) return { deleted: [], failed: [] };
        var res = await fetch(getApiUrl('/api/owner/upload'), {
            method: 'DELETE',
            headers: { 'Authorization': 'Basic ' + getAuthToken(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ keys: keys })
        });
        var data = await res.json().catch(function() { return {}; });
        if (!res.ok || !data.success) {
            throw new Error(data.error || ('R2 delete failed (HTTP ' + res.status + ')'));
        }
        return data;
    }

    function openProductEditor(product, index) {
        var productsView = document.getElementById('owner-products-view');
        var editorView = document.getElementById('owner-product-editor-view');
        if (!editorView) return;

        var isSingle = activeProductsMode === 'singleproduct';
        var isAffiliate = activeProductsMode === 'affiliate';
        var modeLabel = isAffiliate ? 'Affiliate template' : (isSingle ? 'Single-product template' : 'Multi-product template');
        var coverImage = product.images && product.images.length ? product.images[0] : (product.image || '');
        editorDraft = {
            isSingle: isSingle,
            isAffiliate: isAffiliate,
            index: index,
            sourceId: product.id,
            removedImages: new Set()
        };

        var html = '';
        html += '<div class="owner-editor-header">';
        html += '<div><h2>' + (isSingle ? 'Edit product details' : ('Edit ' + String(product.title || product.id))) + '</h2>';
        html += '<div class="owner-editor-subheader">' + modeLabel + (isAffiliate ? '' : (' · index ' + index)) + '</div></div>';
        html += '<div style="display:flex;gap:10px;flex-wrap:wrap;">';
        html += '<button type="button" class="btn btn-secondary" id="editor-cancel">Back to products</button>';
        html += '</div></div>';

        // Section 1: Info
        html += '<div class="owner-editor-section">';
        html += '<h3>1. Product info</h3>';
        html += '<p class="hint">Basic product details. IDs are used in URLs and should be short, lowercase with hyphens.</p>';
        html += '<div class="owner-editor-grid">';
        html += fieldHtml('editor-field-id', 'ID (slug)', String(product.id || ''), 'text', isSingle);
        html += fieldHtml('editor-field-title', 'Title', String(product.title || ''));
        html += fieldHtml('editor-field-shortTitle', 'Short title', String(product.shortTitle || ''));
        if (isAffiliate) {
            html += fieldHtml('editor-field-price', 'Price', String(product.price || 0), 'number');
            html += fieldHtml('editor-field-affiliateUrl', 'Affiliate URL (customers are sent here)', String(product.affiliateUrl || ''));
            html += fieldHtml('editor-field-buttonText', 'Button text (e.g. Buy on Vendor)', String(product.buttonText || 'Buy on Vendor'));
        } else {
            html += fieldHtml('editor-field-productType', 'Product type', String(product.productType || 'physical'), 'text', false, '<datalist id="editor-product-types"><option value="physical"></option><option value="digital"></option></datalist>', 'list="editor-product-types"');
            html += fieldHtml('editor-field-shippingFee', 'Shipping fee (flat amount)', String(product.shippingFee || 0), 'number');
        }
        html += '</div>';
        html += textareaHtml('editor-field-description', 'Short description (card summary)', String(product.description || ''));
        html += textareaHtml('editor-field-longDescription', 'Long description (product page body)', String(product.longDescription || ''));
        html += '</div>';

        // Section 2: Images gallery
        html += '<div class="owner-editor-section">';
        html += '<h3>2. Images gallery</h3>';
        html += '<p class="hint">First image in the grid is the cover (highlighted). Removed images are purged from R2 when you Save.</p>';
        html += '<div id="editor-images-gallery" class="owner-image-gallery"></div>';
        html += '<div id="editor-images-empty" class="owner-gallery-empty owner-hidden">No images yet. Upload product images below.</div>';
        html += '<div class="owner-gallery-toolbar">';
        html += '<button type="button" class="btn btn-secondary" id="editor-upload-images">Upload images</button>';
        html += '<input type="file" id="editor-images-file-input" accept="image/*" multiple style="display:none;">';
        html += '<span class="owner-save-status" id="editor-images-status" role="status"></span>';
        html += '</div>';
        html += '</div>';

        // Section 3: Specs
        html += '<div class="owner-editor-section">';
        html += '<h3>3. Specifications</h3>';
        html += '<p class="hint">Label-value pairs that appear under the product description or specs tab.</p>';
        html += '<table class="owner-editor-table"><thead><tr><th style="width:28%;">Label</th><th>Value</th><th style="width:100px;"></th></tr></thead>';
        html += '<tbody id="editor-specs-body"></tbody></table>';
        html += '<div class="owner-editor-table-actions"><button type="button" class="btn btn-secondary" id="editor-add-spec">+ Add specification</button></div>';
        html += '</div>';

        if (!isAffiliate) {
            // Section 4: Packages
            html += '<div class="owner-editor-section">';
            html += '<h3>4. Packages &amp; pricing</h3>';
            html += '<p class="hint">Each package is a purchasable variant: id, title, and price. Leave price at 0 for free items.</p>';
            html += '<table class="owner-editor-table"><thead><tr><th style="width:24%;">Package ID</th><th>Title</th><th style="width:22%;">Price</th><th style="width:100px;"></th></tr></thead>';
            html += '<tbody id="editor-packages-body"></tbody></table>';
            html += '<div class="owner-editor-table-actions"><button type="button" class="btn btn-secondary" id="editor-add-package">+ Add package</button></div>';
            html += '</div>';
        }

        html += '<div class="owner-editor-footer">';
        html += '<span class="owner-save-status" id="editor-save-status" role="status"></span>';
        html += '<button type="button" class="btn btn-secondary" id="editor-cancel-bottom">Discard changes</button>';
        html += '<button type="button" class="btn btn-primary" id="editor-save">Save product</button>';
        html += '</div>';

        editorView.innerHTML = html;
        productsView.classList.add('owner-hidden');
        editorView.classList.remove('owner-hidden');

        // Render images gallery
        renderImagesInEditor(product.images.slice(), coverImage);

        // Render specs
        (product.specs || []).forEach(function(spec) { addSpecRow(spec.label, spec.value); });
        if (!(product.specs || []).length) addSpecRow('', '');

        // Render packages (single/multi only)
        if (!isAffiliate) {
            (product.packages || []).forEach(function(pkg) { addPackageRow(pkg.id, pkg.title, pkg.price); });
            if (!(product.packages || []).length) addPackageRow('', '', 0);
        }

        // Bindings
        document.getElementById('editor-cancel').addEventListener('click', closeProductEditor);
        document.getElementById('editor-cancel-bottom').addEventListener('click', closeProductEditor);
        document.getElementById('editor-save').addEventListener('click', saveProductEditor);

        document.getElementById('editor-add-spec').addEventListener('click', function() { addSpecRow('', ''); });
        var addPkgBtn = document.getElementById('editor-add-package');
        if (addPkgBtn) addPkgBtn.addEventListener('click', function() { addPackageRow('', '', 0); });

        var fileInput = document.getElementById('editor-images-file-input');
        document.getElementById('editor-upload-images').addEventListener('click', function() { fileInput.click(); });
        if (fileInput) fileInput.addEventListener('change', handleEditorImageFilesSelected);
    }

    function closeProductEditor() {
        editorDraft = null;
        renderProductsList();
    }

    function fieldHtml(id, label, value, type, disabled, extraHtml, extraAttrs) {
        type = type || 'text';
        var input = '<input type="' + type + '" id="' + id + '" value="' + String(value || '').replace(/"/g, '&quot;') + '"' + (disabled ? ' disabled' : '') + ' ' + (extraAttrs || '') + '>';
        return '<div class="owner-field"><span>' + String(label) + '</span>' + input + '</div>' + (extraHtml || '');
    }

    function textareaHtml(id, label, value) {
        return '<div class="owner-field" style="margin-top:10px;"><span>' + String(label) + '</span><textarea rows="3" id="' + id + '">' + String(value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea></div>';
    }

    function setEditorImagesStatus(message, isError) {
        var el = document.getElementById('editor-images-status');
        if (!el) return;
        el.textContent = message || '';
        el.style.color = isError ? '#dc2626' : '#16a34a';
    }

    function renderImagesInEditor(urls, cover) {
        var gallery = document.getElementById('editor-images-gallery');
        var empty = document.getElementById('editor-images-empty');
        if (!gallery) return;
        gallery.innerHTML = '';
        var items = urls && urls.length ? urls.slice() : [];
        if (!items.length) {
            if (empty) empty.classList.remove('owner-hidden');
            return;
        }
        if (empty) empty.classList.add('owner-hidden');
        var currentCover = cover || items[0] || '';
        items.forEach(function(url, i) {
            var tile = document.createElement('div');
            tile.className = 'owner-image-tile' + (String(url) === String(currentCover) ? ' is-cover' : '');
            tile.dataset.productImageUrl = String(url);

            var img = document.createElement('img');
            img.alt = 'Product image ' + (i + 1);
            img.referrerPolicy = 'no-referrer';
            img.loading = 'lazy';
            img.src = resolveAssetSrc(url);
            img.onerror = function() { this.style.opacity = '0.22'; this.style.background = '#fee2e2'; };

            var actions = document.createElement('div');
            actions.className = 'owner-image-tile-actions';

            var top = document.createElement('div');
            top.className = 'owner-image-tile-actions-row';
            var coverBtn = document.createElement('button');
            coverBtn.type = 'button';
            coverBtn.className = 'owner-image-tile-btn primary';
            coverBtn.textContent = String(url) === String(currentCover) ? '✓ Cover' : 'Make cover';
            coverBtn.addEventListener('click', function() {
                var imgs = collectImagesFromView();
                renderImagesInEditor(imgs, url);
            });
            top.appendChild(coverBtn);

            var bottom = document.createElement('div');
            bottom.className = 'owner-image-tile-actions-row bottom';
            var orderLabel = document.createElement('span');
            orderLabel.className = 'owner-image-tile-index';
            orderLabel.textContent = (i + 1) + ' / ' + items.length;
            var removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'owner-image-tile-btn danger';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', function() {
                if (!window.confirm('Remove this image? It will be deleted from storage when you Save.')) return;
                if (editorDraft) editorDraft.removedImages.add(String(url));
                var imgs = collectImagesFromView().filter(function(u) { return String(u) !== String(url); });
                var newCover = String(currentCover) === String(url) ? (imgs[0] || '') : currentCover;
                renderImagesInEditor(imgs, newCover);
            });
            bottom.appendChild(orderLabel);
            bottom.appendChild(removeBtn);

            actions.appendChild(top);
            actions.appendChild(bottom);
            tile.appendChild(img);
            tile.appendChild(actions);
            gallery.appendChild(tile);
        });
    }

    async function handleEditorImageFilesSelected(evt) {
        var files = evt.target.files;
        if (!files || !files.length) return;
        setEditorImagesStatus('Uploading 0/' + files.length + '...');
        var urls = collectImagesFromView();
        var errors = [];
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            try {
                setEditorImagesStatus('Uploading ' + (i + 1) + '/' + files.length + ': ' + file.name);
                var result = await uploadImageFile(file, (editorDraft && editorDraft.isSingle ? 'PRODUCT_IMAGES' : 'PRODUCTS[' + editorDraft.index + '].images'));
                if (result && result.url) urls.push(String(result.url));
                var currentCover = (urls.find(function(u) { return document.querySelector('.owner-image-tile.is-cover[data-product-image-url="' + String(u).replace(/"/g, '\\"') + '"]'); }) ? '' : urls[0]);
                renderImagesInEditor(urls, currentCover);
            } catch (error) {
                errors.push(file.name + ': ' + (error.message || 'Upload failed'));
            }
        }
        if (errors.length) setEditorImagesStatus('Uploaded with issues: ' + errors.join('; '), true);
        else setEditorImagesStatus('All images uploaded. Don\'t forget to Save.');
        evt.target.value = '';
    }

    function addSpecRow(label, value) {
        var tbody = document.getElementById('editor-specs-body');
        if (!tbody) return;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td><input data-spec-label type="text" value="' + String(label || '').replace(/"/g, '&quot;') + '" placeholder="e.g. Capacity"></td>' +
            '<td><input data-spec-value type="text" value="' + String(value || '').replace(/"/g, '&quot;') + '" placeholder="e.g. 20,000 mAh"></td>' +
            '<td style="text-align:right;"><button type="button" class="owner-inline-btn" data-remove-row>Remove</button></td>';
        tr.querySelector('[data-remove-row]').addEventListener('click', function() {
            if (tbody.children.length > 1) tr.remove();
            else {
                tr.querySelector('[data-spec-label]').value = '';
                tr.querySelector('[data-spec-value]').value = '';
            }
        });
        tbody.appendChild(tr);
    }

    function addPackageRow(id, title, price) {
        var tbody = document.getElementById('editor-packages-body');
        if (!tbody) return;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td><input data-pkg-id type="text" value="' + String(id || '').replace(/"/g, '&quot;') + '" placeholder="e.g. single"></td>' +
            '<td><input data-pkg-title type="text" value="' + String(title || '').replace(/"/g, '&quot;') + '" placeholder="e.g. Single Unit"></td>' +
            '<td><input data-pkg-price type="number" step="any" value="' + String(price == null ? '' : price) + '" placeholder="0"></td>' +
            '<td style="text-align:right;"><button type="button" class="owner-inline-btn" data-remove-row>Remove</button></td>';
        tr.querySelector('[data-remove-row]').addEventListener('click', function() {
            if (tbody.children.length > 1) tr.remove();
            else {
                tr.querySelector('[data-pkg-id]').value = '';
                tr.querySelector('[data-pkg-title]').value = '';
                tr.querySelector('[data-pkg-price]').value = '';
            }
        });
        tbody.appendChild(tr);
    }

    function setEditorSaveStatus(message, isError) {
        var el = document.getElementById('editor-save-status');
        if (!el) return;
        el.textContent = message || '';
        el.style.color = isError ? '#dc2626' : '#16a34a';
    }

    async function saveProductEditor() {
        if (!editorDraft) return;
        setEditorSaveStatus('Saving...');

        try {
            var newId = val('editor-field-id');
            var title = val('editor-field-title');
            if (!String(title || '').trim()) throw new Error('Product title is required.');
            if (!String(newId || '').trim()) throw new Error('Product ID is required.');
            var shortTitle = val('editor-field-shortTitle');
            var description = val('editor-field-description');
            var longDescription = val('editor-field-longDescription');

            var images = collectImagesFromView();
            var coverTile = document.querySelector('.owner-image-tile.is-cover');
            var image = coverTile ? String(coverTile.dataset.productImageUrl || '') : (images[0] || '');
            if (!image && images[0]) image = images[0];

            var specs = collectSpecsFromView();
            var packages = editorDraft.isAffiliate ? [] : collectPackagesFromView();

            var productType = editorDraft.isAffiliate ? 'affiliate' : (val('editor-field-productType') || 'physical');
            var shippingFee = editorDraft.isAffiliate ? 0 : val('editor-field-shippingFee');
            shippingFee = shippingFee === '' ? 0 : Number(shippingFee);
            var price = editorDraft.isAffiliate ? Number(val('editor-field-price') || 0) : 0;
            var affiliateUrl = editorDraft.isAffiliate ? String(val('editor-field-affiliateUrl') || '') : '';
            var buttonText = editorDraft.isAffiliate ? String(val('editor-field-buttonText') || 'Buy on Vendor') : '';

            // 1. Purge removed R2 images
            var removed = Array.from(editorDraft.removedImages || []).filter(Boolean);
            if (removed.length) {
                try {
                    await deleteR2Keys(removed);
                } catch (error) {
                    console.warn('Non-fatal R2 delete fail:', error);
                }
            }

            // 2. Sync config (do NOT merge Settings form inputs here)
            if (editorDraft.isSingle) {
                configValues.PRODUCT = Object.assign({}, (configValues.PRODUCT || {}), {
                    name: title,
                    title: title,
                    shortName: shortTitle,
                    headline: description,
                    description: longDescription,
                    productType: productType,
                    shippingFee: shippingFee,
                    coverImage: image,
                    image: image
                });
                configValues.PRODUCT_IMAGES = images.map(function(u) { return { enabled: true, file: u }; });
                configValues.SPECIFICATIONS = specs.slice();
                var existingPackages = Array.isArray(configValues.PACKAGES) ? configValues.PACKAGES : [];
                configValues.PACKAGES = packages.map(function(pkg) {
                    var existing = existingPackages.find(function(p) { return p && String(p.id) === String(pkg.id); });
                    return Object.assign({}, (existing || {}), {
                        id: pkg.id,
                        title: pkg.title,
                        price: pkg.price,
                        quantity: (existing && existing.quantity != null) ? existing.quantity : 1
                    });
                });
            } else if (editorDraft.isAffiliate) {
                if (!Array.isArray(configValues.AFFILIATE_PRODUCTS)) configValues.AFFILIATE_PRODUCTS = [];
                var updatedAffiliate = {
                    id: newId,
                    title: title,
                    description: description,
                    longDescription: longDescription,
                    price: price,
                    image: image,
                    images: images.slice(),
                    specs: specs.slice(),
                    affiliateUrl: affiliateUrl,
                    buttonText: buttonText
                };
                if (editorDraft.index >= 0 && editorDraft.index < configValues.AFFILIATE_PRODUCTS.length) {
                    configValues.AFFILIATE_PRODUCTS[editorDraft.index] = updatedAffiliate;
                } else {
                    // Newest affiliate products show first
                    configValues.AFFILIATE_PRODUCTS.unshift(updatedAffiliate);
                }
            } else {
                if (!Array.isArray(configValues.PRODUCTS)) configValues.PRODUCTS = [];
                var updated = {
                    id: newId,
                    title: title,
                    shortTitle: shortTitle,
                    description: description,
                    longDescription: longDescription,
                    productType: productType,
                    shippingFee: shippingFee,
                    image: image,
                    images: images.slice(),
                    specs: specs.slice(),
                    packages: packages.map(function(pkg) { return { id: pkg.id, title: pkg.title, price: pkg.price }; })
                };
                if (editorDraft.index >= 0 && editorDraft.index < configValues.PRODUCTS.length) {
                    configValues.PRODUCTS[editorDraft.index] = updated;
                } else {
                    // Newest products show first
                    configValues.PRODUCTS.unshift(updated);
                }
            }

            // 3. PUT save
            await saveConfigRaw(configValues);

            editorDraft.removedImages = new Set();
            setEditorSaveStatus('Saved successfully. Refresh the storefront to see changes.');
            setTimeout(function() { closeProductEditor(); }, 900);
        } catch (error) {
            setEditorSaveStatus(error.message || 'Save failed.', true);
        }
    }

    function val(id) {
        var el = document.getElementById(id);
        if (!el) return '';
        return el.type === 'checkbox' ? el.checked : (el.value == null ? '' : el.value);
    }

    function initProductsManagement() {
        var modeSelect = document.getElementById('owner-products-mode');
        var addBtn = document.getElementById('owner-add-product-btn');
        if (modeSelect) modeSelect.addEventListener('change', async function() {
            var target = String(modeSelect.value || 'multipleproducts');
            // Mirror to header Store Mode, then persist (reuses applyModeGate)
            var header = document.getElementById('owner-site-mode');
            if (header) header.value = target;
            setProductsStatus('Applying ' + target + '...');
            var ok = await applyModeGate(target);
            setProductsStatus(ok ? (target + ' applied.') : 'Unable to apply ' + target, !ok);
        });
        if (addBtn) addBtn.addEventListener('click', function() {
            if (activeProductsMode === 'singleproduct') return;
            var isAffiliate = activeProductsMode === 'affiliate';
            var slug = slugIdFromTitle('New Product');
            var blank;
            if (isAffiliate) {
                blank = {
                    __kind: 'affiliate',
                    __index: (Array.isArray(activeProductsConfig.AFFILIATE_PRODUCTS) ? activeProductsConfig.AFFILIATE_PRODUCTS.length : 0),
                    id: slug,
                    title: 'New Product',
                    shortTitle: '',
                    description: '',
                    longDescription: '',
                    productType: 'affiliate',
                    shippingFee: 0,
                    image: '',
                    images: [],
                    specs: [{ label: '', value: '' }],
                    packages: [],
                    price: 0,
                    affiliateUrl: '',
                    buttonText: 'Buy on Vendor'
                };
                if (!Array.isArray(configValues.AFFILIATE_PRODUCTS)) configValues.AFFILIATE_PRODUCTS = [];
                configValues.AFFILIATE_PRODUCTS.unshift({
                    id: blank.id,
                    title: blank.title,
                    description: blank.description,
                    longDescription: blank.longDescription,
                    price: 0,
                    image: '',
                    images: [],
                    specs: [{ label: '', value: '' }],
                    affiliateUrl: '',
                    buttonText: 'Buy on Vendor'
                });
            } else {
                blank = {
                    __kind: 'multi',
                    __index: (Array.isArray(activeProductsConfig.PRODUCTS) ? activeProductsConfig.PRODUCTS.length : 0),
                    id: slug,
                    title: 'New Product',
                    shortTitle: '',
                    description: '',
                    longDescription: '',
                    productType: 'physical',
                    shippingFee: 0,
                    image: '',
                    images: [],
                    specs: [{ label: '', value: '' }],
                    packages: [{ id: 'standard', title: 'Standard', price: 0 }]
                };
                if (!Array.isArray(configValues.PRODUCTS)) configValues.PRODUCTS = [];
                configValues.PRODUCTS.unshift({
                    id: blank.id,
                    title: blank.title,
                    shortTitle: blank.shortTitle,
                    description: blank.description,
                    longDescription: blank.longDescription,
                    productType: blank.productType,
                    shippingFee: blank.shippingFee,
                    image: blank.image,
                    images: [],
                    specs: [{ label: '', value: '' }],
                    packages: [{ id: 'standard', title: 'Standard', price: 0 }]
                });
            }
            activeProductsConfig = configValues;
            openProductEditor(blank, 0);
        });
    }

    var configSectionOrder = [
        'BUSINESS', 'BRAND', 'COMPANY', 'CONTACT', 'STORE_CONTENT',
        'PRODUCT', 'PRODUCT_TYPE', 'PRODUCT_IMAGES', 'PRODUCT_VIDEOS', 'PRODUCTS', 'AFFILIATE_PRODUCTS',
        'SPECIFICATIONS', 'PACKAGES', 'FEATURES', 'ABOUT_PRODUCT', 'HERO_TRUST', 'WHY_CHOOSE', 'DELIVERY', 'GUARANTEE', 'TESTIMONIALS', 'FAQ',
        'WHATSAPP_NUMBERS', 'SOCIAL_LINKS', 'PAYMENT', 'MANUAL_PAYMENT',
        'LOGO', 'NAVIGATION', 'FOOTER_LINKS', 'SEO', 'ANALYTICS', 'SALES_POPUP', 'PROMOTION',
        'SOCIAL_PROOF_GALLERY', 'TRUST_BADGES', 'STICKY_CTA', 'WEBSITE_TYPE_SELECT', 'API_BASE_URL'
    ];

    function configSectionOrderIndex(key) {
        var i = configSectionOrder.indexOf(key);
        return i < 0 ? (configSectionOrder.length + 1000) : i;
    }

    var configSectionIcons = {
        BUSINESS: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
        BRAND: '<circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
        COMPANY: '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h2M9 13h2M9 17h2M13 9h2M13 13h2M13 17h2"/>',
        CONTACT: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.28-1.28a2 2 0 0 1 2.11-.45c.9.35 1.84.59 2.8.72A2 2 0 0 1 22 16.92z"/>',
        STORE_CONTENT: '<path d="M3 9l1-5h16l1 5"/><path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9"/><path d="M3 9H2a2 2 0 0 1 2-3h16a2 2 0 0 1 2 3h-1"/>',
        PRODUCT: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
        PRODUCT_TYPE: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
        PRODUCT_IMAGES: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
        PRODUCT_VIDEOS: '<rect x="2" y="4" width="15" height="16" rx="2"/><path d="M22 8l-5 4 5 4z"/>',
        PRODUCTS: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
        AFFILIATE_PRODUCTS: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
        SPECIFICATIONS: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
        PACKAGES: '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
        FEATURES: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        ABOUT_PRODUCT: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
        HERO_TRUST: '<path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6z"/>',
        WHY_CHOOSE: '<polyline points="20 6 9 17 4 12"/>',
        DELIVERY: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
        GUARANTEE: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
        TESTIMONIALS: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
        FAQ: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        WHATSAPP_NUMBERS: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
        SOCIAL_LINKS: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
        PAYMENT: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
        MANUAL_PAYMENT: '<path d="M20 7h-3V5a3 3 0 0 0-6 0v2H8V5a3 3 0 0 0-6 0v10a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V10a3 3 0 0 0-3-3z"/><line x1="11" y1="5" x2="11" y2="7"/>',
        LOGO: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
        NAVIGATION: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
        FOOTER_LINKS: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="17" x2="22" y2="17"/>',
        SEO: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        ANALYTICS: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
        SALES_POPUP: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
        PROMOTION: '<polygon points="20.12 10.71 12.56 3.15 6.21 9.5 7.63 10.92 6.21 12.34 12.56 18.69 13.98 17.27 15.4 18.69"/>',
        SOCIAL_PROOF_GALLERY: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
        TRUST_BADGES: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        STICKY_CTA: '<path d="M5 3h14v14l-5-3H7a2 2 0 0 1-2-2V3z"/><line x1="8" y1="9" x2="16" y2="9"/>',
        WEBSITE_TYPE_SELECT: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
        API_BASE_URL: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
    };

    var configSectionDescriptions = {
        BUSINESS: 'Business name, address, support contacts, currency and tax defaults.',
        BRAND: 'Brand colors, fonts and the visual identity applied to the storefront.',
        COMPANY: 'Company registration details that appear in legal footer sections.',
        CONTACT: 'Contact form destinations, phone numbers, email & office address.',
        STORE_CONTENT: 'Copywriting blocks shown on the storefront pages: hero, descriptions, CTAs.',
        PRODUCT: 'Single-product template: product name, description, summary details.',
        PRODUCT_TYPE: 'Single-product template: physical vs digital. Changes behavior of delivery section and success page.',
        PRODUCT_IMAGES: 'Single-product template: product image gallery.',
        PRODUCT_VIDEOS: 'Single-product template: product videos embedded in gallery.',
        PRODUCTS: 'Multiple-products template: catalog products with images, specs and packages. Use the Products tab for easier editing.',
        AFFILIATE_PRODUCTS: 'Affiliate template: products with external buy links and no checkout.',
        SPECIFICATIONS: 'Single-product template: structured specs table on the storefront.',
        PACKAGES: 'Single-product template: pricing packages that appear on the product page and checkout.',
        FEATURES: 'Feature bulleted list shown under the product description.',
        ABOUT_PRODUCT: 'Long-form marketing copy about the product.',
        HERO_TRUST: 'Icon badges and partner logos shown in the hero area.',
        WHY_CHOOSE_US: 'Key value prop boxes shown above the CTA.',
        WHY_CHOOSE: 'Key value prop boxes shown above the CTA.',
        DELIVERY: 'Delivery lead times, shipping scope and fulfillment copy.',
        GUARANTEE: 'Money-back guarantee terms, warranties and trust copy.',
        TESTIMONIALS: 'Customer testimonials appearing on the storefront.',
        FAQ: 'Frequently asked questions section.',
        WHATSAPP_NUMBERS: 'Floating WhatsApp widget destinations and sales rep numbers.',
        SOCIAL_LINKS: 'Footer social media icons and links.',
        PAYMENT: 'Paystack & Flutterwave credentials, inline checkout toggle, currencies.',
        MANUAL_PAYMENT: 'Bank account details, instructions and deadlines for manual transfer orders.',
        LOGO: 'Header logo, favicon, footer logo variants.',
        NAVIGATION: 'Header navigation menu entries and links.',
        FOOTER_LINKS: 'Footer columns, bottom navigation and legal links.',
        SEO: 'Meta tags, OG image, canonical URL and social sharing settings.',
        ANALYTICS: 'Google Analytics / Tag Manager IDs, tracking pixels.',
        SALES_POPUP: 'Recent-purchases social-proof popup widget settings.',
        PROMOTION: 'Top-bar promotion banner, discount codes announcement.',
        SOCIAL_PROOF_GALLERY: 'Customer photos gallery shown in social proof sections.',
        TRUST_BADGES: 'Payment badges, security seals and partner logos.',
        STICKY_CTA: 'Sticky mobile bottom bar button behavior & copy.',
        WEBSITE_TYPE_SELECT: 'Force a specific template mode directly in the config.',
        API_BASE_URL: 'Override URL for Worker API calls. Leave blank in most cases.'
    };

    function setSectionStatus(key, message, isError) {
        var el = document.getElementById('owner-config-section-status-' + key);
        if (!el) return;
        el.textContent = message || '';
        el.classList.remove('is-ok', 'is-error');
        if (message && isError) el.classList.add('is-error');
        else if (message && !isError) el.classList.add('is-ok');
    }

    function renderConfig() {
        var container = document.getElementById('owner-config-sections');
        var sublist = document.getElementById('owner-sidebar-settings-sub');
        if (!container) return;
        container.innerHTML = '';
        if (sublist) sublist.innerHTML = '';

        var keys = Object.keys(configValues || {}).sort(function(a, b) {
            return configSectionOrderIndex(a) - configSectionOrderIndex(b) || String(a).localeCompare(String(b));
        });

        keys.forEach(function(key) {
            var section = document.createElement('section');
            section.className = 'owner-config-section';
            section.id = 'config-section-' + key;
            section.dataset.configSectionKey = key;

            // Header block
            var header = document.createElement('div');
            header.className = 'owner-config-section-header';
            var headerLeft = document.createElement('div');
            var titleWrap = document.createElement('div');
            titleWrap.className = 'owner-config-section-title';
            var iconWrap = document.createElement('div');
            iconWrap.className = 'owner-config-section-title-icon';
            var iconInner = configSectionIcons[key] || '<circle cx="12" cy="12" r="3"/>';
            iconWrap.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + iconInner + '</svg>';
            var titleText = document.createElement('span');
            titleText.textContent = configTitle(key);
            titleWrap.appendChild(iconWrap);
            titleWrap.appendChild(titleText);
            var subtitle = document.createElement('p');
            subtitle.className = 'owner-config-section-subtitle';
            subtitle.textContent = configSectionDescriptions[key] || 'Edit the settings below. Lists can be expanded with Add item.';
            headerLeft.appendChild(titleWrap);
            headerLeft.appendChild(subtitle);
            header.appendChild(headerLeft);

            var body = document.createElement('div');
            body.className = 'owner-config-section-body';
            body.appendChild(renderNode(configValues[key], key, ''));

            // Footer with per-section Save, Reload, status
            var footer = document.createElement('div');
            footer.className = 'owner-config-section-footer';
            var status = document.createElement('div');
            status.id = 'owner-config-section-status-' + key;
            status.className = 'owner-config-section-status';
            status.textContent = '';

            var saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'btn btn-primary';
            saveBtn.textContent = 'Save ' + configTitle(key);
            saveBtn.setAttribute('aria-label', 'Save ' + configTitle(key));
            saveBtn.dataset.saveSectionKey = key;
            saveBtn.addEventListener('click', function() { saveConfig(key); });

            var reloadBtn = document.createElement('button');
            reloadBtn.type = 'button';
            reloadBtn.className = 'btn btn-secondary';
            reloadBtn.textContent = 'Reload this section';
            reloadBtn.setAttribute('aria-label', 'Reload ' + configTitle(key));
            reloadBtn.dataset.reloadSectionKey = key;
            reloadBtn.addEventListener('click', function() { reloadConfigSection(key); });

            footer.appendChild(saveBtn);
            footer.appendChild(reloadBtn);
            footer.appendChild(status);

            section.appendChild(header);
            section.appendChild(body);
            section.appendChild(footer);
            container.appendChild(section);

            // Add sidebar sub-list entry
            if (sublist) {
                var li = document.createElement('li');
                var link = document.createElement('button');
                link.type = 'button';
                link.className = 'owner-sidebar-link';
                link.dataset.sectionJump = key;
                link.innerHTML = (configSectionIcons[key] ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + configSectionIcons[key] + '</svg> ' : '') + configTitle(key);
                link.addEventListener('click', function() {
                    switchToMainTab('settings');
                    closeSidebarDrawer();
                    scrollToConfigSection(key);
                });
                li.appendChild(link);
                sublist.appendChild(li);
            }
        });

        setupSectionScrollSpy();
    }

    function scrollToConfigSection(key) {
        if (!key) { showAllConfigSections(); return; }
        showSingleConfigSection(key);
    }

    function highlightSidebarSection(key) {
        var sublist = document.getElementById('owner-sidebar-settings-sub');
        if (!sublist) return;
        var links = sublist.querySelectorAll('[data-section-jump]');
        links.forEach(function(link) {
            link.classList.toggle('active', link.dataset.sectionJump === key);
        });
    }

    var scrollSpyRaf = 0;
    function setupSectionScrollSpy() {
        if (scrollSpyRaf) {
            try { window.cancelAnimationFrame(scrollSpyRaf); } catch (_e) {}
            scrollSpyRaf = 0;
        }
        var offsetsCache = [];
        function buildCache() {
            offsetsCache = [];
            var sections = document.querySelectorAll('.owner-config-section[data-config-section-key]');
            sections.forEach(function(el) {
                var key = el.dataset.configSectionKey;
                var rect = el.getBoundingClientRect();
                offsetsCache.push({ key: key, top: rect.top + window.scrollY - 140 });
            });
        }
        buildCache();
        var lastRebuildAt = Date.now();
        function loop() {
            try {
                if (Date.now() - lastRebuildAt > 2500) { buildCache(); lastRebuildAt = Date.now(); }
                var scrollTop = window.scrollY || window.pageYOffset || 0;
                var candidate = offsetsCache[0] ? offsetsCache[0].key : null;
                for (var i = 0; i < offsetsCache.length; i++) {
                    if (offsetsCache[i].top <= scrollTop) candidate = offsetsCache[i].key;
                }
                if (candidate) highlightSidebarSection(candidate);
            } catch (_e) {}
            scrollSpyRaf = 0;
            onNextFrame();
        }
        function onNextFrame() {
            if (scrollSpyRaf) return;
            scrollSpyRaf = window.requestAnimationFrame(loop);
        }
        window.addEventListener('resize', buildCache, { passive: true });
        window.addEventListener('scroll', onNextFrame, { passive: true });
        onNextFrame();
    }

    // ===== Single-section settings view (one section at a time) =====
    var activeConfigSectionKey = null;
    function showAllConfigSections() {
        activeConfigSectionKey = null;
        var host = document.getElementById('owner-config-sections');
        if (host) host.classList.remove('owner-single-section-view');
        var sections = document.querySelectorAll('.owner-config-section');
        sections.forEach(function(s) { s.classList.remove('is-active-section'); });
        var toolbar = document.getElementById('owner-section-toolbar');
        if (toolbar) toolbar.style.display = 'none';
        var nameEl = document.getElementById('owner-section-name');
        if (nameEl) nameEl.textContent = 'All sections';
        var intro = document.querySelector('.owner-settings-intro');
        if (intro) intro.style.display = '';
        highlightSidebarSection('');
        if (typeof window.scrollTo === 'function') {
            var panel = document.getElementById('nav-panel-settings');
            window.scrollTo({ top: panel ? panel.offsetTop - 24 : 0, behavior: 'smooth' });
        }
    }
    function showSingleConfigSection(key) {
        if (!key) { showAllConfigSections(); return; }
        activeConfigSectionKey = key;
        var host = document.getElementById('owner-config-sections');
        if (host) host.classList.add('owner-single-section-view');
        var sections = document.querySelectorAll('.owner-config-section');
        sections.forEach(function(s) {
            s.classList.toggle('is-active-section', s.dataset.configSectionKey === key);
        });
        var toolbar = document.getElementById('owner-section-toolbar');
        if (toolbar) toolbar.style.display = 'flex';
        var nameEl = document.getElementById('owner-section-name');
        if (nameEl) nameEl.textContent = configTitle(key);
        var intro = document.querySelector('.owner-settings-intro');
        if (intro) intro.style.display = 'none';
        highlightSidebarSection(key);
        if (typeof window.scrollTo === 'function') {
            var panel = document.getElementById('nav-panel-settings');
            window.scrollTo({ top: panel ? panel.offsetTop - 24 : 0, behavior: 'smooth' });
        }
    }
    function initSingleSectionToolbar() {
        var backBtn = document.getElementById('owner-section-back-all');
        if (backBtn) backBtn.addEventListener('click', showAllConfigSections);
        var saveActiveBtn = document.getElementById('owner-section-save-active');
        if (saveActiveBtn) saveActiveBtn.addEventListener('click', function() {
            if (activeConfigSectionKey) saveConfig(activeConfigSectionKey);
        });
        var reloadActiveBtn = document.getElementById('owner-section-reload-active');
        if (reloadActiveBtn) reloadActiveBtn.addEventListener('click', function() {
            if (activeConfigSectionKey) reloadConfigSection(activeConfigSectionKey);
        });
    }

    function reloadConfigSection(sectionKey) {
        if (!sectionKey) {
            loadConfig(configMode).then(function() { setConfigModeBanner(configMode); });
            return;
        }
        setSectionStatus(sectionKey, 'Reloading...', false);
        fetchConfig(configMode).then(function(latest) {
            configValues = latest;
            if (configMode === 'singleproduct' && !configValues.WEBSITE_TYPE_SELECT) configValues.WEBSITE_TYPE_SELECT = 'singleproduct';
            renderConfig();
            setSectionStatus(sectionKey, 'Reloaded.', false);
            window.setTimeout(function() { setSectionStatus(sectionKey, '', false); }, 2200);
        }).catch(function(error) {
            setSectionStatus(sectionKey, error && error.message ? error.message : 'Reload failed.', true);
        });
    }

    async function saveConfig(sectionKey) {
        var nextConfig = collectConfig();
        if (configMode === 'singleproduct' && !nextConfig.WEBSITE_TYPE_SELECT) nextConfig.WEBSITE_TYPE_SELECT = 'singleproduct';
        // If sectionKey provided: still send the full config, but only read status back into that section.
        // This keeps behavior identical to existing PUT contract (config payload is always full object).
        if (sectionKey) setSectionStatus(sectionKey, 'Saving...', false);
        else setConfigStatus('Saving settings...');
        try {
            var response = await fetch(getApiUrl('/api/owner/config'), {
                method: 'PUT',
                headers: { 'Authorization': 'Basic ' + getAuthToken(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: configMode, config: nextConfig })
            });
            var data = await response.json().catch(function() { return {}; });
            if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save settings');
            configValues = nextConfig;
            // Refresh so any server-applied defaults round-trip
            try { configValues = await fetchConfig(configMode); } catch (_t) {}
            if (configMode === 'singleproduct' && !configValues.WEBSITE_TYPE_SELECT) configValues.WEBSITE_TYPE_SELECT = 'singleproduct';
            renderConfig();
            if (sectionKey) {
                setSectionStatus(sectionKey, 'Saved. Changes are live now.', false);
                window.setTimeout(function() { setSectionStatus(sectionKey, '', false); }, 3200);
            } else {
                setConfigStatus('Saved successfully. Refresh the storefront to see changes.');
            }
        } catch (error) {
            if (sectionKey) setSectionStatus(sectionKey, error.message || 'Unable to save', true);
            else setConfigStatus(error.message || 'Unable to save settings', true);
        }
    }

    function openSidebarDrawer() {
        var sb = document.getElementById('owner-sidebar');
        var bd = document.getElementById('owner-sidebar-backdrop');
        if (sb) sb.classList.add('is-open');
        if (bd) bd.classList.add('is-open');
    }
    function closeSidebarDrawer() {
        var sb = document.getElementById('owner-sidebar');
        var bd = document.getElementById('owner-sidebar-backdrop');
        if (sb) sb.classList.remove('is-open');
        if (bd) bd.classList.remove('is-open');
    }
    function toggleSidebarDrawer() {
        var sb = document.getElementById('owner-sidebar');
        if (sb && sb.classList.contains('is-open')) closeSidebarDrawer();
        else openSidebarDrawer();
    }

    function setActiveModeLabel(mode) {
        var m = String(mode || '').toLowerCase();
        var label = 'Multiple Products';
        if (m === 'singleproduct') label = 'Single Product';
        else if (m === 'affiliate') label = 'Affiliate';
        var el = document.getElementById('owner-mobile-mode-label');
        if (el) el.textContent = label;
    }

    function switchToMainTab(name) {
        var navTabs = document.querySelectorAll('[data-nav-tab]');
        navTabs.forEach(function(tab) {
            var active = tab.dataset.navTab === name;
            tab.classList.toggle('active', active);
        });
        var panels = document.querySelectorAll('.owner-nav-panel');
        panels.forEach(function(panel) {
            var id = panel.id || '';
            var expects = 'nav-panel-' + name;
            panel.classList.toggle('active', id === expects);
        });
        // Also keep sidebar main nav highlighted
        var mainNavLinks = document.querySelectorAll('[data-main-nav-tab]');
        mainNavLinks.forEach(function(link) {
            link.classList.toggle('active', link.dataset.mainNavTab === name);
        });
        // If user clicked top-level Overview/Products etc. in settings, remove section scroll-highlight
        if (name !== 'settings') {
            var sublinks = document.querySelectorAll('#owner-sidebar-settings-sub [data-section-jump]');
            sublinks.forEach(function(l) { l.classList.remove('active'); });
        }
        if (name === 'settings' && typeof window.scrollTo === 'function' && typeof configMode !== 'undefined') {
            // nothing: let the sub-section jump control scroll
        }
    }

    function initSidebarShell() {
        var openBtn = document.getElementById('owner-mobile-drawer-open');
        var backdrop = document.getElementById('owner-sidebar-backdrop');
        if (openBtn) openBtn.addEventListener('click', toggleSidebarDrawer);
        if (backdrop) backdrop.addEventListener('click', closeSidebarDrawer);

        var scroller = document.getElementById('owner-scroll-top');
        if (scroller) {
            function onScrollVis() {
                var top = window.scrollY || window.pageYOffset || 0;
                scroller.classList.toggle('visible', top > 360);
            }
            window.addEventListener('scroll', onScrollVis, { passive: true });
            scroller.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        }

        // Sidebar main nav jumps → switch top tab + close drawer on mobile
        var mainLinks = document.querySelectorAll('[data-nav-goto]');
        mainLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                var target = link.dataset.navGoto;
                switchToMainTab(target);
                closeSidebarDrawer();
                if (target === 'settings') {
                    showAllConfigSections();
                } else if (typeof window.scrollTo === 'function') {
                    var anchor = document.getElementById('nav-panel-' + target);
                    if (anchor) window.scrollTo({ top: anchor.offsetTop - 24, behavior: 'smooth' });
                }
            });
        });

        // Mirror actions between sidebar footer and main header buttons
        var sidebarMode = document.getElementById('owner-sidebar-site-mode');
        var headerMode = document.getElementById('owner-site-mode');
        function mirrorMode(from, to) { from && to && from.addEventListener('change', function() { try { to.value = from.value; } catch (_e) {} }); }
        mirrorMode(sidebarMode, headerMode);
        mirrorMode(headerMode, sidebarMode);

        var sidebarApply = document.getElementById('owner-sidebar-site-mode-apply');
        var headerApply = document.getElementById('owner-site-mode-save');
        function applyMirror(btnFrom, btnTo) {
            if (!btnFrom || !btnTo) return;
            btnFrom.addEventListener('click', function() { btnTo.click(); });
        }
        applyMirror(sidebarApply, headerApply);

        var sidebarLogout = document.getElementById('owner-sidebar-logout');
        var headerLogout = document.getElementById('owner-logout-btn');
        if (sidebarLogout && headerLogout) sidebarLogout.addEventListener('click', function() { headerLogout.click(); });

        var sidebarRefresh = document.getElementById('owner-sidebar-refresh');
        var headerRefresh = document.getElementById('owner-refresh-btn');
        if (sidebarRefresh && headerRefresh) sidebarRefresh.addEventListener('click', function() { headerRefresh.click(); });

        var sidebarStatus = document.getElementById('owner-sidebar-mode-status');
        var headerStatus = document.getElementById('owner-site-mode-status');
        if (sidebarStatus && headerStatus) {
            var mo = window.MutationObserver ? new MutationObserver(function() {
                sidebarStatus.textContent = headerStatus.textContent;
            }) : null;
            if (mo) mo.observe(headerStatus, { characterData: true, childList: true, subtree: true });
        }
    }

    // After initSiteModeSelector: keep sidebar footer mode selector in sync with value from fetch
    var _origApplyModeGateInit = typeof applyModeGate === 'function' ? applyModeGate : null;

    document.addEventListener('DOMContentLoaded', function() {
        injectBrandVariables();
        initLogin();
        initLookup();
        initActions();
        initSidebarShell();
        initConfig();
        initSiteModeSelector();
        initModeGate();
        initNavTabs();
        initProductsManagement();
        initSiteSelectorEditor();
        initSingleSectionToolbar();
        // After mode-gate apply, reflect active mode in sidebar footer selector and mobile topbar label
        var origApply = window.__applySiteModeOverride;
        function syncModeLabels() {
            try {
                var el = document.getElementById('owner-site-mode');
                var v = el && el.value ? el.value : configMode;
                setActiveModeLabel(v);
                var sbm = document.getElementById('owner-sidebar-site-mode');
                if (sbm && v) sbm.value = v;
                var banner = document.getElementById('owner-config-mode-banner');
                if (banner && v) {
                    var label = v === 'singleproduct' ? 'Single Product' : (v === 'affiliate' ? 'Affiliate' : 'Multiple Products');
                    banner.textContent = 'Editing ' + label + ' template settings';
                    var overviewLabel = document.getElementById('owner-overview-mode-label');
                    if (overviewLabel) overviewLabel.textContent = label;
                }
            } catch (_e) {}
        }
        var oldModeGateApply = document.getElementById('owner-mode-gate-apply');
        if (oldModeGateApply) {
            oldModeGateApply.addEventListener('click', function() { window.setTimeout(syncModeLabels, 250); });
        }
        var modeApplyBtn = document.getElementById('owner-site-mode-save');
        if (modeApplyBtn) modeApplyBtn.addEventListener('click', function() { window.setTimeout(syncModeLabels, 300); });
        // Keep existing setConfigModeBanner working on sidebar header
        var oldBanner = setConfigModeBanner;
        setConfigModeBanner = function(mode) {
            oldBanner(mode);
            syncModeLabels();
        };
        window.setTimeout(syncModeLabels, 80);
        loadDashboard();
    });
})();
