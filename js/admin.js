const SUPABASE_URL = 'https://mrwjjdywjwvzrdkgwbtm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yd2pqZHl3and2enJka2d3YnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDgxMTMsImV4cCI6MjA4ODgyNDExM30.rv1RHc1KRVn3yH5ZeUojERkGi7diAYtekuqHf1N1TYI';
let supabaseClient = window.supabaseClient;
if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabaseClient = supabaseClient;
}

let adminUser = null;
window.addEventListener('DOMContentLoaded', async () => {
    // Supabase auth checking is bypassed for hardcoded credentials.
    if(localStorage.getItem('maktaba_admin') === 'true') {
        adminUser = { name: 'maktaba' };
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        loadAdminData();
    }
});

async function handleAdminLogin(e) {
    e.preventDefault();
    const name = document.getElementById('admin-name').value;
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-error');
    errorEl.innerText = '';
    
    if(name === 'maktaba' && password === 'maktaba74') {
        localStorage.setItem('maktaba_admin', 'true');
        adminUser = { name: 'maktaba' };
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        loadAdminData();
    } else {
        errorEl.innerText = 'Invalid Admin Name or Password.';
    }
}

async function handleAdminLogout() {
    localStorage.removeItem('maktaba_admin');
    adminUser = null;
    window.location.href = 'index.html';
}

function showAdminSection(secId, el) {
    document.querySelectorAll('.admin-sec').forEach(s => s.style.display = 'none');
    document.getElementById('sec-' + secId).style.display = 'block';
    
    document.querySelectorAll('.admin-sidebar a').forEach(a => a.classList.remove('active'));
    if(el) el.classList.add('active');
    
    if(secId === 'users') loadAdminUsers();
}

async function loadAdminData() {
    await loadAdminProducts();
    // Load orders default to pending
    await loadAdminOrders('pending');
    await loadAdminUsersCount();
}

async function loadAdminUsersCount() {
    const { count } = await supabaseClient.from('users').select('*', { count: 'exact', head: true });
    const statEl = document.getElementById('stat-users');
    if (statEl) statEl.innerText = count || 0;
}

async function loadAdminProducts() {
    // Load products
    const { data: products } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
    document.getElementById('stat-products').innerText = products ? products.length : 0;
    
    if (products) {
        const tbody = document.getElementById('admin-products-list');
        tbody.innerHTML = '';
        products.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.title}</td>
                    <td>${p.category}</td>
                    <td style="text-transform: capitalize;">${p.type}</td>
                    <td>Rs. ${p.price}</td>
                    <td>
                        <button class="btn" style="padding: 5px 10px; font-size: 0.8rem; background: #e53935;" onclick="deleteProduct('${p.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    }
}

async function loadAdminUsers() {
    const { data: users } = await supabaseClient.from('users').select('*').order('created_at', { ascending: false });
    if (users) {
        const tbody = document.getElementById('admin-users-list');
        if (tbody) {
            tbody.innerHTML = '';
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No users found.</td></tr>';
            }
            users.forEach(u => {
                const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';
                tbody.innerHTML += `
                    <tr>
                        <td>${u.name || 'N/A'}</td>
                        <td>${u.email || 'N/A'}</td>
                        <td>${dateStr}</td>
                    </tr>
                `;
            });
        }
    }
}

