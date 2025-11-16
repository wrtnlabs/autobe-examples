import { tags } from "typia";

import { ICommunityPlatformDiscoveryFeedSection } from "./ICommunityPlatformDiscoveryFeedSection";

export namespace ICommunityPlatformDiscoveryHomeFeed {
  /**
   * Request body schema for retrieving a personalized home discovery feed for
   * the current member user.
   *
   * This DTO captures filter, ranking, and pagination parameters used to
   * compute the home discovery feed by aggregating posts and related
   * engagement data across communities the member user subscribes to. It does
   * not map directly to a single Prisma model and is purely a computed-view
   * request type.
   */
  export type IRequest = {
    /**
     * Page number for the paginated home feed results. Must be a positive
     * integer starting from 1.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of items to return in a single page of the home feed.
     * Must be between 1 and 100 to protect backend resources.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Opaque pagination cursor token returned from a previous home feed
     * response. When provided, server should use cursor-based pagination
     * instead of page/limit offsets.
     */
    cursor?: string | undefined;

    /**
     * Sorting mode used to rank the home discovery feed.
     *
     * - "hot": Blend of recency and score for engaging content.
     * - "new": Strictly most recent content first.
     * - "top": Highest scoring content within a time window.
     * - "controversial": Content with a mix of upvotes and downvotes.
     */
    sortMode: "hot" | "new" | "top" | "controversial";

    /**
     * Time range window used when sortMode is "top" to limit which posts
     * are considered for ranking.
     *
     * - "hour": Last 60 minutes.
     * - "day": Last 24 hours.
     * - "week": Last 7 days.
     * - "month": Last 30 days.
     * - "year": Last 365 days.
     * - "all": No time restriction.
     */
    topTimeRange?:
      | "hour"
      | "day"
      | "week"
      | "month"
      | "year"
      | "all"
      | undefined;

    /**
     * Optional whitelist of community IDs to prioritize or restrict the
     * home feed to. When provided, the feed should focus on these
     * communities that the member user is allowed to see.
     */
    includeCommunityIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional blacklist of community IDs to exclude from the home feed,
     * even if the member user is subscribed to them.
     */
    excludeCommunityIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of content types to include in the feed.
     *
     * - "post": Community posts from community_platform_posts.
     * - "comment": Comment-level items derived from
     *   community_platform_comments.
     * - "discoveryItem": Additional discovery or promoted items from
     *   community_platform_discovery_items.
     */
    contentTypes?: ("post" | "comment" | "discoveryItem")[] | undefined;

    /**
     * Filter controlling how NSFW or sensitive content should be handled in
     * the home feed.
     *
     * - "exclude": Do not show NSFW content.
     * - "include": Show NSFW and non-NSFW content according to ranking.
     * - "only": Show only NSFW content, where allowed by policy.
     */
    nsfwFilter?: "exclude" | "include" | "only" | undefined;

    /**
     * High-level safety and maturity preference for content filtering.
     *
     * - "strict": Apply strongest filtering for sensitive or borderline
     *   content.
     * - "standard": Apply default platform safety rules.
     * - "relaxed": Allow more mature content, still respecting hard policy
     *   restrictions.
     */
    safetyLevel?: "strict" | "standard" | "relaxed" | undefined;

    /**
     * When true, the feed generation should attempt to omit items that the
     * member user has already seen or dismissed in prior sessions, where
     * tracking data is available.
     */
    excludeSeenItems?: boolean | undefined;
  };

  /**
   * Summary view of the personalized discovery home feed for the community
   * platform.
   *
   * This schema represents a lightweight, aggregated snapshot of discovery
   * content that is rendered on the main discovery or home screen for a
   * signed‑in or guest user. It is optimized for list and card views rather
   * than full detail pages, and it exposes only the information needed to
   * render sections and their items in order.
   *
   * The home discovery feed is typically personalized based on the member
   * user's communities, subscriptions, and recent activity. It is composed of
   * multiple logical sections, each grouping a small list of discovery items
   * such as trending communities, popular posts, or recommended communities.
   * The structure is view‑oriented and is not a direct mapping of any single
   * Prisma model or database table.
   */
  export type ISummary = {
    /**
     * Ordered list of discovery sections composing the home discovery feed.
     *
     * Each section groups a small set of discovery items under a specific
     * semantic label (for example, "Trending communities", "Popular posts",
     * or "Recommended for you"). The array may be empty when there is no
     * discovery content to show, allowing clients to handle the absence of
     * sections gracefully.
     *
     * The order of sections reflects the rendering order on the discovery
     * home screen. Client applications should respect this ordering and
     * iterate over sections, then over each section's items, when building
     * UI components for the personalized discovery experience.
     */
    sections: ICommunityPlatformDiscoveryFeedSection.ISummary[];
  };
}
