export enum PLATFORM {
  TWITTER,
  INSTAGRAM,
  YOUTUBE,
  NONE,
}

export function checkPlatform(text: string): PLATFORM {
  if (text.includes("twitter.com") || text.includes("x.com")) {
    return PLATFORM.TWITTER;
  } else if (text.includes("instagram.com")) {
    return PLATFORM.INSTAGRAM;
  } else if (text.includes("youtube.com") || text.includes("youtu.be")) {
    return PLATFORM.YOUTUBE;
  } else {
    return PLATFORM.NONE;
  }
}
