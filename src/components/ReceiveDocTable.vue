<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['page-change', 'receive-item', 'send-approve', 'delete', 'close-job', 'view-detail', 'row-click', 'print', 'view-images']);

const dt = ref();

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // แสดงแค่ HH:MM
}

function formatNumber(value) {
    const num = parseFloat(value) || 0;
    return num.toFixed(2);
}

function onPageChange(event) {
    emit('page-change', {
        page: event.page + 1,
        rows: event.rows
    });
}

function canApprove(docData) {
    const soQty = parseInt(docData.so_qty) || 0;
    const receiveQty = parseInt(docData.receive_qty) || 0;
    return soQty === receiveQty && docData.can_approve === '1';
}

function canPrint(docData) {
    const soQty = parseInt(docData.so_qty) || 0;
    const receiveQty = parseInt(docData.receive_qty) || 0;
    return soQty === receiveQty;
}

const props = defineProps({
    data: {
        type: Array,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    },
    totalRecords: {
        type: Number,
        default: 0
    },
    currentPage: {
        type: Number,
        default: 1
    },
    pageSize: {
        type: Number,
        default: 20
    },
    mode: {
        type: String,
        default: 'default',
        validator: (value) => ['default', 'close', 'history'].includes(value)
    },
    showCloseDateTime: {
        type: Boolean,
        default: false
    }
});

function onMobilePageChange(direction) {
    const newPage = direction === 'next' ? props.currentPage : props.currentPage - 2;
    emit('page-change', {
        page: newPage,
        rows: props.pageSize
    });
}

const totalPages = computed(() => Math.ceil(props.totalRecords / props.pageSize));
</script>

