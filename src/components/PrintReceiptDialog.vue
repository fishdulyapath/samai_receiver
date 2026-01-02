<script setup>
import { computed } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    documentData: {
        type: Object,
        required: true
    },
    items: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update:visible']);

// คำนวณรวมจำนวน
const totalQty = computed(() => {
    return props.items.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);
});

// ฟังก์ชันพิมพ์
const handlePrint = () => {
    // Get HTML to print from element
    const prtHtml = document.getElementById('print').innerHTML;

    // Get all stylesheets HTML
    let stylesHtml = '';
    for (const node of [...document.querySelectorAll('link[rel="stylesheet"], style')]) {
        stylesHtml += node.outerHTML;
    }

    // Open the print window
    const WinPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

    WinPrint.document.write(`<!DOCTYPE html>
<html>
  <head>
    ${stylesHtml}
  </head>
  <body>
    ${prtHtml}
  </body>
</html>`);

    WinPrint.document.close();
    WinPrint.focus();
    WinPrint.print();
    WinPrint.close();

    // ปิด Dialog หลังจากพิมพ์
    closeDialog();
};

// ปิด Dialog
const closeDialog = () => {
    emit('update:visible', false);
};

// Format วันที่
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

// Format เวลา
const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
};
</script>

<template>
    <Dialog :visible="visible" @update:visible="closeDialog" modal header="พิมพ์ใบรับ" :style="{ width: '450px' }" :dismissableMask="true">
        <div class="print-confirm-content">
            <div class="flex flex-col items-center gap-3 py-4">
                <h3 class="text-xl font-semibold">พร้อมพิมพ์ใบรับหรือไม่?</h3>
                <div class="text-center text-muted-color">
                    <p class="mb-2">
                        เลขที่: <span class="font-semibold text-primary">{{ documentData.doc_no || '-' }}</span>
                    </p>
                    <p class="mb-2">
                        ลูกค้า: <span class="font-semibold">{{ documentData.cust_name || '-' }}</span>
                    </p>
                    <p>
                        จำนวนสินค้า: <span class="font-semibold text-primary">{{ totalQty }} ชิ้น</span>
                    </p>
                </div>
                <p class="text-sm text-muted-color mt-2">คุณสามารถปรับขนาดกระดาษได้ในหน้าต่างพิมพ์</p>
            </div>

            <!-- เนื้อหาที่จะพิมพ์ (ซ่อนใน dialog) -->
            <div id="print" class="print-area no-print" style="display: none">
                <div class="slip-header">
                    <h1 class="slip-title">ใบรับสินค้า</h1>
                    <div class="slip-divider"></div>
                    <div class="slip-info">
                        <div class="info-line">วันที่: {{ formatDate(documentData.doc_date || documentData.close_date) }} {{ formatTime(documentData.doc_time || documentData.close_time) }}</div>
                        <div class="info-line">เลขที่บิล: {{ documentData.doc_no || '-' }}</div>
                        <div class="info-line">เลขที่ PO: {{ documentData.doc_ref || '-' }}</div>
                        <div class="info-line">ลูกค้า: {{ documentData.cust_name || '-' }}</div>
                        <div class="info-line">พนักงาน: {{ documentData.user_close_name || documentData.sale_name || '-' }}</div>
                    </div>
                    <div class="slip-divider"></div>
                </div>

                <div class="slip-items">
                    <div class="slip-item" v-for="(item, index) in items" :key="index">
                        <div class="item-main">
                            <span class="item-number">{{ index + 1 }}.</span>
                            <span class="item-desc">{{ item.item_code }} {{ item.item_name ? '- ' + item.item_name : '' }}</span>
                        </div>
                        <div class="item-detail">
                            <span class="detail-left">{{ item.unit_code || 'เส้น' }}</span>
                            <span class="detail-right">x{{ item.qty || 0 }}</span>
                        </div>
                    </div>
                    <div v-if="items.length === 0" class="empty-slip">ไม่มีรายการสินค้า</div>
                </div>

                <div class="slip-footer">
                    <div class="slip-divider"></div>
                    <div class="slip-total">
                        <span class="total-text">รวมจำนวนสินค้า</span>
                        <span class="total-amount">{{ totalQty }} ชิ้น</span>
                    </div>
                    <div class="slip-divider"></div>

                    <div class="slip-signatures">
                        <div class="sig-item">
                            <div class="sig-label">ผู้จัดสินค้า</div>
                            <div class="sig-line"></div>
                            <div class="sig-date">วันที่ ___/___/______</div>
                        </div>

                        <div class="sig-item">
                            <div class="sig-label">ผู้อนุมัติ</div>
                            <div class="sig-line"></div>
                            <div class="sig-date">วันที่ ___/___/______</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex gap-2">
                <Button label="ยกเลิก" icon="pi pi-times" @click="closeDialog" severity="secondary" outlined />
                <Button label="พิมพ์" icon="pi pi-print" @click="handlePrint" autofocus />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.print-confirm-content {
    text-align: center;
}

