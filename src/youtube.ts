import path from "path";
import * as fs from "fs";
import axios from "axios";
import ytdl, { Author } from "@distube/ytdl-core";
import { Api, TelegramClient } from "telegram";

export class Youtube {
  url: string;
  constructor(url: string) {
    this.url = url;
  }

  async getData(): Promise<YTVideo | null> {
    let res = await getVideoInfo(this.url);
    return res;
  }

  private checkDir() {
    if (!fs.existsSync("videos")) {
      fs.mkdirSync("videos");
    }
  }

  cleanDir(file: string) {
    fs.rmSync(`videos/${file}`);
  }

  async downloadFile(cl: TelegramClient, msg: Api.Message, url: string, id: string, ext: string) {
    this.checkDir();
    const paths = path.resolve(`videos/${id}.${ext}`);
    const writer = fs.createWriteStream(paths);

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    if (parseInt(response.headers["content-length"]) > 500 * 2 ** 20) {
      await cl.sendMessage(msg.peerId, { message: "File size is over 500MB" })
      console.log("Youtube: Out of Range")
      return;
    }
    response.data.pipe(writer);
    console.log("Youtube: Download");
    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  }
}


const getVideoInfo = async (url: string): Promise<YTVideo | null> => {
  try {
    const info = await ytdl.getInfo(url, { lang: "tr" });
    let formats = ytdl.filterFormats(info.formats, "videoandaudio");
    const video: YTVideo = {
      id: info.videoDetails.videoId,
      title: info.videoDetails.title,
      description: info.videoDetails.description,
      thumbnail: info.videoDetails.thumbnails.pop(),
      duration: +info.videoDetails.lengthSeconds,
      views: +info.videoDetails.viewCount,
      tags: info.videoDetails.keywords,
      author: info.videoDetails.author,
      source: formats
        .map((x: ytdl.videoFormat) => {
          return {
            tag: x.itag,
            url: x.url,
            contentLength: x.contentLength,
            width: x.width && x.width,
            height: x.height && x.height,
            hasVideo: x.hasVideo,
            hasAudio: x.hasAudio,
          };
        })
        .filter((x: any) => x),
    };
    return video;
  } catch (e) {
    console.log(e);
    return null;
  }
};

export interface YTVideo {
  id: string;
  title: string;
  description: string | null;
  thumbnail?: Thumbnail;
  duration: number;
  views: number;
  tags?: string[];
  author: Author;
  source?: Source[];
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export interface Source {
  tag: number;
  url: string;
  contentLength: string;
  width?: number;
  height?: number;
  hasVideo: boolean;
  hasAudio: boolean;
}
