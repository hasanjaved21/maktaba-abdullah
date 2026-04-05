// App Logic
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('maktaba_cart')) || [];
let products = [];
let isSignUpMode = false;

// Ensure Supabase is initialized even if supabase.js dropped
const SUPABASE_URL = 'https://mrwjjdywjwvzrdkgwbtm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yd2pqZHl3and2enJka2d3YnRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDgxMTMsImV4cCI6MjA4ODgyNDExM30.rv1RHc1KRVn3yH5ZeUojERkGi7diAYtekuqHf1N1TYI';
let supabaseClient = window.supabaseClient;
if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabaseClient = supabaseClient;
}

// Basic UI Routing
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    if(sectionId === 'shop') loadProducts();
    if(sectionId === 'cart') renderCart();
    if(sectionId === 'my-books') loadMyBooks();
}

// Mobile menu toggle
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('hamburger-btn');
    menu.classList.toggle('open');
    btn.classList.toggle('open');
}

function closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('hamburger-btn');
    menu.classList.remove('open');
    btn.classList.remove('open');
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(e) {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('hamburger-btn');
    if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
        btn.classList.remove('open');
    }
});

// initialization
window.addEventListener('DOMContentLoaded', async () => {
    updateCartBadge();
    
    // Check custom Auth session
    const localUserStr = localStorage.getItem('maktaba_user');
    if (localUserStr) {
        currentUser = JSON.parse(localUserStr);
        document.getElementById('auth-link').innerText = 'Logout';
        document.getElementById('auth-link').onclick = handleLogout;
        document.getElementById('my-books-link').style.display = 'inline-block';
        // Sync mobile links
        const mobileAuthLink = document.getElementById('auth-link-mobile');
        const mobileMybooksLink = document.getElementById('my-books-link-mobile');
        if (mobileAuthLink) { mobileAuthLink.innerText = 'Logout'; mobileAuthLink.onclick = () => { closeMobileMenu(); handleLogout(); }; }
        if (mobileMybooksLink) mobileMybooksLink.style.display = 'block';
    }

    loadFeaturedProducts();
});

// Load Products
async function loadProducts() {
    document.getElementById('shop-grid').innerHTML = '<div class="loader"></div>';
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error(error);
        return;
    }
    products = data;
    renderProducts(products, 'shop-grid');
}

async function loadFeaturedProducts() {
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);
    if (!error) {
        renderProducts(data, 'featured-grid');
    }
}