async function loadAdminOrders(statusFilter) {
    if (statusFilter === 'pending') {
        document.getElementById('filter-pending').className = 'btn';
        document.getElementById('filter-paid').className = 'btn btn-outline';
    } else {
        document.getElementById('filter-pending').className = 'btn btn-outline';
        document.getElementById('filter-paid').className = 'btn';
    }

    const { data: orders } = await supabaseClient.from('orders')
        .select('*, users(name)')
        .eq('status', statusFilter)
        .order('created_at', { ascending: false });
    
    if (orders) {
        const tbody = document.getElementById('admin-orders-list');
        tbody.innerHTML = '';
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No orders found.</td></tr>';
        }
        orders.forEach(o => {
            let titles = [];
            if (o.items && Array.isArray(o.items)) {
                o.items.forEach(i => titles.push(i.product.title));
            }
            const booksTitleStr = titles.length > 0 ? titles.join(', ') : 'Unknown';
            const userStr = o.shipping_details ? `${o.shipping_details.name}<br><small style="color:#666;">${o.shipping_details.phone}</small>` : (o.users ? o.users.name : 'Unknown');
            
            let proofHtml = '<span style="color:#aaa; font-size:0.85rem;">No Screenshot</span>';
            if (o.payment_proof) {
                const proofUrl = o.payment_proof.startsWith('http')
                    ? o.payment_proof
                    : supabaseClient.storage.from('payment-proofs').getPublicUrl(o.payment_proof).data.publicUrl;
                proofHtml = `
                    <a href="${proofUrl}" target="_blank" title="Click to view full screenshot">
                        <img src="${proofUrl}" 
                             alt="Payment Screenshot"
                             style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 2px solid var(--primary-color); cursor: pointer; transition: transform 0.2s;"
                             onmouseover="this.style.transform='scale(1.8)'"
                             onmouseout="this.style.transform='scale(1)'"
                        />
                    </a>`;
            }
                
            const actionBtn = statusFilter === 'pending' ? 
                `<button class="btn" style="padding: 5px 10px; font-size: 0.8rem;" onclick="updateOrderStatus('${o.id}', 'paid')">Approve</button>` 
                : '<span style="color: green; font-weight: bold;">✓ Approved</span>';

            tbody.innerHTML += `
                <tr>
                    <td>${userStr}</td>
                    <td>${booksTitleStr}</td>
                    <td style="text-align:center;">${proofHtml}</td>
                    <td style="text-transform: capitalize;">${o.status}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        });
    }
}

async function updateOrderStatus(id, status) {
    await supabaseClient.from('orders').update({ status }).eq('id', id);
    alert('Order approved and marked as paid!');
    loadAdminOrders('pending');
}

function openProductModal() {
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('product-modal').style.display = 'flex';
    togglePdfUpload();
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

function togglePdfUpload() {
    const type = document.getElementById('prod-type').value;
    document.getElementById('pdf-upload-group').style.display = type === 'pdf' ? 'block' : 'none';
}

async function saveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('save-prod-btn');
    btn.disabled = true;
    btn.innerText = 'Saving...';
    
    try {
        const title = document.getElementById('prod-title').value;
        const description = document.getElementById('prod-desc').value;
        const price = document.getElementById('prod-price').value;
        const category = document.getElementById('prod-category').value;
        const type = document.getElementById('prod-type').value;
        
        const imgFile = document.getElementById('prod-image').files[0];
        const pdfFile = document.getElementById('prod-pdf').files[0];
        
        let uploadPromises = [];
        let imageUrl = null;
        let pdfUrl = null;

        if (imgFile) {
            const fileExt = imgFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            imageUrl = fileName;
            // Background upload
            supabaseClient.storage.from('product-images').upload(fileName, imgFile).then(r => {
                if (r.error) console.error("Image upload failed", r.error);
            }).catch(e => console.error(e));
        }
        
        if (type === 'pdf' && pdfFile) {
            const fileExt = pdfFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            pdfUrl = fileName;
            // Background upload
            supabaseClient.storage.from('product-pdfs').upload(fileName, pdfFile).then(r => {
                if (r.error) console.error("PDF upload failed", r.error);
            }).catch(e => console.error(e));
        }
        
        const payload = { title, description, price, category, type };
        if (imageUrl) payload.image_url = imageUrl;
        if (pdfUrl) payload.pdf_url = pdfUrl;

        const { error } = await supabaseClient.from('products').insert([payload]);
        
        if (error) throw error;

        closeProductModal();
        document.getElementById('product-success-popup').style.display = 'flex';
        loadAdminProducts(); // Only reload products to save time
        
    } catch (err) {
        alert('Unexpected error occurred: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Save';
    }
}

function closeProductSuccessPopup() {
    document.getElementById('product-success-popup').style.display = 'none';
}

async function deleteProduct(id) {
    if(confirm('Are you sure you want to delete this product?')) {
        await supabaseClient.from('products').delete().eq('id', id);
        loadAdminProducts();
    }
}
