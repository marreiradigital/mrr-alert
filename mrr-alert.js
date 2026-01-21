(() => {
  'use strict';

  const doc = document;
  const win = window;

  const DEFAULTS = {
    title: '',
    text: '',
    html: '',
    icon: 'neutral', // success | error | warning | info | question | loading | neutral
    showCloseButton: true,
    showCancelButton: false,
    showConfirmButton: true,
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '', // se vazio, decide pelo icon
    allowOutsideClick: true,
    allowEscapeKey: true,
    focusConfirm: true,
    timer: 0, // ms
    timerProgressBar: false,
    toast: false,
    position: 'top-right', // (toast) top-right | top-left | bottom-right | bottom-left
    didOpen: null,
    willClose: null
  };

  const state = {
    host: null,
    modal: null,
    toastHost: null,
    active: null,
    lastFocus: null,
    keyHandler: null,
    trapHandler: null,
    timerId: 0,
    rafId: 0,
    progressEl: null,
    progressStart: 0,
    progressDur: 0
  };

  const svg = {
    x: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    check: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    warn: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 1 21h22L12 3Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M12 9v5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M12 17h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    info: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2.2"/>
      <path d="M12 10v7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M12 7h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    question: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2.2"/>
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M12 17h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>`
  };

  function isFn(v) { return typeof v === 'function'; }
  function isStr(v) { return typeof v === 'string'; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function el(tag, cls, attrs) {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) {
      for (const k in attrs) {
        if (k === 'text') n.textContent = attrs[k];
        else if (k === 'html') n.innerHTML = attrs[k];
        else n.setAttribute(k, attrs[k]);
      }
    }
    return n;
  }

  function ensureHosts() {
    if (!state.toastHost) {
      state.toastHost = el('div', 'mrr_alert_toast_host');
      doc.body.appendChild(state.toastHost);
    }
    if (!state.host) {
      state.host = el('div', 'mrr_alert_host', { 'aria-hidden': 'true' });
      doc.body.appendChild(state.host);
    }
  }

  function variantFromIcon(icon) {
    if (icon === 'success') return 'mrr_v_success';
    if (icon === 'error') return 'mrr_v_error';
    if (icon === 'warning') return 'mrr_v_warning';
    if (icon === 'info') return 'mrr_v_info';
    if (icon === 'question') return 'mrr_v_info';
    if (icon === 'loading') return 'mrr_v_neutral';
    return 'mrr_v_neutral';
  }

  function colorFromIcon(icon) {
    if (icon === 'success') return 'var(--mrr_alert_success)';
    if (icon === 'error') return 'var(--mrr_alert_error)';
    if (icon === 'warning') return 'var(--mrr_alert_warning)';
    if (icon === 'info') return 'var(--mrr_alert_info)';
    if (icon === 'question') return 'var(--mrr_alert_info)';
    return 'var(--mrr_alert_neutral)';
  }

  function iconMarkup(icon) {
    if (icon === 'success') return svg.check;
    if (icon === 'error') return svg.warn;
    if (icon === 'warning') return svg.warn;
    if (icon === 'info') return svg.info;
    if (icon === 'question') return svg.question;
    if (icon === 'loading') return `<span class="mrr_alert_spinner" aria-hidden="true"></span>`;
    return svg.info;
  }

  function focusable(root) {
    const q = root.querySelectorAll(
      'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
    );
    const out = [];
    for (const n of q) {
      if (!n.disabled && n.getAttribute('aria-hidden') !== 'true' && n.offsetParent !== null) out.push(n);
    }
    return out;
  }

  function startTimer(timer, withBar, progressEl, onDone) {
    stopTimer();
    if (!timer || timer < 50) return;

    state.timerId = win.setTimeout(onDone, timer);

    if (withBar && progressEl) {
      state.progressEl = progressEl;
      state.progressStart = performance.now();
      state.progressDur = timer;
      progressEl.style.width = '0%';

      const tick = () => {
        const t = performance.now() - state.progressStart;
        const p = clamp((t / state.progressDur) * 100, 0, 100);
        progressEl.style.width = p.toFixed(2) + '%';
        if (p < 100) state.rafId = win.requestAnimationFrame(tick);
      };
      state.rafId = win.requestAnimationFrame(tick);
    }
  }

  function stopTimer() {
    if (state.timerId) win.clearTimeout(state.timerId);
    if (state.rafId) win.cancelAnimationFrame(state.rafId);
    state.timerId = 0;
    state.rafId = 0;
    state.progressEl = null;
    state.progressStart = 0;
    state.progressDur = 0;
  }

  function teardownModal() {
    stopTimer();

    if (state.keyHandler) doc.removeEventListener('keydown', state.keyHandler, true);
    if (state.trapHandler && state.modal) state.modal.removeEventListener('keydown', state.trapHandler, true);

    state.keyHandler = null;
    state.trapHandler = null;

    if (state.modal) state.modal.remove();
    state.modal = null;

    if (state.host) {
      state.host.classList.remove('mrr_is_open');
      state.host.setAttribute('aria-hidden', 'true');
    }

    if (state.lastFocus && state.lastFocus.focus) {
      try { state.lastFocus.focus({ preventScroll: true }); } catch (_) {}
    }
    state.lastFocus = null;
  }

  function closeModal(result) {
    const a = state.active;
    if (!a) return;

    state.active = null;

    try {
      if (isFn(a.opts.willClose)) a.opts.willClose();
    } catch (_) {}

    teardownModal();
    a.resolve(result);
  }

  function bindTrap(modal) {
    state.trapHandler = (e) => {
      if (e.key !== 'Tab') return;
      const items = focusable(modal);
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && doc.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && doc.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    modal.addEventListener('keydown', state.trapHandler, true);
  }

  function fire(options = {}) {
    ensureHosts();

    // Fecha o modal anterior (se existir)
    if (state.active) closeModal({ isDismissed: true, dismiss: 'replaced' });

    const opts = { ...DEFAULTS, ...(options || {}) };
    if (opts.toast) return toast(opts);

    state.lastFocus = doc.activeElement;

    const variant = variantFromIcon(opts.icon);
    const confirmColor = opts.confirmButtonColor || colorFromIcon(opts.icon);

    // Host/backdrop click
    const onBackdrop = (e) => {
      if (!opts.allowOutsideClick) return;
      if (e.target === state.host) closeModal({ isDismissed: true, dismiss: 'backdrop' });
    };

    state.host.innerHTML = '';
    state.host.setAttribute('aria-hidden', 'false');
    state.host.className = 'mrr_alert_host mrr_is_open';
    state.host.addEventListener('mousedown', onBackdrop, { once: true });

    const modal = el('div', `mrr_alert_modal ${variant}`, {
      role: 'dialog',
      'aria-modal': 'true'
    });
    modal.style.setProperty('--mrr_confirm', confirmColor);

    const header = el('div', 'mrr_alert_modal_header');
    const titleWrap = el('div', '', {});
    const xBtn = el('button', 'mrr_alert_modal_x', { type: 'button', 'aria-label': 'Fechar', html: svg.x });

    if (!opts.showCloseButton) xBtn.style.display = 'none';

    xBtn.addEventListener('click', () => closeModal({ isDismissed: true, dismiss: 'close' }));

    header.appendChild(titleWrap);
    header.appendChild(xBtn);

    const body = el('div', 'mrr_alert_modal_body');

    const badge = el('div', 'mrr_alert_badge');
    const iconEl = el('div', 'mrr_alert_icon', { html: iconMarkup(opts.icon) });
    iconEl.style.color = colorFromIcon(opts.icon);
    badge.appendChild(iconEl);

    const h1 = el('h2', 'mrr_alert_h1', { text: opts.title || '' });
    const p = el('p', 'mrr_alert_p', { text: opts.text || '' });

    if (!opts.title) h1.style.display = 'none';
    if (!opts.text) p.style.display = 'none';

    body.appendChild(badge);
    body.appendChild(h1);
    body.appendChild(p);

    let custom = null;
    if (isStr(opts.html) && opts.html.trim()) {
      custom = el('div', 'mrr_alert_custom', { html: opts.html });
      body.appendChild(custom);
    }

    const actions = el('div', 'mrr_alert_actions');

    const cancelBtn = el('button', 'mrr_alert_btn mrr_secondary', { type: 'button', text: opts.cancelButtonText });
    const confirmBtn = el('button', 'mrr_alert_btn mrr_primary', { type: 'button', text: opts.confirmButtonText });

    if (!opts.showCancelButton) cancelBtn.style.display = 'none';
    if (!opts.showConfirmButton) confirmBtn.style.display = 'none';

    cancelBtn.addEventListener('click', () => closeModal({ isDismissed: true, dismiss: 'cancel' }));
    confirmBtn.addEventListener('click', () => closeModal({ isConfirmed: true, value: true }));

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(actions);

    state.host.appendChild(modal);
    state.modal = modal;

    // ESC / Enter
    state.keyHandler = (e) => {
      if (e.key === 'Escape' && opts.allowEscapeKey) {
        e.preventDefault();
        closeModal({ isDismissed: true, dismiss: 'esc' });
        return;
      }
      if (e.key === 'Enter') {
        const a = doc.activeElement;
        if (a && a.tagName === 'TEXTAREA') return;
        if (opts.showConfirmButton && confirmBtn.offsetParent !== null) {
          e.preventDefault();
          confirmBtn.click();
        }
      }
    };
    doc.addEventListener('keydown', state.keyHandler, true);

    bindTrap(modal);

    // Animate in + focus
    requestAnimationFrame(() => {
      modal.classList.add('mrr_in');
      if (opts.focusConfirm && confirmBtn.offsetParent !== null) confirmBtn.focus({ preventScroll: true });
      else if (cancelBtn.offsetParent !== null) cancelBtn.focus({ preventScroll: true });
    });

    // Timer (autoclose)
    let progress = null;
    if (opts.timerProgressBar && opts.timer > 0) {
      progress = el('div', 'mrr_alert_progress');
      modal.appendChild(progress);
      progress.style.background = colorFromIcon(opts.icon);
    }

    return new Promise((resolve) => {
      state.active = { resolve, opts };

      try { if (isFn(opts.didOpen)) opts.didOpen(modal); } catch (_) {}

      startTimer(opts.timer, opts.timerProgressBar, progress, () => {
        closeModal({ isDismissed: true, dismiss: 'timer' });
      });
    });
  }

  function toast(options = {}) {
    ensureHosts();

    const opts = { ...DEFAULTS, ...(options || {}), toast: true };

    // position (simples)
    const host = state.toastHost;
    if (opts.position && opts.position.includes('left')) host.style.right = 'auto', host.style.left = '2rem';
    else host.style.left = 'auto', host.style.right = '2rem';
    if (opts.position && opts.position.includes('bottom')) host.style.top = 'auto', host.style.bottom = '2rem';
    else host.style.bottom = 'auto', host.style.top = '2rem';

    const variant = variantFromIcon(opts.icon);

    const item = el('div', `mrr_alert_toast ${variant}`, {
      role: (opts.icon === 'error' || opts.icon === 'warning') ? 'alert' : 'status',
      'aria-live': (opts.icon === 'error' || opts.icon === 'warning') ? 'assertive' : 'polite'
    });

    const bar = el('div', 'mrr_alert_bar');
    const ic = el('div', 'mrr_alert_icon', { html: iconMarkup(opts.icon) });
    ic.style.color = colorFromIcon(opts.icon);

    const content = el('div');
    const t = el('p', 'mrr_alert_toast_title', { text: opts.title || '' });
    const msg = el('p', 'mrr_alert_toast_text', { text: opts.text || '' });

    if (!opts.title) t.style.display = 'none';
    if (!opts.text) msg.style.display = 'none';

    content.appendChild(t);
    content.appendChild(msg);

    const x = el('button', 'mrr_alert_x', { type: 'button', 'aria-label': 'Fechar', html: svg.x });
    if (!opts.showCloseButton) x.style.display = 'none';

    const progress = el('div', 'mrr_alert_progress');
    progress.style.background = colorFromIcon(opts.icon);
    if (!opts.timerProgressBar || !opts.timer) progress.style.display = 'none';

    item.appendChild(bar);
    item.appendChild(ic);
    item.appendChild(content);
    item.appendChild(x);
    item.appendChild(progress);

    host.appendChild(item);

    let localTimerId = 0;
    let localRafId = 0;
    let start = 0;

    const remove = (reason) => {
      if (localTimerId) win.clearTimeout(localTimerId);
      if (localRafId) win.cancelAnimationFrame(localRafId);

      item.classList.remove('mrr_in');
      win.setTimeout(() => item.remove(), 160);

      try { if (isFn(opts.willClose)) opts.willClose(reason); } catch (_) {}
      resolve({ isDismissed: true, dismiss: reason });
    };

    x.addEventListener('click', () => remove('close'));

    // Animate in
    requestAnimationFrame(() => item.classList.add('mrr_in'));

    const resolve = (v) => v;
    const p = new Promise((res) => {
      // substitui resolve acima
      const _resolve = res;

      const done = (reason) => _resolve({ isDismissed: true, dismiss: reason });

      // override remove to actually resolve
      const _remove = (reason) => {
        if (localTimerId) win.clearTimeout(localTimerId);
        if (localRafId) win.cancelAnimationFrame(localRafId);

        item.classList.remove('mrr_in');
        win.setTimeout(() => item.remove(), 160);

        try { if (isFn(opts.willClose)) opts.willClose(reason); } catch (_) {}
        done(reason);
      };

      x.onclick = () => _remove('close');

      try { if (isFn(opts.didOpen)) opts.didOpen(item); } catch (_) {}

      if (opts.timer && opts.timer >= 50) {
        localTimerId = win.setTimeout(() => _remove('timer'), opts.timer);

        if (opts.timerProgressBar) {
          start = performance.now();
          const tick = () => {
            const t = performance.now() - start;
            const pc = clamp((t / opts.timer) * 100, 0, 100);
            progress.style.width = pc.toFixed(2) + '%';
            if (pc < 100) localRafId = win.requestAnimationFrame(tick);
          };
          localRafId = win.requestAnimationFrame(tick);
        }
      }
    });

    return p;
  }

  function close() {
    if (state.active) closeModal({ isDismissed: true, dismiss: 'api' });
  }

  function setDefaults(next = {}) {
    for (const k in next) DEFAULTS[k] = next[k];
  }

  // Helpers de API (açúcar sintático)
  const MrrAlert = {
    fire,
    toast,
    close,
    isOpen: () => !!state.active,
    setDefaults,

    basic: (o = {}) => fire({ icon: 'neutral', ...o }),
    success: (o = {}) => fire({ icon: 'success', confirmButtonColor: '', ...o }),
    error: (o = {}) => fire({ icon: 'error', confirmButtonColor: '', ...o }),
    info: (o = {}) => fire({ icon: 'info', confirmButtonColor: '', ...o }),
    warning: (o = {}) => fire({ icon: 'warning', confirmButtonColor: '', ...o }),

    html: (o = {}) => fire({ ...o, html: o.html || '', text: o.text || '' }),

    question: (o = {}) => fire({
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: o.confirmButtonText || 'Sim',
      cancelButtonText: o.cancelButtonText || 'Não',
      ...o
    }),

    confirm: (o = {}) => fire({
      icon: o.icon || 'warning',
      showCancelButton: true,
      confirmButtonText: o.confirmButtonText || 'Confirmar',
      cancelButtonText: o.cancelButtonText || 'Cancelar',
      ...o
    }),

    loading: (o = {}) => fire({
      icon: 'loading',
      title: o.title || 'Aguarde',
      text: o.text || '',
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showCloseButton: false,
      ...o
    }),

    autoClose: (o = {}) => fire({
      timer: o.timer || 2500,
      timerProgressBar: o.timerProgressBar !== false,
      ...o
    }),

    toastSuccess: (o = {}) => toast({ icon: 'success', timer: o.timer ?? 2500, timerProgressBar: true, ...o }),
    toastError: (o = {}) => toast({ icon: 'error', timer: o.timer ?? 3500, timerProgressBar: true, ...o }),
    toastInfo: (o = {}) => toast({ icon: 'info', timer: o.timer ?? 3000, timerProgressBar: true, ...o }),
    toastWarning: (o = {}) => toast({ icon: 'warning', timer: o.timer ?? 3500, timerProgressBar: true, ...o }),
    toastLoading: (o = {}) => toast({ icon: 'loading', timer: o.timer ?? 0, timerProgressBar: false, ...o })
  };

  win.MrrAlert = MrrAlert;
})();
