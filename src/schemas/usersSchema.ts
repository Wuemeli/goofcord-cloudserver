import mongoose from 'mongoose';

export type User = {
    userId: string;
    authToken: string;
}

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    authToken: { type: String, required: true },
});

export const User = mongoose.model('User', userSchema);