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
        
        
        
        customer_name: {
          title: '客户姓名',
          type: 'input',
          search: { show: true, component: { props: { clearable: true, placeholder: '请输入客户姓名' } } },
          column: { minWidth: 160 },
        },
        amount: {
          title: '成本金额',
          type: 'number',
          form: { component: { props: { min: 0, step: 0.01 } } },
          column: { minWidth: 120 },
        },
        income: {
          title: '金额',
          type: 'number',
          form: { show: false },
          column: { minWidth: 120 },
        },
        reminder_datetime: { form: { show: false }, column: { show: false } },
        is_reminded: { form: { show: false }, column: { show: false } },
      },
    },
  };
};
