import { defineStore } from 'pinia';
import { UserInfosStates } from './interface';
import { Session } from '/@/utils/storage';
import { request } from '../utils/service';
import { getBaseURL } from '../utils/baseUrl';
import headerImage from '/@/assets/img/headerImage.png';

/**
 * 用户信息
 * @methods setUserInfos 设置用户信息
 */
export const useUserInfo = defineStore('userInfo', {
	state: (): UserInfosStates => ({
		userInfos: {
			id:'',
			avatar: '',
			username: '',
			name: '',
			email: '',
			mobile: '',
			gender: '',
			pwd_change_count:null,
			is_superuser: false,
			dept_info: {
				dept_id: 0,
				dept_name: '',
			},
			role_info: [
				{
					id: 0,
					name: '',
				},
			],
		},
	}),
	actions: {
		async setPwdChangeCount(count: number) {
			this.userInfos.pwd_change_count = count;
		},
		async updateUserInfos(userInfos:any) {
			this.userInfos.id = userInfos.id;
			this.userInfos.username = userInfos.name;
			this.userInfos.avatar = userInfos.avatar;
			this.userInfos.name = userInfos.name;
			this.userInfos.email = userInfos.email;
			this.userInfos.mobile = userInfos.mobile;
			this.userInfos.gender = userInfos.gender;
			this.userInfos.dept_info = userInfos.dept_info;
			this.userInfos.role_info = userInfos.role_info;
			this.userInfos.pwd_change_count = userInfos.pwd_change_count;
			this.userInfos.is_superuser = userInfos.is_superuser;
			Session.set('userInfo', this.userInfos);
		},
		async setUserInfos() {
			if (Session.get('userInfo')) {
				this.userInfos = Session.get('userInfo');
			} else {
				await this.getApiUserInfo();
			}
		},
		async getApiUserInfo() {
			return request({
				url: '/api/system/user/user_info/',
				method: 'get',
			}).then((res:any)=>{
				const data = res && res.data ? res.data : null;
				if (!data) return null;
				this.userInfos.id = data.id;
				this.userInfos.username = data.name;
				this.userInfos.avatar = (data.avatar && getBaseURL(data.avatar)) || headerImage;
				this.userInfos.name = data.name;
				this.userInfos.email = data.email;
				this.userInfos.mobile = data.mobile;
				this.userInfos.gender = data.gender;
				this.userInfos.dept_info = data.dept_info;
				this.userInfos.role_info = data.role_info;
				this.userInfos.pwd_change_count = data.pwd_change_count;
				this.userInfos.is_superuser = data.is_superuser;
				Session.set('userInfo', this.userInfos);
				return data;
			})
		},
	},
});
