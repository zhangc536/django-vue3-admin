# -*- coding: utf-8 -*-
import json

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django_restql.fields import DynamicSerializerMethodField
from rest_framework import serializers
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny

from dvadmin.system.models import MessageCenter, Users, MessageCenterTargetUser
from dvadmin.utils.json_response import SuccessResponse, DetailResponse
from dvadmin.utils.serializers import CustomModelSerializer
from dvadmin.utils.viewset import CustomModelViewSet


class MessageCenterSerializer(CustomModelSerializer):
    """
    消息中心-序列化器
    """
    role_info = DynamicSerializerMethodField()
    user_info = DynamicSerializerMethodField()
    dept_info = DynamicSerializerMethodField()
    is_read = serializers.BooleanField(read_only=True, source='target_user__is_read')

    def get_role_info(self, instance, parsed_query):
        roles = instance.target_role.all()
        # You can do what ever you want in here
        # `parsed_query` param is passed to BookSerializer to allow further querying
        from dvadmin.system.views.role import RoleSerializer
        serializer = RoleSerializer(
            roles,
            many=True,
            parsed_query=parsed_query
        )
        return serializer.data

    def get_user_info(self, instance, parsed_query):
        if instance.target_type in (1, 2, 3):
            return []
        users = instance.target_user.all()
        # You can do what ever you want in here
        # `parsed_query` param is passed to BookSerializer to allow further querying
        from dvadmin.system.views.user import UserSerializer
        serializer = UserSerializer(
            users,
            many=True,
            parsed_query=parsed_query
        )
        return serializer.data

    def get_dept_info(self, instance, parsed_query):
        dept = instance.target_dept.all()
        # You can do what ever you want in here
        # `parsed_query` param is passed to BookSerializer to allow further querying
        from dvadmin.system.views.dept import DeptSerializer
        serializer = DeptSerializer(
            dept,
            many=True,
            parsed_query=parsed_query
        )
        return serializer.data

    class Meta:
        model = MessageCenter
        fields = "__all__"
        read_only_fields = ["id"]


class MessageCenterTargetUserSerializer(CustomModelSerializer):
    """
    目标用户序列化器-序列化器
    """

    class Meta:
        model = MessageCenterTargetUser
        fields = "__all__"
        read_only_fields = ["id"]


class MessageCenterTargetUserListSerializer(CustomModelSerializer):
    """
    目标用户序列化器-序列化器
    """
    role_info = DynamicSerializerMethodField()
    user_info = DynamicSerializerMethodField()
    dept_info = DynamicSerializerMethodField()
    is_read = serializers.SerializerMethodField()

    def get_is_read(self, instance):
        user_id = self.request.user.id
        message_center_id = instance.id
        queryset = MessageCenterTargetUser.objects.filter(messagecenter__id=message_center_id, users_id=user_id).first()
        if queryset:
            return queryset.is_read
        return False

    def get_role_info(self, instance, parsed_query):
        roles = instance.target_role.all()
        # You can do what ever you want in here
        # `parsed_query` param is passed to BookSerializer to allow further querying
        from dvadmin.system.views.role import RoleSerializer
        serializer = RoleSerializer(
            roles,
            many=True,
            parsed_query=parsed_query
        )
        return serializer.data

    def get_user_info(self, instance, parsed_query):
        if instance.target_type in (1, 2, 3):
            return []
        users = instance.target_user.all()
        # You can do what ever you want in here
        # `parsed_query` param is passed to BookSerializer to allow further querying
        from dvadmin.system.views.user import UserSerializer
        serializer = UserSerializer(
            users,
            many=True,
            parsed_query=parsed_query
        )
        return serializer.data

    def get_dept_info(self, instance, parsed_query):
        dept = instance.target_dept.all()
        # You can do what ever you want in here
        # `parsed_query` param is passed to BookSerializer to allow further querying
        from dvadmin.system.views.dept import DeptSerializer
        serializer = DeptSerializer(
            dept,
            many=True,
            parsed_query=parsed_query
        )
        return serializer.data

    class Meta:
        model = MessageCenter
        fields = "__all__"
        read_only_fields = ["id"]


class MessageCenterViewSet(CustomModelViewSet):
    """
    消息中心接口
    list:查询
    create:新增
    update:修改
    retrieve:单例
    destroy:删除
    """
    queryset = MessageCenter.objects.all()
    serializer_class = MessageCenterSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return MessageCenterTargetUserListSerializer
        return MessageCenterSerializer

    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def get_unread_count(self, request):
        count = MessageCenterTargetUser.objects.filter(users_id=request.user.id, is_read=False).count()
        return SuccessResponse(data=count, msg="获取成功")

    def get_queryset(self):
        if self.action == 'list':
            return MessageCenter.objects.filter(target_user__id=self.request.user.id, target_user__is_active=1)
        return MessageCenter.objects.all()
    
    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def get_unread_count(self, request):
        """
        获取未读消息数量
        """
        count = MessageCenterTargetUser.objects.filter(users_id=request.user.id, is_read=False).count()
        return SuccessResponse(data=count, msg="获取成功")

    @action(methods=['GET'], detail=False, permission_classes=[IsAuthenticated])
    def get_newest_msg(self, request):
        """
        获取最新一条消息
        """
        queryset = MessageCenter.objects.filter(target_user__id=self.request.user.id, target_user__is_active=1).order_by('-create_datetime').first()
        if queryset:
            serializer = MessageCenterTargetUserListSerializer(queryset, request=request)
            return SuccessResponse(data=serializer.data, msg="获取成功")
        return SuccessResponse(data=None, msg="暂无新消息")
