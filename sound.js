/* =============================================================================
   SOUND ENGINE
============================================================================= */

const audioEngine = {
    bgm: null,
    kyrie: null,
    fadeInterval: null,
    maxVolume: 0.6667,
    isMuted: false,

    init() {
        // --- Lumen Gentium (intro track, plays once) ---
        this.bgm = document.createElement('audio');
        this.bgm.loop = false; // Plays through once, then hands off to Kyrie
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

        // When Lumen Gentium ends naturally, switch to Kyrie
        this.bgm.addEventListener('ended', () => this.switchToKyrie());

        // --- Sampler of Solomon: Kyrie (loop track) ---
        // Created now but not downloaded yet (preload="none").
        // Download begins after the user clicks the loading screen.
        this.kyrie = document.createElement('audio');
        this.kyrie.loop = true;
        this.kyrie.preload = 'none';
        this.kyrie.volume = this.maxVolume;

        const kOpus = document.createElement('source');
        kOpus.src  = 'assets/sampler_of_solomon/sampler_of_solomon_kyrie.opus';
        kOpus.type = 'audio/ogg; codecs=opus';

        const kM4a = document.createElement('source');
        kM4a.src  = 'assets/sampler_of_solomon/sampler_of_solomon_kyrie.m4a';
        kM4a.type = 'audio/mp4';

        const kMp3 = document.createElement('source');
        kMp3.src  = 'assets/sampler_of_solomon/sampler_of_solomon_kyrie.mp3';
        kMp3.type = 'audio/mpeg';

        this.kyrie.appendChild(kOpus);
        this.kyrie.appendChild(kM4a);
        this.kyrie.appendChild(kMp3);
    },

    play() {
        if (this.bgm) {
            this.bgm.play().catch(err => console.warn("Audio playback blocked:", err));
            // Trigger background download of Kyrie now that the user has
            // interacted with the page (browser autoplay policy satisfied).
            // Lumen Gentium is 2+ minutes long — plenty of time to buffer.
            this.preloadKyrie();
        }
    },

    // Starts downloading Kyrie in the background. Idempotent — safe to call
    // multiple times (e.g. on unmute), but only triggers the download once.
    preloadKyrie() {
        if (!this.kyrie || this.kyrie.preload === 'auto') return;
        this.kyrie.preload = 'auto';
        this.kyrie.load(); // Browser fetches at low priority in the background
    },

    // Called when Lumen Gentium reaches its natural end.
    // Swaps bgm to the Kyrie element and starts looping it.
    switchToKyrie() {
        if (!this.kyrie) return;

        const currentVolume = this.bgm ? this.bgm.volume : this.maxVolume;

        this.bgm = this.kyrie; // toggleMute now controls Kyrie automatically
        this.kyrie = null;

        this.bgm.volume = currentVolume;
        this.bgm.play().catch(err => console.warn("Kyrie playback blocked:", err));
    },

    // Fades bgm smoothly to any target volume (0 = pause, >0 = play).
    // Replaces the old binary toggleMute(isMuted).
    setVolume(target) {
        this.isMuted = (target === 0);
        if (!this.bgm) return;

        clearInterval(this.fadeInterval);

        if (target > 0 && this.bgm.paused) {
            this.play(); // Resume from 0 before fading up
        }

        const fadeDuration = 500;
        const steps = 20;
        const stepTime = fadeDuration / steps;
        const volumeStep = (target - this.bgm.volume) / steps;

        this.fadeInterval = setInterval(() => {
            const next = this.bgm.volume + volumeStep;
            const done = volumeStep >= 0 ? next >= target : next <= target;

            if (done) {
                this.bgm.volume = target;
                if (target === 0) this.bgm.pause();
                clearInterval(this.fadeInterval);
            } else {
                this.bgm.volume = Math.max(0, next);
            }
        }, stepTime);
    }
};

audioEngine.init();
window.audioEngine = audioEngine;
