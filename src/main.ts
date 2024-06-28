import { Twitter } from "./twitter";
import { PLATFORM, checkPlatform } from "./utils";
import { Youtube } from "./youtube";
import { Instagram } from "./instagram";
import { NewMessageEvent, NewMessage } from "telegram/events";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { rmdirSync } from "fs";

const BEARER_TOKEN: string = process.env.TOKEN as string;
const API_ID: string = process.env.API_ID as string;
const API_HASH: string = process.env.API_HASH as string;
const BOT_TOKEN: string = process.env.BOT_TOKEN as string;

if (!API_ID && !API_ID && !BOT_TOKEN) {
    console.log("Please set Bot tokens in env file");
    process.exit(1);
}

if (!BEARER_TOKEN) {
    process.exit(1);
}

const client = new TelegramClient(new StringSession(""), parseInt(API_ID), API_HASH, {});
async function main() {
    await client.start({ botAuthToken: BOT_TOKEN });
    client.addEventHandler(downloadHandler, new NewMessage({}));
}
main();
async function downloadHandler(event: NewMessageEvent) {
    const msg = event.message;
    const platform = checkPlatform(msg.text);
    if (platform == PLATFORM.TWITTER) {
        let tw = new Twitter(msg.text, BEARER_TOKEN);
        let tweet = await tw.getData();
        if (!tweet) {
            await client.sendMessage(msg.peerId, { message: "Unable to download this content" });
            return;
        }

        if (!tweet.extended_entities) {
            await client.sendMessage(msg.peerId, { message: "Unable to download this content" });
            return;
        }

        for (const i of tweet.extended_entities) {
            if (i.type == "photo") {
                let file = i.media_url;
                await client.sendFile(msg.peerId, { file: file });
            } else {
                let file = i.video_info?.variants[i.video_info.variants.length - 1].url;
                if (!file) {
                    continue;
                }
                const media = await fetch(file);
                let size = media.headers.get("content-length");
                if (size) {
                    if (parseInt(size) > 50 * 2 ** 20) {
                        await client.sendMessage(msg.peerId, { message: "File Size is too big" });
                        return;
                    }
                }

                await client.sendFile(msg.peerId, { file: file });
                return;
            }
        }
    } else if (platform == PLATFORM.YOUTUBE) {
        let yt = new Youtube(msg.text);
        let video = await yt.getData();
        if (!video?.source) {
            await client.sendMessage(msg.peerId, { message: "Unable to download this content" });
            return;
        }
        let file = video?.source[video.source?.length - 1];
        let size = await yt.downloadFile(client, msg, file.url, video.id, "mp4");
        try {
            await client.sendFile(msg.peerId, {
                file: `./videos/${video.id}.mp4`, attributes: [new Api.DocumentAttributeVideo({
                    w: 1920,
                    h: 1080,
                    duration: 0,
                })
                ]
            })
            yt.cleanDir(`${video.id}.mp4`);
        } catch (e) {
            console.log(e);
            rmdirSync("videos", { recursive: true });
        }
    } else if (platform == PLATFORM.INSTAGRAM) {
        let ig = new Instagram(msg.text);
        let post = await ig.getData();
        if (!post) {

            await client.sendMessage(msg.peerId, { message: "Unable to download this content" });
            return;
        }
        if (!post.is_video) {
            let file = post.display_url;
            await client.sendFile(msg.peerId, { file: file });
        }
        let file = post.video_url;
        if (post.video_duration as number > 120) {
            console.log(post.video_duration)
            await client.sendMessage(msg.peerId, { message: "Unable to download this content" });
            return;
        }
        if (!file) {
            await client.sendMessage(msg.peerId, { message: "Unable to download this content" });
            return
        }
        await client.sendFile(msg.peerId, { file: file });
    }
}
