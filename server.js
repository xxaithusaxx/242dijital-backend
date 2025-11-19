import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'https://242dijital.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - Spam koruması
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 15 dakikada maksimum 5 istek
  message: { 
    success: false, 
    message: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.' 
  }
});

// Email transporter yapılandırması
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email transporter'ı test et
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email yapılandırması hatası:', error);
  } else {
    console.log('✅ Email servisi hazır');
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '242 Dijital Backend çalışıyor!',
    timestamp: new Date().toISOString()
  });
});

// Contact form endpoint
app.post('/api/contact', limiter, async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validasyon
    if (!name || !email || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen tüm alanları doldurun.'
      });
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir e-posta adresi girin.'
      });
    }

    // HTML email template
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          }
          .header {
            background: linear-gradient(135deg, #4158D0 0%, #C850C0 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          }
          .info-row {
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-left: 4px solid #4158D0;
            border-radius: 5px;
          }
          .label {
            font-weight: bold;
            color: #4158D0;
            display: block;
            margin-bottom: 5px;
          }
          .value {
            color: #555;
          }
          .message-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            border: 1px solid #e0e0e0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding: 20px;
            color: #7f8c8d;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Yeni İletişim Formu Mesajı</h1>
            <p>242 Dijital Web Sitesi</p>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">👤 Ad Soyad:</span>
              <span class="value">${name}</span>
            </div>
            <div class="info-row">
              <span class="label">📧 E-posta:</span>
              <span class="value"><a href="mailto:${email}">${email}</a></span>
            </div>
            <div class="info-row">
              <span class="label">📱 Telefon:</span>
              <span class="value"><a href="tel:${phone}">${phone}</a></span>
            </div>
            <div class="info-row">
              <span class="label">📌 Konu:</span>
              <span class="value">${subject}</span>
            </div>
            <div class="message-box">
              <span class="label">💬 Mesaj:</span>
              <p class="value">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="footer">
              <p>Bu mesaj ${new Date().toLocaleString('tr-TR')} tarihinde gönderildi.</p>
              <p>242 Dijital © ${new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Email gönderme ayarları
    const mailOptions = {
      from: {
        name: '242 Dijital Web Sitesi',
        address: process.env.EMAIL_USER
      },
      to: process.env.RECIPIENT_EMAIL,
      replyTo: email,
      subject: `🔔 Yeni İletişim Formu: ${subject}`,
      html: htmlTemplate,
      text: `
        Yeni İletişim Formu Mesajı
        
        Ad Soyad: ${name}
        E-posta: ${email}
        Telefon: ${phone}
        Konu: ${subject}
        
        Mesaj:
        ${message}
        
        Gönderim Tarihi: ${new Date().toLocaleString('tr-TR')}
      `
    };

    // Email gönder
    await transporter.sendMail(mailOptions);

    console.log(`✅ Email gönderildi: ${email} -> ${process.env.RECIPIENT_EMAIL}`);

    res.status(200).json({
      success: true,
      message: 'Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.'
    });

  } catch (error) {
    console.error('❌ Email gönderim hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint bulunamadı'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Sunucu hatası oluştu'
  });
});

// Server başlat
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   🚀 242 Dijital Backend Server       ║
║   📡 Port: ${PORT}                        ║
║   🌍 Environment: ${process.env.NODE_ENV}       ║
║   ✉️  Email: ${process.env.RECIPIENT_EMAIL}    ║
╚═══════════════════════════════════════╝
  `);
});

export default app;
