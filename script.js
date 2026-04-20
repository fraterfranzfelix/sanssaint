document.addEventListener('DOMContentLoaded', () => {

    const hasMouse = window.matchMedia('(pointer: fine)').matches;

    if (hasMouse) {
        initMouseParallax();
    } else {
        initTiltParallax();
    }

    measureEmDashWeight();
    initWordmarkReveal();
    initMuteToggle();
    initLangDropdown();
    initSettingsPanel();
    initLanguage();
    initContactMobileSnap();
    initCreationMobileSnap();
    initSectionVisibilityObserver();
    initUISounds();
});


/* =============================================================================
   SHARED HELPERS
============================================================================= */

const balduinWrapper = document.querySelector('.balduin-image-wrapper');
const balduinMobile  = document.querySelector('.balduin-mobile');

// Viewport dimensions — cached once and refreshed on resize so per-frame
// code never needs to read window.innerWidth/Height directly.
let vpWidth  = window.innerWidth;
let vpHeight = window.innerHeight;

// Parallax movement multiplier — 1 = full, 0.333 = reduced motion
let motionScale = 1;

// Tilt multiplier for balduin-mobile: lerp(2→1) as scroll progresses from
// stage 1 (large/blurred) to stage 2 (sharp). Updated each frame by updateBalduin.
let balduinTiltMultiplier = 1;

// Tracks which sections are currently intersecting the viewport.
// Used by parallax functions to skip off-screen layers.
const visibleSections = new Set();
window.addEventListener('resize', () => {
    vpWidth  = window.innerWidth;
    vpHeight = window.innerHeight;
    initContactMobileSnap();
    initCreationMobileSnap();
}, { passive: true });

/**
 * Returns the parallax speed divisor for a given layer.
 * Higher absolute value → slower movement (feels further away).
 * Lower absolute value  → faster movement (feels closer).
 * Negative values = counter-parallax (moves opposite to input).
 * Positive values = normal parallax (moves with input) — used for the
 * three background paintings to give a sense of depth behind the content.
 */
function getSpeed(layer) {
    if (layer.classList.contains('particles-front'))      return -15;
    if (layer.classList.contains('weapons-also-right'))   return -35;
    if (layer.classList.contains('weapons-layer'))        return -15;
    if (layer.classList.contains('particles-back'))       return -35;
    
    if (layer.classList.contains('portrait-background-layer')) return  50;
    if (layer.classList.contains('portrait-foreground-layer')) return -15;
    
    if (layer.classList.contains('bg-layer-creation'))    return  50;
    if (layer.classList.contains('bg-layer-eden'))        return  50;
    
    // Apply fast particle-like speed to both Balduin wrappers
    if (layer.classList.contains('balduin-image-wrapper')) return -35;
    if (layer.classList.contains('balduin-mobile'))        return -35;
    
    return  50;
}

function applyTransform(layer, xMove, yMove) {
    if (layer === balduinMobile) {
        // Directly map parallax to the mobile fixed element without clamping.
        // balduinTiltMultiplier scales the effect: 2× at stage 1, 1× at stage 2.
        layer.style.setProperty('--tilt-x', `${xMove * balduinTiltMultiplier}px`);
        layer.style.setProperty('--tilt-y', `${yMove * balduinTiltMultiplier}px`);
        
    } else if (layer === balduinWrapper) {
        // Unclamped movement for the desktop element
        layer.style.transform = `translate(calc(-50% + ${xMove}px), ${yMove}px)`;
        
    } else {
        layer.style.transform = `translate(${xMove}px, ${yMove}px)`;
    }
}


/* =============================================================================
   DESKTOP: MOUSE PARALLAX (OPTIMIZED)
============================================================================= */

