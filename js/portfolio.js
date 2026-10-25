(function() {
    'use strict';

    function $(id) { return document.getElementById(id); }
    function text(value, fallback) { return String(value == null || value === '' ? (fallback || '') : value); }
    function escape(value) {
        return text(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    function safeUrl(value, fallback) {
        var url = text(value, fallback);
        if (!url) return '';
        if (/^(javascript|data|vbscript):/i.test(url)) return '';
        return url;
    }
    function externalAttrs(url) { return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : ''; }
    function hasContent(item, fields) {
        return item && fields.some(function(field) {
            return String(item[field] == null ? '' : item[field]).trim() !== '';
        });
    }
    function link(label, url, className) {
        var clean = safeUrl(url);
        return clean ? '<a class="' + className + '" href="' + escape(clean) + '"' + externalAttrs(clean) + '>' + escape(label) + '</a>' : '';
    }
    function resumeLink(profile) {
        var url = safeUrl(profile.secondaryCtaUrl || profile.resumeUrl);
        if (url) {
            var download = !/^https?:\/\//i.test(url) ? ' download' : '';
            return '<a class="portfolio-button portfolio-button-secondary" href="' + escape(url) + '"' + externalAttrs(url) + download + '>' + escape(text(profile.secondaryCtaText, 'Download my resume')) + '</a>';
        }
        return '<a class="portfolio-button portfolio-button-secondary portfolio-button-disabled" href="#contact" aria-disabled="true">' + escape(text(profile.secondaryCtaText, 'Download my resume')) + '</a>';
    }
    function renderNavigation() {
        var items = Array.isArray(NAVIGATION) ? NAVIGATION.filter(function(item) { return item && item.enabled !== false; }) : [];
        var html = items.map(function(item) { return link(item.label, item.href, 'portfolio-nav-link'); }).join('');
        $('portfolio-nav').innerHTML = html;
        $('portfolio-mobile-nav').innerHTML = html;
    }
    function renderProfile() {
        var profile = PORTFOLIO_PROFILE || {};
        $('portfolio-logo-name').textContent = text(profile.name, BUSINESS.shortName);
        $('portfolio-logo-mark').textContent = text(profile.name, 'Y').trim().charAt(0).toUpperCase() || 'Y';
        $('portfolio-eyebrow').textContent = text(profile.eyebrow);
        $('portfolio-headline').textContent = text(profile.headline, profile.professionalTitle);
        $('portfolio-short-bio').textContent = text(profile.shortBio);
        $('portfolio-long-bio').textContent = text(profile.longBio, profile.shortBio);
        $('portfolio-location').textContent = text(profile.location);
        $('portfolio-professional-title').textContent = text(profile.professionalTitle);
        $('portfolio-hero-location').textContent = text(profile.location);
        $('portfolio-availability').innerHTML = '<span class="portfolio-status-dot"></span>' + escape(text(profile.availability));
        var image = $('portfolio-profile-image');
        image.src = safeUrl(profile.profileImage, 'productsimages/logo.jpg') || 'productsimages/logo.jpg';
        image.alt = text(profile.name, 'Profile photo');
        $('portfolio-actions').innerHTML = link(text(profile.primaryCtaText, 'Let’s work together'), profile.primaryCtaUrl, 'portfolio-button portfolio-button-primary') +
            resumeLink(profile);
        document.title = text(SEO && SEO.title, text(profile.name, 'Professional Portfolio'));
        var description = document.querySelector('meta[name="description"]');
        if (description) description.setAttribute('content', text(SEO && SEO.description, profile.shortBio));
    }
    function renderServices() {
        $('portfolio-services').innerHTML = (Array.isArray(PORTFOLIO_SERVICES) ? PORTFOLIO_SERVICES : []).filter(function(item) {
            return hasContent(item, ['title', 'description']);
        }).map(function(item, index) {
            return '<article class="portfolio-service-card"><span>0' + (index + 1) + '</span><h3>' + escape(item.title) + '</h3><p>' + escape(item.description) + '</p></article>';
        }).join('');
    }
    function renderSkills() {
        $('portfolio-skills').innerHTML = (Array.isArray(PORTFOLIO_SKILLS) ? PORTFOLIO_SKILLS : []).filter(function(item) {
            return hasContent(item, ['name', 'level']);
        }).map(function(item) {
            return '<div class="portfolio-skill"><strong>' + escape(item.name) + '</strong><span>' + escape(item.level) + '</span></div>';
        }).join('');
    }
    function renderProjects() {
        $('portfolio-projects').innerHTML = (Array.isArray(PORTFOLIO_PROJECTS) ? PORTFOLIO_PROJECTS : []).filter(function(item) {
            return hasContent(item, ['title', 'description', 'details']);
        }).map(function(item) {
            var live = safeUrl(item.liveUrl);
            var tags = Array.isArray(item.technologies) ? item.technologies.map(function(tag) { return '<span>' + escape(tag) + '</span>'; }).join('') : '';
            return '<article class="portfolio-project-card' + (item.featured ? ' portfolio-project-featured' : '') + ' portfolio-reveal"><div class="portfolio-project-image"><img src="' + escape(safeUrl(item.image, 'productsimages/logo.jpg') || 'productsimages/logo.jpg') + '" alt="' + escape(item.title) + '" loading="lazy"></div><div class="portfolio-project-body"><p class="portfolio-project-category">' + escape(item.category) + '</p><h3>' + escape(item.title) + '</h3><p>' + escape(item.description) + '</p><div class="portfolio-tags">' + tags + '</div><div class="portfolio-project-actions"><button class="portfolio-project-details" type="button" data-project-index="' + String(Array.prototype.indexOf.call(PORTFOLIO_PROJECTS, item)) + '">View details</button>' + (live ? '<a class="portfolio-project-link" href="' + escape(live) + '"' + externalAttrs(live) + '>Live project <span>↗</span></a>' : '') + '</div></div></article>';
        }).join('');
        $('portfolio-projects').querySelectorAll('[data-project-index]').forEach(function(button) {
            button.addEventListener('click', function() { openProjectDetails(Number(button.getAttribute('data-project-index'))); });
        });
    }
    function renderTimeline() {
        $('portfolio-experience').innerHTML = (Array.isArray(PORTFOLIO_EXPERIENCE) ? PORTFOLIO_EXPERIENCE : []).filter(function(item) {
            return hasContent(item, ['role', 'company', 'description']);
        }).map(function(item) {
            return '<article class="portfolio-timeline-item"><span>' + escape(item.period) + '</span><h3>' + escape(item.role) + '</h3><strong>' + escape(item.company) + '</strong><p>' + escape(item.description) + '</p></article>';
        }).join('');
        $('portfolio-education').innerHTML = (Array.isArray(PORTFOLIO_EDUCATION) ? PORTFOLIO_EDUCATION : []).filter(function(item) {
            return hasContent(item, ['qualification', 'institution', 'description']);
        }).map(function(item) {
            return '<article class="portfolio-education-card"><h3>' + escape(item.qualification) + '</h3><strong>' + escape(item.institution) + '</strong><span>' + escape(item.period) + '</span><p>' + escape(item.description) + '</p></article>';
        }).join('');
    }
    function renderTestimonials() {
        $('portfolio-testimonials').innerHTML = (Array.isArray(PORTFOLIO_TESTIMONIALS) ? PORTFOLIO_TESTIMONIALS : []).filter(function(item) {
            return hasContent(item, ['quote', 'name']);
        }).map(function(item) {
            return '<article class="portfolio-testimonial"><blockquote>“' + escape(item.quote) + '”</blockquote><cite>' + escape(item.name) + (item.role ? ' · ' + escape(item.role) : '') + '</cite></article>';
        }).join('');
    }
    function renderSocial() {
        var labels = { linkedin: 'LinkedIn', github: 'GitHub', twitter: 'X', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', behance: 'Behance', dribbble: 'Dribbble' };
        var html = Object.keys(labels).map(function(key) { return link(labels[key], SOCIAL_LINKS && SOCIAL_LINKS[key], 'portfolio-social-link'); }).join('');
        $('portfolio-footer-social').innerHTML = html;
    }
    function renderContact() {
        var contact = CONTACT || {};
        $('portfolio-contact-title').textContent = text(contact.title, 'Let’s create something valuable');
        $('portfolio-contact-subtitle').textContent = text(contact.subtitle);
        var email = BUSINESS && BUSINESS.email ? 'mailto:' + BUSINESS.email : '';
        var phone = BUSINESS && BUSINESS.phone ? 'tel:' + BUSINESS.phone.replace(/[^\d+]/g, '') : '';
        $('portfolio-contact-actions').innerHTML = link('Email me', email, 'portfolio-button portfolio-button-primary') + link('Call ' + text(BUSINESS.phone), phone, 'portfolio-button portfolio-button-secondary');
        var floatingEmail = $('portfolio-floating-email');
        var floatingCall = $('portfolio-floating-call');
        if (floatingEmail) {
            floatingEmail.href = email || '#contact';
            floatingEmail.hidden = !email;
        }
        if (floatingCall) {
            floatingCall.href = phone || '#contact';
            floatingCall.hidden = !phone;
        }
    }
    function setSectionVisibility() {
        var sections = PORTFOLIO_SECTIONS || {};
        var sectionMap = {
            about: 'about',
            services: 'services',
            skills: 'skills',
            projects: 'projects',
            experience: 'experience',
            education: 'education',
            testimonials: 'testimonials',
            contact: 'contact'
        };
        var contentMap = {
            services: $('portfolio-services'),
            skills: $('portfolio-skills'),
            projects: $('portfolio-projects'),
            experience: $('portfolio-experience'),
            education: $('portfolio-education'),
            testimonials: $('portfolio-testimonials')
        };
        Object.keys(sectionMap).forEach(function(key) {
            var element = document.getElementById(sectionMap[key]);
            var content = contentMap[key];
            var hasRenderedContent = !content || content.children.length > 0;
            if (element) element.hidden = sections[key] === false || !hasRenderedContent;
        });
    }
    function renderCustomSections() {
        var container = $('portfolio-custom-sections');
        if (!container) return;
        var items = Array.isArray(PORTFOLIO_CUSTOM_SECTIONS) ? PORTFOLIO_CUSTOM_SECTIONS.filter(function(item) {
            return item && item.enabled !== false && (item.title || item.body);
        }) : [];
        container.innerHTML = items.map(function(item) {
            return '<section class="portfolio-section portfolio-custom-section"><div class="portfolio-container portfolio-custom-section-inner portfolio-reveal"><p class="portfolio-kicker">' + escape(item.label || 'MORE ABOUT ME') + '</p><h2>' + escape(item.title) + '</h2><p>' + escape(item.body) + '</p>' + link(item.ctaText, item.ctaUrl, 'portfolio-button portfolio-button-secondary') + '</div></section>';
        }).join('');
    }
    var lastFocusedProjectButton = null;
    function openProjectDetails(index) {
        var project = Array.isArray(PORTFOLIO_PROJECTS) ? PORTFOLIO_PROJECTS[index] : null;
        if (!project) return;
        lastFocusedProjectButton = document.querySelector('[data-project-index="' + index + '"]');
        $('portfolio-dialog-image').src = safeUrl(project.image, 'productsimages/logo.jpg') || 'productsimages/logo.jpg';
        $('portfolio-dialog-image').alt = text(project.title, 'Project image');
        $('portfolio-dialog-category').textContent = text(project.category);
        $('portfolio-dialog-title').textContent = text(project.title);
        $('portfolio-dialog-description').textContent = text(project.details, project.description);
        $('portfolio-dialog-role').textContent = text(project.role, 'Design and development');
        $('portfolio-dialog-year').textContent = text(project.year, '—');
        $('portfolio-dialog-outcome').textContent = text(project.outcome);
        $('portfolio-dialog-tags').innerHTML = (Array.isArray(project.technologies) ? project.technologies : []).map(function(tag) { return '<span>' + escape(tag) + '</span>'; }).join('');
        $('portfolio-dialog-actions').innerHTML = link('Open live project', project.liveUrl, 'portfolio-button portfolio-button-primary') + link('View source code', project.sourceUrl, 'portfolio-button portfolio-button-secondary');
        $('portfolio-dialog-backdrop').hidden = false;
        document.body.classList.add('portfolio-dialog-open');
        $('portfolio-dialog-close').focus();
    }
    function closeProjectDetails() {
        $('portfolio-dialog-backdrop').hidden = true;
        document.body.classList.remove('portfolio-dialog-open');
        if (lastFocusedProjectButton) lastFocusedProjectButton.focus();
    }
    function initMenu() {
        var button = document.querySelector('.portfolio-menu-button');
        var nav = document.querySelector('.portfolio-mobile-nav');
        if (!button || !nav) return;
        button.addEventListener('click', function() {
            var open = nav.classList.toggle('is-open');
            button.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        nav.addEventListener('click', function() { nav.classList.remove('is-open'); button.setAttribute('aria-expanded', 'false'); });
    }
    function initProjectDialog() {
        $('portfolio-dialog-close').addEventListener('click', closeProjectDetails);
        $('portfolio-dialog-backdrop').addEventListener('click', function(event) {
            if (event.target === $('portfolio-dialog-backdrop')) closeProjectDetails();
        });
        document.addEventListener('keydown', function(event) {
            if ($('portfolio-dialog-backdrop').hidden) return;
            if (event.key === 'Escape') closeProjectDetails();
        });
    }
    function initRevealAnimations() {
        var elements = document.querySelectorAll('.portfolio-reveal');
        if (!('IntersectionObserver' in window)) {
            elements.forEach(function(element) { element.classList.add('is-visible'); });
            return;
        }
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        elements.forEach(function(element) { observer.observe(element); });
    }
    function init() {
        var brand = BRAND || {};
        var root = document.documentElement;
        root.style.setProperty('--portfolio-primary', brand.primaryColor || '#2563eb');
        root.style.setProperty('--portfolio-primary-dark', brand.primaryDark || '#1d4ed8');
        root.style.setProperty('--portfolio-primary-light', brand.primaryLight || '#dbeafe');
        root.style.setProperty('--portfolio-background', brand.backgroundColor || '#f8fafc');
        root.style.setProperty('--portfolio-surface', brand.lightBackground || '#ffffff');
        root.style.setProperty('--portfolio-text', brand.textColor || '#0f172a');
        root.style.setProperty('--portfolio-muted', brand.mutedTextColor || '#64748b');
        root.style.setProperty('--portfolio-border', brand.borderColor || '#e2e8f0');
        root.style.setProperty('--portfolio-button-text', brand.buttonTextColor || '#ffffff');
        renderNavigation(); renderProfile(); renderServices(); renderSkills(); renderProjects(); renderTimeline(); renderTestimonials(); renderSocial(); renderContact(); setSectionVisibility(); renderCustomSections(); initMenu(); initProjectDialog(); initRevealAnimations();
        $('portfolio-footer-name').textContent = text(PORTFOLIO_PROFILE.name, BUSINESS.name);
        $('portfolio-footer-copy').textContent = '© ' + new Date().getFullYear() + ' ' + text(PORTFOLIO_PROFILE.name, BUSINESS.name) + '.';
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
