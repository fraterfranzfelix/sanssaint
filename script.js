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
});


/* =============================================================================
   SHARED HELPERS
============================================================================= */

const angelWrapper = document.querySelector('.center-image-wrapper');

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
    if (layer.classList.contains('weapons-layer'))        return -25;
    if (layer.classList.contains('center-image-wrapper')) return -30;
    if (layer.classList.contains('particles-back'))       return -35;
    if (layer.classList.contains('bg-layer-creation'))    return  60;  // Inverted
    if (layer.classList.contains('bg-layer-eden'))        return  60;  // Inverted
    return  50;  // Default: hero background — inverted
}

/**
 * Applies a translate transform to a layer, correctly composing it on top
 * of whatever CSS base transform the element needs.
 *
 * The angel has two possible base states set by CSS:
 *   — Desktop (> 768px): translate(-50%, -50%)   — centered on both axes
 *   — Mobile  (≤ 768px): translate(-55%, -50%)   — shifted left (left: 0)
 *
 * Without this awareness, JS would overwrite the mobile CSS rule with -50%,
 * re-centering the angel and covering the panel text on narrow screens.
 *
 * Movement is also clamped so the parallax can never push the angel fully
 * out of frame. The angel is intended to partially obscure text — revealing
 * it through parallax is the experience — but it should never vanish entirely.
 */
function applyTransform(layer, xMove, yMove) {
    if (layer === angelWrapper) {
        const isMobileLayout = window.innerWidth <= 768;
        const baseX          = isMobileLayout ? '-55%' : '-50%';
        const clampedX       = Math.max(-40, Math.min(40, xMove));
        const clampedY       = Math.max(-30, Math.min(30, yMove));

        layer.style.transform =
            `translate(calc(${baseX} + ${clampedX}px), calc(-50% + ${clampedY}px))`;
    } else {
        layer.style.transform = `translate(${xMove}px, ${yMove}px)`;
    }
}


/* =============================================================================
   DESKTOP: MOUSE PARALLAX
============================================================================= */

function initMouseParallax() {

    const selectors = [
        '.parallax-layer',
        '.bg-layer-creation',
        '.bg-layer-eden',
        '.center-image-wrapper'
    ];

    document.addEventListener('mousemove', (e) => {

        const deltaX = e.clientX - window.innerWidth  / 2;
        const deltaY = e.clientY - window.innerHeight / 2;

        document.querySelectorAll(selectors.join(', ')).forEach(layer => {
            const speed = getSpeed(layer);
            applyTransform(layer, deltaX / speed, deltaY / speed);
        });
    });
}


/* =============================================================================
   MOBILE: TILT PARALLAX
============================================================================= */

