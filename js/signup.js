document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const messageDiv = document.getElementById('message');
    const signupBtn = document.getElementById('signupBtn');

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
    }

    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Disable the signup button and show loading state
        signupBtn.disabled = true;
        signupBtn.textContent = 'Creating Account...';

        const formData = new FormData();
        formData.append('action', 'signup');
        formData.append('email', document.getElementById('email').value);
        formData.append('username', document.getElementById('username').value);
        formData.append('password', document.getElementById('password').value);

        console.log('Sending signup request:', {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: '***' // masked for security
        });

        fetch('login.py', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Signup response:', data);
            if (data.message === "success") {
                showMessage('Account created successfully! Redirecting to login...', 'success');
                
                // Clear the form
                signupForm.reset();
                
                // Redirect to login page after a short delay
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                signupBtn.disabled = false;
                signupBtn.textContent = 'Sign Up';
                showMessage(data.error || 'Signup failed', 'error');
            }
        })
        .catch(error => {
            console.error('Signup error:', error);
            signupBtn.disabled = false;
            signupBtn.textContent = 'Sign Up';
            showMessage(`Signup error: ${error.message}`, 'error');
        });
    });
}); 