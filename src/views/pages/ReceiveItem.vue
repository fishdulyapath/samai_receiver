<script setup>
import PrintReceiverDialog from '@/components/PrintReceiptDialog.vue';
import ReceiveDocService from '@/service/ReceiveDocService';
import { useToast } from 'primevue/usetoast';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const toast = useToast();

// Document info
const docno = ref(route.params.docno || '');
const loading = ref(false);

// SO Details & Received Items
const soDetails = ref([]);
const receivedDetails = ref([]);

// Search & Scanning
const selectedItem = ref(null);
const searchLoading = ref(false);
const searchResults = ref([]);

// Barcode Scanning
const barcodeInput = ref('');
const barcodeInputRef = ref(null);

// Input Mode Selection
const inputMode = ref('barcode'); // 'barcode' or 'search'
const inputModes = ref([
    { name: 'Scan Barcode', value: 'barcode', icon: 'pi pi-qrcode' },
    { name: 'ค้นหาสินค้า', value: 'search', icon: 'pi pi-search' }
]);

// Scanned Items List - เก็บตาม item_code จริงของ SO
const scannedItems = ref([]);

// Summary Dialog
const showSummaryDialog = ref(false);

// Print Dialog
const showPrintDialog = ref(false);
const documentData = ref({});

// SO Details toggle
const showSODetails = ref(false);

// Responsive state
const isMobile = ref(window.innerWidth < 768);

function handleResize() {
    isMobile.value = window.innerWidth < 768;
}

onMounted(async () => {
    window.addEventListener('resize', handleResize);
    if (!docno.value) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'ไม่พบเลขที่เอกสาร',
            life: 3000
        });
        router.push({ name: 'receivedoc' });
        return;
    }
    await loadReceiveDocDetail();
});

