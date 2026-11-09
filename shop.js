const price = 250;
const orderEmail = '';
const whatsappNumber = '';
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 0
}).format(value);
const products = new Map(catalog.map(([id, name, family, inspiration, hints]) => [id, {id, name, family, inspiration, hints}]));
const families = ['Floral', 'Fresh', 'Fruity', 'Sweet', 'Warm', 'Other'];
const drawer = $('#bag-dialog');
const content = $('#drawer-content');
const bag = new Map();
const details = {name:'', phone:'', address:''};
let selected = 'All scents';
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

function renderProducts() {
  const query = $('#search').value.trim().toLowerCase();
  const shown = [...products.values()].filter(({name, family, inspiration, hints}) =>
    (selected === 'All scents' || selected === family) &&
    [name, family, inspiration, ...hints].some((value) => value.toLowerCase().includes(query))
  );
  $('#result-count').textContent = shown.length + (shown.length === 1 ? ' perfume' : ' perfumes');
  $('#products').innerHTML = shown.map(({id, name, family, inspiration, hints}, index) =>
    `<article class="card"><div class="card-image">
      <img src="assets/${id}.svg" alt="${name} perfume bottle" ${index > 7 ? 'loading="lazy"' : ''}>
    </div><div class="card-body"><p class="family">${family}</p><h3>${name}</h3>
    <p class="inspiration">${inspiration ? 'Inspired by ' + inspiration : 'Inspiration unlisted'}</p>
    <p class="scent-label">Scent hints</p>
    ${hints.length ? `<ul class="scent-list" aria-label="Scent hints">${hints.map((hint) => `<li>${hint}</li>`).join('')}</ul>` : '<p class="inspiration">Unlisted</p>'}
    <div class="card-bottom"><strong>${money(price)}</strong><button type="button" data-add="${id}" aria-label="Add ${name} to bag">Add to bag</button></div></div></article>`
  ).join('') || '<p class="empty">No perfumes match your search. Try another name or scent family.</p>';
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

$('#hero-art').innerHTML = [42, 11, 61].map((id) => `<img class="hero-bottle" src="assets/${id + '.svg'}" alt="">`).join('');
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
$('#products').addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (!button) return;
  const id = Number(button.dataset.add);
  if (bag.get(id) === 99) {
    announce('You can add up to 99 of this perfume.');
    return;
  }
  changeQuantity(id, 1);
  announce(products.get(id).name + ' added to your bag.');
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

