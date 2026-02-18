document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Check if user has a mouse (disable on mobile)
    const hasMouse = window.matchMedia('(pointer: fine)').matches;

    if (hasMouse) {
        
        // 2. Define the layers we want to move
        // We look for the generic class AND specific background classes
        const selectors = [
            '.parallax-layer', 
            '.bg-layer-creation', 
            '.bg-layer-eden',
            '.particles-back',
            '.particles-front'
        ];
        
        // 3. Global Mouse Move Listener
        // We listen on the whole document so it works for all sections
        document.addEventListener('mousemove', (e) => {
            
            const x = e.clientX;
            const y = e.clientY;
            
            // Calculate distance from center of screen
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            const deltaX = x - centerX;
            const deltaY = y - centerY;

            // Find all valid layers currently in the DOM
            const layers = document.querySelectorAll(selectors.join(', '));

            layers.forEach(layer => {
                const speed = getSpeed(layer);
                const xMove = deltaX / speed;
                const yMove = deltaY / speed;

                layer.style.transform = `translate(${xMove}px, ${yMove}px)`;
            });
        });
    }
});

/**
 * Helper: Determines how fast a layer should move based on its class.
 * Higher number = Slower movement (Further away)
 * Lower number = Faster movement (Closer)
 */
function getSpeed(layer) {
    if (layer.classList.contains('particles-front')) return -15; // Closest
    if (layer.classList.contains('particles-back')) return -35;
    if (layer.classList.contains('bg-layer-creation')) return -60; // Furthest (Section 2)
    if (layer.classList.contains('bg-layer-eden')) return -60;    // Furthest (Section 2)
    return -50; // Default for Hero Background
}