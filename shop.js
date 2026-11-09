const price = 250;
const orderEmail = '';
const whatsappNumber = '';
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 0
}).format(value);
const products = new Map(catalog.map(([id, name, family, inspiration, hints, collection]) => [id, {id, name, family, inspiration, hints, collection}]));
const families = ['Floral', 'Fresh', 'Fruity', 'Sweet', 'Warm', 'Other'];
const drawer = $('#bag-dialog');
const productDialog = $('#product-dialog');
const content = $('#drawer-content');
const bag = new Map();
const details = {name:'', phone:'', address:''};
let selected = 'All scents';
let selectedCollection = 'All perfumes';
const pageSize = 6;
const visibleCounts = new Map();
let stage = 'bag';
let noticeTimer;

// Only product IDs and quantities are stored on this device.
try {
  const stored = JSON.parse(localStorage.getItem('vinity-bag') || '[]');
  for (const [id, qty] of stored) {
    if (products.has(id) && Number.isInteger(qty) && qty > 0 && qty <= 99) bag.set(id, qty);
  }
} catch {}

function announce(message) {
  $('#notice').textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { $('#notice').textContent = ''; }, 2200);
}

function totalItems() {
  return [...bag.values()].reduce((sum, qty) => sum + qty, 0);
}

function updateCount() {
  $('#count').textContent = totalItems();
}

function changeQuantity(id, change) {
  const qty = (bag.get(id) || 0) + change;
  if (qty > 99) return;
  if (qty > 0) bag.set(id, qty);
  else bag.delete(id);
  try {
    localStorage.setItem('vinity-bag', JSON.stringify([...bag]));
  } catch {}
  updateCount();
}

function scentDetails({inspiration, hints}) {
  return `<p class="inspiration">${inspiration ? 'Inspired by ' + inspiration : 'Inspiration unlisted'}</p>
    <p class="scent-label">Scent hints</p>
    ${hints.length ? `<ul class="scent-list" aria-label="Scent hints">${hints.map((hint) => `<li>${hint}</li>`).join('')}</ul>` : '<p class="inspiration">Unlisted</p>'}`;
}

function addButton({id, name}) {
  return `<button type="button" data-add="${id}" aria-label="Add ${name} to bag">Add to bag</button>`;
}

function renderProducts() {
  const query = $('#search').value.trim().toLowerCase();
  const shown = [...products.values()].filter(({name, family, inspiration, hints, collection}) =>
    (selectedCollection === 'All perfumes' || selectedCollection === collection) &&
    (selected === 'All scents' || selected === family) &&
    [name, family, inspiration, ...hints].some((value) => value.toLowerCase().includes(query))
  );
  $('#result-count').textContent = shown.length + (shown.length === 1 ? ' perfume' : ' perfumes');

  $('#products').innerHTML = ['For Her', 'For Him'].map((collection) => {
    const group = shown.filter((product) => product.collection === collection);
    if (!group.length) return '';
    const heading = collection === 'For Him' ? 'for-him' : 'for-her';
    const limit = query ? group.length : visibleCounts.get(collection) ?? pageSize;
    const cards = group.slice(0, limit).map((product) => {
      const {id, name, family} = product;
      return `<article class="card"><button class="card-image" type="button" data-details="${id}" aria-label="View details for ${name}">
        <img src="assets/${id}.svg" alt="" loading="lazy">
        <span>View details <span aria-hidden="true">↗</span></span>
      </button><div class="card-body"><p class="family">${family}</p><h3>${name}</h3>
      ${scentDetails(product)}
      <div class="card-bottom"><strong>${money(price)}</strong>${addButton(product)}</div></div></article>`;
    }).join('');
    const remaining = group.length - limit;
    const more = remaining > 0 ? `<button class="secondary load-more" type="button" data-more="${collection}">Show more ${collection} <span aria-hidden="true">↓</span></button>` : '';
    return `<section class="catalog-group" aria-labelledby="${heading}">
      <div class="group-header"><h3 class="group-heading" id="${heading}">${collection}</h3><span>${group.length} perfumes</span></div>
      <div class="grid">${cards}</div>${more}</section>`;
  }).join('') || '<p class="empty">No perfumes match these filters. Try another search or collection.</p>';
}

function showProduct(product) {
  const {id, name, family, collection} = product;
  $('#product-details').innerHTML = `<div class="product-photo"><img src="assets/${id}.svg" alt="${name} perfume bottle"></div>
    <div class="product-copy"><p class="family">${collection} · ${family}</p>
    <h2 id="product-title">${name}</h2>${scentDetails(product)}
    <div class="card-bottom"><strong>${money(price)}</strong>${addButton(product)}</div>
    <p id="product-feedback" role="status"></p></div>`;
  productDialog.showModal();
}

