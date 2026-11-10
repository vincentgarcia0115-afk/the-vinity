const orderService = 'https://the-vinity-orders.jeffreysimbahon14.chatgpt.site';
const accountUrl = orderService + '/account';
const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 0
}).format(value);
const products = new Map(catalog.map(([id, name, family, inspiration, hints, collection]) => [id, {id, name, family, inspiration, hints, collection}]));
let inventory = new Map();
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
let sendingOrder = false;
let orderDraft;
let noticeTimer;
let checkoutProof;
let resumeBag = false;
const handoff = new URLSearchParams(location.hash.slice(1));
const incomingProof = handoff.get('account_checkout');
if (incomingProof !== null) {
  history.replaceState(null,'',location.pathname + location.search);
  if (/^[0-9a-f]{64}\.\d{10}\.[0-9a-f]{64}$/.test(incomingProof)) {
    checkoutProof = incomingProof;
    resumeBag = handoff.get('open_bag') === '1';
    try { sessionStorage.setItem('vinity-checkout-proof',checkoutProof); } catch {}
  }
} else {
  try { checkoutProof = sessionStorage.getItem('vinity-checkout-proof') || undefined; } catch {}
}

function clearCheckoutProof() {
  checkoutProof = undefined;
  try { sessionStorage.removeItem('vinity-checkout-proof'); } catch {}
}

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
  if (change > 0 && qty > (inventory.get(id)?.limit ?? 0)) return;
  if (qty > 0) bag.set(id, qty);
  else bag.delete(id);
  saveBag();
}

