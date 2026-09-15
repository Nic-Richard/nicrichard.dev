function getGalleryIndex(gallery) {
  return Math.round(gallery.scrollLeft / gallery.clientWidth);
}

function updateDots(name, index) {
  document.querySelectorAll(`[data-gallery-dots="${name}"] button`)
    .forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === index));
}

function updateGalleryFade(gallery) {
  const shell = gallery.closest('.gallery-shell');
  if (!shell) return;

  const items = [...gallery.querySelectorAll('figure')];
  const item = items[getGalleryIndex(gallery)];
  if (!item) return;

  const atTop = item.scrollTop <= 2;
  const atBottom = item.scrollTop + item.clientHeight >= item.scrollHeight - 2;
  shell.classList.toggle('scrolled', !atTop);
  shell.classList.toggle('at-bottom', atBottom);
}

document.querySelectorAll('.gallery').forEach((gallery) => {
  const name = gallery.id.replace('gallery-', '');
  const slides = [...gallery.querySelectorAll('figure')];
  const dots = document.querySelector(`[data-gallery-dots="${name}"]`);

  if (dots) {
    slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Show screenshot ${index + 1}`);
      dot.classList.toggle('active', index === 0);
      dot.addEventListener('click', () => {
        gallery.scrollTo({ left: gallery.clientWidth * index, behavior: 'smooth' });
      });
      dots.appendChild(dot);
    });
  }

  gallery.addEventListener('scroll', () => {
    const index = getGalleryIndex(gallery);
    updateDots(name, index);
    updateGalleryFade(gallery);
  }, { passive: true });

  slides.forEach((slide) => {
    slide.addEventListener('scroll', () => updateGalleryFade(gallery), { passive: true });
  });

  updateGalleryFade(gallery);
});

document.querySelectorAll('[data-gallery-step]').forEach((button) => {
  button.addEventListener('click', () => {
    const name = button.dataset.galleryStep;
    const direction = Number(button.dataset.direction);
    const gallery = document.getElementById(`gallery-${name}`);
    if (!gallery) return;

    const count = gallery.querySelectorAll('figure').length;
    const current = getGalleryIndex(gallery);
    const next = (current + direction + count) % count;
    gallery.scrollTo({ left: gallery.clientWidth * next, behavior: 'smooth' });
  });
});

const mobileCarousels = [];

function initDeviceGallery(gallery) {
  const tabs = [...gallery.querySelectorAll('[data-device-tab]')];
  const panels = [...gallery.querySelectorAll('[data-device-panel]')];

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const selected = tab.dataset.deviceTab;
      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
      });
      panels.forEach((panel) => {
        const active = panel.dataset.devicePanel === selected;
        panel.hidden = !active;
        panel.classList.toggle('active', active);
      });
    });
  });
}

document.querySelectorAll('.device-gallery').forEach(initDeviceGallery);

function initMobileCarousel(shell) {
  const images = [...shell.querySelectorAll('.mobile-carousel-source img')].map((image) => ({
    src: image.getAttribute('src'),
    alt: image.alt
  }));
  const track = shell.querySelector('.mobile-carousel-track');
  const dots = shell.querySelector('.gallery-dots');
  const viewport = shell.querySelector('.mobile-carousel-viewport');
  const galleryName = shell.dataset.mobileGallery;
  let index = 0;
  let animating = false;
  let pointerStartX = null;
  let swipeFinishedAt = 0;

  if (!images.length || !track || !dots || !viewport || !galleryName) return;

  const wrapIndex = (value) => (value + images.length) % images.length;

  function createCard(position, imageIndex) {
    const resolvedIndex = wrapIndex(imageIndex);
    const card = document.createElement('figure');
    card.className = `mobile-carousel-card position-${position}`;
    card.dataset.position = position;
    card.dataset.imageIndex = String(resolvedIndex);

    const image = document.createElement('img');
    image.src = images[resolvedIndex].src;
    image.alt = images[resolvedIndex].alt;
    card.appendChild(image);
    return card;
  }

  function syncAccessibility() {
    track.querySelectorAll('.mobile-carousel-card').forEach((card) => {
      const current = card.dataset.position === 'current';
      card.tabIndex = current ? 0 : -1;
      card.setAttribute('role', current ? 'button' : 'presentation');
      if (current) card.setAttribute('aria-label', `Open ${galleryName.replace('-mobile', '')} mobile screenshots fullscreen`);
      else card.removeAttribute('aria-label');
    });
  }

  function updateDots() {
    [...dots.children].forEach((dot, dotIndex) => {
      dot.classList.toggle('active', dotIndex === index);
    });
  }

  function render() {
    track.classList.add('resetting');
    track.replaceChildren(
      createCard('far-prev', index - 2),
      createCard('prev', index - 1),
      createCard('current', index),
      createCard('next', index + 1),
      createCard('far-next', index + 2)
    );
    updateDots();
    syncAccessibility();
    requestAnimationFrame(() => requestAnimationFrame(() => track.classList.remove('resetting')));
  }

  function moveCards(direction) {
    const nextPositions = direction > 0
      ? { 'far-prev': 'exit-left', prev: 'far-prev', current: 'prev', next: 'current', 'far-next': 'next' }
      : { 'far-prev': 'prev', prev: 'current', current: 'next', next: 'far-next', 'far-next': 'exit-right' };

    [...track.children].forEach((card) => {
      const nextPosition = nextPositions[card.dataset.position];
      card.className = `mobile-carousel-card position-${nextPosition}`;
      card.dataset.position = nextPosition;
    });
  }

  function step(direction) {
    if (animating) return;
    animating = true;
    const transitionCard = track.querySelector('.position-current');
    moveCards(direction);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      index = wrapIndex(index + direction);

      const recycledPosition = direction > 0 ? 'exit-left' : 'exit-right';
      const recycledCard = track.querySelector(`.position-${recycledPosition}`);
      if (recycledCard) {
        const nextPosition = direction > 0 ? 'far-next' : 'far-prev';
        const imageIndex = direction > 0 ? index + 2 : index - 2;
        const resolvedIndex = wrapIndex(imageIndex);
        const image = recycledCard.querySelector('img');

        track.classList.add('resetting');
        image.src = images[resolvedIndex].src;
        image.alt = images[resolvedIndex].alt;
        recycledCard.className = `mobile-carousel-card position-${nextPosition}`;
        recycledCard.dataset.position = nextPosition;
        recycledCard.dataset.imageIndex = String(resolvedIndex);
        requestAnimationFrame(() => requestAnimationFrame(() => track.classList.remove('resetting')));
      }

      updateDots();
      syncAccessibility();
      animating = false;
    };

    if (!transitionCard) {
      finish();
      return;
    }

    transitionCard.addEventListener('transitionend', finish, { once: true });
    window.setTimeout(finish, 800);
  }

  images.forEach((_, dotIndex) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show mobile screenshot ${dotIndex + 1}`);
    dot.addEventListener('click', () => {
      if (dotIndex === index || animating) return;
      const forwardDistance = wrapIndex(dotIndex - index);
      step(forwardDistance <= images.length / 2 ? 1 : -1);
    });
    dots.appendChild(dot);
  });

  shell.querySelectorAll('[data-mobile-step]').forEach((button) => {
    button.addEventListener('click', () => step(Number(button.dataset.mobileStep)));
  });

  viewport.addEventListener('pointerdown', (event) => {
    pointerStartX = event.clientX;
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointerup', (event) => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(distance) > 38) {
      swipeFinishedAt = Date.now();
      step(distance < 0 ? 1 : -1);
    }
  });

  viewport.addEventListener('pointercancel', () => {
    pointerStartX = null;
  });

  viewport.addEventListener('click', () => {
    if (Date.now() - swipeFinishedAt < 350 || animating) return;
    const currentCard = track.querySelector('.mobile-carousel-card[data-position="current"]');
    if (!currentCard) return;
    openLightbox(galleryName, Number(currentCard.dataset.imageIndex), currentCard);
  });

  track.addEventListener('keydown', (event) => {
    const card = event.target.closest('.mobile-carousel-card[data-position="current"]');
    if (!card || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    openLightbox(galleryName, Number(card.dataset.imageIndex), card);
  });

  render();
  mobileCarousels.push({ galleryName, images });
}

