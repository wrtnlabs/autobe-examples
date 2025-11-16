import { tags } from "typia";

export namespace ICommunityPlatformCommentAnalytics {
  /**
   * Request body for retrieving paginated analytics about comments in the
   * community platform.
   *
   * This DTO is used by the `/communityPlatform/adminUser/analytics/comments`
   * endpoint, which computes aggregated metrics over the
   * `community_platform_comments` table together with related voting and
   * engagement structures such as `community_platform_comment_votes` and the
   * threaded comment hierarchy formed via `parent_comment_id`.
   *
   * Administrators and moderation staff use this request type to filter,
   * sort, and paginate comment analytics for dashboards, workload monitoring
   * views, and investigative workflows. The request allows scoping by posts,
   * communities, author segments, time windows, status values, score
   * thresholds, and reply depth while always requiring explicit pagination
   * controls.
   *
   * Backends should enforce sensible defaults and upper bounds for expensive
   * filters—especially `limit` and large ID lists—to protect performance and
   * prevent abusive analytics scans. When optional filters are omitted,
   * implementations may apply default scoping based on business rules, such
   * as focusing on recent activity or restricting to comments that are
   * visible or policy-relevant.
   */
  export type IRequest = {
    /**
     * Optional list of post identifiers to restrict analytics to specific
     * posts.
     *
     * Each element must be a valid UUID that corresponds to
     * `community_platform_posts.id`. When this array is provided, the
     * analytics engine includes only comments whose `post_id` belongs to
     * one of the listed posts.
     *
     * This filter is commonly combined with `community_ids` to narrow
     * analytics to particular threads within selected communities.
     * Implementations may impose an upper bound on the number of IDs in
     * this array to avoid generating overly large OR conditions in
     * underlying database queries.
     */
    post_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of community identifiers that scope analytics to
     * specific communities.
     *
     * Each value must be a valid UUID referencing a community derived from
     * the relationship between posts and `community_platform_communities`.
     * When supplied, only comments whose parent posts belong to one of
     * these communities are considered.
     *
     * This filter is frequently used to constrain analytics to the set of
     * communities an `adminUser` is allowed to supervise. The backend may
     * validate that all requested community IDs fall within the caller’s
     * administrative scope and reject unauthorized combinations.
     */
    community_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of member user identifiers representing comment authors
     * to include in analytics.
     *
     * Each element must be a valid UUID corresponding to
     * `community_platform_memberusers.id`. When this filter is present,
     * only comments authored by one of the specified users are included in
     * the computed metrics.
     *
     * This filter is useful for investigating specific accounts, measuring
     * the impact of power users, or segmenting analytics by user cohorts.
     * Implementations may limit the number of authors supplied to maintain
     * predictable query performance.
     */
    author_memberuser_ids?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of comment status values to include in analytics.
     *
     * Values should align with the domain of the `status` column on
     * `community_platform_comments`, such as `visible`,
     * `deleted_by_author`, `removed_by_moderation`, `locked`, or other
     * platform-specific states. Only comments whose status is one of the
     * supplied values are included when this filter is present.
     *
     * When the filter is omitted, the backend applies a default status
     * selection appropriate for administrative analytics. For example, it
     * may include logically deleted or moderated comments to support
     * moderation views while excluding transient internal states that are
     * not analytically useful.
     */
    status?: string[] | undefined;

    /**
     * Inclusive lower bound of the comment creation timestamp window, in
     * ISO 8601 date-time format.
     *
     * When this field is set to a non-null value, only comments with
     * `created_at` greater than or equal to the provided timestamp are
     * included. When set to `null` or omitted, no explicit lower bound on
     * creation time is enforced and the backend may rely on its own
     * retention policies or additional defaults.
     *
     * Clients should ensure that `created_from` is not later than
     * `created_to` when both fields are provided. If the time window is
     * inverted or otherwise invalid, the server should respond with a
     * validation error rather than silently adjusting the range.
     */
    created_from?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Exclusive upper bound of the comment creation timestamp window, in
     * ISO 8601 date-time format.
     *
     * When this field is set to a non-null value, only comments with
     * `created_at` strictly earlier than the given timestamp are included
     * in the analytics computation. When set to `null` or omitted, there is
     * no explicit upper bound on creation time, and the analytics may span
     * all historical comments that satisfy the remaining filters.
     *
     * Together with `created_from`, this field defines the temporal window
     * for analysis. Implementations should validate that the combined range
     * is coherent and reject requests that specify impossible or
     * contradictory intervals.
     */
    created_to?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional minimum net score threshold for including comments in
     * analytics.
     *
     * Net score is typically computed as `upvote_count - downvote_count`
     * based on records in `community_platform_comment_votes`. When
     * `min_score` is provided, only comments whose computed score is
     * greater than or equal to this value are included in the result set.
     *
     * This filter allows administrators to focus on positively received
     * comments or restrict analytics to content that meets a particular
     * popularity threshold. When set to `null` or omitted, no minimum score
     * constraint is applied.
     */
    min_score?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Optional maximum net score threshold for including comments in
     * analytics.
     *
     * When this field is populated, only comments whose net score is less
     * than or equal to the given value are considered. This is useful for
     * examining negatively received comments, controversial content, or
     * outliers that attract substantial downvotes.
     *
     * If `max_score` is `null` or omitted, there is no explicit upper bound
     * on score, although implementations may still use internal safeguards
     * to prevent expensive queries on extreme ranges.
     */
    max_score?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Optional minimum number of replies required for a comment to be
     * included in analytics.
     *
     * The reply count is derived from the threaded comment structure,
     * typically by counting rows in `community_platform_comments` that
     * reference this comment via `parent_comment_id`. Depending on
     * implementation, the count may include only direct children or all
     * descendants in the reply tree.
     *
     * This filter helps focus on highly discussed comment threads that may
     * be especially relevant for engagement analysis or moderation review.
     * When `min_reply_count` is `null` or omitted, no lower bound on reply
     * activity is enforced.
     */
    min_reply_count?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Optional maximum number of replies allowed for a comment to be
     * included in analytics.
     *
     * When this filter is set, only comments whose reply count is less than
     * or equal to the specified value are considered. This can be useful
     * when excluding extremely large threads from certain analyses or when
     * sampling smaller discussions.
     *
     * If `max_reply_count` is `null` or omitted, no explicit upper
     * reply-count bound is applied for inclusion in analytics, subject to
     * any internal limits imposed by the backend.
     */
    max_reply_count?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Sorting key for analytics results that determines how summarized
     * comments are ordered within the page.
     *
     * Typical supported values include:
     *
     * - `score`: order by net score (upvotes minus downvotes)
     * - `upvotes`: order by total upvote count
     * - `downvotes`: order by total downvote count
     * - `reply_count`: order by the number of replies associated with each
     *   comment
     * - `last_activity_at`: order by the most recent engagement timestamp
     *   related to the comment or its thread
     *
     * The exact set of allowed sort keys is defined by the implementation.
     * When a client supplies an unsupported value, the server should return
     * a validation error rather than silently falling back to a different
     * sorting strategy.
     */
    sort_by?: string | undefined;

    /**
     * Sort direction to apply to the field selected in `sort_by`.
     *
     * Only the literal values `asc` and `desc` are allowed. When this field
     * is omitted, the backend typically chooses a default direction based
     * on the selected `sort_by` key—for example, `desc` for scores or
     * activity timestamps so that the most significant or recent items are
     * returned first.
     */
    sort_direction?: "asc" | "desc" | undefined;

    /**
     * 1-based page index indicating which slice of the sorted analytics
     * results to retrieve.
     *
     * The first page is represented by the value `1`. When omitted, the
     * backend may default to the first page. This value is combined with
     * `limit` and the chosen sort order to determine which range of records
     * is returned.
     *
     * Clients should treat this value as a logical cursor over a changing
     * dataset rather than relying on it as a stable offset, especially in
     * high-traffic environments where new comments and votes are
     * continuously arriving.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of analytics records to return in a single page.
     *
     * This value controls the page size for the paginated analytics
     * response. Servers MUST enforce an upper bound (for example, 50, 100,
     * or 500 records) to avoid returning excessively large result sets and
     * to protect system resources under heavy load.
     *
     * The combination of `page` and `limit` determines which window of
     * sorted analytics results is returned, and the response’s `pagination`
     * metadata (from `IPageICommunityPlatformCommentAnalytics.ISummary`)
     * helps clients understand total records and navigate through pages.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1>;
  };

  /**
   * Summary analytics view for a single comment in the community platform,
   * capturing key voting and engagement metrics.
   *
   * This type is a lightweight projection derived from the
   * `community_platform_comments` table and its associated vote and reply
   * data. It focuses on identifiers, aggregate counts, and key timestamps
   * rather than full comment content or author details, making it suitable
   * for resource-efficient dashboards, moderation queues, and analytical
   * listings.
   *
   * The summary does not attempt to mirror every column of the underlying
   * Prisma model. Instead, it exposes the fields that are most useful for
   * ranking, filtering, and understanding the relative impact of comments
   * within threads and communities. Consumers that need full comment bodies
   * or fine-grained metadata should fetch the corresponding comment entity
   * using `comment_id`.
   *
   * By precomputing vote counts, net score, reply counts, and activity
   * timestamps, this type allows analytics and moderation views to present
   * rich information about each comment’s engagement profile without
   * additional aggregation queries at read time.
   */
  export type ISummary = {
    /**
     * Unique identifier of the comment whose analytics are summarized.
     *
     * This value corresponds to the primary key `id` in the
     * `community_platform_comments` table. It can be used to retrieve the
     * full comment entity whenever detailed content, author information, or
     * additional metadata is required.
     *
     * Downstream systems such as moderation tools, audit logs, and
     * notification services may also rely on this identifier to correlate
     * analytics records with actions taken against the underlying comment.
     */
    comment_id: string & tags.Format<"uuid">;

    /**
     * Identifier of the parent post that this comment belongs to.
     *
     * This value maps to the `post_id` foreign key column on
     * `community_platform_comments` and links the comment to a specific
     * thread or discussion. Analytics consumers use this field to aggregate
     * comment metrics at the post level, for example when computing
     * per-thread engagement or visualizing the distribution of comment
     * activity across posts.
     */
    post_id: string & tags.Format<"uuid">;

    /**
     * Identifier of the community in which the parent post and this comment
     * exist.
     *
     * Although the community identifier is typically not stored directly on
     * the comment row, it is derived from the associated post’s
     * relationship to `community_platform_communities`. This field enables
     * analytic queries and dashboards to group, filter, and summarize
     * comment activity by community.
     *
     * In multi-community platforms, this field is especially important for
     * enforcing administrative scopes, measuring community-level health,
     * and generating per-community moderation reports.
     */
    community_id: string & tags.Format<"uuid">;

    /**
     * Total number of upvote reactions recorded for this comment from
     * member users.
     *
     * This count is computed by aggregating vote records in
     * `community_platform_comment_votes` that represent positive or upvote
     * actions. Only the current effective votes are included according to
     * the platform’s voting semantics; superseded, duplicated, or withdrawn
     * votes should not inflate the count.
     *
     * High upvote counts generally indicate that a comment is valued by the
     * community and may be used in ranking algorithms, highlight sections,
     * or quality assessment tools.
     */
    upvote_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total number of downvote reactions recorded for this comment from
     * member users.
     *
     * This metric is computed from the same vote table as `upvote_count`,
     * but it counts records that represent negative reactions or downvotes.
     * Only active and effective votes are considered, following the
     * platform’s rules for updating or retracting votes.
     *
     * Elevated downvote counts may signal problematic, low-quality, or
     * controversial content, and are often used as input to moderation
     * heuristics, ranking adjustments, or quality control workflows.
     */
    downvote_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Net score for the comment, typically computed as `upvote_count -
     * downvote_count`.
     *
     * The score provides a concise indicator of the community’s overall
     * reaction to the comment, balancing positive and negative feedback.
     * Many list views and analytics reports use this value to rank
     * comments, highlight highly regarded contributions, or surface
     * contentious discussions.
     *
     * Depending on business rules, the exact computation may include
     * additional weighting or normalization—such as accounting for comment
     * age, community size, or vote credibility—but the semantics remain
     * that higher scores represent more positively received comments.
     */
    score: number & tags.Type<"int32">;

    /**
     * Total number of replies associated with this comment.
     *
     * This value is derived from the threaded comment structure, typically
     * by counting child rows in `community_platform_comments` that
     * reference this comment via `parent_comment_id`. Depending on
     * implementation, the count may represent only direct children or all
     * descendants within the reply subtree.
     *
     * A high reply count indicates active conversation and may highlight
     * topics that are especially engaging, controversial, or in need of
     * moderation review. Analytics and dashboards often use this metric to
     * identify discussion hotspots or prioritize threads for human
     * oversight.
     */
    reply_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Timestamp when the comment was originally created, in ISO 8601
     * date-time format.
     *
     * This value is taken from the `created_at` column on
     * `community_platform_comments` and is typically stored in UTC. It
     * marks the point at which the comment first became visible on the
     * platform or entered the moderation pipeline.
     *
     * Analytics and reporting features use this timestamp to correlate
     * engagement metrics with comment age, build time-based charts, and
     * apply time-window filters in combination with `created_from` and
     * `created_to` in the request DTO.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the most recent significant activity related to this
     * comment, in ISO 8601 date-time format.
     *
     * Depending on platform design, activity may include new replies
     * beneath this comment, new votes recorded in
     * `community_platform_comment_votes`, edits captured in
     * `community_platform_comment_edit_histories`, or other interactions
     * that materially affect engagement.
     *
     * When no activity beyond initial creation has occurred,
     * `last_activity_at` may be equal to `created_at` or may be omitted
     * from the payload, depending on backend conventions. Clients can use
     * this field to sort comments by recent activity, identify dormant
     * threads, or focus on conversations that are currently active or
     * escalating.
     */
    last_activity_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