function saveBag() {
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

function addButton({id, name}, labelName = name) {
  const entry = inventory.get(id);
  const available = entry?.limit > 0;
  const label = available ? 'Add to bag' : entry?.availability ?? 'Checking stock';
  return `<button type="button" data-add="${id}" ${available ? `aria-label="Add ${labelName} to bag"` : 'disabled'}>${label}</button>`;
}

function displayPrice(id) {
  const entry = inventory.get(id);
  return entry ? money(entry.price) : '—';
}

async function refreshInventory() {
  const response = await fetch(orderService + '/api/inventory',{signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('Inventory is unavailable.');
  const result = await response.json();
  const entries = new Map(result.products.map((entry) => [entry.id,entry]));
  if ([...products.keys()].some((id) => !entries.has(id))) throw new Error('Inventory is unavailable.');
  inventory = entries;
  $('#inventory-message').hidden = true;
  renderFeatured();
  renderProducts();
  if (productDialog.open) renderProduct(products.get(Number(productDialog.dataset.product)));
}

function renderFeatured() {
  $('#featured-products').innerHTML = [11,61,5,32,71].map((id) => {
    const product = products.get(id);
    return `<article class="featured-card"><button type="button" class="featured-image" data-details="${id}" aria-label="View featured ${product.name} details">
      <img src="assets/${id}.svg" alt="" loading="lazy"></button>
      <h3>${product.name}</h3><p>${product.family}</p><strong>${displayPrice(id)}</strong>
      ${addButton(product,`featured ${product.name}`)}</article>`;
  }).join('');
}

function renderProducts() {
  const query = $('#search').value.trim().toLowerCase();
  const shown = [...products.values()].filter(({name, family, inspiration, hints, collection}) =>
    (selectedCollection === 'All perfumes' || selectedCollection === collection) &&
    (selected === 'All scents' || selected === family) &&
    [name, family, inspiration, ...hints].some((value) => value.toLowerCase().includes(query))
  );
  for (const button of $('.collection-switch').children) {
    button.setAttribute('aria-pressed', button.dataset.collection === selectedCollection);
  }
  for (const button of $('#filters').children) {
    button.setAttribute('aria-pressed', button.dataset.scent === selected);
  }
  $('#clear-filters').disabled = !query && selected === 'All scents' && selectedCollection === 'All perfumes';
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
      <div class="card-bottom"><strong>${displayPrice(id)}</strong>${addButton(product)}</div></div></article>`;
    }).join('');
    const remaining = group.length - limit;
    const more = remaining > 0 ? `<button class="secondary load-more" type="button" data-more="${collection}">Show more ${collection} <span aria-hidden="true">↓</span></button>` : '';
    return `<section class="catalog-group" aria-labelledby="${heading}">
      <div class="group-header"><h3 class="group-heading" id="${heading}">${collection}</h3><span>${group.length} perfumes</span></div>
      <div class="grid">${cards}</div>${more}</section>`;
  }).join('') || '<p class="empty">No perfumes match these filters. Try another search or collection.</p>';
}

function renderProduct(product) {
  const {id, name, family, collection} = product;
  $('#product-details').innerHTML = `<div class="product-photo"><img src="assets/${id}.svg" alt="${name} perfume bottle"></div>
    <div class="product-copy"><p class="family">${collection} · ${family}</p>
    <h2 id="product-title">${name}</h2>${scentDetails(product)}
    <div class="card-bottom"><strong>${displayPrice(id)}</strong>${addButton(product)}</div>
    <p id="product-feedback" role="status"></p></div>`;
}

function showProduct(product, fromPointer) {
  productDialog.dataset.product = product.id;
  renderProduct(product);
  productDialog.toggleAttribute('data-pointer-entry',fromPointer);
  productDialog.showModal();
}

function addToBag(id) {
  const feedback = productDialog.open ? $('#product-feedback') : null;
  const limit = inventory.get(id)?.limit ?? 0;
  if ((bag.get(id) ?? 0) >= limit) {
    const message = limit ? `You can add up to ${limit} of this perfume.` : 'This perfume is currently unavailable.';
    if (feedback) feedback.textContent = message;
    else announce(message);
    return;
  }
  changeQuantity(id, 1);
  if (productDialog.open) productDialog.close();
  announce(products.get(id).name + ' added to your bag.');
}

function bagSubtotal() {
  if (!inventory.size) return null;
  return [...bag].reduce((sum,[id,qty]) => sum + qty * inventory.get(id).price,0);
}

function subtotal() {
  const amount = bagSubtotal();
  return `<div class="subtotal"><span>Items subtotal</span><strong>${amount === null ? 'Checking prices' : money(amount)}</strong></div>`;
}

function deliveryText(fee) {
  return fee == null ? 'To be confirmed' : fee === 0 ? 'Free' : money(fee);
}

function orderTotals(amount, fee) {
  const rows = [
    ['Items subtotal', money(amount)],
    ['Delivery', deliveryText(fee)],
    ['Total to pay', fee == null ? 'Pending delivery fee' : money(amount + fee)]
  ];
  return `<dl class="order-totals">${rows.map(([label,value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
}

function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}

async function deliveryFee() {
  const response = await fetch(orderService + '/api/checkout', {signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('Delivery pricing is unavailable.');
  const {delivery_fee:fee} = await response.json();
  if (fee !== null && (!Number.isInteger(fee) || fee < 0)) throw new Error('Delivery pricing is unavailable.');
  return fee;
}

function renderBag(notice = '') {
  stage = 'bag';
  $('#bag-title').textContent = 'Your bag';
  if (!bag.size) {
    content.innerHTML = '<p class="order-note">Your bag is empty.</p><button class="primary" type="button" data-action="browse">Browse perfumes</button>';
    return;
  }
  content.innerHTML = [...bag].map(([id, qty]) => {
    const {name} = products.get(id);
    const entry = inventory.get(id);
    const limit = entry?.limit ?? 0;
    const unavailable = entry && qty > limit;
    return `<div class="order-row"><span class="line-name">${name}
      ${unavailable ? `<small>${limit ? `Only ${limit} available` : entry.availability}</small>
      <button class="secondary" type="button" data-remove="${id}" aria-label="Remove ${name} from bag">Remove</button>` : ''}</span>
      <div class="stepper"><button type="button" data-id="${id}" data-change="-1" aria-label="Remove one ${name}">−</button>
      <span aria-label="Quantity">${qty}</span><button type="button" data-id="${id}" data-change="1" aria-label="Add one ${name}" ${qty >= limit ? 'disabled' : ''}>+</button></div>
      <strong>${entry ? money(qty * entry.price) : '—'}</strong></div>`;
  }).join('') + subtotal() + '<p id="bag-feedback" class="order-note" role="status"></p><button class="primary" type="button" data-action="checkout">Continue to checkout</button>';
  $('#bag-feedback').textContent = notice;
  content.insertAdjacentHTML('beforeend',checkoutProof
    ? '<p class="order-note">This order will be saved to your account.</p><button class="secondary" type="button" data-action="guest">Continue as guest</button>'
    : `<p class="order-note">Want this order in your account? <a href="${accountUrl}#checkout">Sign in to link it</a>.</p>`);
}

function renderCheckout() {
  stage = 'checkout';
  $('#bag-title').textContent = 'Checkout';
  content.innerHTML = `<button class="secondary" type="button" data-action="bag">← Back to bag</button>
    ${subtotal()}<form class="checkout">
      <label>Full name <input name="name" autocomplete="name" required maxlength="100"></label>
      <label>Mobile number <input name="phone" type="tel" autocomplete="tel" required maxlength="30"></label>
      <label>Delivery address <textarea name="address" autocomplete="street-address" required maxlength="400"></textarea></label>
      <p>Pay by cash on delivery. You’ll see the delivery fee and total on the next step when a fee is available.</p>
      <p>We use these details to fulfill your order. <a href="${orderService}/support#privacy" target="_blank" rel="noopener">Read the privacy notice</a>.</p>
      <button type="submit" class="primary">Review order</button>
      <p id="checkout-feedback" role="status"></p>
    </form>`;
  const form = content.querySelector('form');
  for (const key of Object.keys(details)) form.elements[key].value = details[key];
  form.elements.name.focus();
}

function renderRequest(fee, notice = '') {
  stage = 'request';
  $('#bag-title').textContent = 'Order request';
  const items = [...bag].map(([id,qty]) => ({id,qty,price:inventory.get(id).price}));
  const lines = items.map(({id,qty,price}) =>
    `${qty} × ${products.get(id).name} · ${money(qty * price)}`
  );
  const order = {...details, items:items.map(({id,qty}) => ({id,qty}))};
  const fingerprint = JSON.stringify(order);
  if (orderDraft?.fingerprint !== fingerprint) orderDraft = {id:crypto.randomUUID(),fingerprint};
  orderDraft.deliveryFee = fee;
  orderDraft.items = items;
  const amount = bagSubtotal();
  const request = [...lines, '', 'Name: ' + details.name, 'Mobile: ' + details.phone, 'Delivery address: ' + details.address].join('\n');
  orderDraft.requestText = ['The Vinity order request',request,'', 'Items subtotal: ' + money(amount), 'Delivery: ' + deliveryText(fee),
    'Total to pay: ' + (fee == null ? 'Pending delivery fee' : money(amount + fee)), 'Payment: Cash on delivery'].join('\n');
  content.innerHTML = `<p class="order-note">Review your items and delivery details before placing your order.</p>
    <p class="order-note" id="request-status" role="status"></p>
    ${orderTotals(amount, fee)}
    <p class="order-note">Cash on delivery${fee == null ? ' · The shop will confirm your delivery fee and final total.' : ' · Pay when your order arrives.'}</p>
    <pre class="order-text"></pre><div class="actions">
      <button type="button" class="primary" data-action="send">Submit order</button>
      <button type="button" class="secondary" data-action="copy">Copy request</button>
      <button type="button" class="secondary" data-action="download">Download</button>
      <button type="button" class="secondary" data-action="checkout">Edit details</button>
    </div>`;
  $('#request-status').textContent = notice;
  content.querySelector('pre').textContent = request;
  content.querySelector('.actions').firstElementChild.focus();
}

async function orderApi(path, data) {
  let response;
  try {
    response = await fetch(orderService + '/api/' + path, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data), signal:AbortSignal.timeout(15000)
    });
  } catch {
    throw new Error('The order service could not be reached. Try again.');
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    const error = new Error(result?.error || 'The order service is unavailable. Try again.');
    error.code = result?.code;
    throw error;
  }
  return result;
}

async function sendOrder() {
  if (sendingOrder) return;
  sendingOrder = true;
  const feedback = $('#request-status');
  const buttons = [...content.querySelectorAll('button'), $('#close-bag')];
  for (const button of buttons) button.disabled = true;
  feedback.textContent = 'Submitting your order…';
  try {
    const items = orderDraft.items;
    const order = await orderApi('orders', {id:orderDraft.id,...details,items,delivery_fee:orderDraft.deliveryFee,checkout_proof:checkoutProof});
    for (const {id,qty} of items) {
      const remaining = (bag.get(id) || 0) - qty;
      if (remaining > 0) bag.set(id,remaining);
      else bag.delete(id);
    }
    saveBag();
    for (const key of Object.keys(details)) details[key] = '';
    orderDraft = undefined;
    $('#order-reference').value = order.id;
    try { localStorage.setItem('vinity-order-reference',order.id); } catch {}
    $('#bag-title').textContent = 'Order received';
    content.innerHTML = `<p>Save this reference to check your order status.</p>
      <label class="receipt">Order reference<input readonly></label>
      ${orderTotals(order.subtotal, order.delivery_fee)}
      <p class="order-note">Cash on delivery · ${order.payment_status || 'Unpaid'}</p>
      ${order.account_linked ? `<p class="order-note">Saved to <a href="${accountUrl}#history-title">your account</a>.</p>` : ''}
      <div class="actions"><a class="primary" id="track-receipt" href="#track">Track this order</a>
      <button class="secondary" id="download-confirmation" type="button">Download confirmation</button></div>`;
    content.querySelector('input').value = order.id;
    $('#download-confirmation').addEventListener('click',() => {
      const confirmation = [
        'The Vinity order confirmation', 'Reference: ' + order.id,
        'Items subtotal: ' + money(order.subtotal), 'Delivery: ' + deliveryText(order.delivery_fee),
        'Total: ' + (order.total == null ? 'Pending delivery fee' : money(order.total)),
        'Payment: Cash on delivery', 'Track: ' + new URL('#track',location.href).href
      ].join('\n');
      downloadText('the-vinity-confirmation.txt',confirmation);
    });
    $('#track-receipt').addEventListener('click',() => {
      drawer.close();
      $('#track-form').requestSubmit();
    });
    $('#track-receipt').focus();
    loadInventory();
  } catch (error) {
    if (error.code === 'checkout_session_expired') {
      clearCheckoutProof();
      renderBag(error.message);
      $('#bag-feedback').setAttribute('tabindex','-1');
      $('#bag-feedback').focus();
    } else if (error.code === 'inventory_changed' || error.code === 'delivery_fee_changed') {
      try {
        const [fee] = await Promise.all([deliveryFee(),refreshInventory()]);
        reviewUpdatedBag(fee,error.message);
      } catch {
        feedback.textContent = 'The order changed. Use Edit details to review it again.';
      }
    } else feedback.textContent = error.message;
  } finally {
    for (const button of buttons) button.disabled = false;
    sendingOrder = false;
  }
}

function reviewUpdatedBag(fee, notice = '') {
  if ([...bag].some(([id,qty]) => qty > inventory.get(id).limit)) {
    renderBag('Some quantities are no longer available. Adjust your bag before checking out.');
    $('#bag-feedback').setAttribute('tabindex','-1');
    $('#bag-feedback').focus();
    return;
  }
  renderRequest(fee,notice);
}

try { $('#order-reference').value = localStorage.getItem('vinity-order-reference') || ''; } catch {}
$('#track-form').addEventListener('submit',async (event) => {
  event.preventDefault();
  const button = event.target.querySelector('button');
  const result = $('#tracking-result');
  const shipment = $('#shipment-details');
  button.disabled = true;
  shipment.hidden = true;
  result.textContent = 'Checking order status…';
  try {
    const order = await orderApi('track', {id:$('#order-reference').value.trim()});
    const amount = order.total == null ? `Items subtotal ${money(order.subtotal)} · Delivery fee pending` : `Total ${money(order.total)}`;
    result.textContent = [order.status,amount,order.payment_method,order.payment_status].filter(Boolean).join(' · ');
    if (order.shipment) {
      $('#tracking-courier').textContent = order.shipment.courier;
      $('#tracking-number').textContent = order.shipment.tracking_number;
      shipment.hidden = false;
    }
  } catch (error) {
    result.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

$('#hero-feature').addEventListener('click', (event) => showProduct(products.get(11),event.detail > 0));

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

$('#filters').innerHTML = ['All scents', ...families].map((family) =>
  `<button class="filter" type="button" data-scent="${family}" aria-pressed="false">${family}</button>`
).join('');
$('.catalog-filters').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.remove) {
    bag.delete(Number(button.dataset.remove));
    saveBag();
    renderBag();
    content.querySelector('button')?.focus();
    return;
  }
  if (button.dataset.scent) selected = button.dataset.scent;
  else if (button.dataset.collection) selectedCollection = button.dataset.collection;
  else if (button.id === 'clear-filters') {
    selected = 'All scents';
    selectedCollection = 'All perfumes';
    $('#search').value = '';
    $('#search').focus({preventScroll:true});
  }
  renderProducts();
});
$('#search').addEventListener('input', renderProducts);
document.querySelectorAll('#products,#featured-products').forEach((list) => list.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.details) showProduct(products.get(Number(button.dataset.details)),event.detail > 0);
  else if (button.dataset.add) addToBag(Number(button.dataset.add));
  else if (button.dataset.more) {
    const collection = button.dataset.more;
    const limit = visibleCounts.get(collection) ?? pageSize;
    visibleCounts.set(collection, limit + pageSize);
    renderProducts();
    const group = collection === 'For Him' ? '#for-him' : '#for-her';
    $(group).closest('section').querySelectorAll('[data-details]')[limit]?.focus();
  }
}));
document.querySelectorAll('a[data-family]').forEach((link) => link.addEventListener('click', () => {
  selected = link.dataset.family;
  selectedCollection = 'All perfumes';
  $('#search').value = '';
  renderProducts();
}));
$('#close-product').addEventListener('click', () => productDialog.close());
productDialog.addEventListener('click', (event) => {
  if (event.target === productDialog) productDialog.close();
  const button = event.target.closest('[data-add]');
  if (button) addToBag(Number(button.dataset.add));
});
$('#open-bag').addEventListener('click', (event) => {
  renderBag();
  drawer.toggleAttribute('data-pointer-entry',event.detail > 0);
  drawer.showModal();
});
$('#close-bag').addEventListener('click', () => drawer.close());
drawer.addEventListener('click', (event) => { if (event.target === drawer && !sendingOrder) drawer.close(); });
drawer.addEventListener('cancel', (event) => { if (sendingOrder) event.preventDefault(); });

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
    case 'guest':
      clearCheckoutProof();
      renderCheckout();
      break;
    case 'browse':
      drawer.close();
      $('#collection').scrollIntoView();
      $('#search').focus({preventScroll:true});
      break;
    case 'send':
      await sendOrder();
      break;
    case 'copy':
      try {
        await navigator.clipboard.writeText(orderDraft.requestText);
        $('#request-status').textContent = 'Order request copied.';
      } catch {
        if (stage === 'request') $('#request-status').textContent = 'Copy is unavailable. You can download the request instead.';
      }
      break;
    case 'download': {
      downloadText('the-vinity-order.txt',orderDraft.requestText);
      $('#request-status').textContent = 'Order request downloaded.';
      break;
    }
  }
});

