import * as api from './api';
import { UserPageQuery, AddReq, DelReq, EditReq, CreateCrudOptionsProps, CreateCrudOptionsRet, dict } from '@fast-crud/fast-crud';

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
  return {
    crudOptions: {
      request: { pageRequest, addRequest, editRequest, delRequest },
      rowHandle: {
        fixed: 'right',
        width: 180,
        buttons: {
          view: { show: false },
          edit: { type: 'text' },
          remove: { type: 'text' },
          sendReminder: {
            text: '发送提醒',
            order: 10,
            click: async ({ row }: any) => {
              await api.SendReminder(row.id);
              crudExpose!.doRefresh();
            },
            show: (ctx: any) => !ctx.row.is_reminded,
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
          column: { minWidth: 150 },
        },
        amount: {
          title: '收款金额',
          type: 'number',
          form: { component: { props: { min: 0, step: 0.01 } } },
          column: { minWidth: 140 },
        },
        reminder_datetime: {
          title: '提醒时间',
          type: 'datetime',
          form: { component: { props: { valueFormat: 'YYYY-MM-DD HH:mm:ss' } } },
          column: { minWidth: 180 },
        },
        is_reminded: {
          title: '已提醒',
          type: 'switch',
          form: { show: false },
          column: { minWidth: 100 },
        },
        net_fee: {
          title: '网费/电费',
          type: 'number',
          form: { component: { props: { min: 0, step: 0.01 } } },
          column: {
            minWidth: 160,
            formatter({ row }: any) {
              const a = row.net_fee ?? null;
              const b = row.electric_fee ?? null;
              const fa = typeof a === 'number' || typeof a === 'string' ? a : '';
              const fb = typeof b === 'number' || typeof b === 'string' ? b : '';
              return `${fa}${fa !== '' || fb !== '' ? '/' : ''}${fb}`;
            },
          },
        },
        electric_fee: {
          title: '电费',
          type: 'number',
          form: { component: { props: { min: 0, step: 0.01 } } },
          column: { show: false },
        },
        depreciation_fee: {
          title: '设备折旧费',
          type: 'number',
          form: { component: { props: { min: 0, step: 0.01 } } },
          column: { minWidth: 140 },
        },
        device: {
          title: '设备',
          type: 'number',
          form: { component: { props: { min: 0 } } },
          column: { minWidth: 140 },
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
          column: { minWidth: 140 },
        },
        uploader: {
          title: '上传者',
          type: 'input',
          form: { disabled: true },
          column: { minWidth: 160 },
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