function addToBag(id) {
  const feedback = productDialog.open ? $('#product-feedback') : null;
  if (bag.get(id) === 99) {
    const message = 'You can add up to 99 of this perfume.';
    if (feedback) feedback.textContent = message;
    else announce(message);
    return;
  }
  changeQuantity(id, 1);
  if (productDialog.open) productDialog.close();
  announce(products.get(id).name + ' added to your bag.');
}

function subtotal() {
  return `<div class="subtotal"><span>Items subtotal</span><strong>${money(totalItems() * price)}</strong></div>`;
}

function renderBag() {
  stage = 'bag';
  $('#bag-title').textContent = 'Your bag';
  if (!bag.size) {
    content.innerHTML = '<p class="order-note">Your bag is empty.</p><button class="primary" type="button" data-action="browse">Browse perfumes</button>';
    return;
  }
  content.innerHTML = [...bag].map(([id, qty]) => {
    const {name} = products.get(id);
    return `<div class="order-row"><span class="line-name">${name}</span>
      <div class="stepper"><button type="button" data-id="${id}" data-change="-1" aria-label="Remove one ${name}">−</button>
      <span aria-label="Quantity">${qty}</span><button type="button" data-id="${id}" data-change="1" aria-label="Add one ${name}" ${qty >= 99 ? 'disabled' : ''}>+</button></div>
      <strong>${money(qty * price)}</strong></div>`;
  }).join('') + subtotal() + '<button class="primary" type="button" data-action="checkout">Continue to checkout</button>';
}

function renderCheckout() {
  stage = 'checkout';
  $('#bag-title').textContent = 'Checkout';
  content.innerHTML = `<button class="secondary" type="button" data-action="bag">← Back to bag</button>
    ${subtotal()}<form class="checkout">
      <label>Full name <input name="name" autocomplete="name" required maxlength="100"></label>
      <label>Mobile number <input name="phone" type="tel" autocomplete="tel" required maxlength="30"></label>
      <label>Delivery address <textarea name="address" autocomplete="street-address" required maxlength="400"></textarea></label>
      <p>The shop confirms delivery fees, availability and payment when it receives your request.</p>
      <button type="submit" class="primary">Review order request</button>
    </form>`;
  const form = content.querySelector('form');
  for (const key of Object.keys(details)) form.elements[key].value = details[key];
  form.elements.name.focus();
}

function renderRequest() {
  stage = 'request';
  $('#bag-title').textContent = 'Order request';
  const lines = [...bag].map(([id, qty]) =>
    `${qty} × ${products.get(id).name} · ${money(qty * price)}`
  );
  const request = ['The Vinity order request', '', ...lines, '',
    'Items subtotal: ' + money(totalItems() * price),
    '', 'Name: ' + details.name, 'Mobile: ' + details.phone, 'Delivery address: ' + details.address
  ].join('\n');
  content.innerHTML = `<p class="order-note">Send this request to The Vinity to confirm your order.</p>
    <pre class="order-text"></pre><div class="actions">
      <button type="button" class="primary" data-action="copy">Copy order request</button>
      <button type="button" class="secondary" data-action="download">Download</button>
      <button type="button" class="secondary" data-action="checkout">Edit details</button>
    </div><p class="order-note" id="request-status" role="status"></p>`;
  content.querySelector('pre').textContent = request;
  const sendUrl = whatsappNumber ? 'https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent(request) :
    orderEmail ? 'mailto:' + orderEmail + '?subject=The%20Vinity%20order%20request&body=' + encodeURIComponent(request) : '';
  if (sendUrl) {
    const link = document.createElement('a');
    link.className = 'primary';
    link.href = sendUrl;
    link.textContent = whatsappNumber ? 'Open WhatsApp' : 'Open email';
    content.querySelector('.actions').prepend(link);
  }
  content.querySelector('.actions').firstElementChild.focus();
}

const featured = [11, 42, 71, 32].map((id) => products.get(id));
$('#featured-products').innerHTML = featured.map(({id, name, family}) =>
  `<button class="featured-item" type="button" data-details="${id}" aria-label="View featured ${name}">
    <span class="featured-photo"><img src="assets/${id}.svg" alt="" loading="lazy"></span>
    <span class="family">${family}</span><strong>${name}</strong><span>${money(price)}</span>
    <span class="featured-link">View perfume <span aria-hidden="true">→</span></span>
  </button>`
).join('');
$('#featured-products').addEventListener('click', (event) => {
  const button = event.target.closest('[data-details]');
  if (button) showProduct(products.get(Number(button.dataset.details)));
});