function initMouseParallax() {
    const selectors = [
        '.parallax-layer',
        '.bg-layer-creation',
        '.bg-layer-eden',
        '.center-image-wrapper',
        '.balduin-image-wrapper',
        '.balduin-mobile' // <-- Added explicitly
    ];
    const layers = [...document.querySelectorAll(selectors.join(', '))]
        .filter(l => !l.classList.contains('halftone-top') && !l.classList.contains('halftone-bottom'));

    const speedCache = new Map();
    layers.forEach(layer => speedCache.set(layer, getSpeed(layer)));

    const sectionCache = new Map();
    layers.forEach(layer => sectionCache.set(layer, layer.closest('.section')));

    let targetX = 0;
    let targetY = 0;
    let ticking = false;

    function updateScreen() {
        layers.forEach(layer => {
            const section = sectionCache.get(layer);
            // Fix: Only skip elements that actually have a section, and the section is hidden
            if (section && !visibleSections.has(section)) return;
            
            // Fix: Save CPU by skipping balduin-mobile if it's currently hidden by the scroll logic
            if (layer === balduinMobile && balduinMobile.style.visibility === 'hidden') return;

            const speed = speedCache.get(layer);
            applyTransform(layer, (targetX / speed) * motionScale, (targetY / speed) * motionScale);
        });
        ticking = false;
    }

    document.addEventListener('mousemove', (e) => {
        targetX = e.clientX - vpWidth  / 2;
        targetY = e.clientY - vpHeight / 2;
        if (!ticking) {
            window.requestAnimationFrame(updateScreen);
            ticking = true;
        }
    });
}


/* =============================================================================
   MOBILE: TILT PARALLAX (OPTIMIZED)
============================================================================= */

function initTiltParallax() {
    const selectors = [
        '.parallax-layer',
        '.bg-layer-creation',
        '.bg-layer-eden',
        '.center-image-wrapper',
        '.balduin-image-wrapper',
        '.balduin-mobile' // <-- Added explicitly
    ];
    const layers = [...document.querySelectorAll(selectors.join(', '))]
        .filter(l => !l.classList.contains('halftone-top') && !l.classList.contains('halftone-bottom'));

    const speedCache = new Map();
    layers.forEach(layer => speedCache.set(layer, getSpeed(layer)));

    const sectionCache = new Map();
    layers.forEach(layer => sectionCache.set(layer, layer.closest('.section')));

    let baseGamma = null;
    let baseBeta  = null;
    let targetX = 0;
    let targetY = 0;
    let smoothX = 0;
    let smoothY = 0;
    const SMOOTHING = 0.12;
    const MAX_TILT = 10;
    let ticking = false;

    function updateScreen() {
        smoothX += (targetX - smoothX) * SMOOTHING;
        smoothY += (targetY - smoothY) * SMOOTHING;

        layers.forEach(layer => {
            const section = sectionCache.get(layer);
            if (section && !visibleSections.has(section)) return;
            if (layer === balduinMobile && balduinMobile.style.visibility === 'hidden') return;

            const speed = speedCache.get(layer);
            applyTransform(layer, (smoothX / speed) * motionScale, (smoothY / speed) * motionScale);
        });

        const diffX = Math.abs(targetX - smoothX);
        const diffY = Math.abs(targetY - smoothY);

        if (diffX > 0.05 || diffY > 0.05) {
            window.requestAnimationFrame(updateScreen);
        } else {
            ticking = false;
        }
    }

    window.addEventListener('deviceorientation', (e) => {
        const gamma = e.gamma ?? 0;
        const beta  = e.beta  ?? 0;

        if (baseGamma === null) {
            baseGamma = gamma;
            baseBeta  = beta;
            return;
        }

        const rawX = Math.max(-MAX_TILT, Math.min(MAX_TILT, gamma - baseGamma));
        const rawY = Math.max(-MAX_TILT, Math.min(MAX_TILT, beta  - baseBeta));

        const normX  = rawX / MAX_TILT;
        const normY  = rawY / MAX_TILT;
        const rangeX = vpWidth  / 2;
        const rangeY = vpHeight / 2;

        targetX = normX * rangeX;
        targetY = normY * rangeY;

        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(updateScreen);
        }
    });
}


/* =============================================================================
   SECTION VISIBILITY: PAUSE OFF-SCREEN ANIMATIONS
============================================================================= */

function initSectionVisibilityObserver() {
    const sections = document.querySelectorAll('section.section');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const section = entry.target;

            if (entry.isIntersecting) {
                visibleSections.add(section);
                // Resume particle animations inside this section
                section.querySelectorAll('.particles-back, .particles-front')
                    .forEach(el => el.classList.remove('is-paused'));
            } else {
                visibleSections.delete(section);
                // Pause particle animations inside this section
                section.querySelectorAll('.particles-back, .particles-front')
                    .forEach(el => el.classList.add('is-paused'));
            }
        });
    }, { threshold: 0 }); // fires as soon as any pixel enters/leaves

    sections.forEach(section => observer.observe(section));
}


