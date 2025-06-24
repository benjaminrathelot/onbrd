// Requires Popper.js v2 : <script src="https://unpkg.com/@popperjs/core@2"></script>

class Onbrd {
    constructor(config = {}) {
        this.steps = config.steps || [];
        this.colors = Object.assign({
            primary: "#0066ff",
            dark: "#222222",
            overlay: "rgba(10,10,10,0.1)",
            background: "rgba(255,255,255,0.92)"
        }, config.colors || {});
        this.font = config.font || "Inter, sans-serif";
        this.labels = Object.assign({
            next: "Next →",
            prev: "← Back",
            skip: "Skip",
            close: "✖",
            step: "Step",
            of: "of",
            confirmExit: "Do you really want to exit this onboarding?"
        }, config.labels || {});
        this.onStart = config.onStart || null;
        this.onShowStep = config.onShowStep || null;
        this.onComplete = config.onComplete || function() {};
        this.onExit = config.onExit || null;
        this.onError = config.onError || null;
        this.currentStepId = 0;
        this.stepMap = {};
        this.storageKey = config.storageKey || "onbrd_onboarding_progress";
        this.popperInstance = null;
        this.forceExitConfirm = config.forceExitConfirm || false;
        this._safeBackPerStep = []; // array: for each step, is it "safe" to go back
        this.storage = (config && config.storage) || window.localStorage;
        this.stepElements = [];
        this.active = false;
        this.paused = false;
        this.nextCheckInterval = null;
        this.crossPageEnabled = false;
        this._checkResumeBound = null;
        this._origPushState = null;
        this._mutationObs = null;
        this._resizeObs = null;

        this.autoStart = config.autoStart !== false;
        if (this.autoStart) {
            window.addEventListener('DOMContentLoaded', () => this.start());
        }


        this._buildOverlay();
        this._buildModal();
        this._buildTooltip();
        document.documentElement.style.setProperty("--onb-primary", this.colors.primary);
        document.documentElement.style.setProperty("--onb-dark", this.colors.dark);
        document.documentElement.style.setProperty("--onb-font", this.font);
        document.documentElement.style.setProperty("--onb-overlay", this.colors.overlay);
        document.documentElement.style.setProperty("--onb-bg", this.colors.background);
        document.documentElement.style.setProperty("--onb-overlay", this.colors.overlay);
        document.documentElement.style.setProperty("--onb-bg", this.colors.background);

        this.steps.forEach((step, i) => {
            if (step.stepId !== undefined) {
                this.stepMap[step.stepId] = i;
            }
            this.stepElements[i] = step.selector ? document.querySelector(step.selector) : null;
        });
    }

