//Require modules

const discord = require("discord.js");
const client = require("../haseul.js").client;
const database = require("../modules/roles_database.js");
const serverSettings = require("../modules/server_settings.js")

//Functions
roles = async (message) => {
    let rolesOn = await serverSettings.getSetting(message.guild.id, "rolesOn")
    if (!rolesOn) return;
    let rolesChannelID = await serverSettings.getSetting(message.guild.id, "rolesChannel");
    if (rolesChannelID == message.channel.id) assign_roles(message); //Assign roles if in roles channel
}

exports.handle = async (message) => {

    let args = message.content.trim().split(" ");

    //Check if roles on
    
    roles(message);

    //Handle commands

    let perms = ["ADMINISTRATOR", "MANAGE_GUILD", "VIEW_AUDIT_LOG"];
    if (!message.member) message.member = await message.guild.fetchMember(message.author.id);
    if (!perms.some(p => message.member.hasPermission(p))) return;

    switch (args[0]) {

        //Role pairs

        case ".roles":
            switch (args[1]) {

                case "toggle":
                    message.channel.startTyping();
                    toggleRoles(message).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;
                    

                case "add":
                    message.channel.startTyping();
                    add_role(message, args.slice(2)).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "remove":
                case "delete":
                case "del":
                    message.channel.startTyping();
                    remove_role(message, args.slice(2)).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                case "list":
                    message.channel.startTyping();
                    list_roles(message).then(response => {
                        message.channel.send(response);
                        message.channel.stopTyping();
                    }).catch(error => {
                        console.error(error);
                        message.channel.stopTyping();
                    })
                    break;

                //Roles msg

                case "message":
                case "msg":
                    switch (args[2]) {
                        case "set":
                            message.channel.startTyping();
                            set_roles_channel_msg(message, args.slice(3)).then(response => {
                                message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;
                    }
                    break;    

                //Roles channel

                case "channel":
                    switch (args[2]) {

                        case "set":
                            message.channel.startTyping();
                            set_roles_channel(message, args.slice(3)).then(response => {
                                message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                        case "update":
                            message.channel.startTyping();
                            update_roles_channel(message, args.slice(3)).then(response => {
                                message.channel.send(response);
                                message.channel.stopTyping();
                            }).catch(error => {
                                console.error(error);
                                message.channel.stopTyping();
                            })
                            break;

                    }
                    break;

            }
            break;

        //Available roles

        case ".avarole":
            message.channel.startTyping();
            toggle_available_role(message, args.slice(1)).then(response => {
                message.channel.send(response);
                message.channel.stopTyping();
            })    .catch(error => {
                console.error(error);
                message.channel.stopTyping();
            })
    }
}

roles_response = (responses) => {
    let list = [];
    for (let [key, val] of Object.entries(responses)) {
        if (val.length > 0) list.push(`**${key}**: ${val.join(", ")}`)
    }
    return list.join("\n");
}

roles_embed = (responses) => {
    let embed = new discord.RichEmbed();
    for (let [key, val] of Object.entries(responses)) {
        if (val.length > 0) embed.addField(key, val.join(", "), false);
    }
    return embed;
}

//Allows members to self-assign roles

assign_roles = async (message) => {

    //Safety net

    message.delete(10000).catch(() => {});

    //Process commands

    let args = message.content.trim().split(" ");
    if (args.length < 2) {message.delete(timeout=1000).catch(() => {}); return;}
    let prefix = message.content.trim().match(/^(?:\+|\-)\s*(main|sub|other)/i);
    if (!prefix) {
        message.reply("Invalid formatting. Please read the instructions above.").then(reply => {
            reply.delete(4000).catch(() => {});
            message.delete(4000).catch(() => {});
        }) 
        return;
    }
    let modifier = prefix[0][0]; 
    let type = prefix[1];
    let role_commands = message.content.slice(message.content.indexOf(type) + type.length).split(",");
    let roles_to_process = [];
    let roles_successful = [];
    let roles_unsuccessful = [];
    let errors = [];
    
    let member;
    if (message.member) {
        member = message.member;
    } else {
        member = await message.guild.fetchMember(message.author.id);
    }

    //Parse role commands

    let colour;
    for (i = 0; i < role_commands.length; i++) {
        let role_command = role_commands[i].trim();
        let role_id = await database.get_role_id(role_command, message.guild.id, type);
        let role = message.guild.roles.get(role_id);

        //Process role

        if (role) {
            if (!colour) colour = role.color;

            switch (modifier) {
                
                case "+":
                    if (member.roles.has(role_id) && !roles_unsuccessful.includes(role)) {
                        roles_unsuccessful.push(role);
                    } else if (!member.roles.has(role_id) && !roles_successful.includes(role)) {
                        roles_to_process.push(role_id);
                        roles_successful.push(role);
                    }
                    break;

                case "-":
                    if (!member.roles.has(role_id) && !roles_unsuccessful.includes(role)) {
                        roles_unsuccessful.push(role);
                    } else if (member.roles.has(role_id) && !roles_successful.includes(role)) {
                        roles_to_process.push(role_id);
                        roles_successful.push(role);
                    }
                    break;

                default:
                    return;
                    break;

            }
        } else {
            errors.push(`"${role_command}"`);
        }
    }
    if (!colour) colour = 0xFFFFFF;

    //Add/Remove roles

    switch (modifier) {

        case "+":
            member.addRoles(roles_to_process)
            //Respond
            var responses = {"Assigned Roles": roles_successful, "Current Roles": roles_unsuccessful, "Invalid Roles": errors};
            var embed = roles_embed(responses);
            embed.setColor(colour);
            message.reply({embed: embed}).then(reply => {
                reply.delete(embed.fields.length * 2000 + 2000)
                message.delete(embed.fields.length * 2000 + 2000)
            })
            break;

        case "-":
            member.removeRoles(roles_to_process)
            //Respond
            var responses = {"Removed Roles": roles_successful, "Roles Not Assigned": roles_unsuccessful, "Invalid Roles": errors};
            var embed = roles_embed(responses);
            embed.setColor(colour);
            message.reply({embed: embed}).then(reply => {
                reply.delete(embed.fields.length * 2000 + 2000)
                message.delete(embed.fields.length * 2000 + 2000)
            })
            break;

        default:
            return;
            break;

    }

}

//-----------------------------------------------

create_avarole_embed = async (message) => {
    let guild = client.guilds.get(message.guild.id);
    let sender = await guild.fetchMember(client.user.id);
    let role_rows = await database.get_available_roles(message.guild.id);
    if (!role_rows || !role_rows.length) return;

    let main_roles = [];
    let sub_roles = [];
    let other_roles = [];
    for(i = 0; i < role_rows.length; i++) {
        let row = role_rows[i];
        switch (row.type) {
            case "MAIN": main_roles.push(`\`${row.roleName}\``); break;
            case "SUB": sub_roles.push(`\`${row.roleName}\``); break;
            case "OTHER": other_roles.push(`\`${row.roleName}\``); break; 
        }
    }

    let embed = new discord.RichEmbed()
    .setTitle("__Available Roles__")
    .setColor(sender && sender.colorRole ? sender.colorRole.color : 0xffffff);
    if (main_roles.length) embed.addField("Main Roles", main_roles.join(", "), false);
    if (sub_roles.length) embed.addField("Sub Roles", sub_roles.join(", "), false);
    if (other_roles.length) embed.addField("Other Roles", other_roles.join(", "), false);
    return embed;
}


add_role = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 2) {
            resolve("\\⚠ Missing arguments.\nUsage: .roles add [role type] [role command]: [role name]");
            return
        }
        let type = args[0]
        if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
            resolve("\\⚠ Role type not specified or role type isn't one of the following: Main, Sub, Other");
            return;
        }
        let roles_text = args.slice(1).join(" ");
        let pairs = roles_text.split(",")
        let errors = [];
        let roles_added = [];
        let roles_exist = [];
    
        for (i = 0; i < pairs.length; i++) {
            let pair = pairs[i].trim();
            if (!pair.includes(":")) {
                errors.push(pair);
                continue;
            }
            let roles = pair.split(":", 2);
            let role_command = roles[0].trim();
            let role_name = roles[1].trim();
            let role = message.guild.roles.find("name", role_name);
            if (role_command.length < 1 || role_name.length < 1) {
                errors.push(role_command);
            } else if (!role || !message.guild.roles.has(role.id)) {
                errors.push(role_command);
            } else {
                let role_id = role.id
                added = await database.add_role(role_command, role_id, role_name, message.guild.id, type)
                if (added) {
                    roles_added.push(role_name);
                } else {
                    roles_exist.push(role_name);
                }
            }
        }
        let responses = {"Role commands added": roles_added, "Role commands already paired": roles_exist, "Errors": errors}
        responses = roles_response(responses);
        resolve(responses);
    })
}

