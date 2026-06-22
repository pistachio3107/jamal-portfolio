// Global logout function
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('cart');
        window.location.reload();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const userData = JSON.parse(sessionStorage.getItem('user'));
    const cartLink = document.getElementById('cartLink');
    const loginLink = document.getElementById('loginLink');

    // Store current page for after login
    sessionStorage.setItem('previousPage', window.location.href);

    // Update UI based on login status
    function updateUIForLoginStatus() {
        const navButtons = document.querySelector('.nav-buttons');
        
        if (userData && userData.isLoggedIn) {
            navButtons.innerHTML = `
                <a href="cart.html" class="cart-btn">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="cart-count" id="cartCount">0</span>
                </a>
                <div class="profile-dropdown">
                    <button class="profile-btn">
                        <i class="fas fa-user"></i>
                        ${userData.username}
                    </button>
                    <div class="dropdown-content">
                        <a href="profile.html">My Profile</a>
                        <a href="#" onclick="logout(); return false;">Logout</a>
                    </div>
                </div>
            `;
            CartManager.updateCartCount();
        } else {
            navButtons.innerHTML = `
                <a href="cart.html" class="cart-btn">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="cart-count" id="cartCount">0</span>
                </a>
                <a href="login.html" class="login-btn" id="loginLink">
                    <i class="fas fa-user"></i>
                    Login
                </a>
            `;
        }
    }

    // Initialize UI
    updateUIForLoginStatus();

    // Handle login/logout link
    loginLink && loginLink.addEventListener('click', function(e) {
        if (userData && userData.isLoggedIn) {
            e.preventDefault();
            logout();
        }
    });

    // Store the last viewed product before redirect
    function storeLastProduct(productData) {
        sessionStorage.setItem('lastProductAttempt', JSON.stringify(productData));
    }

    // Handle category switching
    document.querySelectorAll('.category-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(btn => 
                btn.classList.remove('active'));
            document.querySelectorAll('.category-section').forEach(section => 
                section.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(this.dataset.category).classList.add('active');
        });
    });

    // Handle add to cart button clicks
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();            const productCard = this.closest('.product-card');
            const productId = this.getAttribute('data-product-id');
            const productName = productCard.querySelector('.product-name').textContent;
            const quantity = parseInt(productCard.querySelector('.quantity-input').value);
            const price = parseFloat(productCard.querySelector('.product-price').getAttribute('data-price'));
            const image = productCard.querySelector('.product-image').getAttribute('src').split('/').pop();

            if (quantity < 1) {
                alert('Please select a valid quantity');
                return;
            }

            const productData = {
                id: productId,
                name: productName,
                quantity: quantity,
                price: price,
                total: price * quantity,
                image: image
            };

            if (!userData || !userData.isLoggedIn) {
                // Store product data and redirect to login
                storeLastProduct(productData);
                window.location.href = 'login.html';
                return;
            }

            CartManager.addItem(productData);
            alert(`Added ${quantity} ${productName} to cart`);
        });
    });

    // Handle quantity changes
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', function() {
            if (this.value < 1) this.value = 1;
        });
    });

    // Check for pending cart addition after login
    const lastProductAttempt = sessionStorage.getItem('lastProductAttempt');
    if (lastProductAttempt && userData && userData.isLoggedIn) {
        const productData = JSON.parse(lastProductAttempt);
        CartManager.addItem(productData);
        sessionStorage.removeItem('lastProductAttempt');
        alert(`Added ${productData.quantity} ${productData.name} to cart`);
    }
});