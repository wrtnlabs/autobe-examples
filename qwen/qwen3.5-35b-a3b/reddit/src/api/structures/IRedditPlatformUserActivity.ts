import { tags } from "typia";

import { IRedditPlatformUserActivityCommentSummary } from "./IRedditPlatformUserActivityCommentSummary";
import { IRedditPlatformUserActivityPostSummary } from "./IRedditPlatformUserActivityPostSummary";

export namespace IRedditPlatformUserActivity {
  /**
   * Activity item summary representing a user's post or comment on the platform.
   *
   * This type represents a single activity item in a user's activity feed, showing either a post or a comment they created. Each item includes the community where it was posted, a timestamp, and a preview of the content (title for posts, truncated content for comments).
   *
   * The `type` field acts as a discriminator to identify whether this activity is a "post" or a "comment". The response uses a discriminated union where each variant is a separate named schema containing the appropriate preview field.
   *
   * Deleted items may appear in activity history when the user explicitly requests to include them via the `includeDeleted` parameter in the activity request. By default, only active (non-deleted) activity items are returned.
   */
  export type ISummary =
    | IRedditPlatformUserActivityPostSummary
    | IRedditPlatformUserActivityCommentSummary;

  /**
   * Request parameters for retrieving a user's activity history with pagination, filtering, and sorting capabilities.
   *
   * This DTO defines optional query parameters for the activity feed endpoint, allowing clients to customize how activity items are retrieved and displayed. The activity feed combines posts and comments created by a user across all communities, providing a unified view of their content creation history on the platform.
   */
  export type IRequest = {
    /**
     * Page number for pagination, starting from 1.
     *
     * Controls which page of results is returned. The API uses this to calculate the offset in the database query (OFFSET = (page - 1) * limit). The first page is always page 1, not page 0.
     *
     * @x-autobe-specification Page number for pagination, 1-indexed. Applied as OFFSET = (page - 1) * limit in database query. Default: 1. Minimum: 1.
     */
    page?:
      | (number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>)
      | undefined;

    /**
     * Maximum number of activity items to return per page.
     *
     * Controls the page size of the response. The API enforces a maximum of 100 items per page to prevent overly large responses. The default is 20 items per page.
     *
     * @x-autobe-specification Maximum number of records to return per page. Applied as LIMIT in database query. Range: 1-100. Default: 20.
     */
    limit?:
      | (number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>)
      | undefined;

    /**
     * Filter activity items by content type.
     *
     * Restricts the activity feed to show only posts, only comments, or all activity items combined. This parameter controls whether the query joins reddit_platform_posts, reddit_platform_comments, or both tables.
     *
     * @x-autobe-specification Filter activity by content type: 'posts' returns only posts, 'comments' returns only comments, 'both' returns all activity (default behavior). Applied as WHERE clause to filter which table(s) to query.
     */
    contentType?: "posts" | "comments" | "both" | undefined;

    /**
     * Start date for filtering activity items.
     *
     * Only returns activity items created on or after this date. Use ISO 8601 datetime format (e.g., '2024-01-15T00:00:00Z'). When not specified, no lower date bound is applied.
     *
     * @x-autobe-specification Start date filter for activity items. Only returns items created on or after this date. Applied as WHERE created_at >= startDate. ISO 8601 datetime format.
     */
    startDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering activity items.
     *
     * Only returns activity items created on or before this date. Use ISO 8601 datetime format (e.g., '2024-12-31T23:59:59Z'). When not specified, no upper date bound is applied.
     *
     * @x-autobe-specification End date filter for activity items. Only returns items created on or before this date. Applied as WHERE created_at <= endDate. ISO 8601 datetime format.
     */
    endDate?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Field to sort activity items by.
     *
     * Determines the primary sort criterion for the activity feed. 'createdAt' sorts by the creation timestamp of each post or comment. 'votes' sorts by the net vote score (upvotes minus downvotes).
     *
     * @x-autobe-specification Field to sort activity items by. 'createdAt' sorts by creation timestamp (default). 'votes' sorts by vote score (upvotes - downvotes). When contentType is 'posts' or 'comments', only the relevant vote count applies.
     */
    sortBy?: "createdAt" | "votes" | undefined;

    /**
     * Sort direction for activity items.
     *
     * Controls whether results are sorted in ascending or descending order. 'desc' (descending) is the default, showing the newest or most-voted content first. 'asc' (ascending) reverses this order.
     *
     * @x-autobe-specification Sort direction. 'desc' returns newest/most voted first (default). 'asc' returns oldest/least voted first. Applied as ORDER BY created_at DESC or votes DESC, etc.
     */
    sortOrder?: "asc" | "desc" | undefined;

    /**
     * Include soft-deleted content in activity feed.
     *
     * When false (default), only active (non-deleted) posts and comments are returned. When true, includes content that has been soft-deleted by the author or a moderator. Useful for auditing or reviewing content history.
     *
     * @x-autobe-specification Whether to include soft-deleted posts and comments in the activity feed. Default is false (excludes deleted content). Applied as WHERE deleted_at IS NULL when false, or no filter when true.
     */
    includeDeleted?: boolean | undefined;
  };
}
