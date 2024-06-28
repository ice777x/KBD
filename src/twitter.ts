export class Twitter {
  url: string;
  tweet?: Tweet | null;
  readonly token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
    this.tweet = null;
  }

  async guestToken(): Promise<string> {
    try {
      let headers = {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-encoding": "gzip",
        "accept-language": "en-US,en;q=0.5",
        "Content-Type": "application/json",
        connection: "keep-alive",
        authorization: this.token,
      };
      const response = await fetch(
        "https://api.twitter.com/1.1/guest/activate.json",
        {
          method: "POST",
          headers: headers,
        }
      );

      const data: {guest_token: string} = await response.json();
      return data.guest_token;
    } catch (e: any) {
      return `${e}`;
    }
  }

  tweetApiUrl(id: string): string {
    const tweetApiUrl = `https://twitter.com/i/api/graphql/2ICDjqPd81tulZcYrtpTuQ/TweetResultByRestId?variables=%7B%22tweetId%22%3A%22${id}%22%2C%22withCommunity%22%3Afalse%2C%22includePromotedContent%22%3Afalse%2C%22withVoice%22%3Afalse%7D&features=%7B%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22tweetypie_unmention_optimization_enabled%22%3Atrue%2C%22responsive_web_edit_tweet_api_enabled%22%3Atrue%2C%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue%2C%22view_counts_everywhere_api_enabled%22%3Atrue%2C%22longform_notetweets_consumption_enabled%22%3Atrue%2C%22responsive_web_twitter_article_tweet_consumption_enabled%22%3Afalse%2C%22tweet_awards_web_tipping_enabled%22%3Afalse%2C%22freedom_of_speech_not_reach_fetch_enabled%22%3Atrue%2C%22standardized_nudges_misinfo%22%3Atrue%2C%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Atrue%2C%22longform_notetweets_rich_text_read_enabled%22%3Atrue%2C%22longform_notetweets_inline_media_enabled%22%3Atrue%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22responsive_web_media_download_video_enabled%22%3Afalse%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%2C%22responsive_web_enhance_cards_enabled%22%3Afalse%7D&fieldToggles=%7B%22withArticleRichContentState%22%3Afalse%7D`;
    return tweetApiUrl;
  }

  regex(): string | null {
    // let re = new RegExp("((https?):\/\/)?(www\.)?(twitter|x)\.com\/(\w+)\/status\/(?<id>\d+)", "ig");
    let re =
      /https?:\/\/(www\.)?(mobile\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/(?<id>\d+)/;
    let matches = this.url.match(re);
    return matches?.groups?.id as string | null;
  }

  async getData(): Promise<Tweet | null> {
    let uri = this.regex();
    if (!uri) {
      return null;
    } else {
      let guest_token = await this.guestToken();
      let url = this.tweetApiUrl(uri);
      let response = await fetch(url, {
        headers: {
          Authorization: this.token,
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
          "x-twitter-active-user": "yes",
          "X-Guest-Token": guest_token,
          referrer: `https:://twitter.com`,
        },
      });
      let result = await response.json();
      if (response.ok) {
        console.log("Twitter: OK");
        if (result.data.tweetResult.result.__typename == "TweetUnavailable") {
          return null;
        }
        let data = result.data.tweetResult.result;
        let tweet: Tweet = this.getTweet(data);
        return tweet;
      }
    }
    return null;
  }

  getUser(user: any): User {
    return {
      id: user.rest_id,
      name: user.legacy.name,
      username: user.legacy.screen_name,
      url: `https://twitter.com/${user.legacy.screen_name}`,
      description: user.legacy.description,
      location: user.legacy.location,
      entities: user.legacy.entities,
      image: {
        profile:
          user.legacy.profile_image_url_https &&
          user.legacy.profile_image_url_https,
        banner:
          user.legacy.profile_banner_url && user.legacy.profile_banner_url,
      },
      followers_count: user.legacy.followers_count,
      following_count: user.legacy.friends_count,
      media_count: user.legacy.media_count,
      favourites_count: user.legacy.favourites_count,
      default_profile: user.legacy.default_profile,
      professional: user.professional && user.professional,
      extended_profile_info:
        user.legacy_extended_profile && user.legacy_extended_profile,
      blue_verified: user.is_blue_verified,
      verified: user.legacy.verified,
      created_at: user.legacy.created_at,
    };
  }
  getTweet(result: any) {
    const tw_user = result.core.user_results.result;
    return {
      id: result.legacy.id_str,
      url: `https://twitter.com/${tw_user.legacy.screen_name}/status/${result.legacy.id_str}`,
      text: result.legacy.full_text,
      note_text:
        result.note_tweet && result.note_tweet.note_tweet_results.result.text,
      card: result.card && result.card,
      user: this.getUser(tw_user),
      entities: result.legacy.entities && result.legacy.entities,
      extended_entities:
        result.legacy.extended_entities &&
        this.getEntities(result.legacy.extended_entities.media),
      views: result.views.count,
      lang: result.legacy.lang,
      reply_count: result.legacy.reply_count,
      retweet_count: result.legacy.retweet_count,
      favorite_count: result.legacy.favorite_count,
      quote_count: result.legacy.quote_count,
      created_at: result.legacy.created_at,
    };
  }

  getEntities(item: any): Media[] {
    return item
      .map((item: any) => {
        let media: Media = {
          id: item.id_str as string,
          type: item.type as string,
          url: item.url as string,
          expanded_url: item.expanded_url as string,
          display_url: item.display_url as string,
          media_key: item.media_key as string,
          media_url: item.media_url_https as string,
          original_info: item.original_info as OriginalInfo,
        };

        if (item.type === "video") {
          let variants: Variant[] = item.video_info.variants
            .map((item: Variant) => {
              if (item.bitrate) {
                return {
                  url: item.url,
                  content_type: item.content_type,
                  bitrate: item.bitrate,
                };
              }
            })
            .filter((item: Variant) => item);
          let file = variants?.sort((a, b) => {
            if (a.bitrate && b.bitrate) {
              if (a.bitrate > b.bitrate) {
                return 1;
              } else {
                return -1;
              }
            } else {
              return -1;
            }
          });
          media.video_info = {
            aspect_ratio: item.video_info.aspect_ratio as number[],
            duration_millis: item.duration_millis,
            variants: file,
          };
        } else if (item.type === "animated_gif") {
          media.video_info = {
            aspect_ratio: item.video_info.aspect_ratio,
            variants: item.video_info.variants
              .map((item: Variant) => {
                return {
                  url: item.url,
                  content_type: item.content_type,
                  bitrate: item.bitrate,
                };
              })
              .filter((item: Variant) => item),
          };
        }
        return media;
      })
      .filter((item: Media) => item);
  }
}

