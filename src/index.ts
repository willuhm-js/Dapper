import fs from "node:fs";
import path from "node:path";
import {
	Client,
	Collection,
	GatewayIntentBits,
	Routes,
	ActivityType
} from "discord.js";
import { REST } from "@discordjs/rest";
import mongoose from "mongoose";
import { clientId, token, mongo } from "./config";
import { GuildDapSchema, DapChain } from "./models";

const client: Client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [];
(client as any).Schema = { GuildDapSchema, DapChain };
(client as any).commands = new Collection();

const commandsPath = path.join(__dirname, "slash");
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath).default;
	(client as any).commands.set(command.data.name, command);
	commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(token!);

rest
	.put(Routes.applicationCommands(clientId!), { body: commands })
	.then(() => console.log("Successfully registered application commands."))
	.catch(console.error);

client.once("ready", async () => {
	if (!client.user) throw Error("Unexpected: client.user is null")
	client.user.setActivity("/dap", { type: ActivityType.Listening });
	console.log("Connected to Discord API!");
	mongoose.connect(mongo!, (error) => {
		if (error) throw error;
		else console.log("Connected to MongoDB");
		//client.user.setAvatar("https://media.discordapp.net/attachments/1028766392989794444/1029202069812424764/dapper.png?width=406&height=406");
	});
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	if (!interaction.guild) return;

	const command = (client as any).commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(client, interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({
			content: "There was an error while executing this command!",
			ephemeral: true,
		});
	}
});

client.login(token);
