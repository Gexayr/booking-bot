const moment = require('moment-timezone');
const { userLanguage, getTranslation } = require('../utils/translations');
const { getCalendarKeyboard, getMainKeyboard, getLanguageKeyboard } = require('../utils/keyboards');
const Booking = require('../models/Booking');

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

function handleMessage(bot) {
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text;

        if (!userLanguage.has(userId)) {
            return bot.sendMessage(
                chatId,
                getTranslation(userId, 'selectLanguage'),
                getLanguageKeyboard()
            );
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
        } else if (text === getTranslation(userId, 'myBookings')) {
            try {
                const bookings = await getUserBookings(userId);

                if (bookings.length === 0) {
                    bot.sendMessage(
                        chatId,
                        getTranslation(userId, 'noActiveBookings'),
                        {
                            reply_markup: getMainKeyboard(userId),
                        }
                    );
                    return;
                }

                let message = `📋 ${getTranslation(userId, 'myBookings')}:\n\n`;
                const buttons = [];

                for (const [index, booking] of bookings.entries()) {
                    message += `${index + 1}. 📆 ${booking.date} 🕒 ${booking.time}:00 👥 ${booking.people}\n`;
                    buttons.push([
                        {
                            text: `❌ ${getTranslation(userId, 'cancelBooking')} ${booking.date} ${booking.time}:00`,
                            callback_data: `cancel_${booking._id}`,
                        },
                    ]);
                }

                bot.sendMessage(chatId, message, {
                    reply_markup: {
                        inline_keyboard: buttons,
                    },
                });
            } catch (error) {
                console.error('Error fetching bookings:', error);
                bot.sendMessage(
                    chatId,
                    getTranslation(userId, 'errorFetchingBookings') || 'Error fetching bookings.'
                );
            }
        } else {
            bot.sendMessage(
                chatId,
                getTranslation(userId, 'welcome'),
                {
                    reply_markup: getMainKeyboard(userId),
                }
            );
        }
    });
}

module.exports = { handleMessage };