<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import MegaMenu from 'primevue/megamenu';

// Define props
defineProps({
    model: {
        type: Array,
        required: true,
        default: () => []
    },
    orientation: {
        type: String,
        default: 'horizontal'
    }
});

const emit = defineEmits(['menu-click', 'menu-mouseenter']);

// Component refs
const menuRef = ref(null);
const isError = ref(false);
const errorMessage = ref('');

// Error handling function
const handleError = (error, context = 'unknown') => {
    console.warn(`SafeMegaMenu [${context}]:`, error);
    isError.value = true;
    errorMessage.value = `MegaMenu error (${context}): ${error.message || error}`;

    // Prevent error from propagating
    return false;
};

// Safe align overlay function
const safeAlignOverlay = () => {
    try {
        if (!menuRef.value?.$el) {
            return handleError('Element not found', 'alignOverlay');
        }

        const element = menuRef.value.$el;
        if (!element || typeof element.style === 'undefined') {
            return handleError('Element style not accessible', 'alignOverlay');
        }

        // Proceed with alignment
        return true;
    } catch (error) {
        return handleError(error, 'alignOverlay');
    }
};

// Safe orientation change handler
const handleOrientationChange = () => {
    try {
        if (!menuRef.value) {
            return;
        }

        // Add small delay to ensure DOM is ready
        nextTick(() => {
            setTimeout(() => {
                safeAlignOverlay();
            }, 10);
        });
    } catch (error) {
        handleError(error, 'orientationChange');
    }
};

// Initialize error handling
const initializeErrorHandling = () => {
    try {
        // Add resize listener
        const handleResize = () => {
            handleOrientationChange();
        };

        window.addEventListener('resize', handleResize);

        // Store cleanup function
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    } catch (error) {
        handleError(error, 'initialize');
    }
};

// Life cycle hooks
onMounted(() => {
    try {
        // Small delay to ensure DOM is mounted
        setTimeout(() => {
            handleOrientationChange();
        }, 100);

        // Initialize error handling
        const cleanup = initializeErrorHandling();

        // Store cleanup for unmount
        if (cleanup) {
            onUnmounted(() => {
                cleanup();
            });
        }
    } catch (error) {
        handleError(error, 'onMounted');
    }
});

// Retry function for error recovery
const retryOperation = () => {
    isError.value = false;
    errorMessage.value = '';
    handleOrientationChange();
};

// Manual retry button
const retryButton = ref(null);
</script>

<template>
    <div class="safe-megamenu-container">
        <div v-if="isError" class="error-recovery-container p-4 border border-orange-300 bg-orange-50 rounded-lg">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="pi pi-exclamation-triangle text-orange-500"></i>
                    <span class="text-orange-800 font-medium">MegaMenu Error</span>
                </div>
                <Button ref="retryButton" type="button" icon="pi pi-refresh" label="Retry" severity="secondary" size="small" @click="retryOperation" />
            </div>
            <p class="text-orange-700 text-sm mt-2">{{ errorMessage }}</p>
        </div>

        <div v-else>
            <MegaMenu ref="menuRef" :model="model" :orientation="orientation" @menu-click="emit('menu-click', $event)" @menu-mouseenter="emit('menu-mouseenter', $event)" />
        </div>
    </div>
</template>

<style scoped>
.safe-megamenu-container {
    width: 100%;
}

.error-recovery-container {
    margin-bottom: 1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .error-recovery-container {
        margin: 0.5rem;
    }
}
</style>
