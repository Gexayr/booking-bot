require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');
const cron = require('node-cron');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const tempBookings = new Map(); // Temporary storage during booking process
const userLanguage = new Map(); // To store user's language preference

// Language translations
const translations = {
  am: {
    welcome: 'Բարի գալուստ 🍽️\nԽնդրում եմ ընտրիր ամսաթիվը՝ օրացույցից։',
    chooseDate: 'Խնդրում եմ ընտրիր ամսաթիվը՝ օրացույցից։',
    selectedDate: '📆 Ընտրված օր՝',
    chooseTime: 'Խնդրում եմ ընտրիր ժամը։',
    selectedTime: '🕒 Ընտրված ժամ՝',
    choosePeople: 'Խնդրում եմ նշիր մարդկանց քանակը։',
    bookingSuccess: '✅ Ամրագրումը հաջողությամբ կատարված է:',
    day: 'Օր',
    time: 'Ժամ',
    people: 'Մարդիկ',
    address: 'Հասցե',
    bookAgain: '🚀 Սկսել ամրագրումը',
    myBookings: '📋 Իմ ամրագրումները',
    cancelBooking: '❌ Չեղարկել ամրագրումը',
    noBookingsToday: '❌ Այսօրվա համար գրանցումներն ավարտված են։\nԽնդրում ենք ընտրել հաջորդ օրերից մեկը 📅',
    noActiveBookings: '📋 Դուք ակտիվ ամրագրում չունեք։',
    viewOnMap: '📌 Ցանկանու՞մ եք տեսնել մեր տեղը քարտեզում։ Ընտրեք քարտեզի տեսակը։',
    openGoogleMaps: '📍 Բացել Google Maps-ում',
    openYandexMaps: '🗺️ Բացել Yandex Քարտեզում',
    selectLanguage: `Խնդրում եմ, ընտրեք լեզուն։\nPlease, choose a language.`,
    bookingCancelled: '✅ Ամրագրումը չեղարկված է:',
    confirmCancel: 'Հաստատե՞ք չեղարկումը:',
    yes: 'Այո',
    no: 'Ոչ',
    timeSlotTaken: 'Ցավոք, այս ժամանա՞կաշրջանը արդեն զբաղված է: Ընտրեք այլ ժամ:',
    weekDays: ['Կրկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ', 'Կիր'],
    addressValue: '*3, 3a Sebastia St, Yerevan*',
  },
  ru: {
    welcome: 'Добро пожаловать 🍽️\nПожалуйста, выберите дату из календаря.',
    chooseDate: 'Пожалуйста, выберите дату из календаря.',
    selectedDate: '📆 Выбранная дата:',
    chooseTime: 'Пожалуйста, выберите время.',
    selectedTime: '🕒 Выбранное время:',
    choosePeople: 'Пожалуйста, укажите количество человек.',
    bookingSuccess: '✅ Бронирование успешно завершено:',
    day: 'День',
    time: 'Время',
    people: 'Человек',
    address: 'Адрес',
    bookAgain: '🚀 Начать бронирование',
    myBookings: '📋 Мои бронирования',
    cancelBooking: '❌ Отменить бронирование',
    noBookingsToday: '❌ Записи на сегодня закончились.\nПожалуйста, выберите один из следующих дней 📅',
    noActiveBookings: '📋 У вас нет активных бронирований.',
    viewOnMap: '📌 Хотите посмотреть наше место на карте? Выберите тип карты.',
    openGoogleMaps: '📍 Открыть в Google Maps',
    openYandexMaps: '🗺️ Открыть в Yandex Картах',
    selectLanguage: 'Выберите язык.',
    bookingCancelled: '✅ Бронирование отменено.',
    confirmCancel: 'Подтвердите отмену:',
    yes: 'Да',
    no: 'Нет',
    timeSlotTaken: 'К сожалению, это время уже занято. Выберите другое время.',
    weekDays: ['Пнд', 'Втр', 'Срд', 'Чтв', 'Птн', 'Сбт', 'Вск'],
    addressValue: '*3, 3a Sebastia St, Yerevan*',
  },
  en: {
    welcome: 'Welcome 🍽️\nPlease select a date from the calendar.',
    chooseDate: 'Please select a date from the calendar.',
    selectedDate: '📆 Selected Date:',
    chooseTime: 'Please select a time.',
    selectedTime: '🕒 Selected Time:',
    choosePeople: 'Please specify the number of people.',
    bookingSuccess: '✅ Booking successfully completed:',
    day: 'Day',
    time: 'Time',
    people: 'People',
    address: 'Address',
    bookAgain: '🚀 Start Booking',
    myBookings: '📋 My Bookings',
    cancelBooking: '❌ Cancel Booking',
    noBookingsToday: '❌ Bookings for today are full.\nPlease select one of the following days 📅',
    noActiveBookings: '📋 You have no active bookings.',
    viewOnMap: '📌 Do you want to see our location on the map? Choose the map type.',
    openGoogleMaps: '📍 Open in Google Maps',
    openYandexMaps: '🗺️ Open in Yandex Maps',
    selectLanguage: 'Select Language.',
    bookingCancelled: '✅ Booking cancelled.',
    confirmCancel: 'Confirm cancellation:',
    yes: 'Yes',
    no: 'No',
    timeSlotTaken: 'Sorry, this time slot is already taken. Please choose another time.',
    weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    addressValue: '*3, 3a Sebastia St, Yerevan*',
  },
};

