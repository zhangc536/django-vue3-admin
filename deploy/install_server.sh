#!/usr/bin/env bash
set -e
apt update
apt install -y python3-venv python3-pip gcc build-essential libpq-dev postgresql postgresql-contrib nginx snapd curl
sudo -u postgres psql -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dvuser') THEN CREATE USER dvuser WITH PASSWORD '123456'; END IF; END $$;"
sudo -u postgres psql -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dvadmin') THEN CREATE DATABASE dvadmin OWNER dvuser; END IF; END $$;"
sudo -u postgres psql -c "ALTER USER dvuser CREATEDB;"
cd /root/django-vue3-admin/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py init -y
cat >/etc/systemd/system/django-vue3-admin.service <<'EOF'
[Unit]
Description=django-vue3-admin
After=network.target
[Service]
Type=simple
WorkingDirectory=/root/django-vue3-admin/backend
ExecStart=/root/django-vue3-admin/backend/venv/bin/gunicorn application.asgi:application -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000 --workers 4
Restart=always
User=root
Environment=PYTHONUNBUFFERED=1
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable django-vue3-admin
systemctl restart django-vue3-admin
if [ ! -f /root/django-vue3-admin/backend/templates/web/index.html ]; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt install -y nodejs
  cd /root/django-vue3-admin/web
  npm ci || npm install
  npm run build
fi
cat >/etc/nginx/sites-available/django-vue3-admin.conf <<'EOF'
server {
    listen 80;
    server_name gsfw.zhangcde.asia;
    location /web/ {
        alias /root/django-vue3-admin/backend/templates/web/;
        try_files $uri $uri/ /web/index.html;
    }
    location = / {
        return 302 /web/;
    }
    location /api/ {
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 600s;
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:8000/;
    }
    location /media/ {
        alias /root/django-vue3-admin/backend/media/;
        expires 7d;
    }
}
EOF
ln -sf /etc/nginx/sites-available/django-vue3-admin.conf /etc/nginx/sites-enabled/django-vue3-admin.conf
nginx -t
systemctl reload nginx
snap install core || true
snap refresh core || true
snap install --classic certbot || true
ln -sf /snap/bin/certbot /usr/bin/certbot || true
certbot --nginx -d gsfw.zhangcde.asia --redirect --non-interactive --agree-tos -m admin@gsfw.zhangcde.asia || true
certbot renew --dry-run || true