<template>
    <!-- Mobile Card View -->
    <div class="lg:hidden space-y-3">
        <div v-if="loading" class="flex items-center justify-center py-8">
            <i class="pi pi-spin pi-spinner text-3xl mr-2"></i>
            <span>กำลังโหลด...</span>
        </div>
        <div v-else-if="data.length === 0" class="flex flex-col items-center justify-center py-8 text-muted-color">
            <i class="pi pi-inbox text-4xl mb-2"></i>
            <p>ไม่พบข้อมูล</p>
        </div>
        <div v-else>
            <div v-for="doc in data" :key="doc.doc_no" class="bg-surface-0 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg p-4">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                        <div class="font-semibold text-primary text-lg mb-1">{{ doc.doc_no }}</div>
                        <div v-if="showCloseDateTime && doc.close_date" class="flex items-center gap-2 text-sm text-muted-color mb-1">
                            <i class="pi pi-calendar"></i>
                            <span>ปิดงาน: {{ formatDate(doc.close_date) }}</span>
                            <i class="pi pi-clock"></i>
                            <span>{{ formatTime(doc.close_time) }}</span>
                        </div>
                        <div v-else class="flex items-center gap-2 text-sm text-muted-color">
                            <i class="pi pi-calendar"></i>
                            <span>{{ formatDate(doc.doc_date) }}</span>
                        </div>
                    </div>
                    <Tag v-if="mode === 'history'" value="ปิดงานแล้ว" severity="secondary" />
                </div>

                <div class="space-y-2 mb-3">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-muted-color">SO:</span>
                        <Tag v-if="doc.doc_ref" :value="doc.doc_ref" severity="info" />
                        <span v-else class="text-muted-color">-</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-muted-color">จำนวนที่ต้องรับ:</span>
                        <Tag :value="formatNumber(doc.so_qty)" severity="info" class="font-bold" />
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-muted-color">จำนวนรับ:</span>
                        <Tag :value="doc.receive_qty?.toString() || '0'" :severity="canApprove(doc) ? 'success' : 'warn'" class="font-bold" />
                    </div>
                </div>

                <!-- Mobile Actions -->
                <div v-if="mode === 'default'" class="flex flex-col gap-2 pt-3 border-t" @click.stop>
                    <Button icon="pi pi-eye" label="ดูรายละเอียด" size="small" severity="info" @click="emit('view-detail', doc)" fluid />
                    <Button icon="pi pi-box" label="รับสินค้า" size="small" severity="success" @click="emit('receive-item', doc)" fluid />
                    <div class="grid grid-cols-2 gap-2">
                        <Button icon="pi pi-send" label="ส่งอนุมัติ" size="small" severity="info" :disabled="!canApprove(doc)" @click="emit('send-approve', doc)" />
                        <Button icon="pi pi-trash" label="ลบ" size="small" severity="danger" @click="emit('delete', doc)" />
                    </div>
                    <Button v-if="canPrint(doc)" icon="pi pi-print" label="พิมพ์" size="small" severity="secondary" @click="emit('print', doc)" fluid outlined />
                </div>

                <div v-if="mode === 'close'" class="flex flex-col gap-2 pt-3 border-t" @click.stop>
                    <Button icon="pi pi-eye" label="ดูรายละเอียด" size="small" severity="info" @click="emit('view-detail', doc)" fluid class="mb-2" />
                    <div class="grid grid-cols-2 gap-2">
                        <Button icon="pi pi-check-circle" label="ปิดงาน" size="small" severity="success" @click="emit('close-job', doc)" />
                        <Button icon="pi pi-images" label="รูปภาพ" size="small" severity="help" @click="emit('view-images', doc)" outlined :badge="doc.image_count > 0 ? String(doc.image_count) : null" badgeClass="p-badge-success" />
                    </div>
                    <Button v-if="canPrint(doc)" icon="pi pi-print" label="พิมพ์" size="small" severity="secondary" @click="emit('print', doc)" fluid outlined />
                </div>

                <div v-if="mode === 'history'" class="flex flex-col gap-2 pt-3 border-t" @click.stop>
                    <Button icon="pi pi-eye" label="ดูรายละเอียด" size="small" severity="info" @click="emit('view-detail', doc)" fluid />
                    <div class="grid grid-cols-2 gap-2">
                        <Button v-if="canPrint(doc)" icon="pi pi-print" label="พิมพ์" size="small" severity="secondary" @click="emit('print', doc)" outlined />
                        <Button icon="pi pi-images" label="รูปภาพ" size="small" severity="help" @click="emit('view-images', doc)" outlined :badge="doc.image_count > 0 ? String(doc.image_count) : null" badgeClass="p-badge-success" />
                    </div>
                </div>
            </div>

            <!-- Mobile Pagination -->
            <div class="flex items-center justify-between mt-4 pt-3 border-t">
                <Button icon="pi pi-chevron-left" text rounded :disabled="currentPage <= 1" @click="onMobilePageChange('prev')" />
                <span class="text-sm text-muted-color">หน้า {{ currentPage }} / {{ totalPages }}</span>
                <Button icon="pi pi-chevron-right" text rounded :disabled="currentPage >= totalPages" @click="onMobilePageChange('next')" />
            </div>
        </div>
    </div>

    <!-- Desktop Table View -->
    <DataTable
        ref="dt"
        class="hidden lg:block"
        :value="data"
        :loading="loading"
        dataKey="doc_no"
        :lazy="true"
        :paginator="true"
        :rows="pageSize"
        :totalRecords="totalRecords"
        :rowsPerPageOptions="[10, 20, 50, 100]"
        :rowHover="true"
        stripedRows
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="แสดง {first} ถึง {last} จาก {totalRecords} รายการ"
        @page="onPageChange"
    >
        <template #empty>
            <div class="flex flex-col items-center justify-center py-6">
                <i class="pi pi-inbox text-4xl text-muted-color mb-4"></i>
                <span class="text-muted-color">ไม่พบข้อมูล</span>
            </div>
        </template>
        <template #loading>
            <div class="flex items-center justify-center py-6">
                <i class="pi pi-spin pi-spinner text-2xl mr-2"></i>
                <span>กำลังโหลดข้อมูล...</span>
            </div>
        </template>

        <!-- 1. วันที่ / วันที่ปิดงาน -->
        <Column v-if="showCloseDateTime" field="close_date" header="วันที่ปิดงาน" :sortable="true" style="min-width: 14rem">
            <template #body="{ data }">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                        <i class="pi pi-calendar text-green-500"></i>
                        <span class="font-semibold">{{ formatDate(data.close_date) }}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-muted-color">
                        <i class="pi pi-clock"></i>
                        <span>{{ formatTime(data.close_time) }}</span>
                    </div>
                </div>
            </template>
        </Column>
        <Column v-else field="doc_date" header="วันที่" :sortable="true" style="min-width: 10rem">
            <template #body="{ data }">
                <div class="flex items-center gap-2">
                    <i class="pi pi-calendar text-muted-color"></i>
                    <span>{{ formatDate(data.doc_date) }}</span>
                </div>
            </template>
        </Column>

        <!-- 2. เลขที่ใบรับ -->
        <Column field="doc_no" header="เลขที่ใบรับ" :sortable="true" style="min-width: 14rem">
            <template #body="{ data }">
                <span class="font-semibold text-primary">{{ data.doc_no }}</span>
            </template>
        </Column>

        <!-- 3. เลขที่ PO -->
        <Column field="doc_ref" header="เลขที่ PO" :sortable="true" style="min-width: 12rem">
            <template #body="{ data }">
                <Tag v-if="data.doc_ref" :value="data.doc_ref" severity="info" />
                <span v-else class="text-muted-color">-</span>
            </template>
        </Column>

        <!-- 4. จำนวนที่ต้องรับ (SO Qty) -->
        <Column field="so_qty" header="จำนวนที่ต้องรับ" :sortable="true" style="min-width: 10rem">
            <template #body="{ data }">
                <div class="flex items-center gap-2">
                    <i class="pi pi-box text-blue-500"></i>
                    <Tag :value="formatNumber(data.so_qty)" severity="info" class="font-bold" />
                </div>
            </template>
        </Column>

        <!-- 5. จำนวนรับ (Receive Qty) - เน้นให้เด่น -->
        <Column field="receive_qty" header="จำนวนรับ" :sortable="true" style="min-width: 10rem">
            <template #body="{ data }">
                <div class="flex items-center gap-2">
                    <i class="pi pi-check-circle text-green-500"></i>
                    <Tag :value="data.receive_qty?.toString() || '0'" :severity="canApprove(data) ? 'success' : 'warn'" class="font-bold text-lg" />
                </div>
            </template>
        </Column>

        <!-- 6. เมนูจัดการ -->
        <!-- Default Mode: ใบรับสินค้า -->
        <Column v-if="mode === 'default'" header="จัดการ" :exportable="false" style="min-width: 28rem">
            <template #body="slotProps">
                <div class="flex flex-wrap gap-2" @click.stop>
                    <Button icon="pi pi-eye" label="ดูรายละเอียด" size="small" severity="info" @click="emit('view-detail', slotProps.data)" v-tooltip.top="'ดูรายละเอียด'" />
                    <Button icon="pi pi-box" label="รับสินค้า" size="small" severity="success" @click="emit('receive-item', slotProps.data)" v-tooltip.top="'เริ่มรับสินค้า'" />
                    <Button
                        icon="pi pi-send"
                        label="ส่งอนุมัติ"
                        size="small"
                        severity="info"
                        :disabled="!canApprove(slotProps.data)"
                        @click="emit('send-approve', slotProps.data)"
                        v-tooltip.top="canApprove(slotProps.data) ? 'ส่งอนุมัติ' : 'รอรับสินค้าให้ครบก่อน'"
                    />
                    <Button icon="pi pi-trash" label="ลบ" size="small" severity="danger" @click="emit('delete', slotProps.data)" v-tooltip.top="'ลบใบรับ'" />
                    <Button v-if="canPrint(slotProps.data)" icon="pi pi-print" label="พิมพ์" size="small" severity="secondary" outlined @click="emit('print', slotProps.data)" v-tooltip.top="'พิมพ์ใบรับ'" />
                </div>
            </template>
        </Column>

        <!-- Close Mode: ปิดงานใบรับ -->
        <Column v-if="mode === 'close'" header="จัดการ" :exportable="false" style="min-width: 24rem">
            <template #body="slotProps">
                <div class="flex flex-wrap gap-2" @click.stop>
                    <Button icon="pi pi-eye" label="ดูรายละเอียด" size="small" severity="info" @click="emit('view-detail', slotProps.data)" v-tooltip.top="'ดูรายละเอียด'" />
                    <Button icon="pi pi-check-circle" label="ปิดงาน" size="small" severity="success" @click="emit('close-job', slotProps.data)" v-tooltip.top="'ปิดงาน'" />
                    <Button
                        icon="pi pi-images"
                        label="รูปภาพ"
                        size="small"
                        severity="help"
                        @click="emit('view-images', slotProps.data)"
                        outlined
                        v-tooltip.top="'จัดการรูปภาพ'"
                        :badge="slotProps.data.image_count > 0 ? String(slotProps.data.image_count) : null"
                        badgeClass="p-badge-success"
                    />
                    <Button v-if="canPrint(slotProps.data)" icon="pi pi-print" label="พิมพ์" size="small" severity="secondary" outlined @click="emit('print', slotProps.data)" v-tooltip.top="'พิมพ์ใบรับ'" />
                </div>
            </template>
        </Column>

        <!-- History Mode: ประวัติใบรับ -->
        <Column v-if="mode === 'history'" header="สถานะ" style="min-width: 8rem">
            <template #body>
                <Tag value="ปิดงานแล้ว" severity="secondary" />
            </template>
        </Column>

        <!-- History Mode: จัดการ -->
        <Column v-if="mode === 'history'" header="จัดการ" :exportable="false" style="min-width: 20rem">
            <template #body="slotProps">
                <div class="flex flex-wrap gap-2" @click.stop>
                    <Button icon="pi pi-eye" label="ดูรายละเอียด" size="small" severity="info" @click="emit('view-detail', slotProps.data)" v-tooltip.top="'ดูรายละเอียด'" />
                    <Button
                        icon="pi pi-images"
                        label="รูปภาพ"
                        size="small"
                        severity="help"
                        @click="emit('view-images', slotProps.data)"
                        outlined
                        v-tooltip.top="'ดูรูปภาพ'"
                        :badge="slotProps.data.image_count > 0 ? String(slotProps.data.image_count) : null"
                        badgeClass="p-badge-success"
                    />
                    <Button v-if="canPrint(slotProps.data)" icon="pi pi-print" label="พิมพ์" size="small" severity="secondary" outlined @click="emit('print', slotProps.data)" v-tooltip.top="'พิมพ์ใบรับ'" />
                </div>
            </template>
        </Column>
    </DataTable>
</template>

<style scoped lang="scss"></style>
