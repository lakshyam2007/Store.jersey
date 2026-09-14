/* ==========================================================================
   RIVAL — production-ready site behaviour
   Vanilla JavaScript. No third-party dependencies.
   ========================================================================== */

(() => {
  'use strict';

  const STORAGE_KEY = 'rival-cart-v1';
  const MAX_QTY = 10;

  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initScrollReveal();
    initFaqAccordion();
    Cart.init();
    initShopFilters();
    initProductPage();
    initContactForm();
    initImageFallbacks();
  });

  /* ---------------------------------------------------------------------- */
  /* Shared helpers                                                          */
  /* ---------------------------------------------------------------------- */

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function clampInteger(value, min, max, fallback = min) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  function safeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[char]));
  }

  function safeImageSource(value) {
    const source = String(value || '');
    return source.startsWith('https://') || source.startsWith('http://') || source.startsWith('./') ||
      source.startsWith('../') || source.startsWith('assets/') ? source : 'assets/jersey-placeholder.svg';
  }

  /* ---------------------------------------------------------------------- */
  /* Mobile navigation                                                       */
  /* ---------------------------------------------------------------------- */

  function initMobileNav() {
    const button = qs('.menu-button');
    const menu = qs('.nav-menu');
    if (!button || !menu) return;

    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'primary-navigation');

    if (!menu.id) menu.id = 'primary-navigation';

    const close = () => {
      menu.classList.remove('is-open');
      button.classList.remove('w--open');
      button.setAttribute('aria-expanded', 'false');
    };

    button.addEventListener('click', (event) => {
      event.preventDefault();
      const open = menu.classList.toggle('is-open');
      button.classList.toggle('w--open', open);
      button.setAttribute('aria-expanded', String(open));
    });

    qsa('a', menu).forEach((link) => link.addEventListener('click', close));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Scroll reveal                                                           */
  /* ---------------------------------------------------------------------- */

  function initScrollReveal() {
    const items = qsa('.reveal');
    if (!items.length) return;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    items.forEach((item) => observer.observe(item));
  }

  /* ---------------------------------------------------------------------- */
  /* FAQ accordion                                                           */
  /* ---------------------------------------------------------------------- */

  function initFaqAccordion() {
    const items = qsa('.faq-list-wrap');
    if (!items.length) return;

    items.forEach((item, index) => {
      const question = qs('.faq-question', item);
      if (!question) return;

      if (!question.id) question.id = `faq-question-${index + 1}`;
      question.setAttribute('aria-expanded', 'false');

      question.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');

        items.forEach((other) => {
          other.classList.remove('is-open');
          const otherQuestion = qs('.faq-question', other);
          if (otherQuestion) otherQuestion.setAttribute('aria-expanded', 'false');
        });

        if (willOpen) {
          item.classList.add('is-open');
          question.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Cart                                                                    */
  /* ---------------------------------------------------------------------- */

  const Cart = {
    items: [],
    overlay: null,
    drawer: null,
    toast: null,
    countEls: [],
    toastTimer: null,

    init() {
      this.overlay = qs('.cart-drawer-overlay');
      this.drawer = qs('.cart-drawer');
      this.toast = qs('.cart-toast');
      this.countEls = qsa('.cart-quantity');

      this.restore();

      qsa('[data-cart-open]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          this.open();
        });
      });

      qsa('[data-cart-close]').forEach((button) => {
        button.addEventListener('click', () => this.close());
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') this.close();
      });

      if (this.overlay) this.overlay.addEventListener('click', () => this.close());

      const checkout = qs('.cart-drawer-checkout');
      if (checkout) {
        checkout.addEventListener('click', () => {
          if (!this.items.length) {
            this.showToast('Your cart is empty');
            return;
          }
          this.showToast('Checkout is ready to connect to your payment backend');
        });
      }

      this.render();
    },

    restore() {
      try {
        const raw = window.localStorage?.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;

        this.items = parsed
          .filter((item) => item && typeof item.name === 'string')
          .map((item) => ({
            name: item.name.slice(0, 120),
            price: Math.max(0, safeNumber(item.price)),
            image: safeImageSource(item.image),
            size: String(item.size || 'One Size').slice(0, 20),
            qty: clampInteger(item.qty, 1, MAX_QTY, 1),
          }));
      } catch {
        this.items = [];
      }
    },

    persist() {
      try {
        window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(this.items));
      } catch {
        // Storage may be unavailable in private or restricted browsing modes.
      }
    },

    add(item) {
      if (!item || typeof item.name !== 'string') return;

      const normalized = {
        name: item.name.slice(0, 120),
        price: Math.max(0, safeNumber(item.price)),
        image: safeImageSource(item.image),
        size: String(item.size || 'One Size').slice(0, 20),
        qty: clampInteger(item.qty, 1, MAX_QTY, 1),
      };

      const existing = this.items.find(
        (current) => current.name === normalized.name && current.size === normalized.size
      );

      if (existing) {
        existing.qty = Math.min(MAX_QTY, existing.qty + normalized.qty);
      } else {
        this.items.push(normalized);
      }

      this.persist();
      this.render();
      this.open();
      this.showToast(`${normalized.name} added to cart`);
    },

    remove(index) {
      if (!Number.isInteger(index) || index < 0 || index >= this.items.length) return;
      this.items.splice(index, 1);
      this.persist();
      this.render();
    },

    open() {
      if (!this.drawer) return;
      this.drawer.classList.add('is-open');
      this.overlay?.classList.add('is-open');
      document.body.classList.add('cart-is-open');
    },

    close() {
      if (!this.drawer) return;
      this.drawer.classList.remove('is-open');
      this.overlay?.classList.remove('is-open');
      document.body.classList.remove('cart-is-open');
    },

    showToast(message) {
      if (!this.toast) return;
      this.toast.textContent = String(message);
      this.toast.classList.add('is-visible');
      clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => {
        this.toast?.classList.remove('is-visible');
      }, 2200);
    },

    render() {
      const count = this.items.reduce((sum, item) => sum + item.qty, 0);
      this.countEls.forEach((element) => {
        element.textContent = String(count);
      });

      const list = qs('.cart-drawer-items');
      const subtotalEl = qs('.cart-drawer-subtotal-value');
      if (!list) return;

      if (!this.items.length) {
        list.innerHTML = '<div class="cart-drawer-empty">Your cart is empty.</div>';
        if (subtotalEl) subtotalEl.textContent = '$0.00';
        return;
      }

      list.innerHTML = this.items.map((item, index) => `
        <div class="cart-drawer-item">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />
          <div class="cart-drawer-item-info">
            <div class="cart-drawer-item-name">${escapeHtml(item.name)}</div>
            <div class="cart-drawer-item-meta">Size ${escapeHtml(item.size)} &middot; Qty ${item.qty} &middot; $${item.price.toFixed(2)}</div>
            <button class="cart-drawer-item-remove" type="button" data-remove-index="${index}">Remove</button>
          </div>
        </div>
      `).join('');

      qsa('[data-remove-index]', list).forEach((button) => {
        button.addEventListener('click', () => this.remove(Number(button.dataset.removeIndex)));
      });

      const subtotal = this.items.reduce((sum, item) => sum + item.price * item.qty, 0);
      if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;

      qsa('img', list).forEach((img) => {
        img.addEventListener('error', () => {
          img.src = 'assets/jersey-placeholder.svg';
        }, { once: true });
      });
    },
  };

  /* ---------------------------------------------------------------------- */
  /* Shop filters, sorting and quick add                                     */
  /* ---------------------------------------------------------------------- */

  function initShopFilters() {
    const grid = qs('[data-shop-grid]');
    if (!grid) return;

    const cards = qsa('.shop-item', grid);
    const teamInputs = qsa('[data-filter-team]');
    const sizeInputs = qsa('[data-filter-size]');
    const priceInput = qs('[data-filter-price]');
    const priceValueEl = qs('.price-range-value');
    const sortSelect = qs('[data-sort-select]');
    const resultsCount = qs('[data-results-count]');
    const clearBtn = qs('[data-clear-filters]');
    const emptyState = qs('[data-empty-state]');

    const mobileToggle = qs('[data-mobile-filter-toggle]');
    const filterPanel = qs('.filter-panel');
    const filterClose = qs('.filter-panel-close');

    mobileToggle?.addEventListener('click', () => filterPanel?.classList.add('is-open'));
    filterClose?.addEventListener('click', () => filterPanel?.classList.remove('is-open'));

    function applyFilters() {
      const checkedTeams = teamInputs.filter((input) => input.checked).map((input) => input.value);
      const checkedSizes = sizeInputs.filter((input) => input.checked).map((input) => input.value);
      const maxPrice = priceInput ? safeNumber(priceInput.value, Infinity) : Infinity;

      if (priceValueEl) {
        priceValueEl.textContent = `Up to $${Number.isFinite(maxPrice) ? maxPrice : 0}`;
      }

      let visibleCount = 0;

      cards.forEach((card) => {
        const team = card.dataset.team || '';
        const sizes = (card.dataset.sizes || '').split(',').map((size) => size.trim()).filter(Boolean);
        const price = safeNumber(card.dataset.price, Infinity);

        const visible =
          (!checkedTeams.length || checkedTeams.includes(team)) &&
          (!checkedSizes.length || checkedSizes.some((size) => sizes.includes(size))) &&
          price <= maxPrice;

        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      if (resultsCount) {
        resultsCount.textContent = `${visibleCount} jersey${visibleCount === 1 ? '' : 's'}`;
      }
      if (emptyState) emptyState.hidden = visibleCount !== 0;
    }

    function sortCards() {
      const value = sortSelect?.value || 'featured';
      const sorted = [...cards];

      if (value === 'price-asc') {
        sorted.sort((a, b) => safeNumber(a.dataset.price, Infinity) - safeNumber(b.dataset.price, Infinity));
      } else if (value === 'price-desc') {
        sorted.sort((a, b) => safeNumber(b.dataset.price, 0) - safeNumber(a.dataset.price, 0));
      } else if (value === 'name-asc') {
        sorted.sort((a, b) => (a.dataset.name || '').localeCompare(b.dataset.name || ''));
      }

      sorted.forEach((card) => grid.appendChild(card));
      applyFilters();
    }

    [...teamInputs, ...sizeInputs].forEach((input) => input.addEventListener('change', applyFilters));
    priceInput?.addEventListener('input', applyFilters);
    sortSelect?.addEventListener('change', sortCards);

    clearBtn?.addEventListener('click', () => {
      teamInputs.forEach((input) => { input.checked = false; });
      sizeInputs.forEach((input) => { input.checked = false; });
      if (priceInput) priceInput.value = priceInput.max || '150';
      if (sortSelect) sortSelect.value = 'featured';
      sortCards();
    });

    qsa('[data-quick-add]', grid).forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const card = button.closest('.shop-item');
        const image = qs('img', card);
        if (!card || !image) return;

        Cart.add({
          name: card.dataset.name || 'RIVAL Jersey',
          price: safeNumber(card.dataset.price),
          image: image.currentSrc || image.src,
          size: 'M',
          qty: 1,
        });
      });
    });

    applyFilters();
  }

  /* ---------------------------------------------------------------------- */
  /* Contact form                                                            */
  /* ---------------------------------------------------------------------- */

  function initContactForm() {
    const form = qs('#contact-form');
    if (!form) return;

    const status = qs('[data-form-status]', form);

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (status) {
        status.classList.add('is-visible');
        status.setAttribute('role', 'status');
        status.textContent = 'Thanks — your message has been received.';
      }

      form.reset();
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Product detail page                                                     */
  /* ---------------------------------------------------------------------- */

  function initProductPage() {
    const gallery = qs('[data-product-gallery]');
    if (gallery) {
      const mainImg = qs('.gallery-main img', gallery);

      qsa('.gallery-thumb', gallery).forEach((thumb) => {
        thumb.addEventListener('click', () => {
          if (!mainImg) return;

          qsa('.gallery-thumb', gallery).forEach((item) => {
            item.classList.remove('is-active');
            item.setAttribute('aria-selected', 'false');
          });

          thumb.classList.add('is-active');
          thumb.setAttribute('aria-selected', 'true');

          const source = thumb.dataset.full || qs('img', thumb)?.currentSrc || qs('img', thumb)?.src;
          if (source) {
            mainImg.src = source;
            mainImg.removeAttribute('srcset');
          }
        });
      });
    }

    const sizeRow = qs('[data-size-selector]');
    const sizeError = qs('.size-error');
    let selectedSize = null;

    if (sizeRow) {
      qsa('.size-swatch', sizeRow).forEach((button) => {
        button.addEventListener('click', () => {
          qsa('.size-swatch', sizeRow).forEach((item) => item.classList.remove('is-active'));
          button.classList.add('is-active');
          selectedSize = button.dataset.size || null;
          sizeError?.classList.remove('is-visible');
        });
      });
    }

    const qtyStepper = qs('[data-qty-stepper]');
    let qty = 1;

    if (qtyStepper) {
      const display = qs('[data-qty-display]', qtyStepper);
      const minus = qs('[data-qty-minus]', qtyStepper);
      const plus = qs('[data-qty-plus]', qtyStepper);

      const updateQty = (next) => {
        qty = clampInteger(next, 1, MAX_QTY, 1);
        if (display) display.textContent = String(qty);
      };

      minus?.addEventListener('click', () => updateQty(qty - 1));
      plus?.addEventListener('click', () => updateQty(qty + 1));
      updateQty(qty);
    }

    const addButton = qs('[data-product-add]');
    if (!addButton) return;

    addButton.addEventListener('click', (event) => {
      event.preventDefault();

      if (sizeRow && !selectedSize) {
        sizeError?.classList.add('is-visible');
        return;
      }

      Cart.add({
        name: addButton.dataset.name || 'RIVAL Jersey',
        price: safeNumber(addButton.dataset.price),
        image: safeImageSource(addButton.dataset.image),
        size: selectedSize || 'One Size',
        qty,
      });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Image error handling                                                    */
  /* ---------------------------------------------------------------------- */

  function initImageFallbacks() {
    qsa('img').forEach((image) => {
      image.addEventListener('error', () => {
        if (image.dataset.fallbackApplied === 'true') return;
        image.dataset.fallbackApplied = 'true';
        image.src = 'assets/jersey-placeholder.svg';
        image.removeAttribute('srcset');
      }, { once: true });
    });
  }
})();
