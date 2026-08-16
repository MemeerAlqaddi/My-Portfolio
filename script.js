const nav = document.querySelector(".site-nav");
const menuButton = document.querySelector(".menu-button");
const navLinks = document.querySelector("#nav-links");
const year = document.querySelector("#year");

if (year) year.textContent = new Date().getFullYear();

function setNavState() {
  if (!nav) return;
  nav.classList.toggle("scrolled", window.scrollY > 90);
}
setNavState();
window.addEventListener("scroll", setNavState, { passive: true });

if (menuButton && navLinks) {
  menuButton.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      navLinks.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}

const navSectionLinks = [...document.querySelectorAll('.site-nav a[data-section]')];
const observedSections = navSectionLinks
  .map(link => document.getElementById(link.dataset.section))
  .filter(Boolean);

const activeObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

  if (!visible) return;
  navSectionLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.section === visible.target.id);
  });
}, { rootMargin: "-28% 0px -58% 0px", threshold: [0.05, 0.2, 0.5] });

observedSections.forEach(section => activeObserver.observe(section));

const revealTargets = document.querySelectorAll(
  ".project-card, .about-top, .capabilities, .timeline article, .credentials > div, .contact-form-wrap, .contact-copy"
);

revealTargets.forEach((element) => element.classList.add("reveal"));

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08 }
);

revealTargets.forEach((element) => revealObserver.observe(element));