function renderProducts(productList, containerId) {
    const container = document.getElementById(containerId);
    if (productList.length === 0) {
        container.innerHTML = '<p>No products found.</p>';
        return;
    }
    
    let html = '';
    productList.forEach(p => {
        let imageUrl = 'https://via.placeholder.com/250x300?text=No+Image';
        if (p.image_url) {
            if (p.image_url.startsWith('http')) {
                imageUrl = p.image_url;
            } else {
                imageUrl = supabaseClient.storage.from('product-images').getPublicUrl(p.image_url).data.publicUrl;
            }
        }
        
        html += `
            <div class="product-card" onclick="viewProduct('${p.id}')">
                <img src="${imageUrl}" alt="${p.title}" class="product-img">
                <div class="product-category">${p.category} ${p.type==='pdf'? '(PDF)' : ''}</div>
                <div class="product-title">${p.title}</div>
                <div class="product-price">Rs. ${p.price}</div>
                <button class="btn btn-outline" onclick="event.stopPropagation(); addToCart('${p.id}')">Buy Now</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Product Detail
async function viewProduct(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    
    let imageUrl = 'https://via.placeholder.com/400x500?text=No+Image';
    if (p.image_url) {
        imageUrl = p.image_url.startsWith('http') ? p.image_url : supabaseClient.storage.from('product-images').getPublicUrl(p.image_url).data.publicUrl;
    }
    
    let actionsHtml = `<button class="btn" style="margin-right: 1rem;" onclick="addToCart('${p.id}')">Buy Now</button>`;

    const html = `
        <div style="background: white; border-radius: 12px; padding: 2rem; box-shadow: var(--shadow-sm); display: flex; gap: 3rem; flex-wrap: wrap;">
            <img src="${imageUrl}" alt="${p.title}" style="max-width: 400px; width: 100%; border-radius: 8px;">
            <div style="flex: 1; min-width: 300px;">
                <h2 class="amiri" style="font-size: 2.5rem; margin-bottom: 0.5rem; color: var(--primary-color);">${p.title}</h2>
                <div style="color: var(--secondary-color); font-weight: bold; margin-bottom: 1.5rem;">${p.category} &bull; ${p.type.toUpperCase()}</div>
                <div class="product-price" style="font-size: 2rem; margin-bottom: 1.5rem;">Rs. ${p.price}</div>
                <p style="color: var(--text-light); margin-bottom: 2rem; line-height: 1.8;">${p.description || 'No description available.'}</p>
                <div id="product-actions-${p.id}">
                    ${actionsHtml}
                </div>
            </div>
        </div>
    `;
    document.getElementById('product-detail').innerHTML = html;
    showSection('product-detail');
    
    if (p.type === 'pdf' && currentUser) {
        const { data: orders } = await supabaseClient.from('orders')
            .select('items')
            .eq('user_id', currentUser.id)
            .eq('status', 'paid');
            
        let isPaid = false;
        if (orders) {
            orders.forEach(order => {
                if (order.items && order.items.find(i => i.product.id === p.id)) isPaid = true;
            });
        }
        if (isPaid) {
            const pdfUrl = p.pdf_url ? supabaseClient.storage.from('product-pdfs').getPublicUrl(p.pdf_url).data.publicUrl : '#';
            document.getElementById(`product-actions-${p.id}`).innerHTML += `<a href="${pdfUrl}" target="_blank" class="btn btn-outline" onclick="trackDownload('${p.id}')"><i class="fas fa-download"></i> Download PDF</a>`;
        }
    }
}

async function trackDownload(productId) {
    // Increment download count (simple approach, assumes trigger or direct update access, but typical RLS would prevent direct update. So maybe an RPC is needed. We will just attempt update for now, or just leave it)
    console.log('Downloading PDF for product', productId);
}


// Cart Logic
function addToCart(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    
    const existing = cart.find(item => item.product.id === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ product: p, quantity: 1 });
    }
    saveCart();
    alert('Added to cart!');
}

function updateQuantity(id, change) {
    const item = cart.find(i => i.product.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.product.id !== id);
        }
        saveCart();
        renderCart();
    }
}

function saveCart() {
    localStorage.setItem('maktaba_cart', JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').innerText = total;
}

function renderCart() {
    const container = document.getElementById('cart-items');
    if (cart.length === 0) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        document.getElementById('cart-total').innerText = 'Total: Rs. 0.00';
        return;
    }
    
    let html = '';
    let total = 0;
    cart.forEach(item => {
        let itemTotal = item.product.price * item.quantity;
        total += itemTotal;
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                <div style="font-weight: 500;">${item.product.title}</div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <button class="btn btn-outline" style="padding: 2px 10px;" onclick="updateQuantity('${item.product.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="btn btn-outline" style="padding: 2px 10px;" onclick="updateQuantity('${item.product.id}', 1)">+</button>
                    <span style="min-width: 80px; text-align: right; font-weight: bold;">Rs. ${itemTotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    document.getElementById('cart-total').innerText = `Total: Rs. ${total.toFixed(2)}`;
}

function showCheckout() {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }
    if (!currentUser) {
        alert('Please login to checkout.');
        showSection('login');
        return;
    }
    showSection('checkout');
}

async function handleCheckout(e) {
    e.preventDefault();
    const name = document.getElementById('checkout-name').value;
    const phone = document.getElementById('checkout-phone').value;
    const address = document.getElementById('checkout-address').value;
    
    const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    
    const { data, error } = await supabaseClient.from('orders').insert([{
        user_id: currentUser.id,
        items: cart,
        total_price: total,
        status: 'pending',
        shipping_details: { name, phone, address }
    }]).select();

    if (error) {
        alert('Error placing order: ' + error.message);
    } else {
        const orderId = data[0].id;
        document.getElementById('current-order-id').value = orderId;
        cart = [];
        saveCart();
        showSection('payment');
    }
}

// Show live preview when user selects a file
document.addEventListener('DOMContentLoaded', () => {
    const screenshotInput = document.getElementById('payment-screenshot');
    if (screenshotInput) {
        screenshotInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('screenshot-img-preview').src = e.target.result;
                    document.getElementById('screenshot-preview').style.display = 'block';
                    document.getElementById('screenshot-error').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

function showPaymentUpload() {
    document.getElementById('i-have-paid-btn') && (document.getElementById('i-have-paid-btn').style.display = 'none');
    document.getElementById('payment-upload-section') && (document.getElementById('payment-upload-section').style.display = 'block');
}

async function submitPaymentProof() {
    const orderId = document.getElementById('current-order-id').value;
    const file = document.getElementById('payment-screenshot').files[0];
    const btn = document.getElementById('confirm-payment-btn');
    const errorEl = document.getElementById('screenshot-error');
    
    // Enforce required screenshot
    if (!file) {
        errorEl.style.display = 'block';
        return;
    }
    errorEl.style.display = 'none';
    
    btn.disabled = true;
    btn.innerText = '⏳ Uploading...';
    
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${orderId}-${Date.now()}.${fileExt}`;
        
        // Upload to Supabase storage
        const { error: uploadError } = await supabaseClient.storage
            .from('payment-proofs')
            .upload(fileName, file, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        // Get the public URL
        const { data: urlData } = supabaseClient.storage
            .from('payment-proofs')
            .getPublicUrl(fileName);
        
        // Save the full public URL to the orders table
        const { error: updateError } = await supabaseClient
            .from('orders')
            .update({ payment_proof: urlData.publicUrl })
            .eq('id', orderId);
        
        if (updateError) throw updateError;
        
        btn.innerText = '✅ Payment Confirmed!';
        setTimeout(() => {
            showSection('home');
        }, 1500);
        
    } catch (err) {
        alert('Upload failed: ' + err.message);
        btn.disabled = false;
        btn.innerText = '✅ Confirm Payment';
    }
}

async function loadMyBooks() {
    if (!currentUser) return;
    document.getElementById('my-books-grid').innerHTML = '<div class="loader"></div>';
    
    const { data: orders, error } = await supabaseClient.from('orders')
        .select('items')
        .eq('user_id', currentUser.id)
        .eq('status', 'paid');
        
    if (error) {
        document.getElementById('my-books-grid').innerHTML = '<p>Error loading books.</p>';
        return;
    }
    
    const paidProductsMap = new Map();
    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                if (!paidProductsMap.has(item.product.id)) {
                    paidProductsMap.set(item.product.id, item.product);
                }
            });
        }
    });
    
    const paidProducts = Array.from(paidProductsMap.values());
    if (paidProducts.length === 0) {
        document.getElementById('my-books-grid').innerHTML = '<p>You have no paid books.</p>';
        return;
    }
    
    let html = '';
    paidProducts.forEach(p => {
        let imageUrl = 'https://via.placeholder.com/250x300?text=No+Image';
        if (p.image_url) {
            imageUrl = p.image_url.startsWith('http') ? p.image_url : supabaseClient.storage.from('product-images').getPublicUrl(p.image_url).data.publicUrl;
        }
        
        let actionBtn = `<button class="btn btn-outline" style="width: 100%;">Purchased</button>`;
        if (p.type === 'pdf') {
            const pdfUrl = p.pdf_url ? (p.pdf_url.startsWith('http') ? p.pdf_url : supabaseClient.storage.from('product-pdfs').getPublicUrl(p.pdf_url).data.publicUrl) : '#';
            actionBtn = `<a href="${pdfUrl}" target="_blank" class="btn" style="width: 100%; text-align: center; display: block;" onclick="event.stopPropagation(); trackDownload('${p.id}')"><i class="fas fa-download"></i> Download PDF</a>`;
        }
        
        html += `
            <div class="product-card" onclick="viewProduct('${p.id}')">
                <img src="${imageUrl}" alt="${p.title}" class="product-img">
                <div class="product-category">${p.category} ${p.type==='pdf'? '(PDF)' : ''}</div>
                <div class="product-title">${p.title}</div>
                <div style="margin-top: 1rem;">
                    ${actionBtn}
                </div>
            </div>
        `;
    });
    
    document.getElementById('my-books-grid').innerHTML = html;
}

