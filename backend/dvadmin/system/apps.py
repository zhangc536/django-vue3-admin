from django.apps import AppConfig


class SystemConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'dvadmin.system'

    def ready(self):
        # 注册信号
        import dvadmin.system.signals  # 确保路径正确
        try:
            from .scheduler import start_reminder_scheduler
            start_reminder_scheduler()
        except Exception:
            pass
        try:
            from .models import Role, RoleMenuButtonPermission, MenuButton, RoleMenuPermission, Menu
            role, _ = Role.objects.get_or_create(key='public', defaults={'name': '用户', 'sort': 2, 'status': True})
            if not role.status:
                role.status = True
                role.save(update_fields=['status'])
            btn_values = [
                'customer:Search','customer:Retrieve','customer:Create','customer:Update','customer:Delete',
                'finance:Search','finance:Create','finance:Update','finance:Delete',
                'messageCenter:Search','messageCenter:Retrieve','messageCenter:Create','messageCenter:Update','messageCenter:Delete',
            ]
            for v in btn_values:
                mb = MenuButton.objects.filter(value=v).first()
                if not mb:
                    continue
                obj = RoleMenuButtonPermission.objects.filter(role=role, menu_button=mb).first()
                if not obj:
                    RoleMenuButtonPermission.objects.create(role=role, menu_button=mb, data_range=3)
                else:
                    if obj.data_range != 3:
                        obj.data_range = 3
                        obj.save(update_fields=['data_range'])
            need_menus = {
                '/business/customer': 'customer',
                '/finance': 'finance',
                '/messageCenter': 'messageCenter',
            }
            for wp, cn in need_menus.items():
                m = Menu.objects.filter(web_path=wp, component_name=cn).first()
                if not m:
                    continue
                if not RoleMenuPermission.objects.filter(role=role, menu=m).exists():
                    RoleMenuPermission.objects.create(role=role, menu=m)
        except Exception:
            pass
