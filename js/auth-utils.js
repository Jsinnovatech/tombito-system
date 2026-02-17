// ============================================
// TOMBITO - Auth Utilities
// Funciones auxiliares para autenticación
// ============================================

// Clase de utilidades de autenticación
class AuthUtils {
    
    /**
     * Obtener el usuario actual completo
     */
    static async getCurrentUser() {
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
            emailVerified: user.emailVerified,
            ...userDoc.data()
        };
    }
    
    /**
     * Verificar si el usuario actual es admin
     */
    static async isAdmin() {
        try {
            const userData = await this.getCurrentUser();
            return userData.role === 'admin';
        } catch (error) {
            console.error('Error al verificar rol:', error);
            return false;
        }
    }
    
    /**
     * Verificar si el usuario actual es cliente
     */
    static async isClient() {
        try {
            const userData = await this.getCurrentUser();
            return userData.role === 'client';
        } catch (error) {
            console.error('Error al verificar rol:', error);
            return false;
        }
    }
    
    /**
     * Actualizar perfil del usuario
     */
    static async updateProfile(userId, data) {
        try {
            await db.collection('users').doc(userId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, message: 'Perfil actualizado' };
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            throw error;
        }
    }
    
    /**
     * Cambiar contraseña del usuario actual
     */
    static async changePassword(currentPassword, newPassword) {
        try {
            const user = auth.currentUser;
            
            // Re-autenticar usuario
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            
            await user.reauthenticateWithCredential(credential);
            
            // Cambiar contraseña
            await user.updatePassword(newPassword);
            
            return { success: true, message: 'Contraseña actualizada' };
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            
            let message = 'Error al cambiar contraseña';
            
            if (error.code === 'auth/wrong-password') {
                message = 'Contraseña actual incorrecta';
            } else if (error.code === 'auth/weak-password') {
                message = 'La nueva contraseña es muy débil';
            }
            
            throw new Error(message);
        }
    }
    
    /**
     * Obtener datos de un cliente específico
     */
    static async getClientData(clientId) {
        try {
            const userDoc = await db.collection('users').doc(clientId).get();
            
            if (!userDoc.exists) {
                throw new Error('Cliente no encontrado');
            }
            
            const userData = userDoc.data();
            
            if (userData.role !== 'client') {
                throw new Error('El usuario no es un cliente');
            }
            
            return {
                uid: clientId,
                ...userData
            };
        } catch (error) {
            console.error('Error al obtener datos del cliente:', error);
            throw error;
        }
    }
    
    /**
     * Listar todos los clientes (solo para admin)
     */
    static async listClients() {
        try {
            const isUserAdmin = await this.isAdmin();
            
            if (!isUserAdmin) {
                throw new Error('Acceso denegado: solo administradores');
            }
            
            const snapshot = await db.collection('users')
                .where('role', '==', 'client')
                .orderBy('createdAt', 'desc')
                .get();
            
            const clients = [];
            snapshot.forEach(doc => {
                clients.push({
                    uid: doc.id,
                    ...doc.data()
                });
            });
            
            return clients;
        } catch (error) {
            console.error('Error al listar clientes:', error);
            throw error;
        }
    }
    
    /**
     * Activar o desactivar usuario (solo para admin)
     */
    static async toggleUserStatus(userId, active) {
        try {
            const isUserAdmin = await this.isAdmin();
            
            if (!isUserAdmin) {
                throw new Error('Acceso denegado: solo administradores');
            }
            
            await db.collection('users').doc(userId).update({
                active: active,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { 
                success: true, 
                message: active ? 'Usuario activado' : 'Usuario desactivado' 
            };
        } catch (error) {
            console.error('Error al cambiar estado del usuario:', error);
            throw error;
        }
    }
    
    /**
     * Cambiar rol de usuario (solo para admin)
     */
    static async changeUserRole(userId, newRole) {
        try {
            const isUserAdmin = await this.isAdmin();
            
            if (!isUserAdmin) {
                throw new Error('Acceso denegado: solo administradores');
            }
            
            if (!['admin', 'client'].includes(newRole)) {
                throw new Error('Rol no válido');
            }
            
            await db.collection('users').doc(userId).update({
                role: newRole,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { success: true, message: 'Rol actualizado' };
        } catch (error) {
            console.error('Error al cambiar rol:', error);
            throw error;
        }
    }
    
    /**
     * Obtener ventas del cliente actual
     */
    static async getClientSales(clientId = null) {
        try {
            const userId = clientId || auth.currentUser.uid;
            
            const snapshot = await db.collection('ventas')
                .where('clienteId', '==', userId)
                .orderBy('fecha', 'desc')
                .get();
            
            const sales = [];
            snapshot.forEach(doc => {
                sales.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return sales;
        } catch (error) {
            console.error('Error al obtener ventas:', error);
            throw error;
        }
    }
    
    /**
     * Validar sesión y redireccionar según rol
     */
    static async validateSession() {
        const user = auth.currentUser;
        
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        try {
            const userData = await this.getCurrentUser();
            
            // Verificar si el usuario está activo
            if (!userData.active) {
                await auth.signOut();
                alert('Tu cuenta ha sido desactivada. Contacta al administrador.');
                window.location.href = 'login.html';
                return;
            }
            
            return userData;
        } catch (error) {
            console.error('Error al validar sesión:', error);
            await auth.signOut();
            window.location.href = 'login.html';
        }
    }
    
    /**
     * Proteger ruta - redirigir si no está autenticado
     */
    static async protectRoute(requiredRole = null) {
        const userData = await this.validateSession();
        
        if (requiredRole && userData.role !== requiredRole) {
            alert('No tienes permisos para acceder a esta página');
            
            // Redirigir según el rol del usuario
            if (userData.role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'client-dashboard.html';
            }
            
            return null;
        }
        
        return userData;
    }
    
    /**
     * Cerrar sesión
     */
    static async logout() {
        try {
            await auth.signOut();
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            alert('Error al cerrar sesión');
        }
    }
    
    /**
     * Formatear timestamp de Firestore a fecha legible
     */
    static formatFirestoreDate(timestamp) {
        if (!timestamp) return 'N/A';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        
        return date.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Exportar para uso global
window.AuthUtils = AuthUtils;

console.log('Auth Utilities cargadas correctamente');
