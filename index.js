require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const connectDB = require('./config/db');
const { handleStart } = require('./handlers/start');
const { handleCallback } = require('./handlers/callback');
const { handleMessage } = require('./handlers/message');
const { setupCronJobs } = require('./utils/cron');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Connect to MongoDB
connectDB();

// Set up handlers
handleStart(bot);
handleCallback(bot);
handleMessage(bot);

// Set up cron jobs
setupCronJobs();

console.log('Bot started successfully!');