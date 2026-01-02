<script setup>
import PermissionService from '@/service/PermissionService';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const toast = useToast();
const dt = ref();
const users = ref([]);
const userDialog = ref(false);
const user = ref({});
const submitted = ref(false);
const loading = ref(false);
const searchQuery = ref('');
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

// โหลดข้อมูลสิทธิ์ทั้งหมด
onMounted(async () => {
    await loadPermissions();
});

async function loadPermissions(search = '') {
    loading.value = true;
    try {
        const result = await PermissionService.getPermissions(search);
        if (result.success) {
            users.value = result.data;
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: result.message || 'Failed to load permissions',
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred while loading permissions',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function openEditDialog(userData) {
    user.value = { ...userData };
    submitted.value = false;
    userDialog.value = true;
}

function hideDialog() {
    userDialog.value = false;
    submitted.value = false;
}

async function savePermission() {
    submitted.value = true;
    loading.value = true;

    try {
        const result = await PermissionService.updatePermission({
            user: user.value.code,
            receive_screen: user.value.receive_screen,
            admin_screen: user.value.admin_screen,
            history_screen: user.value.history_screen
        });

        if (result.success) {
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Permission updated successfully',
                life: 3000
            });

            // รีโหลดข้อมูล
            await loadPermissions(searchQuery.value);

            userDialog.value = false;
            user.value = {};
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: result.message || 'Failed to update permission',
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred while updating permission',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
}

function getPermissionLabel(value) {
    return value === '1' ? 'เข้าได้' : 'เข้าไม่ได้';
}

function getPermissionSeverity(value) {
    return value === '1' ? 'success' : 'danger';
}

async function handleSearch() {
    await loadPermissions(searchQuery.value);
}
</script>

<template>
    <div>
        <div class="card">
            <div class="font-semibold text-xl mb-2">จัดการสิทธิ์ผู้ใช้</div>
            <p class="text-muted-color">กำหนดสิทธิ์การเข้าถึงหน้าต่างๆ ในระบบสำหรับผู้ใช้แต่ละคน</p>

            <Toolbar class="mb-6">
                <template #start>
                    <div class="flex items-center gap-2">
                        <InputText v-model="searchQuery" placeholder="ค้นหาผู้ใช้..." class="w-full md:w-[20rem]" @keyup.enter="handleSearch" />
                        <Button label="ค้นหา" icon="pi pi-search" @click="handleSearch" :loading="loading" />
                    </div>
                </template>

                <template #end>
                    <Button label="รีเฟรช" icon="pi pi-refresh" severity="secondary" @click="loadPermissions(searchQuery)" :loading="loading" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:filters="filters"
                :value="users"
                :loading="loading"
                dataKey="code"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[5, 10, 20, 50]"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="แสดง {first} ถึง {last} จาก {totalRecords} รายการ"
            >
                <template #empty> ไม่พบข้อมูล </template>
                <template #loading> กำลังโหลดข้อมูล... </template>

                <Column field="code" header="รหัสผู้ใช้" :sortable="true" style="min-width: 12rem">
                    <template #body="{ data }">
                        <span class="font-semibold">{{ data.code }}</span>
                    </template>
                </Column>

                <Column field="name_1" header="ชื่อผู้ใช้" :sortable="true" style="min-width: 12rem"></Column>

                <Column field="receive_screen" header="หน้ารับเอกสาร" :sortable="true" style="min-width: 10rem">
                    <template #body="{ data }">
                        <Tag :value="getPermissionLabel(data.receive_screen)" :severity="getPermissionSeverity(data.receive_screen)" />
                    </template>
                </Column>

                <Column field="admin_screen" header="หน้าจัดการระบบ" :sortable="true" style="min-width: 10rem">
                    <template #body="{ data }">
                        <Tag :value="getPermissionLabel(data.admin_screen)" :severity="getPermissionSeverity(data.admin_screen)" />
                    </template>
                </Column>

                <Column field="history_screen" header="หน้าประวัติ" :sortable="true" style="min-width: 10rem">
                    <template #body="{ data }">
                        <Tag :value="getPermissionLabel(data.history_screen)" :severity="getPermissionSeverity(data.history_screen)" />
                    </template>
                </Column>

                <Column :exportable="false" style="min-width: 8rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="openEditDialog(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Dialog แก้ไขสิทธิ์ -->
        <Dialog v-model:visible="userDialog" :style="{ width: '500px' }" header="แก้ไขสิทธิ์ผู้ใช้" :modal="true">
            <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-2">
                    <label for="code" class="font-bold">รหัสผู้ใช้</label>
                    <InputText id="code" v-model.trim="user.code" disabled />
                </div>

                <div class="flex flex-col gap-2">
                    <label for="name" class="font-bold">ชื่อผู้ใช้</label>
                    <InputText id="name" v-model.trim="user.name_1" disabled />
                </div>

                <div class="flex flex-col gap-3">
                    <label class="font-bold">หน้ารับเอกสาร</label>
                    <div class="flex gap-6">
                        <div class="flex items-center">
                            <RadioButton v-model="user.receive_screen" inputId="receive1" value="1" name="receive" />
                            <label for="receive1" class="ml-2">เข้าได้</label>
                        </div>
                        <div class="flex items-center">
                            <RadioButton v-model="user.receive_screen" inputId="receive0" value="0" name="receive" />
                            <label for="receive0" class="ml-2">เข้าไม่ได้</label>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-3">
                    <label class="font-bold">หน้าจัดการระบบ</label>
                    <div class="flex gap-6">
                        <div class="flex items-center">
                            <RadioButton v-model="user.admin_screen" inputId="admin1" value="1" name="admin" />
                            <label for="admin1" class="ml-2">เข้าได้</label>
                        </div>
                        <div class="flex items-center">
                            <RadioButton v-model="user.admin_screen" inputId="admin0" value="0" name="admin" />
                            <label for="admin0" class="ml-2">เข้าไม่ได้</label>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-3">
                    <label class="font-bold">หน้าประวัติ</label>
                    <div class="flex gap-6">
                        <div class="flex items-center">
                            <RadioButton v-model="user.history_screen" inputId="history1" value="1" name="history" />
                            <label for="history1" class="ml-2">เข้าได้</label>
                        </div>
                        <div class="flex items-center">
                            <RadioButton v-model="user.history_screen" inputId="history0" value="0" name="history" />
                            <label for="history0" class="ml-2">เข้าไม่ได้</label>
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="ยกเลิก" icon="pi pi-times" text @click="hideDialog" />
                <Button label="บันทึก" icon="pi pi-check" @click="savePermission" :loading="loading" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped lang="scss"></style>
