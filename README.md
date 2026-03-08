# Konsultan Kegalauan

Asisten AI berbasis chatbot yang membantu kamu berpikir jernih sebelum mengambil keputusan. Didukung oleh Google Gemini 2.5 Flash.

![Konsultan Kegalauan](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blue)
![Node.js](https://img.shields.io/badge/Node.js-ES%20Modules-green)
![Express](https://img.shields.io/badge/Express-5.x-lightgrey)

## Fitur

- **Multi-turn conversation** — AI mengingat konteks percakapan sebelumnya
- **Analisis keputusan terstruktur** — Membandingkan opsi dengan Pro/Kontra dan rekomendasi
- **Upload gambar** — Kirim gambar untuk dianalisis AI
- **Upload dokumen** — Kirim PDF, DOC, TXT, CSV, XLS untuk dianalisis
- **Upload audio** — Kirim file audio untuk ditranskripsikan dan dianalisis
- **Chat-style response** — Balasan AI muncul sebagai beberapa pesan pendek seperti chat asli
- **Media preview** — File yang di-upload tampil sebagai thumbnail, audio player, atau kartu dokumen

## Struktur Proyek

```
gemini-flash-api/
├── client/
│   ├── index.html        # Halaman utama chatbot
│   ├── style.css         # Styling UI
│   └── script.js         # Logika frontend
├── server/
│   ├── index.js          # Express API server
│   ├── package.json      # Dependencies
│   ├── .env              # API key (tidak di-commit)
│   └── uploads/          # File yang di-upload pengguna
│       ├── images/
│       ├── documents/
│       └── audio/
├── .gitignore
└── README.md
```

## Prasyarat

- [Node.js](https://nodejs.org/) v18 atau lebih baru
- [Google AI Studio API Key](https://aistudio.google.com/apikey)

## Instalasi

1. **Clone repository**

   ```bash
   git clone <repo-url>
   cd gemini-flash-api
   ```

2. **Install dependencies**

   ```bash
   cd server
   npm install
   ```

3. **Konfigurasi environment**

   Buat file `server/.env`:

   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Jalankan server**

   ```bash
   # Development (hot reload)
   npm run dev

   # Production
   npm start
   ```

   Server berjalan di `http://localhost:3000`.

5. **Buka client**

   Buka `client/index.html` di browser (bisa langsung double-click atau gunakan Live Server).

## API Endpoints

| Method | Endpoint                  | Deskripsi                        |
| ------ | ------------------------- | -------------------------------- |
| POST   | `/api/chat`               | Chat teks multi-turn             |
| POST   | `/generate-from-image`    | Upload & analisis gambar         |
| POST   | `/generate-from-document` | Upload & analisis dokumen        |
| POST   | `/generate-from-audio`    | Upload & analisis audio          |
| GET    | `/uploads/*`              | Akses file yang sudah di-upload  |

### POST /api/chat

```json
{
  "conversation": [
    { "role": "user", "text": "Aku galau antara kerja atau kuliah..." },
    { "role": "model", "text": "..." },
    { "role": "user", "text": "Kalau kerja remote gimana?" }
  ]
}
```

### POST /generate-from-image (FormData)

| Field          | Tipe   | Deskripsi                          |
| -------------- | ------ | ---------------------------------- |
| `image`        | File   | File gambar (wajib)                |
| `prompt`       | String | Pertanyaan tambahan (opsional)     |
| `conversation` | String | JSON array riwayat chat (opsional) |

Endpoint `/generate-from-document` dan `/generate-from-audio` memiliki format yang sama (field file: `document` / `audio`).

## Tech Stack

- **Frontend** — HTML, CSS, Vanilla JavaScript
- **Backend** — Node.js, Express 5, ES Modules
- **AI** — Google Gemini 2.5 Flash via `@google/genai`
- **File Upload** — Multer (disk storage)
- **Dev Tools** — Nodemon (hot reload)

## Lisensi

ISC
