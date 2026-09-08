// ========================================
// Lenis smooth scroll
// ========================================
let lenis = null;
if (typeof Lenis !== 'undefined') {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  const lenisRaf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(lenisRaf);
  };
  requestAnimationFrame(lenisRaf);
}

// ========================================
// AOS init
// ========================================
if (typeof AOS !== 'undefined') {
  AOS.init({
    duration: 900,
    once: true,
    offset: 80,
    easing: 'ease-out-cubic',
  });
  if (lenis) lenis.on('scroll', AOS.refresh);
}

// ========================================
// Scroll lock
// ========================================
// Page scrolling is blocked while ANY element in the document carries the
// data-scroll-lock attribute. Set it from code (menu, modal, popup) or drop it
// straight into the markup — a MutationObserver picks up either way.
// data-scroll-lock="false" counts as unlocked, so it can be toggled in place.
const SCROLL_LOCK_ATTR = 'data-scroll-lock';

function syncScrollLock() {
  const root = document.documentElement;
  const locked = !!document.querySelector(`[${SCROLL_LOCK_ATTR}]:not([${SCROLL_LOCK_ATTR}="false"])`);

  if (locked === root.hasAttribute('data-scroll-locked')) return;

  if (locked) {
    // reserve the scrollbar gutter so the page does not jump
    root.style.setProperty('--scrollbar-width', `${window.innerWidth - root.clientWidth}px`);
    root.setAttribute('data-scroll-locked', '');
    if (lenis) lenis.stop();
  } else {
    root.removeAttribute('data-scroll-locked');
    root.style.removeProperty('--scrollbar-width');
    if (lenis) lenis.start();
  }
}

new MutationObserver(syncScrollLock).observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: [SCROLL_LOCK_ATTR],
});

syncScrollLock();

// ========================================
// Nav Menu
// ========================================
const navMenu      = document.getElementById('nav-menu');
const burger       = document.querySelector('.header__burger');
const navMenuClose = document.getElementById('nav-menu-close');

function openNavMenu() {
  navMenu.classList.add('active');
  navMenu.setAttribute(SCROLL_LOCK_ATTR, '');
}

function closeNavMenu() {
  navMenu.classList.remove('active');
  navMenu.removeAttribute(SCROLL_LOCK_ATTR);
}

if (navMenu && burger && navMenuClose) {
  burger.addEventListener('click', openNavMenu);
  navMenuClose.addEventListener('click', closeNavMenu);
  document.querySelectorAll('.nav-menu__item').forEach(link => {
    link.addEventListener('click', closeNavMenu);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navMenu.classList.contains('active')) closeNavMenu();
  });
}

// ========================================
// Popups
// ========================================
// Any element with data-popup-open="<popup id>" opens that popup; anything with
// data-popup-close inside it (or a click on the backdrop / Escape) closes it.
// Handled by delegation, so triggers added later work without re-binding.
function openPopup(id) {
  const popup = document.getElementById(id);
  if (!popup) return;

  popup.classList.add('active');
  popup.setAttribute(SCROLL_LOCK_ATTR, '');
}

function closePopup(popup) {
  if (!popup || !popup.classList.contains('active')) return;

  popup.classList.remove('active');
  popup.removeAttribute(SCROLL_LOCK_ATTR);

  // modal keeps a success screen — put it back after the closing animation
  setTimeout(() => {
    popup.querySelector('.modal__body')?.classList.remove('hiding');
    popup.querySelector('.modal__success')?.classList.remove('active');
  }, 300);
}

document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-popup-open]');
  if (opener) {
    e.preventDefault();
    openPopup(opener.dataset.popupOpen);
    return;
  }

  const closer = e.target.closest('[data-popup-close]');
  if (closer) {
    e.preventDefault();
    closePopup(closer.dataset.popupClose
      ? document.getElementById(closer.dataset.popupClose)
      : closer.closest('[data-popup]'));
    return;
  }

  // click on the backdrop itself, not on the dialog inside it
  if (e.target.matches('[data-popup]')) closePopup(e.target);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('[data-popup].active').forEach(closePopup);
});

// Request form: swap the body for the success screen on submit
document.getElementById('modal-form')?.addEventListener('submit', (e) => {
  e.preventDefault();

  const body = document.getElementById('modal-body');
  const success = document.getElementById('modal-success');

  if (body) body.classList.add('hiding');
  setTimeout(() => success?.classList.add('active'), 280);
});

// ========================================
// Hero background slider
// ========================================
(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const slides = [...hero.querySelectorAll('.hero__slide')];
  const pagination = hero.querySelector('.hero__pagination');
  if (slides.length < 2 || !pagination) return;

  // Keep in sync with --hero-interval in style.css (drives the tick fill).
  const INTERVAL = 5000;
  hero.style.setProperty('--hero-interval', `${INTERVAL}ms`);

  const bullets = slides.map((_, i) => {
    const bullet = document.createElement('button');
    bullet.type = 'button';
    bullet.className = 'hero__bullet';
    bullet.setAttribute('aria-label', `Слайд ${i + 1}`);
    bullet.innerHTML = '<span class="hero__bullet-fill"></span>';
    bullet.addEventListener('click', () => goTo(i));
    pagination.append(bullet);
    return bullet;
  });

  let current = 0;
  let timer = null;

  const goTo = (index) => {
    current = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
    bullets.forEach((bullet, i) => {
      bullet.classList.toggle('is-active', i === current);
      // Restart the fill animation from zero on the tick that just became active.
      const fill = bullet.querySelector('.hero__bullet-fill');
      fill.style.animation = 'none';
      void fill.offsetHeight;
      fill.style.animation = '';
    });

    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), INTERVAL);
  };

  goTo(0);
})();