document.querySelectorAll('[data-mobile-gallery]').forEach(initMobileCarousel);

window.addEventListener('load', () => {
  document.querySelectorAll('.gallery').forEach(updateGalleryFade);
});

function updateThemeIcon(isDark) {
  const icon = document.getElementById('theme-icon');
  const button = document.getElementById('theme-toggle');
  const themeColor = document.getElementById('theme-color');
  if (!icon || !button) return;

  icon.innerHTML = isDark
    ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    : '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
  button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  if (themeColor) themeColor.content = isDark ? '#111114' : '#f4f3ef';
}

const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('portfolio-theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
  });
}

updateThemeIcon(document.documentElement.classList.contains('dark'));

const systemTheme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
if (systemTheme) {
  systemTheme.addEventListener('change', (event) => {
    if (localStorage.getItem('portfolio-theme')) return;
    document.documentElement.classList.toggle('dark', event.matches);
    updateThemeIcon(event.matches);
  });
}

const revealTargets = [
  ...document.querySelectorAll('.project-intro > *'),
  ...document.querySelectorAll('.project .project-visual, .project .project-details'),
  ...document.querySelectorAll('.bottom-grid > div')
];

revealTargets.forEach((element) => element.classList.add('reveal'));

function startRevealObserver() {
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -4% 0px' });

    revealTargets.forEach((element) => revealObserver.observe(element));
  } else {
    revealTargets.forEach((element) => element.classList.add('visible'));
  }
}

