const menuButton=document.querySelector(".menu-button");
const nav=document.querySelector("#nav-links");
menuButton?.addEventListener("click",()=>{
  const open=menuButton.getAttribute("aria-expanded")==="true";
  menuButton.setAttribute("aria-expanded",String(!open));
  nav.classList.toggle("open",!open);
});
nav?.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
  nav.classList.remove("open");
  menuButton?.setAttribute("aria-expanded","false");
}));
document.querySelector("#year").textContent=new Date().getFullYear();
document.querySelectorAll(".project-card,.profile,.skill-grid article,.timeline article,.contact-form-wrap,.contact-copy")
  .forEach(el=>el.classList.add("reveal"));
const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
},{threshold:.1});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));