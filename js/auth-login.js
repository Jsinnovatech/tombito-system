// ============================================
// TOMBITO - Login Logic FINAL
// Consistente con login.html
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    // ============================================
    // ELEMENTOS DEL DOM (definidos en login.html)
    // ============================================
    const loginForm         = document.getElementById('loginForm');
    const emailInput        = document.getElementById('email');
    const passwordInput     = document.getElementById('password');
    const loginBtn          = document.getElementById('loginBtn');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const errorMessage      = document.getElementById('errorMessage');

    // ============================================
    // TOGGLE CONTRASEÑA
    // ============================================
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';

        const iconShow = '<path d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" fill="currentColor"/>';
        const iconHide  = '<path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" fill="currentColor"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" fill="currentColor"/>';

        togglePasswordBtn.querySelector('svg').innerHTML = isPassword ? iconHide : iconShow;
    });

    // ============================================
    // SUBMIT DEL FORMULARIO #loginForm
    // ============================================
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const email    = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError('Por favor completa todos los campos');
            return;
        }

        setLoadingState(true);

        try {
            // PASO 1: Autenticar con Firebase Auth
            console.log('🔐 Iniciando sesión con:', email);
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            console.log('✅ Autenticado. UID:', user.uid);

            // PASO 2: Buscar documento en Firestore
            console.log('📄 Buscando documento en Firestore...');
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                console.error('❌ Documento NO encontrado para UID:', user.uid);
                await auth.signOut();
                showError('Usuario no configurado en el sistema. Contacta al administrador.');
                setLoadingState(false);
                return;
            }

            // PASO 3: Leer datos y redirigir
            const userData = userDoc.data();
            console.log('✅ Documento encontrado:', userData);

            sessionStorage.setItem('userRole',  userData.role || '');
            sessionStorage.setItem('userName',  userData.fullName || '');
            sessionStorage.setItem('userEmail', userData.email || '');

            if (userData.role === USER_ROLES.ADMIN) {
                console.log('→ Admin detectado. Redirigiendo a admin-dashboard.html');
                window.location.href = 'admin-dashboard.html';

            } else if (userData.role === USER_ROLES.CLIENT) {
                console.log('→ Cliente detectado. Redirigiendo a client-dashboard.html');
                window.location.href = 'client-dashboard.html';

            } else {
                await auth.signOut();
                showError('Rol de usuario no válido. Contacta al administrador.');
                setLoadingState(false);
            }

        } catch (error) {
            console.error('❌ Error en login:', error.code, error.message);
            handleLoginError(error);
            setLoadingState(false);
        }
    });

    // ============================================
    // MANEJO DE ERRORES DE FIREBASE
    // ============================================
    function handleLoginError(error) {
        const errorMap = {
            'auth/invalid-email':          'El correo electrónico no es válido',
            'auth/user-disabled':          'Esta cuenta ha sido deshabilitada',
            'auth/user-not-found':         'No existe una cuenta con este correo',
            'auth/wrong-password':         'Contraseña incorrecta',
            'auth/invalid-credential':     'Correo o contraseña incorrectos',
            'auth/too-many-requests':      'Demasiados intentos. Espera unos minutos',
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
        };
        showError(errorMap[error.code] || error.message || 'Error desconocido');
    }

    // ============================================
    // UI HELPERS
    // ============================================
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'flex';
    }

    function hideError() {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }

    function setLoadingState(isLoading) {
        loginBtn.disabled = isLoading;
        const btnText   = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');
        if (btnText)   btnText.style.display   = isLoading ? 'none'         : 'inline';
        if (btnLoader) btnLoader.style.display = isLoading ? 'inline-block' : 'none';
    }

    // Limpiar error al escribir
    emailInput.addEventListener('input',    () => hideError());
    passwordInput.addEventListener('input', () => hideError());

});
// NOTA: NO hay auth.onAuthStateChanged aquí
// La redirección automática la maneja firebase-config.js solo en dashboards
