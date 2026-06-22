document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userData = JSON.parse(sessionStorage.getItem('user'));
    if (!userData || !userData.isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }

    // Get orders from localStorage
    const orders = JSON.parse(localStorage.getItem(`orders_${userData.username}`)) || [];
    const orderList = document.getElementById('orderList');

    if (orders.length === 0) {
        orderList.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-shopping-bag" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p>No orders found</p>
            </div>
        `;
        return;
    }

    // Sort orders by date (newest first)
    orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Display orders
    orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';

        const orderDate = new Date(order.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        orderCard.innerHTML = `
            <div class="order-header">
                <div class="order-id">Order #${order.orderId}</div>
                <div class="order-date">${orderDate}</div>
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <img src="Images/${item.image}" alt="${item.name}" class="item-image" onerror="this.src='Images/jamal hitam.png'">
                        <div class="item-name">${item.name}</div>
                        <div class="item-quantity">Quantity: ${item.quantity}</div>
                        <div class="item-price">RM ${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
            <div class="order-total">
                Total: RM ${order.total.toFixed(2)}
            </div>
        `;

        orderList.appendChild(orderCard);
    });
}); 