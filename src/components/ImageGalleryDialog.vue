<script setup>
import { ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import ImageService from '@/service/ImageService';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    docRef: {
        type: String,
        required: true
    },
    docName: {
        type: String,
        default: ''
    },
    readOnly: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:visible', 'images-updated']);

const toast = useToast();
const confirm = useConfirm();

const images = ref([]);
const loading = ref(false);
const uploading = ref(false);
const fileInput = ref(null);
const previewImage = ref(null);
const showPreview = ref(false);
const useCamera = ref(true);
const imageLoadingStates = ref({});
const imageErrorStates = ref({});

// โหลดรายการรูปภาพ
async function loadImages() {
    loading.value = true;
    try {
        const result = await ImageService.getImagesList(props.docRef);
        if (result.success) {
            images.value = result.data || [];
        } else {
            // ถ้าไม่มีรูปหรือ error จาก backend ก็ไม่แสดง error toast
            // แค่ให้แสดง empty state ปกติ
            images.value = [];
            console.log('No images found or error from backend:', result.message);
        }
    } catch (error) {
        // ไม่แสดง error toast เพราะอาจเป็นเอกสารที่ยังไม่มีรูป
        images.value = [];
        console.log('Error loading images (possibly no images yet):', error.message);
    } finally {
        loading.value = false;
    }
}

// เปิดกล้อง/เลือกไฟล์
function openCamera(camera = true) {
    useCamera.value = camera;
    fileInput.value.click();
}

// จัดการไฟล์ที่เลือก
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // เช็คประเภทไฟล์
    if (!file.type.startsWith('image/')) {
        toast.add({
            severity: 'warn',
            summary: 'คำเตือน',
            detail: 'กรุณาเลือกไฟล์รูปภาพ',
            life: 3000
        });
        return;
    }

    uploading.value = true;

    try {
        // Compress รูปภาพ
        const compressedBase64 = await ImageService.compressImage(file);

        // อัปโหลดรูปภาพ
        const result = await ImageService.saveDocImage(props.docRef, compressedBase64);

        if (result.success) {
            toast.add({
                severity: 'success',
                summary: 'สำเร็จ',
                detail: 'อัปโหลดรูปภาพสำเร็จ',
                life: 3000
            });

            // โหลดรายการรูปใหม่
            await loadImages();
            emit('images-updated');
        } else {
            toast.add({
                severity: 'error',
                summary: 'ผิดพลาด',
                detail: result.message || 'ไม่สามารถอัปโหลดรูปภาพได้',
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        toast.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: error.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
            life: 3000
        });
    } finally {
        uploading.value = false;
        // Reset file input
        event.target.value = '';
    }
}

// ลบรูปภาพ
function confirmDelete(image) {
    confirm.require({
        message: 'ต้องการลบรูปภาพนี้หรือไม่?',
        header: 'ยืนยันการลบ',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'ลบ',
        rejectLabel: 'ยกเลิก',
        acceptClass: 'p-button-danger',
        rejectClass: 'p-button-secondary p-button-outlined',
        accept: () => handleDelete(image.guid_code)
    });
}

async function handleDelete(guidCode) {
    loading.value = true;
    try {
        const result = await ImageService.deleteDocImage(guidCode);

        if (result.success) {
            toast.add({
                severity: 'success',
                summary: 'สำเร็จ',
                detail: 'ลบรูปภาพสำเร็จ',
                life: 3000
            });

            // โหลดรายการรูปใหม่
            await loadImages();
            emit('images-updated');
        } else {
            toast.add({
                severity: 'error',
                summary: 'ผิดพลาด',
                detail: result.message || 'ไม่สามารถลบรูปภาพได้',
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        toast.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'เกิดข้อผิดพลาดในการลบรูปภาพ',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

// ดูรูปขนาดใหญ่
function viewImage(image) {
    previewImage.value = ImageService.getImageUrl(image.guid_code);
    showPreview.value = true;
}

// Get image URL
function getImageUrl(guidCode) {
    return ImageService.getImageUrl(guidCode);
}

// Handle image load
function handleImageLoad(guidCode) {
    imageLoadingStates.value[guidCode] = false;
    imageErrorStates.value[guidCode] = false;
}

// Handle image error
function handleImageError(guidCode) {
    imageLoadingStates.value[guidCode] = false;
    imageErrorStates.value[guidCode] = true;
}

// Set image loading
function setImageLoading(guidCode) {
    imageLoadingStates.value[guidCode] = true;
    imageErrorStates.value[guidCode] = false;
}

// Watch visibility
watch(
    () => props.visible,
    (newVal) => {
        if (newVal) {
            loadImages();
        }
    }
);

function closeDialog() {
    emit('update:visible', false);
}
</script>

<template>
    <Dialog :visible="visible" @update:visible="closeDialog" :style="{ width: '95vw', maxWidth: '900px' }" :modal="true" :dismissableMask="true" position="center" :draggable="false">
        <template #header>
            <div class="flex items-center gap-3 w-full">
                <i class="pi pi-images text-2xl text-primary"></i>
                <div class="flex-1">
                    <div class="font-semibold text-lg">รูปภาพเอกสาร</div>
                    <div class="text-sm text-muted-color">{{ docRef }}</div>
                </div>
                <Tag :value="`${images.length} รูป`" severity="info" />
            </div>
        </template>

        <!-- Upload Buttons -->
        <div v-if="!readOnly" class="mb-5">
            <div class="grid grid-cols-2 gap-3">
                <Button icon="pi pi-camera" label="ถ่ายรูป" @click="openCamera(true)" :loading="uploading" severity="success" size="large" class="font-semibold">
                    <template #icon>
                        <i class="pi pi-camera text-xl mr-2"></i>
                    </template>
                </Button>
                <Button icon="pi pi-upload" label="เลือกรูป" @click="openCamera(false)" :loading="uploading" severity="primary" outlined size="large" class="font-semibold">
                    <template #icon>
                        <i class="pi pi-upload text-xl mr-2"></i>
                    </template>
                </Button>
            </div>
            <input ref="fileInput" type="file" accept="image/*" :capture="useCamera ? 'environment' : undefined" @change="handleFileSelect" style="display: none" />
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="4" />
            <p class="mt-4 text-muted-color font-medium">กำลังโหลดรูปภาพ...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="images.length === 0" class="text-center py-12 px-4">
            <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-surface-100 dark:bg-surface-700 mb-4">
                <i class="pi pi-image text-5xl text-muted-color"></i>
            </div>
            <h3 class="text-xl font-semibold text-muted-color">ยังไม่มีรูปภาพ</h3>
        </div>

        <!-- Images Grid -->
        <div v-else>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div v-for="(image, index) in images" :key="image.guid_code">
                    <div class="bg-white dark:bg-surface-800 rounded-lg border border-gray-200 dark:border-surface-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" @click="viewImage(image)">
                        <!-- รูปเล็ก Thumbnail -->
                        <div class="aspect-square relative bg-gray-100 dark:bg-surface-900">
                            <!-- Loading State -->
                            <div v-if="imageLoadingStates[image.guid_code] !== false && !imageErrorStates[image.guid_code]" class="absolute inset-0 flex items-center justify-center">
                                <ProgressSpinner style="width: 30px; height: 30px" strokeWidth="4" />
                            </div>

                            <!-- Error State -->
                            <div v-else-if="imageErrorStates[image.guid_code]" class="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20">
                                <i class="pi pi-exclamation-triangle text-2xl text-red-500"></i>
                            </div>

                            <!-- รูปภาพ -->
                            <img
                                :src="getImageUrl(image.guid_code)"
                                :alt="`รูปที่ ${index + 1}`"
                                class="w-full h-full object-cover"
                                loading="lazy"
                                @load="handleImageLoad(image.guid_code)"
                                @error="handleImageError(image.guid_code)"
                                :class="{ 'opacity-0': imageLoadingStates[image.guid_code] || imageErrorStates[image.guid_code] }"
                            />
                        </div>

                        <!-- Footer -->
                        <div class="p-3 flex items-center justify-between border-t border-gray-200 dark:border-surface-700">
                            <div class="flex items-center gap-2">
                                <i class="pi pi-image text-primary text-sm"></i>
                                <span class="font-medium text-sm">รูปที่ {{ index + 1 }}</span>
                            </div>
                            <Button v-if="!readOnly" icon="pi pi-trash" severity="danger" text rounded size="small" @click.stop="confirmDelete(image)" v-tooltip.top="'ลบรูป'" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button label="ปิด" icon="pi pi-times" @click="closeDialog" severity="secondary" size="large" />
            </div>
        </template>
    </Dialog>

    <!-- Preview Dialog -->
    <Dialog v-model:visible="showPreview" :modal="true" :dismissableMask="true" :style="{ width: '95vw', maxWidth: '1200px' }" position="center" :draggable="false">
        <template #header>
            <div class="flex items-center gap-2">
                <i class="pi pi-eye text-xl"></i>
                <span class="font-semibold">ดูรูปภาพ</span>
            </div>
        </template>
        <div class="flex justify-center items-center bg-gray-100 dark:bg-gray-900 rounded-lg p-4" style="min-height: 400px">
            <img :src="previewImage" alt="Preview" class="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg" />
        </div>
        <template #footer>
            <Button label="ปิด" icon="pi pi-times" @click="showPreview = false" severity="secondary" outlined />
        </template>
    </Dialog>
</template>

<style scoped>
.aspect-square {
    aspect-ratio: 1 / 1;
}
</style>
