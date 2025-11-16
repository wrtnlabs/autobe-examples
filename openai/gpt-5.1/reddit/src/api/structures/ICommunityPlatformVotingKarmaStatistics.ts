import { tags } from "typia";

export namespace ICommunityPlatformVotingKarmaStatistics {
  /**
   * Filter and configuration options for computing the user karma
   * distribution statistics.
   *
   * This DTO controls how the analytics layer aggregates data primarily from
   * the community_platform_user_total_karmas table and related member user
   * status information. It allows administrators or analytics tools to
   * restrict which users are considered and to customize how histogram
   * buckets are constructed for the resulting distribution.
   *
   * All properties are optional; omitted properties indicate that the default
   * behavior of the analytics service should be used for that aspect of the
   * calculation.
   */
  export type IUserKarmaDistributionRequest = {
    /**
     * If true, restrict the karma distribution calculation to currently
     * active (non-deactivated, non-banned) member users.
     *
     * When false or omitted, the statistics may include all users present
     * in the community_platform_user_total_karmas table, subject to any
     * additional filters such as minimum activity thresholds.
     */
    include_only_active_users?: boolean | undefined;

    /**
     * Optional lower bound on total karma required for a user to be
     * included in the distribution.
     *
     * When provided, only users whose total karma in
     * community_platform_user_total_karmas is greater than or equal to this
     * value participate in the aggregation. This can be used to exclude
     * extremely low-activity or brand-new accounts from the analysis.
     */
    minimum_total_karma?: (number & tags.Type<"int32">) | undefined;

    /**
     * Desired number of histogram buckets to compute when constructing the
     * karma distribution.
     *
     * If omitted, the analytics service will use its internal default. If
     * provided, it must be a positive integer. The service may adjust or
     * cap excessively large values to protect performance.
     */
    bucket_count?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Explicit boundaries for karma histogram buckets, expressed as
     * monotonically increasing integer thresholds.
     *
     * When provided, these boundaries override any automatic bucket
     * generation based on bucket_count. Each element represents a karma
     * threshold boundary; the analytics layer will construct buckets
     * between consecutive boundaries and beyond the last boundary as
     * appropriate. Implementations must validate that the list is non-empty
     * and strictly increasing if used.
     */
    bucket_boundaries?: (number & tags.Type<"int32">)[] | undefined;
  };

  /**
   * Aggregated statistical view of user karma distribution across the
   * platform, including percentiles, histogram buckets, and overall counts.
   * Represents a snapshot of analytics computed primarily from
   * community_platform_user_total_karmas at query time.
   */
  export type IUserKarmaDistribution = {
    /**
     * Total number of member users considered in the distribution after
     * applying all filters (e.g., excluding banned or inactive accounts).
     * Must be greater than or equal to 0.
     */
    totalUserCount: number & tags.Type<"int32">;

    /**
     * Minimum total karma value among all considered users. May be 0 or
     * negative depending on how downvotes are modeled.
     */
    minKarma: number & tags.Type<"int32">;

    /**
     * Maximum total karma value among all considered users. Represents the
     * highest total karma score in the current snapshot.
     */
    maxKarma: number & tags.Type<"int32">;

    /**
     * Median total karma value among all considered users. For an even
     * number of users, implementation may use lower, upper, or average
     * median as defined by the analytics logic.
     */
    medianKarma: number & tags.Type<"int32">;

    /**
     * Optional list of percentile statistics for total user karma, such as
     * 10th, 25th, 50th, 75th, 90th, and 99th percentiles.
     */
    percentiles?:
      | ICommunityPlatformVotingKarmaStatistics.IUserKarmaPercentileStat[]
      | undefined;

    /**
     * Histogram-style bucket statistics describing how many users fall into
     * specific karma ranges. Buckets are ordered by ascending range start.
     */
    buckets: ICommunityPlatformVotingKarmaStatistics.IUserKarmaBucket[];

    /**
     * ISO 8601 timestamp indicating when this distribution snapshot was
     * generated on the server.
     */
    generatedAt: string & tags.Format<"date-time">;

    /**
     * Echo of the filter and bucket configuration used to compute this
     * distribution snapshot, allowing clients to interpret the results
     * correctly.
     */
    configuration?:
      | ICommunityPlatformVotingKarmaStatistics.IUserKarmaDistributionConfiguration
      | undefined;
  };

