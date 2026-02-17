// Admin panel shared logic

// Auth check — redirect to login if not authenticated
(async function checkAuth() {
    try {
        const res = await fetch('/admin/check');
        const data = await res.json();
        if (!data.authenticated && !window.location.pathname.includes('login')) {
            window.location.href = '/admin/login.html';
        }
    } catch (err) {
        if (!window.location.pathname.includes('login')) {
            window.location.href = '/admin/login.html';
        }
    }
})();

// Logout
async function logout() {
    await fetch('/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
}

// Toast notification
function showToast(message, type = '') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Format price
function formatPrice(price) {
    if (price >= 10000000) return (price / 10000000).toFixed(2) + ' Cr';
    if (price >= 100000) return (price / 100000).toFixed(2) + ' L';
    return price.toLocaleString('en-IN');
}

// Dashboard logic — only runs on dashboard page
if (window.location.pathname.includes('dashboard')) {
    document.addEventListener('DOMContentLoaded', () => {
        loadDashboard();
        loadLeads();
    });
}

async function loadDashboard() {
    try {
        // Load all cars (no filter, high limit)
        const res = await fetch('/api/cars?limit=999');
        const data = await res.json();
        const cars = data.cars;

        // Stats
        const total = cars.length;
        const available = cars.filter(c => c.status === 'available').length;
        const sold = cars.filter(c => c.status === 'sold').length;

        document.getElementById('statTotal').textContent = total;
        document.getElementById('statAvailable').textContent = available;
        document.getElementById('statSold').textContent = sold;

        // Table
        const tbody = document.getElementById('carsTableBody');
        if (cars.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-secondary);">No cars yet. Click "Add New Car" to get started.</td></tr>';
            return;
        }

        tbody.innerHTML = cars.map(car => {
            const photos = safeParseJSON(car.photos);
            const thumbHTML = photos.length > 0
                ? `<img src="${photos[0]}" class="car-thumb" alt="${car.make}">`
                : `<div class="car-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--gray-100);border-radius:var(--radius-sm);">🚗</div>`;

            return `
        <tr>
          <td>${thumbHTML}</td>
          <td><strong>${car.make} ${car.model}</strong></td>
          <td>${car.year}</td>
          <td>₹${formatPrice(car.price)}</td>
          <td>${car.fuel}</td>
          <td>${car.kms.toLocaleString()}</td>
          <td><span class="status-badge ${car.status}">${car.status}</span></td>
          <td>
            <div class="actions-cell">
              <button class="action-btn" onclick="editCar(${car.id})">✏️ Edit</button>
              <button class="action-btn" onclick="toggleStatus(${car.id}, '${car.status}')">${car.status === 'available' ? '🔴 Mark Sold' : '🟢 Mark Available'}</button>
              <button class="action-btn delete" onclick="confirmDelete(${car.id}, '${car.make} ${car.model}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
        }).join('');
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

async function loadLeads() {
    try {
        const res = await fetch('/api/leads');
        const leads = await res.json();

        document.getElementById('statLeads').textContent = leads.length;

        const tbody = document.getElementById('leadsTableBody');
        if (leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-secondary);">No enquiries yet.</td></tr>';
            return;
        }

        tbody.innerHTML = leads.map(lead => `
      <tr>
        <td><strong>${lead.name}</strong></td>
        <td><a href="tel:${lead.phone}" style="color: var(--primary);">${lead.phone}</a></td>
        <td>${lead.make ? `${lead.make} ${lead.model} ${lead.year}` : '—'}</td>
        <td>${lead.message || '—'}</td>
        <td>${new Date(lead.created_at).toLocaleDateString('en-IN')}</td>
      </tr>
    `).join('');
    } catch (err) {
        console.error('Leads load error:', err);
    }
}

function editCar(id) {
    window.location.href = `/admin/editor.html?id=${id}`;
}

async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'available' ? 'sold' : 'available';
    try {
        const carRes = await fetch(`/api/cars/${id}`);
        const car = await carRes.json();

        const formData = new FormData();
        Object.keys(car).forEach(key => {
            if (key !== 'id' && key !== 'created_at' && key !== 'photos') {
                formData.append(key, car[key]);
            }
        });
        formData.set('status', newStatus);
        formData.append('existingPhotos', car.photos || '[]');

        const res = await fetch(`/api/cars/${id}`, { method: 'PUT', body: formData });
        if (res.ok) {
            showToast(`Car marked as ${newStatus}`, 'success');
            loadDashboard();
        }
    } catch (err) {
        showToast('Failed to update status', 'error');
    }
}

function confirmDelete(id, name) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal-content">
      <h3>Delete Listing</h3>
      <p>Are you sure you want to delete <strong>${name}</strong>? This action cannot be undone.</p>
      <div class="modal-actions">
        <button class="btn btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-sm" style="background:#dc2626;color:white;" onclick="deleteCar(${id})">Delete</button>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

async function deleteCar(id) {
    try {
        const res = await fetch(`/api/cars/${id}`, { method: 'DELETE' });
        if (res.ok) {
            document.querySelector('.modal-overlay')?.remove();
            showToast('Car deleted successfully', 'success');
            loadDashboard();
        }
    } catch (err) {
        showToast('Failed to delete car', 'error');
    }
}

function safeParseJSON(str) {
    try { return JSON.parse(str || '[]'); } catch { return []; }
}
