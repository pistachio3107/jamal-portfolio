document.addEventListener('DOMContentLoaded', function() {
    const userData = JSON.parse(sessionStorage.getItem('user'));
    if (!userData || !userData.isLoggedIn) {
        window.location.href = 'login.html';
        return;
    }

    const orderData = JSON.parse(sessionStorage.getItem('orderData'));
    console.log('Payment page - orderData received:', orderData); // Debug log

    if (!orderData) {
        console.error('No order data found');
        window.location.href = 'checkout.html';
        return;
    }

    // Display order summary
    const totalElement = document.getElementById('total');
    if (totalElement) {
        totalElement.textContent = `RM ${orderData.total.toFixed(2)}`;
    }

    // Get the payment method from the order data
    const paymentMethod = orderData.paymentMethod;
    console.log('Payment method:', paymentMethod); // Debug log
    
    // If not credit card, redirect to appropriate page
    if (paymentMethod !== 'credit_card') {
        console.log('Redirecting to appropriate payment page'); // Debug log
        switch(paymentMethod) {
            case 'online_banking':
                window.location.href = 'online-banking.html';
                break;
            case 'e_wallet':
                window.location.href = 'e-wallet.html';
                break;
            default:
                console.error('Invalid payment method:', paymentMethod); // Debug log
                window.location.href = 'checkout.html';
        }
        return;
    }

    // Show credit card form
    const creditCardForm = document.getElementById('creditCardForm');
    if (creditCardForm) {
        creditCardForm.classList.add('active');
    }

    // Format card number input
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            let formattedValue = '';
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) {
                    formattedValue += ' ';
                }
                formattedValue += value[i];
            }
            e.target.value = formattedValue;
        });
    }

    // Format expiry date input
    const expiryDateInput = document.getElementById('expiryDate');
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }

    // Handle credit card form submission
    if (creditCardForm) {
        creditCardForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Processing credit card payment...');

            const submitBtn = this.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

                // Store payment data in session storage
                const paymentData = {
                    method: 'credit_card',
                    cardNumber: cardNumberInput.value.replace(/\s/g, ''),
                    cardName: document.getElementById('cardName').value,
                    expiryDate: expiryDateInput.value,
                username: userData.username,
                email: userData.email,
                items: orderData.items || [],
                subtotal: orderData.subtotal || 0,
                shipping: orderData.shipping || 0,
                total: orderData.total || 0,
                timestamp: new Date().toISOString()
            };
            console.log('Payment page - storing paymentData:', paymentData); // Debug log
            console.log('Payment page - items array:', paymentData.items); // Debug specific items

                sessionStorage.setItem('paymentData', JSON.stringify(paymentData));

            // Simulate payment processing
            setTimeout(() => {
                window.location.href = 'receipt.html';
            }, 2000);
        });
    }

    // Update cart count in header
    CartManager.updateCartCount();
});
