/* =============================================================================
   SOUND ENGINE
============================================================================= */

const audioEngine = {
    bgm: null,
    fadeInterval: null,
    maxVolume: 1.0, // You can lower this if the track is naturally too loud
    
    init() {
        this.bgm = document.createElement('audio');
        this.bgm.loop = true;
        // Start at full volume
        this.bgm.volume = this.maxVolume;

        const srcOpus = document.createElement('source');
        srcOpus.src = 'assets/lumen_gentium/lumen_gentium.opus';
        srcOpus.type = 'audio/ogg; codecs=opus';

        const srcM4a = document.createElement('source');
        srcM4a.src = 'assets/lumen_gentium/lumen_gentium.m4a';
        srcM4a.type = 'audio/mp4';

        const srcMp3 = document.createElement('source');
        srcMp3.src = 'assets/lumen_gentium/lumen_gentium.mp3';
        srcMp3.type = 'audio/mpeg';

        this.bgm.appendChild(srcOpus);
        this.bgm.appendChild(srcM4a);
        this.bgm.appendChild(srcMp3);
    },

    play() {
        if (this.bgm) {
            this.bgm.play().catch(err => console.warn("Audio playback blocked:", err));
        }
    },

    // NEW: Replaces the simple mute(isMuted) function
    toggleMute(isMuted) {
        if (!this.bgm) return;

        // Clear any existing fade so rapid button clicking doesn't break the math
        clearInterval(this.fadeInterval);

        const fadeDuration = 500;
        const steps = 20; // Update volume 20 times during the second (every 25ms)
        const stepTime = fadeDuration / steps;

        if (isMuted) {
            // --- FADE OUT & PAUSE ---
            const volumeStep = this.bgm.volume / steps;

            this.fadeInterval = setInterval(() => {
                if (this.bgm.volume - volumeStep > 0) {
                    this.bgm.volume -= volumeStep;
                } else {
                    // Fade complete
                    this.bgm.volume = 0;
                    this.bgm.pause(); // ACTUALLY stops decoding to save CPU/Battery!
                    clearInterval(this.fadeInterval);
                }
            }, stepTime);

        } else {
            // --- FADE IN & PLAY ---
            // We must start playing the audio first before we can fade it up
            this.play();
            const volumeStep = this.maxVolume / steps;

            this.fadeInterval = setInterval(() => {
                if (this.bgm.volume + volumeStep < this.maxVolume) {
                    this.bgm.volume += volumeStep;
                } else {
                    // Fade complete
                    this.bgm.volume = this.maxVolume;
                    clearInterval(this.fadeInterval);
                }
            }, stepTime);
        }
    }
};

audioEngine.init();
window.audioEngine = audioEngine;