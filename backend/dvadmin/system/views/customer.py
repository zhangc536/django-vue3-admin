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
            validated_data["remark"] = getattr(user, "name", None) or getattr(user, "username", None)
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
    filter_fields = ["name", "device", "amount", "remark", "date"]
