import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Blog verilerini saklamak için JSON dosya yolu
const BLOGS_FILE = path.join(__dirname, 'blogs.json');

// Admin kimlik bilgileri
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '242dijital';

// Blog dosyasını oku
const readBlogs = () => {
  try {
    if (fs.existsSync(BLOGS_FILE)) {
      const data = fs.readFileSync(BLOGS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Blog okuma hatası:', error);
    return [];
  }
};

// Blog dosyasına yaz
const writeBlogs = (blogs) => {
  try {
    fs.writeFileSync(BLOGS_FILE, JSON.stringify(blogs, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Blog yazma hatası:', error);
    return false;
  }
};

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ success: false, message: 'Yetkilendirme gerekli' });
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre' });
  }
};

// Middleware
app.use(cors({
  origin: [
    'https://242dijital.com',
    'https://www.242dijital.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - Spam koruması
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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

// ============== BLOG API ENDPOINTS ==============

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    res.json({ success: true, message: 'Giriş başarılı', token });
  } else {
    res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı' });
  }
});

// Tüm blogları getir (public)
app.get('/api/blogs', (req, res) => {
  try {
    const blogs = readBlogs();
    res.json({ success: true, data: blogs, count: blogs.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Bloglar yüklenirken hata oluştu' });
  }
});

// Tek blog getir (public)
app.get('/api/blogs/:id', (req, res) => {
  try {
    const blogs = readBlogs();
    const blog = blogs.find(b => b.id === parseInt(req.params.id) || b.id === req.params.id);
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
    }
    
    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Blog yüklenirken hata oluştu' });
  }
});

// Blog ekle (admin only)
app.post('/api/blogs', adminAuth, (req, res) => {
  try {
    const { title, excerpt, content, category, author, image } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Başlık ve içerik zorunludur' });
    }
    
    const blogs = readBlogs();
    
    const newBlog = {
      id: Date.now(),
      title: title.trim(),
      excerpt: excerpt?.trim() || '',
      content: content.trim(),
      category: category?.trim() || 'Genel',
      author: author?.trim() || 'Admin',
      date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }),
      image: image || '/assets/242logo.png',
      createdAt: new Date().toISOString()
    };
    
    blogs.unshift(newBlog);
    
    if (writeBlogs(blogs)) {
      res.status(201).json({ success: true, message: 'Blog başarıyla eklendi', data: newBlog });
    } else {
      res.status(500).json({ success: false, message: 'Blog kaydedilemedi' });
    }
  } catch (error) {
    console.error('Blog ekleme hatası:', error);
    res.status(500).json({ success: false, message: 'Blog eklenirken hata oluştu' });
  }
});

// Blog güncelle (admin only)
app.put('/api/blogs/:id', adminAuth, (req, res) => {
  try {
    const { title, excerpt, content, category, author, image } = req.body;
    const blogId = parseInt(req.params.id) || req.params.id;
    
    const blogs = readBlogs();
    const index = blogs.findIndex(b => b.id === blogId);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
    }
    
    blogs[index] = {
      ...blogs[index],
      title: title?.trim() || blogs[index].title,
      excerpt: excerpt?.trim() || blogs[index].excerpt,
      content: content?.trim() || blogs[index].content,
      category: category?.trim() || blogs[index].category,
      author: author?.trim() || blogs[index].author,
      image: image || blogs[index].image,
      updatedAt: new Date().toISOString()
    };
    
    if (writeBlogs(blogs)) {
      res.json({ success: true, message: 'Blog güncellendi', data: blogs[index] });
    } else {
      res.status(500).json({ success: false, message: 'Blog güncellenemedi' });
    }
  } catch (error) {
    console.error('Blog güncelleme hatası:', error);
    res.status(500).json({ success: false, message: 'Blog güncellenirken hata oluştu' });
  }
});

// Blog sil (admin only)
app.delete('/api/blogs/:id', adminAuth, (req, res) => {
  try {
    const blogId = parseInt(req.params.id) || req.params.id;
    
    const blogs = readBlogs();
    const index = blogs.findIndex(b => b.id === blogId);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
    }
    
    const deletedBlog = blogs.splice(index, 1)[0];
    
    if (writeBlogs(blogs)) {
      res.json({ success: true, message: 'Blog silindi', data: deletedBlog });
    } else {
      res.status(500).json({ success: false, message: 'Blog silinemedi' });
    }
  } catch (error) {
    console.error('Blog silme hatası:', error);
    res.status(500).json({ success: false, message: 'Blog silinirken hata oluştu' });
  }
});

// ============== END BLOG API ==============

// Contact form endpoint
app.post('/api/contact', limiter, async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen tüm alanları doldurun.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir e-posta adresi girin.'
      });
    }

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
          .header { background: linear-gradient(135deg, #4158D0 0%, #C850C0 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
          .info-row { margin: 15px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #4158D0; border-radius: 5px; }
          .label { font-weight: bold; color: #4158D0; display: block; margin-bottom: 5px; }
          .value { color: #555; }
          .message-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; border: 1px solid #e0e0e0; }
          .footer { text-align: center; margin-top: 20px; padding: 20px; color: #7f8c8d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Yeni İletişim Formu Mesajı</h1>
            <p>242 Dijital Web Sitesi</p>
          </div>
          <div class="content">
            <div class="info-row"><span class="label">👤 Ad Soyad:</span><span class="value">${name}</span></div>
            <div class="info-row"><span class="label">📧 E-posta:</span><span class="value"><a href="mailto:${email}">${email}</a></span></div>
            <div class="info-row"><span class="label">📱 Telefon:</span><span class="value"><a href="tel:${phone}">${phone}</a></span></div>
            <div class="info-row"><span class="label">📌 Konu:</span><span class="value">${subject}</span></div>
            <div class="message-box"><span class="label">💬 Mesaj:</span><p class="value">${message.replace(/\n/g, '<br>')}</p></div>
            <div class="footer">
              <p>Bu mesaj ${new Date().toLocaleString('tr-TR')} tarihinde gönderildi.</p>
              <p>242 Dijital © ${new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: { name: '242 Dijital Web Sitesi', address: process.env.EMAIL_USER },
      to: process.env.RECIPIENT_EMAIL,
      replyTo: email,
      subject: `🔔 Yeni İletişim Formu: ${subject}`,
      html: htmlTemplate,
      text: `Yeni İletişim Formu Mesajı\n\nAd Soyad: ${name}\nE-posta: ${email}\nTelefon: ${phone}\nKonu: ${subject}\n\nMesaj:\n${message}\n\nGönderim Tarihi: ${new Date().toLocaleString('tr-TR')}`
    };

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
  res.status(404).json({ success: false, message: 'Endpoint bulunamadı' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ success: false, message: 'Sunucu hatası oluştu' });
});

// Server başlat
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   🚀 242 Dijital Backend Server       ║
║   📡 Port: ${PORT}                        ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}       ║
╚═══════════════════════════════════════╝
  `);
});

export default app;
