from rest_framework import serializers
from dvadmin.utils.serializers import CustomModelSerializer
from dvadmin.utils.viewset import CustomModelViewSet
from dvadmin.system.models import Finance
from dvadmin.system.models import MessageCenter, MessageCenterTargetUser, Users
from django.utils import timezone
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
