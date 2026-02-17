// ============================================
// TOMBITO - Firebase Configuration FINAL
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyBSUID4fqoEzqurbpikZxZyKBZnF4kA4NA",
    authDomain: "tombito-aed2c.firebaseapp.com",
    projectId: "tombito-aed2c",
    storageBucket: "tombito-aed2c.firebasestorage.app",
    messagingSenderId: "42188990440",
    appId: "1:42188990440:web:601996787e2789589c265d"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias globales a los servicios
const auth = firebase.auth();
const db = firebase.firestore();

// Roles disponibles
const USER_ROLES = {
    ADMIN: 'admin',
    CLIENT: 'client'
};

// Persistencia de sesión LOCAL (sobrevive al cerrar el navegador)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => console.error('Error persistencia:', error));

// ============================================
// FUNCIÓN GLOBAL: Buscar usuario y redirigir
// Usada por dashboards para proteger rutas
// ============================================
async function checkUserRoleAndRedirect(userId) {
    try {
        console.log('🔍 Buscando usuario en Firestore. UID:', userId);
        const userDoc = await db.collection('users').doc(userId).get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log('✅ Usuario encontrado. Rol:', userData.role);

            if (userData.role === USER_ROLES.ADMIN) {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'client-dashboard.html';
            }
        } else {
            console.error('❌ No existe documento para UID:', userId);
            await auth.signOut();
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error en checkUserRoleAndRedirect:', error);
        await auth.signOut();
        window.location.href = 'login.html';
    }
}

// ============================================
// PROTECCIÓN DE RUTAS para dashboards
// Solo se activa en páginas protegidas
// ============================================
const currentPath = window.location.pathname;
const isProtectedPage = currentPath.includes('admin-dashboard') || 
                        currentPath.includes('client-dashboard');

if (isProtectedPage) {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            console.log('No autenticado. Redirigiendo a login...');
            window.location.href = 'login.html';
        } else {
            console.log('✅ Usuario autenticado en página protegida:', user.email);
        }
    });
}

console.log('✅ Firebase TOMBITO inicializado. Proyecto:', firebaseConfig.projectId);
