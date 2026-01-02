<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import ReceiveDocService from '@/service/ReceiveDocService';

const toast = useToast();
const loading = ref(false);

// Date filters
const now = new Date();
const fromDate = ref(now);
const toDate = ref(now);

// Stats
const stats = ref({
    pending: 0, // SO ค้างรับ (status=0 + receive_qty < so_qty)
    received: 0, // รับแล้ว (status=0 + receive_qty === so_qty)
    waiting: 0, // รออนุมัติ (status=1)
    completed: 0 // ตรวจแล้ว (status=2)
});

onMounted(async () => {
    await loadDashboardStats();
});

function formatDateForAPI(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadDashboardStats() {
    loading.value = true;
    try {
        const fromDateStr = formatDateForAPI(fromDate.value);
        const toDateStr = formatDateForAPI(toDate.value);

        // ดึงข้อมูลแต่ละสถานะแบบ parallel
        const [status0Result, status1Result, status2Result] = await Promise.all([
            ReceiveDocService.getReceiveDocListByStatus('', fromDateStr, toDateStr, 0, 1, 999999),
            ReceiveDocService.getReceiveDocListByStatus('', fromDateStr, toDateStr, 1, 1, 1),
            ReceiveDocService.getReceiveDocListByStatus('', fromDateStr, toDateStr, 2, 1, 1)
        ]);

        // Status 0: แยก SO ค้างรับ และ รับแล้ว
        if (status0Result.success) {
            const status0Data = status0Result.data || [];
            stats.value.pending = status0Data.filter((doc) => {
                const soQty = parseInt(doc.so_qty) || 0;
                const receiveQty = parseInt(doc.receive_qty) || 0;
                return receiveQty < soQty;
            }).length;

            stats.value.received = status0Data.filter((doc) => {
                const soQty = parseInt(doc.so_qty) || 0;
                const receiveQty = parseInt(doc.receive_qty) || 0;
                return receiveQty === soQty;
            }).length;
        }

        // Status 1: รออนุมัติ
        if (status1Result.success) {
            stats.value.waiting = status1Result.total || 0;
        }

        // Status 2: ตรวจแล้ว
        if (status2Result.success) {
            stats.value.completed = status2Result.total || 0;
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

async function handleSearch() {
    await loadDashboardStats();
}
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="card">
            <div class="font-semibold text-xl mb-2">Dashboard</div>
            <p class="text-muted-color m-0 mb-6">ภาพรวมสถิติการรับสินค้า</p>

            <!-- Filters -->
            <div class="mb-6">
                <div class="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
                    <div class="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                        <DatePicker v-model="fromDate" dateFormat="dd-mm-yy" placeholder="จากวันที่" :showIcon="true" fluid class="sm:w-auto" />
                        <DatePicker v-model="toDate" dateFormat="dd-mm-yy" placeholder="ถึงวันที่" :showIcon="true" fluid class="sm:w-auto" />
                        <Button label="ค้นหา" icon="pi pi-search" @click="handleSearch" :loading="loading" class="sm:w-auto" />
                    </div>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- PO ค้างรับ -->
                <div class="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="bg-orange-500 text-white rounded-xl p-3">
                            <i class="pi pi-clock text-2xl"></i>
                        </div>
                        <Tag :value="stats.pending.toString()" severity="warning" class="text-xl font-bold px-4 py-2" />
                    </div>
                    <div class="text-orange-900 dark:text-orange-100 font-semibold text-lg mb-1">PO ค้างรับ</div>
                    <div class="text-orange-600 dark:text-orange-400 text-sm">ยังรับไม่ครบตามใบสั่ง</div>
                </div>

                <!-- รับแล้ว -->
                <div class="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="bg-blue-500 text-white rounded-xl p-3">
                            <i class="pi pi-box text-2xl"></i>
                        </div>
                        <Tag :value="stats.received.toString()" severity="info" class="text-xl font-bold px-4 py-2" />
                    </div>
                    <div class="text-blue-900 dark:text-blue-100 font-semibold text-lg mb-1">รับแล้ว</div>
                    <div class="text-blue-600 dark:text-blue-400 text-sm">รับครบแล้ว พร้อมส่งอนุมัติ</div>
                </div>

                <!-- รออนุมัติ -->
                <div class="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="bg-purple-500 text-white rounded-xl p-3">
                            <i class="pi pi-send text-2xl"></i>
                        </div>
                        <Tag :value="stats.waiting.toString()" severity="secondary" class="text-xl font-bold px-4 py-2" />
                    </div>
                    <div class="text-purple-900 dark:text-purple-100 font-semibold text-lg mb-1">รออนุมัติ</div>
                    <div class="text-purple-600 dark:text-purple-400 text-sm">ส่งอนุมัติแล้ว รอตรวจสอบ</div>
                </div>

                <!-- ตรวจแล้ว -->
                <div class="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="bg-green-500 text-white rounded-xl p-3">
                            <i class="pi pi-check-circle text-2xl"></i>
                        </div>
                        <Tag :value="stats.completed.toString()" severity="success" class="text-xl font-bold px-4 py-2" />
                    </div>
                    <div class="text-green-900 dark:text-green-100 font-semibold text-lg mb-1">ตรวจแล้ว</div>
                    <div class="text-green-600 dark:text-green-400 text-sm">ผ่านการตรวจสอบแล้ว</div>
                </div>
            </div>

            <!-- Loading Overlay -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss"></style>
