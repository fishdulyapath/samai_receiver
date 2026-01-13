<script setup>
import PrintReceiverDialog from '@/components/PrintReceiptDialog.vue';
import ReceiveDetailDialog from '@/components/ReceiveDetailDialog.vue';
import ReceiveDocTable from '@/components/ReceiveDocTable.vue';
import ReceiveDocService from '@/service/ReceiveDocService';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const toast = useToast();
const confirmDialog = useConfirm();
const router = useRouter();
const receiveDocs = ref([]);
const loading = ref(false);
const searchQuery = ref('');

// Get first and last day of current month
const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

const fromDate = ref(firstDay);
const toDate = ref(lastDay);
const currentPage = ref(1);
const pageSize = ref(20);
const totalRecords = ref(0);
const totalPages = ref(0);

// Dialog states
const createDialog = ref(false);
const currentStep = ref('1');
const selectedSO = ref(null);
const remark = ref('');
const soList = ref([]);
const soLoading = ref(false);
const soSearchQuery = ref('');
const soFromDate = ref(firstDay);
const soToDate = ref(lastDay);
const soCurrentPage = ref(1);
const soPageSize = ref(20);
const soTotalRecords = ref(0);
const soTotalPages = ref(0);

// Detail Dialog
const detailDialog = ref(false);
const detailLoading = ref(false);
const selectedDoc = ref(null);
const soDetails = ref([]);
const receiveDetails = ref([]);

// Print Dialog
const showPrintDialog = ref(false);
const printDocumentData = ref({});
const printItems = ref([]);

onMounted(async () => {
    await loadReceiveDocs();
});

function formatDateForAPI(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadReceiveDocs() {
    loading.value = true;
    try {
        const result = await ReceiveDocService.getReceiveDocList(searchQuery.value, formatDateForAPI(fromDate.value), formatDateForAPI(toDate.value), currentPage.value, pageSize.value);

        if (result.success) {
            receiveDocs.value = result.data;
            totalRecords.value = result.total;
            totalPages.value = result.totalPages;
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: result.message || 'Failed to load receive documents',
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred while loading receive documents',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function handleSearch() {
    currentPage.value = 1;
    await loadReceiveDocs();
}

function onPageChange(event) {
    currentPage.value = event.page;
    pageSize.value = event.rows;
    loadReceiveDocs();
}

// Open create dialog -> show SO list
function openCreateDialog() {
    currentStep.value = '1';
    selectedSO.value = null;
    remark.value = '';
    soSearchQuery.value = '';
    soCurrentPage.value = 1;
    createDialog.value = true;
    loadSOList();
}

async function loadSOList() {
    soLoading.value = true;
    try {
        const result = await ReceiveDocService.getSODocList(soSearchQuery.value, formatDateForAPI(soFromDate.value), formatDateForAPI(soToDate.value), soCurrentPage.value, soPageSize.value);

        if (result.success) {
            soList.value = result.data;
            soTotalRecords.value = result.total;
            soTotalPages.value = result.totalPages;
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: result.message || 'Failed to load PO documents',
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred while loading PO documents',
            life: 3000
        });
    } finally {
        soLoading.value = false;
    }
}

async function handleSOSearch() {
    soCurrentPage.value = 1;
    await loadSOList();
}

function onSOPageChange(event) {
    soCurrentPage.value = event.page + 1;
    soPageSize.value = event.rows;
    loadSOList();
}

function selectSO(event) {
    selectedSO.value = { ...event.data };
    currentStep.value = '2';
}

async function createReceiveDoc() {
    if (!selectedSO.value) {
        toast.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'กรุณาเลือก PO ก่อน',
            life: 3000
        });
        return;
    }

    loading.value = true;
    try {
        const result = await ReceiveDocService.createReceiveDoc({
            doc_ref: selectedSO.value.doc_no,
            cust_code: selectedSO.value.cust_code,
            sale_code: selectedSO.value.sale_code || '',
            branch_code: selectedSO.value.branch_code,
            remark: remark.value
        });

        if (result.success) {
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'สร้างใบรับสินค้าสำเร็จ',
                life: 3000
            });

            createDialog.value = false;
            selectedSO.value = null;
            remark.value = '';
            await loadReceiveDocs();
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: result.message || 'Failed to create receive document',
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred while creating receive document',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function hideCreateDialog() {
    createDialog.value = false;
    currentStep.value = '1';
    selectedSO.value = null;
    remark.value = '';
}

