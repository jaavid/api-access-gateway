# دروازه دسترسی به API

[Read this in English](README.md)

ابزاری برای تضمین دسترسی بی‌وقفه به APIها از مناطق تحریم‌شده با استفاده از Cloudflare Workers. این پروژه فراخوان‌های API را به طور پویا از طریق شبکه جهانی لبه مسیریابی می‌کند تا محدودیت‌های منطقه‌ای دور زده شوند.

## ویژگی‌ها
- مسیریابی پویا برای APIها به وسیلهٔ Workers KV
- مقیاس‌پذیر و ایمن
- آسان برای پیکربندی و استقرار

## نصب

۱. مخزن را کلون کنید:
```bash
git clone https://github.com/jaavid/api-access-gateway.git
cd api-access-gateway
```

۲. Wrangler Cloudflare را نصب کنید:
```bash
npm install -g wrangler
```

۳. فایل wrangler.toml را پیکربندی کنید:
- مقدار your-account-id را با شناسهٔ حساب Cloudflare خود جایگزین کنید.
- مقدار your-zone-id را با شناسهٔ منطقهٔ Cloudflare خود جایگزین کنید.
- مقدار your-namespace-id را با شناسهٔ فضای نام Workers KV جایگزین کنید.

۴. Worker را منتشر کنید:
```bash
wrangler publish
```

## نحوهٔ کار
- درخواست‌ها از طریق Cloudflare Workers مسیریابی می‌شوند.
- Workers KV نگاشت میزبان‌های API را به صورت پویا ذخیره می‌کند.
- تماس‌ها از طریق یک Worker به API مربوطه ارسال می‌شوند.

## مثال
- تلگرام: `https://your-worker-domain.workers.dev/telegram/bot1234:123/sendMessage`
- سرویس Open AI: `https://your-worker-domain.workers.dev/ai/v1/chat/completions`

## مشارکت
از مشارکت شما استقبال می‌کنیم! لطفاً برای جزئیات فایل CONTRIBUTING.md را مطالعه کنید.
