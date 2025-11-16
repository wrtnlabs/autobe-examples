import { tags } from "typia";

import { ICommunityPlatformMemberuser } from "./ICommunityPlatformMemberuser";

export namespace ICommunityPlatformKarmaEvolution {
  /**
   * Request payload for retrieving an analytical time‑series view of a member
   * user's karma evolution based on historical records in
   * `community_platform_karma_events` and current aggregates in
   * `community_platform_user_karmas`.
   *
   * This DTO encapsulates all filter and aggregation options required to
   * build charts and reports, including optional scoping to specific
   * communities or content types, time window selection, and aggregation
   * granularity. It is used by analytics UIs that need to render trends such
   * as daily or weekly karma changes.
   *
   * The target member user is always derived from the authenticated
   * `memberUser` actor in the authorization context, not from this request
   * body. This prevents clients from impersonating other users when
   * requesting detailed karma analytics.
   */
  export type IRequest = {
    /**
     * Inclusive start of the time range to analyze, expressed as an ISO
     * 8601 UTC timestamp.
     *
     * Analytics queries will ignore karma events that occurred before this
     * timestamp when computing evolution buckets.
     */
    from: string & tags.Format<"date-time">;

    /**
     * Exclusive end of the time range to analyze, expressed as an ISO 8601
     * UTC timestamp.
     *
     * Analytics queries will ignore karma events that occurred at or after
     * this timestamp when computing evolution buckets.
     */
    to: string & tags.Format<"date-time">;

    /**
     * Time bucket granularity for aggregating karma evolution points.
     *
     * Typical values include domain‑specific options such as `daily`,
     * `weekly`, or `monthly`. The backend interprets this string to group
     * `community_platform_karma_events.created_at` values into the
     * requested buckets for charting.
     */
    bucket_granularity: string;

    /**
     * Optional filter limiting karma evolution analysis to events
     * associated with a specific community.
     *
     * When provided, only `community_platform_karma_events` linked to posts
     * or comments in the specified community are considered. When omitted,
     * karma events from all communities are included.
     */
    community_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Optional content‑type filter controlling which kinds of karma events
     * are included.
     *
     * Typical values include domain‑specific labels such as `post`,
     * `comment`, or `all`, allowing clients to focus evolution analysis on
     * post karma, comment karma, or combined totals.
     */
    content_scope?: string | undefined;

    /**
     * Zero‑based page index for paging through aggregated evolution
     * buckets.
     *
     * Used together with `limit` to control which window of aggregated
     * points is returned when the result set is large.
     */
    page: number & tags.Type<"int32">;

    /**
     * Maximum number of aggregated evolution summary points to return in a
     * single response page.
     *
     * Clients use this value in combination with `page` for classic
     * pagination or infinite scrolling behaviors.
     */
    limit: number & tags.Type<"int32">;
  };

  /**
   * Summary view of a member user's karma evolution over time.
   *
   * Provides a lightweight representation of user karma trend segments that
   * can be used in list views, profile sidebars, and analytic summaries
   * without loading full event history.
   *
   * This DTO represents aggregated analytical slices derived from many
   * `community_platform_karma_events` rows and the
   * `community_platform_user_karmas` aggregate table rather than a single
   * Prisma model row.
   */
  export type ISummary = {
    /**
     * Unique identifier of the karma evolution summary record or aggregate
     * view segment.
     *
     * This ID allows clients to reference a specific summarized period or
     * aggregation result when needed.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Member user whose karma evolution is being summarized.
     *
     * Provides minimal identity and display information for the user so
     * that the summary can be rendered without an additional user fetch.
     */
    member_user: ICommunityPlatformMemberuser.ISummary;

    /**
     * Start timestamp of the aggregation period that this summary covers.
     *
     * Represents the beginning of the time window (inclusive) over which
     * karma changes are summarized.
     */
    period_start_at: string & tags.Format<"date-time">;

    /**
     * End timestamp of the aggregation period that this summary covers.
     *
     * Represents the end of the time window (exclusive or inclusive
     * depending on business rule) over which karma changes are summarized.
     */
    period_end_at: string & tags.Format<"date-time">;

    /**
     * User's total karma at the start of the aggregation period.
     *
     * Used together with ending_karma to understand direction and magnitude
     * of change.
     */
    starting_karma: number & tags.Type<"int32">;

    /**
     * User's total karma at the end of the aggregation period.
     *
     * Can be compared to starting_karma to calculate net gain or loss.
     */
    ending_karma: number & tags.Type<"int32">;

    /**
     * Net change in karma during the aggregation period.
     *
     * Positive values indicate net karma gain, negative values indicate net
     * karma loss, and zero means no net change.
     */
    net_delta: number & tags.Type<"int32">;

    /**
     * Net karma change attributable to post-related events within this
     * period.
     *
     * Allows differentiating between karma gained or lost from posts vs
     * comments.
     */
    posts_delta: number & tags.Type<"int32">;

    /**
     * Net karma change attributable to comment-related events within this
     * period.
     *
     * Used to analyze comment performance separately from posts.
     */
    comments_delta: number & tags.Type<"int32">;
  };
}
