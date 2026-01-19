/* Elysium House — Motion + interactivity
   - Scroll reveal (IntersectionObserver)
   - Lightbox with keyboard controls
   - Mobile nav toggle
   - Hero subtle parallax (lightweight)
*/

(() => {
  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  const nav = document.querySelector(".nav");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.getElementById("nav-links");

  const setNavOpen = (open) => {
    if (!nav || !navToggle) return;
    nav.dataset.open = open ? "true" : "false";
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  };

  if (nav && navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const open = nav.dataset.open === "true";
      setNavOpen(!open);
    });

    // Close menu on link click (mobile)
    navLinks.addEventListener("click", (e) => {
      if (e.target && e.target.closest("a")) setNavOpen(false);
    });

    // Close on escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setNavOpen(false);
    });
  }

  // Scroll reveal
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealEls = document.querySelectorAll(".reveal");

  // Prevent “blank” moments on refresh/hash jumps: immediately reveal items already in view.
  const isInView = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < (window.innerHeight || 0);
  };
  Array.from(revealEls).forEach((el) => {
    if (isInView(el)) el.classList.add("is-visible");
  });

  /* Staggered delays (smooth, luxurious pacing) */
  revealEls.forEach((el, i) => {
    // cap delay so long pages don’t create huge waits
    const d = Math.min(i * 70, 420);
    el.style.setProperty("--d", `${d}ms`);
  });

  if (!prefersReduced && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { root: null, threshold: 0.12, rootMargin: "0px 0px -12% 0px" });

    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // Hero subtle parallax (safe + minimal)
  const heroMedia = document.querySelector(".hero-media");
  if (!prefersReduced && heroMedia) {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        // small range only, avoids dizzy effect
        heroMedia.style.backgroundPosition = `center ${Math.min(50 + y * 0.03, 65)}%`;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Lightbox
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const galleryButtons = Array.from(document.querySelectorAll(".gallery-item"));

  let currentIndex = 0;
  let lastFocusedEl = null;

  const openLightbox = (index) => {
    if (!lightbox || !lightboxImg) return;
    currentIndex = index;
    const btn = galleryButtons[currentIndex];
    const src = btn?.dataset?.src;
    const alt = btn?.dataset?.alt || "";

    lastFocusedEl = document.activeElement;
    lightboxImg.src = src;
    lightboxImg.alt = alt;

    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Focus close button for accessibility
    const closeBtn = lightbox.querySelector("[data-close='true']");
    closeBtn?.focus();
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lightboxImg) {
      lightboxImg.src = "";
      lightboxImg.alt = "";
    }
    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      lastFocusedEl.focus();
    }
  };

  const showNext = () => {
    if (!galleryButtons.length) return;
    currentIndex = (currentIndex + 1) % galleryButtons.length;
    const btn = galleryButtons[currentIndex];
    if (lightboxImg) {
      lightboxImg.src = btn.dataset.src;
      lightboxImg.alt = btn.dataset.alt || "";
    }
  };

  const showPrev = () => {
    if (!galleryButtons.length) return;
    currentIndex = (currentIndex - 1 + galleryButtons.length) % galleryButtons.length;
    const btn = galleryButtons[currentIndex];
    if (lightboxImg) {
      lightboxImg.src = btn.dataset.src;
      lightboxImg.alt = btn.dataset.alt || "";
    }
  };

  if (galleryButtons.length && lightbox) {
    galleryButtons.forEach((btn, idx) => {
      btn.addEventListener("click", () => openLightbox(idx));
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(idx);
        }
      });
    });

    // Close handlers
    lightbox.addEventListener("click", (e) => {
      const closeTarget = e.target.closest("[data-close='true']");
      if (closeTarget) closeLightbox();
    });

    // Nav buttons
    lightbox.addEventListener("click", (e) => {
      if (e.target.closest("[data-next='true']")) showNext();
      if (e.target.closest("[data-prev='true']")) showPrev();
    });

    // Keyboard
    window.addEventListener("keydown", (e) => {
      const open = lightbox.getAttribute("aria-hidden") === "false";
      if (!open) return;

      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();

      // Basic focus trap within modal
      if (e.key === "Tab") {
        const focusables = lightbox.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
        const list = Array.from(focusables).filter(el => !el.hasAttribute("disabled"));
        if (!list.length) return;

        const first = list[0];
        const last = list[list.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }
})();