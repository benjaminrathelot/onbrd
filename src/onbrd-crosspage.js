function registerCrossPage(Onbrd){
    if (!Onbrd || Onbrd.prototype.enableCrossPage) return;
    const proto = Onbrd.prototype;
    proto.enableCrossPage = function(){
        if (this.crossPageEnabled) return;
        this.crossPageEnabled = true;
        this._checkResumeBound = this._checkResume.bind(this);
        this._origPushState = history.pushState;
        history.pushState = (...args) => {
            this._origPushState.apply(history, args);
            window.dispatchEvent(new Event('pushstate'));
        };
        window.addEventListener('popstate', this._checkResumeBound);
        window.addEventListener('pushstate', this._checkResumeBound);
        this._checkResume();
    };
    proto.disableCrossPage = function(){
        if (!this.crossPageEnabled) return;
        this.crossPageEnabled = false;
        if (this._origPushState) history.pushState = this._origPushState;
        window.removeEventListener('popstate', this._checkResumeBound);
        window.removeEventListener('pushstate', this._checkResumeBound);
    };
    proto._checkResume = function(){
        const urlStep = new URLSearchParams(location.search).get('onb_step');
        let idx = urlStep !== null ? parseInt(urlStep,10) : null;
        if (idx === null || isNaN(idx)) {
            const saved = this.storage.getItem(this.storageKey);
            idx = saved ? parseInt(saved,10) : null;
        }
        if (idx !== null && !isNaN(idx)) {
            this.currentStepId = idx;
            if (!this.active && this.autoStart !== false) this.start();
        }
    };
    proto._updateStepInUrl = function(){
        if (this.crossPageEnabled) {
            const url = new URL(window.location);
            url.searchParams.set('onb_step', this.currentStepId);
            history.replaceState(history.state, '', url);
        }
    };
}
if (typeof module!== 'undefined') module.exports = registerCrossPage;
else window.registerCrossPage = registerCrossPage;