async function prepareReveals() {
  const imageDecodes = [...document.images].map((image) => {
    if (image.complete) {
      return image.decode ? image.decode().catch(() => {}) : Promise.resolve();
    }

    return new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    }).then(() => image.decode ? image.decode().catch(() => {}) : undefined);
  });

  await Promise.race([
    Promise.all(imageDecodes),
    new Promise((resolve) => setTimeout(resolve, 1400))
  ]);

  requestAnimationFrame(() => requestAnimationFrame(startRevealObserver));
}

prepareReveals();

function scrollToProject(projectId) {
  const target = document.getElementById(projectId);
  if (!target) return;
  const header = document.querySelector('.site-header');
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const top = window.scrollY + target.getBoundingClientRect().top - headerHeight;
  window.scrollTo({ top, behavior: 'smooth' });
}

document.querySelectorAll('[data-project-jump]').forEach((control) => {
  control.addEventListener('click', (event) => {
    event.preventDefault();
    scrollToProject(control.dataset.projectJump);
  });
});

const lightboxGalleries = {};

document.querySelectorAll('.gallery[id]').forEach((gallery) => {
  const name = gallery.id.replace('gallery-', '');
  lightboxGalleries[name] = [...gallery.querySelectorAll('img')].map((image) => ({ src: image.src, alt: image.alt }));
});

mobileCarousels.forEach(({ galleryName, images }) => {
  lightboxGalleries[galleryName] = images.map((image) => ({
    src: new URL(image.src, window.location.href).href,
    alt: image.alt
  }));
});

const lightbox = document.createElement('div');
lightbox.className = 'gallery-lightbox';
lightbox.setAttribute('role', 'dialog');
lightbox.setAttribute('aria-modal', 'true');
lightbox.setAttribute('aria-label', 'Project screenshots');
lightbox.innerHTML = `
  <button class="gallery-lightbox-close" type="button" aria-label="Close fullscreen gallery"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 5L19 19M19 5L5 19"/></svg></button>
  <button class="gallery-lightbox-arrow previous" type="button" aria-label="Previous screenshot">
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 10 16" width="12"><path d="M8 2L2 8L8 14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>
  </button>
  <img class="gallery-lightbox-image" alt="">
  <button class="gallery-lightbox-arrow next" type="button" aria-label="Next screenshot">
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 10 16" width="12"><path d="M2 2L8 8L2 14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path></svg>
  </button>
  <div class="gallery-lightbox-count" aria-live="polite"></div>
`;
document.body.appendChild(lightbox);

const lightboxImage = lightbox.querySelector('.gallery-lightbox-image');
const lightboxCount = lightbox.querySelector('.gallery-lightbox-count');
const lightboxClose = lightbox.querySelector('.gallery-lightbox-close');
let lightboxGallery = null;
let lightboxIndex = 0;
let lightboxReturnFocus = null;

function updateLightbox() {
  const images = lightboxGalleries[lightboxGallery] || [];
  const image = images[lightboxIndex];
  if (!image) return;
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;
  lightboxCount.textContent = `${lightboxIndex + 1} / ${images.length}`;
}

function openLightbox(galleryName, index, trigger) {
  const images = lightboxGalleries[galleryName];
  if (!images || !images.length) return;
  lightboxGallery = galleryName;
  lightboxIndex = (index + images.length) % images.length;
  lightboxReturnFocus = trigger || document.activeElement;
  updateLightbox();
  document.body.classList.add('lightbox-open');
  lightbox.classList.add('open');
  lightboxClose.focus();
}

function closeLightbox() {
  if (!lightbox.classList.contains('open')) return;
  lightbox.classList.remove('open');
  document.body.classList.remove('lightbox-open');
  lightboxImage.removeAttribute('src');
  if (lightboxReturnFocus && typeof lightboxReturnFocus.focus === 'function') {
    lightboxReturnFocus.focus();
  }
}

function stepLightbox(direction) {
  const images = lightboxGalleries[lightboxGallery] || [];
  if (!images.length) return;
  lightboxIndex = (lightboxIndex + direction + images.length) % images.length;
  updateLightbox();
}

document.querySelectorAll('.gallery').forEach((gallery) => {
  const galleryName = gallery.id.replace('gallery-', '');
  gallery.querySelectorAll('figure img').forEach((image, index) => {
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `${image.alt}. Open fullscreen gallery`);
    image.addEventListener('click', () => openLightbox(galleryName, index, image));
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(galleryName, index, image);
      }
    });
  });
});

lightboxClose.addEventListener('click', closeLightbox);
lightbox.querySelector('.gallery-lightbox-arrow.previous').addEventListener('click', () => stepLightbox(-1));
lightbox.querySelector('.gallery-lightbox-arrow.next').addEventListener('click', () => stepLightbox(1));
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (event) => {
  if (!lightbox.classList.contains('open')) return;
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'ArrowLeft') stepLightbox(-1);
  if (event.key === 'ArrowRight') stepLightbox(1);
});
