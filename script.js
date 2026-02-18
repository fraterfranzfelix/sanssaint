document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Check for mouse support (prevents running on mobile touchscreens)
    const hasMouse = window.matchMedia('(pointer: fine)').matches;

    if (hasMouse) {
        const heroSection = document.getElementById('hero');
        const bgLayer = document.getElementById('hero-bg');
        const particlesBack = document.getElementById('particles-back');
        const particlesFront = document.getElementById('particles-front');

        heroSection.addEventListener('mousemove', (e) => {
            const x = e.clientX;
            const y = e.clientY;
            
            // Calculate center of screen
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            // Calculate distance from center (delta)
            const deltaX = x - centerX;
            const deltaY = y - centerY;

            // Apply Parallax: 
            // - Dividing by larger numbers means SLOWER movement (Background)
            // - Dividing by smaller numbers means FASTER movement (Foreground)
            // - Negative values move layers opposite to mouse (Natural feel)
            
            // Background moves very slowly (far away)
            bgLayer.style.transform = `translate(${deltaX / -50}px, ${deltaY / -50}px)`;

            // Back particles move slightly faster
            particlesBack.style.transform = `translate(${deltaX / -35}px, ${deltaY / -35}px)`;

            // Front particles move the fastest (closest to camera)
            particlesFront.style.transform = `translate(${deltaX / -15}px, ${deltaY / -15}px)`;
        });
    }
});