// Check auth status from server on page load
async function checkAuthStatus() {
    try {
        const resp = await fetch('/api/session');
        const data = await resp.json();
        window.isAuthenticated = data.authenticated;
        if (data.authenticated) {
            window.userName = data.user.full_name;
            window.userEmail = data.user.email;
        }
    } catch (e) {
        window.isAuthenticated = false;
    }
}

// Initialize auth check
checkAuthStatus();

// Logout handler
const logoutLink = document.querySelector('a[href="/api/logout"]');
if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/logout');
            const data = await response.json();
            if (data.success) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/';
        }
    });
}

const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navMenu = document.getElementById('nav-menu');
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('show');
    });
}
const searchTabs = document.querySelectorAll('.search-tab');
if (searchTabs.length > 0) {
    searchTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            searchTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
}
async function openBookingModal(destination) {
    // re-check auth from server to be sure
    await checkAuthStatus();
    if (!window.isAuthenticated) {
        window.location.href = '/login';
        return;
    }
    const modal = document.getElementById('booking-modal');
    const destinationInput = document.getElementById('booking-destination');
    
    destinationInput.value = destination;
    document.getElementById('modal-title').textContent = `Book ${destination}`;

    // if we know user info, fill and disable fields
    if (window.isAuthenticated) {
        const nameField = document.getElementById('full-name');
        const emailField = document.getElementById('email');
        if (nameField && window.userName) {
            nameField.value = window.userName;
            nameField.readOnly = true;
        }
        if (emailField && window.userEmail) {
            emailField.value = window.userEmail;
            emailField.readOnly = true;
        }
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    const modal = document.getElementById('booking-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}
window.addEventListener('click', (e) => {
    const modal = document.getElementById('booking-modal');
    if (e.target === modal) {
        closeModal();
    }
});
const bookingForm = document.getElementById('booking-form');
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const bookingMsg = document.getElementById('booking-message');
    if (bookingMsg) {
        bookingMsg.style.display = 'none';
    }

    // gather the data from the form
    const bookingData = {
        full_name: document.getElementById('full-name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        travel_date: document.getElementById('travel-date').value,
        num_pilgrims: document.getElementById('pilgrims').value
    };

    try {
        const resp = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        const json = await resp.json();

        if (resp.ok) {
            // on success navigate to thank-you page
            window.location.href = '/thanks';
        } else if (resp.status === 401) {
            // authentication required
            alert('❌ Booking failed: Authentication required. Please sign in first.');
            window.location.href = '/login';
        } else {
            if (bookingMsg) {
                bookingMsg.textContent = '❌ Booking failed: ' + (json.error || 'Please try again.');
                bookingMsg.style.display = 'block';
            } else {
                alert('❌ Booking failed: ' + (json.error || 'Please try again.'));
            }
        }
    } catch (err) {
        if (bookingMsg) {
            bookingMsg.textContent = '❌ Error submitting booking: ' + err.message;
            bookingMsg.style.display = 'block';
        } else {
            alert('❌ Error submitting booking: ' + err.message);
        }
    }
});
// contact form logic
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const resultDiv = document.getElementById('contact-result');
        resultDiv.style.display = 'none';
        const data = {
            name: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value,
            phone: document.getElementById('contact-phone').value,
            subject: document.getElementById('contact-subject').value,
            message: document.getElementById('contact-message').value
        };
        try {
            const resp = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await resp.json();
            if (resp.ok) {
                resultDiv.textContent = '✅ Thank you! Your message has been sent.';
                resultDiv.style.display = 'block';
                contactForm.reset();
            } else {
                resultDiv.textContent = '❌ ' + (json.error || 'Failed to send message');
                resultDiv.style.display = 'block';
            }
        } catch (err) {
            resultDiv.textContent = '❌ Error: ' + err.message;
            resultDiv.style.display = 'block';
        }
    });
}

// Newsletter subscription
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const email = emailInput.value;
        
        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('✅ ' + data.message);
                emailInput.value = '';
            } else {
                alert('❌ ' + (data.error || 'Subscription failed'));
            }
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    });
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') {
            // if we're already on the homepage, scroll to top
            if (window.location.pathname === '/' || window.location.pathname === '') {
                window.scrollTo({ top:0, behavior:'smooth' });
            } else {
                // otherwise navigate back to root
                window.location.href = '/';
            }
            navMenu.classList.remove('show');
            return;
        }
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 70,
                behavior: 'smooth'
            });
            navMenu.classList.remove('show');
        }
    });
});
