# 📧 Email Yapılandırma Rehberi

Backend sunucu çalışıyor ancak email gönderebilmek için Gmail ayarlarını yapmanız gerekiyor.

## ⚠️ Önemli Not
Gmail artık normal şifre ile giriş yapmaya izin vermiyor. **Uygulama Şifresi** oluşturmanız gerekiyor.

## 🔧 Adım Adım Kurulum

### 1. Google Hesabınıza Giriş Yapın
[https://myaccount.google.com/](https://myaccount.google.com/)

### 2. İki Adımlı Doğrulamayı Etkinleştirin
- Sol menüden **"Güvenlik"** sekmesine tıklayın
- **"Google'da oturum açma"** bölümüne gidin
- **"2 Adımlı Doğrulama"** seçeneğini bulun ve etkinleştirin
- Telefon numaranızı doğrulayın

### 3. Uygulama Şifresi Oluşturun
- Yine **"Güvenlik"** sekmesinde kalın
- **"Uygulama şifreleri"** seçeneğini bulun (2 Adımlı Doğrulama'nın altında)
- Uygulama seçin: **"Mail"**
- Cihaz seçin: **"Diğer"** (özel ad) → **"242 Dijital Backend"** yazın
- **"Oluştur"** butonuna tıklayın
- Karşınıza çıkan **16 haneli şifreyi** kopyalayın (boşluklar olmadan)

### 4. .env Dosyasını Düzenleyin

`server/.env` dosyasını açın ve şu bilgileri girin:

```env
PORT=3001
NODE_ENV=development

# Gmail adresinizi buraya yazın
EMAIL_USER=your-gmail@gmail.com

# Az önce oluşturduğunuz 16 haneli şifreyi buraya yapıştırın (boşluksuz)
EMAIL_PASS=abcdefghijklmnop

# Mesajların gönderileceği adres
RECIPIENT_EMAIL=xaithusa8@gmail.com

# Frontend URL
FRONTEND_URL=http://localhost:5174
```

### 5. Backend Sunucusunu Yeniden Başlatın

Terminal'de backend sunucusu çalışıyorsa:
- `Ctrl + C` ile durdurun
- `npm run dev` komutuyla yeniden başlatın

Veya terminal'de şu komutu çalıştırın:
```bash
cd server && npm run dev
```

## ✅ Test Etme

1. Frontend'i açın: [http://localhost:5174](http://localhost:5174)
2. "İletişim" sayfasına gidin
3. Formu doldurun ve gönderin
4. `xaithusa8@gmail.com` adresini kontrol edin

## 🔍 Sorun Giderme

### Hata: "Invalid login: 535-5.7.8"
- Gmail şifreniz değil, **Uygulama Şifresi** kullanmalısınız
- 2 Adımlı Doğrulama etkin mi kontrol edin
- .env dosyasındaki EMAIL_PASS'te boşluk olmamalı

### Hata: "Less secure app access"
- Bu yöntem artık çalışmıyor, mutlaka **Uygulama Şifresi** kullanın

### Email gelmiyor
- Spam klasörünü kontrol edin
- RECIPIENT_EMAIL doğru mu kontrol edin
- Backend terminalinde hata var mı bakın

## 📝 Örnek .env Dosyası

```env
PORT=3001
NODE_ENV=development
EMAIL_USER=edabas242@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
RECIPIENT_EMAIL=xaithusa8@gmail.com
FRONTEND_URL=http://localhost:5174
```

## 🎉 Başarılı Kurulumda Göreceğiniz Mesaj

```
╔═══════════════════════════════════════╗
║   🚀 242 Dijital Backend Server       ║
║   📡 Port: 3001                        ║
║   🌍 Environment: development       ║
║   ✉️  Email: xaithusa8@gmail.com    ║
╚═══════════════════════════════════════╝

✅ Email servisi hazır
```

## 🚀 Production Deployment

Production ortamında:
- Gmail yerine profesyonel email servisi kullanın (SendGrid, Mailgun, AWS SES)
- Rate limiting ayarlarını gözden geçirin
- CORS ayarlarını production domain'inize göre yapılandırın

---

**Yardıma mı ihtiyacınız var?** 
İletişim: info@242dijital.com