/* =============================================================================
   HEADER: EM DASH WEIGHT MEASUREMENT
============================================================================= */

/**
 * Measures the actual stroke weight of EB Garamond's em dash glyph by rendering
 * it onto an offscreen canvas and scanning the pixel data vertically.
 *
 * This sets --em-dash-weight on :root, which drives the height of all three
 * parts of each header line (cap-left, body, cap-right). The result is exact
 * regardless of system font rendering — no manual measurement or guesswork.
 *
 * Called after DOMContentLoaded; waits for document.fonts.ready so the custom
 * font is guaranteed to be available before the canvas draws it.
 */
async function measureEmDashWeight() {
    try {
        await document.fonts.ready;

        // Render at a large size for sub-pixel accuracy when dividing back down.
        const testSize = 128;

        const canvas  = document.createElement('canvas');
        canvas.width  = Math.ceil(testSize * 2.5); // Wide enough for the em dash
        canvas.height = Math.ceil(testSize * 1.2);  // Tall enough to contain any baseline shift
        const ctx     = canvas.getContext('2d');

        // White glyph on black background — easiest to threshold
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font          = `400 ${testSize}px EB Garamond`;
        ctx.textBaseline  = 'middle';
        ctx.fillText('—', 0, canvas.height / 2);

        // Find the center x of the drawn glyph to guarantee we're scanning
        // through solid ink, not whitespace at either end
        const emWidth = ctx.measureText('—').width;
        const scanX   = Math.max(1, Math.floor(emWidth / 2));

        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Scan the center column vertically for the topmost and bottommost lit pixel
        let top = -1, bottom = -1;
        for (let y = 0; y < height; y++) {
            const r = data[(y * width + scanX) * 4]; // Red channel suffices for white pixels
            if (r > 64) {
                if (top    === -1) top    = y;
                bottom = y;
            }
        }

        if (top !== -1 && bottom !== -1) {
            // strokePx / testSize gives the stroke height as a fraction of 1em,
            // which expressed as rem is correct independent of the user's browser font size.
            const strokeRem = (bottom - top + 1) / testSize;
            document.documentElement.style.setProperty('--em-dash-weight', `${strokeRem}rem`);
        }
    } catch (err) {
        // Font load failure or canvas unsupported — CSS fallback value (0.09rem) remains.
        console.warn('Em dash weight measurement failed, using CSS fallback:', err);
    }
}


/* =============================================================================
   HEADER: WORDMARK SCROLL REVEAL
============================================================================= */

function initWordmarkReveal() {

    const headerCenter    = document.getElementById('header-center');
    const scrollContainer = document.querySelector('.scroll-container');
    const heroSection     = document.getElementById('hero');

    if (!headerCenter || !scrollContainer || !heroSection) return;

    // Place a 1px sentinel at the hero's vertical midpoint (50vh).
    // IntersectionObserver fires exactly once when it crosses the trigger line,
    // replacing the scroll listener that previously fired on every pixel.
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:50%;left:0;width:1px;height:1px;pointer-events:none;';
    heroSection.appendChild(sentinel);

    // The header is 3rem tall; its midpoint is 1.5rem from the top of the
    // scroll container. rootMargin shrinks the observable area by that amount,
    // so the threshold matches the previous scroll-based trigger exactly.
    // rootMargin only accepts px/%, not rem, so we convert from the live font size.
    const rootFontSize     = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const headerMidpointPx = Math.round(1.5 * rootFontSize);

    const observer = new IntersectionObserver(
        ([entry]) => headerCenter.classList.toggle('is-visible', !entry.isIntersecting),
        { root: scrollContainer, rootMargin: `-${headerMidpointPx}px 0px 0px 0px`, threshold: 0 }
    );

    observer.observe(sentinel);
}


/* =============================================================================
   HEADER: MUTE TOGGLE
============================================================================= */

