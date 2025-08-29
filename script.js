'use strict';

// Editable settings
const SETTINGS = {
    giftLink: 'https://example.com/your-gift-card',
    finalMessage: 'Happy Birthday, Marija! 🌸🐝 May your day be as beautiful as this garden.',
    personalNote: 'with <3 -Jere', // Optional extra line below the title
};

// Utility
/** @param {Element} el */
function safeShow(el) { el.classList.add('visible'); }
/** @param {Element} el */
function safeHide(el) { el.classList.remove('visible'); }
/** @param {Element} el */
function bounce(el) { el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 250, easing: 'ease-out' }); }
/** @param {DOMRect} a @param {DOMRect} b */
function rectsOverlap(a, b) { return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom); }

/**
 * Show text with a delay and start playing song
 * @param {string} text - Text to display
 * @param {number} delayMs - Delay before showing text
 * @param {Element} targetElement - Element to update with text
 */
function showDelayedTextWithSong(text, delayMs, targetElement) {
    setTimeout(() => {
        if (targetElement) {
            targetElement.textContent = text;
            targetElement.classList.remove('attention');
            void targetElement.offsetWidth; // Force reflow
            targetElement.classList.add('attention');
        }
        
        // Start playing song with gradual volume increase
        audio.playSongWithDelay(0, 35);
    }, delayMs);
}

// Scene control
const scenes = ['scene-intro', 'scene-flowers', 'scene-watering', 'scene-butterflies', 'scene-grand'];
let currentScene = 'scene-intro';
function goTo(sceneId) {
    // Hide all speech bubbles first
    scenes.forEach(function(id) { 
        const scene = document.getElementById(id);
        scene.classList.remove('active');
        const bubble = scene.querySelector('.bee-speech-bubble');
        if (bubble) {
            bubble.classList.remove('visible');
        }
    });
    document.getElementById(sceneId).classList.add('active');
    currentScene = sceneId;
}

// Audio system
class AudioManager {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.noiseNode = null;
        this.pouring = false;
        this.bgInterval = null;
        this.songAudio = null;
        this.songGain = null;
        this.bgAmbianceAudio = null;
        this.bgAmbianceGain = null;
    }
    init() {
        if (this.context) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioCtx({ latencyHint: 'interactive' });
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = 0.15;
        this.masterGain.connect(this.context.destination);
    }
    resume() { if (this.context && this.context.state !== 'running') { this.context.resume(); } }
    playChime() {
        if (!this.context) return;
        const now = this.context.currentTime;
        const o1 = this.context.createOscillator();
        const g1 = this.context.createGain();
        o1.type = 'sine'; o1.frequency.setValueAtTime(650, now);
        g1.gain.setValueAtTime(0.0001, now);
        g1.gain.exponentialRampToValueAtTime(0.4, now + 0.01);
        g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        o1.connect(g1).connect(this.masterGain);
        o1.start(now);
        o1.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
        o1.stop(now + 0.4);
    }
    playBloom() {
        if (!this.context) return;
        const now = this.context.currentTime;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(520, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.connect(gain).connect(this.masterGain);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.18);
        osc.start(now); osc.stop(now + 0.32);
    }
    startPour() {
        if (!this.context || this.pouring) return; this.pouring = true;
        const bufferSize = 2 * this.context.sampleRate;
        const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { output[i] = (Math.random() * 2 - 1) * 0.4; }
        const noise = this.context.createBufferSource(); noise.buffer = noiseBuffer; noise.loop = true;
        const bp = this.context.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 0.8;
        const g = this.context.createGain(); g.gain.value = 0.08;
        noise.connect(bp).connect(g).connect(this.masterGain); noise.start();
        this.noiseNode = noise;
    }
    stopPour() { if (this.noiseNode) { try { this.noiseNode.stop(); } catch(e){} this.noiseNode.disconnect(); this.noiseNode = null; } this.pouring = false; }
    playFlutter() {
        if (!this.context) return;
        const now = this.context.currentTime;
        const osc = this.context.createOscillator(); const g = this.context.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(40, now);
        const trem = this.context.createOscillator(); const tremGain = this.context.createGain();
        trem.type = 'sine'; trem.frequency.value = 14; tremGain.gain.value = 40; trem.connect(tremGain).connect(osc.frequency);
        g.gain.value = 0.12;
        osc.connect(g).connect(this.masterGain);
        osc.start(now); trem.start(now);
        osc.stop(now + 0.25); trem.stop(now + 0.25);
    }
    playFanfare() {
        if (!this.context) return;
        const now = this.context.currentTime;
        const notes = [660, 880, 990];
        notes.forEach(function(freq, i) {
            const o = audio.context.createOscillator(); const g = audio.context.createGain();
            o.type = 'triangle'; o.frequency.value = freq;
            g.gain.setValueAtTime(0.0001, now + i * 0.04);
            g.gain.exponentialRampToValueAtTime(0.2, now + i * 0.04 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 0.5);
            o.connect(g).connect(audio.masterGain); o.start(now + i * 0.04); o.stop(now + i * 0.7);
        });
    }
    startBackground() {
        if (!this.context || this.bgInterval) return;
        const playTick = () => {
            if (!this.context) return;
            const now = this.context.currentTime;
            const o = this.context.createOscillator(); const g = this.context.createGain();
            o.type = 'sine'; o.frequency.value = 540 + Math.random() * 40;
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
            o.connect(g).connect(this.masterGain); o.start(now); o.stop(now + 0.24);
        };
        this.bgInterval = setInterval(playTick, 1200);
    }
    stopBackground() { if (this.bgInterval) { clearInterval(this.bgInterval); this.bgInterval = null; } }
    
    async playSongWithDelay(delayMs = 0, startTimeSeconds = 35) {
        if (!this.context) return;
        
        // Wait for the delay
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        try {
            // Create audio element
            this.songAudio = new Audio('song.mp4');
            this.songAudio.crossOrigin = 'anonymous';
            this.songAudio.currentTime = startTimeSeconds;
            
            // Create audio context nodes
            const source = this.context.createMediaElementSource(this.songAudio);
            this.songGain = this.context.createGain();
            
            // Start with very low volume
            this.songGain.gain.value = 0.01;
            
            // Connect audio chain
            source.connect(this.songGain);
            this.songGain.connect(this.context.destination);
            
            // Start playing
            await this.songAudio.play();
            
            // Gradually increase volume over 10 seconds
            const targetVolume = 0.6;
            const fadeInDuration = 10; // seconds
            const now = this.context.currentTime;
            
            this.songGain.gain.exponentialRampToValueAtTime(targetVolume, now + fadeInDuration);
            
        } catch (error) {
            console.error('Failed to play song:', error);
        }
    }
    
    stopSong() {
        if (this.songAudio) {
            this.songAudio.pause();
            this.songAudio = null;
        }
        if (this.songGain) {
            this.songGain.disconnect();
            this.songGain = null;
        }
    }
    
    async startBackgroundAmbiance() {
        console.log('startBackgroundAmbiance called, context:', !!this.context, 'existing audio:', !!this.bgAmbianceAudio);
        
        if (!this.context) {
            console.error('Audio context not initialized');
            return;
        }
        
        if (this.bgAmbianceAudio) {
            console.log('Background ambiance already playing');
            return;
        }
        
        try {
            console.log('Creating background ambiance audio element...');
            
            // Create audio element for background ambiance
            this.bgAmbianceAudio = new Audio('bg-ambiance.mp3');
            this.bgAmbianceAudio.crossOrigin = 'anonymous';
            this.bgAmbianceAudio.loop = true; // Enable looping
            this.bgAmbianceAudio.volume = 0.3; // Set volume directly on audio element as fallback
            
            console.log('Audio element created, setting up Web Audio API...');
            
            // Create audio context nodes
            const source = this.context.createMediaElementSource(this.bgAmbianceAudio);
            this.bgAmbianceGain = this.context.createGain();
            
            // Set fairly low volume
            this.bgAmbianceGain.gain.value = 0.3;
            
            // Connect audio chain
            source.connect(this.bgAmbianceGain);
            this.bgAmbianceGain.connect(this.context.destination);
            
            console.log('Audio chain connected, attempting to play...');
            
            // Start playing
            await this.bgAmbianceAudio.play();
            
            console.log('Background ambiance started successfully');
            
        } catch (error) {
            console.error('Failed to play background ambiance:', error);
            console.error('Error details:', error.message);
            
            // Fallback: try playing without Web Audio API
            try {
                console.log('Trying fallback approach...');
                this.bgAmbianceAudio = new Audio('bg-ambiance.mp3');
                this.bgAmbianceAudio.loop = true;
                this.bgAmbianceAudio.volume = 0.3;
                await this.bgAmbianceAudio.play();
                console.log('Fallback background ambiance started');
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
        }
    }
    
    stopBackgroundAmbiance() {
        if (this.bgAmbianceAudio) {
            this.bgAmbianceAudio.pause();
            this.bgAmbianceAudio = null;
        }
        if (this.bgAmbianceGain) {
            this.bgAmbianceGain.disconnect();
            this.bgAmbianceGain = null;
        }
    }
}