// ========================================
// Number counters (countUp.js)
// ========================================
(() => {
  const items = document.querySelectorAll('[data-count]');
  if (!items.length || typeof countUp === 'undefined') return;

  const start = (el) => {
    const counter = new countUp.CountUp(el, Number(el.dataset.count), {
      startVal: 0,
      duration: 2,
      decimalPlaces: Number(el.dataset.decimals || 0),
      separator: ',',
      decimal: ',',
    });
    if (!counter.error) counter.start();
  };

  // Each number runs once, when its block scrolls into view.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      start(entry.target);
    });
  }, { threshold: 0.6 });

  items.forEach((el) => observer.observe(el));
})();

// ========================================
// Stats slider
// ========================================
// Base values are the ≤1919 layout (0.75 scale); the 1920 breakpoint restores
// the full-size gap and container padding. Swiper re-applies these on resize.
if (typeof Swiper !== 'undefined' && document.querySelector('.stats__slider')) {
  new Swiper('.stats__slider', {
    slidesPerView: 'auto',
    // base = the ≤570 layout: one card per screen, 20px to the edges
    spaceBetween: 20,
    slidesOffsetBefore: 20,
    slidesOffsetAfter: 20,
    breakpoints: {
      571: {
        spaceBetween: 11.25,
        slidesOffsetBefore: 42,
        slidesOffsetAfter: 42,
      },
      1920: {
        spaceBetween: 15,
        slidesOffsetBefore: 56,
        slidesOffsetAfter: 56,
      },
    },
    navigation: {
      prevEl: '.stats__nav-btn--prev',
      nextEl: '.stats__nav-btn--next',
    },
  });
}

// ========================================
// Production slider
// ========================================
// Base values are the ≤1919 layout (0.75 scale); the 1920 breakpoint restores
// the full-size gap and container padding. Swiper re-applies these on resize.
if (typeof Swiper !== 'undefined' && document.querySelector('.production__slider')) {
  new Swiper('.production__slider', {
    slidesPerView: 'auto',
    // base = the ≤570 layout: one card per screen, 20px gap and edges
    spaceBetween: 20,
    slidesOffsetBefore: 20,
    slidesOffsetAfter: 20,
    breakpoints: {
      571: {
        spaceBetween: 22.5,
        slidesOffsetBefore: 42,
        slidesOffsetAfter: 42,
      },
      1920: {
        spaceBetween: 30,
        slidesOffsetBefore: 56,
        slidesOffsetAfter: 56,
      },
    },
    navigation: {
      prevEl: '.production__nav-btn--prev',
      nextEl: '.production__nav-btn--next',
    },
  });
}

// ========================================
// Turnkey projects slider
// ========================================
// Below 571px the section drops the slider entirely and the cards stack into a
// sticky deck (see media.css), so Swiper is destroyed there and rebuilt above.
if (typeof Swiper !== 'undefined' && document.querySelector('.turnkey__slider')) {
  const turnkeyQuery = window.matchMedia('(min-width: 571px)');
  let turnkeySwiper = null;

  const syncTurnkeySlider = () => {
    if (turnkeyQuery.matches && !turnkeySwiper) {
      turnkeySwiper = new Swiper('.turnkey__slider', {
        slidesPerView: 'auto',
        spaceBetween: 13.5,
        slidesOffsetBefore: 42,
        slidesOffsetAfter: 42,
        breakpoints: {
          1920: {
            spaceBetween: 18,
            slidesOffsetBefore: 56,
            slidesOffsetAfter: 56,
          },
        },
        navigation: {
          prevEl: '.turnkey__nav-btn--prev',
          nextEl: '.turnkey__nav-btn--next',
        },
      });
    } else if (!turnkeyQuery.matches && turnkeySwiper) {
      // true, true — also strips the inline styles Swiper left behind
      turnkeySwiper.destroy(true, true);
      turnkeySwiper = null;
    }
  };

  turnkeyQuery.addEventListener('change', syncTurnkeySlider);
  syncTurnkeySlider();
}

// ========================================
// Transition slider
// ========================================
// Base values are the ≤1919 layout (0.75 scale); the 1920 breakpoint restores
// the full-size gap and container padding. Swiper re-applies these on resize.
if (typeof Swiper !== 'undefined' && document.querySelector('.transition__slider')) {
  new Swiper('.transition__slider', {
    slidesPerView: 'auto',
    // base = the ≤570 layout
    spaceBetween: 10,
    slidesOffsetBefore: 20,
    slidesOffsetAfter: 20,
    breakpoints: {
      571: {
        spaceBetween: 22.5,
        slidesOffsetBefore: 42,
        slidesOffsetAfter: 42,
      },
      1920: {
        spaceBetween: 30,
        slidesOffsetBefore: 56,
        slidesOffsetAfter: 56,
      },
    },
    navigation: {
      prevEl: '.transition__nav-btn--prev',
      nextEl: '.transition__nav-btn--next',
    },
  });
}

// ========================================
// Scroll to top
// ========================================
document.querySelector('.footer__scroll-top')?.addEventListener('click', () => {
  if (lenis) {
    lenis.scrollTo(0);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});
