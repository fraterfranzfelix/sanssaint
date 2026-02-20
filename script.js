document.addEventListener('DOMContentLoaded', () => {

    const hasMouse = window.matchMedia('(pointer: fine)').matches;

    if (hasMouse) {
        initMouseParallax();
    } else {
        initTiltParallax();
    }
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
 *   — Mobile  (≤ 768px): translate(-33.33%, -50%) — shifted left (left: 0)
 *
 * Without this awareness, the JS would overwrite the mobile CSS rule with -50%,
 * re-centering the angel and covering the panel text on narrow screens.
 *
 * Movement is also clamped here so the parallax can never push the angel fully
 * out of frame. The angel is intended to partially obscure text — revealing it
 * through parallax is the experience — but it should never vanish entirely.
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