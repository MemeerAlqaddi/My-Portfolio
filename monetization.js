(() => {
  'use strict';

  const SESSION_KEY = 'al-majlis-paid-sessions-v1';

  const FREE_MODES = new Set(['say', 'trivia', 'identity', 'reflection']);

  const PRODUCTS = Object.freeze({
    all: {
      title: 'Game Night Shuffle',
      price: '$3.99',
      description: 'Unlock the complete competitive shuffle.'
    },
    arabish: {
      title: 'Decode the Gibberish',
      price: '$2.99',
      description: 'Unlock the complete Arabic phrase challenge.'
    },
    ayah: {
      title: 'Complete the Ayah',
      price: '$2.99',
      description: 'Unlock the complete Qur’anic verse challenge.'
    },
    conversation: {
      title: 'Conversation Shuffle',
      price: '$3.99',
      description: 'Unlock the complete conversation shuffle.'
    },
    mizan: {
      title: 'Dilemmas',
      price: '$2.99',
      description: 'Unlock the complete Dilemmas collection.'
    },
    culture: {
      title: 'Islam vs Culture',
      price: '$2.99',
      description: 'Unlock the complete Islam vs Culture collection.'
    },
    bundle: {
      title: 'Unlock All Premium Modes',
      price: '$7.99',
      description: 'Unlock every current premium mode.'
    }
  });

  const lockSvg = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7.5 10V7.75a4.5 4.5 0 0 1 9 0V10"></path>
      <rect x="5.25" y="10" width="13.5" height="10" rx="2.25"></rect>
      <path d="M12 14.25v2.5"></path>
    </svg>`;

  const checkSvg = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6.5 12.5 3.25 3.25L17.75 8"></path>
    </svg>`;

  let entitlements = new Set();
  let activeProduct = null;
  let activeCheckoutSession = null;
  let checkout = null;

  function readStoredSessions() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
      return Array.isArray(parsed)
        ? parsed.filter(value => typeof value === 'string')
        : [];
    } catch {
      return [];
    }
  }

  function rememberSession(sessionId) {
    try {
      const sessions = new Set(readStoredSessions());
      sessions.add(sessionId);
      localStorage.setItem(SESSION_KEY, JSON.stringify([...sessions]));
    } catch {}
  }

  function owns(modeKey) {
    return entitlements.has('bundle') || entitlements.has(modeKey);
  }

  function addVerifiedEntitlement(product) {
    if (!product) return;
    entitlements.add(product);
    refreshAccessUi();
  }

  async function verifySession(sessionId, {showConfirmation = false} = {}) {
    const response = await fetch('/api/session-status', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sessionId})
    });

    const result = await response.json();
    if (!response.ok || !result.paid) {
      throw new Error(result.error || 'Payment is not complete.');
    }

    rememberSession(sessionId);
    addVerifiedEntitlement(result.product);

    if (showConfirmation) showSuccess();
    return result;
  }

  async function restorePurchases() {
    entitlements = new Set();
    refreshAccessUi();

    const sessions = readStoredSessions();
    const results = await Promise.allSettled(
      sessions.map(sessionId => verifySession(sessionId))
    );

    return results.some(result => result.status === 'fulfilled');
  }

  function tierHeading(text) {
    const element = document.createElement('div');
    element.className = 'majlisTierHeading';
    element.innerHTML = `<span>${text}</span><i aria-hidden="true"></i>`;
    return element;
  }

  function ensureLock(button) {
    const modeKey = button.dataset.mode;
    if (!PRODUCTS[modeKey]) return;

    button.classList.add('majlisPremiumMode');

    let lock = button.querySelector('.majlisModeLock');
    if (!lock) {
      lock = document.createElement('span');
      lock.className = 'majlisModeLock';
      lock.setAttribute('aria-hidden', 'true');
      button.append(lock);
    }
  }

  function createBundleButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'setupMode majlisBundleCard';
    button.innerHTML = `
      <strong>Unlock All Premium Modes</strong>
      <small>Every current premium mode · $7.99 one time</small>
      <span class="majlisBundleMark" aria-hidden="true">✦</span>`;
    button.addEventListener('click', () => openPurchase('bundle'));
    return button;
  }

  function arrangeModeGroup(group) {
    const list = group.querySelector('.modeGroupList');
    if (!list || list.dataset.majlisPremiumReady === 'true') return;

    const buttons = [...list.querySelectorAll('.setupMode[data-mode]')];
    if (!buttons.length) return;

    const freeButtons = buttons.filter(button => FREE_MODES.has(button.dataset.mode));
    const premiumButtons = buttons.filter(button => PRODUCTS[button.dataset.mode]);

    premiumButtons.forEach(ensureLock);

    list.textContent = '';
    list.dataset.majlisPremiumReady = 'true';

    if (freeButtons.length) {
      list.append(tierHeading('Included for Free'));
      const freeList = document.createElement('div');
      freeList.className = 'majlisModeSection majlisFreeModes';
      freeButtons.forEach(button => freeList.append(button));
      list.append(freeList);
    }

    if (premiumButtons.length) {
      list.append(tierHeading('More Ways to Play'));
      const premiumList = document.createElement('div');
      premiumList.className = 'majlisModeSection majlisPaidModes';
      premiumButtons.forEach(button => premiumList.append(button));
      list.append(premiumList, createBundleButton());
    }
  }

  function arrangeAllGroups() {
    document.querySelectorAll('.modeGroup').forEach(arrangeModeGroup);
    refreshAccessUi();
  }

  function refreshAccessUi() {
    document.querySelectorAll('.setupMode[data-mode]').forEach(button => {
      const key = button.dataset.mode;
      if (!PRODUCTS[key]) return;

      const unlocked = owns(key);
      button.classList.toggle('isUnlocked', unlocked);

      const lock = button.querySelector('.majlisModeLock');
      if (lock) {
        lock.innerHTML = unlocked ? checkSvg : lockSvg;
        lock.title = unlocked ? 'Purchased' : 'Premium mode';
      }

      button.setAttribute(
        'aria-label',
        unlocked
          ? `${PRODUCTS[key].title}, purchased`
          : `${PRODUCTS[key].title}, premium mode`
      );
    });

    document.querySelectorAll('.majlisBundleCard').forEach(button => {
      const unlocked = entitlements.has('bundle');
      button.classList.toggle('isUnlocked', unlocked);
      const detail = button.querySelector('small');
      if (detail) {
        detail.textContent = unlocked
          ? 'All current premium modes are unlocked'
          : 'Every current premium mode · $7.99 one time';
      }
    });
  }

  function injectPurchaseSheet() {
    if (document.getElementById('premiumPurchaseSheet')) return;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="sheetBackdrop majlisPremiumSheet" id="premiumPurchaseSheet"
           hidden role="dialog" aria-modal="true"
           aria-labelledby="premiumPurchaseTitle">
        <div class="sheetPanel majlisPremiumPanel">
          <button class="sheetClose" id="premiumPurchaseClose" type="button"
                  aria-label="Close premium purchase">×</button>

          <div id="premiumOfferView">
            <div class="welcomeEyebrow">MORE WAYS TO PLAY</div>
            <h2 id="premiumPurchaseTitle">Unlock Premium</h2>
            <p class="sheetIntro" id="premiumPurchaseDescription"></p>

            <div class="majlisPurchaseBenefits">
              <span>One-time payment</span>
              <span>Immediate access after verified payment</span>
              <span>No monthly subscription</span>
            </div>

            <button class="launchBtn majlisPurchasePrimary"
                    id="premiumBuySingle" type="button"></button>

            <button class="backBtn centerBack majlisPurchaseSecondary"
                    id="premiumBuyBundle" type="button">
              Unlock All Premium Modes · $7.99
            </button>

            <button class="majlisRestore" id="premiumRestore" type="button">
              Restore purchases on this device
            </button>
          </div>

          <div id="premiumCheckoutView" hidden>
            <button class="backBtn majlisCheckoutBack"
                    id="premiumCheckoutBack" type="button">← Back</button>
            <div class="welcomeEyebrow">SECURE CHECKOUT</div>
            <h2>Complete your purchase</h2>
            <div class="majlisCheckoutLoading"
                 id="premiumCheckoutLoading">Opening secure payment…</div>
            <div id="premiumCheckoutContainer"></div>
            <small class="majlisStripeNote">Secure payment powered by Stripe</small>
          </div>

          <div id="premiumSuccessView" hidden>
            <div class="majlisSuccessMark" aria-hidden="true">✓</div>
            <div class="welcomeEyebrow">PAYMENT SUCCESSFUL</div>
            <h2>Premium unlocked</h2>
            <p class="sheetIntro">Your purchase is ready to play.</p>
            <button class="launchBtn majlisPurchasePrimary"
                    id="premiumSuccessDone" type="button">Start Playing</button>
          </div>
        </div>
      </div>`);

    document.getElementById('premiumPurchaseClose')
      .addEventListener('click', closePurchase);
    document.getElementById('premiumCheckoutBack')
      .addEventListener('click', showOffer);
    document.getElementById('premiumSuccessDone')
      .addEventListener('click', closePurchase);

    document.getElementById('premiumBuySingle')
      .addEventListener('click', () => beginCheckout(activeProduct));
    document.getElementById('premiumBuyBundle')
      .addEventListener('click', () => beginCheckout('bundle'));

    document.getElementById('premiumRestore')
      .addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = 'Checking purchases…';

        const restored = await restorePurchases();

        button.textContent = restored
          ? 'Purchases restored'
          : 'No verified purchases found';

        setTimeout(() => {
          button.disabled = false;
          button.textContent = 'Restore purchases on this device';
        }, 1500);
      });
  }

  function openPurchase(product) {
    injectPurchaseSheet();
    activeProduct = product;

    const info = PRODUCTS[product];
    document.getElementById('premiumPurchaseTitle').textContent = info.title;
    document.getElementById('premiumPurchaseDescription').textContent =
      info.description;

    const singleButton = document.getElementById('premiumBuySingle');
    singleButton.textContent =
      product === 'bundle'
        ? `Unlock All Premium Modes · ${info.price}`
        : `Unlock This Mode · ${info.price}`;

    document.getElementById('premiumBuyBundle').hidden =
      product === 'bundle';

    showOffer();

    if (typeof openDialog === 'function') {
      openDialog(
        'premiumPurchaseSheet',
        'premiumPurchaseClose',
        {pauseGame: false}
      );
    } else {
      document.getElementById('premiumPurchaseSheet').hidden = false;
    }
  }

  function closePurchase() {
    checkout?.destroy?.();
    checkout = null;

    const sheet = document.getElementById('premiumPurchaseSheet');
    if (!sheet) return;

    if (typeof closeDialog === 'function') {
      closeDialog('premiumPurchaseSheet', {
        resume: false,
        restoreFocus: true
      });
    } else {
      sheet.hidden = true;
    }

    showOffer();
  }

  function showOffer() {
    checkout?.destroy?.();
    checkout = null;

    document.getElementById('premiumOfferView').hidden = false;
    document.getElementById('premiumCheckoutView').hidden = true;
    document.getElementById('premiumSuccessView').hidden = true;
    document.getElementById('premiumCheckoutContainer').textContent = '';
  }

  function showSuccess() {
    checkout?.destroy?.();
    checkout = null;

    document.getElementById('premiumOfferView').hidden = true;
    document.getElementById('premiumCheckoutView').hidden = true;
    document.getElementById('premiumSuccessView').hidden = false;
  }

  function loadStripe() {
    if (window.Stripe) return Promise.resolve(window.Stripe);

    return new Promise((resolve, reject) => {
      const existing =
        document.querySelector('script[data-al-majlis-stripe]');

      if (existing) {
        existing.addEventListener(
          'load',
          () => resolve(window.Stripe),
          {once: true}
        );
        existing.addEventListener('error', reject, {once: true});
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.dataset.alMajlisStripe = 'true';
      script.onload = () => resolve(window.Stripe);
      script.onerror = () => reject(
        new Error('Stripe could not load. Please try again.')
      );

      document.head.append(script);
    });
  }

  async function beginCheckout(product) {
    if (!product) return;

    const offer = document.getElementById('premiumOfferView');
    const checkoutView = document.getElementById('premiumCheckoutView');
    const loading = document.getElementById('premiumCheckoutLoading');
    const container = document.getElementById('premiumCheckoutContainer');

    offer.hidden = true;
    checkoutView.hidden = false;
    loading.hidden = false;
    loading.textContent = 'Opening secure payment…';
    container.textContent = '';

    try {
      const [StripeConstructor, response] = await Promise.all([
        loadStripe(),
        fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({product})
        })
      ]);

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Checkout could not open.');
      }

      activeCheckoutSession = result.sessionId;

      const stripe = StripeConstructor(result.publishableKey);
      checkout = await stripe.initEmbeddedCheckout({
        clientSecret: result.clientSecret,
        onComplete: async () => {
          loading.hidden = false;
          loading.textContent = 'Confirming payment…';

          try {
            await verifySession(activeCheckoutSession, {
              showConfirmation: true
            });
          } catch (error) {
            loading.textContent =
              error.message || 'Payment could not be verified.';
          }
        }
      });

      loading.hidden = true;
      checkout.mount('#premiumCheckoutContainer');
    } catch (error) {
      console.error(error);
      loading.hidden = false;
      loading.textContent =
        error.message || 'Checkout could not open. Please try again.';
    }
  }

  function interceptLockedMode(event) {
    const button = event.target.closest?.('.setupMode[data-mode]');
    if (!button) return;

    const key = button.dataset.mode;
    if (!PRODUCTS[key] || owns(key)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    playSound?.('select');
    openPurchase(key);
  }

  async function processCheckoutReturn() {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');

    if (params.get('checkout') !== 'return' || !sessionId) return;

    injectPurchaseSheet();

    try {
      document.getElementById('premiumPurchaseSheet').hidden = false;
      await verifySession(sessionId, {showConfirmation: true});
    } catch (error) {
      console.error(error);
    } finally {
      history.replaceState({}, '', location.pathname + location.hash);
    }
  }

  function initialize() {
    injectPurchaseSheet();
    arrangeAllGroups();

    document.addEventListener('click', interceptLockedMode, true);

    restorePurchases();
    processCheckoutReturn();

    const setupModes = document.getElementById('setupModes');
    if (setupModes) {
      const observer = new MutationObserver(() => arrangeAllGroups());
      observer.observe(setupModes, {childList: true, subtree: true});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, {once: true});
  } else {
    initialize();
  }
})();
