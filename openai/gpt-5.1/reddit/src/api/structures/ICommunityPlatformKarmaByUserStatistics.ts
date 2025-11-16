import { tags } from "typia";

import { ICommunityPlatformKarmaByUserStatisticsTopUser } from "./ICommunityPlatformKarmaByUserStatisticsTopUser";

export namespace ICommunityPlatformKarmaByUserStatistics {
  /**
   * Request payload for retrieving aggregated karma statistics grouped by
   * user.
   *
   * This DTO captures analytical search criteria, filtering options, and
   * pagination settings used by administrative clients to query user-level
   * karma metrics derived primarily from `community_platform_user_karmas`
   * and, when relevant, from `community_platform_karma_events`. It is
   * designed for complex analytics over many users rather than simple CRUD
   * lookups.
   *
   * All filters are combined using logical AND semantics. Callers can scope
   * the analytics by specific users or communities, constrain results by
   * total karma ranges, and, when time bounds are provided, restrict
   * computations to karma changes observed within the specified event
   * window.
   */
  export type IRequest = {
    /**
     * Page number for paginated results.
     *
     * Must be a positive integer where 1 represents the first page.
     * Implementations use this together with `limit` to compute the offset
     * into the result set and to drive pagination controls in admin
     * analytics UIs.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Maximum number of user statistic rows to return per page.
     *
     * Must be a positive integer. Implementations typically enforce an
     * upper bound such as 200 to protect system performance, and may clamp
     * larger client-provided values down to this maximum while still
     * honoring the requested page index.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>;

    /**
     * Optional list of specific member user identifiers to restrict the
     * analytics to.
     *
     * When provided and non-empty, only karma statistics for these users
     * are considered and combined with other filters (such as community
     * scopes, karma thresholds, and time windows) using logical AND
     * semantics. When omitted or provided as an empty array, no additional
     * restriction is applied based on user identity, and the analytics may
     * cover all eligible users.
     */
    userIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of community identifiers used to scope the karma
     * aggregation.
     *
     * When provided and non-empty, only karma events and aggregates
     * associated with these communities are included in the statistics.
     * This filter is combined with user filters, karma thresholds, and time
     * windows using logical AND semantics. When omitted or empty, analytics
     * are not restricted to any particular community and may cover
     * platform-wide karma data.
     */
    communityIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional lower bound for total karma.
     *
     * When set, only users whose total karma is greater than or equal to
     * this value are included in the result set. If `maxTotalKarma` is also
     * provided, the effective filter becomes an inclusive numeric range for
     * total_karma. The platform may allow negative karma, so callers can
     * use negative thresholds to focus on users with strongly negative
     * reputation when needed.
     */
    minTotalKarma?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional upper bound for total karma.
     *
     * When set, only users whose total karma is less than or equal to this
     * value are included in the result set. When used together with
     * `minTotalKarma`, the filter defines an inclusive numeric range. If
     * omitted, there is no explicit upper bound on total karma, and only
     * the lower-bound constraint (if any) is applied.
     */
    maxTotalKarma?: (number & tags.Type<"int32">) | undefined;

    /**
     * Optional inclusive start of the time window used when computing
     * time-windowed karma changes from `community_platform_karma_events`.
     *
     * When provided, only karma events with an event timestamp greater than
     * or equal to this value are considered for derived metrics such as
     * recent deltas. When both `fromEventAt` and `toEventAt` are null or
     * omitted, implementations may treat the analytics as lifetime
     * aggregates derived from `community_platform_user_karmas` without
     * additional time-window filtering.
     */
    fromEventAt?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional exclusive end of the time window used for computing
     * time-windowed karma changes.
     *
     * When provided, only karma events with an event timestamp strictly
     * less than this value are considered. When null or omitted, there is
     * no explicit upper bound and the time window is open-ended. Together
     * with `fromEventAt`, this allows callers to define rolling or fixed
     * analysis windows over `community_platform_karma_events`.
     */
    toEventAt?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Sort key used to order the resulting user-level karma statistics.
     *
     * Must be one of `totalKarma`, `postKarma`, `commentKarma`, or
     * `recentDelta`. Administrators typically use `totalKarma` with
     * descending sortDirection for ranking users by overall reputation,
     * while the other options focus on more specific dimensions of karma or
     * on recent changes.
     */
    sortBy: "totalKarma" | "postKarma" | "commentKarma" | "recentDelta";

    /**
     * Sort direction to apply for the selected `sortBy` key.
     *
     * Use `asc` to order results from the smallest metric value to the
     * largest, or `desc` to order from the largest to the smallest. When
     * ranking users by reputation for administrative dashboards, `desc` is
     * commonly used in combination with `sortBy: totalKarma` or `sortBy:
     * recentDelta`.
     */
    sortDirection: "asc" | "desc";
  };

  /**
   * Summary statistics describing how community karma is distributed across
   * users within the platform.
   *
   * Provides aggregate metrics such as total karma, average karma per user,
   * and distribution-focused values (e.g., median and percentile thresholds).
   * Intended for use in admin or analytics views where high-level
   * understanding of user reputation dynamics is required rather than
   * per-event detail.
   *
   * This schema does not map directly to a single Prisma model but is derived
   * from community_platform_user_karmas and community_platform_karma_events.
   */
  export type ISummary = {
    /**
     * Total number of distinct member users included in this karma
     * statistics snapshot. Represents the population size over which karma
     * aggregation was computed.
     */
    totalUsers: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Total sum of karma points accumulated by all included users.
     * Calculated over both post and comment karma sources. Can be negative
     * if platform allows negative karma values.
     */
    totalKarma: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Average karma per user, computed as totalKarma divided by totalUsers.
     * May be fractional due to division even if underlying karma units are
     * integers.
     */
    averageKarmaPerUser: number & tags.Minimum<0>;

    /**
     * Median karma value across all users in this snapshot. Provides a
     * robust central tendency measure less sensitive to outliers than the
     * mean.
     */
    medianKarma: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * 90th percentile karma value across users. 10% of users have karma
     * greater than or equal to this threshold. Useful for understanding
     * upper-tail reputation distribution.
     */
    p90Karma: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * 99th percentile karma value across users. 1% of users have karma
     * greater than or equal to this threshold. Highlights the most highly
     * reputed users in the system.
     */
    p99Karma: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Ordered list of top users by karma, limited to a small, fixed-size
     * slice for summary analytics views. Each entry includes user identity
     * and their aggregate karma metrics.
     */
    topUsers: ICommunityPlatformKarmaByUserStatisticsTopUser.ISummary[];
  };
}
