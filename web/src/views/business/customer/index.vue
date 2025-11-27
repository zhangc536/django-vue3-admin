<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding"></fs-crud>
  </fs-page>
  
</template>

<script lang="ts" setup name="customer">
import { ref, onMounted } from 'vue';
import { useFs } from '@fast-crud/fast-crud';
import { createCrudOptions } from './crud';

const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

onMounted(() => {
  crudExpose.setSearchFormData({ form: { time_quick: 'day' } });
  crudExpose.doSearch();
});
</script>
