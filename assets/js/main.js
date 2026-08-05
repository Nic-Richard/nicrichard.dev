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

const portloreTabs = [...document.querySelectorAll('[data-portlore-tab]')];
const portlorePanels = [...document.querySelectorAll('[data-portlore-panel]')];

portloreTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const selected = tab.dataset.portloreTab;
    portloreTabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    portlorePanels.forEach((panel) => {
      const active = panel.dataset.portlorePanel === selected;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
  });
});

const mobileImages = [
  { src: 'assets/images/portloremobile2.png', alt: 'Portlore mobile landing screen' },
  { src: 'assets/images/portloremobile1.png', alt: 'Portlore mobile itinerary screen' },
  { src: 'assets/images/portloremobile4.png', alt: 'Portlore mobile map screen' }
];

const mobileTrack = document.getElementById('portlore-mobile-track');
const mobileDots = document.getElementById('dots-portlore-mobile');
const mobilePositions = ['far-prev', 'prev', 'current', 'next', 'far-next'];
let mobileIndex = 0;
let mobileAnimating = false;

function wrappedIndex(index) {
  return (index + mobileImages.length) % mobileImages.length;
}

function createMobileCard(position, imageIndex) {
  const card = document.createElement('figure');
  const resolvedIndex = wrappedIndex(imageIndex);
  card.className = `mobile-carousel-card position-${position}`;
  card.dataset.position = position;
  card.dataset.imageIndex = String(resolvedIndex);

  const image = document.createElement('img');
  const data = mobileImages[resolvedIndex];
  image.src = data.src;
  image.alt = data.alt;
  card.appendChild(image);

  card.addEventListener('keydown', (event) => {
    if ((event.key !== 'Enter' && event.key !== ' ') || card.dataset.position !== 'current') return;
    event.preventDefault();
    openLightbox('portlore-mobile', Number(card.dataset.imageIndex), card);
  });

  return card;
}

function updateMobileDots() {
  if (!mobileDots) return;
  [...mobileDots.children].forEach((dot, index) => {
    dot.classList.toggle('active', index === mobileIndex);
  });
}

function renderMobileCarousel() {
  if (!mobileTrack) return;

  mobileTrack.classList.add('resetting');
  mobileTrack.replaceChildren(
    createMobileCard('far-prev', mobileIndex - 2),
    createMobileCard('prev', mobileIndex - 1),
    createMobileCard('current', mobileIndex),
    createMobileCard('next', mobileIndex + 1),
    createMobileCard('far-next', mobileIndex + 2)
  );
  updateMobileDots();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => mobileTrack.classList.remove('resetting'));
  });
}

function moveMobileCards(direction) {
  const nextPositions = direction > 0
    ? {
        'far-prev': 'exit-left',
        prev: 'far-prev',
        current: 'prev',
        next: 'current',
        'far-next': 'next'
      }
    : {
        'far-prev': 'prev',
        prev: 'current',
        current: 'next',
        next: 'far-next',
        'far-next': 'exit-right'
      };

  [...mobileTrack.children].forEach((card) => {
    const currentPosition = card.dataset.position;
    const nextPosition = nextPositions[currentPosition];
    card.className = `mobile-carousel-card position-${nextPosition}`;
    card.dataset.position = nextPosition;
  });
}

function stepMobileCarousel(direction) {
  if (!mobileTrack || mobileAnimating) return;
  mobileAnimating = true;

  const transitionCard = mobileTrack.querySelector('.position-current');
  moveMobileCards(direction);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;

    mobileIndex = wrappedIndex(mobileIndex + direction);
    const recycledPosition = direction > 0 ? 'exit-left' : 'exit-right';
    const recycledCard = mobileTrack.querySelector(`.position-${recycledPosition}`);

    if (recycledCard) {
      const nextPosition = direction > 0 ? 'far-next' : 'far-prev';
      const imageIndex = direction > 0 ? mobileIndex + 2 : mobileIndex - 2;
      const image = recycledCard.querySelector('img');
      const data = mobileImages[wrappedIndex(imageIndex)];

      mobileTrack.classList.add('resetting');
      image.src = data.src;
      image.alt = data.alt;
      recycledCard.className = `mobile-carousel-card position-${nextPosition}`;
      recycledCard.dataset.position = nextPosition;
      recycledCard.dataset.imageIndex = String(wrappedIndex(imageIndex));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => mobileTrack.classList.remove('resetting'));
      });
    }

    updateMobileDots();
    mobileAnimating = false;
  };

  if (!transitionCard) {
    finish();
    return;
  }

  transitionCard.addEventListener('transitionend', finish, { once: true });
  window.setTimeout(finish, 700);
}

if (mobileDots) {
  mobileImages.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show mobile screenshot ${index + 1}`);
    dot.addEventListener('click', () => {
      if (index === mobileIndex || mobileAnimating) return;
      const forwardDistance = wrappedIndex(index - mobileIndex);
      stepMobileCarousel(forwardDistance === 1 ? 1 : -1);
    });
    mobileDots.appendChild(dot);
  });
}

document.querySelectorAll('[data-mobile-step]').forEach((button) => {
  button.addEventListener('click', () => stepMobileCarousel(Number(button.dataset.mobileStep)));
});

const mobileViewport = document.querySelector('.mobile-carousel-viewport');
let pointerStartX = null;
let mobileSwipeFinishedAt = 0;

if (mobileViewport) {
  mobileViewport.addEventListener('pointerdown', (event) => {
    pointerStartX = event.clientX;
    mobileViewport.setPointerCapture(event.pointerId);
  });

  mobileViewport.addEventListener('pointerup', (event) => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(distance) > 38) {
      mobileSwipeFinishedAt = Date.now();
      stepMobileCarousel(distance < 0 ? 1 : -1);
    }
  });

  mobileViewport.addEventListener('pointercancel', () => {
    pointerStartX = null;
  });
}

renderMobileCarousel();

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


const lightboxGalleries = {
  tracetray: [...document.querySelectorAll('#gallery-tracetray img')].map((image) => ({ src: image.src, alt: image.alt })),
  wikiracr: [...document.querySelectorAll('#gallery-wikiracr img')].map((image) => ({ src: image.src, alt: image.alt })),
  'portlore-desktop': [...document.querySelectorAll('#gallery-portlore-desktop img')].map((image) => ({ src: image.src, alt: image.alt })),
  'portlore-mobile': mobileImages.map((image) => ({ src: new URL(image.src, window.location.href).href, alt: image.alt }))
};

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

if (mobileViewport) {
  mobileViewport.addEventListener('click', () => {
    if (Date.now() - mobileSwipeFinishedAt < 350 || mobileAnimating) return;
    const currentCard = mobileTrack?.querySelector('.mobile-carousel-card[data-position="current"]');
    if (!currentCard) return;
    openLightbox('portlore-mobile', Number(currentCard.dataset.imageIndex), currentCard);
  });
}

if (mobileTrack) {
  const makeCurrentCardFocusable = () => {
    mobileTrack.querySelectorAll('.mobile-carousel-card').forEach((card) => {
      const current = card.dataset.position === 'current';
      card.tabIndex = current ? 0 : -1;
      card.setAttribute('role', current ? 'button' : 'presentation');
      if (current) card.setAttribute('aria-label', 'Open Portlore mobile screenshots fullscreen');
      else card.removeAttribute('aria-label');
    });
  };

  const mobileCardObserver = new MutationObserver(makeCurrentCardFocusable);
  mobileCardObserver.observe(mobileTrack, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-position'] });
  makeCurrentCardFocusable();
}

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
