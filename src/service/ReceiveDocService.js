import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_SERVICE_API_URL;

class ReceiveDocService {
    // ดึงรายการใบรับสินค้า
    async getReceiveDocList(search = '', fromdate = '', todate = '', page = 1, size = 20) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const response = await axios.get(`${API_URL}getReceiveDocList`, {
                params: {
                    provider,
                    dbname,
                    search,
                    fromdate,
                    todate,
                    page,
                    size
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching receive doc list:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch receive documents',
                data: [],
                total: 0,
                page: 1,
                size: 20,
                totalPages: 0
            };
        }
    }

    // ดึงรายการใบรับสินค้าตาม status
    async getReceiveDocListByStatus(search = '', fromdate = '', todate = '', status = 0, page = 1, size = 20) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const response = await axios.get(`${API_URL}getReceiveDocList`, {
                params: {
                    provider,
                    dbname,
                    search,
                    fromdate,
                    todate,
                    status,
                    page,
                    size
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching receive doc list by status:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch receive documents',
                data: [],
                total: 0,
                page: 1,
                size: 20,
                totalPages: 0
            };
        }
    }

    // ดึงรายการ SO
    async getSODocList(search = '', fromdate = '', todate = '', page = 1, size = 20) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const response = await axios.get(`${API_URL}/getSODocList`, {
                params: {
                    provider,
                    dbname,
                    search,
                    fromdate,
                    todate,
                    page,
                    size
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching PO doc list:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch PO documents',
                data: [],
                total: 0,
                page: 1,
                size: 20,
                totalPages: 0
            };
        }
    }

    // ส่งอนุมัติใบรับสินค้า
    async sendApprove(docno) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const response = await axios.get(`${API_URL}/sendApprove`, {
                params: {
                    provider,
                    dbname,
                    docno
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error sending approve:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to send approve'
            };
        }
    }

    // ปิดงานใบรับสินค้า
    async sendCloseJob(docno) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const response = await axios.get(`${API_URL}/sendCloseJob`, {
                params: {
                    provider,
                    dbname,
                    docno
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error closing job:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to close job'
            };
        }
    }

    // ลบใบรับสินค้า
    async deleteReceiveDoc(docno) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const response = await axios.get(`${API_URL}/deleteReceiveDoc`, {
                params: {
                    provider,
                    dbname,
                    docno
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error deleting receive doc:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to delete receive document'
            };
        }
    }

    // สร้างใบรับสินค้า
    async createReceiveDoc(docData) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();
            const user = AuthService.getUser();

            // Generate doc_no: RCDYYYYMMDDHIS-random 4 digits
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
            const doc_no = `RCD${year}${month}${day}${hours}${minutes}${seconds}-${random}`;

            const body = {
                doc_no: doc_no,
                doc_ref: docData.doc_ref,
                cust_code: docData.cust_code,
                sale_code: docData.sale_code || '',
                branch_code: docData.branch_code,
                user_code: user?.code || '',
                remark: docData.remark || ''
            };

            const response = await axios.post(`${API_URL}/createReceiveDoc?provider=${provider}&dbname=${dbname}`, body);

            return response.data;
        } catch (error) {
            console.error('Error creating receive doc:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to create receive document'
            };
        }
    }

    // ดึงรายละเอียดใบรับสินค้า (SO items และ received items)
    async getReceiveDocDetail(docno) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const response = await axios.get(`${API_URL}/getReceiveDocDetail`, {
                params: {
                    provider,
                    dbname,
                    docno
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching receive doc detail:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch receive document detail',
                details_so: [],
                details_receive: []
            };
        }
    }

    // ค้นหาสินค้า (รองรับการสแกน barcode)
    async getItemSearch(search) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const response = await axios.get(`${API_URL}/getItemSearch`, {
                params: {
                    provider,
                    dbname,
                    search
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error searching item:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to search item',
                data: []
            };
        }
    }

    async getBarcodeSearch(search) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const response = await axios.get(`${API_URL}/getBarcodeSearch`, {
                params: {
                    provider,
                    dbname,
                    search
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error searching item:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to search item',
                data: []
            };
        }
    }

    // บันทึกการรับสินค้า (delete -> insert)
    async updateReceiveDoc(docno, details) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const body = {
                docno: docno,
                details: details
            };

            const response = await axios.post(`${API_URL}/updateReceiveDoc?provider=${provider}&dbname=${dbname}`, body);

            return response.data;
        } catch (error) {
            console.error('Error updating receive doc:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to update receive document'
            };
        }
    }
}

export default new ReceiveDocService();
