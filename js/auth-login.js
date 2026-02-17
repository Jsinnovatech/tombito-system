// ============================================
// TOMBITO - Login Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const errorMessage = document.getElementById('errorMessage');

    // Toggle mostrar/ocultar contraseña
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        
        // Cambiar ícono
        const icon = type === 'password' 
            ? '<path d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" fill="currentColor"/>'
            : '<path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" fill="currentColor"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" fill="currentColor"/>';
        
        togglePasswordBtn.querySelector('svg').innerHTML = icon;
    });

    // Manejar envío del formulario
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpiar mensajes anteriores
        hideError();
        
        // Obtener valores
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Validación básica
        if (!email || !password) {
            showError('Por favor completa todos los campos');
            return;
        }
        
        // Mostrar estado de carga
        setLoadingState(true);
        
        try {
            // Intentar iniciar sesión con Firebase
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('Login exitoso:', user.email);
            
            // Verificar si el email está verificado (opcional)
            if (!user.emailVerified) {
                console.warn('Email no verificado');
                // Puedes decidir si permitir o no el acceso
            }
            
            // Obtener datos del usuario desde Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                throw new Error('Datos de usuario no encontrados');
            }
            
            const userData = userDoc.data();
            const userRole = userData.role;
            
            // Guardar información de sesión
            sessionStorage.setItem('userRole', userRole);
            sessionStorage.setItem('userName', userData.fullName);
            
            // Redirigir según el rol
            if (userRole === USER_ROLES.ADMIN) {
                window.location.href = 'admin-dashboard.html';
            } else if (userRole === USER_ROLES.CLIENT) {
                window.location.href = 'client-dashboard.html';
            } else {
                throw new Error('Rol de usuario no válido');
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            handleLoginError(error);
            setLoadingState(false);
        }
    });

    // Función para mostrar errores
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'flex';
        errorMessage.classList.add('fade-in');
    }

    // Función para ocultar errores
    function hideError() {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }

    // Función para manejar errores de Firebase
    function handleLoginError(error) {
        let message = 'Error al iniciar sesión';
        
        switch (error.code) {
            case 'auth/invalid-email':
                message = 'El correo electrónico no es válido';
                break;
            case 'auth/user-disabled':
                message = 'Esta cuenta ha sido deshabilitada';
                break;
            case 'auth/user-not-found':
                message = 'No existe una cuenta con este correo';
                break;
            case 'auth/wrong-password':
                message = 'Contraseña incorrecta';
                break;
            case 'auth/invalid-credential':
                message = 'Credenciales inválidas. Verifica tu correo y contraseña';
                break;
            case 'auth/too-many-requests':
                message = 'Demasiados intentos. Intenta más tarde';
                break;
            case 'auth/network-request-failed':
                message = 'Error de conexión. Verifica tu internet';
                break;
            default:
                message = error.message || 'Error desconocido al iniciar sesión';
        }
        
        showError(message);
        
        // Agregar clase de error a los inputs
        emailInput.classList.add('error');
        passwordInput.classList.add('error');
        
        // Remover clase después de 3 segundos
        setTimeout(() => {
            emailInput.classList.remove('error');
            passwordInput.classList.remove('error');
        }, 3000);
    }

    // Función para establecer estado de carga
    function setLoadingState(isLoading) {
        loginBtn.disabled = isLoading;
        
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
        } else {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }

    // Validación en tiempo real
    emailInput.addEventListener('input', () => {
        if (emailInput.value.trim()) {
            emailInput.classList.remove('error');
        }
    });

    passwordInput.addEventListener('input', () => {
        if (passwordInput.value) {
            passwordInput.classList.remove('error');
        }
    });

    // Verificar si ya hay un usuario logueado
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('Usuario ya autenticado, redirigiendo...');
            checkUserRoleAndRedirect(user.uid);
        }
    });
});

// Función de respaldo para manejar redirección
function handleRedirect(role) {
    if (role === 'admin') {
        window.location.href = 'admin-dashboard.html';
    } else if (role === 'client') {
        window.location.href = 'client-dashboard.html';
    }
}
