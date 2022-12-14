import { SlashCommandBuilder, EmbedBuilder, User } from "discord.js";
import gendap from "../lib/gendap";
import type { CommandLike } from "./command";
import { getStreaks } from "../lib/dapgap";
import { GuildDapSchema, DapChain } from "../models";

export default <CommandLike>{
	data: new SlashCommandBuilder()
		.setName("dap")
		.setDescription("Dap up another member!")
		.addUserOption((option) =>
			option
				.setName("member")
				.setDescription("The server member you want to dap up.")
				.setRequired(true)
		),
	async execute(client, interaction) {
		function error(text: string) {
			const replyEmbed = new EmbedBuilder()
				.setColor("Red")
				.setDescription(text)
				.setTimestamp();

			interaction.reply({ embeds: [replyEmbed], ephemeral: true });
		}

		function mileStone(
			daps: number,
			dapType: "given" | "recieved",
			user: User
		) {
			const ending = dapType === "given" ? "daps" : "daps recieved";
			const replyEmbed = new EmbedBuilder()
				.setColor("Green")
				.setDescription(
					`🎉 <@${user.id}>, you have just reached ${daps} ${ending}!`
				)
				.setTimestamp();

			interaction.channel?.send({ embeds: [replyEmbed] });
		}

		function sendDap(
			text: string,
			attachment: Buffer,
			footer: string | null = null
		) {
			const replyEmbed = new EmbedBuilder()
				.setColor("Green")
				.setDescription(text)
				.setImage("attachment://dap.jpg")
				.setTimestamp();
			if (footer) replyEmbed.setFooter({ text: footer });
			interaction.editReply({
				embeds: [replyEmbed],
				files: [{ attachment, name: "dap.jpg" }],
			});
		}

		let reciever: User | null = interaction.options.getUser("member");

		if (!reciever) return error("You tried to dap up a ghost.");

		let giver: User = interaction.user;
		let guildId = interaction.guild.id;
		let isGuildMember = interaction.guild.members.cache.has(reciever.id);
		if (!isGuildMember)
			return error(
				"You tried to dap up someone from another server. It didn't go well."
			);
		if (reciever.id == giver.id)
			return error("You tried to dap up yourself, but you looked too lonely.");
		if (reciever.bot)
			return error("You tried to dap up a robot, but it had no hands.");

		await interaction.deferReply();
		const addDap = Math.floor(Math.random() * (15 - 5) + 5);

		const { lastDapCooldown } = await getStreaks(giver, reciever);

		// push transaction to dapchain
		const dap = new DapChain({
			giverId: giver.id,
			recieverId: reciever.id,
			guildId: interaction.guild.id,
			gainedScore: !lastDapCooldown,
		});

		await dap.save();

		// update GIVER
		let giverGuildDap = await GuildDapSchema.findOne({
			userId: giver.id,
			guildId,
		});
		if (!giverGuildDap) {
			giverGuildDap = new GuildDapSchema({
				userId: giver.id,
				guildId,
			});
		}
		if (!lastDapCooldown) {
			giverGuildDap.userDap += addDap;
		}
		giverGuildDap.dapsGiven++;
		await giverGuildDap.save();

		// update RECIEVER

		let recieverGuildDap = await GuildDapSchema.findOne({
			userId: reciever.id,
			guildId,
		});
		if (!recieverGuildDap) {
			recieverGuildDap = new GuildDapSchema({
				userId: reciever.id,
				guildId,
			});
		}
		if (!lastDapCooldown) {
			recieverGuildDap.userDap += addDap;
		}
		recieverGuildDap.dapsRecieved++;
		await recieverGuildDap.save();

		const dapImage = await gendap(giver, reciever);

		if (lastDapCooldown) {
			dap.gainedScore = false;
			sendDap(`<@${giver.id}> 🤝 <@${reciever.id}>`, dapImage);
		} else {
			sendDap(
				`<@${giver.id}> 🤝 <@${reciever.id}>`,
				dapImage,
				`+${addDap} DapScore`
			);
		}
		if (!interaction.channel) return;
		if (
			giverGuildDap.dapsGiven % 25 === 0 &&
			giverGuildDap.dapsGiven !== 0 &&
			giverGuildDap.dapsGiven >= 25
		) {
			mileStone(giverGuildDap.dapsGiven, "given", giver);
		}
		if (
			recieverGuildDap.dapsRecieved % 25 === 0 &&
			recieverGuildDap.dapsRecieved !== 0 &&
			recieverGuildDap.dapsRecieved >= 25
		) {
			mileStone(recieverGuildDap.dapsRecieved, "recieved", reciever);
		}
	},
};
