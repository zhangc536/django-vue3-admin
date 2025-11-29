import * as api from './api';
import { CreateCrudOptionsProps, CreateCrudOptionsRet, AddReq, DelReq, EditReq, dict } from '@fast-crud/fast-crud';

export const createCrudOptions = function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
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
  
  return {
    crudOptions: {
      request: { pageRequest, addRequest, editRequest, delRequest },
      rowHandle: {
        fixed: 'right',
        width: 120,
        buttons: {
          view: { show: false },
          edit: { type: 'text' },
          remove: { type: 'text' },
          custom: { show: false },
        },
      },
      columns: {
        _index: {
          title: '序号',
          form: { show: false },
          column: {
            align: 'center',
            width: '70px',
            columnSetDisabled: true,
            formatter: (context) => {
              let index = context.index ?? 1;
              let pagination = crudExpose!.crudBinding.value.pagination;
              return ((pagination!.currentPage ?? 1) - 1) * pagination!.pageSize + index + 1;
            },
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
            component: { props: { clearable: true } },
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
              context.form.time_quick = value;
              if (Array.isArray(r) && r.length === 2) {
                context.form.start_date = r[0];
                context.form.end_date = r[1];
              } else if (typeof r === 'string' && r) {
                context.form.start_date = r;
                context.form.end_date = r;
              }
            },
            valueChange: {
              async handle({ value, form }: any) {
                const baseForm = form ?? {};
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
                const next = { ...baseForm, time_quick: value, date: r };
                if (Array.isArray(r) && r.length === 2) {
                  next.start_date = r[0];
                  next.end_date = r[1];
                } else if (typeof r === 'string' && r) {
                  next.start_date = r;
                  next.end_date = r;
                }
                crudExpose!.setSearchFormData({ form: next });
                crudExpose!.doSearch({});
              },
            },
          },
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
                delete context.form.time_quick;
                context.form.start_date = value[0];
                context.form.end_date = value[1];
              }
            },
            valueChange(key: any, value: any, form: any) {
              const baseForm = form ?? {};
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
              crudExpose!.doSearch();
            },
          },
          form: { component: { props: { valueFormat: 'YYYY-MM-DD' } }, value: new Date().toLocaleDateString('en-CA') },
          column: { minWidth: 140 },
        },
        customer_name: {
          title: '客户姓名',
          type: 'input',
          search: { show: true, component: { props: { clearable: true, placeholder: '请输入客户姓名' } } },
          column: { minWidth: 160 },
        },
        amount: {
          title: '金额',
          type: 'number',
          form: { component: { props: { min: 0, step: 0.01 } } },
          column: { minWidth: 120 },
        },
        reminder_datetime: { form: { show: false }, column: { show: false } },
        is_reminded: { form: { show: false }, column: { show: false } },
      },
    },
  };
};