// โหลดรายละเอียดใบรับสินค้า
async function loadReceiveDocDetail() {
    loading.value = true;
    try {
        const result = await ReceiveDocService.getReceiveDocDetail(docno.value);

        if (result.success) {
            soDetails.value = result.details_so || [];
            receivedDetails.value = result.details_receive || [];

            // ถ้ามีสินค้าที่รับแล้ว ให้โหลดมาแสดงใน scannedItems
            if (receivedDetails.value.length > 0) {
                scannedItems.value = receivedDetails.value.map((item) => {
                    // หา SO item ที่ตรงกัน
                    const soItem = soDetails.value.find((so) => so.item_code === item.item_code && so.unit_code === item.unit_code);
                    return {
                        item_code: item.item_code,
                        item_ref_code: soItem?.item_ref_code || item.item_ref_code || item.item_code,
                        item_name: item.item_name || '',
                        unit_code: item.unit_code,
                        qty: parseFloat(item.qty) || 0,
                        max_qty: getMaxQtyByItemCode(item.item_code)
                    };
                });
            }
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: result.message || 'Failed to load document detail',
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred while loading document detail',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

// หาจำนวนสูงสุดที่รับได้สำหรับสินค้าแต่ละตัว (ตาม item_code)
function getMaxQtyByItemCode(itemCode) {
    const soItem = soDetails.value.find((item) => item.item_code === itemCode);
    return soItem ? parseFloat(soItem.qty) || 0 : 0;
}

// หาจำนวนสูงสุดรวมสำหรับ item_ref_code และ unit_code เดียวกัน
function getTotalMaxQtyByRefCode(itemRefCode, unitCode) {
    return soDetails.value.filter((item) => item.item_ref_code === itemRefCode && item.unit_code === unitCode).reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
}

// หาจำนวนที่รับไปแล้วจาก scannedItems (ตาม item_code)
function getScannedQtyByItemCode(itemCode) {
    return scannedItems.value.filter((item) => item.item_code === itemCode).reduce((sum, item) => sum + item.qty, 0);
}

// คำนวณจำนวนคงเหลือที่ยังรับได้ (ตาม item_code)
function getRemainingQtyByItemCode(itemCode) {
    return getMaxQtyByItemCode(itemCode) - getScannedQtyByItemCode(itemCode);
}

// Backward compatible functions for template usage
function getScannedQty(itemCode) {
    return getScannedQtyByItemCode(itemCode);
}

function getRemainingQty(itemCode) {
    return getRemainingQtyByItemCode(itemCode);
}

// ฟังก์ชันสำหรับ re-focus barcode input หลัง scan
function refocusBarcodeInput() {
    if (inputMode.value === 'barcode') {
        nextTick(() => {
            if (barcodeInputRef.value && barcodeInputRef.value.$el) {
                const inputElement = barcodeInputRef.value.$el;
                if (inputElement && typeof inputElement.focus === 'function') {
                    inputElement.focus();
                }
            }
        });
    }
}

// แยก Barcode Input รูปแบบ: 8801221242-03 หรือ qty*8801221242-03
function parseBarcodeInput(input) {
    const trimmedInput = input.trim();
    let qty = 1;
    let barcode = '';

    // แยก quantity ถ้ามี * (เช่น 10*8801221242-03)
    let remaining = trimmedInput;
    if (remaining.includes('*')) {
        const parts = remaining.split('*');
        const qtyPart = parseInt(parts[0]);
        if (!isNaN(qtyPart) && qtyPart > 0) {
            qty = qtyPart;
        }
        remaining = parts.slice(1).join('*'); // เอาส่วนหลัง * มาต่อกัน
    }

    // ตัดส่วนหลัง - ออก (ถ้ามี)
    if (remaining.includes('-')) {
        barcode = remaining.split('-')[0];
    } else {
        barcode = remaining;
    }

    return { qty, barcode };
}

// หารายการ SO ที่ match กับ item_ref_code และ unit_code เรียงตามจำนวน qty น้อยสุดก่อน
function findMatchingSOItems(itemRefCode, unitCode) {
    return soDetails.value
        .filter((so) => so.item_ref_code === itemRefCode && so.unit_code === unitCode)
        .map((so) => ({
            ...so,
            max_qty: parseFloat(so.qty) || 0,
            scanned_qty: getScannedQtyByItemCode(so.item_code),
            remaining_qty: (parseFloat(so.qty) || 0) - getScannedQtyByItemCode(so.item_code)
        }))
        .filter((so) => so.remaining_qty > 0) // เอาเฉพาะที่ยังรับได้
        .sort((a, b) => a.max_qty - b.max_qty); // เรียงตาม qty น้อยสุดก่อน
}

// ประมวลผล Barcode Input - Logic ใหม่
async function processBarcodeInput() {
    if (!barcodeInput.value || !barcodeInput.value.trim()) {
        return;
    }

    const { qty, barcode } = parseBarcodeInput(barcodeInput.value);

    if (!barcode) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'รูปแบบ Barcode ไม่ถูกต้อง',
            life: 3000
        });
        barcodeInput.value = '';
        return;
    }

    // ค้นหาสินค้าจาก barcode
    searchLoading.value = true;
    try {
        const result = await ReceiveDocService.getBarcodeSearch(barcode);

        if (result.success && result.data && result.data.length > 0) {
            const item = result.data[0];
            const itemRefCode = item.item_ref_code;
            const unitCode = item.unit_code;

            // หารายการ SO ที่ match กับ item_ref_code และ unit_code
            const matchingSOItems = findMatchingSOItems(itemRefCode, unitCode);

            if (matchingSOItems.length === 0) {
                // ตรวจสอบว่ามีใน SO หรือไม่ (อาจจะรับครบแล้ว)
                const anySOMatch = soDetails.value.find((so) => so.item_ref_code === itemRefCode && so.unit_code === unitCode);

                if (anySOMatch) {
                    toast.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: `สินค้า ${itemRefCode} (${unitCode}) รับครบแล้ว`,
                        life: 3000
                    });
                } else {
                    toast.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: `สินค้า ${itemRefCode} (${unitCode}) ไม่อยู่ใน PO นี้`,
                        life: 3000
                    });
                }
                barcodeInput.value = '';
                searchLoading.value = false;
                return;
            }

            // คำนวณจำนวนรวมที่ยังรับได้
            const totalRemainingQty = matchingSOItems.reduce((sum, so) => sum + so.remaining_qty, 0);

            // ตรวจสอบจำนวนที่สแกนไม่ให้เกินที่เหลือ
            const actualQty = Math.min(qty, totalRemainingQty);

            if (actualQty < qty) {
                toast.add({
                    severity: 'warn',
                    summary: 'Warning',
                    detail: `สามารถรับได้เพียง ${actualQty} ชิ้น (เหลือ ${totalRemainingQty} ชิ้น)`,
                    life: 3000
                });
            }

            // กระจายจำนวนไปยังรายการต่างๆ ตามลำดับ (น้อยสุดก่อน)
            let remainingToAdd = actualQty;
            let addedDetails = [];

            for (const soItem of matchingSOItems) {
                if (remainingToAdd <= 0) break;

                const qtyToAdd = Math.min(remainingToAdd, soItem.remaining_qty);

                if (qtyToAdd > 0) {
                    addItemToScannedBySOItem(soItem, qtyToAdd, false);
                    addedDetails.push({ item_code: soItem.item_code, qty: qtyToAdd });
                    remainingToAdd -= qtyToAdd;
                }
            }

            if (addedDetails.length > 0) {
                const totalAdded = addedDetails.reduce((sum, d) => sum + d.qty, 0);
                const detailText = addedDetails.map((d) => `${d.item_code}: ${d.qty}`).join(', ');
                toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `เพิ่มสินค้า ${itemRefCode} จำนวน ${totalAdded} ชิ้น (${detailText})`,
                    life: 3000
                });
            }
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: `ไม่พบสินค้า Barcode: ${barcode}`,
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'เกิดข้อผิดพลาดในการค้นหา',
            life: 3000
        });
    } finally {
        searchLoading.value = false;
        barcodeInput.value = '';
        refocusBarcodeInput();
    }
}

