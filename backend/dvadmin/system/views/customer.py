from rest_framework import serializers
from dvadmin.utils.serializers import CustomModelSerializer
from dvadmin.utils.viewset import CustomModelViewSet
from dvadmin.system.models import Customer


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
        return super().create(validated_data)
    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ["id"]


class CustomerViewSet(CustomModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    create_serializer_class = CustomerCreateUpdateSerializer
    update_serializer_class = CustomerCreateUpdateSerializer
    search_fields = ["name", "remark"]
    filter_fields = ["name", "device", "amount", "net_fee", "electric_fee", "depreciation_fee", "uploader", "remark", "date", "is_reminded"]
    ordering_fields = ["date", "amount", "reminder_datetime"]

    from rest_framework.decorators import action
    from rest_framework.permissions import IsAuthenticated
    from dvadmin.utils.json_response import SuccessResponse
    from dvadmin.system.models import MessageCenter, MessageCenterTargetUser, Users

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
