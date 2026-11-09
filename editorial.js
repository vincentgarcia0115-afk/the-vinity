const clamp = (value) => Math.min(1, Math.max(0, value));
const root = document.documentElement;
const scenes = Array.from(document.querySelectorAll('[data-scene]'), (element) => ({
  element, pin: element.querySelector('.scene-pin')
}));
const rows = [...document.querySelectorAll('.notes-list li')];
const motion = matchMedia('(prefers-reduced-motion: no-preference)');
const tall = matchMedia('(min-height: 560px)');
let frame = 0;
let litCount = -1;

function updateScroll() {
  frame = 0;
  if (!root.classList.contains('choreography')) return;
  const progress = scenes.map(({element, pin}) => {
    const bounds = element.getBoundingClientRect();
    return clamp(-bounds.top / Math.max(1, bounds.height - pin.offsetHeight));
  });
  const [hero, strip, notes] = progress;
  root.style.setProperty('--reading', clamp(scrollY / Math.max(1, root.scrollHeight - innerHeight)));
  scenes.forEach(({element}, index) => element.style.setProperty('--p', progress[index]));
  scenes[0].element.style.setProperty('--hero-veil', 1 - clamp((hero - .12) / .78));
  scenes[1].element.style.setProperty('--reveal-top', `${100 * (1 - strip)}%`);
  scenes[1].element.style.setProperty('--strip-veil', 1 - clamp((strip - .62) / .36));
  scenes[1].element.style.setProperty('--caption-veil', clamp((strip - .45) / .3));
  const count = Math.floor(notes * rows.length + .00001);
  if (count !== litCount) {
    rows.forEach((row, index) => row.classList.toggle('lit', index < count));
    litCount = count;
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(updateScroll);
}

function configureMotion() {
  root.classList.toggle('motion-ready', motion.matches);
  root.classList.toggle('choreography', motion.matches && tall.matches);
  if (!root.classList.contains('choreography')) root.style.removeProperty('--reading');
  schedule();
}

for (const block of document.querySelectorAll('[data-words]')) {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let index = 0;
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const part of node.data.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) fragment.append(part);
      else {
        const word = document.createElement('span');
        word.className = 'word';
        word.style.setProperty('--word-delay', `${index++ * 38}ms`);
        word.textContent = part;
        fragment.append(word);
      }
    }
    node.replaceWith(fragment);
  }
}

const atoms = document.querySelectorAll('[data-words], [data-reveal], .editorial-columns > div, .price-table tr, .price-table th, .price-table td, .notes-list li, .notes-list li > *, .faq-band summary, .straps > *, .primary, .nav-links a, footer a');
const delays = new Map();
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('revealed');
    observer.unobserve(entry.target);
  }
}, {threshold:.12});

for (const atom of atoms) {
  const group = atom.parentElement;
  const index = delays.get(group) || 0;
  delays.set(group, index + 1);
  atom.dataset.rev = '';
  atom.style.setProperty('--d', `${index * 55}ms`);
  observer.observe(atom);
}

addEventListener('scroll', schedule, {passive:true});
addEventListener('resize', schedule);
motion.addEventListener('change', configureMotion);
tall.addEventListener('change', configureMotion);
document.fonts.ready.then(schedule);
configureMotion();