// เพิ่มสินค้าตาม SO Item ที่ระบุ
function addItemToScannedBySOItem(soItem, qtyToAdd, showToast = true) {
    const existingIndex = scannedItems.value.findIndex((i) => i.item_code === soItem.item_code);

    if (existingIndex !== -1) {
        // มีอยู่แล้ว - เพิ่มจำนวน
        scannedItems.value[existingIndex].qty += qtyToAdd;

        if (showToast) {
            toast.add({
                severity: 'info',
                summary: 'Updated',
                detail: `อัพเดทจำนวนสินค้า ${soItem.item_code} เป็น ${scannedItems.value[existingIndex].qty}`,
                life: 2000
            });
        }
    } else {
        // เพิ่มรายการใหม่
        scannedItems.value.push({
            item_code: soItem.item_code,
            item_ref_code: soItem.item_ref_code,
            item_name: soItem.item_name || '',
            unit_code: soItem.unit_code,
            qty: qtyToAdd,
            max_qty: parseFloat(soItem.qty) || 0
        });

        if (showToast) {
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: `เพิ่มสินค้า ${soItem.item_code}`,
                life: 2000
            });
        }
    }

    return true;
}

// ค้นหาสินค้า (AutoComplete)
async function handleSearch(event) {
    const query = event.query;

    if (!query || !query.trim()) {
        searchResults.value = [];
        return;
    }

    searchLoading.value = true;
    try {
        const searchTerm = query.trim();
        const result = await ReceiveDocService.getItemSearch(searchTerm);

        if (result.success && result.data && result.data.length > 0) {
            searchResults.value = result.data;
        } else {
            searchResults.value = [];
        }
    } catch (error) {
        searchResults.value = [];
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'เกิดข้อผิดพลาดในการค้นหา',
            life: 3000
        });
    } finally {
        searchLoading.value = false;
    }
}

// เลือกสินค้าจาก AutoComplete
function onItemSelect(event) {
    if (event.value) {
        addItemToScanned(event.value);
        setTimeout(() => {
            selectedItem.value = null;
            searchResults.value = [];
        }, 100);
    }
}

// เพิ่มสินค้าที่เลือกเข้า scannedItems (สำหรับ search mode)
function addItemToScanned(item, showToast = true) {
    const itemRefCode = item.item_ref_code;
    const unitCode = item.unit_code;

    // หารายการ SO ที่ match
    const matchingSOItems = findMatchingSOItems(itemRefCode, unitCode);

    if (matchingSOItems.length === 0) {
        const anySOMatch = soDetails.value.find((so) => so.item_ref_code === itemRefCode && so.unit_code === unitCode);

        if (anySOMatch) {
            if (showToast) {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: `สินค้า ${itemRefCode} (${unitCode}) รับครบแล้ว`,
                    life: 3000
                });
            }
        } else {
            if (showToast) {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: `สินค้า ${itemRefCode} (${unitCode}) ไม่อยู่ใน PO นี้`,
                    life: 3000
                });
            }
        }
        return false;
    }

    // เพิ่มไปที่รายการที่มี qty น้อยสุด
    const targetSO = matchingSOItems[0];
    return addItemToScannedBySOItem(targetSO, item.qty || 1, showToast);
}

// ลบสินค้าจาก scannedItems
function removeScannedItem(index) {
    scannedItems.value.splice(index, 1);
}

// อัพเดทจำนวน
function updateQty(index, newQty) {
    const item = scannedItems.value[index];
    const maxQty = item.max_qty;

    if (newQty > maxQty) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: `ไม่สามารถรับเกิน ${maxQty} ${item.unit_code}`,
            life: 3000
        });
        scannedItems.value[index].qty = maxQty;
    } else if (newQty < 0) {
        scannedItems.value[index].qty = 0;
    } else {
        scannedItems.value[index].qty = newQty;
    }
}

// แสดง Summary Dialog
function showSummary() {
    showSummaryDialog.value = true;
}

