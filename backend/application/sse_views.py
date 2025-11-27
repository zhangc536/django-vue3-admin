# views.py
import time

import jwt
from django.http import StreamingHttpResponse, HttpResponse

from application import settings
from dvadmin.system.models import MessageCenterTargetUser
from django.core.cache import cache


def event_stream(user_id):
    count = MessageCenterTargetUser.objects.filter(users=user_id, is_read=False).count()
    yield f"data: {count}\n\n"
    last_data_time = time.time()
    last_heartbeat_time = time.time()
    heartbeat_interval = 25

    while True:
        now = time.time()
        last_db_change_time = cache.get('last_db_change_time', 0)
        if last_db_change_time and last_db_change_time > last_data_time:
            count = MessageCenterTargetUser.objects.filter(users=user_id, is_read=False).count()
            yield f"data: {count}\n\n"
            last_data_time = now
            last_heartbeat_time = now
        elif now - last_heartbeat_time >= heartbeat_interval:
            yield ": keepalive\n\n"
            last_heartbeat_time = now
        time.sleep(1)


def sse_view(request):
    origin = request.headers.get('Origin')
    if request.method == 'OPTIONS':
        response = HttpResponse(status=200)
        if origin:
            response['Access-Control-Allow-Origin'] = origin
            response['Vary'] = 'Origin'
        else:
            response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        response['Access-Control-Allow-Credentials'] = 'false'
        return response
    token = request.GET.get('token')
    if not token:
        auth = request.headers.get('Authorization', '')
        if auth:
            try:
                token = auth.split()[-1]
            except Exception:
                token = None
        if not token:
            return HttpResponse('Missing token', status=401)
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
    except Exception:
        return HttpResponse('Invalid token', status=401)
    user_id = decoded.get('user_id')
    if not user_id:
        return HttpResponse('Invalid user', status=401)
    response = StreamingHttpResponse(event_stream(user_id), content_type='text/event-stream; charset=utf-8')
    response['Cache-Control'] = 'no-cache, no-transform'
    response['X-Accel-Buffering'] = 'no'
    if origin:
        response['Access-Control-Allow-Origin'] = origin
        response['Vary'] = 'Origin'
    else:
        response['Access-Control-Allow-Origin'] = '*'
    return response
