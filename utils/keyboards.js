const moment = require('moment-timezone');
const { getTranslation } = require('./translations');
const Booking = require('../models/Booking');

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
    { text: `⬅️`, callback_data: `month_${prev.year()}_${prev.month()}` },
    { text: `${currentMonth.format('MMMM')}`, callback_data: 'ignore_month_name_display' },
    { text: `➡️`, callback_data: `month_${next.year()}_${next.month()}` },
  ]);

  return { reply_markup: { inline_keyboard: keyboard } };
}

async function getTimeOptions(dateString, userId) {
  const now = moment().tz('Asia/Yerevan');
  const selectedDate = moment.tz(dateString, 'YYYY-MM-DD', 'Asia/Yerevan');
  const buttons = [];
  let row = [];

  const existingBookings = await Booking.find({
    date: dateString,
    status: 'active',
  });

  const bookedTimes = existingBookings.map((booking) => parseInt(booking.time));

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
        [
          {
            text: `👤 1-2 ${getTranslation(userId, 'people')}`,
            callback_data: `people_${date}_${hour}_1-2`,
          },
        ],
        [
          {
            text: `👥 2-4 ${getTranslation(userId, 'people')}`,
            callback_data: `people_${date}_${hour}_2-4`,
          },
        ],
        [
          {
            text: `👨‍👩‍👧‍👦 4+ ${getTranslation(userId, 'people')}`,
            callback_data: `people_${date}_${hour}_4+`,
          },
        ],
      ],
    },
  };
}

function getMainKeyboard(userId) {
  return {
    keyboard: [
      [{ text: getTranslation(userId, 'bookAgain') }],
      [{ text: getTranslation(userId, 'myBookings') }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

module.exports = {
  getLanguageKeyboard,
  getCalendarKeyboard,
  getTimeOptions,
  getPeopleOptions,
  getMainKeyboard,
};