function initTiltParallax() {

    // TODO: On iOS 13+, DeviceOrientationEvent.requestPermission() must be called
    // from a user gesture before this listener will fire. Wire this call up to the
    // loading screen's "Enter" button when it is built, then remove this comment.

    const selectors = [
        '.parallax-layer',
        '.bg-layer-creation',
        '.bg-layer-eden',
        '.center-image-wrapper'
    ];

    // Baseline tilt captured from the first sensor reading.
    // All subsequent movement is measured as a delta from this point, so the
    // user's natural resting angle (upright, lying down, etc.) always maps to
    // the "center" position — no awkward starting offset.
    let baseGamma = null;
    let baseBeta  = null;

    // Smoothed output values. Raw gyroscope data is jittery; blending each new
    // reading toward the previous value (low-pass filter) removes the noise and
    // makes the parallax feel fluid rather than nervous.
    let smoothX = 0;
    let smoothY = 0;
    const SMOOTHING = 0.12; // 0 = instant / no smoothing. 1 = never moves.

    // Tilt angles (degrees) beyond which the output is clamped. Halving this
    // doubles the sensitivity — the same physical tilt produces twice the
    // parallax displacement. Raise it again if movement feels too aggressive.
    const MAX_TILT = 10;

    window.addEventListener('deviceorientation', (e) => {

        // gamma: left/right tilt (−90° to +90°)
        // beta:  front/back tilt (−180° to +180°)
        const gamma = e.gamma ?? 0;
        const beta  = e.beta  ?? 0;

        // Capture baseline on first reading, then skip this frame.
        if (baseGamma === null) {
            baseGamma = gamma;
            baseBeta  = beta;
            return;
        }

        // Delta from calibrated resting position, clamped to the allowed range.
        const rawX = Math.max(-MAX_TILT, Math.min(MAX_TILT, gamma - baseGamma));
        const rawY = Math.max(-MAX_TILT, Math.min(MAX_TILT, beta  - baseBeta));

        // Normalise to −1 … +1, then scale to match the pixel range that the
        // mouse parallax produces when the cursor is at the screen edge.
        const normX  = rawX / MAX_TILT;
        const normY  = rawY / MAX_TILT;
        const rangeX = window.innerWidth  / 2;
        const rangeY = window.innerHeight / 2;

        // Low-pass filter: nudge smoothed value toward the new reading each frame.
        smoothX += (normX * rangeX - smoothX) * SMOOTHING;
        smoothY += (normY * rangeY - smoothY) * SMOOTHING;

        document.querySelectorAll(selectors.join(', ')).forEach(layer => {
            const speed = getSpeed(layer);
            applyTransform(layer, smoothX / speed, smoothY / speed);
        });
    });
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

    if (!headerCenter || !scrollContainer) return;

    // The hero wholemark sits at 50vh (vertical center of section 1).
    // The header's vertical midpoint is half of its 3rem height = 1.5rem.
    // When scrollTop reaches (50vh − 1.5rem), the two logos are at the same
    // screen position — this is the moment the center column expands and the
    // line splits, creating the illusion that the logo snapped into the header.
    // 1.5rem is computed from the live root font-size to stay correct across
    // browser zoom levels.
    function getRevealThreshold() {
        const rootFontSize   = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const headerMidpoint = 1.5 * rootFontSize;
        return (window.innerHeight * 0.5) - headerMidpoint;
    }

    function onScroll() {
        const scrollTop = scrollContainer.scrollTop;
        const threshold = getRevealThreshold();

        if (scrollTop >= threshold) {
            headerCenter.classList.add('is-visible');
        } else {
            headerCenter.classList.remove('is-visible');
        }
    }

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Run once on load in case the page is refreshed mid-scroll
}


/* =============================================================================
   HEADER: MUTE TOGGLE
============================================================================= */

function initMuteToggle() {

    const btn  = document.getElementById('mute-btn');
    const icon = document.getElementById('mute-icon');

    if (!btn || !icon) return;

    let muted = false;

    btn.addEventListener('click', () => {
        muted = !muted;

        // Swap icon source and accessible label
        icon.src = muted ? 'assets/08_sound_off_icon.svg' : 'assets/08_sound_on_icon.svg';
        icon.alt = muted ? 'Sound off' : 'Sound on';
        btn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');

        // TODO: connect to the audio system when sound is implemented.
        // e.g. audioEngine.mute(muted);
    });
}


/* =============================================================================
   HEADER: LANGUAGE DROPDOWN
============================================================================= */

function initLangDropdown() {

    const toggle = document.getElementById('lang-toggle');
    const menu   = document.getElementById('lang-menu');

    if (!toggle || !menu) return;

    // Open / close on toggle button click
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', isOpen);
    });

    // Close when clicking anywhere outside the dropdown
    document.addEventListener('click', () => {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', false);
    });

    // Handle language selection
    menu.querySelectorAll('a[data-lang]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const lang = link.dataset.lang;

            // Update the toggle label to reflect the current selection
            toggle.firstChild.textContent = lang.toUpperCase();

            menu.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', false);

            // TODO: trigger content translation when the French version is ready.
            // e.g. setLanguage(lang);
        });
    });
}