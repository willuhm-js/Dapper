import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Canvas, Image, loadImage } from "canvas-constructor/napi-rs";
import sizeOf from "image-size";
import { User } from "discord.js";

interface ImageChoice {
	pfpradius: number;
	user1coords: { x: number; y: number };
	user2coords: { x: number; y: number };
	fileNumber: number;
	buffer: Buffer;
	image: Promise<Image>;
}
function generateImage(
	choice: Omit<ImageChoice, "buffer" | "image">
): ImageChoice {
	const buffer: Buffer = readFileSync(
		resolve(__dirname, `../images/${choice.fileNumber}.jpg`)
	);
	return {
		...choice,
		buffer,
		image: loadImage(buffer),
	};
}

const options: ImageChoice[] = [
	generateImage({
		pfpradius: 200,
		user1coords: { x: 532, y: 1240 },
		user2coords: { x: 1740, y: 1064 },
		fileNumber: 0,
	}),
	generateImage({
		pfpradius: 255,
		user1coords: { x: 250, y: 56 },
		user2coords: { x: 1500, y: 45 },
		fileNumber: 1,
	}),
	generateImage({
		pfpradius: 58,
		user1coords: { x: 149, y: 78 },
		user2coords: { x: 430, y: 9 },
		fileNumber: 2,
	}),
	generateImage({
		pfpradius: 50,
		user1coords: { x: 95, y: 153 },
		user2coords: { x: 410, y: 115 },
		fileNumber: 3,
	}),
];

type TestUser = { displayAvatarURL: () => string };
export default async (
	user1: User | TestUser,
	user2: User | TestUser
): Promise<Buffer> => {
	const choice = options[Math.floor(Math.random() * options.length)];
	const user1avatar = await loadImage(
		user1.displayAvatarURL({ extension: "jpg" })
	);
	const user2avatar = await loadImage(
		user2.displayAvatarURL({ extension: "jpg" })
	);

	const dimensions = sizeOf(choice.buffer);
	if (!dimensions.width || !dimensions.height)
		throw Error("problem getting dimensions!");
	return new Canvas(dimensions.width, dimensions.height)
		.printImage(
			await Promise.resolve(choice.image),
			0,
			0,
			dimensions.width,
			dimensions.height
		)
		.printCircularImage(
			user1avatar,
			choice.user1coords.x+choice.pfpradius,
			choice.user1coords.y+choice.pfpradius,
			choice.pfpradius
		)
		.printCircularImage(
			user2avatar,
			choice.user2coords.x+choice.pfpradius,
			choice.user2coords.y+choice.pfpradius,
			choice.pfpradius,
		)
		.jpegAsync(100);
};
