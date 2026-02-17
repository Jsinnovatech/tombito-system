// ============================================
// TOMBITO - Forgot Password Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const resetBtn = document.getElementById('resetBtn');
    const messageDiv = document.getElementById('message');

    // Manejar envío del formulario
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpiar mensajes anteriores
        hideMessage();
        
        // Obtener email
        const email = emailInput.value.trim();
        
        // Validación básica
        if (!email || !isValidEmail(email)) {
            showError('Por favor ingresa un correo válido');
            emailInput.focus();
            return;
        }
        
        // Mostrar estado de carga
        setLoadingState(true);
        
        try {
            // Enviar email de recuperación
            await auth.sendPasswordResetEmail(email, {
                url: window.location.origin + '/login.html',
                handleCodeInApp: false
            });
            
            console.log('Email de recuperación enviado a:', email);
            
            // Mostrar mensaje de éxito
            showSuccess(
                `¡Listo! Si existe una cuenta con ${email}, recibirás un correo con instrucciones para restablecer tu contraseña. 
                Revisa tu bandeja de entrada y la carpeta de spam.`
            );
            
            // Limpiar formulario
            emailInput.value = '';
            emailInput.disabled = true;
            
            // Cambiar texto del botón
            const btnText = resetBtn.querySelector('.btn-text');
            btnText.textContent = '✓ Correo Enviado';
            resetBtn.disabled = true;
            
            // Redireccionar a login después de 5 segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 5000);
            
        } catch (error) {
            console.error('Error al enviar email de recuperación:', error);
            handleResetError(error);
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
        messageDiv.textContent = message;
        messageDiv.className = 'error-message fade-in';
        messageDiv.style.display = 'flex';
    }

    // Función para mostrar éxito
    function showSuccess(message) {
        messageDiv.textContent = message;
        messageDiv.className = 'success-message fade-in';
        messageDiv.style.display = 'flex';
    }

    // Función para ocultar mensajes
    function hideMessage() {
        messageDiv.style.display = 'none';
        messageDiv.textContent = '';
    }

    // Función para manejar errores de Firebase
    function handleResetError(error) {
        let message = 'Error al enviar el correo de recuperación';
        
        switch (error.code) {
            case 'auth/invalid-email':
                message = 'El correo electrónico no es válido';
                break;
            case 'auth/user-not-found':
                // Por seguridad, no revelar que el usuario no existe
                message = 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña';
                break;
            case 'auth/too-many-requests':
                message = 'Demasiados intentos. Por favor espera unos minutos';
                break;
            case 'auth/network-request-failed':
                message = 'Error de conexión. Verifica tu internet';
                break;
            default:
                message = error.message || 'Error desconocido';
        }
        
        showError(message);
    }

    // Función para establecer estado de carga
    function setLoadingState(isLoading) {
        resetBtn.disabled = isLoading;
        emailInput.disabled = isLoading;
        
        const btnText = resetBtn.querySelector('.btn-text');
        const btnLoader = resetBtn.querySelector('.btn-loader');
        
        if (isLoading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
        } else {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
        }
    }

    // Validación de email en tiempo real
    emailInput.addEventListener('blur', () => {
        const value = emailInput.value.trim();
        if (value && !isValidEmail(value)) {
            emailInput.classList.add('error');
        } else {
            emailInput.classList.remove('error');
        }
    });

    emailInput.addEventListener('input', () => {
        emailInput.classList.remove('error');
        hideMessage();
    });
});
