const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true
    },
    username: {
        type: String,
        default: null
    },
    firstName: {
        type: String,
        default: null
    },
    lastName: {
        type: String,
        default: null
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    people: {
        type: String,
        required: true
    },
    language: {
        type: String,
        default: 'am'
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'completed'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
bookingSchema.index({ userId: 1, date: 1 });
bookingSchema.index({ date: 1, time: 1 });

// Update the updatedAt field before saving
bookingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);