// สรุปข้อมูลสินค้าที่จะบันทึก (จัดกลุ่มตาม item_ref_code + unit_code)
const summaryItems = computed(() => {
    const grouped = {};

    scannedItems.value.forEach((item) => {
        const key = `${item.item_ref_code}_${item.unit_code}`;
        if (!grouped[key]) {
            // คำนวณ max_qty รวมสำหรับ item_ref_code + unit_code เดียวกัน
            const totalMaxQty = getTotalMaxQtyByRefCode(item.item_ref_code, item.unit_code);
            grouped[key] = {
                item_ref_code: item.item_ref_code,
                item_name: item.item_name,
                unit_code: item.unit_code,
                total_qty: 0,
                max_qty: totalMaxQty,
                details: []
            };
        }
        grouped[key].total_qty += item.qty;
        grouped[key].details.push({
            item_code: item.item_code,
            qty: item.qty
        });
    });

    return Object.values(grouped);
});

// คำนวณยอดรวมของ SO ทั้งหมด
const totalSOQty = computed(() => {
    return soDetails.value.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
});

// คำนวณยอดที่สแกนแล้วทั้งหมด
const totalScannedQty = computed(() => {
    return scannedItems.value.reduce((sum, item) => sum + item.qty, 0);
});

// คำนวณ Progress Percentage
const progressPercentage = computed(() => {
    if (totalSOQty.value === 0) return 0;
    return (totalScannedQty.value / totalSOQty.value) * 100;
});

// บันทึกการรับสินค้า (จาก Summary Dialog)
async function saveReceiveDoc() {
    loading.value = true;

    try {
        // เตรียมข้อมูลสำหรับ API
        const details = scannedItems.value.map((item) => ({
            item_code: item.item_code,
            unit_code: item.unit_code,
            qty: item.qty.toString()
        }));

        // บังคับแสดง loading อย่างน้อย 2 วินาที
        const [result] = await Promise.all([ReceiveDocService.updateReceiveDoc(docno.value, details), new Promise((resolve) => setTimeout(resolve, 1000))]);

        if (result.success) {
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'บันทึกการรับสินค้าสำเร็จ',
                life: 3000
            });

            // เช็คว่าจำนวนที่รับเท่ากับ SO หรือไม่
            if (totalScannedQty.value === totalSOQty.value) {
                // โหลดข้อมูล document อีกครั้งเพื่อเตรียมพิมพ์
                await loadDocumentDataForPrint();

                // เปิด Print Dialog
                showPrintDialog.value = true;
            } else {
                // ถ้าจำนวนไม่เท่ากัน ให้กลับไปหน้ารายการทันที
                router.push({ name: 'receivedoc' });
            }

            showSummaryDialog.value = false;
        } else {
            loading.value = false;
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: result.message || 'Failed to save receive document',
                life: 3000
            });
        }
    } catch (error) {
        loading.value = false;
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred while saving',
            life: 3000
        });
    }
}

// โหลดข้อมูล document สำหรับพิมพ์
async function loadDocumentDataForPrint() {
    try {
        // ดึงข้อมูลจาก API getReceiveDocList เพื่อหาข้อมูลเอกสาร
        const result = await ReceiveDocService.getReceiveDocList(docno.value, '', '', 1, 1);

        if (result.success && result.data && result.data.length > 0) {
            documentData.value = result.data[0];
        } else {
            // ถ้าหาไม่เจอให้ใช้ข้อมูลพื้นฐาน
            documentData.value = {
                doc_no: docno.value,
                doc_date: new Date().toISOString().split('T')[0],
                doc_time: new Date().toTimeString().split(' ')[0],
                cust_name: '-',
                user_close_name: '-'
            };
        }
    } catch (error) {
        console.error('Error loading document data:', error);
        documentData.value = {
            doc_no: docno.value,
            doc_date: new Date().toISOString().split('T')[0],
            doc_time: new Date().toTimeString().split(' ')[0],
            cust_name: '-',
            user_close_name: '-'
        };
    }
}

// ปิด Print Dialog และกลับไปหน้ารายการ
function handlePrintDialogClose() {
    showPrintDialog.value = false;
    router.push({ name: 'receivedoc' });
}

// ยกเลิกและกลับไปหน้ารายการ
function cancelAndGoBack() {
    router.push({ name: 'receivedoc' });
}

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
});
</script>

