import threading
import time
from datetime import datetime, date, timedelta

from django.utils import timezone
from django.db.models import Q
from django.core.cache import cache

from dvadmin.system.models import Customer, MessageCenter, MessageCenterTargetUser, Users

_started = False


def _reminder_loop():
    while True:
        try:
            now = timezone.now()
            qs = Customer.objects.all()
            for item in qs[:100]:
                due_date = None
                due_dt = None
                try:
                    if item.reminder_months:
                        base_date: date = item.date or now.date()
                        m = int(item.reminder_months)
                        due_date = base_date + timedelta(days=30 * m)
                    elif item.reminder_datetime:
                        due_dt = item.reminder_datetime
                except Exception:
                    due_date = None
                    due_dt = None
                need = (bool(due_date) and due_date <= now.date()) or (bool(due_dt) and due_dt <= now)
                item.is_need_pay = True if (need and not item.is_paid) else False
                if need and not item.is_reminded:
                    title = "缴费提醒"
                    content = f"客户: {item.name}，金额: {item.amount}，请及时缴费。"
                    msg = MessageCenter.objects.create(title=title, content=content)
                    creator = item.creator if item.creator else Users.objects.filter(is_superuser=True).first()
                    if creator:
                        MessageCenterTargetUser.objects.create(users=creator, messagecenter=msg)
                    item.is_reminded = True
                    item.save()
                    cache.set('last_db_change_time', time.time(), timeout=None)
                else:
                    item.save()
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