content.addEventListener('input', (event) => {
  if (stage === 'checkout') event.target.setCustomValidity('');
});

content.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const submit = form.querySelector('button[type=submit]');
  if (submit.disabled) return;
  for (const key of Object.keys(details)) {
    const field = form.elements[key];
    details[key] = field.value.trim();
    const valid = details[key] && (key !== 'phone' || /^[+0-9(). -]+$/.test(details[key]) && details[key].replace(/\D/g, '').length >= 7);
    if (!valid) {
      field.setCustomValidity(key === 'phone' ? 'Enter a valid mobile number.' : 'Fill out this field.');
      field.reportValidity();
      return;
    }
  }
  const fields = Array.from(form.elements);
  for (const field of fields) field.disabled = true;
  const feedback = $('#checkout-feedback');
  feedback.textContent = 'Checking prices, stock and delivery…';
  try {
    const [fee] = await Promise.all([deliveryFee(),refreshInventory()]);
    if (drawer.open && form.isConnected) reviewUpdatedBag(fee);
  } catch {
    feedback.textContent = 'Could not check current prices, stock and delivery. Try reviewing your order again.';
  } finally {
    for (const field of fields) field.disabled = false;
  }
});

updateCount();
renderFeatured();
renderProducts();
const retryInventory = $('#retry-inventory');
async function loadInventory() {
  retryInventory.disabled = true;
  try {
    await refreshInventory();
    if (drawer.open && stage === 'bag') renderBag();
  } catch {
    $('#inventory-message').hidden = false;
  } finally {
    retryInventory.disabled = false;
  }
}
retryInventory.addEventListener('click',loadInventory);
if (resumeBag && bag.size) {
  renderBag();
  drawer.showModal();
}
loadInventory();

