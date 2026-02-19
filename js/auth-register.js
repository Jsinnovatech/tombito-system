// ============================================
// TOMBITO - Register Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const registerForm = document.getElementById('registerForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');
    const registerBtn = document.getElementById('registerBtn');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    const errorMessage = document.getElementById('errorMessage');

    // Toggle mostrar/ocultar contraseña
    togglePasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility(passwordInput, togglePasswordBtn);
    });

    toggleConfirmPasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility(confirmPasswordInput, toggleConfirmPasswordBtn);
    });

    function togglePasswordVisibility(input, button) {
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        
        const icon = type === 'password' 
            ? '<path d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" fill="currentColor"/>'
            : '<path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" fill="currentColor"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" fill="currentColor"/>';
        
        button.querySelector('svg').innerHTML = icon;
    }

    // Validar contraseñas en tiempo real
    confirmPasswordInput.addEventListener('input', () => {
        validatePasswordMatch();
    });

    passwordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value) {
            validatePasswordMatch();
        }
    });

    function validatePasswordMatch() {
        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('Las contraseñas no coinciden');
            confirmPasswordInput.classList.add('error');
        } else {
            confirmPasswordInput.setCustomValidity('');
            confirmPasswordInput.classList.remove('error');
        }
    }

    // Manejar envío del formulario
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpiar mensajes anteriores
        hideError();
        
        // Obtener valores
        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const termsAccepted = termsCheckbox.checked;
        
        // Validaciones
        if (!fullName || fullName.length < 3) {
            showError('El nombre debe tener al menos 3 caracteres');
            fullNameInput.focus();
            return;
        }
        
        if (!email || !isValidEmail(email)) {
            showError('Por favor ingresa un correo válido');
            emailInput.focus();
            return;
        }
        
        if (!password || password.length < 6) {
            showError('La contraseña debe tener al menos 6 caracteres');
            passwordInput.focus();
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Las contraseñas no coinciden');
            confirmPasswordInput.focus();
            return;
        }
        
        if (!termsAccepted) {
            showError('Debes aceptar los términos y condiciones');
            return;
        }
        
        // Mostrar estado de carga
        setLoadingState(true);
        
        try {
            // Crear usuario en Firebase Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('Usuario creado:', user.uid);
            
            // Enviar email de verificación (opcional)
            await user.sendEmailVerification();
            console.log('Email de verificación enviado');
            
            // Crear documento de usuario en Firestore
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                fullName: fullName,
                fullNameNormalized: fullName.toLowerCase(), // Para búsqueda case-insensitive
                email: email,
                phone: phone || '',
                role: USER_ROLES.CLIENT, // Por defecto todos son clientes
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                active: true,
                emailVerified: false,
                profile: {
                    avatar: '',
                    address: '',
                    city: '',
                    country: 'Perú'
                },
                preferences: {
                    notifications: true,
                    emailNotifications: true
                }
            });
            
            console.log('Documento de usuario creado en Firestore');
            
            // Mostrar mensaje de éxito
            showSuccess('¡Cuenta creada exitosamente! Redirigiendo...');
            
            // Esperar 2 segundos antes de redirigir
            setTimeout(() => {
                // Redirigir al dashboard de cliente
                window.location.href = 'client-dashboard.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error en registro:', error);
            handleRegisterError(error);
            setLoadingState(false);
        }
    });

    // Función para validar email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Función para mostrar errores
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.className = 'error-message fade-in';
        errorMessage.style.display = 'flex';
    }

    // Función para mostrar éxito
    function showSuccess(message) {
        errorMessage.textContent = message;
        errorMessage.className = 'success-message fade-in';
        errorMessage.style.display = 'flex';
    }

    // Función para ocultar mensajes
    function hideError() {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }

    // Función para manejar errores de Firebase
    function handleRegisterError(error) {
        let message = 'Error al crear la cuenta';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = 'Este correo ya está registrado. Por favor inicia sesión';
                break;
            case 'auth/invalid-email':
                message = 'El correo electrónico no es válido';
                break;
            case 'auth/operation-not-allowed':
                message = 'Registro deshabilitado temporalmente';
                break;
            case 'auth/weak-password':
                message = 'La contraseña es muy débil. Usa al menos 6 caracteres';
                break;
            case 'auth/network-request-failed':
                message = 'Error de conexión. Verifica tu internet';
                break;
            default:
                message = error.message || 'Error desconocido al crear la cuenta';
        }
        
        showError(message);
    }

    // Función para establecer estado de carga
    function setLoadingState(isLoading) {
        registerBtn.disabled = isLoading;
        
        const btnText = registerBtn.querySelector('.btn-text');
        const btnLoader = registerBtn.querySelector('.btn-loader');
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
        } else {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
        
        // Deshabilitar inputs durante el proceso
        const inputs = registerForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.disabled = isLoading;
        });
    }

    // Validación de nombre en tiempo real
    fullNameInput.addEventListener('input', () => {
        const value = fullNameInput.value.trim();
        if (value.length > 0 && value.length < 3) {
            fullNameInput.classList.add('error');
        } else {
            fullNameInput.classList.remove('error');
        }
    });

    // Validación de email en tiempo real
    emailInput.addEventListener('blur', () => {
        const value = emailInput.value.trim();
        if (value && !isValidEmail(value)) {
            emailInput.classList.add('error');
            showError('El correo electrónico no es válido');
        } else {
            emailInput.classList.remove('error');
            hideError();
        }
    });

    // Validación de contraseña en tiempo real
    passwordInput.addEventListener('input', () => {
        const value = passwordInput.value;
        const hint = passwordInput.parentElement.nextElementSibling;
        
        if (value.length > 0 && value.length < 6) {
            passwordInput.classList.add('error');
            hint.style.color = 'var(--danger-color)';
        } else {
            passwordInput.classList.remove('error');
            hint.style.color = 'var(--text-secondary)';
        }
    });
});
