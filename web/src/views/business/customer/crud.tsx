import * as api from './api';
import { UserPageQuery, AddReq, DelReq, EditReq, CreateCrudOptionsProps, CreateCrudOptionsRet, dict, compute } from '@fast-crud/fast-crud';
import { ElMessage } from 'element-plus';
import { ref, nextTick } from 'vue';
import XEUtils from 'xe-utils';
import mittBus from '/@/utils/mitt';

export const createCrudOptions = function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const pageRequest = async (query: any) => {
    const q = query || {};
    const raw = crudExpose?.getSearchFormData?.() ?? {};
    const current = raw.form ?? raw ?? {};
    const f = { ...(q.form || {}), ...(current || {}) };
    if (q.time_quick) {
      q.date = getRange(q.time_quick);
      delete q.time_quick;
    }
    if (f.time_quick) {
      q.date = getRange(f.time_quick);
      delete f.time_quick;
    }
    // 统一为 start_date / end_date
    if (!q.start_date && Array.isArray(q.date) && q.date.length === 2) {
      q.start_date = q.date[0];
      q.end_date = q.date[1];
      delete q.date;
    } else if (!q.start_date && typeof q.date === 'string' && q.date) {
      q.start_date = q.date;
      q.end_date = q.date;
      delete q.date;
    } else if (!q.start_date && Array.isArray(f.date) && f.date.length === 2) {
      q.start_date = f.date[0];
      q.end_date = f.date[1];
      delete f.date;
    } else if (!q.start_date && typeof f.date === 'string' && f.date) {
      q.start_date = f.date;
      q.end_date = f.date;
      delete f.date;
    }
    if (q.start_date) f.start_date = q.start_date;
    if (q.end_date) f.end_date = q.end_date;
    q.form = f;
    return await api.GetList(q);
  };
  const addRequest = async ({ form }: AddReq) => {
    if (!form.date) {
      form.date = new Date().toLocaleDateString('en-CA');
    }
    return await api.AddObj(form);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };
  const formatYmd = (d: Date) => d.toLocaleDateString('en-CA');
  const getRange = (type: string) => {
    const now = new Date();
    if (type === 'day') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return formatYmd(s);
    }
    if (type === 'month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return [formatYmd(s), formatYmd(e)];
    }
    if (type === 'year') {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = new Date(now.getFullYear(), 11, 31);
      return [formatYmd(s), formatYmd(e)];
    }
    return [] as any;
  };
  const ceilMonthsFromDate = (base: Date) => {
    if (!base || isNaN(base.getTime())) return 0;
    const today = new Date();
    const b = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (t.getTime() < b.getTime()) return 0;
    let months = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
    const boundary = new Date(b.getFullYear(), b.getMonth() + months, b.getDate());
    if (boundary.getTime() > t.getTime()) months += 1;
    if (months <= 0) months = 1;
    return months;
  };
  const toBoolean = (v: any) => {
    if (v === true || v === 'true' || v === 'True' || v === 1 || v === '1') return true;
    if (v === false || v === 'false' || v === 'False' || v === 0 || v === '0') return false;
    return !!v;
  };
  const isMobile = ref<boolean>(document.body.clientWidth < 768);
  mittBus.on('layoutMobileResize', (res: any) => {
    isMobile.value = res.clientWidth < 768;
  });
  return {
    crudOptions: {
      request: { pageRequest, addRequest, editRequest, delRequest },
      table: {
        rowKey: 'id',
        onSelectionChange(changed: any) {
          const tableData = crudExpose.getTableData();
          const unChanged = tableData.filter((row: any) => !changed.includes(row));
          XEUtils.arrayEach(changed, (item: any) => {
            const ids = XEUtils.pluck(selectedRows.value, 'id');
            if (!ids.includes(item.id)) {
              selectedRows.value = XEUtils.union(selectedRows.value, [item]);
            }
          });
          XEUtils.arrayEach(unChanged, (unItem: any) => {
            selectedRows.value = XEUtils.remove(selectedRows.value, (item: any) => item.id !== unItem.id);
          });
        },
        onRefreshed: () => toggleRowSelection(),
      },
      actionbar: {
        buttons: {
          batchPaid: {
            text: '批量标记缴费',
            type: 'primary',
            click: async () => {
              const rows = selectedRows.value ?? [];
              const ids = rows.map((r: any) => r.id);
              if (!ids.length) {
                ElMessage.error('请先选择数据');
                return;
              }
              await api.BulkMarkPaid(ids);
              ElMessage.success('批量标记缴费成功');
              crudExpose!.doRefresh();
            },
          },
          batchUnpaid: {
            text: '批量标记未缴费',
            click: async () => {
              const rows = selectedRows.value ?? [];
              const ids = rows.map((r: any) => r.id);
              if (!ids.length) {
                ElMessage.error('请先选择数据');
                return;
              }
              await api.BulkMarkUnpaid(ids);
              ElMessage.success('批量标记未缴费成功');
              crudExpose!.doRefresh();
            },
          },
          batchDelete: {
            text: '批量删除',
            type: 'danger',
            click: async () => {
              const rows = selectedRows.value ?? [];
              const ids = rows.map((r: any) => r.id);
              if (!ids.length) {
                ElMessage.error('请先选择数据');
                return;
              }
              await api.BulkDelete(ids);
              ElMessage.success('批量删除成功');
              crudExpose!.doRefresh();
            },
          },
        },
      },
      rowHandle: {
        fixed: 'right',
        width: compute(() => (isMobile.value ? 140 : 220)),
        buttons: {
          view: { show: false },
          edit: { type: 'text' },
          remove: { type: 'text' },
          togglePaid: {
            text: '缴费/取消',
            order: 11,
            click: async ({ row }: any) => {
              try {
                const needPay = toBoolean(row.is_need_pay);
                const paid = toBoolean(row.is_paid);
                if (paid || !needPay) {
                  await api.MarkUnpaid(row.id);
                  ElMessage.success('已取消缴费');
                } else {
                  await api.MarkPaid(row.id);
                  ElMessage.success('已确认缴费');
                }
                crudExpose!.doRefresh();
              } catch (e) {
                ElMessage.error('操作失败');
                console.error(e);
              }
            },
            show: compute(({ row }) => toBoolean(row.is_need_pay) && !toBoolean(row.is_paid)),
          },
        },
      },
      columns: {
        _index: {
          title: '序号',
          form: { show: false },
          column: {
            align: 'center',
            width: '70px',
            show: compute(() => !isMobile.value),
            columnSetDisabled: true,
            formatter: (context) => {
              let index = context.index ?? 1;
              let pagination = crudExpose!.crudBinding.value.pagination;
              return ((pagination!.currentPage ?? 1) - 1) * pagination!.pageSize + index + 1;
            },
          },
        },
        $checked: {
          title: '选择',
          form: { show: false },
          column: {
            type: 'selection',
            align: 'center',
            width: compute(() => (isMobile.value ? '40px' : '60px')),
            columnSetDisabled: true,
          },
        },
        time_quick: {
          title: '时间筛选',
          type: 'dict-select',
          column: { show: false },
          form: { show: false },
          dict: dict({
            data: [
              { label: '今天', value: 'day' },
              { label: '本月', value: 'month' },
              { label: '今年', value: 'year' },
            ],
          }),
          search: {
            show: true,
            component: {
              props: {
                clearable: true,
              },
            },
            valueResolve(context: any) {
              const { value } = context;
              if (!value) {
                delete context.form.date;
                delete context.form.time_quick;
                delete context.form.start_date;
                delete context.form.end_date;
                return;
              }
              const r = getRange(value);
              context.form.date = r;
              if (Array.isArray(r) && r.length === 2) {
                context.form.start_date = r[0];
                context.form.end_date = r[1];
              } else if (typeof r === 'string' && r) {
                context.form.start_date = r;
                context.form.end_date = r;
              }
              context.form.time_quick = value;
            },
            valueChange: {
              async handle({ value, form }: any) {
                const baseForm = form ?? (crudExpose?.getSearchFormData?.()?.form ?? {});
                if (!value) {
                  const next = { ...baseForm };
                  delete next.date;
                  delete next.time_quick;
                  delete next.start_date;
                  delete next.end_date;
                  crudExpose!.setSearchFormData({ form: next });
                  crudExpose!.doSearch({});
                  return;
                }
                const r = getRange(value);
                const next = { ...baseForm };
                const payload: any = { ...next, time_quick: value, date: r };
                if (Array.isArray(r) && r.length === 2) {
                  payload.start_date = r[0];
                  payload.end_date = r[1];
                } else if (typeof r === 'string' && r) {
                  payload.start_date = r;
                  payload.end_date = r;
                }
                crudExpose!.setSearchFormData({ form: payload });
                crudExpose!.doSearch({});
              }
            },
          },
        },
        
        name: {
          title: '客户名称',
          type: 'input',
          search: {
            show: true,
            component: {
              props: {
                clearable: true,
                placeholder: '请输入客户名称',
              },
            },
          },
          column: { minWidth: compute(() => (isMobile.value ? 140 : 150)) },
        },
        amount: {
          title: '收款金额',
          type: 'number',
          form: { component: { props: { min: 0, step: 0.01 } } },
          column: { minWidth: compute(() => (isMobile.value ? 120 : 140)) },
        },
        reminder_datetime: { form: { show: false }, column: { show: false } },
        net_fee: {
          title: '网费/电费',
          type: 'text',
          form: { show: false },
          column: {
            show: compute(() => !isMobile.value),
            minWidth: 160,
            formatter({ row }: any) {
              const base = row.date ? new Date(row.date) : null;
              if (!base || isNaN(base.getTime())) return '0';
              const m = ceilMonthsFromDate(base);
              const dev = Math.max(0, Number(row.device || 0));
              return String(70 * m * dev);
            },
          },
        },
        electric_fee: {
          title: '电费',
          type: 'number',
          form: { show: false },
          column: { show: false },
        },
        depreciation_fee: {
          title: '设备折旧费',
          type: 'text',
          form: { show: false },
          column: {
            show: compute(() => !isMobile.value),
            minWidth: 140,
            formatter({ row }: any) {
              const dev = Math.max(0, Number(row.device || 0));
              return String(500 * dev);
            },
          },
        },
        device: {
          title: '设备',
          type: 'number',
          form: { component: { props: { min: 0 } } },
          column: { minWidth: 140, show: compute(() => !isMobile.value) },
        },
        date: {
          title: '日期',
          type: 'date',
          search: {
            show: true,
            component: { type: 'daterange', props: { valueFormat: 'YYYY-MM-DD' } },
            valueResolve(context: any) {
              const { value } = context;
              if (value && Array.isArray(value) && value.length === 2) {
                context.form.date = value;
                delete context.form.date_start;
                delete context.form.date_end;
                delete context.form.time_quick;
                context.form.start_date = value[0];
                context.form.end_date = value[1];
              }
            },
            valueChange(key: any, value: any, form: any) {
              const baseForm = form ?? (crudExpose?.getSearchFormData?.()?.form ?? {});
              if (!value || !Array.isArray(value) || value.length !== 2) {
                const next = { ...baseForm };
                delete next.date;
                delete next.start_date;
                delete next.end_date;
                crudExpose!.setSearchFormData({ form: next });
                crudExpose!.doSearch({});
                return;
              }
              const next = { ...baseForm };
              delete next.time_quick;
              crudExpose!.setSearchFormData({ form: { ...next, date: value, start_date: value[0], end_date: value[1] } });
              crudExpose!.doSearch({});
            },
          },
          form: { component: { props: { valueFormat: 'YYYY-MM-DD' } }, value: new Date().toLocaleDateString('en-CA') },
          column: { minWidth: compute(() => (isMobile.value ? 120 : 140)) },
        },
        reminder_months: {
          title: '下次缴费时间',
          type: 'number',
          form: { component: { props: { min: 1, step: 1, placeholder: '请输入月数' } } },
          column: {
            show: compute(() => !isMobile.value),
            minWidth: 160,
            formatter({ row }: any) {
              const dt = row.reminder_datetime ? new Date(row.reminder_datetime) : null;
              const next = dt && !isNaN(dt.getTime())
                ? dt
                : (() => {
                    const months = Number(row.reminder_months || 0);
                    const base = row.date ? new Date(row.date) : new Date();
                    if (!months || isNaN(months)) return null as any;
                    return new Date(base.getTime() + months * 30 * 24 * 60 * 60 * 1000);
                  })();
              if (!next || isNaN(next.getTime())) return '';
              const y = next.getFullYear();
              const m = String(next.getMonth() + 1).padStart(2, '0');
              const d = String(next.getDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            },
          },
        },
        is_need_pay: {
          title: '是否需要缴费',
          type: 'dict-select',
          dict: dict({
            data: [
              { label: '需缴费', value: true },
              { label: '不需缴费', value: false },
            ],
          }),
          form: { show: false },
          column: { minWidth: compute(() => (isMobile.value ? 90 : 100)) },
          search: {
            show: true,
            component: { type: 'dict-select', props: { clearable: true, placeholder: '请选择' } },
            valueResolve(context: any) {
              context.form.is_need_pay = context.value;
            },
          },
        },
        uploader: {
          title: '上传者',
          type: 'input',
          form: { disabled: true },
          column: { minWidth: 160, show: compute(() => !isMobile.value) },
        },
        remark: {
          title: '备注',
          type: 'dict-select',
          dict: dict({
            data: [
              { label: '梯子费', value: '梯子费' },
              { label: '管理费', value: '管理费' },
              { label: '安装费', value: '安装费' },
            ],
          }),
          form: { component: { props: { clearable: true, multiple: true, collapseTags: true, placeholder: '请选择备注类型' } } },
          column: {
            show: compute(() => !isMobile.value),
            minWidth: 220,
            formatter({ row }: any) {
              const v = row.remark;
              if (Array.isArray(v)) return v.join('、');
              if (typeof v === 'string') return v.split(',').filter(Boolean).join('、');
              return '';
            },
          },
          valueBuilder(context: any) {
            const v = context.value;
            if (Array.isArray(v)) return v;
            if (typeof v === 'string') return v.split(',').filter(Boolean);
            return [];
          },
          valueResolve(context: any) {
            const v = context.form.remark;
            if (Array.isArray(v)) context.form.remark = v.join(',');
          },
        },
      },
    },
  };
};

// 记录选中的行并在刷新后回显
const selectedRows = ref<any>([]);
const toggleRowSelection = () => {
  const tableRef = (crudExpose as any).getBaseTableRef?.();
  const tableData = (crudExpose as any).getTableData?.();
  if (!tableRef || !tableData) return;
  const selected = XEUtils.filter(tableData, (item: any) => {
    const ids = XEUtils.pluck(selectedRows.value, 'id');
    return ids.includes(item.id);
  });
  nextTick(() => {
    XEUtils.arrayEach(selected, (item) => {
      tableRef.toggleRowSelection(item, true);
    });
  });
};