  /**
   * Single percentile statistic for total user karma distribution. Represents
   * a specific percentile (e.g., 0.5 for median) and the corresponding karma
   * value at or below which that percentage of users fall.
   */
  export type IUserKarmaPercentileStat = {
    /**
     * Percentile expressed as a value between 0 and 1 (e.g., 0.5 for 50th
     * percentile, 0.9 for 90th percentile).
     */
    percentile: number;

    /** Total user karma value at the given percentile boundary. */
    karma: number & tags.Type<"int32">;
  };

  /**
   * Histogram bucket describing how many users fall into a specific
   * total‑karma range within an aggregated distribution.
   *
   * Each bucket represents an inclusive–exclusive numeric interval
   * `[rangeStart, rangeEnd)` expressed in units of total user karma.
   * Analytics layers construct a series of such buckets to visualize or
   * analyze how user karma is distributed across the platform.
   *
   * Buckets are typically generated as part of voting and karma statistics
   * endpoints and are intended for use in dashboards, reporting tools, and
   * monitoring views rather than for direct persistence.
   */
  export type IUserKarmaBucket = {
    /**
     * Inclusive lower bound of the karma range for this bucket.
     *
     * All users whose total karma is **greater than or equal to** this
     * value and **less than** the effective `rangeEnd` (if provided) are
     * counted in this bucket.
     */
    rangeStart: number & tags.Type<"int32">;

    /**
     * Exclusive upper bound of the karma range for this bucket, modeled as
     * `integer | null`.
     *
     * When a concrete integer value is present, the bucket covers the
     * interval `[rangeStart, rangeEnd)`. When `null`, the bucket is treated
     * as open‑ended and covers all users whose total karma is greater than
     * or equal to `rangeStart` with no fixed upper bound. API consumers
     * must be prepared to handle both numeric and null values.
     *
     * This design aligns with the documentation that implementations may
     * use a null upper bound to represent segments such as "1000+ karma".
     */
    rangeEnd?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Number of users whose total karma falls within this bucket's range.
     *
     * The count reflects the number of distinct users whose total karma
     * satisfies the interval definition (inclusive `rangeStart`, exclusive
     * numeric `rangeEnd`, or open‑ended when `rangeEnd` is null) at the
     * time the distribution was computed.
     */
    userCount: number & tags.Type<"int32">;
  };

  /**
   * Configuration parameters that determined how a particular user karma
   * distribution was computed.
   *
   * These values are typically derived from the request payload or from
   * service‑level defaults and are echoed back in responses so that API
   * consumers can correctly interpret histogram buckets, percentiles, and
   * other statistical outputs.
   *
   * By inspecting this configuration, clients can understand which users were
   * included, how buckets were constructed, and what filtering or
   * thresholding was applied when generating the distribution.
   */
  export type IUserKarmaDistributionConfiguration = {
    /**
     * Whether only active (non‑deactivated, non‑banned) member users were
     * included when computing the distribution.
     *
     * When this flag is `true`, users in suspended, banned, or otherwise
     * inactive states are excluded from the underlying aggregation. When
     * `false`, the distribution may incorporate all users regardless of
     * current account status, depending on broader business rules for the
     * analytics endpoint.
     */
    includeOnlyActiveUsers: boolean;

    /**
     * Optional minimum activity threshold (for example, minimum number of
     * posts, comments, or votes) required for a user to be included in the
     * distribution.
     *
     * When set to a positive integer, only users whose activity meets or
     * exceeds this threshold are counted. When `null`, the distribution
     * includes all eligible users without additional filtering based on
     * activity volume.
     */
    minActivityThreshold?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Optional uniform bucket size used when constructing histogram
     * buckets.
     *
     * When provided as a positive integer, it describes the width of each
     * bucket in total‑karma units, and histogram buckets are typically
     * constructed as evenly spaced ranges using this size. When `null`,
     * bucket boundaries may be computed dynamically or follow a custom
     * strategy that does not rely on a fixed step size.
     */
    bucketSize?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Optional explicit boundaries used to construct non‑uniform histogram
     * buckets.
     *
     * When present, this array contains ordered karma thresholds that
     * define the bucket ranges, for example `[0, 10, 50, 100, 500, 1000]`.
     * The analytics layer interprets these values to form custom intervals
     * instead of relying solely on a uniform `bucketSize`. When omitted,
     * the system either uses a uniform bucket size or another default
     * bucketing strategy.
     */
    bucketBoundaries?: (number & tags.Type<"int32">)[] | undefined;
  };
}