const navLinks = document.querySelectorAll('.nav-links a');
function syncNavigation() {
  const hash = location.hash || '#home';
  for (const link of navLinks) {
    if (link.hash === hash) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
window.addEventListener('hashchange', syncNavigation);
syncNavigation();
$('.search-link').addEventListener('click', () => requestAnimationFrame(() => $('#search').focus({preventScroll:true})));

if (window.IntersectionObserver && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  }, {threshold: .12});
  document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
}

$('#filters').innerHTML = ['All scents', ...families].map((family) =>
  `<button class="filter" type="button" aria-pressed="${family === selected}">${family}</button>`
).join('');
$('#filters').addEventListener('click', (event) => {
  if (!event.target.matches('button')) return;
  selected = event.target.textContent;
  for (const button of $('#filters').children) button.setAttribute('aria-pressed', button === event.target);
  renderProducts();
});
$('#search').addEventListener('input', renderProducts);
$('.collection-switch').addEventListener('click', (event) => {
  const button = event.target.closest('[data-collection]');
  if (!button) return;
  selectedCollection = button.dataset.collection;
  for (const option of $('.collection-switch').children) option.setAttribute('aria-pressed', option === button);
  renderProducts();
});
$('#products').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.details) showProduct(products.get(Number(button.dataset.details)));
  else if (button.dataset.add) addToBag(Number(button.dataset.add));
  else if (button.dataset.more) {
    const collection = button.dataset.more;
    const limit = visibleCounts.get(collection) ?? pageSize;
    visibleCounts.set(collection, limit + pageSize);
    renderProducts();
    const group = collection === 'For Him' ? '#for-him' : '#for-her';
    $(group).closest('section').querySelectorAll('[data-details]')[limit]?.focus();
  }
});
$('#close-product').addEventListener('click', () => productDialog.close());
productDialog.addEventListener('click', (event) => {
  if (event.target === productDialog) productDialog.close();
  const button = event.target.closest('[data-add]');
  if (button) addToBag(Number(button.dataset.add));
});
$('#open-bag').addEventListener('click', () => {
  renderBag();
  drawer.showModal();
});
$('#close-bag').addEventListener('click', () => drawer.close());
drawer.addEventListener('click', (event) => { if (event.target === drawer) drawer.close(); });

content.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.change) {
    const {id, change} = button.dataset;
    changeQuantity(Number(id), Number(change));
    renderBag();
    const replacement = content.querySelector(`[data-id="${id}"][data-change="${change}"]:enabled`) ||
      content.querySelector(`[data-id="${id}"]:enabled`) || content.querySelector('button');
    replacement?.focus();
    return;
  }
  switch (button.dataset.action) {
    case 'bag':
      renderBag();
      content.querySelector('[data-action="checkout"]')?.focus();
      break;
    case 'checkout':
      renderCheckout();
      break;
    case 'browse':
      drawer.close();
      $('#collection').scrollIntoView();
      $('#search').focus({preventScroll:true});
      break;
    case 'copy':
      try {
        await navigator.clipboard.writeText(content.querySelector('pre').textContent);
        $('#request-status').textContent = 'Order request copied.';
      } catch {
        if (stage === 'request') $('#request-status').textContent = 'Copy is unavailable. You can download the request instead.';
      }
      break;
    case 'download': {
      const url = URL.createObjectURL(new Blob([content.querySelector('pre').textContent], {type:'text/plain;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'the-vinity-order.txt';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      $('#request-status').textContent = 'Order request downloaded.';
      break;
    }
  }
});

content.addEventListener('input', (event) => {
  if (stage === 'checkout') event.target.setCustomValidity('');
});

content.addEventListener('submit', (event) => {
  event.preventDefault();
  for (const key of Object.keys(details)) {
    const field = event.target.elements[key];
    details[key] = field.value.trim();
    const valid = details[key] && (key !== 'phone' || /^[+0-9(). -]+$/.test(details[key]) && details[key].replace(/\D/g, '').length >= 7);
    if (!valid) {
      field.setCustomValidity(key === 'phone' ? 'Enter a valid mobile number.' : 'Fill out this field.');
      field.reportValidity();
      return;
    }
  }
  renderRequest();
});

updateCount();
renderProducts();

