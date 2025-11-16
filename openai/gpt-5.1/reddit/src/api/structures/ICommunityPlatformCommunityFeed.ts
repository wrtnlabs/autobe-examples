import { tags } from "typia";

export namespace ICommunityPlatformCommunityFeed {
  /**
   * Request parameters for generating a community-specific feed of posts for
   * a single community.
   *
   * This DTO carries pagination, sorting, time-window, and content-type
   * filter options that the backend uses to construct a feed over
   * `community_platform_posts` constrained to the community identified by the
   * path parameter. It is a read-only query model and does not correspond to
   * a single Prisma model.
   */
  export type IRequest = {
    /**
     * 1-based index of the page of results to retrieve for the community
     * feed.
     *
     * The backend combines this value with `limit` to paginate posts within
     * the specified community, typically by translating it into an offset
     * or cursor position. Clients MUST provide a value greater than or
     * equal to 1; values less than 1 are considered invalid and should be
     * rejected by the API or normalized to the minimum page index according
     * to platform policy.
     */
    page: number & tags.Type<"int32">;

    /**
     * Maximum number of post summaries to include in a single page of the
     * community feed.
     *
     * This value directly influences how many records are returned in the
     * `data` array of the paginated response. In most installations,
     * reasonable values fall within a range such as 10–100 items per page
     * to balance usability and performance. The backend may enforce a hard
     * upper bound and either clamp or reject excessively large limits to
     * protect system throughput and latency guarantees.
     */
    limit: number & tags.Type<"int32">;

    /**
     * Sorting strategy used when ranking posts inside the target community.
     *
     * Common sort modes include values such as `hot`, `new`, `top`, and
     * `controversial`, which mirror home-feed behavior but are scoped to a
     * single community. The exact set of supported modes is defined by
     * platform configuration and documented API contracts; clients MUST
     * only send supported values. Unsupported sort modes are expected to
     * trigger validation errors, and the chosen mode can change how other
     * parameters such as `time_range` are interpreted by the backend
     * ranking logic.
     */
    sort_mode: string;

    /**
     * Optional time window limiting which posts are eligible for inclusion
     * in the community feed.
     *
     * Typical conceptual values include `day`, `week`, `month`, `year`, or
     * `all`, where `all` indicates that no additional time-based
     * restriction is applied beyond other filters. When this field is
     * omitted, the backend applies its default window for the selected
     * `sort_mode` and installation configuration, which might differ
     * between environments. This control affects which posts are considered
     * for ranking but does not override authorization or
     * community-visibility rules enforced elsewhere in the system.
     */
    time_range?: string | undefined;

    /**
     * Optional filter restricting the community feed to posts of specific
     * content types.
     *
     * Each entry in this array must correspond to a
     * `community_platform_post_types.code` value associated with the
     * `post_type_id` of posts in `community_platform_posts` (for example,
     * `text`, `link`, or `image`). When this field is omitted or the array
     * is empty, the feed will consider all post types that are enabled for
     * the community and platform configuration, subject to moderation and
     * safety policies. Clients can use this filter to implement
     * type-specific views, such as "link-only" or "image-only" feeds within
     * a community.
     */
    content_type_codes?: string[] | undefined;
  };
}