function initMuteToggle() {
    const btn      = document.getElementById('mute-btn');
    const icon     = document.getElementById('mute-icon');
    const checkbox = document.getElementById('setting-mute');

    if (!btn || !icon) return;

    // stage 0 = normal, 1 = reduced, 2 = off
    let stage = 0;

    const STAGES = [
        { src: 'assets/icons/13_volume_on_icon.svg',      alt: 'Sound on',      label: 'Reduce volume', volume: 0.6667 },
        { src: 'assets/icons/12_volume_reduced_icon.svg', alt: 'Sound reduced', label: 'Mute',          volume: 0.3333 },
        { src: 'assets/icons/14_volume_off_icon.svg',   alt: 'Sound off',      label: 'Unmute',        volume: 0      },
    ];

    function applyStage(newStage) {
        stage = newStage;
        const s = STAGES[stage];
        icon.src = s.src;
        icon.alt = s.alt;
        btn.setAttribute('aria-label', s.label);
        if (window.audioEngine) window.audioEngine.setVolume(s.volume);
    }

    btn.addEventListener('click', () => {
        applyStage((stage + 1) % 3);
        if (checkbox) checkbox.checked = (stage !== 2); // checked = any audible stage
    });

    // Mobile settings checkbox: checked = normal, unchecked = off
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            applyStage(checkbox.checked ? 0 : 2);
        });
    }
}


/* =============================================================================
   LANGUAGE & TRANSLATION
============================================================================= */

/**
 * Fetches the JSON file for the current language and applies it to the DOM.
 * Called once on DOMContentLoaded, and again each time the user switches language.
 *
 * If the file doesn't exist yet (e.g. fr.json during development), the fetch
 * fails silently and the existing hardcoded HTML content is left untouched —
 * so the English fallback remains visible rather than breaking.
 */
async function initLanguage() {
    const lang = document.documentElement.lang || 'en';

    try {
        const response = await fetch(`assets/lang/${lang}.json`);
        if (!response.ok) throw new Error(`${lang}.json returned ${response.status}`);
        const data = await response.json();
        applyTranslation(data);
    } catch (err) {
        // Expected during development when a language file doesn't exist yet.
        console.info(`Language file '${lang}.json' not loaded — keeping existing content.`, err.message);
    }
}

/**
 * Walks the DOM for translation hooks and writes values from the language data.
 *
 *   data-i18n="key.subkey"       → sets element.innerHTML  (text + inline spans)
 *   data-i18n-src="key.subkey"   → sets element.src         (logo swap)
 *   data-i18n-aria="key.subkey"  → sets element.aria-label  (button labels)
 */
function applyTranslation(data) {

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const value = getNestedValue(data, el.dataset.i18n);
        if (value !== undefined) el.innerHTML = value;
    });

    document.querySelectorAll('[data-i18n-src]').forEach(el => {
        const value = getNestedValue(data, el.dataset.i18nSrc);
        if (value !== undefined) el.src = value;
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const value = getNestedValue(data, el.dataset.i18nAria);
        if (value !== undefined) el.setAttribute('aria-label', value);
    });
}

/**
 * Reads a dot-separated key path from a nested object.
 * e.g. getNestedValue(data, 'creation.quote') → data.creation.quote
 * Returns undefined if any segment of the path doesn't exist.
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}


/* =============================================================================
   HEADER: LANGUAGE DROPDOWN
============================================================================= */

function initLangDropdown() {

    const current  = document.getElementById('lang-current');
    const menu     = document.getElementById('lang-menu');
    const toggle   = document.getElementById('lang-toggle');
    const dropdown = document.getElementById('lang-dropdown');

    if (!menu || !current) return;

    // Sync the initial label on page load
    const activeLang = document.documentElement.lang || 'en';
    current.textContent = activeLang.toUpperCase();

    // Click-toggle open/close
    if (toggle && dropdown) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close settings panel if open
            const settingsMenuEl = document.getElementById('settings-menu');
            const settingsToggleEl = document.getElementById('settings-toggle');
            if (settingsMenuEl) settingsMenuEl.classList.remove('is-open');
            if (settingsToggleEl) settingsToggleEl.setAttribute('aria-expanded', 'false');
            const isOpen = menu.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', isOpen);
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                menu.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function bindLangLinks(container) {
        container.querySelectorAll('a[data-lang]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = link.dataset.lang;

                localStorage.setItem('sanssaint-lang', lang);
                document.documentElement.lang = lang;
                current.textContent = lang.toUpperCase();

                // Close the dropdown after selection
                menu.classList.remove('is-open');
                if (toggle) toggle.setAttribute('aria-expanded', 'false');

                initLanguage();
            });
        });
    }

    bindLangLinks(menu);

    // Also wire language links inside the mobile settings panel
    const settingsLangMenu = document.getElementById('settings-lang-menu');
    if (settingsLangMenu) bindLangLinks(settingsLangMenu);
}


