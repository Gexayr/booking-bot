const moment = require('moment-timezone');
const mongoose = require('mongoose'); // Added for ObjectId validation
const Booking = require('../models/Booking');
const { userLanguage, getTranslation } = require('../utils/translations');
const {
  getCalendarKeyboard,
  getTimeOptions,
  getPeopleOptions,
  getMainKeyboard,
  getLanguageKeyboard,
} = require('../utils/keyboards');

const tempBookings = new Map(); // Temporary storage during booking process

async function getUserBookings(userId) {
  const tomorrow = moment()
    .tz('Asia/Yerevan')
    .add(1, 'day')
    .format('YYYY-MM-DD');

  const bookings = await Booking.find({
    userId: userId,
    status: 'active',
    date: { $gte: tomorrow },
  }).sort({ date: 1, time: 1 });

  return bookings;
}

function handleCallback(bot) {
  bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;

    if (data === 'ignore') return bot.answerCallbackQuery(callbackQuery.id);

    if (data === 'time_taken') {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: getTranslation(userId, 'timeSlotTaken'),
        show_alert: true,
      });
      return;
    }

    if (data === 'cancel_no') {
      bot.sendMessage(
          chatId,
          getTranslation(userId, 'cancelNo') || 'Cancellation aborted 😊',
          {
            reply_markup: getMainKeyboard(userId),
          }
      );
      return bot.answerCallbackQuery(callbackQuery.id);
    }

    if (data.startsWith('lang_')) {
      const lang = data.split('_')[1];
      userLanguage.set(userId, lang);
      const now = moment().tz('Asia/Yerevan');
      const year = now.year();
      const month = now.month();
      bot.sendMessage(
        chatId,
        getTranslation(userId, 'welcome'),
        getCalendarKeyboard(year, month, userId)
      );
      return bot.answerCallbackQuery(callbackQuery.id);
    }

    if (!userLanguage.has(userId)) {
      bot.sendMessage(
        chatId,
        getTranslation(chatId, 'selectLanguage'),
        getLanguageKeyboard()
      );
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

      bot.sendMessage(
        chatId,
        `${getTranslation(userId, 'selectedDate')} ${selectedDate}\n${getTranslation(userId, 'chooseTime')}`,
        timeOptions
      );
    } else if (data.startsWith('time_')) {
      const [, date, hour] = data.split('_');
      const booking = tempBookings.get(userId) || {};
      booking.date = date;
      booking.hour = hour;
      tempBookings.set(userId, booking);

      bot.sendMessage(
        chatId,
        `${getTranslation(userId, 'selectedTime')} ${hour}:00\n${getTranslation(userId, 'choosePeople')}`,
        getPeopleOptions(date, hour, userId)
      );
    } else if (data.startsWith('people_')) {
      const [, date, hour, people] = data.split('_');

      try {
        const booking = new Booking({
          userId: userId,
          username: callbackQuery.from.username,
          firstName: callbackQuery.from.first_name,
          lastName: callbackQuery.from.last_name,
          date: date,
          time: hour,
          people: people,
          language: userLanguage.get(userId) || 'am',
        });

        await booking.save();

        // Get location from environment variables
        const latitude = parseFloat(process.env.LOCATION_LATITUDE);
        const longitude = parseFloat(process.env.LOCATION_LONGITUDE);

        // Validate coordinates
        if (isNaN(latitude) || isNaN(longitude)) {
          console.error('Invalid location coordinates in .env:', {
            latitude: process.env.LOCATION_LATITUDE,
            longitude: process.env.LOCATION_LONGITUDE,
          });
          bot.sendMessage(
              chatId,
              getTranslation(userId, 'errorSendingLocation') || 'Error: Location coordinates are invalid.'
          );
        } else {
          // Send confirmation to user
          bot.sendMessage(
              chatId,
              `${getTranslation(userId, 'bookingSuccess')}\n📆 ${getTranslation(userId, 'day')} ${date}\n🕒 ${getTranslation(userId, 'time')} ${hour}:00\n👥 ${getTranslation(userId, 'people')} ${people}\n📍 ${getTranslation(userId, 'address')} ${getTranslation(userId, 'addressValue')}`,
              {
                parse_mode: 'Markdown',
                reply_markup: getMainKeyboard(userId),
              }
          );

          bot.sendMessage(chatId, getTranslation(userId, 'viewOnMap'), {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: getTranslation(userId, 'openGoogleMaps'),
                    url: `https://www.google.com/maps?q=${latitude},${longitude}`,
                  },
                ],
                [
                  {
                    text: getTranslation(userId, 'openYandexMaps'),
                    url: `https://yandex.com/maps/?ll=${longitude},${latitude}&z=17&pt=${longitude},${latitude}~flag`,
                  },
                ],
              ],
            },
          });

          bot.sendLocation(chatId, latitude, longitude);
        }

        // Send notification to admin
        const adminId = process.env.ADMIN_USER_ID;
        if (adminId) {
          const adminMessage = `
New Booking Created! 🎉
User ID: ${userId}
Username: ${callbackQuery.from.username || 'N/A'}
First Name: ${callbackQuery.from.first_name || 'N/A'}
Last Name: ${callbackQuery.from.last_name || 'N/A'}
Date: ${date}
Time: ${hour}:00
People: ${people}
Language: ${userLanguage.get(userId) || 'am'}
          `.trim();
          try {
            await bot.sendMessage(adminId, adminMessage, { parse_mode: 'Markdown' });
          } catch (error) {
            console.error('Error sending notification to admin:', error);
          }
        } else {
          console.warn('ADMIN_USER_ID not set in .env');
        }

        tempBookings.delete(userId);
      } catch (error) {
        console.error('Error saving booking:', error);
        bot.sendMessage(chatId, getTranslation(userId, 'errorSavingBooking') || 'Error saving booking. Try again.');
      }
    } else if (data.startsWith('cancel_')) {
      const bookingId = data.split('_')[1];

      bot.sendMessage(
        chatId,
        getTranslation(userId, 'confirmCancel'),
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: getTranslation(userId, 'yes'),
                  callback_data: `confirmCancel_${bookingId}`,
                },
                {
                  text: getTranslation(userId, 'no'),
                  callback_data: 'cancel_no',
                },
              ],
            ],
          },
        }
      );
    } else if (data.startsWith('confirmCancel_') && data !== 'cancel_no') {
      const bookingId = data.split('_')[1];

      // Validate bookingId as a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        console.error('Invalid bookingId:', bookingId);
        bot.sendMessage(
            chatId,
            getTranslation(userId, 'errorCancellingBooking') || 'Error: Invalid booking ID.'
        );
        return bot.answerCallbackQuery(callbackQuery.id);
      }

      try {
        await Booking.findByIdAndUpdate(bookingId, { status: 'cancelled' });
        bot.sendMessage(
          chatId,
          getTranslation(userId, 'bookingCancelled'),
          {
            reply_markup: getMainKeyboard(userId),
          }
        );
      } catch (error) {
        console.error('Error cancelling booking:', error);
        bot.sendMessage(chatId, getTranslation(userId, 'errorCancellingBooking') || 'Error cancelling booking.');
      }
    }

    bot.answerCallbackQuery(callbackQuery.id);
  });
}

module.exports = { handleCallback };