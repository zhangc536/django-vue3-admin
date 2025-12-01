from rest_framework import serializers
from dvadmin.utils.serializers import CustomModelSerializer
from dvadmin.utils.viewset import CustomModelViewSet
from dvadmin.system.models import Finance, Customer
from dvadmin.system.models import MessageCenter, MessageCenterTargetUser, Users
from django.utils import timezone
import calendar
from datetime import date as dt_date
from decimal import Decimal
import re
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from dvadmin.utils.json_response import SuccessResponse


class FinanceSerializer(CustomModelSerializer):
    class Meta:
        model = Finance
        fields = "__all__"
        read_only_fields = ["id"]


class FinanceCreateUpdateSerializer(CustomModelSerializer):
    class Meta:
        model = Finance
        fields = "__all__"
        read_only_fields = ["id"]


class FinanceViewSet(CustomModelViewSet):
    queryset = Finance.objects.all()
    serializer_class = FinanceSerializer
    create_serializer_class = FinanceCreateUpdateSerializer
    update_serializer_class = FinanceCreateUpdateSerializer
    search_fields = ["customer_name"]
    filter_fields = ["customer_name"]
    ordering_fields = ["date", "amount", "reminder_datetime"]

    def list(self, request, *args, **kwargs):
        qs = Customer.objects.all()
        data_map = {}
        display_name_map = {}
        def add_months(base: dt_date, months: int) -> dt_date:
            y = base.year + (base.month - 1 + months) // 12
            m = (base.month - 1 + months) % 12 + 1
            d = min(base.day, calendar.monthrange(y, m)[1])
            return dt_date(y, m, d)
        def ceil_months_from_date(base: dt_date) -> int:
            if not base:
                return 0
            t = timezone.now().date()
            if t < base:
                return 0
            months = (t.year - base.year) * 12 + (t.month - base.month)
            boundary = add_months(base, months)
            if boundary > t:
                months += 1
            if months <= 0:
                months = 1
            return months
        for c in qs:
            raw_name = c.name or ""
            name = re.sub(r"[\u3000]+", " ", raw_name).strip()
            if not name:
                name = raw_name
            dev = Decimal(c.device or 0)
            months = ceil_months_from_date(c.date) if c.date else 0
            # 统一按公式计算：网费/电费 = 70 × 设备数 × 月数；设备折旧费 = 500 × 设备数
            net_electric = Decimal(70) * Decimal(months) * dev
            dep_total = Decimal(500) * dev
            cost = net_electric + dep_total
            if name not in data_map:
                display_name_map[name] = raw_name.strip() or name
                data_map[name] = {"customer_name": display_name_map[name], "amount": 0.0, "income": 0.0}
            data_map[name]["amount"] += float(cost)
            data_map[name]["income"] += float(Decimal(c.amount or 0))
        # 返回列表结构
        items = list(data_map.values())
        return SuccessResponse(data=items)

    @action(methods=['POST'], detail=True, permission_classes=[IsAuthenticated])
    def send_reminder(self, request, pk=None):
        instance = self.get_object()
        if instance.is_reminded:
            return SuccessResponse(data=None, msg="已提醒")
        title = "缴费提醒"
        content = f"客户: {instance.customer_name}，金额: {instance.amount}，请及时缴费。"
        msg = MessageCenter.objects.create(title=title, content=content, creator=request.user)
        target_user = Users.objects.filter(id=request.user.id).first()
        if target_user:
            MessageCenterTargetUser.objects.create(users=target_user, messagecenter=msg)
        instance.is_reminded = True
        instance.save()
        return SuccessResponse(data=None, msg="提醒已发送")
