# Telegram Booking Bot

Простой Telegram-бот для бронирования, использующий Node.js, MongoDB и Docker.

## 📦 Стек технологий

- Node.js
- MongoDB
- Mongoose
- Docker + Docker Compose
- dotenv
- node-telegram-bot-api

## 🚀 Быстрый старт

### 1. Клонируйте репозиторий

```bash
    git clone https://github.com/Gexayr/booking-bot.git
    cd booking-bot
```

## 2. Создайте .env файл

### Создайте файл .env в корне проекта:

```bash
    TELEGRAM_TOKEN=ваш_токен_бота
    MONGO_URI=mongodb://root:example@mongo:27017/booking?authSource=admin
```

## 3. Запуск через Docker Compose

```bash
  docker-compose up --build
```
Бот автоматически подключится к MongoDB и начнёт работу

## 🧠 Подключение к MongoDB

### В файле index.js происходит подключение к MongoDB через переменную окружения MONGO_URI.

```js
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

```

## 🔄 Перезапуск

При изменении кода можно использовать:

```bash
  docker-compose down
  docker-compose up --build
```
or if need to clear old data
```bash
    docker-compose down -v
    docker volume rm booking_mongo-data
    docker-compose up --build
```

## 🧼 Остановка и очистка

```bash
    docker-compose down -v
```

## Structure
```
booking/
├── config/
│   └── db.js                # MongoDB connection setup
├── models/
│   └── Booking.js           # Mongoose Booking model
├── utils/
│   ├── translations.js      # Language translations and getTranslation helper
│   ├── keyboards.js         # Keyboard generation functions (calendar, time, people, etc.)
│   └── cron.js              # Cron job for cleaning old bookings
├── handlers/
│   ├── start.js             # /start command handler
│   ├── callback.js          # Callback query handler for inline keyboards
│   └── message.js           # Message handler for text inputs
├── index.js                 # Main entry point to initialize the bot
├── package.json             # 
├── Dockerfile               # 
├── docker-compose.yaml      # 
└── .env                     #  for environment variables
```

## 📚 Лицензия

#### MIT