    _ensureDOMReady(cb) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => cb());
        } else {
            cb();
        }
    }

    _buildOverlay() {
        this.darken = document.createElement('div');
        this.darken.className = 'onb-onboard-darken';
        this.darken.setAttribute('aria-hidden', 'true');
        this.darken.style.display = 'none';
        this.darken.addEventListener('click', () => this._confirmExit());
        document.body.appendChild(this.darken);
    }

    _buildModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'onb-onboard-modal';
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('aria-hidden', 'true');
        this.modal.innerHTML = `
            <div class="onb-onboard-header">
                <div class="onb-onboard-progress-bar">
                    <div class="onb-onboard-progress"></div>
                </div>
                <div class="onb-onboard-step-counter"></div>
                <button class="onb-btn-skip">${this.labels.skip}</button>
                <button class="onb-btn-close">${this.labels.close}</button>
            </div>
            <div class="onb-onboard-inner">
                <div class="onb-onboard-text"></div>
                <div class="onb-onboard-video"></div>
                <div class="onb-onboard-buttons">
                    <button class="onb-btn-prev">${this.labels.prev}</button>
                    <button class="onb-btn-next">${this.labels.next}</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);

        this.modal.querySelector('.onb-btn-next').addEventListener('click', () => this.nextStep());
        this.modal.querySelector('.onb-btn-prev').addEventListener('click', () => this.prevStep());
        this.modal.querySelector('.onb-btn-close').addEventListener('click', () => this._confirmExit());
        this.modal.querySelector('.onb-btn-skip').addEventListener('click', () => this.skip());
    }

    _buildTooltip() {
        document.documentElement.style.setProperty("--onb-primary", this.colors.primary);
        document.documentElement.style.setProperty("--onb-dark", this.colors.dark);
        document.documentElement.style.setProperty("--onb-font", this.font);
        this.tooltipWrapper = document.createElement('div');
        this.tooltipWrapper.className = 'onb-tooltip-wrapper';
        this.tooltipWrapper.setAttribute('role', 'tooltip');
        this.tooltipWrapper.setAttribute('aria-hidden', 'true');

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'onb-tooltip';

        this.arrow = document.createElement('div');
        this.arrow.className = 'onb-tooltip-arrow';

        this.tooltipWrapper.appendChild(this.tooltip);
        this.tooltipWrapper.appendChild(this.arrow);

        document.body.appendChild(this.tooltipWrapper);
    }

    start() {
        if (this.storageKey) {
            const saved = this.storage.getItem(this.storageKey);
            if (saved !== null && !isNaN(parseInt(saved, 10))) {
                this.currentStepId = parseInt(saved, 10);
            } else {
                this.currentStepId = 0;
            }
        } else {
            this.currentStepId = 0;
        }
        this.active = true;
        this.paused = false;
        if (this.onStart) this.onStart();
        this._ensureDOMReady(() => this._showStep());
    }

    async _showStep() {
        this.darken.style.display = 'block';
        this.darken.classList.add('show');
        this.darken.setAttribute('aria-hidden', 'false');
        this._stopObservers();
        if (this.nextCheckInterval) {
            clearInterval(this.nextCheckInterval);
            this.nextCheckInterval = null;
        }
        if (this.currentStepId >= this.steps.length) {
            this.end();
            return;
        }

        if (this._currentStep && this._currentStep.onLeave) {
            this._currentStep.onLeave();
        }

        const step = this.steps[this.currentStepId];
        try {
            await this._waitForElement(step.waitForElement);
        } catch (err) {
            if (this.onError) this.onError(err, step);
        }
        if (step.selector) {
            this.stepElements[this.currentStepId] = document.querySelector(step.selector);
        }
        if (step.skipHiddenElement && step.selector) {
            const el = this.stepElements[this.currentStepId];
            if (!el || window.getComputedStyle(el).display === 'none') {
                if (!el && this.onError) this.onError(new Error('Element not found: ' + step.selector), step);
                this.currentStepId += 1;
                this._showStep();
                return;
            }
        }
        if (step.selector && !this.stepElements[this.currentStepId] && this.onError) {
            this.onError(new Error('Element not found: ' + step.selector), step);
        }
        this._currentStep = step;
        if (step.onEnter) step.onEnter();
        if (this.onShowStep) this.onShowStep(step, this.currentStepId);
        this._clearHighlights();

        this.darken.classList.add('show');
        this.darken.setAttribute('aria-hidden', 'false');

        const pct = Math.round(((this.currentStepId + 1) / this.steps.length) * 100);
        this.modal.querySelector('.onb-onboard-progress').style.width = pct + '%';

        const stepCounter = `${this.labels.step} ${this.currentStepId + 1} ${this.labels.of} ${this.steps.length}`;
        if (step.type === 'main') {
            this.modal.style.display = 'flex';
            this.modal.setAttribute('aria-hidden', 'false');
            this.tooltipWrapper.style.display = 'none';
            this.tooltipWrapper.setAttribute('aria-hidden', 'true');
            this.modal.querySelector('.onb-onboard-step-counter').textContent = stepCounter;
            this._showMain(step);
        } else {
            this.modal.style.display = 'none';
            this.modal.setAttribute('aria-hidden', 'true');
            this.tooltipWrapper.style.display = 'block';
            this.tooltipWrapper.setAttribute('aria-hidden', 'false');
            this._showTooltip(step, stepCounter);
        }

        // store safeBackPerStep[current]
        const isAction = (step.type === 'tooltip' && step.captureClick === true);
        this._safeBackPerStep[this.currentStepId] = (!isAction) || (isAction && step.goBack);

        if (this.storageKey) {
            this.storage.setItem(this.storageKey, this.currentStepId);
        }
        if (typeof this._updateStepInUrl === 'function') this._updateStepInUrl();
    }

    _showMain(step) {
        const prevSafe = (this.currentStepId > 0) ? this._safeBackPerStep[this.currentStepId - 1] : true;

        this.modal.querySelector('.onb-onboard-text').innerHTML = step.html || '';
        this.modal.querySelector('.onb-onboard-video').innerHTML = step.video ? `<video src="${step.video}" controls style="max-width: 100%"></video>` : '';
        this.modal.querySelector('.onb-btn-prev').style.display = (this.currentStepId > 0 && prevSafe) ? 'inline-flex' : 'none';

        const btnNext = this.modal.querySelector('.onb-btn-next');
        btnNext.disabled = false;
        if (step.nextCondition) {
            btnNext.disabled = true;
            btnNext.setAttribute('aria-disabled', 'true');
            const checkCond = () => Promise.resolve(step.nextCondition()).catch(() => false);
            this.nextCheckInterval = setInterval(() => {
                checkCond().then(ok => {
                    if (ok) {
                        btnNext.disabled = false;
                        btnNext.removeAttribute('aria-disabled');
                        clearInterval(this.nextCheckInterval);
                        this.nextCheckInterval = null;
                    }
                });
            }, 200);
        }

        if (step.onNext) this._onNext = step.onNext;
        else this._onNext = null;
    }

    _showTooltip(step, stepCounter) {
        const el = this.stepElements[this.currentStepId];
        if (!el) return;

        el.classList.add('onb-onboard-highlight');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const prevSafe = (this.currentStepId > 0) ? this._safeBackPerStep[this.currentStepId - 1] : true;

        this.tooltip.innerHTML = `
            <div class="onb-tooltip-text">${step.text || ''}</div>
            ${step.moreInfo ? `<div class="onb-tooltip-more">${step.moreInfo}</div>` : ''}
            <div class="onb-tooltip-buttons">
                ${ prevSafe ? `<button class="onb-btn-prev">${this.labels.prev}</button>` : '' }
                ${ !step.captureClick ? `<button class="onb-btn-next">${this.labels.next}</button>` : '' }
            </div>
            <div class="onb-tooltip-step-counter">${stepCounter}</div>
        `;

        if (this.popperInstance) this.popperInstance.destroy();
        this.popperInstance = Popper.createPopper(el, this.tooltipWrapper, {
            placement: step.position || 'bottom',
            modifiers: [
                { name: 'offset', options: { offset: [0, 12] } },
                { name: 'arrow', options: { element: this.arrow } },
                { name: 'preventOverflow', options: { padding: 8 } },
                { name: 'flip', options: { fallbackPlacements: ['top', 'right', 'left', 'bottom'] } }
            ]
        });

        this._startObservers(el, step);

        if (step.typewriter && el.tagName === 'INPUT') {
            if (step.autoFocus) el.focus();
            this._typewriter(el, step.typewriter);
        }

        if (step.captureClick) {
            const handler = (e) => {
                e.stopPropagation();
                const pass = (step.passThrough !== false); // default true
                if (!pass) {
                    e.preventDefault();
                }
                el.removeEventListener('click', handler);
                if (step.onAction) step.onAction();
                this.nextStep();

                // If passThrough is true, re-trigger the click
                if (pass) {
                    setTimeout(() => el.click(), 0); // allow next JS tick to continue
                }
            };
            el.addEventListener('click', handler);
        }


        const btnNext = this.tooltip.querySelector('.onb-btn-next');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (this._onNext) this._onNext();
                this.nextStep();
            });
            if (step.nextCondition) {
                btnNext.disabled = true;
                btnNext.setAttribute('aria-disabled', 'true');
                const checkCond = () => Promise.resolve(step.nextCondition()).catch(() => false);
                this.nextCheckInterval = setInterval(() => {
                    checkCond().then(ok => {
                        if (ok) {
                            btnNext.disabled = false;
                            btnNext.removeAttribute('aria-disabled');
                            clearInterval(this.nextCheckInterval);
                            this.nextCheckInterval = null;
                        }
                    });
                }, 200);
            }
        }

        const btnPrev = this.tooltip.querySelector('.onb-btn-prev');
        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                const prevStep = this.steps[this.currentStepId - 1];
                if (prevStep.type === 'tooltip' && prevStep.captureClick && prevStep.goBack) {
                    prevStep.goBack(() => this.prevStep());
                } else {
                    this.prevStep();
                }
            });
        }
    }

    _typewriter(el, text) {
        let i = 0;
        const interval = setInterval(() => {
            el.value = text.substring(0, i);
            i++;
            if (i > text.length) {
                clearInterval(interval);
            }
        }, 80);
    }

    nextStep() {
        this.currentStepId += 1;
        this._ensureDOMReady(() => this._showStep());
    }

    prevStep() {
        if (this.currentStepId > 0) {
            if (this._currentStep && this._currentStep.onPrev) this._currentStep.onPrev();
            this.currentStepId -= 1;
        }
        this._ensureDOMReady(() => this._showStep());
    }
    skip() {
        this.end();
    }


    end() {
        if (this.nextCheckInterval) {
            clearInterval(this.nextCheckInterval);
            this.nextCheckInterval = null;
        }
        this._stopObservers();
        this._clearHighlights();
        this.darken.classList.remove('show');
        this.darken.setAttribute('aria-hidden', 'true');
        this.modal.style.display = 'none';
        this.modal.setAttribute('aria-hidden', 'true');
        this.tooltipWrapper.style.display = 'none';
        this.tooltipWrapper.setAttribute('aria-hidden', 'true');
        this.storage.removeItem(this.storageKey);
        this.darken.classList.remove('show');
        this.darken.setAttribute('aria-hidden', 'true');
        this.darken.style.display = 'none';
        this.onComplete();
        if (this.onExit) this.onExit();
        this.active = false;
        this.paused = false;
        this.currentStepId = 0;  
    }

    _clearHighlights() {
        document.querySelectorAll('.onb-onboard-highlight').forEach(el => {
            el.classList.remove('onb-onboard-highlight');
        });
    }

    _confirmExit() {
        if (this.forceExitConfirm) {
            if (confirm(this.labels.confirmExit)) {
                this.end();
            }
        } else {
            this.end();
        }
    }

    async _waitForElement(waitFor) {
        if (!waitFor) return;
        if (typeof waitFor === 'string') {
            while (!document.querySelector(waitFor)) {
                await new Promise(r => setTimeout(r, 200));
            }
        } else if (typeof waitFor === 'function') {
            await waitFor();
        }
    }

    goToStep(idOrIndex) {
        let idx = -1;
        if (typeof idOrIndex === 'string') {
            idx = this.stepMap[idOrIndex];
        } else if (typeof idOrIndex === 'number') {
            idx = idOrIndex;
        }
        if (idx >= 0 && idx < this.steps.length) {
            this.currentStepId = idx;
            this._ensureDOMReady(() => this._showStep());
        }
    }

    restart() {
        this.storage.removeItem(this.storageKey);
        this.currentStepId = 0;
        this.active = true;
        this.paused = false;
        if (this.onStart) this.onStart();
        this._ensureDOMReady(() => this._showStep());
    }

    pause() {
        if (this.active && !this.paused) {
            this.paused = true;
            this._clearHighlights();
            this.darken.classList.remove('show');
            this.darken.setAttribute('aria-hidden', 'true');
            this.modal.style.display = 'none';
            this.tooltipWrapper.style.display = 'none';
        }
    }

    resume() {
        if (this.active && this.paused) {
            this.paused = false;
            this._ensureDOMReady(() => this._showStep());
        }
    }

    isActive() {
        return this.active && !this.paused;
    }


    _startObservers(el, step) {
        this._stopObservers();
        if (!el) return;
        const check = () => {
            if (!el.isConnected || window.getComputedStyle(el).display === 'none') {
                this._stopObservers();
                if (step.skipOnDisappear !== false) {
                    this.nextStep();
                } else {
                    this.pause();
                }
            }
        };
        this._mutationObs = new MutationObserver(check);
        this._mutationObs.observe(document.body, { childList: true, subtree: true });
        this._resizeObs = new ResizeObserver(check);
        this._resizeObs.observe(el);
    }

    _stopObservers() {
        if (this._mutationObs) { this._mutationObs.disconnect(); this._mutationObs = null; }
        if (this._resizeObs) { this._resizeObs.disconnect(); this._resizeObs = null; }
    }
}

if (typeof module !== 'undefined') { module.exports = Onbrd; }