const audio = new AudioManager();

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Intro
    function startGame() {
        console.log('Start button clicked!');
        audio.init(); 
        audio.resume(); 
        audio.playChime(); 
        audio.startBackground();
        // Background music already started on initial Start button
        goTo('scene-flowers');
        setupFlowers();
    }
    const startBtnEl = document.getElementById('btn-start');
    startBtnEl.addEventListener('click', function() { if (startBtnEl.dataset.role === 'start-game') startGame(); });
    startBtnEl.addEventListener('touchend', function(e) { e.preventDefault(); if (startBtnEl.dataset.role === 'start-game') startGame(); });

    // Next buttons
    document.getElementById('btn-flowers-next').addEventListener('click', function() {
        audio.playChime();
        goTo('scene-watering');
        setupWatering();
    });
    document.getElementById('btn-watering-next').addEventListener('click', function() {
        const btn = this;
        const sceneId = 'scene-watering';
        const bubble = document.querySelector('#' + sceneId + ' .bee-speech-bubble');
        const dialog = bubble ? bubble.querySelector('.dialog') : null;

        // First click: show gag, hide button, then re-show after 3s to proceed
        if (btn.dataset.stage !== 'ready') {
            audio.playChime();
            safeHide(btn);
            if (dialog) {
                dialog.textContent = 'I asked Jere to help and he watered my wings instead... Oops! I knew you\'d be the real green thumb!';
                dialog.classList.remove('attention');
                void dialog.offsetWidth;
                dialog.classList.add('attention');
            }
            showSpeechBubble(sceneId);
            setTimeout(function() {
                btn.textContent = 'Next';
                btn.dataset.stage = 'ready';
                safeShow(btn);
                bounce(btn);
            }, 3000);
            return;
        }

        // Second click when staged: proceed to cocoons
        audio.playChime();
        btn.dataset.stage = '';
        goTo('scene-butterflies');
        setupButterflies();
    });
    document.getElementById('btn-butterfly-next').addEventListener('click', function() {
        audio.playChime();
        goTo('scene-grand');
        setupGrand();
    });

    // Final button starts goodbye sequence
    document.getElementById('btn-open-link').addEventListener('click', function() {
        startGoodbyeSequence();
    });



    // Set editable message
    document.getElementById('qr-title').textContent = SETTINGS.finalMessage;
    if (SETTINGS.personalNote) {
        const note = document.createElement('div');
        note.textContent = SETTINGS.personalNote;
        note.style.marginTop = '4px';
        note.style.fontSize = '14px';
        note.style.opacity = '0.8';
        document.getElementById('qr-card').insertBefore(note, document.getElementById('qr'));
    }

    // Credits
    // document.getElementById('credits').textContent = 'Marija's Birthday Garden • Bella the Bee';
    
    // Add click to show speech again if hidden
    document.addEventListener('keydown', function(e) {
        if (e.key === 'h' || e.key === 'H') {
            document.querySelectorAll('.speech.hidden').forEach(function(speech) {
                speech.classList.remove('hidden');
            });
        }
    });

    // Intro scene setup - bee and dialog start hidden, show on Start button click
    const beeIntro = document.querySelector('#scene-intro .bee');
    const introBubble = document.getElementById('intro-bubble');
    const introDialog = introBubble ? introBubble.querySelector('.dialog') : null;
    const startBtn = document.getElementById('btn-start');
    
    if (beeIntro && introBubble && introDialog && startBtn) {
        // Hide bee and speech bubble initially
        beeIntro.style.transform = 'translate(-150%, -60%) scale(0.6) rotate(-10deg)';
        beeIntro.style.opacity = '0';
        introBubble.classList.remove('visible');
        
        // Set initial start button state
        startBtn.dataset.role = 'start';
        startBtn.textContent = 'Start';
        
        // Function to begin the intro sequence
        function beginIntroSequence() {
            startBtn.classList.remove('visible');
            
            // Longer delay to let background brighten first
            const flyInDelay = 1500; // ms
            setTimeout(function() {
                requestAnimationFrame(function() {
                    beeIntro.classList.add('bee-fly-in');
                });
            }, flyInDelay);

            // After fly-in completes, begin staged messages and bounce
            const flyInDuration = 1200; // must match CSS
            setTimeout(function() {
                // Switch to continuous bounce
                beeIntro.classList.remove('bee-fly-in');
                beeIntro.style.transform = '';
                beeIntro.style.opacity = '';
                beeIntro.classList.add('bee-bounce');

                // Stage the intro dialog into multiple lines with manual progression
                const messages = [
                    "Hi Marija! I'm Bella the Birthday Bee.",
                    'Today is YOUR birthday! But oh no… the garden has not bloomed yet.',
                    "Without your magic, the flowers won't wake up. Will you help me?"
                ];

                let messageIdx = 0;
                
                // Change button role to next for progression
                startBtn.dataset.role = 'next';
                startBtn.textContent = 'Next';
                
                function showCurrentMessage() {
                    if (messageIdx >= messages.length) {
                        return;
                    }
                    
                    // Show current message
                    introBubble.classList.add('visible');
                    introDialog.textContent = messages[messageIdx];
                    introDialog.classList.remove('attention');
                    void introDialog.offsetWidth; // reflow to restart animation
                    introDialog.classList.add('attention');
                    
                    // Reveal the HUD button (as Next) after first message displays
                    if (messageIdx === 0) {
                        setTimeout(function() { 
                            safeShow(startBtn);
                            bounce(startBtn);
                        }, 1500);
                    }
                    
                    // If this is the last message, change the button to start game
                    if (messageIdx === messages.length - 1) {
                        startBtn.dataset.role = 'start-game';
                        startBtn.textContent = "Yes, I'll help!";
                        bounce(startBtn);
                    }
                    
                    messageIdx++;
                }
                
                // Next button click handler
                function handleNext() { audio.playChime(); showCurrentMessage(); }
                startBtn.addEventListener('click', function() { if (startBtn.dataset.role === 'next') handleNext(); });
                startBtn.addEventListener('touchend', function(e) { e.preventDefault(); if (startBtn.dataset.role === 'next') handleNext(); });

                // Start first message after a tiny beat
                setTimeout(showCurrentMessage, 200);
            }, flyInDelay + flyInDuration);
        }
        
        // Handle initial Start button click
        startBtn.addEventListener('click', function() { 
            if (startBtn.dataset.role === 'start') {
                audio.init(); 
                audio.resume(); 
                audio.playChime(); 
                audio.startBackground();
                audio.startBackgroundAmbiance(); // Start background music on initial Start button
                // Trigger background fade to bright immediately
                document.body.classList.add('game-started');
                beginIntroSequence();
            }
        });
        startBtn.addEventListener('touchend', function(e) { 
            e.preventDefault(); 
            if (startBtn.dataset.role === 'start') {
                audio.init(); 
                audio.resume(); 
                audio.playChime(); 
                audio.startBackground();
                audio.startBackgroundAmbiance(); // Start background music on initial Start button
                // Trigger background fade to bright immediately
                document.body.classList.add('game-started');
                beginIntroSequence();
            }
        });
    }

    // Goodbye sequence functions
    function startGoodbyeSequence() {
        // Step 1: Hide qr-title with smooth transition
        hideQrTitle();
        
        // Step 2: Show bee's final goodbye message
        setTimeout(() => {
            showFinalGoodbyeBee();
        }, 500);
    }

    function hideQrTitle() {
        const qrTitle = document.getElementById('qr-title');
        if (qrTitle) {
            qrTitle.style.transition = 'opacity 800ms ease-out, transform 800ms ease-out';
            qrTitle.style.opacity = '0';
            qrTitle.style.transform = 'translateY(-20px)';
        }
    }

    function showFinalGoodbyeBee() {
        const grandScene = document.getElementById('scene-grand');
        const bubble = grandScene.querySelector('.bee-speech-bubble');
        const dialog = bubble.querySelector('.dialog');
        
        if (dialog) {
            dialog.textContent = 'Thank you for bringing life to this garden, Marija! You made this the most beautiful birthday celebration. Now go enjoy your special gift! 🌸✨';
            dialog.classList.remove('attention');
            void dialog.offsetWidth;
            dialog.classList.add('attention');
        }
        
        bubble.classList.add('visible');
        
        // Keep the speech bubble visible for 3 seconds, then fly away
        setTimeout(() => {
            beeFliesAway();
        }, 3000);
    }

    function beeFliesAway() {
        const grandScene = document.getElementById('scene-grand');
        const bee = grandScene.querySelector('.bee');
        const bubble = grandScene.querySelector('.bee-speech-bubble');
        
        // Hide speech bubble
        if (bubble) {
            bubble.style.transition = 'opacity 500ms ease-out';
            bubble.style.opacity = '0';
        }
        
        // Animate bee flying off to the right
        if (bee) {
            bee.style.transition = 'transform 2s ease-in, opacity 2s ease-in';
            bee.style.transform = 'translateX(150vw) translateY(-30px) rotate(15deg) scale(0.8)';
            bee.style.opacity = '0';
        }
        
        // Start kakola image sequence after bee flies away
        setTimeout(() => {
            startKakolaSequence();
        }, 2200);
    }

    function startKakolaSequence() {
        // Hide the current scene content
        const grandScene = document.getElementById('scene-grand');
        grandScene.style.transition = 'opacity 1s ease-out';
        grandScene.style.opacity = '0';
        
        setTimeout(() => {
            // Create kakola display container
            createKakolaDisplay();
        }, 1000);
    }

    function createKakolaDisplay() {
        // Create new scene for kakola images
        const app = document.getElementById('app');
        const kakolaScene = document.createElement('div');
        kakolaScene.id = 'kakola-scene';
        kakolaScene.style.cssText = `
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, #fdf2f8, #f3e8ff);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 1s ease-in;
            z-index: 10;
        `;
        
        const imageContainer = document.createElement('div');
        imageContainer.id = 'kakola-images';
        imageContainer.style.cssText = `
            position: relative;
            width: 90vw;
            max-width: 400px;
            height: 60vh;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        kakolaScene.appendChild(imageContainer);
        app.appendChild(kakolaScene);
        
        // Fade in the kakola scene
        setTimeout(() => {
            kakolaScene.style.opacity = '1';
            showKakolaImagesSequence();
        }, 100);
    }

    function showKakolaImagesSequence() {
        const imageContainer = document.getElementById('kakola-images');
        const imageNames = ['kakola1.jpg', 'kakola2.jpg', 'kakola3.jpg'];
        let currentIndex = 0;
        
        function showNextImage() {
            if (currentIndex < imageNames.length) {
                const img = document.createElement('img');
                img.src = imageNames[currentIndex];
                img.style.cssText = `
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    opacity: 0;
                    transform: scale(0.9) translateY(20px);
                    transition: opacity 1s ease-out, transform 1s ease-out;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                `;
                
                imageContainer.appendChild(img);
                
                // Animate image in
                setTimeout(() => {
                    img.style.opacity = '1';
                    img.style.transform = 'scale(1) translateY(0)';
                }, 100);
                
                currentIndex++;
                
                // Show next image after delay, or show final message if done
                if (currentIndex < imageNames.length) {
                    setTimeout(showNextImage, 2000);
                } else {
                    setTimeout(showFinalMessage, 2000);
                }
            }
        }
        
        showNextImage();
    }

    function showFinalMessage() {
        const kakolaScene = document.getElementById('kakola-scene');
        
        const messageBox = document.createElement('div');
        messageBox.id = 'final-message-box';
        messageBox.style.cssText = `
            position: absolute;
            bottom: 15vh;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255,255,255,0.95);
            border: 2px solid var(--pink);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            opacity: 0;
            transform: translateX(-50%) translateY(30px) scale(0.9);
            transition: opacity 1s ease-out, transform 1s ease-out;
            max-width: 85vw;
        `;
        
        const messageText = document.createElement('div');
        messageText.style.cssText = `
            font-size: 18px;
            font-weight: 600;
            color: var(--ink);
            margin-bottom: 16px;
            line-height: 1.4;
        `;
        messageText.textContent = "Let's have a relaxing Sunday after a fantastic weekend at Kakola Spa.";
        
        const nextButton = document.createElement('button');
        nextButton.className = 'btn visible';
        nextButton.textContent = 'Next';
        nextButton.style.margin = '0 auto';
        nextButton.addEventListener('click', showTheEndMessage);
        
        messageBox.appendChild(messageText);
        messageBox.appendChild(nextButton);
        kakolaScene.appendChild(messageBox);
        
        // Animate message box in
        setTimeout(() => {
            messageBox.style.opacity = '1';
            messageBox.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        }, 200);
    }

    function showTheEndMessage() {
        const messageBox = document.getElementById('final-message-box');
        const messageText = messageBox.querySelector('div');
        const nextButton = messageBox.querySelector('button');
        
        // Fade out current content
        messageText.style.transition = 'opacity 600ms ease-out';
        nextButton.style.transition = 'opacity 600ms ease-out';
        messageText.style.opacity = '0';
        nextButton.style.opacity = '0';
        
        setTimeout(() => {
            // Replace with final message
            messageText.textContent = 'The End, hope you enjoyed!';
            messageText.style.fontSize = '24px';
            messageText.style.fontWeight = '700';
            messageText.style.color = 'var(--pink-strong)';
            
            // Hide the button
            nextButton.style.display = 'none';
            
            // Fade in new content
            setTimeout(() => {
                messageText.style.opacity = '1';
            }, 100);
        }, 600);
    }

});

// Position loop for bee speech bubble
function updateBubblePosition() {
    const activeScene = document.querySelector('.scene.active');
    if (!activeScene) {
        requestAnimationFrame(updateBubblePosition);
        return;
    }

    const bee = activeScene.querySelector('.bee');
    const bubble = activeScene.querySelector('.bee-speech-bubble');

    if (bee && bubble) {
        const beeRect = bee.getBoundingClientRect();
        const containerEl = bubble.offsetParent || activeScene.querySelector('.grid') || document.getElementById('app');
        const containerRect = containerEl.getBoundingClientRect();
        const bubbleRect = bubble.getBoundingClientRect();

        // Bee center relative to container
        const beeCenterX = beeRect.left - containerRect.left + beeRect.width / 2;
        const beeTop = beeRect.top - containerRect.top;
        const beeBottom = beeRect.bottom - containerRect.top;

        const bubbleWidth = bubbleRect.width || 260; // fallback
        const bubbleHeight = bubbleRect.height || 120; // fallback
        const margin = 12; // screen margin

        // Try above first if there's room
        const hasRoomAbove = beeTop - 30 - bubbleHeight >= 0;

        let bubbleCenterX = beeCenterX;
        let bubbleY; // this is the anchor line for top, adjusted by transform via CSS
        let pointerClass;

        if (hasRoomAbove) {
            // Bubble above: set anchor line to be bubble bottom
            bubbleY = beeTop - 30;
            pointerClass = 'below';
        } else {
            // Bubble below: set anchor line to be bubble top
            bubbleY = beeBottom + 30;
            pointerClass = 'above';
        }

        // Clamp horizontally within container (center-based clamping)
        const minCenterX = margin + bubbleWidth / 2;
        const maxCenterX = containerRect.width - margin - bubbleWidth / 2;
        const clampedCenterX = Math.max(minCenterX, Math.min(maxCenterX, bubbleCenterX));

        // Position bubble (left is center coordinate; CSS uses translateX(-50%) to center)
        bubble.style.left = clampedCenterX + 'px';
        bubble.style.top = bubbleY + 'px';

        // Offset pointer so it still points to bee center even when clamped
        const rawDeltaX = bubbleCenterX - clampedCenterX; // desired pointer offset from bubble center
        const maxPointer = bubbleWidth / 2 - 16; // keep arrow within bubble
        const pointerOffset = Math.max(-maxPointer, Math.min(maxPointer, rawDeltaX));
        bubble.style.setProperty('--pointer-offset', pointerOffset + 'px');

        // Set pointer direction class
        bubble.className = bubble.className.replace(/pointer-(above|below)/g, '');
        bubble.classList.add('pointer-' + pointerClass);
    }

    requestAnimationFrame(updateBubblePosition);
}
requestAnimationFrame(updateBubblePosition);

// Speech bubble helper function
function showSpeechBubble(sceneId) {
    const scene = document.getElementById(sceneId);
    if (!scene) return;
    
    const bubble = scene.querySelector('.bee-speech-bubble');
    if (bubble) {
        bubble.style.display = '';
        // Add a small delay to ensure positioning is calculated correctly
        setTimeout(() => {
            bubble.classList.add('visible');
            const dialog = bubble.querySelector('.dialog');
            if (dialog) {
                dialog.classList.remove('attention');
                // force reflow to restart animation
                void dialog.offsetWidth;
                dialog.classList.add('attention');
            }
        }, 100);
    }
}



// Flowers scene
function setupFlowers() {
    showSpeechBubble('scene-flowers');
    const container = document.getElementById('flowers-area');
    container.innerHTML = '';
    const positions = [
        [18, 160], [34, 165], [52, 162], [68, 168], [82, 160], [26, 170], [50, 175], [74, 168]
    ];
    let bloomed = 0; const total = positions.length;
    positions.forEach(function(pos) {
        const node = createFlower({ xPercent: pos[0], yPercent: pos[1], asBud: true });
        container.appendChild(node);
        function handleFlowerTap() {
            if (node.classList.contains('bloom')) return;
            node.classList.remove('bud'); node.classList.add('bloom');
            spawnSparkles(node);
            audio.playBloom();
            bloomed += 1;
            console.log('Flower bloomed! Count:', bloomed, 'of', total);
            if (bloomed === total) {
                console.log('All flowers bloomed! Showing next button.');
                const flowersText = document.getElementById('flowers-text');
                flowersText.textContent = 'Wow, the first flowers are awake! You are amazing, Marija!';
                flowersText.classList.remove('attention');
                void flowersText.offsetWidth;
                flowersText.classList.add('attention');
                const nextBtn = document.getElementById('btn-flowers-next');
                console.log('Next button element:', nextBtn);
                if (nextBtn) {
                    safeShow(nextBtn); 
                    bounce(nextBtn);
                } else {
                    console.error('btn-flowers-next not found!');
                }
            }
        }
        node.addEventListener('click', handleFlowerTap);
        node.addEventListener('touchend', function(e) { e.preventDefault(); handleFlowerTap(); });
    });
}

function createFlower(opts) {
    const x = opts.xPercent; const y = opts.yPercent; const asBud = !!opts.asBud;
    const wrap = document.createElement('div'); wrap.className = 'flower ' + (asBud ? 'bud' : 'bloom'); wrap.style.left = x + '%'; wrap.style.top = y + '%';
    wrap.innerHTML = getFlowerSVG();
    return wrap;
}

function getFlowerSVG() {
    return "<svg viewBox='0 0 64 64' width='64' height='64' aria-hidden='true'>" +
        "<defs><radialGradient id='petal' cx='50%' cy='50%' r='50%'><stop offset='0%' stop-color='#fff'/><stop offset='100%' stop-color='var(--pink)'/></radialGradient></defs>" +
        "<g>" +
            "<circle cx='32' cy='12' r='10' fill='var(--pink)'/>" +
            "<circle cx='52' cy='26' r='10' fill='var(--lilac)'/>" +
            "<circle cx='42' cy='48' r='10' fill='var(--mint)'/>" +
            "<circle cx='22' cy='48' r='10' fill='var(--yellow)'/>" +
            "<circle cx='12' cy='26' r='10' fill='var(--lilac)'/>" +
            "<circle cx='32' cy='32' r='10' fill='#ffd166' stroke='#a86b00' stroke-width='2'/>" +
        "</g></svg>";
}

function spawnSparkles(element) {
    const parent = document.querySelector('.scene.active');
    const rect = element.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    
    for (let i = 0; i < 6; i++) {
        const s = document.createElement('div'); s.className = 'sparkle';
        s.style.left = (rect.left - parentRect.left + rect.width/2) + (Math.random() * 40 - 20) + 'px';
        s.style.top = (rect.top - parentRect.top + rect.height/2) + (Math.random() * 40 - 20) + 'px';
        parent.appendChild(s);
        setTimeout(function() { s.remove(); }, 720);
    }
}

// Watering scene
function setupWatering() {
    showSpeechBubble('scene-watering');
    const area = document.getElementById('watering-area'); area.innerHTML = '';
    const soilPositions = [[22, 160],[50, 165],[78, 158]];
    const soils = soilPositions.map(function(p) { const d = document.createElement('div'); d.className = 'soil dry'; d.style.left = p[0] + '%'; d.style.top = p[1] + '%'; area.appendChild(d); return d; });

    const can = document.createElement('div'); can.className = 'watering-can'; can.style.left = '15%'; can.style.top = '140%';
    can.innerHTML = getCanSVG();
    area.appendChild(can);

    let watering = false; let wateredCount = 0;
    let dropletInterval = null;

    function spawnWaterDroplet() {
        const droplet = document.createElement('div');
        droplet.className = 'water-droplet';
        droplet.style.left = (parseFloat(can.style.left) + 5 + Math.random() * 3 - 1.5) + '%';
        droplet.style.top = (parseFloat(can.style.top) + 8) + '%';
        area.appendChild(droplet);
        setTimeout(() => droplet.remove(), 850);
    }

    function onPointerDown(ev) { 
        watering = true; 
        can.setPointerCapture(ev.pointerId); 
        can.classList.add('pouring');
        audio.startPour(); 
        dropletInterval = setInterval(spawnWaterDroplet, 120);
    }
    function onPointerMove(ev) {
        if (!watering) return;
        const rect = area.getBoundingClientRect(); const x = ev.clientX - rect.left; const y = ev.clientY - rect.top;
        can.style.left = (x / rect.width * 100) + '%'; can.style.top = (y / rect.height * 100) + '%';
        soils.forEach(function(s) {
            if (s.classList.contains('wet')) return;
            if (rectsOverlap(can.getBoundingClientRect(), s.getBoundingClientRect())) {
                s.classList.remove('dry'); s.classList.add('wet'); wateredCount += 1;
                const flower = createFlower({ xPercent: parseFloat(s.style.left), yPercent: parseFloat(s.style.top) - 6, asBud: false });
                area.appendChild(flower); spawnSparkles(s); audio.playBloom();
                if (wateredCount === soils.length) { 
                    const wt = document.getElementById('watering-text');
                    wt.textContent = 'So colorful! The garden is starting to celebrate you!';
                    wt.classList.remove('attention');
                    void wt.offsetWidth;
                    wt.classList.add('attention');
                    const btn = document.getElementById('btn-watering-next');
                    safeShow(btn); 
                    bounce(btn);
                }
            }
        });
    }
    function onPointerUp() { 
        watering = false; 
        can.classList.remove('pouring');
        audio.stopPour(); 
        if (dropletInterval) {
            clearInterval(dropletInterval);
            dropletInterval = null;
        }
    }

    can.addEventListener('pointerdown', onPointerDown); can.addEventListener('pointermove', onPointerMove); can.addEventListener('pointerup', onPointerUp); can.addEventListener('pointercancel', onPointerUp); can.addEventListener('lostpointercapture', onPointerUp);
}

function getCanSVG() {
    return "<svg viewBox='0 0 2122 2122' width='110' height='110' aria-hidden='true'>" +
        "<g>" +
            "<path style='fill:#F4AFCF;' d='M1861.567,557.374c-65.699-65.699-132.105-105.811-148.323-89.594" +
                "c-12.083,12.083-41.769,100.914-28.965,172.602c-85.901,26.141-208.565,111.964-289.83,173.801" +
                "c-30.554-172.065-58.727-287.217-58.727-287.217c0-43.531-169.613-78.82-378.841-78.82s-378.84,35.288-378.84,78.82h0" +
                "c-18.539,58.86-33.962,125.937-46.819,196.996c-91.298-71.649-289.606-171.106-351.514,250.21" +
                "c-69.627,473.856,153.693,485.903,286.134,407.287l1.206,0.13c1.339,0,2.471-0.509,3.454-1.211" +
                "c-3.635,113.457-3.203,188.469-3.203,188.469v0c0,57.619,224.506,104.328,501.448,104.328s501.448-46.709,501.448-104.328v0" +
                "c0-94.931-5.011-191.973-13.081-286.801c116.26-177.834,265.618-419.865,308.035-550.38" +
                "c73.52,19.619,173.161-13.118,186.011-25.969C1967.378,689.479,1927.265,623.072,1861.567,557.374z M474.589,1277.327" +
                "c-74.192,42.303-201.251,68.144-181.88-269.255c19.088-332.46,145.658-276.413,218.955-214.056c-0.54,2.271-1.08,4.541-1.62,6.811" +
                "c-0.779,3.275,1.028,6.758,4.356,7.671c0.973,0.268,1.977,0.194,2.954-0.027C493.683,967.803,481.177,1138.247,474.589,1277.327z'/>" +
            "<path style='fill:#FFF6CA;' d='M1215.813,1107.109c-2.777-65.047-97.429-48.58-165.568-28.147" +
                "c63.916-35.304,145.517-93.011,96.99-137.564c-47.958-44.032-103.243,34.541-136.976,97.17" +
                "c20.232-70.159,37.126-168.664-28.691-165.854c-65.047,2.776-48.58,97.427-28.147,165.567" +
                "c-35.304-63.916-93.011-145.516-137.564-96.989c-44.032,47.959,34.541,103.244,97.171,136.976" +
                "c-70.159-20.232-168.664-37.126-165.854,28.69c2.776,65.048,97.428,48.581,165.567,28.147" +
                "c-63.917,35.304-145.517,93.01-96.99,137.564c47.959,44.032,103.244-34.54,136.976-97.17" +
                "c-20.232,70.16-37.126,168.663,28.69,165.854c65.047-2.776,48.58-97.427,28.147-165.567" +
                "c35.304,63.916,93.011,145.516,137.564,96.99c44.032-47.958-34.541-103.243-97.17-136.976" +
                "C1120.117,1156.031,1218.622,1172.927,1215.813,1107.109z'/>" +
            "<ellipse style='fill:#B6277D;' cx='959.395' cy='548.595' rx='317.408' ry='44.071'/>" +
            "<path style='fill:#FFE979;' d='M987.058,1047.906c-30.633,0-61.03,28.109-61.03,58.742c0,30.633,19.051,59.515,49.683,59.515" +
                "c30.634,0,61.248-28.882,61.248-59.515C1036.959,1076.014,1017.691,1047.906,987.058,1047.906z'/>" +
        "</g></svg>";
}

// Butterflies scene
function setupButterflies() {
    showSpeechBubble('scene-butterflies');
    const area = document.getElementById('butterfly-area'); area.innerHTML = '';
    const cocoons = [[24, 160],[42, 168],[60, 156],[74, 164],[30, 170],[68, 170]];
    let freed = 0; const total = cocoons.length;
    cocoons.forEach(function(p) {
        const c = document.createElement('div'); c.className = 'cocoon'; c.style.left = p[0] + '%'; c.style.top = p[1] + '%'; area.appendChild(c);
        function handleCocoonTap() {
            if (!c.parentNode) return;
            c.remove();
            const b = createButterfly({ xPercent: p[0], yPercent: p[1] }); area.appendChild(b); audio.playFlutter();
            freed += 1;
            if (freed === total) { 
                const bt = document.getElementById('butterfly-text');
                bt.textContent = 'Now the butterflies can join your birthday party in Shelter!';
                bt.classList.remove('attention');
                void bt.offsetWidth;
                bt.classList.add('attention');
                const btn = document.getElementById('btn-butterfly-next');
                safeShow(btn); 
                bounce(btn);
            }
        }
        c.addEventListener('click', handleCocoonTap);
        c.addEventListener('touchend', function(e) { e.preventDefault(); handleCocoonTap(); });
    });
}

function createButterfly(opts) {
    const x = opts.xPercent; const y = opts.yPercent; const b = document.createElement('div'); b.className = 'butterfly fly'; b.style.left = x + '%'; b.style.top = y + '%';
    b.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
    b.style.setProperty('--dy', (Math.random() * -30 - 10) + 'px');
    b.innerHTML = "<div class='wing left'></div><div class='wing right'></div><div class='body'></div>";
    return b;
}

// Grand scene
function setupGrand() {
    const area = document.getElementById('grand-area'); area.innerHTML = '';
    // Populate lots of flowers and butterflies
    for (let i = 0; i < 12; i++) {
        const fx = 10 + Math.random() * 80; const fy = 150 + Math.random() * 40;
        area.appendChild(createFlower({ xPercent: fx, yPercent: fy, asBud: false }));
    }
    for (let i = 0; i < 6; i++) {
        const bx = 15 + Math.random() * 70; const by = 155 + Math.random() * 30;
        area.appendChild(createButterfly({ xPercent: bx, yPercent: by }));
    }
    
    launchConfetti(); audio.playFanfare();
    
    // Show speech bubble and text with delay, and start the song
    const gt = document.getElementById('grand-text');
    showDelayedTextWithSong('You did it, Marija! The garden is alive, just like your bright spirit. The flowers and I have a special gift for you…', 2000, gt);
    
    // Show speech bubble after delay
    setTimeout(() => {
        showSpeechBubble('scene-grand');
    }, 2000);
    
    setTimeout(function() { revealQR(); }, 3400);
}

function launchConfetti() {
    const colors = [ 'var(--pink)', 'var(--yellow)', 'var(--mint)', 'var(--lilac)' ];
    const scene = document.getElementById('scene-grand');
    for (let i = 0; i < 60; i++) {
        const c = document.createElement('div'); c.className = 'confetti';
        c.style.left = (Math.random() * 100) + 'vw';
        c.style.background = colors[i % colors.length];
        c.style.animationDuration = (3 + Math.random() * 2) + 's';
        c.style.transform = 'translateY(' + (-20 - Math.random() * 40) + 'vh) rotate(0)';
        scene.appendChild(c);
        setTimeout(function() { c.remove(); }, 6000);
    }
}

function revealQR() {
    const card = document.getElementById('qr-card'); 
    card.style.visibility = 'visible';
    card.style.opacity = '1';
    bounce(card);
    generateQRCode({ elementId: 'qr', text: SETTINGS.giftLink, size: 220 });
}

// Minimal QR generator (qrcode.js by davidshimjs - inlined, lightly trimmed)
/* eslint-disable */
!function(o){function n(o){this.mode=s.MODE_8BIT_BYTE,this.data=o}function e(o){this.totalCount=o,this.numData=o}function t(o,n){this.typeNumber=o,this.errorCorrectLevel=n,this.modules=null,this.moduleCount=0,this.dataCache=null,this.dataList=[]}var r=function(){var o=function(o){this.buffer=[],this.length=0,o>1&&(this.buffer.push(0),this.length=8)};return o.prototype={get:function(o){var n=Math.floor(o/8);return 1==(this.buffer[n]>>>7-o%8&1)},put:function(o,n){for(var e=0;e<n;e++)this.putBit(!!(1&(o>>>n-e-1)))},putBit:function(o){var n=Math.floor(this.length/8);this.buffer.length<=n&&this.buffer.push(0),o&&(this.buffer[n]|=128>>>this.length%8),this.length++}},o}(),i={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]],G15:1335,G18:7973,G15_MASK:21522,getBCHTypeInfo:function(o){for(var n=o<<10;n>=1024;)n^=i.G15<<Math.floor(Math.log(n)/Math.log(2))-Math.floor(Math.log(i.G15)/Math.log(2));return(o<<10|n)^i.G15_MASK},getBCHTypeNumber:function(o){for(var n=o<<12;n>=4096;)n^=i.G18<<Math.floor(Math.log(n)/Math.log(2))-Math.floor(Math.log(i.G18)/Math.log(2));return o<<12|n},getPatternPosition:function(o){return i.PATTERN_POSITION_TABLE[o-1]},mask:function(o,n,e){switch(e){case 0:return(n+o)%2==0;case 1:return n%2==0;case 2:return o%3==0;case 3:return(n+o)%3==0;case 4:return(Math.floor(n/2)+Math.floor(o/3))%2==0;case 5:return n*o%2+n*o%3==0;case 6:return(n*o%2+n*o%3)%2==0;case 7:return(n*o%3+(n+o)%2)%2==0;default:throw new Error('bad maskPattern:'+e)}},getErrorCorrectPolynomial:function(o){for(var n=new u([1],0),e=0;e<o;e++)n=n.multiply(new u([1,l.gexp(e)],0));return n},getLengthInBits:function(o,n){if(n>=1&&n<10)return 8;if(n<27)return 16;if(n<41)return 16;throw new Error('typeNumber:'+n)},getLostPoint:function(o){for(var n=o.getModuleCount(),e=0,t=0;t<n;t++)for(var r=0;r<n;r++){for(var l=0,u=o.isDark(t,r),f=-1;f<=1;f++)if(!(t+f<0||n<=t+f))for(var a=-1;a<=1;a++)r+a<0||n<=r+a||0==f&&0==a||u==o.isDark(t+f,r+a)&&l++;l>5&&(e+=3+l-5);var c=0;for(a=0;a<5&&r+a<n;a++)o.isDark(t,r+a)&&c++;(0==c||5==c)&&(e+=3)}for(t=0;t<n-1;t++)for(r=0;r<n-1;r++){var s=0;o.isDark(t,r)&&s++,o.isDark(t+1,r)&&s++,o.isDark(t,r+1)&&s++,o.isDark(t+1,r+1)&&s++,(0==s||4==s)&&(e+=3)}for(t=0;t<n;t++)for(r=0;r<n-6;r++)o.isDark(t,r)&&!o.isDark(t,r+1)&&o.isDark(t,r+2)&&o.isDark(t,r+3)&&o.isDark(t,r+4)&&!o.isDark(t,r+5)&&o.isDark(t,r+6)&&(e+=40);for(r=0;r<n;r++)for(t=0;t<n-6;t++)o.isDark(t,r)&&!o.isDark(t+1,r)&&o.isDark(t+2,r)&&o.isDark(t+3,r)&&o.isDark(t+4,r)&&!o.isDark(t+5,r)&&o.isDark(t+6,r)&&(e+=40);for(var h=0,d=0,g=0;t<n;t++)for(r=0;r<n;r++)g++,o.isDark(t,r)&&h++;for(d=Math.abs(100*h/g-50)/5,e+=10*d,t=0;t<e;t++);return e}},l={glog:function(o){if(o<1)throw new Error('glog('+o+')');return l.LOG_TABLE[o]},gexp:function(o){for(;o<0;)o+=255;for(;o>=256;)o-=255;return l.EXP_TABLE[o]},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)};for(var u=function(o,n){if(void 0==o.length)throw new Error(o.length+'/'+n);for(var e=0;e<o.length&&0==o[e];)e++;this.num=new Array(o.length-e+n);for(var t=0;t<o.length-e;t++)this.num[t]=o[t+e]},f=0;f<8;f++)l.EXP_TABLE[f]=1<<f;for(f=8;f<256;f++)l.EXP_TABLE[f]=l.EXP_TABLE[f-4]^l.EXP_TABLE[f-5]^l.EXP_TABLE[f-6]^l.EXP_TABLE[f-8];for(f=0;f<255;f++)l.LOG_TABLE[l.EXP_TABLE[f]]=f;u.prototype={get:function(o){return this.num[o]},getLength:function(){return this.num.length},multiply:function(o){for(var n=new Array(this.getLength()+o.getLength()-1),e=0;e<this.getLength();e++)for(var t=0;t<o.getLength();t++)n[e+t]^=l.gexp(l.glog(this.get(e))+l.glog(o.get(t)));return new u(n,0)},mod:function(o){if(this.getLength()-o.getLength()<0)return this;for(var n=l.glog(this.get(0))-l.glog(o.get(0)),e=new Array(this.getLength()),t=0;t<this.getLength();t++)e[t]=this.get(t);for(t=0;t<o.getLength();t++)e[t]^=l.gexp(l.glog(o.get(t))+n);return new u(e,0).mod(o)}};var s={PAD0:236,PAD1:17,MODE_8BIT_BYTE:4};n.prototype={getLength:function(){return this.data.length},write:function(o){for(var n=0;n<this.data.length;n++)o.put(this.data.charCodeAt(n),8)}};e.RS_BLOCK_TABLE=[[1,26,19]];var a={getRSBlocks:function(o,n){return[e.RS_BLOCK_TABLE[0].map(function(o){return new e(o)})][0]}};t.prototype={addData:function(o){this.dataList.push(new n(o)),this.dataCache=null},isDark:function(o,n){if(o<0||this.moduleCount<=o||n<0||this.moduleCount<=n)throw new Error(o+','+n);return this.modules[o][n]},getModuleCount:function(){return this.moduleCount},make:function(){this.makeImpl(!1,this.getBestMaskPattern())},makeImpl:function(o,n){this.moduleCount=29,this.modules=new Array(this.moduleCount);for(var e=0;e<this.moduleCount;e++){this.modules[e]=new Array(this.moduleCount);for(var t=0;t<this.moduleCount;t++)this.modules[e][t]=null}this.setupPositionProbePattern(0,0),this.setupPositionProbePattern(this.moduleCount-7,0),this.setupPositionProbePattern(0,this.moduleCount-7),this.setupPositionAdjustPattern(),this.setupTimingPattern(),this.setupTypeInfo(o,n),this.mapData(this.createData(this.typeNumber,this.errorCorrectLevel),n)},setupPositionProbePattern:function(o,n){for(var e=-1;e<=7;e++)if(!(o+e<=-1||this.moduleCount<=o+e))for(var t=-1;t<=7;t++)n+t<=-1||this.moduleCount<=n+t||(this.modules[o+e][n+t]=e>=0&&e<=6&&(0==t||6==t)||t>=0&&t<=6&&(0==e||6==e)||e>=2&&e<=4&&t>=2&&t<=4)},getBestMaskPattern:function(){for(var o=0,n=0,e=0;e<8;e++){this.makeImpl(!0,e);var t=i.getLostPoint(this);(0==e||t<o)&&(o=t,n=e)}return n},createData:function(o,n){for(var e=a.getRSBlocks(o,n),t=new r,i=0;i<this.dataList.length;i++){var l=this.dataList[i];t.put(l.mode,4),t.put(l.getLength(),i.getLengthInBits(l.mode,o)),l.write(t)}for(var u=0,f=0;f<e.length;f++)u+=e[f].numData;for(t.put(s.MODE_8BIT_BYTE,4);t.length+4<=8*u;)t.put(0,4);for(;t.length%8!=0;)t.putBit(!1);for(var c=[],h=0;t.length>h;){c.push(255&t.buffer[h>>3]),h+=8}return c},setupTimingPattern:function(){for(var o=8;o<this.moduleCount-8;o++)null==this.modules[o][6]&&(this.modules[o][6]=o%2==0),null==this.modules[6][o]&&(this.modules[6][o]=o%2==0)},setupPositionAdjustPattern:function(){for(var o=i.getPatternPosition(this.typeNumber),n=0;n<o.length;n++)for(var e=0;e<o.length;e++){var t=o[n],r=o[e];if(null==this.modules[t][r])for(var l=-2;l<=2;l++)for(var u=-2;u<=2;u++)this.modules[t+l][r+u]=l==-2||2==l||u==-2||2==u||0==l&&0==u}},setupTypeInfo:function(o,n){for(var e=i.getBCHTypeInfo(this.errorCorrectLevel<<3|n),t=0;t<15;t++){var r=!o&&1==(1&e>>t);t<6?this.modules[t][8]=r:t<8?this.modules[t+1][8]=r:this.modules[this.moduleCount-15+t][8]=r}for(t=0;t<15;t++){r=!o&&1==(1&e>>t);t<8?this.modules[8][this.moduleCount-1-t]=r:t<9?this.modules[8][15-t-1+1]=r:this.modules[8][14-t]=r}this.modules[this.moduleCount-8][8]=!o},mapData:function(o,n){for(var e=-1,t=this.moduleCount-1,r=7,l=0,u=this.moduleCount-1;u>0;u-=2)for(6==u&&u--;t>=0&&t<this.moduleCount;t+=e)for(var f=0;f<2;f++)null==this.modules[t][u-f]&&(l<o.length&&(this.modules[t][u-f]=1==(1&o[l]>>r)),r--,-1==r&&(l++,r=7));},setupTypeNumber:function(o){for(var n=i.getBCHTypeNumber(this.typeNumber),e=0;e<18;e++){var t=!o&&1==(1&n>>e);this.modules[Math.floor(e/3)][e%3+this.moduleCount-8-3]=t,this.modules[e%3+this.moduleCount-8-3][Math.floor(e/3)]=t}}};var d={stringToBytes:function(o){for(var n=[],e=0;e<o.length;e++){var t=o.charCodeAt(e);n.push(255&t)}return n}};n.prototype.write=function(o){for(var n=d.stringToBytes(this.data),e=0;e<n.length;e++)o.put(n[e],8)};var g={create:function(o){var n=new t(9,1);return n.addData(o),n.make(),n}};o.QRCode=function(o){this._el=o,this._htOption={width:256,height:256,text:'',colorDark:'#000000',colorLight:'#ffffff'},this._android=/Android/i.test(navigator.userAgent),this._el.style.position='relative',this._el.title=this._htOption.text,this.makeCode(this._htOption.text)},o.QRCode.prototype.makeCode=function(o){this._oQRCode=g.create(o),this._el.innerHTML='';for(var n=this._oQRCode.getModuleCount(),e=Math.floor(Math.min(this._htOption.width,this._htOption.height)/n),t=document.createElement('div'),r=0;r<n;r++){for(var l=document.createElement('div'),u=0;u<n;u++){var f=document.createElement('i');f.style.display='inline-block',f.style.width=e+'px',f.style.height=e+'px',f.style.background=this._oQRCode.isDark(r,u)?this._htOption.colorDark:this._htOption.colorLight,l.appendChild(f)}t.appendChild(l)}this._el.appendChild(t)},o.QRCode.prototype.clear=function(){this._el.innerHTML=''},o.QRCode.CorrectLevel={L:1,M:0,Q:3,H:2}}(window);
/* eslint-enable */

function generateQRCode(opts) {
    var el = document.getElementById(opts.elementId);
    el.innerHTML = '';
    var q = new window.QRCode(el);
    q._htOption.width = opts.size || 200;
    q._htOption.height = opts.size || 200;
    q.makeCode(opts.text);
}
