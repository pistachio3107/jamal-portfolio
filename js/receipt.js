document.addEventListener('DOMContentLoaded', function() {
    const userData = JSON.parse(sessionStorage.getItem('user'));
    if (!userData || !userData.isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }

    const paymentData = JSON.parse(sessionStorage.getItem('paymentData'));
    console.log('Receipt page - paymentData received:', paymentData); // Debug log

    // const orderData = JSON.parse(sessionStorage.getItem('orderData'));
    // console.log('Receipt page - orderData received:', orderData); // Debug log

    const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData'));
    console.log('Receipt page - checkoutData received:', checkoutData); // Debug log

    if (!paymentData) {
        console.log('Receipt page - No payment data found, redirecting to cart');
        window.location.href = 'cart.html';
        return;
    }

    // Generate order ID
    const orderId = Date.now().toString().slice(-6);

    // Display receipt details
    document.getElementById('orderId').textContent = `#${orderId}`;
    document.getElementById('customerName').textContent = `${userData.username}`;
    document.getElementById('customerEmail').textContent = userData.email;
    document.getElementById('paymentMethod').textContent = paymentData.method.replace('_', ' ').toUpperCase();

    // Display order items
    const itemsList = document.getElementById('itemsList');
    if (!itemsList) {
        console.error('Receipt page - Could not find itemsList element');
        return;
    }

    console.log('Receipt page - Items data type:', typeof checkoutData.items);
    console.log('Receipt page - Items value:', checkoutData.items);

    if (!Array.isArray(checkoutData.items)) {
        console.error('Receipt page - Invalid items data:', checkoutData.items);
        return;
    }

    checkoutData.items.forEach(item => {
        const itemRow = document.createElement('div');
        itemRow.className = 'item-row';
        itemRow.innerHTML = `
            <div class="item-info">
                <img src="Images/${item.image}" alt="${item.name}" class="item-thumbnail" onerror="this.src='Images/jamal hitam.png'">
                <span>${item.name}</span>
            </div>
            <div>${item.quantity}</div>
            <div>RM ${item.price.toFixed(2)}</div>
            <div>RM ${(item.price * item.quantity).toFixed(2)}</div>
        `;
        itemsList.appendChild(itemRow);
    });

    // Display totals
    document.getElementById('subtotal').textContent = `RM ${checkoutData.subtotal.toFixed(2)}`;
    document.getElementById('shipping').textContent = `RM ${checkoutData.shipping.toFixed(2)}`;
    document.getElementById('total').textContent = `RM ${checkoutData.total.toFixed(2)}`;

    // Handle print receipt button
    const printButton = document.querySelector('.action-btn');
    if (printButton) {
        printButton.addEventListener('click', function() {
            window.print();
        });
    }

    // Store order in localStorage
    const order = {
        orderId: orderId,
        timestamp: new Date().toISOString(),
        items: checkoutData.items,
        subtotal: checkoutData.subtotal,
        shipping: checkoutData.shipping,
        total: checkoutData.total,
        paymentMethod: paymentData.method,
        customerName: userData.username,
        customerEmail: userData.email
    };

    // Get existing orders or initialize empty array
    const existingOrders = JSON.parse(localStorage.getItem(`orders_${userData.username}`)) || [];
    existingOrders.unshift(order); // Add new order at the beginning
    localStorage.setItem(`orders_${userData.username}`, JSON.stringify(existingOrders));

    // Update cart count in header (should be 0 at this point)
    CartManager.clearCart();

    // Clear payment data after displaying receipt
    sessionStorage.removeItem('checkoutData');
    sessionStorage.removeItem('orderData');
    sessionStorage.removeItem('paymentData');
});
