document.addEventListener('DOMContentLoaded', () => {
    const services = [
        { name: "Regular", price: 4.50 },
        { name: "Doble cero", price: 5.00 },
        { name: "Navaja", price: 6.00 },
        { name: "Barba", price: 3.00 },
        { name: "Diseños", price: 3.00 },
        { name: "Líneas", price: 1.00 },
        { name: "Cejas", price: 1.00 },
        { name: "Lavado", price: 1.50 },
        { name: "Faciales", price: 8.00 }
    ];

    const operatingHours = {
        // 0: Sunday, 1: Monday, ..., 6: Saturday
        0: { start: 9, end: 16 }, // Sunday 9 AM to 4 PM
        1: { start: 9, end: 20 }, // Monday 9 AM to 8 PM
        2: { start: 9, end: 20 },
        3: { start: 9, end: 20 },
        4: { start: 9, end: 20 },
        5: { start: 9, end: 20 },
        6: { start: 9, end: 20 }  // Saturday 9 AM to 8 PM
    };

    const adminCredentials = {
        email: "newyorkstyles25@gmail.com",
        password: "daniel123"
    };

    let bookedAppointments = JSON.parse(localStorage.getItem('bookedAppointments_nys') || '[]');
    let selectedTimeSlot = null;

    const dateInput = document.getElementById('date');
    const timeSlotsContainer = document.getElementById('time-slots-container');
    const servicesContainer = document.getElementById('services-container');
    const totalPriceEl = document.getElementById('total-price');
    const bookingForm = document.getElementById('booking-form');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const bookingMessageEl = document.getElementById('booking-message');

    const adminLoginSection = document.getElementById('admin-login-section');
    const adminPanelSection = document.getElementById('admin-panel-section');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminEmailInput = document.getElementById('admin-email');
    const adminPasswordInput = document.getElementById('admin-password');
    const adminLoginMessageEl = document.getElementById('admin-login-message');
    const adminAppointmentsListEl = document.getElementById('admin-appointments-list');
    const showAdminLoginLink = document.getElementById('show-admin-login-link');
    const adminLogoutButton = document.getElementById('admin-logout-button');
    
    const bookingSection = document.getElementById('booking-section');


    function init() {
        renderServices();
        setMinDate();
        attachEventListeners();
        checkAdminLogin();
    }

    function setMinDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.min = `${yyyy}-${mm}-${dd}`;
    }

    function renderServices() {
        servicesContainer.innerHTML = '';
        services.forEach(service => {
            const div = document.createElement('div');
            div.classList.add('service-item');
            const checkboxId = `service-${service.name.toLowerCase().replace(/\s+/g, '-')}`;
            div.innerHTML = `
                <input type="checkbox" id="${checkboxId}" name="services" value="${service.name}">
                <label for="${checkboxId}">${service.name} ($${service.price.toFixed(2)})</label>
            `;
            servicesContainer.appendChild(div);
        });

        servicesContainer.addEventListener('change', updateTotalPrice);
    }

    function updateTotalPrice() {
        let total = 0;
        const selectedServiceCheckboxes = servicesContainer.querySelectorAll('input[type="checkbox"]:checked');
        selectedServiceCheckboxes.forEach(checkbox => {
            const service = services.find(s => s.name === checkbox.value);
            if (service) {
                total += service.price;
            }
        });
        totalPriceEl.textContent = total.toFixed(2);
    }

    function generateTimeSlots() {
        const selectedDateStr = dateInput.value;
        if (!selectedDateStr) {
            timeSlotsContainer.innerHTML = '<p>Selecciona una fecha para ver horarios disponibles.</p>';
            return;
        }

        const selectedDate = new Date(selectedDateStr + 'T00:00:00'); // Ensure local timezone
        const dayOfWeek = selectedDate.getDay();
        const hours = operatingHours[dayOfWeek];

        timeSlotsContainer.innerHTML = '';
        selectedTimeSlot = null; // Reset selected time slot

        if (!hours) {
            timeSlotsContainer.innerHTML = '<p>La barbería está cerrada en la fecha seleccionada.</p>';
            return;
        }

        for (let hour = hours.start; hour < hours.end; hour++) {
            const timeStr = `${String(hour).padStart(2, '0')}:00`;
            const slotEl = document.createElement('div');
            slotEl.classList.add('time-slot');
            slotEl.textContent = `${timeStr} - ${String(hour + 1).padStart(2, '0')}:00`;
            slotEl.dataset.time = timeStr;

            const isBooked = bookedAppointments.some(apt => apt.date === selectedDateStr && apt.time === timeStr);
            if (isBooked) {
                slotEl.classList.add('booked');
                slotEl.title = "Hora no disponible";
            } else {
                slotEl.addEventListener('click', () => {
                    if (selectedTimeSlot) {
                        selectedTimeSlot.classList.remove('selected');
                    }
                    slotEl.classList.add('selected');
                    selectedTimeSlot = slotEl;
                });
            }
            timeSlotsContainer.appendChild(slotEl);
        }
        if (timeSlotsContainer.children.length === 0) {
             timeSlotsContainer.innerHTML = '<p>No hay horarios disponibles para esta fecha o la barbería está cerrada.</p>';
        }
    }
    
    function handleBookingSubmit(event) {
        event.preventDefault();
        bookingMessageEl.textContent = '';
        bookingMessageEl.className = 'message';

        const date = dateInput.value;
        const time = selectedTimeSlot ? selectedTimeSlot.dataset.time : null;
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const selectedServiceNodes = Array.from(servicesContainer.querySelectorAll('input[type="checkbox"]:checked'));
        const selectedServiceNames = selectedServiceNodes.map(node => node.value);
        
        if (!date || !time || !name || !phone || selectedServiceNames.length === 0) {
            setBookingMessage('Por favor, completa todos los campos y selecciona al menos un servicio y un horario.', 'error');
            return;
        }

        if (!/^[0-9]{4}-[0-9]{4}$/.test(phone)) {
            setBookingMessage('Número de teléfono inválido. Formato: 0000-0000.', 'error');
            return;
        }

        const isAlreadyBooked = bookedAppointments.some(apt => apt.date === date && apt.time === time);
        if (isAlreadyBooked) {
            setBookingMessage('Lo siento, esa hora ya fue reservada, puedes elegir entre más opciones.', 'error');
            generateTimeSlots(); // Refresh slots to show it's booked
            return;
        }

        const total = parseFloat(totalPriceEl.textContent);

        const appointment = {
            id: Date.now().toString(), // Simple unique ID
            date,
            time,
            name,
            phone,
            services: selectedServiceNames,
            totalPrice: total
        };

        bookedAppointments.push(appointment);
        localStorage.setItem('bookedAppointments_nys', JSON.stringify(bookedAppointments));

        // Simulate email confirmation
        const subject = `Nueva Reserva - ${name} - ${date} ${time}`;
        const serviceListText = selectedServiceNames.join(', ');
        const body = `Nueva reserva de cita:\n\nNombre: ${name}\nTeléfono: ${phone}\nFecha: ${date}\nHora: ${time}\nServicios: ${serviceListText}\nTotal: $${total.toFixed(2)}`;
        const mailtoLink = `mailto:newyorkstyles25@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        // For demo, we can open the mailto link. For production, an Email API (e.g. EmailJS) or backend is needed.
        // window.open(mailtoLink, '_blank');
        console.log("Simulating email sending to newyorkstyles25@gmail.com with details:", appointment);


        setBookingMessage(`¡Gracias ${name}! Tu cita para el ${date} a las ${time} ha sido reservada. Se ha enviado un correo de confirmación (simulado).`, 'success');
        bookingForm.reset();
        totalPriceEl.textContent = '0.00';
        selectedTimeSlot = null;
        generateTimeSlots(); // Refresh time slots
        if (isAdminLoggedIn()) renderAdminAppointments(); // Update admin panel if open
    }

    function setBookingMessage(message, type) {
        bookingMessageEl.textContent = message;
        bookingMessageEl.className = 'message'; // Reset classes
        if (type) {
            bookingMessageEl.classList.add(type);
        }
    }

    // Admin Panel Logic
    function checkAdminLogin() {
        if (isAdminLoggedIn()) {
            showAdminPanel();
        } else {
            hideAdminPanel(); // This will also hide admin login form initially
        }
    }

    function isAdminLoggedIn() {
        return localStorage.getItem('nys_admin_logged_in') === 'true';
    }

    function handleAdminLogin(event) {
        event.preventDefault();
        adminLoginMessageEl.textContent = '';
        adminLoginMessageEl.className = 'message'; // Reset message style
        const email = adminEmailInput.value;
        const password = adminPasswordInput.value;

        if (email === adminCredentials.email && password === adminCredentials.password) {
            localStorage.setItem('nys_admin_logged_in', 'true');
            showAdminPanel();
            adminLoginForm.reset(); 
            adminLoginSection.style.display = 'none'; 
            bookingSection.style.display = 'none'; // Hide booking form when admin panel is active
            showAdminLoginLink.style.display = 'none'; 
        } else {
            adminLoginMessageEl.textContent = 'Correo o contraseña incorrectos.';
            adminLoginMessageEl.classList.add('error');
        }
    }

    function handleAdminLogout() {
        localStorage.removeItem('nys_admin_logged_in');
        hideAdminPanel(); // This also shows the booking section
        adminLoginSection.style.display = 'none'; // Ensure login form is hidden after logout
        showAdminLoginLink.style.display = 'block'; 
        adminEmailInput.value = ''; // Clear admin form fields on logout for security
        adminPasswordInput.value = '';
        adminLoginMessageEl.textContent = ''; // Clear any previous login messages
        adminLoginMessageEl.className = 'message';
    }

    function showAdminPanel() {
        adminLoginSection.style.display = 'none';
        bookingSection.style.display = 'none'; 
        adminPanelSection.style.display = 'block';
        showAdminLoginLink.style.display = 'none';
        renderAdminAppointments();
    }

    function hideAdminPanel() {
        adminPanelSection.style.display = 'none';
        bookingSection.style.display = 'block'; 
        // adminLoginSection should remain hidden unless explicitly shown by toggleAdminLoginView
        adminLoginSection.style.display = 'none';
        showAdminLoginLink.style.display = 'block'; 
    }
    
    function toggleAdminLoginView() {
        // If admin panel is visible, or admin is logged in, clicking the link should ideally not show login form
        // However, the link itself is hidden when admin is logged in or panel is shown.
        // So, this toggle is primarily for showing/hiding the login form when not logged in.

        if (adminLoginSection.style.display === 'none' || adminLoginSection.style.display === '') {
            adminLoginSection.style.display = 'block';
            bookingSection.style.display = 'none'; 
            adminPanelSection.style.display = 'none'; 
            adminEmailInput.focus(); // Focus on email input when shown
        } else {
            adminLoginSection.style.display = 'none';
            bookingSection.style.display = 'block';
        }
        adminLoginMessageEl.textContent = ''; // Clear message when toggling
        adminLoginMessageEl.className = 'message';
    }


    function renderAdminAppointments() {
        adminAppointmentsListEl.innerHTML = '';
        if (bookedAppointments.length === 0) {
            adminAppointmentsListEl.innerHTML = '<p>No hay citas agendadas.</p>';
            return;
        }

        const sortedAppointments = [...bookedAppointments].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });

        sortedAppointments.forEach(apt => {
            const item = document.createElement('div');
            item.classList.add('appointment-item');
            item.innerHTML = `
                <div>
                    <p><strong>Fecha:</strong> ${apt.date} <strong>Hora:</strong> ${apt.time}</p>
                    <p><strong>Cliente:</strong> ${apt.name} (Tel: ${apt.phone})</p>
                    <p><strong>Servicios:</strong> ${apt.services.join(', ')}</p>
                    <p><strong>Total:</strong> $${apt.totalPrice.toFixed(2)}</p>
                </div>
                <button class="cancel-btn" data-id="${apt.id}">Cancelar Cita</button>
            `;
            item.querySelector('.cancel-btn').addEventListener('click', () => cancelAppointment(apt.id));
            adminAppointmentsListEl.appendChild(item);
        });
    }

    function cancelAppointment(appointmentId) {
        bookedAppointments = bookedAppointments.filter(apt => apt.id !== appointmentId);
        localStorage.setItem('bookedAppointments_nys', JSON.stringify(bookedAppointments));
        renderAdminAppointments();
        generateTimeSlots(); // Refresh user-side time slots
        // Provide feedback, but only relevant if booking page might be visible (less likely here)
        // setBookingMessage('Cita cancelada por el administrador.', 'success'); 
        // More direct feedback for admin might be good if the admin panel itself could show messages.
        // For now, the list simply updates.
    }

    function attachEventListeners() {
        dateInput.addEventListener('change', generateTimeSlots);
        bookingForm.addEventListener('submit', handleBookingSubmit);
        adminLoginForm.addEventListener('submit', handleAdminLogin);
        showAdminLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAdminLoginView();
        });
        adminLogoutButton.addEventListener('click', handleAdminLogout);
    }

    init();
});