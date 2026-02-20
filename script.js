document.addEventListener('DOMContentLoaded', () => {

    // Disable parallax on touch devices (no mouse cursor to track)
    const hasMouse = window.matchMedia('(pointer: fine)').matches;

    if (hasMouse) {

        // Layers to move. The angel wrapper is handled separately below
        // because it needs its centering transform (-50%/-50%) preserved.
        const selectors = [
            '.parallax-layer',
            '.bg-layer-creation',
            '.bg-layer-eden',
            '.center-image-wrapper'
        ];

        const angelWrapper = document.querySelector('.center-image-wrapper');

        document.addEventListener('mousemove', (e) => {

            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const deltaX  = e.clientX - centerX;
            const deltaY  = e.clientY - centerY;

            const layers = document.querySelectorAll(selectors.join(', '));

            layers.forEach(layer => {
                const speed = getSpeed(layer);
                const xMove = deltaX / speed;
                const yMove = deltaY / speed;

                if (layer === angelWrapper) {
                    // Compose parallax movement on top of the CSS centering transform
                    // so the image stays centered while still reacting to mouse input.
                    layer.style.transform =
                        `translate(calc(-50% + ${xMove}px), calc(-50% + ${yMove}px))`;
                } else {
                    layer.style.transform = `translate(${xMove}px, ${yMove}px)`;
                }
            });
        });
    }
});

/**
 * Returns the parallax speed divisor for a given layer.
 * Higher value  → slower movement (feels further away).
 * Lower value   → faster movement (feels closer).
 * Negative values invert direction for a counter-parallax effect.
 */
function getSpeed(layer) {
    if (layer.classList.contains('particles-front'))      return -15;  // Closest
    if (layer.classList.contains('weapons-layer'))        return -25;
    if (layer.classList.contains('center-image-wrapper')) return -30;  // Angel — between weapons and back particles
    if (layer.classList.contains('particles-back'))       return -35;
    if (layer.classList.contains('bg-layer-creation'))    return -60;
    if (layer.classList.contains('bg-layer-eden'))        return -60;
    return -50; // Default: hero background
}