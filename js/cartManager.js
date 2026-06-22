// Centralized cart management
const CartManager = {
    // Get cart from session storage
    getCart() {
        return JSON.parse(sessionStorage.getItem('cart')) || [];
    },

    // Save cart to session storage
    saveCart(cart) {
        sessionStorage.setItem('cart', JSON.stringify(cart));
        this.updateCartCount();
        this.dispatchCartUpdate();
    },

    // Add item to cart
    addItem(productData) {
        const cart = this.getCart();
        const existingItem = cart.find(item => item.id === productData.id);
        
        if (existingItem) {
            existingItem.quantity += productData.quantity;
            existingItem.total = existingItem.quantity * existingItem.price;
        } else {
            cart.push(productData);
        }
        
        this.saveCart(cart);
    },

    // Update item quantity
    updateQuantity(itemId, change) {
        const cart = this.getCart();
        const itemIndex = cart.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            cart[itemIndex].quantity = Math.max(1, cart[itemIndex].quantity + change);
            cart[itemIndex].total = cart[itemIndex].quantity * cart[itemIndex].price;
            this.saveCart(cart);
        }
    },

    // Remove item from cart
    removeItem(itemId) {
        const cart = this.getCart();
        const updatedCart = cart.filter(item => item.id !== itemId);
        this.saveCart(updatedCart);
    },

    // Clear cart
    clearCart() {
        sessionStorage.removeItem('cart');
        this.updateCartCount();
        this.dispatchCartUpdate();
    },

    // Get total items in cart
    getTotalItems() {
        const cart = this.getCart();
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    },

    // Update cart count in UI
    updateCartCount() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = this.getTotalItems();
        }
    },

    // Dispatch custom event for cart updates
    dispatchCartUpdate() {
        window.dispatchEvent(new CustomEvent('cartUpdate', {
            detail: {
                cart: this.getCart(),
                totalItems: this.getTotalItems()
            }
        }));
    }
};

// Initialize cart count when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    CartManager.updateCartCount();
});

// Listen for storage events to sync cart across tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'cart') {
        CartManager.updateCartCount();
    }
});
