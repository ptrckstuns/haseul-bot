const Discord = require("discord.js");
const { checkPermissions, withTyping } = require("../functions/discord.js");
const { Client } = require("../haseul.js");

const database = require("../db_queries/server_db.js");
const serverSettings = require("../modules/server_settings.js");
const { parseChannelID } = require("../functions/functions.js");

exports.onMessage = async function(message) {

    poll(message);

}

exports.onCommand = async function(message, args) {

    let { channel, member } = message;

    switch (args[0]) {
        case "serverinfo":
        case "sinfo":
        case "guildinfo":
            withTyping(channel, guildInfo, [message, args[1]]);
            break;
        case "poll":
            switch (args[1]) {
                case "channel":
                    switch (args[2]) {
                        case "add":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, addPollChannel, [message, args[3]]);
                            break;
                        case "remove":
                        case "delete":
                            if (checkPermissions(member, ["MANAGE_CHANNELS"]))
                                withTyping(channel, removePollChannel, [message, args[3]]);
                            break;
                    }
                    break;
                case "toggle":
                    if (checkPermissions(member, ["MANAGE_GUILD"]))
                        withTyping(channel, togglePoll, [message]);
                    break;
            }
            break;
        case "prefix":
            switch (args[1]) {
                case "set":
                    if (checkPermissions(member, ["MANAGE_GUILD"]))
                        withTyping(channel, setPrefix, [message, args[2]]);
                    break;
            }
            break;
    }

}

async function poll(message) {
    let pollOn = serverSettings.get(message.guild.id, "pollOn");
    if (!pollOn) return;
    let pollChannelIDs = await database.getPollChannels(message.guild.id, "pollChannel");
    if (pollChannelIDs.includes(message.channel.id)) {
        await message.react('✅');
        await message.react('❌');
    }
}

async function guildInfo(message, target) {

    let guild;
    if (!target || message.author.id != '125414437229297664') {
        guild = message.guild;
    } else {
        let match = target.match(/^\d+$/);
        if (!match) {
            message.channel.send("⚠ Invalid guild ID.");
            return;
        }
        guild = Client.guilds.get(match[0])
        if (!guild) {
            message.channel.send("⚠ Invalid guild or bot is not in this server.");
            return;
        }
    }

    let embed = await serverEmbed(guild);
    message.channel.send({ embed });

}

async function serverEmbed(guild) {

    guild = await guild.fetchMembers();

    let regions = {
        "amsterdam":   ":flag_nl: Amsterdam",    
        "brazil":      ":flag_br: Brazil",
        "europe":      ":flag_eu: Europe",
        "eu-central":  ":flag_eu: EU Central",   
        "eu-west":     ":flag_eu: EU West", 
        "frankfurt":   ":flag_de: Frankfurt",    
        "hongkong":    ":flag_hk: Hong Kong", 
        "india":       ":flag_in: India",
        "japan":       ":flag_jp: Japan",        
        "london":      ":flag_gb: London", 
        "russia":      ":flag_ru: Russia",       
        "singapore":   ":flag_sg: Singapore", 
        "southafrica": ":flag_za: South Africa",
        "south-korea": ":flag_kr: South Korea", 
        "sydney":      ":flag_au: Sydney",
        "us-central":  ":flag_us: US Central",   
        "us-east":     ":flag_us: US East", 
        "us-south":    ":flag_us: US South",     
        "us-west":     ":flag_us: US West"
    }

    let statusObj = {
        online : { emoji: "<:online_cb:533459049765928970>",  count: 0 },
        idle   : { emoji: "<:idle_cb:533459049702752266>",    count: 0 },
        dnd    : { emoji: "<:dnd_cb:533459049547563008>",     count: 0 },
        offline: { emoji: "<:offline_cb:533459049648226317>", count: 0 } 
    }
    guild.presences.array().forEach(p => statusObj[p.status].count += 1);
    let statusData = Object.values(statusObj);
    statusObj.offline.count = guild.memberCount - statusData.slice(0, 3).reduce((a, c) => a + c.count, 0);
    let statuses = statusData.map(d => d.emoji + d.count).join('  ');
    let autoroleID = serverSettings.get(guild.id, "autoroleID");
    let autoroleColour = 0xdddddd;
    if (autoroleID) {
        let autorole = guild.roles.get(autoroleID);
        autoroleColour = autorole ? autorole.color : 0xdddddd;
    }

    let embed = new Discord.RichEmbed()
    .setAuthor(guild.name, guild.iconURL)
    .setThumbnail(guild.iconURL)
    .setColor(autoroleColour || guild.members.get(Client.user.id).displayColor || 0xffffff)
    .setFooter(`ID #${guild.id}`)
    .setTimestamp(guild.createdAt)
    .addField("Owner", guild.owner.user.tag, true)
    .addField("Created On", guild.createdAt.toUTCString().replace(/^.*?\s/, '').replace(' GMT', ' UTC'), true)
    .addField("Text Channels", guild.channels.array().filter(c => c.type == 'text').length, true)
    .addField("Voice Channels", guild.channels.array().filter(c => c.type == 'voice').length, true)
    .addField("Members", guild.memberCount, true)
    .addField("Roles", guild.roles.size, true)
    .addField("Region", regions[guild.region] || guild.region, true)
    .addField("Emojis", `${guild.emojis.size} (${guild.emojis.array().filter(e=>e.animated).length} animated)`, true);

    if (statuses) {
        embed.addField("Statuses", statuses);
    }

    return embed;

}

async function addPollChannel(message, channelArg) {

    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        message.channel.send("⚠ Invalid channel or channel ID.");
        return;
    }
    if (!message.guild.channels.has(channelID)) {
        message.channel.send("⚠ Channel doesn't exist in this server.");
        return;
    }

    added = await database.addPollChannel(message.guild.id, channelID);
    message.channel.send(added ? `Poll channel added.` : `Poll channel already added.`);

}

async function removePollChannel(message, channelArg) {

    let channelID;
    if (!channelArg) {
        channelID = message.channel.id;
    } else {
        channelID = parseChannelID(channelArg);
    }

    if (!channelID) {
        message.channel.send("⚠ Invalid channel or channel ID.");
        return;
    }
    if (!message.guild.channels.has(channelID)) {
        message.channel.send("⚠ Channel doesn't exist in this server.");
        return;
    }

    removed = await database.removePollChannel(message.guild.id, channelID);
    message.channel.send(removed ? `Poll channel removed.` : `Poll channel doesn't exist.`);

}

async function togglePoll(message) {

    let tog = await serverSettings.toggle(message.guild.id, "pollOn");
    message.channel.send(`Poll setting turned ${tog ? "on":"off"}.`);

}

async function setPrefix(message, prefix) {

    let { guild } = message;

    if (!prefix) {
        message.channel.send("⚠ Please provide a prefix for commands to use.");
        return;
    }
    if (prefix.length > 1) {
        message.channel.send("⚠ A prefix must be a single character.");
        return;
    }
    if (prefix.match(/^\w+$/)) {
        message.channel.send("⚠ A prefix cannot be a letter.");
        return;
    }

    serverSettings.set(guild.id, "prefix", prefix);
    message.channel.send(`Prefix set to \`${prefix}\``);

}
