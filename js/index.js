document.addEventListener('DOMContentLoaded', function() {
    const userData = JSON.parse(sessionStorage.getItem('user'));
    const navButtons = document.querySelector('.nav-buttons');

    // Update navigation based on login status
    if (userData && userData.isLoggedIn) {
        navButtons.innerHTML = `
            <a href="cart.html" class="cart-btn" id="cartLink">
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
    } else {
        navButtons.innerHTML = `
            <a href="cart.html" class="cart-btn" id="cartLink">
                <i class="fas fa-shopping-cart"></i>
                <span class="cart-count" id="cartCount">0</span>
            </a>
            <a href="login.html" class="login-btn" id="loginLink">
                <i class="fas fa-user"></i>
                Login
            </a>
        `;
    }

    // Initialize cart count
    CartManager.updateCartCount();

    // Handle logout
    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            CartManager.clearCart();
            sessionStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    };

    // Listen for cart updates
    window.addEventListener('cartUpdate', function() {
        CartManager.updateCartCount();
    });
});
