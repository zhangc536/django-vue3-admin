import threading
import time
from datetime import datetime

from django.utils import timezone
from django.db.models import Q
from django.core.cache import cache

from dvadmin.system.models import Finance, MessageCenter, MessageCenterTargetUser, Users

_started = False


def _reminder_loop():
    while True:
        try:
            now = timezone.now()
            qs = Finance.objects.filter(
                reminder_datetime__lte=now,
                is_reminded=False
            )
            for item in qs[:100]:
                title = "缴费提醒"
                content = f"客户: {item.customer_name}，金额: {item.amount}，请及时缴费。"
                msg = MessageCenter.objects.create(title=title, content=content)
                creator = item.creator if item.creator else Users.objects.filter(is_superuser=True).first()
                if creator:
                    MessageCenterTargetUser.objects.create(users=creator, messagecenter=msg)
                item.is_reminded = True
                item.save()
                cache.set('last_db_change_time', time.time(), timeout=None)
        except Exception:
            pass
        time.sleep(60)


def start_reminder_scheduler():
    global _started
    if _started:
        return
    _started = True
    t = threading.Thread(target=_reminder_loop, daemon=True)
    t.start()
