document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user || !user.isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }

    // Get checkout data from session storage
    const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData'));
    console.log('Checkout page - checkoutData received:', checkoutData); // Debug log

    if (!checkoutData || !checkoutData.items || checkoutData.items.length === 0) {
        console.log('Checkout page - No valid checkout data, redirecting to cart');
        window.location.href = 'cart.html';
        return;
    }

    const cartContainer = document.getElementById('cartItems');
    const totalElement = document.getElementById('total');

    // Display cart items
    checkoutData.items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <img src="Images/${item.image}" alt="${item.name}" onerror="this.src='Images/jamal hitam.png'">
            <div class="item-details">
                <h3>${item.name}</h3>
                <p>RM ${item.price.toFixed(2)} x ${item.quantity}</p>
                <p class="item-total">RM ${(item.price * item.quantity).toFixed(2)}</p>
            </div>
        `;
        cartContainer.appendChild(itemElement);
    });

    // Update total
    totalElement.textContent = `RM ${checkoutData.total.toFixed(2)}`;

    // Handle payment method selection
    const paymentOptions = document.querySelectorAll('.payment-option');
    const proceedBtn = document.getElementById('proceedBtn');
    const selectedMethodInput = document.getElementById('selectedMethod');

    paymentOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            paymentOptions.forEach(opt => opt.classList.remove('active'));
            // Add active class to selected option
            this.classList.add('active');
            // Update hidden input with selected method
            const method = this.getAttribute('data-method');
            console.log('Selected payment method:', method); // Debug log
            selectedMethodInput.value = method;
            // Enable proceed button
            proceedBtn.disabled = false;
        });
    });

    // Handle form submission
    const checkoutForm = document.getElementById('checkoutForm');
    checkoutForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Form submitted'); // Debug log

        const selectedMethod = selectedMethodInput.value;
        console.log('Selected payment method:', selectedMethod); // Debug log

        if (!selectedMethod) {
            alert('Please select a payment method');
            return;
        }

        // Store order data in session storage
        const orderData = {
            items: checkoutData.items,
            subtotal: checkoutData.subtotal,
            shipping: checkoutData.shipping,
            total: checkoutData.total,
            paymentMethod: selectedMethod,
            timestamp: new Date().toISOString()
        };
        console.log('Checkout page - storing orderData:', orderData); // Debug log
        console.log('Checkout page - items array:', orderData.items); // Debug specific items
        sessionStorage.setItem('orderData', JSON.stringify(orderData));

        // Disable proceed button and show loading state
        proceedBtn.disabled = true;
        proceedBtn.textContent = 'Processing...';

        // Determine redirect URL based on payment method
        let redirectUrl;
        switch (selectedMethod) {
            case 'credit_card':
                redirectUrl = 'payment.html';
                break;
            case 'online_banking':
                redirectUrl = 'online-banking.html';
                break;
            case 'e_wallet':
                redirectUrl = 'e-wallet.html';
                break;
            default:
                console.error('Invalid payment method:', selectedMethod);
                alert('Invalid payment method selected');
                proceedBtn.disabled = false;
                proceedBtn.textContent = 'Proceed to Payment';
                return;
        }

        console.log('Redirecting to:', redirectUrl); // Debug log

        // Add a small delay before redirecting
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 500);
    });

    // Update cart count in header
    CartManager.updateCartCount();
});
