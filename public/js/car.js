// Car detail page logic
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadCar();
});

let currentCar = null;
let currentPhotoIndex = 0;

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

async function loadCar() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
        document.getElementById('carContent').innerHTML = '<div class="no-results"><p>Car not found.</p></div>';
        return;
    }

    try {
        const res = await fetch(`/api/cars/${id}`);
        if (!res.ok) throw new Error('Not found');
        const car = await res.json();
        currentCar = car;

        document.title = `${car.make} ${car.model} ${car.year} — Automani Cars`;
        renderCarDetail(car);

        // Setup mobile buttons
        const whatsappMsg = encodeURIComponent(`Hi Automani Cars, I'm interested in the ${car.make} ${car.model} ${car.year} listed at ₹${formatPrice(car.price)}. Is it still available?`);
        document.getElementById('mobileWhatsappBtn').href = `https://wa.me/919876543210?text=${whatsappMsg}`;
        if (car.status !== 'sold') {
            document.getElementById('mobileContactBar').style.display = 'flex';
        }
    } catch (err) {
        document.getElementById('carContent').innerHTML = '<div class="no-results"><div class="icon">🚗</div><p>Car not found or an error occurred.</p></div>';
    }
}

function renderCarDetail(car) {
    const photos = safeParseJSON(car.photos);
    const whatsappMsg = encodeURIComponent(`Hi Automani Cars, I'm interested in the ${car.make} ${car.model} ${car.year} listed at ₹${formatPrice(car.price)}. Is it still available?`);

    // Gallery
    let galleryHTML;
    if (photos.length > 0) {
        galleryHTML = `
      <div class="gallery">
        <div class="gallery-main" id="galleryMain">
          <img src="${photos[0]}" alt="${car.make} ${car.model}" id="galleryImage">
          ${photos.length > 1 ? `
            <button class="gallery-nav gallery-prev" onclick="prevPhoto()">‹</button>
            <button class="gallery-nav gallery-next" onclick="nextPhoto()">›</button>
          ` : ''}
        </div>
        ${photos.length > 1 ? `
          <div class="gallery-thumbs">
            ${photos.map((p, i) => `
              <div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="goToPhoto(${i})">
                <img src="${p}" alt="Photo ${i + 1}">
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    } else {
        galleryHTML = `
      <div class="gallery">
        <div class="gallery-main">
          <div class="gallery-placeholder">🚗</div>
        </div>
      </div>
    `;
    }

    const statusBadge = car.status === 'sold'
        ? '<span class="car-badge sold" style="position: static; display: inline-block; margin-left: 12px; vertical-align: middle;">Sold</span>'
        : (car.badge ? `<span class="car-badge ${car.badge.toLowerCase()}" style="position: static; display: inline-block; margin-left: 12px; vertical-align: middle;">${car.badge}</span>` : '');

    document.getElementById('carContent').innerHTML = `
    <div class="car-detail-layout">
      <div>
        ${galleryHTML}

        <div class="car-detail-header" style="margin-top: 28px;">
          <h1 class="car-detail-title">${car.make} ${car.model} ${car.year} ${statusBadge}</h1>
          <div class="car-detail-price">₹${formatPrice(car.price)} <small>onwards</small></div>
        </div>

        <div class="specs-grid">
          <div class="spec-item">
            <div class="label">Year</div>
            <div class="value">${car.year}</div>
          </div>
          <div class="spec-item">
            <div class="label">KM Driven</div>
            <div class="value">${car.kms.toLocaleString('en-IN')} km</div>
          </div>
          <div class="spec-item">
            <div class="label">Fuel Type</div>
            <div class="value">${car.fuel}</div>
          </div>
          <div class="spec-item">
            <div class="label">Transmission</div>
            <div class="value">${car.transmission}</div>
          </div>
          <div class="spec-item">
            <div class="label">Owners</div>
            <div class="value">${car.owners}${getOwnerSuffix(car.owners)}</div>
          </div>
          <div class="spec-item">
            <div class="label">Reg. City</div>
            <div class="value">${car.reg_city || '—'}</div>
          </div>
          ${car.insurance_validity ? `
          <div class="spec-item">
            <div class="label">Insurance Valid</div>
            <div class="value">${car.insurance_validity}</div>
          </div>
          ` : ''}
        </div>

        ${car.description ? `
          <div style="margin-bottom: 32px;">
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 12px;">About this Car</h3>
            <p style="color: var(--text-secondary); line-height: 1.7; font-size: 0.95rem;">${car.description}</p>
          </div>
        ` : ''}
      </div>

      <!-- Contact Sidebar -->
      <div class="contact-sidebar">
        <h3>Interested in this car?</h3>
        <a href="tel:+919876543210" class="btn btn-primary">📞 Call Now</a>
        <a href="https://wa.me/919876543210?text=${whatsappMsg}" class="btn btn-accent" target="_blank">💬 WhatsApp</a>

        <div class="lead-form">
          <h4>Send an Enquiry</h4>
          <form id="leadForm" onsubmit="submitLead(event)">
            <div class="form-group">
              <input type="text" placeholder="Your Name" name="name" required>
            </div>
            <div class="form-group">
              <input type="tel" placeholder="Phone Number" name="phone" required>
            </div>
            <div class="form-group">
              <textarea placeholder="Message (optional)" name="message">I'm interested in the ${car.make} ${car.model} ${car.year}.</textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Send Enquiry</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

// Gallery navigation
function nextPhoto() {
    const photos = safeParseJSON(currentCar.photos);
    if (photos.length <= 1) return;
    currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
    updateGallery(photos);
}

function prevPhoto() {
    const photos = safeParseJSON(currentCar.photos);
    if (photos.length <= 1) return;
    currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
    updateGallery(photos);
}

function goToPhoto(index) {
    currentPhotoIndex = index;
    const photos = safeParseJSON(currentCar.photos);
    updateGallery(photos);
}

function updateGallery(photos) {
    document.getElementById('galleryImage').src = photos[currentPhotoIndex];
    document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === currentPhotoIndex);
    });
}

// Lead form submission
async function submitLead(event) {
    event.preventDefault();
    const form = event.target;
    const data = {
        car_id: currentCar.id,
        name: form.name.value,
        phone: form.phone.value,
        message: form.message.value
    };

    try {
        const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showToast('Enquiry sent! We\'ll get back to you soon.', 'success');
            form.reset();
        } else {
            showToast('Failed to send enquiry. Please try calling.', 'error');
        }
    } catch (err) {
        showToast('Network error. Please try calling.', 'error');
    }
}

// Toast
function showToast(message, type = '') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Helpers
function getOwnerSuffix(n) {
    if (n === 1) return 'st Owner';
    if (n === 2) return 'nd Owner';
    if (n === 3) return 'rd Owner';
    return 'th Owner';
}

function formatPrice(price) {
    if (price >= 10000000) return (price / 10000000).toFixed(2) + ' Cr';
    if (price >= 100000) return (price / 100000).toFixed(2) + ' L';
    return price.toLocaleString('en-IN');
}

function safeParseJSON(str) {
    try { return JSON.parse(str || '[]'); }
    catch { return []; }
}
