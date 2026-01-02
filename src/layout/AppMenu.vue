<script setup>
import { ref, computed, onMounted } from 'vue';
import AuthService from '@/service/AuthService';
import AppMenuItem from './AppMenuItem.vue';

const isSuperAdmin = ref(false);
const permissions = ref(null);

onMounted(() => {
    isSuperAdmin.value = AuthService.isSuperAdmin();
    permissions.value = AuthService.getPermissions();
});

const model = computed(() => {
    const menu = [];

    // Dashboard - แสดงทุกคน
    menu.push({
        label: 'หน้าหลัก',
        items: [
            {
                label: 'Dashboard',
                icon: 'pi pi-fw pi-home',
                to: '/'
            }
        ]
    });

    // เมนูหลักสำหรับ Production
    if (permissions.value) {
        const mainMenuItems = [];

        // เมนูรับสินค้า
        if (permissions.value.receive_screen === '1') {
            mainMenuItems.push(
                {
                    label: 'รับสินค้าจาก PO',
                    icon: 'pi pi-fw pi-file-check',
                    to: '/pages/receivedoc'
                },
                {
                    label: 'รายการรับสินค้า',
                    icon: 'pi pi-fw pi-check-circle',
                    to: '/pages/closejobreceive'
                }
            );
        }

        // เมนูประวัติ
        if (permissions.value.history_screen === '1') {
            mainMenuItems.push({
                label: 'ประวัติ',
                icon: 'pi pi-fw pi-history',
                to: '/pages/receivehistory'
            });
        }

        // เพิ่มเมนูหลักถ้ามีรายการ
        if (mainMenuItems.length > 0) {
            menu.push({
                label: 'เมนูหลัก',
                items: mainMenuItems
            });
        }
    }

    // เพิ่มเมนู "กำหนดสิทธิ์" สำหรับ SUPERADMIN หรือ admin_screen = '1'
    if (isSuperAdmin.value || (permissions.value && permissions.value.admin_screen === '1')) {
        menu.push({
            label: 'Admin',
            items: [
                {
                    label: 'กำหนดสิทธิ์เข้าเมนู',
                    icon: 'pi pi-fw pi-shield',
                    to: '/pages/permissions'
                }
            ]
        });
    }

    return menu;
});
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
