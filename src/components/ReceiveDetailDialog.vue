<script setup>
import { computed } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    },
    document: {
        type: Object,
        default: null
    },
    soDetails: {
        type: Array,
        default: () => []
    },
    receiveDetails: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update:visible', 'close']);

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function handleClose() {
    emit('update:visible', false);
    emit('close');
}

// รวมข้อมูล PO และรายการที่รับแล้ว
const combinedDetails = computed(() => {
    const combined = {};

    // เพิ่มข้อมูลจาก PO
    props.soDetails.forEach((item) => {
        if (!combined[item.item_code]) {
            combined[item.item_code] = {
                item_code: item.item_code,
                item_name: item.item_name,
                unit_code: item.unit_code,
                item_year: item.item_year || '', // เพิ่ม item_year จาก PO
                so_qty: parseInt(item.qty) || 0,
                received_qty: 0,
                details: [] // เก็บรายละเอียดแต่ละ barcode/ปี
            };
        }
    });

    // เพิ่มข้อมูลจากรายการที่รับแล้ว
    props.receiveDetails.forEach((item) => {
        if (!combined[item.item_code]) {
            combined[item.item_code] = {
                item_code: item.item_code,
                item_name: item.item_name,
                unit_code: item.unit_code,
                so_qty: 0,
                received_qty: 0,
                details: []
            };
        }
        combined[item.item_code].received_qty += parseInt(item.qty) || 0;
        combined[item.item_code].details.push({
            barcode: item.barcode || item.item_code,
            item_year: item.item_year || '',
            qty: parseInt(item.qty) || 0
        });
    });

    return Object.values(combined);
});
</script>

