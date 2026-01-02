import AppLayout from '@/layout/AppLayout.vue';
import AuthService from '@/service/AuthService';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            meta: { requiresAuth: true },
            children: [
                {
                    path: '/',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue')
                },
                {
                    path: '/uikit/formlayout',
                    name: 'formlayout',
                    component: () => import('@/views/uikit/FormLayout.vue')
                },
                {
                    path: '/uikit/input',
                    name: 'input',
                    component: () => import('@/views/uikit/InputDoc.vue')
                },
                {
                    path: '/uikit/button',
                    name: 'button',
                    component: () => import('@/views/uikit/ButtonDoc.vue')
                },
                {
                    path: '/uikit/table',
                    name: 'table',
                    component: () => import('@/views/uikit/TableDoc.vue')
                },
                {
                    path: '/uikit/list',
                    name: 'list',
                    component: () => import('@/views/uikit/ListDoc.vue')
                },
                {
                    path: '/uikit/tree',
                    name: 'tree',
                    component: () => import('@/views/uikit/TreeDoc.vue')
                },
                {
                    path: '/uikit/panel',
                    name: 'panel',
                    component: () => import('@/views/uikit/PanelsDoc.vue')
                },

                {
                    path: '/uikit/overlay',
                    name: 'overlay',
                    component: () => import('@/views/uikit/OverlayDoc.vue')
                },
                {
                    path: '/uikit/media',
                    name: 'media',
                    component: () => import('@/views/uikit/MediaDoc.vue')
                },
                {
                    path: '/uikit/message',
                    name: 'message',
                    component: () => import('@/views/uikit/MessagesDoc.vue')
                },
                {
                    path: '/uikit/file',
                    name: 'file',
                    component: () => import('@/views/uikit/FileDoc.vue')
                },
                {
                    path: '/uikit/menu',
                    name: 'menu',
                    component: () => import('@/views/uikit/MenuDoc.vue')
                },
                {
                    path: '/uikit/charts',
                    name: 'charts',
                    component: () => import('@/views/uikit/ChartDoc.vue')
                },
                {
                    path: '/uikit/misc',
                    name: 'misc',
                    component: () => import('@/views/uikit/MiscDoc.vue')
                },
                {
                    path: '/uikit/timeline',
                    name: 'timeline',
                    component: () => import('@/views/uikit/TimelineDoc.vue')
                },
                {
                    path: '/blocks',
                    name: 'blocks',
                    meta: {
                        breadcrumb: ['Prime Blocks', 'Free Blocks']
                    },
                    component: () => import('@/views/utilities/Blocks.vue')
                },
                {
                    path: '/pages/empty',
                    name: 'empty',
                    component: () => import('@/views/pages/Empty.vue')
                },
                {
                    path: '/pages/crud',
                    name: 'crud',
                    component: () => import('@/views/pages/Crud.vue')
                },
                {
                    path: '/documentation',
                    name: 'documentation',
                    component: () => import('@/views/pages/Documentation.vue')
                },
                {
                    path: '/pages/permissions',
                    name: 'permissions',
                    meta: { requiresAuth: true, requiresAdminPermission: true },
                    component: () => import('@/views/pages/Permissions.vue')
                },
                {
                    path: '/pages/receivedoc',
                    name: 'receivedoc',
                    meta: { requiresAuth: true, requiresReceivePermission: true },
                    component: () => import('@/views/pages/ReceiveDoc.vue')
                },
                {
                    path: '/pages/receiveitem/:docno',
                    name: 'receiveitem',
                    meta: { requiresAuth: true, requiresReceivePermission: true },
                    component: () => import('@/views/pages/ReceiveItem.vue')
                },
                {
                    path: '/pages/closejobreceive',
                    name: 'closejobreceive',
                    meta: { requiresAuth: true, requiresReceivePermission: true },
                    component: () => import('@/views/pages/CloseJobReceive.vue')
                },
                {
                    path: '/pages/receivehistory',
                    name: 'receivehistory',
                    meta: { requiresAuth: true, requiresHistoryPermission: true },
                    component: () => import('@/views/pages/ReceiveHistory.vue')
                }
            ]
        },
        {
            path: '/landing',
            name: 'landing',
            component: () => import('@/views/pages/Landing.vue')
        },
        {
            path: '/pages/notfound',
            name: 'notfound',
            component: () => import('@/views/pages/NotFound.vue')
        },

        {
            path: '/auth/login',
            name: 'login',
            component: () => import('@/views/pages/auth/Login.vue')
        },
        {
            path: '/auth/access',
            name: 'accessDenied',
            component: () => import('@/views/pages/auth/Access.vue')
        },
        {
            path: '/auth/error',
            name: 'error',
            component: () => import('@/views/pages/auth/Error.vue')
        }
    ]
});

// Router Guard - ตรวจสอบ authentication และ authorization
router.beforeEach((to, from, next) => {
    const isAuthenticated = AuthService.isAuthenticated();
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
    const requiresReceivePermission = to.matched.some((record) => record.meta.requiresReceivePermission);
    const requiresHistoryPermission = to.matched.some((record) => record.meta.requiresHistoryPermission);
    const requiresAdminPermission = to.matched.some((record) => record.meta.requiresAdminPermission);

    // ตรวจสอบ authentication
    if (requiresAuth && !isAuthenticated) {
        // ถ้าหน้านั้นต้อง login แต่ยังไม่ได้ login ให้ redirect ไปหน้า login
        next({ name: 'login' });
    } else if (to.name === 'login' && isAuthenticated) {
        // ถ้า login แล้วแต่พยายามเข้าหน้า login อีก ให้ redirect ไปหน้าแรก
        next({ path: '/' });
    } else if (requiresReceivePermission && !AuthService.hasPermission('receive_screen')) {
        // ถ้าหน้านั้นต้องสิทธิ์ receive_screen แต่ไม่มีสิทธิ์
        next({ name: 'accessDenied' });
    } else if (requiresHistoryPermission && !AuthService.hasPermission('history_screen')) {
        // ถ้าหน้านั้นต้องสิทธิ์ history_screen แต่ไม่มีสิทธิ์
        next({ name: 'accessDenied' });
    } else if (requiresAdminPermission && !AuthService.isSuperAdmin() && !AuthService.hasPermission('admin_screen')) {
        // ถ้าหน้านั้นต้องสิทธิ์ admin (SUPERADMIN หรือ admin_screen) แต่ไม่มีสิทธิ์
        next({ name: 'accessDenied' });
    } else {
        // ปกติให้ผ่าน
        next();
    }
});

export default router;
