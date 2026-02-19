// ============================================
// TOMBITO - Auth Utilities FINAL
// ============================================

class AuthUtils {

    /**
     * Esperar a que Firebase resuelva el estado de autenticación
     * CRÍTICO: auth.currentUser puede ser null al cargar la página
     */
    static waitForAuth() {
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe(); // Dejar de escuchar después del primer resultado
                resolve(user);
            });
        });
    }

    /**
     * Obtener el usuario actual completo desde Firestore
     */
    static async getCurrentUser() {
        const user = await this.waitForAuth();

        if (!user) {
            throw new Error('No hay usuario autenticado');
        }

        const userDoc = await db.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            throw new Error('Datos de usuario no encontrados en Firestore');
        }

        return {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            ...userDoc.data()
        };
    }

    /**
     * Validar sesión y retornar datos del usuario
     */
    static async validateSession() {
        try {
            const user = await this.waitForAuth();

            if (!user) {
                console.log('No hay sesión activa → redirigiendo a login');
                window.location.href = 'login.html';
                return null;
            }

            console.log('✅ Sesión activa. UID:', user.uid);

            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                console.error('❌ No existe documento en Firestore para UID:', user.uid);
                await auth.signOut();
                window.location.href = 'login.html';
                return null;
            }

            const userData = { uid: user.uid, email: user.email, ...userDoc.data() };

            if (!userData.active) {
                await auth.signOut();
                alert('Tu cuenta ha sido desactivada. Contacta al administrador.');
                window.location.href = 'login.html';
                return null;
            }

            console.log('✅ Usuario validado. Rol:', userData.role);
            return userData;

        } catch (error) {
            console.error('Error en validateSession:', error);
            window.location.href = 'login.html';
            return null;
        }
    }

    /**
     * Proteger ruta según rol requerido
     */
    static async protectRoute(requiredRole = null) {
        const userData = await this.validateSession();

        if (!userData) return null;

        if (requiredRole && userData.role !== requiredRole) {
            console.warn(`Rol incorrecto. Tiene: ${userData.role}, Necesita: ${requiredRole}`);

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
     * Verificar si es admin
     */
    static async isAdmin() {
        try {
            const userData = await this.getCurrentUser();
            return userData.role === 'admin';
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtener ventas del cliente por nombre normalizado
     */
    static async getClientSales(clientId = null) {
        try {
            const user = await this.waitForAuth();
            
            // Obtener datos del usuario
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                console.error('Usuario no encontrado');
                return [];
            }
            
            const userData = userDoc.data();
            const nombreNormalizado = userData.fullNameNormalized || userData.fullName.toLowerCase();
            
            console.log('Buscando ventas para:', nombreNormalizado);

            const snapshot = await db.collection('ventas')
                .where('clienteNombreNormalizado', '==', nombreNormalizado)
                .orderBy('fecha', 'desc')
                .get();

            const sales = [];
            snapshot.forEach(doc => {
                sales.push({ id: doc.id, ...doc.data() });
            });
            
            console.log(`✅ Encontradas ${sales.length} ventas`);
            return sales;
        } catch (error) {
            console.error('Error al obtener ventas:', error);
            return [];
        }
    }

    /**
     * Listar todos los clientes (solo admin)
     */
    static async listClients() {
        try {
            const snapshot = await db.collection('users')
                .where('role', '==', 'client')
                .get();

            const clients = [];
            snapshot.forEach(doc => {
                clients.push({ uid: doc.id, ...doc.data() });
            });
            return clients;
        } catch (error) {
            console.error('Error al listar clientes:', error);
            return [];
        }
    }

    /**
     * Activar/desactivar usuario
     */
    static async toggleUserStatus(userId, active) {
        try {
            await db.collection('users').doc(userId).update({
                active: active,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            throw error;
        }
    }

    /**
     * Cambiar rol de usuario
     */
    static async changeUserRole(userId, newRole) {
        try {
            await db.collection('users').doc(userId).update({
                role: newRole,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Error al cambiar rol:', error);
            throw error;
        }
    }

    /**
     * Cambiar contraseña
     */
    static async changePassword(currentPassword, newPassword) {
        try {
            const user = auth.currentUser;
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            return { success: true };
        } catch (error) {
            let message = 'Error al cambiar contraseña';
            if (error.code === 'auth/wrong-password') message = 'Contraseña actual incorrecta';
            if (error.code === 'auth/weak-password') message = 'La nueva contraseña es muy débil';
            throw new Error(message);
        }
    }

    /**
     * Actualizar perfil
     */
    static async updateProfile(userId, data) {
        try {
            await db.collection('users').doc(userId).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            throw error;
        }
    }

    /**
     * Cerrar sesión
     */
    static async logout() {
        try {
            await auth.signOut();
            sessionStorage.clear();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    }

    /**
     * Formatear fecha de Firestore
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

window.AuthUtils = AuthUtils;
console.log('✅ Auth Utilities TOMBITO cargadas');