/* =============================================================================
   HEADER: SETTINGS PANEL
============================================================================= */

function initSettingsPanel() {

    const contrastBox = document.getElementById('setting-contrast');

    if (!contrastBox) return;

    // Click-toggle on all viewport sizes
    const toggle      = document.getElementById('settings-toggle');
    const panel       = document.getElementById('settings-panel');
    const settingsMenu = document.getElementById('settings-menu');

    if (toggle && panel && settingsMenu) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close language dropdown if open
            const langMenuEl = document.getElementById('lang-menu');
            const langToggleEl = document.getElementById('lang-toggle');
            if (langMenuEl) langMenuEl.classList.remove('is-open');
            if (langToggleEl) langToggleEl.setAttribute('aria-expanded', 'false');
            const isOpen = settingsMenu.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', isOpen);
        });

        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target)) {
                settingsMenu.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // --- Restore saved preference ---
    // The class on <html> is already applied by the inline script in <head>.
    // We just need to sync the checkbox to match.
    if (localStorage.getItem('sanssaint-contrast') === 'high') {
        contrastBox.checked = true;
    }

    // --- Contrast toggle ---
    contrastBox.addEventListener('change', () => {
        if (contrastBox.checked) {
            document.documentElement.classList.add('high-contrast');
            localStorage.setItem('sanssaint-contrast', 'high');
        } else {
            document.documentElement.classList.remove('high-contrast');
            localStorage.setItem('sanssaint-contrast', 'normal');
        }
    });

    // --- Larger text toggle ---
    const textBox = document.getElementById('setting-text');

    if (textBox) {
        if (localStorage.getItem('sanssaint-text-size') === 'large') {
            textBox.checked = true;
        }

        textBox.addEventListener('change', () => {
            if (textBox.checked) {
                document.documentElement.classList.add('larger-text');
                localStorage.setItem('sanssaint-text-size', 'large');
            } else {
                document.documentElement.classList.remove('larger-text');
                localStorage.setItem('sanssaint-text-size', 'normal');
            }
        });
    }

    // --- Reduce motion toggle ---
    const motionBox = document.getElementById('setting-motion');

    function applyReduceMotion(reduced) {
        motionScale = reduced ? 0 : 1;
        if (reduced) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
        if (motionBox) motionBox.checked = reduced;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const savedMotion = localStorage.getItem('sanssaint-motion');

    // Evaluates all passive signals (never writes to localStorage).
    // Called on init and whenever any signal changes.
    function evaluateAutoMotion() {
        if (localStorage.getItem('sanssaint-motion') !== null) return; // manual override wins
        const reduced =
            prefersReducedMotion.matches ||
            (navigator.deviceMemory !== undefined && navigator.deviceMemory < 2);
        applyReduceMotion(reduced);
    }

    if (savedMotion === 'reduced') {
        applyReduceMotion(true);
    } else if (savedMotion === 'normal') {
        applyReduceMotion(false);
    } else {
        evaluateAutoMotion(); // No manual preference — check all passive signals
    }

    if (motionBox) {
        motionBox.addEventListener('change', () => {
            applyReduceMotion(motionBox.checked);
            localStorage.setItem('sanssaint-motion', motionBox.checked ? 'reduced' : 'normal');
        });
    }

    // React to OS setting changes during the session
    prefersReducedMotion.addEventListener('change', () => {
        if (localStorage.getItem('sanssaint-motion') === null) evaluateAutoMotion();
    });

}

/* =============================================================================
   LOADING SCREEN ORCHESTRATION
============================================================================= */

window.addEventListener('load', async () => {
    
    await document.fonts.ready;

    const loader = document.getElementById('loading-screen');
    const star = document.getElementById('loading-star');

    if (!loader || !star) return;

    // Tracks whether the current spin cycle has fully completed.
    let isReady = false;

    // Wait for the star to finish its current spin cycle before allowing interaction.
    star.addEventListener('animationiteration', () => {
        isReady = true;
        loader.classList.add('is-ready');
    }, { once: true });

    // 2. The user initiates the experience
    // Note: Added 'async' here to handle the iOS permission promise
    loader.addEventListener('click', async () => {

        // Ignore clicks until the spin cycle has fully completed.
        if (!isReady) return;

document.getElementById('mute-btn').removeAttribute('disabled');

        // --- NEW: iOS 13+ Gyroscope Permission Request ---
        // This MUST be inside a user gesture event listener like 'click'
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState !== 'granted') {
                    console.warn('Gyroscope permission denied. Tilt parallax disabled.');
                }
            } catch (error) {
                console.error('Error requesting gyroscope access:', error);
            }
        }
        // -------------------------------------------------

        const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const targetPx = 2 * Math.max(window.innerWidth, window.innerHeight);
        star.style.setProperty('--expand-scale', Math.ceil(targetPx / remPx));

        loader.classList.add('is-expanding');

        if (window.audioEngine) {
            window.audioEngine.play();
        }

        // We trigger the fade-out the moment the expanding star eclipses the viewport edges.
        setTimeout(() => {
            
            document.body.classList.add('is-revealed');
            loader.style.opacity = '0'; 

            setTimeout(() => {
                loader.remove();
            }, 1200);

        }, 1000);
    });
});