function backToSOList() {
    currentStep.value = '1';
    selectedSO.value = null;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

async function confirmSendApprove(docData) {
    confirmDialog.require({
        message: `ต้องการส่งอนุมัติใบรับสินค้า ${docData.doc_no} หรือไม่?`,
        header: 'ยืนยันการส่งอนุมัติ',
        icon: 'pi pi-send',
        acceptLabel: 'ยืนยัน',
        rejectLabel: 'ยกเลิก',
        acceptClass: 'p-button-info',
        rejectClass: 'p-button-secondary p-button-outlined',
        accept: async () => {
            await handleSendApprove(docData);
        }
    });
}

async function handleSendApprove(docData) {
    loading.value = true;
    try {
        const result = await ReceiveDocService.sendApprove(docData.doc_no);

        if (result.success) {
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'ส่งอนุมัติสำเร็จ',
                life: 3000
            });
            await loadReceiveDocs();
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: result.message || 'Failed to send approve',
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred while sending approve',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function confirmDelete(docData) {
    confirmDialog.require({
        message: `ต้องการลบใบรับสินค้า ${docData.doc_no} หรือไม่?`,
        header: 'ยืนยันการลบ',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'ลบ',
        rejectLabel: 'ยกเลิก',
        acceptClass: 'p-button-danger',
        rejectClass: 'p-button-secondary p-button-outlined',
        accept: async () => {
            await handleDelete(docData);
        }
    });
}

async function handleDelete(docData) {
    loading.value = true;
    try {
        const result = await ReceiveDocService.deleteReceiveDoc(docData.doc_no);

        if (result.success) {
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'ลบใบรับสินค้าสำเร็จ',
                life: 3000
            });
            await loadReceiveDocs();
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: result.message || 'Failed to delete receive document',
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred while deleting receive document',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function viewDetail(docData) {
    selectedDoc.value = docData;
    detailDialog.value = true;
    detailLoading.value = true;

    try {
        const result = await ReceiveDocService.getReceiveDocDetail(docData.doc_no);

        if (result.success) {
            soDetails.value = result.details_so || [];
            receiveDetails.value = result.details_receive || [];
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: result.message || 'Failed to load detail',
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred while loading detail',
            life: 3000
        });
    } finally {
        detailLoading.value = false;
    }
}

// พิมพ์ใบขึ้นยาง
async function handlePrint(doc) {
    try {
        // โหลดข้อมูล document และ items
        const result = await ReceiveDocService.getReceiveDocDetail(doc.doc_no);

        if (result.success) {
            // คำนวณยอดรวมของ SO และ Receive
            const totalSOQty = (result.details_so || []).reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);
            const totalReceiveQty = (result.details_receive || []).reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);

            // เช็คว่าจำนวนที่รับเท่ากับ SO หรือไม่
            if (totalReceiveQty !== totalSOQty) {
                toast.add({
                    severity: 'warn',
                    summary: 'ไม่สามารถพิมพ์ได้',
                    detail: 'จำนวนที่รับต้องเท่ากับจำนวน PO เท่านั้น',
                    life: 3000
                });
                return;
            }

            // เตรียมข้อมูล document
            printDocumentData.value = doc;

            // แปลง receive details เป็นรูปแบบที่ PrintReceiverDialog ต้องการ
            printItems.value = (result.details_receive || []).map((item) => ({
                item_code: item.item_code,
                item_name: item.item_name || '',
                unit_code: item.unit_code,
                barcode: item.barcode || item.item_code,
                item_year: item.item_year || '',
                qty: parseInt(item.qty) || 0
            }));

            // เปิด Print Dialog
            showPrintDialog.value = true;
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'ไม่สามารถโหลดข้อมูลสำหรับพิมพ์ได้',
                life: 3000
            });
        }
    } catch (error) {
        console.error('Error loading print data:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
            life: 3000
        });
    }
}

