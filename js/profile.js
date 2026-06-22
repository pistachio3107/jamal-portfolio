document.addEventListener('DOMContentLoaded', function() {
    // Initialize flatpickr for birthday
    flatpickr("#birthday", {
        dateFormat: "Y-m-d",
        theme: "dark",
        allowInput: true,
        maxDate: new Date(),
        disableMobile: false
    });

    // Get user data and validate
    const userData = JSON.parse(sessionStorage.getItem('user'));
    console.log('User data from session:', userData);

    if (!userData || !userData.isLoggedIn) {
        console.log('No user data or not logged in, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    if (!userData.username) {
        console.error('Username is missing from user data');
        alert('Session data is invalid. Please login again.');
        window.location.href = 'login.html';
        return;
    }

    // Load profile data using GET method
    console.log('Loading profile for username:', userData.username);
    
    // Create URL with parameters
    const url = `user_profile.py?action=get_profile&username=${encodeURIComponent(userData.username)}`;
    
    fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Profile data received:', data);
        if (data.status === "success" && data.data) {
            // Update form fields with profile data
            document.getElementById('username').value = data.data.username || userData.username;
            document.getElementById('email').value = data.data.email || userData.email;
            document.getElementById('name').value = data.data.name || '';
            document.getElementById('gender').value = data.data.gender || '';
            document.getElementById('birthday').value = data.data.birthday || '';
            document.getElementById('phone_number').value = data.data.phone_number || '';
            document.getElementById('address').value = data.data.address || '';

            // Update profile picture if exists
            if (data.data.profile_pic) {
                document.getElementById('profilePic').src = `data:image/jpeg;base64,${data.data.profile_pic}`;
            }
        } else {
            throw new Error(data.message || 'Failed to load profile data');
        }
    })
    .catch(error => {
        console.error('Error loading profile:', error);
        // Fallback to session data
        document.getElementById('username').value = userData.username || '';
        document.getElementById('email').value = userData.email || '';
    });

    // Handle form submission
    document.getElementById('profileForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const email = document.getElementById('email').value.trim();
        
        // Validate email
        if (!email) {
            alert('Email is required');
            return;
        }

        // Create JSON payload
        const jsonData = {
            action: 'update_profile',
            email: email,
            name: document.getElementById('name').value.trim(),
            gender: document.getElementById('gender').value.trim(),
            birthday: document.getElementById('birthday').value.trim(),
            phone_number: document.getElementById('phone_number').value.trim(),
            address: document.getElementById('address').value.trim()
        };

        // Show loading state
        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        // Send JSON data
        fetch('user_profile.py', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData)
        })
        .then(response => {
            console.log('Profile update response:', response);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            console.log('Raw response text:', text);
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse response:', text);
                throw new Error('Invalid response from server');
            }
        })
        .then(data => {
            console.log('Parsed response data:', data);
            if (data && data.status === "success") {
                // Update session storage with new data
                const userData = JSON.parse(sessionStorage.getItem('user'));
                userData.email = email;
                sessionStorage.setItem('user', JSON.stringify(userData));
                
                alert('Profile updated successfully!');
                window.location.reload();
            } else {
                throw new Error(data?.message || 'Failed to update profile');
            }
        })
        .catch(error => {
            console.error('Profile update error:', error);
            alert(`Failed to update profile: ${error.message}`);
        })
        .finally(() => {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    });

    // Handle profile picture change
    document.querySelector('.change-pic-btn').addEventListener('click', function() {
        document.getElementById('picInput').click();
    });

    document.getElementById('picInput').addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('profilePic').src = e.target.result;
                
                // Get the base64 string without the data URL prefix
                const base64String = e.target.result.split(',')[1];
                
                // Create JSON payload for image update
                const jsonData = {
                    action: 'update_profile_pic',
                    email: document.getElementById('email').value.trim(),
                    profile_pic: base64String
                };

                // Send image to server
                fetch('user_profile.py', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(jsonData)
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.status === "success") {
                        console.log('Profile picture updated successfully');
                    } else {
                        throw new Error(data.message || 'Failed to update profile picture');
                    }
                })
                .catch(error => {
                    console.error('Error updating profile picture:', error);
                    alert('Failed to update profile picture. Please try again.');
                });
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Handle logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            sessionStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    });
});