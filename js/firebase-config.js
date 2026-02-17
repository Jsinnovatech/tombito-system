// ============================================
// TOMBITO - Firebase Configuration
// ============================================

// Configuración de Firebase - PROYECTO TOMBITO
const firebaseConfig = {
    apiKey: "AIza5y85UIDAfqGEzgurbg1kZxZyXBZnF4k4ANA",
    authDomain: "tombito-aed2c.firebaseapp.com",
    projectId: "tombito-aed2c",
    storageBucket: "tombito-aed2c.firebasestorage.app",
    messagingSenderId: "42188990440",
    appId: "1:42188990440:web:601996787e2789580v2654"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias a los servicios
const auth = firebase.auth();
const db = firebase.firestore();

// Configurar persistencia de sesión
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
        console.error('Error al configurar persistencia:', error);
    });

// Roles de usuario
const USER_ROLES = {
    ADMIN: 'admin',
    CLIENT: 'client'
};

// Verificar estado de autenticación
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('Usuario autenticado:', user.email);
        
        // Verificar rol y redirigir si estamos en páginas de auth
        const currentPage = window.location.pathname;
        if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
            checkUserRoleAndRedirect(user.uid);
        }
    } else {
        console.log('No hay usuario autenticado');
        
        // Redirigir a login si no está en páginas públicas
        const publicPages = ['login.html', 'register.html', 'forgot-password.html', 'index.html'];
        const currentPage = window.location.pathname;
        const isPublicPage = publicPages.some(page => currentPage.includes(page));
        
        if (!isPublicPage && currentPage !== '/') {
            window.location.href = 'login.html';
        }
    }
});

// Función para verificar rol y redirigir
async function checkUserRoleAndRedirect(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const role = userData.role;
            
            // Redirigir según el rol
            if (role === USER_ROLES.ADMIN) {
                window.location.href = 'admin-dashboard.html';
            } else if (role === USER_ROLES.CLIENT) {
                window.location.href = 'client-dashboard.html';
            } else {
                console.error('Rol de usuario no válido');
                await auth.signOut();
            }
        } else {
            console.error('Documento de usuario no encontrado');
            await auth.signOut();
        }
    } catch (error) {
        console.error('Error al verificar rol:', error);
        showError('Error al verificar permisos de usuario');
    }
}

// Función para obtener datos del usuario actual
async function getCurrentUserData() {
    const user = auth.currentUser;
    
    if (!user) {
        throw new Error('No hay usuario autenticado');
    }
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
        throw new Error('Datos de usuario no encontrados');
    }
    
    return {
        uid: user.uid,
        email: user.email,
        ...userDoc.data()
    };
}

// Función para verificar si el usuario es admin
async function isAdmin() {
    try {
        const userData = await getCurrentUserData();
        return userData.role === USER_ROLES.ADMIN;
    } catch (error) {
        console.error('Error al verificar rol de admin:', error);
        return false;
    }
}

// Función para cerrar sesión
async function logout() {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        showError('Error al cerrar sesión');
    }
}

// Función auxiliar para mostrar errores
function showError(message) {
    // Esta función se puede sobrescribir en cada página
    console.error(message);
    alert(message);
}

// Exportar para uso global
window.firebaseApp = {
    auth,
    db,
    USER_ROLES,
    getCurrentUserData,
    isAdmin,
    logout,
    checkUserRoleAndRedirect
};

console.log('Firebase inicializado correctamente para TOMBITO');
console.log('Proyecto:', firebaseConfig.projectId);