interface Tweet {
  id: string;
  url: string;
  text: string;
  user: User;
  entities: Entities;
  extended_entities: Media[];
  views: string;
  lang: string;
  reply_count: number;
  retweet_count: number;
  favorite_count: number;
  quote_count: number;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  url: string;
  description: string;
  location: string;
  entities: any;
  image: {
    profile: string;
    banner: string;
  };
  followers_count: number;
  following_count: number;
  media_count: number;
  favourites_count: number;
  default_profile: boolean;
  professional?: Professional;
  extended_profile_info: any;
  blue_verified: boolean;
  verified: boolean;
  created_at: string;
}

export interface Entities {
  hashtags: HashSym[];
  media: Media[];
  symbols: HashSym[];
  timestamps: any[];
  urls: Url[];
  user_mentions: UserMention[];
}

export interface Media {
  id: string;
  type: string;
  url: string;
  expanded_url: string;
  display_url: string;
  media_key: string;
  media_url: string;
  original_info: OriginalInfo;
  video_info?: VideoInfo;
}

export interface Professional {
  rest_id: string;
  professional_type: string;
  category: {
    id: number;
    name: string;
    icon_name: string;
  }[];
}

export interface UserMention {
  id_str: string;
  indices: number[];
  name: string;
  screen_name: string;
}

export interface Url {
  display_url: string;
  expanded_url: string;
  indices: number[];
  url: string;
}

export interface HashSym {
  indices: number[];
  text: string;
}

export interface Size {
  h: number;
  w: number;
  resize: string;
}

export interface OriginalInfo {
  height: number;
  width: number;
  focus_rects: any[];
}

export interface VideoInfo {
  aspect_ratio: number[];
  duration_millis?: number;
  variants: Variant[];
}

export interface Variant {
  content_type: string;
  url: string;
  bitrate?: number;
}
