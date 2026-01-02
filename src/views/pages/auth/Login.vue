<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import AuthService from '@/service/AuthService';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();

// Form fields
const provider_name = ref('');
const database_name = ref('');
const user_code = ref('');
const password = ref('');
const checked = ref(false);
const loading = ref(false);

// โหลดข้อมูลที่จำไว้เมื่อ component mount
onMounted(() => {
    const savedCredentials = localStorage.getItem('rememberedCredentials');
    if (savedCredentials) {
        try {
            const credentials = JSON.parse(savedCredentials);
            provider_name.value = credentials.provider_name || '';
            database_name.value = credentials.database_name || '';
            user_code.value = credentials.user_code || '';
            password.value = credentials.password || '';
            checked.value = true;
        } catch (error) {
            console.error('Failed to load saved credentials:', error);
        }
    }
});

// Login function
const handleLogin = async () => {
    // Validation
    if (!user_code.value || !password.value) {
        toast.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'Please fill in all required fields',
            life: 3000
        });
        return;
    }

    loading.value = true;

    try {
        const result = await AuthService.login({
            provider_name: provider_name.value,
            database_name: database_name.value,
            user_code: user_code.value,
            password: password.value
        });

        if (result.success) {
            // บันทึกข้อมูล user
            AuthService.saveUser(result.user);

            // บันทึก provider และ database context
            AuthService.saveLoginContext(provider_name.value, database_name.value);

            // จัดการ Remember Me
            if (checked.value) {
                // บันทึกข้อมูลเข้าสู่ระบบ
                const credentials = {
                    provider_name: provider_name.value,
                    database_name: database_name.value,
                    user_code: user_code.value,
                    password: password.value
                };
                localStorage.setItem('rememberedCredentials', JSON.stringify(credentials));
            } else {
                // ลบข้อมูลที่บันทึกไว้
                localStorage.removeItem('rememberedCredentials');
            }

            // ดึงสิทธิ์ผู้ใช้
            const permissionResult = await AuthService.fetchUserPermission(user_code.value, provider_name.value, database_name.value);

            if (permissionResult.success) {
                // บันทึกสิทธิ์
                AuthService.savePermissions(permissionResult.permissions);
            }

            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Login successful',
                life: 3000
            });

            // Redirect ไปหน้า dashboard
            setTimeout(() => {
                router.push('/');
            }, 1000);
        } else {
            toast.add({
                severity: 'error',
                summary: 'Login Failed',
                detail: result.message || 'Invalid username or password',
                life: 3000
            });
        }
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An error occurred during login',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <FloatingConfigurator />
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
        <div class="flex flex-col items-center justify-center">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                    <div class="text-center mb-8">
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Welcome to Samai Receiver!</div>
                        <span class="text-muted-color font-medium">Sign in to continue</span>
                    </div>

                    <form @submit.prevent="handleLogin">
                        <div class="mb-6">
                            <label for="provider" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">Provider Name</label>
                            <InputText id="provider" type="text" v-model="provider_name" class="w-full md:w-[30rem]" />
                        </div>

                        <div class="mb-6">
                            <label for="database" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">Database Name</label>
                            <InputText id="database" type="text" v-model="database_name" class="w-full md:w-[30rem]" />
                        </div>

                        <div class="mb-6">
                            <label for="usercode" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">User Code <span class="text-red-500">*</span></label>
                            <InputText id="usercode" type="text" placeholder="Enter user code" v-model="user_code" class="w-full md:w-[30rem]" required />
                        </div>

                        <div class="mb-4">
                            <label for="password" class="block text-surface-900 dark:text-surface-0 font-medium mb-2">Password <span class="text-red-500">*</span></label>
                            <Password id="password" v-model="password" placeholder="Enter password" :toggleMask="true" fluid :feedback="false" required />
                        </div>

                        <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                            <div class="flex items-center">
                                <Checkbox v-model="checked" id="rememberme" binary class="mr-2" />
                                <label for="rememberme">Remember me</label>
                            </div>
                        </div>

                        <Button type="submit" label="Sign In" :loading="loading" class="w-full" />
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pi-eye {
    transform: scale(1.6);
    margin-right: 1rem;
}

.pi-eye-slash {
    transform: scale(1.6);
    margin-right: 1rem;
}
</style>
