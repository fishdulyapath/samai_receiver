import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_SERVICE_API_URL;

class ImageService {
    // บันทึกรูปภาพ (ส่งทีละรูป)
    async saveDocImage(docRef, imageBase64) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            // คำนวณขนาดไฟล์ (ประมาณ)
            const sizeInBytes = Math.ceil((imageBase64.length * 3) / 4);
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
            console.log(`Uploading image: ${sizeInMB} MB`);

            const body = {
                doc_no: docRef,
                image_file: imageBase64
            };

            const response = await axios.post(
                `${API_URL}saveDocImage?provider=${provider}&dbname=${dbname}`,
                body,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60 seconds timeout
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error saving image:', error);
            console.error('Error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });

            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Failed to save image'
            };
        }
    }

    // ดึงรายการรูปภาพของเอกสาร
    async getImagesList(docRef) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const response = await axios.get(`${API_URL}getImagesList`, {
                params: {
                    provider,
                    dbname,
                    doc_no: docRef
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching images list:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch images',
                data: []
            };
        }
    }

    // ลบรูปภาพ
    async deleteDocImage(guidCode) {
        try {
            const provider = AuthService.getProviderName();
            const dbname = AuthService.getDatabaseName();

            const response = await axios.get(`${API_URL}deleteDocImage/${guidCode}`, {
                params: {
                    provider,
                    dbname
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error deleting image:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to delete image'
            };
        }
    }

    // สร้าง URL สำหรับแสดงรูป
    getImageUrl(guidCode) {
        const provider = AuthService.getProviderName();
        const dbname = AuthService.getDatabaseName();
        return `${API_URL}getDocImage/${guidCode}?provider=${provider}&dbname=${dbname}`;
    }

    // Compress รูปภาพก่อนอัปโหลด (ลดคุณภาพเพื่อลดขนาดไฟล์)
    async compressImage(file, maxWidth = 1024, quality = 0.6) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // คำนวณขนาดใหม่โดยรักษาสัดส่วน
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // แปลงเป็น base64
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

                    // เช็คขนาดไฟล์
                    const sizeInBytes = (compressedBase64.length * 3) / 4;
                    const sizeInMB = sizeInBytes / (1024 * 1024);

                    if (sizeInMB > 5) {
                        reject(new Error('Image size exceeds 5MB after compression'));
                    } else {
                        resolve(compressedBase64);
                    }
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
}

export default new ImageService();
