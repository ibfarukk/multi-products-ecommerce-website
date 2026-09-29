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
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        const base = typeof API_BASE_URL !== 'undefined' ? String(API_BASE_URL).trim() : '';
        if (!base) return cleanPath;
        return base.replace(/\/+$/, '') + cleanPath;
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

    function initConfig() {
        document.querySelectorAll('[data-config-mode]').forEach(function(button) {
            button.addEventListener('click', function() {
                document.querySelectorAll('[data-config-mode]').forEach(function(tab) { tab.classList.toggle('active', tab === button); });
                loadConfig(button.dataset.configMode);
            });
        });
        var save = document.getElementById('owner-config-save');
        var reset = document.getElementById('owner-config-reset');
        if (save) save.addEventListener('click', saveConfig);
        if (reset) reset.addEventListener('click', function() { loadConfig(configMode); });
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

    async function loadDashboard() {
        clearError('owner-dashboard-error');
        const token = getAuthToken();
        if (!token) {
            setView(false);
            return;
        }

        try {
            const stats = await fetchStats(token);
            renderStats(stats);
            setView(true);
            setLoginFieldErrorState(false);
            loadConfig(configMode);
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
                loadConfig(configMode);
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

    document.addEventListener('DOMContentLoaded', function() {
        injectBrandVariables();
        initLogin();
        initLookup();
        initActions();
        initConfig();
        loadDashboard();
    });
})();
