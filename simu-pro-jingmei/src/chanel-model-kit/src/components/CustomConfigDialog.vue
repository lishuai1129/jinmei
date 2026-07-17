<template>
  <ModelConfigDialog
    :visible="visible"
    model-type="custom"
    :position="position"
    :node-id="nodeId"
    :initial-config="initialConfig"
    @confirm="emit('confirm', $event)"
    @cancel="emit('cancel')"
    @update:visible="emit('update:visible', $event)"
  />
</template>

<script setup lang="ts">
import ModelConfigDialog from './ModelConfigDialog.vue'
import type { ChannelModelFormData } from '../config/models'

withDefaults(
  defineProps<{
    visible?: boolean
    position?: { lat?: number; lon?: number; alt?: number }
    nodeId?: number
    initialConfig?: Partial<ChannelModelFormData>
  }>(),
  {
    visible: true,
    position: () => ({ lat: 0, lon: 0, alt: 0 }),
    initialConfig: () => ({}),
  },
)

const emit = defineEmits<{
  confirm: [data: ChannelModelFormData & { modelType: string; nodeId?: number }]
  cancel: []
  'update:visible': [visible: boolean]
}>()
</script>