remove_role = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 2) {
            resolve("\\⚠ Missing arguments.\nUsage: .roles remove [role type] [role command]");
            return
        }
        let type = args[0];
        if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
            resolve("\\⚠ Role type not specified or role type isn't one of the following: Main, Sub, Other");
            return
        }
        let roles_text = args.slice(1).join(" ");
        let role_commands = roles_text.split(",")
    
        let roles_removed = [];
        let roles_nonexistent = [];
        let errors = [];
        
        for (i = 0; i < role_commands.length; i++) {
            let role_command = role_commands[i].trim();
            if (role_command.length < 1) {
                errors.push(role_command);
            } else {
                let removed = await database.remove_role(role_command, message.guild.id, type)
                if (removed) {
                    roles_removed.push(role_command);
                } else {
                    roles_nonexistent.push(role_command);
                }
            }
        }
        let responses = {"Role commands removed": roles_removed, "Role commands nonexistent": roles_nonexistent, "Errors": errors}
        responses = roles_response(responses);
        resolve(responses);
    })
}

toggle_available_role = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 2) {
            resolve("\\⚠ Missing arguments.\nUsage: .avarole [role type] [role name]");
            return;
        }
        let type = args[0]
        if (!["MAIN", "SUB", "OTHER"].includes(type.toUpperCase())) {
            resolve("\\⚠ Role type not specified or role type isn't one of the following: Main, Sub, Other");
            return;
        }
        let roles_text = args.slice(1).join(" ");
        let role_names = roles_text.split(",");
    
        let roles_added = [];
        let roles_removed = [];
        let errors = [];
    
        for (i = 0; i < role_names.length; i++) {
            let role_name = role_names[i];
            if (role_name.length < 1) {
                errors.push(role_name);
                resolve();
            } else {
                [added, removed] = await database.available_role_toggle(role_name, message.guild.id, type)
                if (added) {
                    roles_added.push(added);
                } else if (removed) {
                    roles_removed.push(removed);
                } else {
                    reject("Unknown error occurred toggling available roles")
                }
            }
        }
        let responses = {"Role names added" : roles_added, "Role names removed": roles_removed, "Errors": errors}
        responses = roles_response(responses);
        resolve(responses);
    })
}

