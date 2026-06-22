document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('username', document.getElementById('username').value);
        formData.append('password', document.getElementById('password').value);

        fetch('login.py', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Login response:', data); // Debug log
            if (data.message == "success") {
                // Store complete user data in session storage
                const userData = {
                    username: data.username,
                    email: data.email,
                    isLoggedIn: true
                };
                console.log('Storing user data:', userData); // Debug log
                sessionStorage.setItem('user', JSON.stringify(userData));
                window.location.href = 'index.html';
            } else {
                console.error('Login failed:', data.message); // Debug log
                alert(data.message || 'Login failed');
            }
        })
        .catch(error => {
            console.error('Login error details:', {
                message: error.message,
                stack: error.stack
            });
            alert(`Login error: ${error.message}`);
        });
    });
});