<template>
    <div class="min-h-screen bg-surface-50 dark:bg-surface-900">
        <!-- Fixed Header - Enlarged -->
        <div class="sticky top-0 z-10 bg-surface-0 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 shadow-md">
            <!-- Top Bar with Document Info and Actions -->
            <div class="flex items-center justify-between p-3 md:p-4 border-b border-surface-200 dark:border-surface-700">
                <div class="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    <Button icon="pi pi-arrow-left" text rounded @click="cancelAndGoBack" size="small" class="md:size-default" />
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-base md:text-lg text-primary truncate">
                            {{ docno }}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-1 md:gap-2">
                    <Button icon="pi pi-list" text rounded @click="showSODetails = true" v-badge.danger="soDetails.length" v-tooltip.bottom="'ดูรายการ PO'" size="small" class="md:size-default" />
                    <!-- Mobile: Icon only -->
                    <Button v-if="isMobile" label="บันทึก" icon="pi pi-check" severity="success" @click="showSummary" size="small" />
                    <!-- Desktop: With label -->
                    <Button v-else label="บันทึก" icon="pi pi-check" severity="success" @click="showSummary" />
                </div>
            </div>

            <!-- Progress Section -->
            <div class="px-3 py-2 md:px-4 md:py-3 bg-surface-50 dark:bg-surface-900">
                <div class="flex items-center justify-between mb-1.5 md:mb-2">
                    <span class="text-sm md:text-base font-semibold" :class="progressPercentage === 100 ? 'text-success' : 'text-primary'">ความคืบหน้า {{ progressPercentage.toFixed(1) }}%</span>
                    <span class="text-xs md:text-sm text-muted-color">{{ totalScannedQty }} / {{ totalSOQty }} ชิ้น</span>
                </div>
                <ProgressBar :value="progressPercentage" :showValue="false" class="h-2 md:h-3" />
            </div>

            <!-- Input Mode Selection -->
            <div class="px-3 py-2 md:px-4 md:py-3">
                <SelectButton v-model="inputMode" :options="inputModes" optionLabel="name" optionValue="value" fluid size="small" class="md:size-default">
                    <template #option="slotProps">
                        <i :class="slotProps.option.icon" class="mr-2"></i>
                        <span>{{ slotProps.option.name }}</span>
                    </template>
                </SelectButton>
            </div>

            <!-- Barcode Scanner Input -->
            <div v-if="inputMode === 'barcode'" class="px-3 pb-3 md:px-4 md:pb-4">
                <IconField>
                    <InputIcon class="pi pi-qrcode" />
                    <InputText ref="barcodeInputRef" v-model="barcodeInput" @keyup.enter="processBarcodeInput" placeholder="Scan Barcode..." fluid class="text-base md:text-lg font-mono" :disabled="searchLoading" autofocus />
                </IconField>
            </div>

            <!-- AutoComplete Search -->
            <div v-if="inputMode === 'search'" class="px-3 pb-3 md:px-4 md:pb-4">
                <IconField>
                    <InputIcon class="pi pi-search" />
                    <AutoComplete
                        v-model="selectedItem"
                        :suggestions="searchResults"
                        @complete="handleSearch"
                        @item-select="onItemSelect"
                        placeholder="ค้นหาสินค้า..."
                        optionLabel="item_code"
                        fluid
                        class="text-base"
                        :loading="searchLoading"
                        completeOnFocus
                        :minLength="1"
                        autofocus
                    >
                        <template #option="slotProps">
                            <div class="flex items-start gap-2 py-2">
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm text-primary mb-1">
                                        {{ slotProps.option.item_code }}
                                    </div>
                                    <div class="text-xs text-muted-color mb-1 line-clamp-1">
                                        {{ slotProps.option.item_name || '-' }}
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <Tag :value="slotProps.option.unit_code" severity="secondary" class="text-xs" />
                                        <span v-if="slotProps.option.barcode" class="font-mono font-bold text-xs text-primary bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded">{{ slotProps.option.barcode }}</span>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </AutoComplete>
                </IconField>
            </div>
        </div>

        <!-- Main Content -->
        <div class="p-2">
            <!-- Scanned Items List -->
            <div v-if="scannedItems.length === 0" class="text-center py-12 text-muted-color">
                <i class="pi pi-qrcode text-5xl mb-3 opacity-30"></i>
                <p class="text-sm">สแกน Barcode เพื่อเริ่มรับสินค้า</p>
            </div>

            <div v-else class="space-y-2">
                <div v-for="(item, index) in scannedItems" :key="index" class="bg-surface-0 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
                    <!-- Item Header -->
                    <div class="flex items-start p-3 pb-2">
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-primary text-base md:text-lg truncate mb-1">
                                {{ item.item_code }}
                            </div>
                            <div class="text-sm md:text-base text-muted-color truncate mb-1">
                                {{ item.item_name || '-' }}
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="pi pi-tag text-sm md:text-base text-muted-color"></i>
                                <span class="font-mono font-bold text-sm md:text-base text-primary bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded">{{ item.item_ref_code }}</span>
                            </div>
                        </div>
                        <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="removeScannedItem(index)" class="ml-2 -mt-1" />
                    </div>

                    <!-- Quantity Controls -->
                    <div class="flex items-center justify-between px-3 pb-3 pt-1">
                        <div class="flex items-center gap-1">
                            <Tag :value="item.unit_code" severity="secondary" class="text-sm md:text-base" />
                        </div>
                        <div class="flex items-center gap-2">
                            <Button icon="pi pi-minus" text rounded size="small" severity="secondary" @click="item.qty > 1 && updateQty(index, item.qty - 1)" :disabled="item.qty <= 1" />
                            <div class="bg-primary-50 dark:bg-primary-900/20 rounded px-3 py-1 min-w-[3.5rem] md:min-w-[4rem] text-center">
                                <div class="text-xl md:text-2xl font-bold text-primary leading-none">
                                    {{ item.qty }}
                                </div>
                                <div class="text-xs md:text-sm text-muted-color">/ {{ item.max_qty }}</div>
                            </div>
                            <Button icon="pi pi-plus" text rounded size="small" severity="success" @click="updateQty(index, item.qty + 1)" :disabled="item.qty >= item.max_qty" />
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="h-1 bg-surface-100 dark:bg-surface-700">
                        <div class="h-full bg-success-500 transition-all" :style="{ width: `${(item.qty / item.max_qty) * 100}%` }"></div>
                    </div>
                </div>
            </div>

            <!-- Bottom Spacer -->
            <div class="h-20"></div>
        </div>

        <!-- SO Details Dialog - Full Screen on Mobile, Compact on Desktop -->
        <Dialog
            v-model:visible="showSODetails"
            header="รายการใน PO"
            :style="isMobile ? { width: '100vw', height: '100vh', maxWidth: '100%' } : { width: '90vw', maxWidth: '1200px' }"
            :modal="true"
            :dismissableMask="true"
            :draggable="false"
            class="so-details-dialog"
        >
            <template #header>
                <div class="flex items-center justify-between w-full pr-8">
                    <div class="flex items-center gap-3">
                        <i class="pi pi-list text-xl"></i>
                        <div>
                            <div class="font-bold text-lg">SO: {{ docno }}</div>
                        </div>
                    </div>
                    <Tag :value="`${soDetails.length} รายการ`" severity="info" />
                </div>
            </template>

            <!-- Stats Summary - Horizontal on Desktop -->
            <div class="grid grid-cols-3 gap-2 lg:gap-4 mb-3 lg:mb-4">
                <div class="bg-primary-100 dark:bg-primary-900/30 rounded-lg p-2 lg:p-4 text-center">
                    <div class="text-[10px] lg:text-sm text-primary-600 dark:text-primary-400 mb-1">รายการทั้งหมด</div>
                    <div class="text-lg lg:text-3xl font-bold text-primary">
                        {{ soDetails.length }}
                    </div>
                </div>
                <div class="bg-success-100 dark:bg-success-900/30 rounded-lg p-2 lg:p-4 text-center">
                    <div class="text-[10px] lg:text-sm text-success-600 dark:text-success-400 mb-1">ยอดรว PO</div>
                    <div class="text-lg lg:text-3xl font-bold text-success">{{ totalSOQty }}</div>
                </div>
                <div class="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2 lg:p-4 text-center">
                    <div class="text-[10px] lg:text-sm text-orange-600 dark:text-orange-400 mb-1">รับแล้ว</div>
                    <div class="text-lg lg:text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {{ totalScannedQty }}
                    </div>
                </div>
            </div>

            <!-- SO Items List -->
            <div class="space-y-2 lg:space-y-2">
                <div v-for="(so, idx) in soDetails" :key="idx" class="bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-3 lg:p-3">
                    <!-- Desktop: Horizontal Layout -->
                    <div class="hidden lg:flex lg:items-center lg:gap-4">
                        <!-- Item Info (Left) -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-3">
                                <div class="font-bold text-base text-primary">{{ so.item_code }}</div>
                                <Tag :value="so.unit_code" severity="secondary" class="text-xs" />
                            </div>
                            <div class="text-sm text-muted-color truncate mt-1">
                                {{ so.item_name || '-' }}
                            </div>
                        </div>

                        <!-- Quantity Stats (Center) - Inline -->
                        <div class="flex items-center gap-4">
                            <div class="text-center">
                                <div class="text-xs text-blue-600 dark:text-blue-400 mb-1">จำนวน PO</div>
                                <div class="text-xl font-bold text-blue-600 dark:text-blue-400">
                                    {{ so.qty }}
                                </div>
                            </div>
                            <div class="text-muted-color">→</div>
                            <div class="text-center">
                                <div class="text-xs mb-1" :class="getScannedQty(so.item_code) >= parseInt(so.qty) ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'">รับแล้ว</div>
                                <div class="text-xl font-bold" :class="getScannedQty(so.item_code) >= parseInt(so.qty) ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'">
                                    {{ getScannedQty(so.item_code) }}
                                </div>
                            </div>
                            <div class="text-muted-color">→</div>
                            <div class="text-center">
                                <div class="text-xs text-muted-color mb-1">คงเหลือ</div>
                                <div class="text-xl font-bold">{{ getRemainingQty(so.item_code) }}</div>
                            </div>
                        </div>

                        <!-- Progress & Status (Right) -->
                        <div class="flex items-center gap-3">
                            <div class="w-32">
                                <Tag v-if="getScannedQty(so.item_code) >= parseInt(so.qty)" value="ครบ" severity="success" icon="pi pi-check-circle" class="text-xs" />
                                <Tag v-else-if="getScannedQty(so.item_code) > 0" value="บางส่วน" severity="warn" icon="pi pi-clock" class="text-xs" />
                                <Tag v-else value="ยังไม่รับ" severity="danger" icon="pi pi-times-circle" class="text-xs" />
                                <div class="text-xs text-center mt-1 font-semibold">{{ ((getScannedQty(so.item_code) / parseInt(so.qty)) * 100).toFixed(0) }}%</div>
                            </div>
                        </div>
                    </div>

                    <!-- Mobile: Vertical Layout (Original) -->
                    <div class="lg:hidden">
                        <!-- Item Header -->
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <div class="font-bold text-lg text-primary">{{ so.item_code }}</div>
                                </div>
                                <div class="text-sm text-muted-color truncate">
                                    {{ so.item_name || '-' }}
                                </div>
                            </div>
                            <Tag :value="so.unit_code" severity="secondary" class="ml-2" />
                        </div>

                        <!-- Quantity Stats -->
                        <div class="grid grid-cols-3 gap-2">
                            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                                <div class="text-[10px] text-blue-600 dark:text-blue-400 mb-1">จำนวน PO</div>
                                <div class="text-base font-bold text-blue-600 dark:text-blue-400">
                                    {{ so.qty }}
                                </div>
                            </div>
                            <div :class="['rounded-lg p-2 text-center', getScannedQty(so.item_code) >= parseInt(so.qty) ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20']">
                                <div class="text-[10px] mb-1" :class="getScannedQty(so.item_code) >= parseInt(so.qty) ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'">รับแล้ว</div>
                                <div class="text-base font-bold" :class="getScannedQty(so.item_code) >= parseInt(so.qty) ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'">
                                    {{ getScannedQty(so.item_code) }}
                                </div>
                            </div>
                            <div class="bg-surface-100 dark:bg-surface-700 rounded-lg p-2 text-center">
                                <div class="text-[10px] text-muted-color mb-1">คงเหลือ</div>
                                <div class="text-base font-bold">{{ getRemainingQty(so.item_code) }}</div>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="mt-3">
                            <div class="flex items-center justify-between mb-1">
                                <Tag v-if="getScannedQty(so.item_code) >= parseInt(so.qty)" value="รับครบแล้ว" severity="success" icon="pi pi-check-circle" />
                                <Tag v-else-if="getScannedQty(so.item_code) > 0" value="รับบางส่วน" severity="warn" icon="pi pi-clock" />
                                <Tag v-else value="ยังไม่รับ" severity="danger" icon="pi pi-times-circle" />
                                <span class="text-xs font-semibold">{{ ((getScannedQty(so.item_code) / parseInt(so.qty)) * 100).toFixed(0) }}%</span>
                            </div>
                            <ProgressBar :value="(getScannedQty(so.item_code) / parseInt(so.qty)) * 100" :showValue="false" class="h-2" />
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="ปิด" icon="pi pi-times" text @click="showSODetails = false" />
            </template>
        </Dialog>

        <!-- Summary Dialog -->
        <Dialog v-model:visible="showSummaryDialog" :header="docno" :style="isMobile ? { width: '95vw', maxWidth: '500px' } : { width: '90vw', maxWidth: '1000px' }" :modal="true" :closable="!loading" :draggable="false">
            <BlockUI :blocked="loading" class="min-h-[200px]">
                <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-surface-0/80 dark:bg-surface-900/80 z-10">
                    <div class="text-center">
                        <i class="pi pi-spin pi-spinner text-4xl text-primary mb-3"></i>
                        <div class="font-semibold text-lg">กำลังบันทึกข้อมูล...</div>
                        <div class="text-sm text-muted-color">กรุณารอสักครู่</div>
                    </div>
                </div>
                <div class="space-y-2 lg:space-y-2">
                    <div v-for="(item, idx) in summaryItems" :key="idx" class="bg-surface-50 dark:bg-surface-800 rounded p-3 lg:p-3 border border-surface-200 dark:border-surface-700">
                        <!-- Desktop: Horizontal Layout -->
                        <div class="hidden lg:block">
                            <!-- Main Info Row -->
                            <div class="flex items-center gap-4 mb-3">
                                <!-- Item Info (Left) -->
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-3 mb-1">
                                        <div class="font-semibold text-lg text-primary">
                                            {{ item.item_ref_code }}
                                        </div>
                                        <Tag :value="item.unit_code" severity="secondary" class="text-sm" />
                                    </div>
                                    <div class="text-base text-muted-color truncate">
                                        {{ item.item_name }}
                                    </div>
                                </div>

                                <!-- Quantity Summary (Right) -->
                                <div class="flex items-center gap-3">
                                    <div class="text-center">
                                        <div class="text-sm text-muted-color mb-1">จำนวนรวม</div>
                                        <Tag :value="`${item.total_qty} / ${item.max_qty}`" :severity="item.total_qty === item.max_qty ? 'success' : 'warning'" class="text-base" />
                                    </div>
                                </div>
                            </div>

                            <!-- Barcode Details Row (Below) -->
                            <div class="border-t border-surface-200 dark:border-surface-700 pt-3">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <div v-for="(detail, dIdx) in item.details" :key="dIdx" class="flex items-center gap-2 bg-surface-0 dark:bg-surface-900 rounded px-3 py-2 border border-surface-200 dark:border-surface-600">
                                        <i class="pi pi-box text-sm text-primary"></i>
                                        <span class="font-mono font-semibold text-sm text-primary">{{ detail.item_code }}</span>
                                        <Tag :value="`x${detail.qty}`" severity="info" class="text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Mobile: Vertical Layout (Original) -->
                        <div class="lg:hidden">
                            <!-- Item Header -->
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <div class="font-semibold text-base text-primary">
                                        {{ item.item_ref_code }}
                                    </div>
                                </div>
                                <Tag :value="item.unit_code" severity="secondary" class="text-sm" />
                            </div>
                            <div class="text-sm text-muted-color mb-2 truncate">
                                {{ item.item_name }}
                            </div>

                            <!-- Total Quantity -->
                            <div class="flex items-center justify-between mb-2 pb-2 border-b border-surface-200 dark:border-surface-700">
                                <span class="text-sm font-semibold text-muted-color">จำนวนรวม:</span>
                                <Tag :value="`${item.total_qty} / ${item.max_qty}`" :severity="item.total_qty === item.max_qty ? 'success' : 'warning'" class="text-sm" />
                            </div>

                            <!-- Barcode Details -->
                            <div class="space-y-2">
                                <div v-for="(detail, dIdx) in item.details" :key="dIdx" class="bg-surface-0 dark:bg-surface-900 rounded p-2.5 flex items-center justify-between">
                                    <div class="flex items-center gap-2 flex-1 min-w-0">
                                        <i class="pi pi-box text-sm text-primary"></i>
                                        <span class="font-mono font-semibold text-sm text-primary truncate">{{ detail.item_code }}</span>
                                    </div>
                                    <Tag :value="`x${detail.qty}`" severity="info" class="text-sm ml-2" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </BlockUI>

            <template #footer>
                <Button label="ยกเลิก" icon="pi pi-times" text @click="showSummaryDialog = false" size="small" :disabled="loading" />
                <Button label="ยืนยันบันทึก" icon="pi pi-check" severity="success" @click="saveReceiveDoc" size="small" :loading="loading" />
            </template>
        </Dialog>

        <!-- Print Receiver Dialog -->
        <PrintReceiverDialog :visible="showPrintDialog" @update:visible="handlePrintDialogClose" :documentData="documentData" :items="scannedItems" />
    </div>
</template>

<style scoped>
.line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.space-y-2 > * + * {
    margin-top: 0.5rem;
}

.space-y-3 > * + * {
    margin-top: 0.75rem;
}

/* Full screen dialog styles */
:deep(.so-details-dialog .p-dialog) {
    margin: 0 !important;
    max-height: 100vh !important;
}

:deep(.so-details-dialog .p-dialog-content) {
    flex: 1;
    overflow-y: auto;
}
</style>
