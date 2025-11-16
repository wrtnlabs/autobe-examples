import { tags } from "typia";

import { ICommunityPlatformDiscoveryFeedSection } from "./ICommunityPlatformDiscoveryFeedSection";

export namespace ICommunityPlatformDiscoveryCommunityFeed {
  /**
   * Request body schema for retrieving a discovery feed scoped to a single
   * community for the current member user.
   *
   * This DTO carries filter, ranking, and pagination parameters specific to a
   * given community, identified by the path parameter communityId. It is used
   * to compute a ranked list of posts and related items within that community
   * and does not map directly to a single Prisma model.
   */
  export type IRequest = {
    /**
     * Page number for the paginated community feed results. Must be a
     * positive integer starting from 1.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of items to return in a single page of the community
     * feed. Must be between 1 and 100 to protect backend resources.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Opaque pagination cursor token returned from a previous community
     * feed response. When provided, server should use cursor-based
     * pagination instead of page/limit offsets.
     */
    cursor?: string | undefined;

    /**
     * Sorting mode used to rank the community discovery feed.
     *
     * - "hot": Blend of recency and score for engaging content within the
     *   community.
     * - "new": Strictly most recent content first.
     * - "top": Highest scoring content within a time window for this
     *   community.
     * - "controversial": Content with a mix of upvotes and downvotes.
     */
    sortMode: "hot" | "new" | "top" | "controversial";

    /**
     * Time range window used when sortMode is "top" to limit which posts in
     * this community are considered for ranking.
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
     * Optional list of content types to include in this community feed.
     *
     * - "post": Community posts from community_platform_posts scoped to this
     *   community.
     * - "comment": Comment-level items derived from
     *   community_platform_comments.
     * - "discoveryItem": Additional discovery or pinned items from
     *   community_platform_discovery_items related to this community.
     */
    contentTypes?: ("post" | "comment" | "discoveryItem")[] | undefined;

    /**
     * Filter controlling how NSFW or sensitive content should be handled in
     * the community feed.
     *
     * - "exclude": Do not show NSFW content.
     * - "include": Show NSFW and non-NSFW content according to ranking.
     * - "only": Show only NSFW content, where allowed by policy.
     */
    nsfwFilter?: "exclude" | "include" | "only" | undefined;

    /**
     * High-level safety and maturity preference for content filtering
     * within this community.
     *
     * - "strict": Apply strongest filtering for sensitive or borderline
     *   content.
     * - "standard": Apply default platform safety rules.
     * - "relaxed": Allow more mature content, still respecting hard policy
     *   restrictions.
     */
    safetyLevel?: "strict" | "standard" | "relaxed" | undefined;

    /**
     * When true, the feed generation should attempt to omit items from this
     * community that the member user has already seen or dismissed in prior
     * sessions, where tracking data is available.
     */
    excludeSeenItems?: boolean | undefined;
  };

  /**
   * Summary view of the discovery feed that is scoped to a specific community
   * within the platform.
   *
   * This schema represents a lightweight snapshot of discovery content
   * dedicated to a single community, such as top posts, rising posts, or
   * related communities that are relevant in the context of that community.
   * It is designed for list and feed previews and does not attempt to provide
   * full post or community details.
   *
   * The community discovery feed is typically used on community landing pages
   * or dedicated discovery tabs. It is composed of multiple logical sections,
   * each of which is represented as a summary section structure and may focus
   * on different discovery strategies (for example, hot posts, new posts, or
   * recommended related communities). The schema is purely view‑oriented and
   * is not a direct projection of any single Prisma model.
   */
  export type ISummary = {
    /**
     * Ordered list of discovery sections composing the community‑scoped
     * discovery feed.
     *
     * Each element describes a section of discovery content that is
     * relevant to the current community, such as hot posts, new posts, or
     * suggested related communities. The array may be empty if no discovery
     * content is available for the community, and clients should handle
     * this case by rendering an empty or fallback state.
     *
     * The sequence of sections in this array represents the order in which
     * they should be displayed in community discovery views. Client
     * applications typically iterate over sections in order and then render
     * each section's items using the corresponding
     * `ICommunityPlatformDiscoveryFeedSection.ISummary` definition.
     */
    sections: ICommunityPlatformDiscoveryFeedSection.ISummary[];
  };
}
