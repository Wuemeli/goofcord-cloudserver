import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    authToken: { type: String, required: true },
});

export const User = mongoose.model('User', userSchema);