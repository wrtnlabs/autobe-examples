import { tags } from "typia";

import { ICommunityPlatformCommunity } from "./ICommunityPlatformCommunity";
import { ICommunityPlatformMemberuser } from "./ICommunityPlatformMemberuser";

export namespace ICommunityPlatformFeedPost {
  /**
   * Request payload for retrieving a personalized, paginated feed of posts
   * for the current member user.
   *
   * This DTO allows clients to specify pagination, sorting, time ranges, and
   * inclusion options that shape how the feed is constructed from the
   * underlying community_platform_posts table and related subscription,
   * membership, and discovery data. It is used in the PATCH
   * /communityPlatform/memberUser/feeds/posts operation to express rich query
   * semantics that are not suitable for simple query string parameters.
   */
  export type IRequest = {
    /**
     * 1-based page index for offset-based pagination.
     *
     * If omitted, the backend should default to the first page. This field
     * is mutually exclusive with cursor when using cursor-based
     * pagination.
     */
    page?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum number of post summaries to return in a single page.
     *
     * The backend should enforce an upper bound to prevent excessively
     * large responses.
     */
    pageSize?: (number & tags.Type<"int32">) | undefined;

    /**
     * Opaque cursor token used for cursor-based pagination.
     *
     * When provided, the server returns results after the specified cursor
     * position instead of using page/pageSize semantics.
     */
    cursor?: string | undefined;

    /**
     * Feed sorting mode that influences ranking of posts in the returned
     * feed.
     *
     * Typical values include "hot", "new", "top", or "controversial". The
     * exact semantics and supported values are defined by the feed ranking
     * implementation.
     */
    sortMode?: "hot" | "new" | "top" | "controversial" | undefined;

    /**
     * Logical time window restricting which posts are eligible for the
     * feed.
     *
     * This can be used with sort modes like "top" to limit results to
     * periods such as "day", "week", "month", or "all".
     */
    timeRange?: "day" | "week" | "month" | "year" | "all" | undefined;

    /**
     * High-level feed mode that controls which set of communities
     * contribute posts to the feed.
     *
     * For example, "home" may represent posts from subscribed communities,
     * "all" may represent posts from all public communities, and
     * "subscriptions" may explicitly restrict the feed to the member's
     * subscriptions.
     */
    mode?: "home" | "all" | "subscriptions" | undefined;

    /**
     * Optional explicit list of community identifiers to scope the feed to
     * specific communities.
     *
     * When provided, the backend should filter posts to those belonging to
     * the specified community_platform_communities records, subject to
     * visibility and membership constraints.
     */
    communityIds?: string[] | undefined;

    /**
     * Flag indicating whether posts marked as NSFW (not safe for work) may
     * be included in the feed.
     *
     * Implementations should combine this flag with per-user settings
     * stored in community_platform_user_settings to enforce safe content
     * display rules.
     */
    includeNsfw?: boolean | undefined;

    /**
     * Flag indicating whether to include recommended or discovery posts
     * from communities the member user may not yet subscribe to.
     *
     * When true, the backend can mix in content from
     * community_platform_discovery_items or similar recommendation
     * sources.
     */
    includeRecommended?: boolean | undefined;
  };

  /**
   * Summary representation of a post as it appears in feeds and list views
   * across the community platform.
   *
   * Provides the essential information necessary to render a post card in
   * community feeds, user profile activity lists, and discovery surfaces.
   * This summary focuses on lightweight fields such as identifiers, titles,
   * high-level engagement counters, and key contextual references, while
   * omitting heavy fields like full body content or deep relation trees.
   */
  export type ISummary = {
    /**
     * Unique identifier of the post.
     *
     * Primary key of the `community_platform_posts` table and canonical
     * reference used throughout the platform for navigation and linking.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Human-readable title or headline of the post shown in feed cards.
     *
     * This is the primary textual label users see when scanning lists of
     * posts, and is used for sorting, searching, and quick content
     * recognition.
     */
    title: string;

    /**
     * Post content type discriminator indicating the primary payload style.
     *
     * Typical values differentiate between text posts, link posts, and
     * image or media posts, and are used by clients to decide how to render
     * the post body in a feed context.
     */
    post_type: string;

    /**
     * Flag indicating whether the post is marked as Not Safe For Work
     * (NSFW).
     *
     * When true, clients should apply stricter visual treatment such as
     * blurring thumbnails, gating previews, or requiring explicit user
     * confirmation before showing full content.
     */
    is_nsfw: boolean;

    /**
     * Flag indicating whether the post contains spoiler content.
     *
     * Clients should visually label or hide spoiler-marked posts until
     * users opt in to reveal the content.
     */
    is_spoiler: boolean;

    /**
     * Summary information about the community that hosts this post.
     *
     * Provided as a lightweight reference object so clients can render
     * community name, handle, and basic badges alongside the post in feeds
     * without issuing additional API calls.
     */
    community?: ICommunityPlatformCommunity.ISummary | undefined;

    /**
     * Summary information about the member user who created this post.
     *
     * Includes basic public profile details so that feed consumers can
     * recognize who posted the content without having to load the full user
     * profile independently.
     */
    author?: ICommunityPlatformMemberuser.ISummary | undefined;

    /**
     * Total number of comments and replies associated with this post.
     *
     * Used for quick engagement assessment and for sorting or filtering
     * feeds by discussion activity level.
     */
    comment_count: number & tags.Type<"int32">;

    /**
     * Total accumulated upvotes the post has received.
     *
     * Represents positive community reception and is typically used for
     * sorting modes such as "top" or contributing to karma calculations.
     */
    upvote_count: number & tags.Type<"int32">;

    /**
     * Total accumulated downvotes the post has received.
     *
     * Used together with upvote_count to compute net score and to inform
     * controversiality and ranking logic.
     */
    downvote_count: number & tags.Type<"int32">;

    /**
     * Precomputed numeric score representing the post's current "hot"
     * ranking in feeds.
     *
     * Typically derived from a time-decayed function of votes, age, and
     * engagement, and used by feed algorithms to order posts in the "hot"
     * sorting mode.
     */
    hot_score?: number | undefined;

    /**
     * Timestamp when the post was originally created.
     *
     * Stored as an ISO 8601 UTC datetime value and used for chronological
     * sorting, age indicators, and determining eligibility for time-based
     * ranking modes like "new" or "top today".
     */
    created_at: string & tags.Format<"date-time">;
  };
}