function getTranslation(userId, key) {
  const lang = userLanguage.get(userId) || 'am'; // Default to Armenian
  return translations[lang][key];
}

function getLanguageKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Հայերեն 🇦🇲', callback_data: 'lang_am' }],
        [{ text: 'Русский 🇷🇺', callback_data: 'lang_ru' }],
        [{ text: 'English 🇬🇧', callback_data: 'lang_en' }],
      ],
    },
  };
}

function getCalendarKeyboard(year, month, userId) {
  const today = moment().tz('Asia/Yerevan').startOf('day');
  const currentMonth = moment.tz([year, month], 'Asia/Yerevan');
  const daysInMonth = currentMonth.daysInMonth();
  const startDay = (currentMonth.startOf('month').day() + 6) % 7; // Adjust for Monday start

  const keyboard = [];
  const monthName = currentMonth.format('MMMM');
  keyboard.push([{ text: `🗓️ ${monthName}`, callback_data: 'ignore' }]);

  const weekDays = getTranslation(userId, 'weekDays');
  keyboard.push(weekDays.map((d) => ({ text: d, callback_data: 'ignore' })));

  let row = new Array(startDay).fill({ text: ' ', callback_data: 'ignore' });

  for (let day = 1; day <= daysInMonth; day++) {
    const date = moment.tz([year, month, day], 'Asia/Yerevan').startOf('day');
    const dateStr = date.format('YYYY-MM-DD');

    if (date.isBefore(today)) {
      row.push({ text: `🔒${day}`, callback_data: 'ignore' });
    } else if (date.isSame(today)) {
      row.push({ text: `📍${day}`, callback_data: `date_${dateStr}` });
    } else {
      row.push({ text: `${day}`, callback_data: `date_${dateStr}` });
    }

    if (row.length === 7) {
      keyboard.push(row);
      row = [];
    }
  }

  if (row.length > 0) {
    while (row.length < 7) row.push({ text: ' ', callback_data: 'ignore' });
    keyboard.push(row);
  }

  const next = moment([year, month]).add(1, 'month');
  keyboard.push([
    { text: '➡️', callback_data: `month_${next.year()}_${next.month()}` },
  ]);

  return { reply_markup: { inline_keyboard: keyboard } };
}

async function getTimeOptions(dateString, userId) {
  const now = moment().tz('Asia/Yerevan');
  const selectedDate = moment.tz(dateString, 'YYYY-MM-DD', 'Asia/Yerevan');
  const buttons = [];
  let row = [];

  // Get existing bookings for this date
  const existingBookings = await Booking.find({
    date: dateString,
    status: 'active'
  });

  const bookedTimes = existingBookings.map(booking => parseInt(booking.time));

  for (let hour = 10; hour <= 22; hour++) {
    const timeSlot = selectedDate.clone().hour(hour).minute(0);

    if (selectedDate.isAfter(now, 'day') || timeSlot.isAfter(now)) {
      const isBooked = bookedTimes.includes(hour);
      const timeText = isBooked ? `🔒 ${hour}:00` : `🕒 ${hour}:00`;
      const callbackData = isBooked ? 'time_taken' : `time_${dateString}_${hour}`;

      row.push({
        text: timeText,
        callback_data: callbackData,
      });

      if (row.length === 3) {
        buttons.push(row);
        row = [];
      }
    }
  }

  if (row.length > 0) buttons.push(row);

  return { reply_markup: { inline_keyboard: buttons } };
}

