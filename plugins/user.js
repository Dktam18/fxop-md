const { Module, parsedJid } = require("../lib");
const { exec } = require("child_process");
const { PausedChats, WarnDB } = require("../lib/db");
const { WARN_COUNT } = require("../config");
const { secondsToDHMS } = require("../lib/functions");
const { saveWarn, resetWarn } = WarnDB;

Module(
	{
		pattern: "pause",
		fromMe: true,
		desc: "Pause the chat",
		dontAddCommandList: true,
	},
	async message => {
		const chatId = message.key.remoteJid;
		try {
			await PausedChats.savePausedChat(chatId);
			message.reply("Chat paused successfully.");
		} catch (error) {
			console.error(error);
			message.reply("Error pausing the chat.");
		}
	},
);

Module(
	{
		pattern: "shutdown",
		fromMe: true,
		desc: "stops the bot",
		type: "user",
	},
	async (message, match) => {
		await message.sendMessage(message.jid, "shutting down...");
		exec("pm2 stop x-asena", (error, stdout, stderr) => {
			if (error) {
				return message.sendMessage(message.jid, `Error: ${error}`);
			}
			return;
		});
	},
);

Module(
	{
		pattern: "resume",
		fromMe: true,
		desc: "Resume the paused chat",
		dontAddCommandList: true,
	},
	async message => {
		const chatId = message.key.remoteJid;

		try {
			const pausedChat = await PausedChats.PausedChats.findOne({
				where: { chatId },
			});

			if (pausedChat) {
				await pausedChat.destroy();
				message.reply("Chat resumed successfully.");
			} else {
				message.reply("Chat is not paused.");
			}
		} catch (error) {
			console.error(error);
			message.reply("Error resuming the chat.");
		}
	},
);

Module(
	{
		pattern: "setpp",
		fromMe: true,
		desc: "Set profile picture",
		type: "user",
	},
	async (message, match, m) => {
		if (!message.reply_message.image) return await message.reply("_Reply to a photo_");
		let buff = await m.quoted.download();
		await message.setPP(message.user, buff);
		return await message.reply("_Profile Picture Updated_");
	},
);

Module(
	{
		pattern: "setname",
		fromMe: true,
		desc: "Set User name",
		type: "user",
	},
	async (message, match) => {
		if (!match) return await message.reply("_Enter name_");
		await message.updateName(match);
		return await message.reply(`_Username Updated : ${match}_`);
	},
);

Module(
	{
		pattern: "block",
		fromMe: true,
		desc: "Block a person",
		type: "user",
	},
	async (message, match) => {
		if (message.isGroup) {
			let jid = message.mention[0] || message.reply_message.jid;
			if (!jid) return await message.reply("_Reply to a person or mention_");
			await message.block(jid);
			return await message.sendMessage(`_@${jid.split("@")[0]} Blocked_`, {
				mentions: [jid],
			});
		} else {
			await message.block(message.jid);
			return await message.reply("_User blocked_");
		}
	},
);

Module(
	{
		pattern: "unblock",
		fromMe: true,
		desc: "Unblock a person",
		type: "user",
	},
	async (message, match) => {
		if (message.isGroup) {
			let jid = message.mention[0] || message.reply_message.jid;
			if (!jid) return await message.reply("_Reply to a person or mention_");
			await message.block(jid);
			return await message.sendMessage(message.jid, `_@${jid.split("@")[0]} unblocked_`, {
				mentions: [jid],
			});
		} else {
			await message.unblock(message.jid);
			return await message.reply("_User unblocked_");
		}
	},
);

Module(
	{
		pattern: "jid",
		fromMe: true,
		desc: "Give jid of chat/user",
		type: "user",
	},
	async (message, match) => {
		return await message.sendMessage(message.jid, message.mention[0] || message.reply_message.jid || message.jid);
	},
);

Module(
	{
		pattern: "dlt",
		fromMe: true,
		desc: "deletes a message",
		type: "user",
	},
	async (message, match, m, client) => {
		if (message.isGroup) {
			client.sendMessage(message.jid, { delete: message.reply_message.key });
		}
	},
);

Module(
	{
		pattern: "warn",
		fromMe: true,
		desc: "Warn a user",
	},
	async (message, match) => {
		const userId = message.mention[0] || message.reply_message.jid;
		if (!userId) return message.reply("_Mention or reply to someone_");
		let reason = message?.reply_message.text || match;
		reason = reason.replace(/@(\d+)/, "");
		reason = reason ? reason.length <= 1 : "Reason not Provided";

		const warnInfo = await saveWarn(userId, reason);
		let userWarnCount = warnInfo ? warnInfo.warnCount : 0;
		userWarnCount++;
		await message.reply(`_User @${userId.split("@")[0]} warned._ \n_Warn Count: ${userWarnCount}._ \n_Reason: ${reason}_`, { mentions: [userId] });
		if (userWarnCount > WARN_COUNT) {
			const jid = parsedJid(userId);
			await message.sendMessage(message.jid, "Warn limit exceeded kicking user");
			return await message.client.groupParticipantsUpdate(message.jid, jid, "remove");
		}
		return;
	},
);

Module(
	{
		pattern: "resetwarn",
		fromMe: true,
		desc: "Reset warnings for a user",
	},
	async message => {
		const userId = message.mention[0] || message.reply_message.jid;
		if (!userId) return message.reply("_Mention or reply to someone_");
		await resetWarn(userId);
		return await message.reply(`_Warnings for @${userId.split("@")[0]} reset_`, {
			mentions: [userId],
		});
	},
);

Module(
	{
		pattern: "uptime",
		fromMe: true,
		desc: "Check uptime of bot",
		type: "user",
	},
	async (message, match) => {
		message.reply(`*Uptime:* ${secondsToDHMS(process.uptime())}`);
	},
);