function closeDetailDialog() {
    detailDialog.value = false;
    selectedDoc.value = null;
    soDetails.value = [];
    receiveDetails.value = [];
}
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="card">
            <div class="font-semibold text-xl mb-2">ใบรับสินค้า</div>
            <p class="text-muted-color m-0 mb-6">จัดการใบรับสินค้าทั้งหมด</p>

            <!-- Mobile Filters -->
            <div class="lg:hidden mb-4">
                <div class="flex flex-col gap-3">
                    <IconField>
                        <InputIcon class="pi pi-search" />
                        <InputText v-model="searchQuery" placeholder="ค้นหาเลขที่เอกสาร, เจ้าหนี้..." fluid @keyup.enter="handleSearch" />
                    </IconField>
                    <div class="grid grid-cols-2 gap-2">
                        <DatePicker v-model="fromDate" dateFormat="dd-mm-yy" placeholder="จากวันที่" :showIcon="true" fluid />
                        <DatePicker v-model="toDate" dateFormat="dd-mm-yy" placeholder="ถึงวันที่" :showIcon="true" fluid />
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <Button label="ค้นหา" icon="pi pi-search" @click="handleSearch" :loading="loading" fluid />
                        <Button label="รีเฟรช" icon="pi pi-refresh" severity="secondary" @click="loadReceiveDocs" :loading="loading" fluid />
                    </div>
                    <Button label="สร้างใบรับ" icon="pi pi-plus" @click="openCreateDialog" fluid severity="success" />
                </div>
            </div>

            <!-- Desktop Toolbar -->
            <div class="mb-6 hidden lg:block">
                <Toolbar>
                    <template #start>
                        <div class="flex flex-wrap items-center gap-2">
                            <IconField>
                                <InputIcon class="pi pi-search" />
                                <InputText v-model="searchQuery" placeholder="ค้นหาเลขที่เอกสาร, เจ้าหนี้..." style="width: 18rem" @keyup.enter="handleSearch" />
                            </IconField>
                            <DatePicker v-model="fromDate" dateFormat="dd-mm-yy" placeholder="จากวันที่" :showIcon="true" style="width: 11rem" />
                            <DatePicker v-model="toDate" dateFormat="dd-mm-yy" placeholder="ถึงวันที่" :showIcon="true" style="width: 11rem" />
                            <Button label="ค้นหา" icon="pi pi-search" @click="handleSearch" :loading="loading" />
                        </div>
                    </template>

                    <template #end>
                        <div class="flex gap-2">
                            <Button icon="pi pi-refresh" severity="secondary" text rounded v-tooltip.top="'รีเฟรช'" @click="loadReceiveDocs" :loading="loading" />
                            <Button label="สร้างใบรับ" icon="pi pi-plus" @click="openCreateDialog" />
                        </div>
                    </template>
                </Toolbar>
            </div>

            <ReceiveDocTable
                :data="receiveDocs"
                :loading="loading"
                :totalRecords="totalRecords"
                :currentPage="currentPage"
                :pageSize="pageSize"
                mode="default"
                @page-change="onPageChange"
                @view-detail="viewDetail"
                @receive-item="(data) => data.doc_no && router.push({ name: 'receiveitem', params: { docno: data.doc_no } })"
                @send-approve="confirmSendApprove"
                @delete="confirmDelete"
                @print="handlePrint"
            />
        </div>

        <!-- Dialog สร้างใบรับสินค้า -->
        <Dialog v-model:visible="createDialog" :style="{ width: '95vw', maxWidth: '1200px' }" header="สร้างใบรับสินค้า" :modal="true" :draggable="false" position="top" class="create-dialog">
            <!-- Stepper -->
            <div class="mb-4">
                <Stepper :value="currentStep" linear>
                    <StepList>
                        <Step value="1">เลือก PO</Step>
                        <Step value="2">กรอกรายละเอียด</Step>
                    </StepList>
                </Stepper>
            </div>

            <div v-if="currentStep === '1'" class="step-content">
                <!-- Step 1: เลือก PO -->
                <div class="mb-4">
                    <!-- Mobile Search -->
                    <div class="md:hidden space-y-2 mb-3">
                        <InputText v-model="soSearchQuery" placeholder="ค้นหา PO..." fluid @keyup.enter="handleSOSearch" />
                        <div class="grid grid-cols-2 gap-2">
                            <DatePicker :showIcon="true" v-model="soFromDate" dateFormat="dd-mm-yy" placeholder="จากวันที่" fluid />
                            <DatePicker :showIcon="true" v-model="soToDate" dateFormat="dd-mm-yy" placeholder="ถึงวันที่" fluid />
                        </div>
                        <Button label="ค้นหา" icon="pi pi-search" @click="handleSOSearch" :loading="soLoading" fluid />
                    </div>

                    <!-- Desktop Search -->
                    <div class="hidden md:flex flex-wrap items-center gap-2 mb-4">
                        <InputText v-model="soSearchQuery" placeholder="ค้นหา PO..." style="width: 15rem" @keyup.enter="handleSOSearch" />
                        <DatePicker :showIcon="true" v-model="soFromDate" dateFormat="dd-mm-yy" placeholder="จากวันที่" style="width: 12rem" />
                        <DatePicker :showIcon="true" v-model="soToDate" dateFormat="dd-mm-yy" placeholder="ถึงวันที่" style="width: 12rem" />
                        <Button label="ค้นหา" icon="pi pi-search" @click="handleSOSearch" :loading="soLoading" />
                    </div>
                </div>

                <!-- Mobile Card View -->
                <div class="md:hidden space-y-3">
                    <div v-if="soLoading" class="flex items-center justify-center py-8">
                        <i class="pi pi-spin pi-spinner text-3xl mr-2"></i>
                        <span>กำลังโหลด...</span>
                    </div>
                    <div v-else-if="soList.length === 0" class="text-center py-8 text-muted-color">
                        <i class="pi pi-inbox text-4xl mb-2"></i>
                        <p>ไม่พบข้อมูล PO</p>
                    </div>
                    <div v-else>
                        <div
                            v-for="so in soList"
                            :key="so.doc_no"
                            @click.stop="selectSO({ data: so })"
                            class="bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-3 cursor-pointer hover:border-primary transition-colors"
                        >
                            <div class="flex items-start justify-between mb-2">
                                <div class="flex-1">
                                    <div class="font-bold text-primary mb-1">{{ so.doc_no }}</div>
                                    <div class="text-sm text-muted-color">
                                        {{ formatDate(so.doc_date) }}
                                    </div>
                                </div>
                                <i class="pi pi-chevron-right text-muted-color"></i>
                            </div>
                            <div class="text-sm space-y-1">
                                <div><span class="text-muted-color">เจ้าหนี้:</span> {{ so.cust_name }}</div>
                                <div>
                                    <span class="text-muted-color">พนักงานขาย:</span>
                                    {{ so.sale_name || '-' }}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-muted-color">สาขา:</span>
                                    <Tag :value="so.branch_code" severity="secondary" size="small" />
                                </div>
                            </div>
                        </div>

                        <!-- Mobile Pagination -->
                        <div class="flex items-center justify-between mt-4 pt-3 border-t">
                            <Button icon="pi pi-chevron-left" text rounded :disabled="soCurrentPage <= 1" @click="onSOPageChange({ page: soCurrentPage - 2, rows: soPageSize })" />
                            <span class="text-sm">หน้า {{ soCurrentPage }} / {{ soTotalPages }}</span>
                            <Button icon="pi pi-chevron-right" text rounded :disabled="soCurrentPage >= soTotalPages" @click="onSOPageChange({ page: soCurrentPage, rows: soPageSize })" />
                        </div>
                    </div>
                </div>

                <!-- Desktop Table View -->
                <div class="hidden md:block">
                    <DataTable
                        :value="soList"
                        :loading="soLoading"
                        dataKey="doc_no"
                        :lazy="true"
                        :paginator="true"
                        :rows="soPageSize"
                        :totalRecords="soTotalRecords"
                        :rowsPerPageOptions="[10, 20, 50]"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="แสดง {first} ถึง {last} จาก {totalRecords} รายการ"
                        @page="onSOPageChange"
                        scrollable
                        scrollHeight="400px"
                    >
                        <template #empty> ไม่พบข้อมูล PO </template>
                        <template #loading> กำลังโหลดข้อมูล... </template>

                        <Column field="doc_no" header="เลขที่ PO" :sortable="true" style="min-width: 12rem">
                            <template #body="{ data }">
                                <span class="font-semibold text-primary">{{ data.doc_no }}</span>
                            </template>
                        </Column>

                        <Column field="doc_date" header="วันที่" :sortable="true" style="min-width: 10rem">
                            <template #body="{ data }">
                                {{ formatDate(data.doc_date) }}
                            </template>
                        </Column>

                        <Column field="cust_name" header="เจ้าหนี้" :sortable="true" style="min-width: 12rem"></Column>

                        <Column field="sale_name" header="พนักงานขาย" style="min-width: 12rem"></Column>

                        <Column field="branch_code" header="สาขา" :sortable="true" style="min-width: 8rem"></Column>

                        <Column field="remark" header="หมายเหตุ" style="min-width: 15rem"></Column>

                        <Column header="จัดการ" :exportable="false" style="min-width: 10rem">
                            <template #body="slotProps">
                                <Button icon="pi pi-check" label="เลือก" size="small" severity="success" @click.stop="selectSO({ data: slotProps.data })" />
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </div>

            <div v-else-if="currentStep === '2' && selectedSO" class="step-content">
                <!-- Step 2: แสดง SO ที่เลือกและกรอก remark -->
                <div class="flex flex-col gap-4">
                    <div class="bg-primary-50 dark:bg-primary-400/10 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-3">
                            <h6 class="font-semibold mb-0">PO ที่เลือก</h6>
                            <Tag :value="selectedSO.doc_no" severity="info" />
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs text-muted-color block mb-1">วันที่</label>
                                <p class="font-semibold text-sm">{{ formatDate(selectedSO.doc_date) }}</p>
                            </div>
                            <div>
                                <label class="text-xs text-muted-color block mb-1">เจ้าหนี้</label>
                                <p class="font-semibold text-sm">{{ selectedSO.cust_name }}</p>
                            </div>
                            <div>
                                <label class="text-xs text-muted-color block mb-1">พนักงานขาย</label>
                                <p class="font-semibold text-sm">{{ selectedSO.sale_name || '-' }}</p>
                            </div>
                            <div>
                                <label class="text-xs text-muted-color block mb-1">สาขา</label>
                                <Tag :value="selectedSO.branch_code" severity="secondary" size="small" />
                            </div>
                            <div v-if="selectedSO.remark" class="md:col-span-2">
                                <label class="text-xs text-muted-color block mb-1">หมายเหตุ PO</label>
                                <p class="text-sm">{{ selectedSO.remark }}</p>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2">
                        <label for="remark" class="font-semibold">หมายเหตุใบรับสินค้า</label>
                        <Textarea id="remark" v-model="remark" rows="5" placeholder="กรอกหมายเหตุ..." fluid />
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex gap-2 w-full" :class="currentStep === '1' ? 'justify-end' : 'justify-between'">
                    <Button v-if="currentStep === '1'" label="ยกเลิก" icon="pi pi-times" severity="secondary" outlined @click="hideCreateDialog" class="flex-1 md:flex-initial" />
                    <template v-else-if="currentStep === '2'">
                        <Button label="ย้อนกลับ" icon="pi pi-arrow-left" severity="secondary" outlined @click="backToSOList" class="flex-1 md:flex-initial" />
                        <Button label="สร้างใบรับ" icon="pi pi-check" severity="success" @click="createReceiveDoc" :loading="loading" class="flex-1 md:flex-initial" />
                    </template>
                </div>
            </template>
        </Dialog>

        <!-- Dialog รายละเอียดการรับ -->
        <ReceiveDetailDialog v-model:visible="detailDialog" :loading="detailLoading" :document="selectedDoc" :soDetails="soDetails" :receiveDetails="receiveDetails" @close="closeDetailDialog" />

        <!-- Print Receiver Dialog -->
        <PrintReceiverDialog v-model:visible="showPrintDialog" :documentData="printDocumentData" :items="printItems" />
    </div>
</template>

<style scoped lang="scss">
.cursor-pointer :deep(tbody tr) {
    cursor: pointer;
}

// Dialog responsive styles
:deep(.create-dialog) {
    .p-dialog {
        height: auto;
        max-height: 90vh;

        @media (max-width: 768px) {
            margin: 1rem;
            width: calc(100vw - 2rem) !important;
            max-height: calc(100vh - 2rem);
        }
    }

    .p-dialog-content {
        padding: 1rem;
        overflow-y: auto;
        max-height: calc(90vh - 180px);

        @media (max-width: 768px) {
            padding: 0.75rem;
            max-height: calc(100vh - 200px);
        }
    }

    .p-dialog-footer {
        padding: 1rem;
        border-top: 1px solid var(--surface-border);

        @media (max-width: 768px) {
            padding: 0.75rem;
        }
    }
}

.step-content {
    @media (max-width: 768px) {
        .space-y-3 > * + * {
            margin-top: 0.75rem;
        }
    }
}
</style>
