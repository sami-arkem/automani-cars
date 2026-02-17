// Home page logic
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadFeaturedCars();
});

// Navigation
function initNavigation() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    const nav = document.getElementById('navbar');

    toggle.addEventListener('click', () => {
        links.classList.toggle('open');
    });

    // Close menu on link click (mobile)
    links.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => links.classList.remove('open'));
    });

    // Nav scroll effect
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 20);
    });
}

// Load featured cars
async function loadFeaturedCars() {
    const grid = document.getElementById('featuredCars');
    try {
        const res = await fetch('/api/cars/featured');
        const cars = await res.json();

        if (cars.length === 0) {
            grid.innerHTML = '<div class="no-results"><div class="icon">🚗</div><p>No cars available yet. Check back soon!</p></div>';
            return;
        }

        grid.innerHTML = cars.map(car => createCarCard(car)).join('');
    } catch (err) {
        grid.innerHTML = '<div class="no-results"><p>Failed to load cars. Please refresh.</p></div>';
    }
}

// Create car card HTML
function createCarCard(car) {
    const photos = safeParseJSON(car.photos);
    const photoHTML = photos.length > 0
        ? `<img src="${photos[0]}" alt="${car.make} ${car.model}" loading="lazy">`
        : `<div class="car-card-placeholder">🚗</div>`;

    const badgeHTML = car.badge
        ? `<span class="car-badge ${car.badge.toLowerCase()}">${car.badge}</span>`
        : (car.status === 'sold' ? '<span class="car-badge sold">Sold</span>' : '');

    return `
    <div class="car-card" onclick="window.location.href='/car.html?id=${car.id}'">
      <div class="car-card-image">
        ${photoHTML}
        ${badgeHTML}
      </div>
      <div class="car-card-body">
        <h3 class="car-card-title">${car.make} ${car.model}</h3>
        <div class="car-card-specs">
          <span class="car-spec"><span class="icon">📅</span> ${car.year}</span>
          <span class="car-spec"><span class="icon">⛽</span> ${car.fuel}</span>
          <span class="car-spec"><span class="icon">⚙️</span> ${car.transmission}</span>
          <span class="car-spec"><span class="icon">🛣️</span> ${formatKms(car.kms)}</span>
        </div>
        <div class="car-card-footer">
          <span class="car-price">₹${formatPrice(car.price)}</span>
          <button class="car-card-btn">View Details</button>
        </div>
      </div>
    </div>
  `;
}

// Helpers
function formatPrice(price) {
    if (price >= 10000000) return (price / 10000000).toFixed(2) + ' Cr';
    if (price >= 100000) return (price / 100000).toFixed(2) + ' L';
    return price.toLocaleString('en-IN');
}

function formatKms(kms) {
    if (kms >= 1000) return (kms / 1000).toFixed(0) + 'k km';
    return kms + ' km';
}

function safeParseJSON(str) {
    try { return JSON.parse(str || '[]'); }
    catch { return []; }
}