.print-area {
    font-family: 'Sarabun', 'Noto Sans Thai', monospace;
    max-width: 80mm;
    margin: 0 auto;
    font-size: 12px;
    line-height: 1.4;
}

.slip-header {
    margin-bottom: 10px;
}

.slip-title {
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 8px;
    color: #000;
}

.slip-divider {
    border-top: 1px dashed #333;
    margin: 6px 0;
}

.slip-info {
    margin: 8px 0;
}

.info-line {
    font-size: 11px;
    margin-bottom: 2px;
    color: #000;
}

.slip-items {
    margin: 8px 0;
}

.slip-item {
    margin-bottom: 8px;
}

.item-main {
    display: flex;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: #000;
    margin-bottom: 2px;
}

.item-number {
    font-weight: bold;
    color: #333;
    min-width: 10px;
}

.item-desc {
    flex: 1;
}

.item-detail {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #555;
    padding-left: 4px;
}

.detail-left {
    color: #2d7a2d;
    font-weight: 500;
}

.detail-right {
    font-weight: bold;
    color: #000;
}

.empty-slip {
    color: #999;
    font-style: italic;
    text-align: center;
    padding: 20px;
}

.slip-footer {
    margin-top: 12px;
}

.slip-total {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: bold;
    padding: 6px 0;
    color: #000;
}

.total-text {
    text-transform: uppercase;
}

.total-amount {
    font-size: 14px;
}

.slip-signatures {
    margin-top: 15px;
}

.sig-item {
    margin-bottom: 20px;
}

.sig-label {
    font-size: 11px;
    font-weight: 600;
    color: #000;
    margin-bottom: 3px;
}

.sig-line {
    border-bottom: 1px solid #000;
    margin: 20px 0 3px 0;
}

.sig-date {
    font-size: 10px;
    color: #666;
}

@media print {
    body * {
        visibility: hidden;
    }

    .print-area,
    .print-area * {
        visibility: visible;
        display: block !important;
    }

    .print-area {
        position: absolute;
        left: 50%;
        top: 0;
        transform: translateX(-50%);
        width: 80mm;
        max-width: 80mm;
        padding: 10mm;
        background: white;
        page-break-after: avoid;
        box-sizing: border-box;
    }

    .no-print {
        display: block !important;
    }

    .slip-header,
    .slip-items,
    .slip-footer {
        page-break-inside: avoid;
    }

    .slip-item {
        page-break-inside: avoid;
    }

    .slip-header,
    .slip-items,
    .slip-footer {
        page-break-inside: avoid;
    }

    .slip-item {
        page-break-inside: avoid;
    }

    .detail-left {
        color: #2d7a2d !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .slip-footer {
        margin-top: 6mm;
        page-break-inside: avoid;
    }

    .slip-total {
        font-size: 12px;
    }

    .slip-signatures {
        margin-top: 8mm;
        page-break-before: avoid;
    }

    .sig-item {
        margin-bottom: 12mm;
    }

    .sig-line {
        margin: 12mm 0 2mm 0;
    }

    @page {
        size: auto;
        margin: 8mm;
    }
}
</style>
