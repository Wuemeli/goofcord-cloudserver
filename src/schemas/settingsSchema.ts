import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    settings: { type: String, required: true },
});

export const Settings = mongoose.model('Settings', settingsSchema);
