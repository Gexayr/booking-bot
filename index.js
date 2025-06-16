require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment-timezone');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const bookings = new Map();

function getCalendarKeyboard(year, month) {
  const today = moment().tz('Asia/Yerevan').startOf('day');
  const currentMonth = moment.tz([year, month], 'Asia/Yerevan');
  const daysInMonth = currentMonth.daysInMonth();
  const startDay = (currentMonth.startOf('month').day() + 6) % 7;

  const keyboard = [];
  const monthName = currentMonth.format('MMMM YYYY');
  keyboard.push([{ text: `🗓️ ${monthName}`, callback_data: 'ignore' }]);

  const weekDays = ['Կրկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ', 'Կիր'];
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

function getTimeOptions(dateString) {
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

function getPeopleOptions(date, hour) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '👤 1-2 մարդ', callback_data: `people_${date}_${hour}_1-2` }],
        [{ text: '👥 2-4 մարդ', callback_data: `people_${date}_${hour}_2-4` }],
        [{ text: '👨‍👩‍👧‍👦 4+ մարդ', callback_data: `people_${date}_${hour}_4+` }],
      ],
    },
  };
}

bot.onText(/\/start/, (msg) => {
  const now = moment().tz('Asia/Yerevan');
  const year = now.year();
  const month = now.month();

  bot.sendMessage(
    msg.chat.id,
    "Բարի գալուստ 🍽️\nԽնդրում եմ ընտրիր ամսաթիվը՝ օրացույցից։",
    getCalendarKeyboard(year, month)
  );
});

bot.on('callback_query', (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;

  if (data === 'ignore') return bot.answerCallbackQuery(callbackQuery.id);

  if (data.startsWith('month_')) {
    const [, y, m] = data.split('_');
    return bot.editMessageReplyMarkup(
      getCalendarKeyboard(parseInt(y), parseInt(m)).reply_markup,
      {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
      }
    );
  }

  if (data.startsWith('date_')) {
    const selectedDate = data.split('_')[1];
    bookings.set(userId, { date: selectedDate });

    const timeOptions = getTimeOptions(selectedDate);
    if (timeOptions.reply_markup.inline_keyboard.length === 0) {
      bot.sendMessage(chatId, '❌ Այսօրվա համար գրանցումներն ավարտված են։\nԽնդրում ենք ընտրել հաջորդ օրերից մեկը 📅');
      return;
    }

    bot.sendMessage(chatId, `📆 Ընտրված օր՝ ${selectedDate}\nԽնդրում եմ ընտրիր ժամը։`, timeOptions);
  }

  else if (data.startsWith('time_')) {
    const [, date, hour] = data.split('_');
    const booking = bookings.get(userId) || {};
    booking.date = date;
    booking.hour = hour;
    bookings.set(userId, booking);

    bot.sendMessage(chatId, `🕒 Ընտրված ժամ՝ ${hour}:00\nԽնդրում եմ նշիր մարդկանց քանակը։`, getPeopleOptions(date, hour));
  }

  else if (data.startsWith('people_')) {
    const [, date, hour, people] = data.split('_');
    const booking = bookings.get(userId) || {};
    booking.people = people;
    bookings.set(userId, booking);

    // ✅ Ամրագրում
    bot.sendMessage(
      chatId,
      `✅ Ամրագրումը հաջողությամբ կատարված է:\n📆 Օր՝ ${date}\n🕒 Ժամ՝ ${hour}:00\n👥 Մարդիկ՝ ${people}\n📍 Հասցե՝ *3, 3a Sebastia St, Yerevan*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [[{ text: '🚀 Սկսել ամրագրումը' }]],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      }
    );

    // Քարտեզի ընտրություն
    bot.sendMessage(chatId, '📌 Ցանկանու՞մ եք տեսնել մեր տեղը քարտեզում։ Ընտրեք քարտեզի տեսակը։', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📍 Բացել Google Maps-ում',
              url: 'https://www.google.com/maps?q=40.188770,44.462507',
            },
          ],
          [
            {
              text: '🗺️ Բացել Yandex Քարտեզում',
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
  const text = msg.text;

  if (text === '🚀 Սկսել ամրագրումը') {
    const now = moment().tz('Asia/Yerevan');
    const year = now.year();
    const month = now.month();

    bot.sendMessage(
      chatId,
      'Խնդրում եմ ընտրիր ամսաթիվը՝ օրացույցից։',
      {
        ...getCalendarKeyboard(year, month),
        reply_markup: {
          ...getCalendarKeyboard(year, month).reply_markup,
          remove_keyboard: true,
        },
      }
    );
  } else {
    bot.sendMessage(chatId, 'Բարի գալուստ 🍽️\nՍեղմիր կոճակը՝ սկսելու ամրագրումը։', {
      reply_markup: {
        keyboard: [[{ text: '🚀 Սկսել ամրագրումը' }]],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  }
});