/* =============================================================================
   CREATION SECTION — MOBILE SNAP + SCROLL-DRIVEN BALDUIN ANIMATION
   On mobile the two creation panels are promoted to direct .scroll-container
   children so each is an individual scroll-snap target.

   A single .balduin-mobile element (position:fixed) replaces the old two-image
   setup. Its appearance is driven entirely by scroll progress:

   State 1 (at #panel-left): scale=3.5, blur=18px — massive close-up, right side
   Transition: scroll progress t ∈ [0,1] smoothly interpolates all values
   State 2 (at #panel-right): scale=1, blur=0 — sharp 75vh portrait, right side
   Exit (past #panel-right): image translates up with the page so it scrolls away

   Tilt parallax (--tilt-x / --tilt-y) is merged by CSS; JS sets both safely.
============================================================================= */

function initCreationMobileSnap() {
    const creation   = document.getElementById('creation');
    const panelLeft  = document.getElementById('panel-left');
    const panelRight = document.getElementById('panel-right');
    const scroller   = document.querySelector('.scroll-container');
    const mobileImg  = document.querySelector('.balduin-mobile');

    if (!creation || !panelLeft || !panelRight || !scroller) return;

    // CRITICAL FIX: Automatically rescue the image from the scroll container trap.
    // This ensures position: fixed anchors to the true screen glass, not the scrolling content.
    if (mobileImg && mobileImg.parentElement !== document.body) {
        document.body.appendChild(mobileImg);
    }

    // Tear down any previous mobile animation
    if (initCreationMobileSnap._cleanup) {
        initCreationMobileSnap._cleanup();
        initCreationMobileSnap._cleanup = null;
    }

    const isMobile   = window.innerWidth <= 768;
    const isPromoted = panelLeft.parentElement === scroller;

    if (isMobile && !isPromoted) {
        scroller.insertBefore(panelLeft,  creation);
        scroller.insertBefore(panelRight, creation);
        creation.hidden = true;
    } else if (!isMobile && isPromoted) {
        creation.prepend(panelRight);
        creation.prepend(panelLeft);
        creation.hidden = false;
    }

    if (!isMobile || !mobileImg) return;

    let panelLeftTop  = 0;
    let panelRightTop = 0;
    let distance      = 1;
    let rafPending    = false;
    let cancelled     = false;

    function lerp(a, b, t)  { return a + (b - a) * t; }
    function smooth(t)      { return t * t * (3 - 2 * t); }
    function clamp01(t)     { return Math.max(0, Math.min(1, t)); }

    function updateBalduin() {
        rafPending = false;

        const scrollTop = scroller.scrollTop;
        const vph       = vpHeight;
        const vpw       = vpWidth;

        // Interpolate safely based on the exact pixel distance between the two panels
        const t = smooth(clamp01((scrollTop - panelLeftTop) / distance));

        // Double tilt parallax at stage 1, fade back to 1× by stage 2
        balduinTiltMultiplier = 3 - t;

        // --- NEW: INDEPENDENT OFFSETS FOR STATE 1 (PANEL LEFT) ---
        // Adjust these multipliers to move the large, blurred Balduin!
        // vpw * 0.33 means "push him right by 33% of the screen width"
        const extraRight = vpw * 0.33; 
        
        // vph * 0.10 means "push him down by 10% of the screen height"
        const extraDown  = vph * 0.25; 

        // Interpolate offsets so they smoothly slide back to 0 at the second panel
        const currentDx = lerp(extraRight, 0, t);
        const currentDy = lerp(extraDown,  0, t);

        let dy = 0;
        let op = 1;
        let visibility = 'visible';

        if (scrollTop < panelLeftTop) {
            // Entering from Hero: Push down so he scrolls up into view.
            dy = (panelLeftTop - scrollTop) * 1.5;
            op = clamp01((scrollTop - (panelLeftTop - vph * 0.3)) / (vph * 0.3));
        } else if (scrollTop > panelRightTop) {
            // Exiting to Portfolio: Push up so he scrolls away naturally.
            dy = panelRightTop - scrollTop;
            op = clamp01(1 - (scrollTop - panelRightTop) / (vph * 0.3));
        } else {
            // Pinned between the two panels
            dy = 0;
        }

        if (op === 0 && dy > vph) visibility = 'hidden';

        // Apply the values, injecting our currentDx and currentDy
        mobileImg.style.setProperty('--scroll-dx', `${currentDx}px`);
        mobileImg.style.setProperty('--scroll-dy', `${dy + currentDy}px`); // Combine base dy with extraDown
        mobileImg.style.setProperty('--scroll-scale', lerp(1.6, 1, t));
        mobileImg.style.setProperty('--blur-val',  `${lerp(12, 0, t)}px`);
        mobileImg.style.opacity = op;
        mobileImg.style.visibility = visibility;
    }

    function scheduleUpdate() {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(updateBalduin);
    }

    scroller.addEventListener('scroll', scheduleUpdate, { passive: true });

    // Wait for CSS reflow to finish before measuring absolute offsets
    requestAnimationFrame(() => {
        setTimeout(() => {
            if (cancelled) return;
            const scrollerTop = scroller.getBoundingClientRect().top;
            panelLeftTop  = panelLeft.getBoundingClientRect().top  - scrollerTop + scroller.scrollTop;
            panelRightTop = panelRight.getBoundingClientRect().top - scrollerTop + scroller.scrollTop;
            distance      = Math.max(1, panelRightTop - panelLeftTop);
            
            updateBalduin();
        }, 100);
    });

    initCreationMobileSnap._cleanup = () => {
        cancelled = true;
        scroller.removeEventListener('scroll', scheduleUpdate);
        mobileImg.style.visibility = 'hidden';
    };
}


