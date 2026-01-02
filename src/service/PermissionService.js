import AuthService from './AuthService';

/**
 * Permission Service
 * จัดการ API สำหรับระบบสิทธิ์ผู้ใช้
 */
export default class PermissionService {
    /**
     * ดึงข้อมูลสิทธิ์ทั้งหมด (สำหรับจัดการ)
     * @param {string} search - คำค้นหา (optional)
     * @returns {Promise<Object>}
     */
    static async getPermissions(search = '') {
        try {
            const baseUrl = import.meta.env.VITE_SERVICE_API_URL;
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const params = new URLSearchParams({
                provider,
                dbname,
                search
            });

            const url = `${baseUrl}getPermission?${params.toString()}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return {
                    success: true,
                    data: result.data || []
                };
            } else {
                return {
                    success: false,
                    message: 'Failed to fetch permissions'
                };
            }
        } catch (error) {
            console.error('Get permissions error:', error);
            return {
                success: false,
                message: error.message || 'An error occurred while fetching permissions'
            };
        }
    }

    /**
     * อัพเดทสิทธิ์ผู้ใช้
     * @param {Object} permissionData - ข้อมูลสิทธิ์
     * @param {string} permissionData.user - รหัสผู้ใช้
     * @param {string} permissionData.receive_screen - สิทธิ์หน้ารับเอกสาร (0/1)
     * @param {string} permissionData.admin_screen - สิทธิ์หน้าจัดการระบบ (0/1)
     * @param {string} permissionData.history_screen - สิทธิ์หน้าประวัติ (0/1)
     * @returns {Promise<Object>}
     */
    static async updatePermission(permissionData) {
        try {
            const baseUrl = import.meta.env.VITE_SERVICE_API_URL;
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const params = new URLSearchParams({
                provider,
                dbname,
                user: permissionData.user,
                receive_screen: permissionData.receive_screen,
                admin_screen: permissionData.admin_screen,
                history_screen: permissionData.history_screen
            });

            const url = `${baseUrl}upDatePermission?${params.toString()}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                return {
                    success: true,
                    message: 'Permission updated successfully'
                };
            } else {
                return {
                    success: false,
                    message: 'Failed to update permission'
                };
            }
        } catch (error) {
            console.error('Update permission error:', error);
            return {
                success: false,
                message: error.message || 'An error occurred while updating permission'
            };
        }
    }
}
