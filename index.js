require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const bookings = new Map();
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
    noBookingsToday: '❌ Այսօրվա համար գրանցումներն ավարտված են։\nԽնդրում ենք ընտրել հաջորդ օրերից մեկը 📅',
    viewOnMap: '📌 Ցանկանու՞մ եք տեսնել մեր տեղը քարտեզում։ Ընտրեք քարտեզի տեսակը։',
    openGoogleMaps: '📍 Բացել Google Maps-ում',
    openYandexMaps: '🗺️ Բացել Yandex Քարտեզում',
    selectLanguage: `Խնդրում եմ, ընտրեք լեզուն։\nPlease, choose a language.`,
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
    noBookingsToday: '❌ Записи на сегодня закончились.\nПожалуйста, выберите один из следующих дней 📅',
    viewOnMap: '📌 Хотите посмотреть наше место на карте? Выберите тип карты.',
    openGoogleMaps: '📍 Открыть в Google Maps',
    openYandexMaps: '🗺️ Открыть в Yandex Картах',
    selectLanguage: 'Выберите язык.',
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
    noBookingsToday: '❌ Bookings for today are full.\nPlease select one of the following days 📅',
    viewOnMap: '📌 Do you want to see our location on the map? Choose the map type.',
    openGoogleMaps: '📍 Open in Google Maps',
    openYandexMaps: '🗺️ Open in Yandex Maps',
    selectLanguage: 'Select Language.',
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

function getTimeOptions(dateString, userId) {
  const now = moment().tz('Asia/Yerevan');
  const selectedDate = moment.tz(dateString, 'YYYY-MM-DD', 'Asia/Yerevan');
  const buttons = [];
  let row = [];

  for (let hour = 10; hour <= 22; hour++) {
    const timeSlot = selectedDate.clone().hour(hour).minute(0);
    if (selectedDate.isAfter(now, 'day') || timeSlot.isAfter(now)) {
      row.push({
        text: `🕒 ${hour}:00`,
        callback_data: `time_${dateString}_${hour}`,
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

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, getTranslation(chatId, 'selectLanguage'), getLanguageKeyboard());
});

bot.on('callback_query', (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;

  if (data === 'ignore') return bot.answerCallbackQuery(callbackQuery.id);

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
    // If language is not set, prompt for language selection again
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
    bookings.set(userId, { date: selectedDate });

    const timeOptions = getTimeOptions(selectedDate, userId);
    if (timeOptions.reply_markup.inline_keyboard.length === 0) {
      bot.sendMessage(chatId, getTranslation(userId, 'noBookingsToday'));
      return;
    }

    bot.sendMessage(chatId, `${getTranslation(userId, 'selectedDate')} ${selectedDate}\n${getTranslation(userId, 'chooseTime')}`, timeOptions);
  }

  else if (data.startsWith('time_')) {
    const [, date, hour] = data.split('_');
    const booking = bookings.get(userId) || {};
    booking.date = date;
    booking.hour = hour;
    bookings.set(userId, booking);

    bot.sendMessage(chatId, `${getTranslation(userId, 'selectedTime')} ${hour}:00\n${getTranslation(userId, 'choosePeople')}`, getPeopleOptions(date, hour, userId));
  }

  else if (data.startsWith('people_')) {
    const [, date, hour, people] = data.split('_');
    const booking = bookings.get(userId) || {};
    booking.people = people;
    bookings.set(userId, booking);

    // ✅ Ամրագրում
    bot.sendMessage(
      chatId,
      `${getTranslation(userId, 'bookingSuccess')}\n📆 ${getTranslation(userId, 'day')}՝ ${date}\n🕒 ${getTranslation(userId, 'time')}՝ ${hour}:00\n👥 ${getTranslation(userId, 'people')}՝ ${people}\n📍 ${getTranslation(userId, 'address')}՝ ${getTranslation(userId, 'addressValue')}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: getTranslation(userId, 'bookAgain') }]],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      }
    );

    // Քարտեզի ընտրություն
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

    // Վերջում ուղիղ քարտեզ
    bot.sendLocation(chatId, 40.188770, 44.462507);

    bookings.delete(userId);
  }

  bot.answerCallbackQuery(callbackQuery.id);
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!userLanguage.has(userId)) {
    // If language is not set, prompt for language selection again
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
      {
        ...getCalendarKeyboard(year, month, userId),
        reply_markup: {
          ...getCalendarKeyboard(year, month, userId).reply_markup,
          remove_keyboard: true,
        },
      }
    );
  } else {
    bot.sendMessage(chatId, `${getTranslation(userId, 'welcome')}\n${getTranslation(userId, 'bookAgain')}`, {
      reply_markup: {
        keyboard: [[{ text: getTranslation(userId, 'bookAgain') }]],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  }
});