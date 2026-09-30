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
        // Reads stored site mode; if nothing valid stored, default to multipleproducts.
        // Always shows gate first with default pre-selected so owner must Apply before seeing any data.
        var detected = 'multipleproducts';
        try {
            var cfg = await fetchConfig('singleproduct');
            if (cfg && cfg.WEBSITE_TYPE_SELECT) {
                var v = String(cfg.WEBSITE_TYPE_SELECT).toLowerCase();
                if (v === 'singleproduct' || v === 'multipleproducts' || v === 'affiliate') detected = v;
            }
        } catch (e) {
            // ignore, keep default multipleproducts
        }
        activeProductsMode = detected;
        configMode = detected;
        setModeGateCard(detected);
        setModeGateStatus('Default: Multiple Products. Click Apply & continue to manage this store.');
        setDashboardSubviews('gate');
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
        }
    }

    function initNavTabs() {
        document.querySelectorAll('[data-nav-tab]').forEach(function(btn) {
            btn.addEventListener('click', function() { switchNavTab(btn.dataset.navTab); });
        });
        [
            ['nav-goto-orders', 'orders'],
            ['nav-goto-products', 'products'],
            ['nav-goto-settings', 'settings']
        ].forEach(function(pair) {
            var el = document.getElementById(pair[0]);
            if (el) el.addEventListener('click', function() { switchNavTab(pair[1]); });
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
                    packages: Array.isArray(p.packages) ? p.packages.map(function(pkg) { return { id: String((pkg && pkg.id) || ''), title: String((pkg && pkg.title) || ''), price: Number((pkg && pkg.price) || 0) }; }) : []
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

        if (addBtn) addBtn.style.display = (isSingle || isAffiliate) ? 'none' : '';

        if (isAffiliate) {
            productsView.innerHTML = '<div class="owner-products-empty">Affiliate template does not have a product catalog. Open the Settings tab to edit AFFILIATE_PRODUCTS and raw template fields.</div>';
            setProductsStatus('Affiliate template. Use Settings for raw configuration.');
            return;
        }

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
            pid.textContent = 'ID: ' + product.id;
            var meta = document.createElement('div');
            meta.className = 'owner-product-meta';
            meta.textContent = (product.packages.length ? (product.packages.length + ' package' + (product.packages.length > 1 ? 's' : '')) : '0 packages')
                + ' · ' + (product.images.length ? (product.images.length + ' image' + (product.images.length > 1 ? 's' : '')) : '0 images')
                + ' · ' + (product.productType || 'physical');

            body.appendChild(title);
            body.appendChild(pid);
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
        if (Array.isArray(configValues.PRODUCTS)) {
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
        var coverImage = product.images && product.images.length ? product.images[0] : (product.image || '');
        editorDraft = {
            isSingle: isSingle,
            index: index,
            sourceId: product.id,
            removedImages: new Set()
        };

        var html = '';
        html += '<div class="owner-editor-header">';
        html += '<div><h2>' + (isSingle ? 'Edit product details' : ('Edit ' + String(product.title || product.id))) + '</h2>';
        html += '<div class="owner-editor-subheader">' + (isSingle ? 'Single-product template' : ('Multi-product template · index ' + index)) + '</div></div>';
        html += '<div style="display:flex;gap:10px;flex-wrap:wrap;">';
        html += '<button type="button" class="btn btn-secondary" id="editor-cancel">Back to products</button>';
        html += '</div></div>';

        // Section 1: Info
        html += '<div class="owner-editor-section">';
        html += '<h3>1. Product info</h3>';
        html += '<p class="hint">Basic product details. IDs are used in URLs and should be short, lowercase with hyphens.</p>';
        html += '<div class="owner-editor-grid">';
        html += fieldHtml('editor-field-id', 'ID (slug)', isSingle ? String(product.id || 'single-main-product') : String(product.id || ''), 'text', isSingle);
        html += fieldHtml('editor-field-title', 'Title', String(product.title || ''));
        html += fieldHtml('editor-field-shortTitle', 'Short title', String(product.shortTitle || ''));
        html += fieldHtml('editor-field-productType', 'Product type', String(product.productType || 'physical'), 'text', false, '<datalist id="editor-product-types"><option value="physical"></option><option value="digital"></option></datalist>', 'list="editor-product-types"');
        html += fieldHtml('editor-field-shippingFee', 'Shipping fee (flat amount)', String(product.shippingFee || 0), 'number');
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

        // Section 4: Packages
        html += '<div class="owner-editor-section">';
        html += '<h3>4. Packages &amp; pricing</h3>';
        html += '<p class="hint">Each package is a purchasable variant: id, title, and price. Leave price at 0 for free items.</p>';
        html += '<table class="owner-editor-table"><thead><tr><th style="width:24%;">Package ID</th><th>Title</th><th style="width:22%;">Price</th><th style="width:100px;"></th></tr></thead>';
        html += '<tbody id="editor-packages-body"></tbody></table>';
        html += '<div class="owner-editor-table-actions"><button type="button" class="btn btn-secondary" id="editor-add-package">+ Add package</button></div>';
        html += '</div>';

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

        // Render packages
        (product.packages || []).forEach(function(pkg) { addPackageRow(pkg.id, pkg.title, pkg.price); });
        if (!(product.packages || []).length) addPackageRow('', '', 0);

        // Bindings
        document.getElementById('editor-cancel').addEventListener('click', closeProductEditor);
        document.getElementById('editor-cancel-bottom').addEventListener('click', closeProductEditor);
        document.getElementById('editor-save').addEventListener('click', saveProductEditor);

        document.getElementById('editor-add-spec').addEventListener('click', function() { addSpecRow('', ''); });
        document.getElementById('editor-add-package').addEventListener('click', function() { addPackageRow('', '', 0); });

        var fileInput = document.getElementById('editor-images-file-input');
        document.getElementById('editor-upload-images').addEventListener('click', function() { fileInput.click(); });
        fileInput.addEventListener('change', handleEditorImageFilesSelected);
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
            img.src = resolveAssetSrc(url);
            img.onerror = function() { this.style.opacity = '0.2'; };

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
            orderLabel.style.color = '#fff';
            orderLabel.style.fontWeight = '800';
            orderLabel.style.fontSize = '0.75rem';
            orderLabel.style.background = 'rgba(0,0,0,0.35)';
            orderLabel.style.padding = '4px 8px';
            orderLabel.style.borderRadius = '10px';
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
            var productType = val('editor-field-productType') || 'physical';
            var shippingFee = val('editor-field-shippingFee');
            shippingFee = shippingFee === '' ? 0 : Number(shippingFee);
            var description = val('editor-field-description');
            var longDescription = val('editor-field-longDescription');

            var images = collectImagesFromView();
            var coverTile = document.querySelector('.owner-image-tile.is-cover');
            var image = coverTile ? String(coverTile.dataset.productImageUrl || '') : (images[0] || '');
            if (!image && images[0]) image = images[0];

            var specs = collectSpecsFromView();
            var packages = collectPackagesFromView();

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
                var nextImages = images.map(function(u) {
                    return { enabled: true, file: u };
                });
                if (configValues.PRODUCT_IMAGES && Array.isArray(configValues.PRODUCT_IMAGES)) {
                    // merge the enabled+ file shape; overwrite for simplicity
                }
                configValues.PRODUCT_IMAGES = nextImages;
                // specs
                configValues.SPECIFICATIONS = specs.slice();
                // packages (preserve existing keys like quantity, oldPrice from existing matching by id)
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
                    configValues.PRODUCTS.push(updated);
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
            if (activeProductsMode === 'singleproduct' || activeProductsMode === 'affiliate') return;
            var blank = {
                __kind: 'multi',
                __index: (Array.isArray(activeProductsConfig.PRODUCTS) ? activeProductsConfig.PRODUCTS.length : 0),
                id: slugIdFromTitle('New Product'),
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
            if (!Array.isArray(activeProductsConfig.PRODUCTS)) configValues.PRODUCTS = [];
            configValues.PRODUCTS.push({
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
            activeProductsConfig = configValues;
            openProductEditor(blank, blank.__index);
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        injectBrandVariables();
        initLogin();
        initLookup();
        initActions();
        initConfig();
        initSiteModeSelector();
        initModeGate();
        initNavTabs();
        initProductsManagement();
        loadDashboard();
    });
})();
