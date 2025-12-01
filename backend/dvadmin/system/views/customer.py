from rest_framework import serializers
from decimal import Decimal
from dvadmin.utils.serializers import CustomModelSerializer
from dvadmin.utils.viewset import CustomModelViewSet
from dvadmin.system.models import Customer
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from dvadmin.utils.json_response import SuccessResponse
from django.db.models import Q
from dvadmin.system.models import MessageCenter, MessageCenterTargetUser, Users
import random
from datetime import date as _date, timedelta


class CustomerSerializer(CustomModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ["id"]


class CustomerCreateUpdateSerializer(CustomModelSerializer):
    def create(self, validated_data):
        user = getattr(self.request, "user", None)
        if user and str(user) != "AnonymousUser":
            validated_data["uploader"] = getattr(user, "name", None) or getattr(user, "username", None)
        if validated_data.get("date", None) is None:
            from datetime import date as _date
            validated_data["date"] = _date.today()
        dev = validated_data.get("device") or 0
        try:
            dev_n = int(dev)
            dev_n = dev_n if dev_n > 0 else 0
        except Exception:
            dev_n = 0
        validated_data["net_fee"] = Decimal('70') * Decimal(dev_n)
        validated_data["depreciation_fee"] = Decimal('500') * Decimal(dev_n)
        return super().create(validated_data)
    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ["id"]

    def update(self, instance, validated_data):
        dev = validated_data.get("device", instance.device) or 0
        try:
            dev_n = int(dev)
            dev_n = dev_n if dev_n > 0 else 0
        except Exception:
            dev_n = 0
        validated_data["net_fee"] = Decimal('70') * Decimal(dev_n)
        validated_data["depreciation_fee"] = Decimal('500') * Decimal(dev_n)
        return super().update(instance, validated_data)


class CustomerViewSet(CustomModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    create_serializer_class = CustomerCreateUpdateSerializer
    update_serializer_class = CustomerCreateUpdateSerializer
    search_fields = ["name", "remark"]
    filter_fields = ["name", "device", "amount", "net_fee", "electric_fee", "depreciation_fee", "uploader", "remark", "date", "is_reminded", "is_paid", "is_need_pay", "reminder_months"]
    ordering_fields = ["date", "amount", "reminder_datetime", "reminder_months"]


    @action(methods=['POST'], detail=True, permission_classes=[IsAuthenticated])
    def send_reminder(self, request, pk=None):
        instance = self.get_object()
        if instance.is_reminded:
            return SuccessResponse(data=None, msg="已提醒")
        title = "缴费提醒"
        content = f"客户: {instance.name}，金额: {instance.amount}，请及时缴费。"
        msg = MessageCenter.objects.create(title=title, content=content, creator=request.user)
        target_user = Users.objects.filter(id=request.user.id).first()
        if target_user:
            MessageCenterTargetUser.objects.create(users=target_user, messagecenter=msg)
        instance.is_reminded = True
        instance.save()
        return SuccessResponse(data=None, msg="提醒已发送")

    @action(methods=['POST'], detail=True, permission_classes=[IsAuthenticated])
    def mark_paid(self, request, pk=None):
        instance = self.get_object()
        if instance.is_paid:
            return SuccessResponse(data=None, msg="已标记缴费")
        instance.is_paid = True
        instance.is_need_pay = False
        from datetime import timedelta
        from django.utils import timezone
        now = timezone.now()
        m = instance.reminder_months or 1
        try:
            m = int(m)
        except Exception:
            m = 1
        instance.reminder_datetime = now + timedelta(days=30 * m)
        instance.is_reminded = False
        instance.save()
        return SuccessResponse(data=None, msg="已确认缴费")

    @action(methods=['POST'], detail=True, permission_classes=[IsAuthenticated])
    def mark_unpaid(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_paid:
            return SuccessResponse(data=None, msg="已是未缴费状态")
        instance.is_paid = False
        from django.utils import timezone
        now = timezone.now()
        due_date = None
        due_dt = None
        try:
            if instance.reminder_months:
                from datetime import timedelta
                base_date = instance.date or now.date()
                m = int(instance.reminder_months)
                due_date = base_date + timedelta(days=30 * m)
            elif instance.reminder_datetime:
                due_dt = instance.reminder_datetime
        except Exception:
            due_date = None
            due_dt = None
        instance.is_need_pay = bool((due_date and due_date <= now.date()) or (due_dt and due_dt <= now))
        instance.save()
        return SuccessResponse(data=None, msg="已取消缴费标记")

    @action(methods=['POST'], detail=False, permission_classes=[IsAuthenticated])
    def generate_fake(self, request):
        """生成随机客户数据"""
        count = int(request.data.get('count', 50))
        names = [
            '中海油', '中石化', '华为', '中兴', '阿里巴巴', '腾讯', '百度', '美的', '海尔', '格力',
            '联想', '小米', '比亚迪', '吉利', '宁德时代', '中铁建', '中国移动', '中国联通', '中国电信', '顺丰',
            '菜鸟', '苏宁', '京东', '网易', '携程', '滴滴', '字节跳动', '拼多多', '唯品会', '快手'
        ]
        uploader = getattr(request.user, 'name', None) or getattr(request.user, 'username', 'system')
        today = _date.today()
        created = 0
        for _ in range(count):
            name = random.choice(names)
            device = random.randint(0, 20)
            # 随机金额，部分为0表示仅登记设备未收款
            amount = round(random.choice([0, random.uniform(100, 5000)]), 2)
            # 随机近90天日期
            delta_days = random.randint(0, 90)
            d = today - timedelta(days=delta_days)
            # 随机是否需要缴费/是否已缴费
            is_paid = bool(amount) and random.random() < 0.5
            reminder_months = random.choice([None, 1, 2, 3])
            Customer.objects.create(
                request=request,
                name=name,
                device=device,
                amount=amount,
                net_fee=None,
                electric_fee=None,
                depreciation_fee=None,
                uploader=uploader,
                status=True,
                remark='自动生成',
                date=d,
                reminder_datetime=None,
                is_reminded=False,
                reminder_months=reminder_months,
                is_paid=is_paid,
                is_need_pay=(not is_paid and (random.random() < 0.5)),
            )
            created += 1
        return SuccessResponse(data={'created': created}, msg='生成完成')
    def backfill_owner_dept(self, request):
        if not request.user.is_superuser:
            return SuccessResponse(data=None, msg="无权执行")
        qs = Customer.objects.filter(Q(dept_belong_id__isnull=True) | Q(dept_belong_id=''))
        count = 0
        for obj in qs:
            did = None
            try:
                did = getattr(obj.creator, 'dept_id', None)
            except Exception:
                did = None
            if not did:
                did = getattr(request.user, 'dept_id', None)
            if did:
                obj.dept_belong_id = did
                if not obj.creator_id:
                    obj.creator = request.user
                obj.save()
                count += 1
        return SuccessResponse(data={'updated': count}, msg="回填完成")

    @action(methods=['POST'], detail=False, permission_classes=[IsAuthenticated])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if isinstance(ids, str):
            ids = [i for i in ids.split(',') if i]
        if not ids:
            return SuccessResponse(data={'deleted': 0}, msg="无待删除数据")
        queryset = self.filter_queryset(self.get_queryset().filter(id__in=ids))
        deleted_count, _ = queryset.delete()
        return SuccessResponse(data={'deleted': deleted_count}, msg="删除成功")

    @action(methods=['POST'], detail=False, permission_classes=[IsAuthenticated])
    def bulk_mark_paid(self, request):
        ids = request.data.get('ids', [])
        if isinstance(ids, str):
            ids = [i for i in ids.split(',') if i]
        if not ids:
            return SuccessResponse(data={'updated': 0}, msg="无待更新数据")
        queryset = self.filter_queryset(self.get_queryset().filter(id__in=ids))
        from datetime import timedelta
        from django.utils import timezone
        now = timezone.now()
        updated = 0
        for instance in queryset:
            if instance.is_paid:
                continue
            m = instance.reminder_months or 1
            try:
                m = int(m)
            except Exception:
                m = 1
            instance.is_paid = True
            instance.is_need_pay = False
            instance.reminder_datetime = now + timedelta(days=30 * m)
            instance.is_reminded = False
            instance.save()
            updated += 1
        return SuccessResponse(data={'updated': updated}, msg="批量标记缴费成功")

    @action(methods=['POST'], detail=False, permission_classes=[IsAuthenticated])
    def bulk_mark_unpaid(self, request):
        ids = request.data.get('ids', [])
        if isinstance(ids, str):
            ids = [i for i in ids.split(',') if i]
        if not ids:
            return SuccessResponse(data={'updated': 0}, msg="无待更新数据")
        queryset = self.filter_queryset(self.get_queryset().filter(id__in=ids))
        from django.utils import timezone
        now = timezone.now()
        updated = 0
        for instance in queryset:
            if not instance.is_paid:
                continue
            instance.is_paid = False
            due_date = None
            due_dt = None
            try:
                if instance.reminder_months:
                    from datetime import timedelta
                    base_date = instance.date or now.date()
                    m = int(instance.reminder_months)
                    due_date = base_date + timedelta(days=30 * m)
                elif instance.reminder_datetime:
                    due_dt = instance.reminder_datetime
            except Exception:
                due_date = None
                due_dt = None
            instance.is_need_pay = bool((due_date and due_date <= now.date()) or (due_dt and due_dt <= now))
            instance.save()
            updated += 1
        return SuccessResponse(data={'updated': updated}, msg="批量标记未缴费成功")
