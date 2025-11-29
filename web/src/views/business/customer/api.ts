import { request } from '/@/utils/service';
import qs from 'qs';
import { UserPageQuery, AddReq, DelReq, EditReq, InfoReq } from '@fast-crud/fast-crud';

export const apiPrefix = '/api/system/customer/';
export function SendReminder(id: number) {
  return request({
    url: apiPrefix + id + '/send_reminder/',
    method: 'post',
  });
}

export function GetList(query: UserPageQuery) {
  const q: any = { ...(query as any) };
  const f: any = q.form || {};
  if (!q.start_date && Array.isArray(q.date) && q.date.length === 2) {
    q.start_date = q.date[0];
    q.end_date = q.date[1];
    delete q.date;
  } else if (!q.start_date && typeof q.date === 'string' && q.date) {
    q.start_date = q.date;
    q.end_date = q.date;
    delete q.date;
  }
  if (!q.start_date && Array.isArray(f.date) && f.date.length === 2) {
    q.start_date = f.date[0];
    q.end_date = f.date[1];
    delete f.date;
  } else if (!q.start_date && typeof f.date === 'string' && f.date) {
    q.start_date = f.date;
    q.end_date = f.date;
    delete f.date;
  }
  if (f.start_date) {
    if (!q.start_date) q.start_date = f.start_date;
    delete f.start_date;
  }
  if (f.end_date) {
    if (!q.end_date) q.end_date = f.end_date;
    delete f.end_date;
  }
  q.form = f;
  return request({
    url: apiPrefix,
    method: 'get',
    params: q,
  });
}

export function GetObj(id: InfoReq) {
  return request({
    url: apiPrefix + id + '/',
    method: 'get',
  });
}

export function AddObj(obj: AddReq) {
  return request({
    url: apiPrefix,
    method: 'post',
    data: obj,
  });
}

export function UpdateObj(obj: EditReq) {
  return request({
    url: apiPrefix + obj.id + '/',
    method: 'put',
    data: obj,
  });
}

export function DelObj(id: DelReq) {
  return request({
    url: apiPrefix + id + '/',
    method: 'delete',
    data: { id },
  });
}
