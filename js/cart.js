document.addEventListener('DOMContentLoaded', function() {
    const userData = JSON.parse(sessionStorage.getItem('user'));
    const cartContent = document.getElementById('cartContent');
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
                    <a href="#" onclick="logout()">Logout</a>
                </div>
            </div>
        `;
        CartManager.updateCartCount();
    }

    // Initialize cart
    updateCart();

    function updateCart() {
        const cart = CartManager.getCart();

        // Show login message if not logged in
        if (!userData || !userData.isLoggedIn) {
            cartContent.innerHTML = `
                <div class="cart-empty">
                    <h2>Please login to view your cart</h2>
                    <p>Already have an account? <a href="login.html">Login here</a></p>
                </div>
            `;
            return;
        }

        // Show empty cart message if cart is empty
        if (cart.length === 0) {
            cartContent.innerHTML = `
                <div class="cart-empty">
                    <h2>Your cart is empty</h2>
                    <p>Go to <a href="products.html">Products</a> to start shopping!</p>
                </div>
            `;
            return;
        }

        // Show cart items
        let cartHtml = '<div class="cart-items">';
        let subtotal = 0;

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;            cartHtml += `
                <div class="cart-item">
                    <img src="Images/${item.image}" alt="${item.name}" class="item-image" onerror="this.src='Images/jamal hitam.png'">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">RM ${item.price.toFixed(2)}</div>
                    <div class="item-quantity">
                        <button class="quantity-btn decrease-btn" onclick="updateQuantity('${item.id}', -1)" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn increase-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    </div>
                    <div class="item-total">RM ${itemTotal.toFixed(2)}</div>
                    <button class="remove-btn" onclick="removeItem('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });

        cartHtml += '</div>';

        // Add cart summary
        const shipping = 10.00; // Fixed shipping cost
        const total = subtotal + shipping;

        cartHtml += `
            <div class="cart-summary">
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>RM ${subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping</span>
                    <span>RM ${shipping.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Total</span>
                    <span>RM ${total.toFixed(2)}</span>
                </div>
                <button id="checkoutBtn" class="checkout-btn" onclick="proceedToCheckout()">
                    <i class="fas fa-shopping-bag"></i> Proceed to Checkout
                </button>
            </div>
        `;

        cartContent.innerHTML = cartHtml;
    }

    // Listen for cart updates
    window.addEventListener('cartUpdate', function() {
        updateCart();
    });

    // Make functions available globally
    window.updateCart = updateCart;

    window.updateQuantity = function(itemId, change) {
        CartManager.updateQuantity(itemId, change);
        updateCart();
    };

    window.removeItem = function(itemId) {
        CartManager.removeItem(itemId);
        updateCart();
    };

    window.proceedToCheckout = function() {
        const cart = CartManager.getCart();
        const checkoutBtn = document.getElementById('checkoutBtn');
        
        if (cart.length === 0) {
            alert('Your cart is empty. Please add items before checking out.');
            return;
        }

        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = 10.00;
        const total = subtotal + shipping;

        // Store complete cart data for checkout
        const checkoutData = {
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                image: item.image,
                total: item.price * item.quantity
            })),
            subtotal: parseFloat(subtotal.toFixed(2)),
            shipping: shipping,
            total: parseFloat(total.toFixed(2)),
            timestamp: new Date().toISOString()
        };

        sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));

        setTimeout(() => {
            window.location.href = 'checkout.html';
        }, 800);
    };

    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            CartManager.clearCart();
            sessionStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    };
});