function getPeopleOptions(date, hour, userId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: `👤 1-2 ${getTranslation(userId, 'people')}`, callback_data: `people_${date}_${hour}_1-2` }],
        [{ text: `👥 2-4 ${getTranslation(userId, 'people')}`, callback_data: `people_${date}_${hour}_2-4` }],
        [{ text: `👨‍👩‍👧‍👦 4+ ${getTranslation(userId, 'people')}`, callback_data: `people_${date}_${hour}_4+` }],
      ],
    },
  };
}

function getMainKeyboard(userId) {
  return {
    keyboard: [
      [{ text: getTranslation(userId, 'bookAgain') }],
      [{ text: getTranslation(userId, 'myBookings') }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

async function getUserBookings(userId) {
  const tomorrow = moment().tz('Asia/Yerevan').add(1, 'day').format('YYYY-MM-DD');

  const bookings = await Booking.find({
    userId: userId,
    status: 'active',
    date: { $gte: tomorrow }
  }).sort({ date: 1, time: 1 });

  return bookings;
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, getTranslation(chatId, 'selectLanguage'), getLanguageKeyboard());
});

bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;

  if (data === 'ignore') return bot.answerCallbackQuery(callbackQuery.id);

  if (data === 'time_taken') {
    bot.answerCallbackQuery(callbackQuery.id, {
      text: getTranslation(userId, 'timeSlotTaken'),
      show_alert: true
    });
    return;
  }

  if (data.startsWith('lang_')) {
    const lang = data.split('_')[1];
    userLanguage.set(userId, lang);
    const now = moment().tz('Asia/Yerevan');
    const year = now.year();
    const month = now.month();
    bot.sendMessage(chatId, getTranslation(userId, 'welcome'), getCalendarKeyboard(year, month, userId));
    return bot.answerCallbackQuery(callbackQuery.id);
  }

  if (!userLanguage.has(userId)) {
    bot.sendMessage(chatId, getTranslation(chatId, 'selectLanguage'), getLanguageKeyboard());
    return bot.answerCallbackQuery(callbackQuery.id);
  }

  if (data.startsWith('month_')) {
    const [, y, m] = data.split('_');
    return bot.editMessageReplyMarkup(
        getCalendarKeyboard(parseInt(y), parseInt(m), userId).reply_markup,
        {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
        }
    );
  }

  if (data.startsWith('date_')) {
    const selectedDate = data.split('_')[1];
    tempBookings.set(userId, { date: selectedDate });

    const timeOptions = await getTimeOptions(selectedDate, userId);
    if (timeOptions.reply_markup.inline_keyboard.length === 0) {
      bot.sendMessage(chatId, getTranslation(userId, 'noBookingsToday'));
      return;
    }

    bot.sendMessage(chatId, `${getTranslation(userId, 'selectedDate')} ${selectedDate}\n${getTranslation(userId, 'chooseTime')}`, timeOptions);
  }

  else if (data.startsWith('time_')) {
    const [, date, hour] = data.split('_');
    const booking = tempBookings.get(userId) || {};
    booking.date = date;
    booking.hour = hour;
    tempBookings.set(userId, booking);

    bot.sendMessage(chatId, `${getTranslation(userId, 'selectedTime')} ${hour}:00\n${getTranslation(userId, 'choosePeople')}`, getPeopleOptions(date, hour, userId));
  }

  else if (data.startsWith('people_')) {
    const [, date, hour, people] = data.split('_');

    try {
      // Save booking to MongoDB
      const booking = new Booking({
        userId: userId,
        username: callbackQuery.from.username,
        firstName: callbackQuery.from.first_name,
        lastName: callbackQuery.from.last_name,
        date: date,
        time: hour,
        people: people,
        language: userLanguage.get(userId) || 'am'
      });

      await booking.save();

      bot.sendMessage(
          chatId,
          `${getTranslation(userId, 'bookingSuccess')}\n📆 ${getTranslation(userId, 'day')}՝ ${date}\n🕒 ${getTranslation(userId, 'time')}՝ ${hour}:00\n👥 ${getTranslation(userId, 'people')}՝ ${people}\n📍 ${getTranslation(userId, 'address')}՝ ${getTranslation(userId, 'addressValue')}`,
          {
            parse_mode: 'Markdown',
            reply_markup: getMainKeyboard(userId),
          }
      );

      // Карта
      bot.sendMessage(chatId, getTranslation(userId, 'viewOnMap'), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: getTranslation(userId, 'openGoogleMaps'),
                url: 'https://www.google.com/maps?q=40.188770,44.462507',
              },
            ],
            [
              {
                text: getTranslation(userId, 'openYandexMaps'),
                url: 'https://yandex.com/maps/?ll=44.462507,40.188770&z=17&pt=44.462507,40.188770~flag',
              },
            ],
          ],
        },
      });

      bot.sendLocation(chatId, 40.188770, 44.462507);

      tempBookings.delete(userId);
    } catch (error) {
      console.error('Error saving booking:', error);
      bot.sendMessage(chatId, 'Произошла ошибка при сохранении бронирования. Попробуйте еще раз.');
    }
  }

  else if (data.startsWith('cancel_')) {
    const bookingId = data.split('_')[1];

    bot.sendMessage(chatId, getTranslation(userId, 'confirmCancel'), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: getTranslation(userId, 'yes'), callback_data: `confirm_cancel_${bookingId}` },
            { text: getTranslation(userId, 'no'), callback_data: 'cancel_no' }
          ]
        ]
      }
    });
  }

  else if (data.startsWith('confirm_cancel_')) {
    const bookingId = data.split('_')[2];

    try {
      await Booking.findByIdAndUpdate(bookingId, { status: 'cancelled' });
      bot.sendMessage(chatId, getTranslation(userId, 'bookingCancelled'), {
        reply_markup: getMainKeyboard(userId)
      });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      bot.sendMessage(chatId, 'Произошла ошибка при отмене бронирования.');
    }
  }

  else if (data === 'cancel_no') {
    bot.sendMessage(chatId, 'Отмена отменена 😊', {
      reply_markup: getMainKeyboard(userId)
    });
  }

  bot.answerCallbackQuery(callbackQuery.id);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!userLanguage.has(userId)) {
    bot.sendMessage(chatId, getTranslation(chatId, 'selectLanguage'), getLanguageKeyboard());
    return;
  }

  if (text === getTranslation(userId, 'bookAgain')) {
    const now = moment().tz('Asia/Yerevan');
    const year = now.year();
    const month = now.month();

    bot.sendMessage(
        chatId,
        getTranslation(userId, 'chooseDate'),
        getCalendarKeyboard(year, month, userId)
    );
  }

  else if (text === getTranslation(userId, 'myBookings')) {
    try {
      const bookings = await getUserBookings(userId);

      if (bookings.length === 0) {
        bot.sendMessage(chatId, getTranslation(userId, 'noActiveBookings'), {
          reply_markup: getMainKeyboard(userId)
        });
        return;
      }

      let message = '📋 Ваши активные бронирования:\n\n';
      const buttons = [];

      bookings.forEach((booking, index) => {
        message += `${index + 1}. 📆 ${booking.date} 🕒 ${booking.time}:00 👥 ${booking.people}\n`;
        buttons.push([{
          text: `❌ Отменить ${booking.date} ${booking.time}:00`,
          callback_data: `cancel_${booking._id}`
        }]);
      });

      bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: buttons
        }
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      bot.sendMessage(chatId, 'Произошла ошибка при получении бронирований.');
    }
  }

  else {
    bot.sendMessage(chatId, getTranslation(userId, 'welcome'), {
      reply_markup: getMainKeyboard(userId)
    });
  }
});

// Cron job to clean up old bookings
cron.schedule('0 0 * * *', async () => {
  const yesterday = moment().tz('Asia/Yerevan').subtract(1, 'day').format('YYYY-MM-DD');

  try {
    const result = await Booking.updateMany(
        { date: { $lt: yesterday }, status: 'active' },
        { status: 'completed' }
    );
    console.log(`Updated ${result.modifiedCount} old bookings to completed status`);
  } catch (error) {
    console.error('Error updating old bookings:', error);
  }
});

console.log('Bot started successfully!');