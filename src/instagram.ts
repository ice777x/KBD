export class Instagram {
    url: string

    constructor(url: string) {
        this.url = url
    }

    regex(): string | undefined {
        let re = /https?:\/\/(www\.)?(ddinstagram|instagram)\.com\/(p|reel)\/(?<id>[a-zA-Z0-9_-]+)/;
        let matches = this.url.match(re);
        return matches?.groups?.id;
    }

    async getData(): Promise<Post | null> {
        let uri = this.regex();
        let url =
            `https://www.instagram.com/graphql/query/?query_hash=cf28bf5eb45d62d4dc8e77cdb99d750d&variables={"shortcode":"${uri}"}`;
        let response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            }
        });
        let result = await response.json();
        if (response.ok) {
            console.log("Instagram: OK");
            console.log(result)
            if (!result.data.shortcode_media) {
                return null;
            }
            return this.getPost(result.data.shortcode_media)
        }
        return null;
    }

    getPost(post: any): Post {
        return {
            __typename: post.__typename,
            id: post.id,
            shortcode: post.shortcode,
            dimensions: post.dimensions,
            media_preview: post.media_preview,
            display_url: post.display_url,
            display_resources: post.display_resources,
            edge_media_caption: post.edge_media_to_caption && post.edge_media_to_caption,
            has_audio: post.has_audio && post.has_audio,
            video_url: post.video_url && post.video_url,
            is_video: post.is_video,
            taken_at_timestamp: post.taken_at_timestamp && post.taken_at_timestamp,
            location: post.location && this.convLocation(post.location),
            owner: this.getOwner(post.owner),
            product_type: post.product_type && post.product_type,
            title: post.title && post.title,
            video_duration: post.video_duration && post.video_duration,
            thumbnail_src: post.thumbnail_src && post.thumbnail_src,
            clips_music_attribution_info: post.clips_music_attribution_info && post.clips_music_attribution_info
        }
    }
    getOwner(owner: any): Owner {
        return {
            id: owner.id,
            is_private: owner.is_private,
            is_verified: owner.is_verified,
            profile_pic_url: owner.profile_pic_url,
            username: owner.username,
            full_name: owner.full_name,
            edge_followed_by: owner.edge_followed_by,
            edge_owner_to_timeline_media: owner.edge_owner_to_timeline_media
        }
    }
    convLocation(location: any): Location {
        return {
            id: location.id,
            has_public_page: location.has_public_page,
            name: location.name,
            slug: location.slug,
            address_json: JSON.parse(location.address_json)
        }
    }
}

export interface Owner {
    id: string
    is_verified: boolean
    profile_pic_url: string
    username: string
    full_name: string
    is_private: boolean
    edge_owner_to_timeline_media: EdgeOwnerToTimelineMedia
    edge_followed_by: EdgeFollowedBy
}

export interface Post {
    __typename: string
    id: string
    shortcode: string
    dimensions: Dimensions
    media_preview: string
    display_url: string
    display_resources: DisplayResource[]
    edge_media_caption?: EdgeMediaCaption
    has_audio?: boolean
    video_url?: string
    is_video: boolean
    taken_at_timestamp?: number
    location?: Location
    owner?: Owner
    product_type?: string
    title?: string
    video_duration?: number
    thumbnail_src?: string
    clips_music_attribution_info?: ClipsMusicAttributionInfo
}

export interface Location {
    id: string
    has_public_page: boolean
    name: string
    slug: string
    address_json: Address
}

export interface Address {
    street_address: string
    zip_code: string
    city_name: string
    region_name: string
    country_code: string
    exact_city_match: boolean
    exact_region_match: boolean
    exact_country_match: boolean
}


export interface EdgeMediaCaption {
    edges: Edge[]
}

export interface Edge {
    node: Node
}

export interface Node {
    text: string
}


export interface Dimensions {
    height: number
    width: number
}

export interface DisplayResource {
    src: string
    config_width: number
    config_height: number
}


export interface EdgeMediaToTaggedUser {
    edges: any[]
}


export interface EdgeOwnerToTimelineMedia {
    count: number
}

export interface EdgeFollowedBy {
    count: number
}

export interface EdgeWebMediaToRelatedMedia {
    edges: any[]
}

export interface ClipsMusicAttributionInfo {
    artist_name: string
    song_name: string
    uses_original_audio: boolean
    should_mute_audio: boolean
    should_mute_audio_reason: string
    audio_id: string
}

