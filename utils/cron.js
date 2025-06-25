const cron = require('node-cron');
const moment = require('moment-timezone');
const Booking = require('../models/Booking');

function setupCronJobs() {
  cron.schedule('0 0 * * *', async () => {
    const yesterday = moment()
      .tz('Asia/Yerevan')
      .subtract(1, 'day')
      .format('YYYY-MM-DD');

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
}

module.exports = { setupCronJobs };