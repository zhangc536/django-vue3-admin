import * as api from './api';
import { CreateCrudOptionsProps, CreateCrudOptionsRet, AddReq, DelReq, EditReq } from '@fast-crud/fast-crud';

export const createCrudOptions = function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const pageRequest = async (query: any) => {
    return await api.GetList(query);
  };
  const addRequest = async ({ form }: AddReq) => {
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
        buttons: { view: { show: false }, edit: { type: 'text' }, remove: { type: 'text' } },
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
        
        date: {
          title: '日期',
          type: 'date',
          form: { component: { props: { valueFormat: 'YYYY-MM-DD' } } },
          column: { minWidth: 140 },
        },
        customer_name: {
          title: '客户姓名',
          type: 'input',
          search: { show: true },
          column: { minWidth: 160 },
        },
        amount: {
          title: '金额',
          type: 'number',
          form: { component: { props: { min: 0, step: 0.01 } } },
          column: { minWidth: 120 },
        },
      },
    },
  };
};
