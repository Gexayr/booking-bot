const { getTranslation } = require('../utils/translations');
const { getLanguageKeyboard } = require('../utils/keyboards');

function handleStart(bot) {
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
      chatId,
      getTranslation(chatId, 'selectLanguage'),
      getLanguageKeyboard()
    );
  });
}

module.exports = { handleStart };