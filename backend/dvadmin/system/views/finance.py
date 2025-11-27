from rest_framework import serializers
from dvadmin.utils.serializers import CustomModelSerializer
from dvadmin.utils.viewset import CustomModelViewSet
from dvadmin.system.models import Finance


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