<template>
    <Dialog :visible="visible" @update:visible="(val) => emit('update:visible', val)" :style="{ width: '90vw', height: '85vh' }" header="รายละเอียดการรับสินค้า" :modal="true" :draggable="false" :breakpoints="{ '960px': '95vw', '640px': '98vw' }">
        <div v-if="loading" class="flex items-center justify-center py-12">
            <i class="pi pi-spin pi-spinner text-4xl mr-3"></i>
            <span class="text-xl">กำลังโหลดข้อมูล...</span>
        </div>

        <div v-else class="flex flex-col gap-3">
            <!-- Header Info -->
            <div class="bg-primary-50 dark:bg-primary-400/10 rounded-lg p-3">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label class="text-sm text-muted-color">เลขที่เอกสาร</label>
                        <p class="font-semibold text-lg">{{ document?.doc_no }}</p>
                    </div>
                    <div>
                        <label class="text-sm text-muted-color">วันที่</label>
                        <p class="font-semibold">{{ formatDate(document?.doc_date) }}</p>
                    </div>
                    <div>
                        <label class="text-sm text-muted-color">อ้างอิง Po</label>
                        <p class="font-semibold">{{ document?.doc_ref || '-' }}</p>
                    </div>
                    <div>
                        <label class="text-sm text-muted-color">ลูกค้า</label>
                        <p class="font-semibold">{{ document?.cust_name }}</p>
                    </div>
                    <div>
                        <label class="text-sm text-muted-color">พนักงานขาย</label>
                        <p class="font-semibold">{{ document?.sale_name || '-' }}</p>
                    </div>
                    <div>
                        <label class="text-sm text-muted-color">สาขา</label>
                        <p class="font-semibold">{{ document?.branch_code }}</p>
                    </div>
                    <div v-if="document?.remark" class="md:col-span-3">
                        <label class="text-sm text-muted-color">หมายเหตุ</label>
                        <p class="font-semibold">{{ document?.remark }}</p>
                    </div>
                </div>
            </div>

            <!-- Combined SO and Receive Details -->
            <div class="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
                <h6 class="mb-2 font-semibold text-sm">รายการสินค้า</h6>

                <div v-if="combinedDetails.length === 0" class="text-center py-4 text-muted-color">
                    <i class="pi pi-inbox text-3xl mb-2"></i>
                    <p class="text-sm">ไม่พบรายการสินค้า</p>
                </div>

                <div v-else class="space-y-2">
                    <div v-for="(item, idx) in combinedDetails" :key="idx" class="bg-surface-50 dark:bg-surface-800 rounded p-2 lg:p-3 border border-surface-200 dark:border-surface-700">
                        <!-- Desktop Layout -->
                        <div class="hidden lg:block">
                            <div class="flex items-center gap-4">
                                <!-- Item Info (แนวนอน) -->
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="font-semibold text-lg text-primary">{{ item.item_code }}</span>
                                        <Tag :value="item.unit_code" severity="secondary" class="text-sm" />
                                        <Tag v-if="item.item_year" :value="`ปี ${item.item_year}`" severity="warning" class="text-sm" />
                                    </div>
                                    <div class="text-base text-muted-color truncate">{{ item.item_name }}</div>
                                </div>

                                <!-- Quantity Summary (แนวนอน กระชับ) -->
                                <div class="flex items-center gap-3">
                                    <div class="text-center">
                                        <div class="text-sm text-blue-600 dark:text-blue-400">PO</div>
                                        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ item.so_qty }}</div>
                                    </div>
                                    <i class="pi pi-arrow-right text-muted-color text-lg"></i>
                                    <div class="text-center">
                                        <div class="text-sm" :class="item.received_qty >= item.so_qty ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'">รับแล้ว</div>
                                        <div class="text-2xl font-bold" :class="item.received_qty >= item.so_qty ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'">{{ item.received_qty }}</div>
                                    </div>
                                    <i class="pi pi-arrow-right text-muted-color text-lg"></i>
                                    <div class="text-center">
                                        <div class="text-sm text-muted-color">คงเหลือ</div>
                                        <div class="text-2xl font-bold">{{ item.so_qty - item.received_qty }}</div>
                                    </div>
                                </div>

                                <!-- Progress (กระชับ) -->
                                <div class="w-32">
                                    <div class="text-sm font-semibold mb-1 text-center">{{ item.so_qty > 0 ? ((item.received_qty / item.so_qty) * 100).toFixed(0) : 0 }}%</div>
                                    <div class="h-2.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                                        <div
                                            class="h-full transition-all rounded-full"
                                            :class="item.received_qty >= item.so_qty ? 'bg-green-500' : 'bg-orange-500'"
                                            :style="{ width: `${item.so_qty > 0 ? Math.min((item.received_qty / item.so_qty) * 100, 100) : 0}%` }"
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Barcode Details (แสดงด้านล่าง) -->
                            <div v-if="item.details.length > 0" class="mt-3 pt-2 border-t border-surface-200 dark:border-surface-700">
                                <div class="flex flex-wrap gap-2">
                                    <div v-for="(detail, dIdx) in item.details" :key="dIdx" class="bg-surface-0 dark:bg-surface-900 rounded px-3 py-1.5 flex items-center gap-2 border border-surface-200 dark:border-surface-700">
                                        <span class="font-mono text-sm font-semibold text-primary">{{ detail.barcode }}</span>
                                        <span v-if="detail.item_year" class="text-sm font-bold text-orange-600">ปี {{ detail.item_year }}</span>
                                        <Tag :value="`x${detail.qty}`" severity="info" class="text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Mobile Layout -->
                        <div class="lg:hidden">
                            <div class="flex items-center justify-between mb-2">
                                <div class="font-semibold text-lg text-primary">{{ item.item_code }}</div>
                                <Tag :value="item.unit_code" severity="secondary" class="text-base" />
                            </div>
                            <div class="flex items-center gap-2 mb-3">
                                <div class="text-base text-muted-color truncate flex-1">{{ item.item_name }}</div>
                                <Tag v-if="item.item_year" :value="`ปี ${item.item_year}`" severity="warning" class="text-sm" />
                            </div>

                            <div class="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-surface-200 dark:border-surface-700">
                                <div class="bg-blue-50 dark:bg-blue-900/20 rounded p-3 text-center">
                                    <div class="text-sm text-blue-600 dark:text-blue-400 mb-1">จำนวน PO</div>
                                    <div class="text-xl font-bold text-blue-600 dark:text-blue-400">{{ item.so_qty }}</div>
                                </div>
                                <div :class="['rounded p-3 text-center', item.received_qty >= item.so_qty ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20']">
                                    <div class="text-sm mb-1" :class="item.received_qty >= item.so_qty ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'">รับแล้ว</div>
                                    <div class="text-xl font-bold" :class="item.received_qty >= item.so_qty ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'">{{ item.received_qty }}</div>
                                </div>
                                <div class="bg-surface-100 dark:bg-surface-700 rounded p-3 text-center">
                                    <div class="text-sm text-muted-color mb-1">คงเหลือ</div>
                                    <div class="text-xl font-bold">{{ item.so_qty - item.received_qty }}</div>
                                </div>
                            </div>

                            <div class="mb-3">
                                <div class="flex items-center justify-between mb-1.5">
                                    <Tag v-if="item.received_qty >= item.so_qty" value="รับครบแล้ว" severity="success" icon="pi pi-check-circle" class="text-base" />
                                    <Tag v-else-if="item.received_qty > 0" value="รับบางส่วน" severity="warn" icon="pi pi-clock" class="text-base" />
                                    <Tag v-else value="ยังไม่รับ" severity="danger" icon="pi pi-times-circle" class="text-base" />
                                    <span class="text-sm font-semibold">{{ item.so_qty > 0 ? ((item.received_qty / item.so_qty) * 100).toFixed(0) : 0 }}%</span>
                                </div>
                                <div class="h-2.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                                    <div
                                        class="h-full transition-all rounded-full"
                                        :class="item.received_qty >= item.so_qty ? 'bg-green-500' : 'bg-orange-500'"
                                        :style="{ width: `${item.so_qty > 0 ? Math.min((item.received_qty / item.so_qty) * 100, 100) : 0}%` }"
                                    ></div>
                                </div>
                            </div>

                            <div v-if="item.details.length > 0" class="space-y-2.5 pt-3 border-t border-surface-200 dark:border-surface-700">
                                <div v-for="(detail, dIdx) in item.details" :key="dIdx" class="bg-surface-0 dark:bg-surface-900 rounded p-3 flex items-center justify-between border border-surface-200 dark:border-surface-700">
                                    <div class="flex items-center gap-2.5 flex-1 min-w-0">
                                        <i class="pi pi-qrcode text-base text-primary"></i>
                                        <span class="font-mono font-semibold text-base text-primary truncate">{{ detail.barcode }}</span>
                                        <span v-if="detail.item_year" class="text-base font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">ปี {{ detail.item_year }}</span>
                                    </div>
                                    <Tag :value="`x${detail.qty}`" severity="info" class="text-base ml-2" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="ปิด" icon="pi pi-times" @click="handleClose" />
        </template>
    </Dialog>
</template>

<style scoped lang="scss"></style>
