import { SlashCommandBuilder, EmbedBuilder, Client } from "discord.js";
export default {
	data: new SlashCommandBuilder()
		.setName("leaderboard")
		.setDescription("Displays the leaderboard for your server."),
	async execute(client: Client, interaction: any) {
		const { GuildDapSchema } = (client as any).Schema;
		const { Pagination } = require("pagination.djs");
		const pagination = new Pagination(interaction, {
			limit: 10,
			firstEmoji: "⏮",
			idle: 60000,
		});

		let users = []; // pages of data, 10 lines each

		let guildUsers = await GuildDapSchema.find({
			guildId: interaction.guild.id,
		})
			.sort({ userDap: -1 })
			.limit(100);
		for (let i = 0; i < guildUsers.length; i++) {
			const guildUser = guildUsers[i];
			let guildMember = await interaction.guild.members.fetch(guildUser.userId);

			users.push(
				`${i + 1}. **${guildMember.user.username}:** ${
					guildUser.userDap
				} DapScore`
			);
		}
		pagination
			.setDescriptions(users)
			.setColor("Green")
			.setTitle("Leaderboard")
			.setTimestamp();
		pagination.render();
		// respond with the data
	},
};