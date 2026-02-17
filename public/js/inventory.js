// Inventory page logic
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadMakes();
    applyURLFilters();
    loadCars();
    setupEventListeners();
});

let currentPage = 1;
const perPage = 12;

// Navigation
function initNavigation() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    const nav = document.getElementById('navbar');

    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => links.classList.remove('open'));
    });
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 20));
}

// Load makes for filter dropdown
async function loadMakes() {
    try {
        const res = await fetch('/api/cars/makes');
        const makes = await res.json();
        const select = document.getElementById('filterMake');
        makes.forEach(make => {
            const opt = document.createElement('option');
            opt.value = make;
            opt.textContent = make;
            select.appendChild(opt);
        });
    } catch (err) { }
}

// Apply URL params to filters (e.g. ?fuel=Diesel)
function applyURLFilters() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fuel')) document.getElementById('filterFuel').value = params.get('fuel');
    if (params.get('make')) document.getElementById('filterMake').value = params.get('make');
    if (params.get('transmission')) document.getElementById('filterTransmission').value = params.get('transmission');
    if (params.get('year')) document.getElementById('filterYear').value = params.get('year');
    if (params.get('status')) document.getElementById('filterStatus').value = params.get('status');
    if (params.get('search')) document.getElementById('searchInput').value = params.get('search');
}

// Setup event listeners
function setupEventListeners() {
    // Apply filters
    document.getElementById('applyFilters').addEventListener('click', () => {
        currentPage = 1;
        loadCars();
    });

    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('filterMake').value = '';
        document.getElementById('filterFuel').value = '';
        document.getElementById('filterTransmission').value = '';
        document.getElementById('filterYear').value = '';
        document.getElementById('filterMinPrice').value = '';
        document.getElementById('filterMaxPrice').value = '';
        document.getElementById('filterMinKms').value = '';
        document.getElementById('filterMaxKms').value = '';
        document.getElementById('filterStatus').value = 'available';
        document.getElementById('searchInput').value = '';
        currentPage = 1;
        loadCars();
    });

    // Sort change
    document.getElementById('sortSelect').addEventListener('change', () => {
        currentPage = 1;
        loadCars();
    });

    // Search on Enter
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentPage = 1;
            loadCars();
        }
    });

    // Mobile filters toggle
    document.getElementById('filtersToggle').addEventListener('click', () => {
        document.getElementById('filtersPanel').classList.toggle('open');
    });
}

// Load cars from API
async function loadCars() {
    const grid = document.getElementById('carsGrid');
    grid.innerHTML = '<div class="spinner"></div>';

    const params = new URLSearchParams();
    params.set('page', currentPage);
    params.set('limit', perPage);
    params.set('sort', document.getElementById('sortSelect').value);

    const make = document.getElementById('filterMake').value;
    const fuel = document.getElementById('filterFuel').value;
    const transmission = document.getElementById('filterTransmission').value;
    const year = document.getElementById('filterYear').value;
    const minPrice = document.getElementById('filterMinPrice').value;
    const maxPrice = document.getElementById('filterMaxPrice').value;
    const minKms = document.getElementById('filterMinKms').value;
    const maxKms = document.getElementById('filterMaxKms').value;
    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('searchInput').value.trim();

    if (make) params.set('make', make);
    if (fuel) params.set('fuel', fuel);
    if (transmission) params.set('transmission', transmission);
    if (year) params.set('year', year);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minKms) params.set('minKms', minKms);
    if (maxKms) params.set('maxKms', maxKms);
    if (status) params.set('status', status);
    if (search) params.set('search', search);

    try {
        const res = await fetch(`/api/cars?${params.toString()}`);
        const data = await res.json();

        document.getElementById('resultsCount').textContent = `Showing ${data.cars.length} of ${data.pagination.total} cars`;

        if (data.cars.length === 0) {
            grid.innerHTML = '<div class="no-results"><div class="icon">🔍</div><p>No cars match your filters. Try adjusting your search.</p></div>';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        grid.innerHTML = data.cars.map(car => createCarCard(car)).join('');
        renderPagination(data.pagination);
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

// Pagination
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (pagination.pages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button ${pagination.page <= 1 ? 'disabled' : ''} onclick="goToPage(${pagination.page - 1})">← Prev</button>`;

    for (let i = 1; i <= pagination.pages; i++) {
        if (i === 1 || i === pagination.pages || (i >= pagination.page - 1 && i <= pagination.page + 1)) {
            html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === pagination.page - 2 || i === pagination.page + 2) {
            html += `<button disabled>...</button>`;
        }
    }

    html += `<button ${pagination.page >= pagination.pages ? 'disabled' : ''} onclick="goToPage(${pagination.page + 1})">Next →</button>`;
    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadCars();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