list_roles = async (message) => {
    return new Promise(async (resolve, reject) => {
        let rows = await database.get_all_roles(message.guild.id);
        let guild = message.guild
        let main_roles = [];
        let sub_roles = [];
        let other_roles = [];
        for (i = 0; i < rows.length; i++) {
            let row = rows[i];
            command = row.roleCommand;
            name = guild.roles.get(row.roleID).name;
            switch (row.type) {
                case "MAIN": main_roles.push(`${command}: ${name}`); break;
                case "SUB": sub_roles.push(`${command}: ${name}`); break;
                case "OTHER": other_roles.push(`${command}: ${name}`); break;
                default: console.error("Unexpected value for column: type"); break; 
            }
        }
        main_roles = "__**Main Roles**__\n" + main_roles.join(" **|** ") + "\n";
        sub_roles = "__**Sub Roles**__\n" + sub_roles.join(" **|** ") + "\n";
        other_roles = "__**Other Roles**__\n" + other_roles.join(" **|** ") + "\n";
        let list = [main_roles, sub_roles, other_roles].join("\n");
        resolve(list);
    })
}


set_roles_channel = async (message, args) => {
    return new Promise(async (resolve, reject) => {
        let channel_id;
        if (args.length < 1) {
            channel_id = message.channel.id;
        } else {
            channel_id = args[0].match(/<?#?!?(\d+)>?/);
            if (!channel_id) {
                resolve("\\⚠ Invalid channel or channel ID.");
                return;
            }
            channel_id = channel_id[1];
        }
        if (!message.guild.channels.has(channel_id)) {
            resolve("\\⚠ Channel doesn't exist in this server.");
            return;
        }
        
        let data = await database.get_roles_msg(message.guild.id);
        if (!data || !data.msg) {
            resolve("\\⚠ No roles channel message assigned.");
            return;
        }

        let channel = client.channels.get(channel_id);
        let embed = await create_avarole_embed(message);
        let msg = await channel.send(data.msg, {embed: embed})
        if (data && data.messageID) {
            serverSettings.getSetting(message.guild.id, "rolesChannel").then(rolesChannel => {
                client.channels.get(rolesChannel)
                .fetchMessage(data.messageID).then(msg => msg
                .delete().catch(() => {return}));
            })
        }

        await database.set_msg_id(message.guild.id, msg.id)
        await serverSettings.setSetting(message.guild.id, "rolesChannel", channel_id);
        resolve(`Roles channel set to <#${channel_id}>.`);
    })
}

update_roles_channel = (message, args) => {
    return new Promise(async (resolve, reject) => {
        let data = await database.get_roles_msg(message.guild.id);
        if (!data || !data.msg) {
            resolve("\\⚠ No roles channel message assigned.");
            return;
        }

        let message_id = data.messageID;
        let content = data.msg;
        let channel_id = serverSettings.getSetting(message.guild.id, "rolesChannel");
        let channel = client.channels.get(channel_id);
        let embed = create_avarole_embed(message);
        
        let old_message = channel.fetchMessage(message_id);
        old_message.delete();
        let msg = await channel.send(content, {embed: embed});
        await database.set_msg_id(message.guild.id, msg.id);
        resolve(`Roles channel message updated.`);
    })
}


set_roles_channel_msg = (message, args) => {
    return new Promise(async (resolve, reject) => {
        if (args.length < 1) {
            resolve("Please provide a message.");
            return;
        }
        let channel_message = args.join(" ");
        database.set_roles_msg(message.guild.id, channel_message).then(res => {
            resolve(res);
        })
    })
}

//Toggle

toggleRoles = (message) => {
    return new Promise((resolve, reject) => {
        serverSettings.toggle(message.guild.id, "rolesOn").then(tog => {
            let state = tog ? "on":"off";
            resolve(`Roles assignment turned ${state}.`);
        }).catch(err => {
            reject(err);
        })
    })
}
