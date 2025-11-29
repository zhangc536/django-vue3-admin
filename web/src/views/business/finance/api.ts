import { request } from '/@/utils/service';

export const apiPrefix = '/api/system/finance/';

export function GetList(query: any) {
  return request({ url: apiPrefix, method: 'get', params: query });
}

export function GetObj(id: number) {
  return request({ url: apiPrefix + id + '/', method: 'get' });
}

export function AddObj(obj: any) {
  return request({ url: apiPrefix, method: 'post', data: obj });
}

export function UpdateObj(obj: any) {
  return request({ url: apiPrefix + obj.id + '/', method: 'put', data: obj });
}

export function DelObj(id: number) {
  return request({ url: apiPrefix + id + '/', method: 'delete', data: { id } });
}

export function SendReminder(id: number) {
  return request({ url: apiPrefix + id + '/send_reminder/', method: 'post' });
}