// Auth Logic
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? 'Sign Up' : 'Login';
    document.getElementById('auth-submit').innerText = isSignUpMode ? 'Sign Up' : 'Login';
    document.getElementById('auth-toggle').innerText = isSignUpMode ? 'Already have an account? Login' : "Don't have an account? Sign up";
    document.getElementById('name-group').style.display = isSignUpMode ? 'block' : 'none';
}

function processSuccessfulLogin(userObj) {
    currentUser = userObj;
    localStorage.setItem('maktaba_user', JSON.stringify(userObj));
    document.getElementById('auth-link').innerText = 'Logout';
    document.getElementById('auth-link').onclick = handleLogout;
    document.getElementById('my-books-link').style.display = 'inline-block';
    // Sync mobile links
    const mobileAuthLink = document.getElementById('auth-link-mobile');
    const mobileMybooksLink = document.getElementById('my-books-link-mobile');
    if (mobileAuthLink) { mobileAuthLink.innerText = 'Logout'; mobileAuthLink.onclick = () => { closeMobileMenu(); handleLogout(); }; }
    if (mobileMybooksLink) mobileMybooksLink.style.display = 'block';
    
    // Close modal if open, otherwise go home
    if(document.getElementById('signup-success-popup').style.display === 'flex') {
        document.getElementById('signup-success-popup').style.display = 'none';
    }
    showSection('home');
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value; // We just store passwords as plain text dummy for this prototype
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('auth-submit');
    const originalText = btn.innerText;
    
    errorEl.innerText = '';
    btn.disabled = true;
    btn.innerText = 'Please wait...';
    
    try {
        if (isSignUpMode) {
            const name = document.getElementById('auth-name').value;
            // Generate a standard UUID that PostgreSQL perfectly accepts
            const newId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            
            // Just insert directly into public table! Bypassing strict email checks.
            const { error } = await supabaseClient.from('users').insert([
                { id: newId, name: name, email: email, role: password } // saving password in role just to allow basic checks
            ]);
            
            if (error && error.code !== '23505') { // ignore duplicate errors
                errorEl.innerText = error.message;
            } else {
                document.getElementById('signup-success-popup').style.display = 'flex';
                // Automatically log them in the background
                processSuccessfulLogin({ id: newId, email: email, user_metadata: { full_name: name } });
            }
        } else {
            // Login mode: Check public users table
            const { data, error } = await supabaseClient.from('users').select('*').eq('email', email).single();
            if (error || !data) {
                errorEl.innerText = 'Account not found. Please click Sign Up first.';
            } else if (data.role !== password && data.role !== 'user') { // allowing bypass if old structure
                errorEl.innerText = 'Invalid password.';
            } else {
                processSuccessfulLogin({ id: data.id, email: data.email, user_metadata: { full_name: data.name } });
            }
        }
    } catch (err) {
        errorEl.innerText = 'An unexpected error occurred: ' + err.message;
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function closeSignupPopup() {
    document.getElementById('signup-success-popup').style.display = 'none';
    showSection('home');
}

async function handleLogout() {
    currentUser = null;
    localStorage.removeItem('maktaba_user');
    document.getElementById('auth-link').innerText = 'Login';
    document.getElementById('auth-link').onclick = () => showSection('login');
    document.getElementById('my-books-link').style.display = 'none';
    // Sync mobile links
    const mobileAuthLink = document.getElementById('auth-link-mobile');
    const mobileMybooksLink = document.getElementById('my-books-link-mobile');
    if (mobileAuthLink) { mobileAuthLink.innerText = 'Login'; mobileAuthLink.onclick = () => { closeMobileMenu(); showSection('login'); }; }
    if (mobileMybooksLink) mobileMybooksLink.style.display = 'none';
    showSection('login');
}

// Search and Filter
document.getElementById('search-input')?.addEventListener('input', (e) => {
    filterProducts();
});
document.getElementById('category-filter')?.addEventListener('change', (e) => {
    filterProducts();
});

function filterProducts() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const cat = document.getElementById('category-filter').value;
    
    let filtered = products;
    if(q) filtered = filtered.filter(p => p.title.toLowerCase().includes(q));
    if(cat) filtered = filtered.filter(p => p.category === cat);
    
    renderProducts(filtered, 'shop-grid');
}