/* =============================================================================
   CONTACT SECTION — MOBILE SNAP RESTRUCTURE
   On mobile the two contact panels must be direct children of .scroll-container
   to register as individual scroll-snap targets. This function promotes them on
   mobile and restores them inside #contact on desktop.
============================================================================= */

function initContactMobileSnap() {
    const contact    = document.getElementById('contact');
    const panelLeft  = document.getElementById('contact-panel-left');
    const panelRight = document.getElementById('contact-panel-right');
    const scroller   = document.querySelector('.scroll-container');

    if (!contact || !panelLeft || !panelRight || !scroller) return;

    const isMobile   = window.innerWidth <= 768;
    const isPromoted = panelLeft.parentElement === scroller;

    if (isMobile && !isPromoted) {
        // Promote: insert both panels before #contact, then hide the wrapper
        scroller.insertBefore(panelLeft,  contact);
        scroller.insertBefore(panelRight, contact);
        contact.hidden = true;
    } else if (!isMobile && isPromoted) {
        // Restore: put panels back inside #contact in their original order
        contact.prepend(panelRight);
        contact.prepend(panelLeft);
        contact.hidden = false;
    }
}

/* =============================================================================
   UI SOUND EFFECTS
============================================================================= */

function initUISounds() {

    // Pre-load all six sounds. Each has OPUS (primary) + WAV (fallback).
    // The browser picks the first source it can decode.
    const soundNames = [
        'button_click', 'button_download', 'button_hover',
        'text_click',   'text_download',   'text_hover'
    ];

    // Each sound gets a pool of 3 Audio instances so rapid interactions
    // never cut off a playing sound. If all 3 slots are busy, the new
    // play is silently skipped rather than popping an existing one.
    const sounds = {};
    soundNames.forEach(name => {
        sounds[name] = Array.from({ length: 3 }, () => {
            const audio = document.createElement('audio');
            audio.preload = 'auto';
            audio.volume  = 0.6667;

            const opus = document.createElement('source');
            opus.src  = `assets/ui/${name}.opus`;
            opus.type = 'audio/ogg; codecs=opus';

            const ogg = document.createElement('source');
            ogg.src  = `assets/ui/${name}.ogg`;
            ogg.type = 'audio/ogg';

            const wav = document.createElement('source');
            wav.src  = `assets/ui/${name}.wav`;
            wav.type = 'audio/wav';

            audio.appendChild(opus);
            audio.appendChild(ogg);
            audio.appendChild(wav);
            return audio;
        });
    });

    function playUISound(name) {
        if (window.audioEngine?.isMuted) return;
        const pool = sounds[name];
        if (!pool) return;
        const free = pool.find(a => a.paused); // paused = not playing or already finished
        if (!free) return;                      // all 3 busy — skip rather than pop
        free.currentTime = 0;
        free.play().catch(() => {});
    }

    function hasDownload(el) {
        return el.hasAttribute('download');
    }

    // --- CTA buttons (.btn): hero, portfolio, contact ---
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => playUISound('button_hover'));
        btn.addEventListener('click',      () => playUISound(hasDownload(btn) ? 'button_download' : 'button_click'));
    });

    // --- Header control buttons: mute, language, settings ---
    ['mute-btn', 'lang-toggle', 'settings-toggle'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('mouseenter', () => playUISound('text_hover'));
        el.addEventListener('click',      () => playUISound('text_click'));
    });

    // --- Header nav links: Portfolio, Contact ---
    document.querySelectorAll('.header-nav a').forEach(link => {
        link.addEventListener('mouseenter', () => playUISound('text_hover'));
        link.addEventListener('click',      () => playUISound('text_click'));
    });

    // --- Language dropdown links (desktop header + mobile settings panel) ---
    document.querySelectorAll('#lang-menu a[data-lang], #settings-lang-menu a[data-lang]').forEach(link => {
        link.addEventListener('mouseenter', () => playUISound('text_hover'));
        link.addEventListener('click',      () => playUISound('text_click'));
    });

    // --- Footer links (text_download for PDF downloads, text_click otherwise) ---
    document.querySelectorAll('.footer-section a').forEach(link => {
        link.addEventListener('mouseenter', () => playUISound('text_hover'));
        link.addEventListener('click',      () => playUISound(hasDownload(link) ? 'text_download' : 'text_click'));
    });

    // --- Info links: citation (injected by i18n) + portfolio/contact label rows ---
    // Event delegation handles links that don't exist in the DOM when this runs.
    document.addEventListener('mouseover', e => {
        const link = e.target.closest('.info-link');
        if (link && !link.contains(e.relatedTarget)) playUISound('text_hover');
    });
    document.addEventListener('click', e => {
        const link = e.target.closest('.info-link');
        if (link) playUISound(hasDownload(link) ? 'text_download' : 'text_click');
    });

    // --- Settings panel toggle checkboxes ---
    document.querySelectorAll('.settings-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => playUISound('text_click'));
    });
}


/* =============================================================================
   PERPETUAL PRAYER
============================================================================= */

let isKyrie = true;

setInterval(() => {
  if (isKyrie) {
    console.log("Kyrie eleison");
  } else {
    console.log("Christe eleison");
  }
  
  // Flip the toggle for the next round
  isKyrie = !isKyrie; 
}, 3000);